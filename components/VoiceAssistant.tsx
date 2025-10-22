import React, { useState, useEffect, useRef, useCallback } from 'react';
// The `LiveSession` type is not exported from '@google/genai' and has been removed from this import.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionCall, GenerateContentResponse } from '@google/genai';
import geminiService from '../services/geminiService';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';

// --- Audio Encoding/Decoding Utilities ---

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const HolographicMicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M42 70C42 73.3137 44.6863 76 48 76H52C55.3137 76 58 73.3137 58 70V68H42V70Z" />
        <path d="M50 64C54.4183 64 58 60.4183 58 56V34C58 29.5817 54.4183 26 50 26C45.5817 26 42 29.5817 42 34V56C42 60.4183 45.5817 64 50 64Z" />
        <path d="M34 50C34 58.8366 41.1634 66 50 66C58.8366 66 66 58.8366 66 50H62C62 56.6274 56.6274 62 50 62C43.3726 62 38 56.6274 38 50H34Z" />
    </svg>
);


interface TranscriptLine {
    id: number;
    source: 'user' | 'ai';
    text: string;
}

const VoiceAssistant: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    // Since `LiveSession` is not exported, its type is inferred from the `geminiService.ai.live.connect` method for type safety.
    const [session, setSession] = useState<Awaited<ReturnType<typeof geminiService.ai.live.connect>> | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptLine[]>([]);
    
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const handleFunctionCall = useCallback(async (funcCall: FunctionCall) => {
        if (!user) return;
        const args = funcCall.args;
        let result: any;
        let successMessage = `عملیات ${funcCall.name} با موفقیت انجام شد.`;

        try {
            if (funcCall.name === 'analyzeBusinessData') {
                const context = await api.getFullBusinessContextAsText();
                const prompt = `بر اساس داده‌های JSON زیر، لطفاً به سوال کاربر به زبان فارسی روان و به طور خلاصه پاسخ دهید.
                
                داده ها:
                ${context}

                سوال کاربر:
                "${args.query}"
                `;

                const response: GenerateContentResponse = await geminiService.ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                successMessage = response.text;

            } else {
                 const apiMethods: { [key: string]: (payload: any) => Promise<any> } = {
                    createDomesticTransfer: api.createDomesticTransfer,
                    updateTransferStatus: api.updateTransferStatus,
                    payoutIncomingTransfer: api.payoutIncomingTransfer,
                    logExpense: api.createExpense,
                    getBalanceForPartner: api.getPartnerAccountByName,
                    settlePartnerBalance: api.settlePartnerBalanceByName,
                    addBankAccount: api.addBankAccount,
                    // FIX: Replaced the outdated 'logForeignTransaction' with 'initiateForeignExchange' to match the updated API service.
                    initiateForeignExchange: api.initiateForeignExchange,
                    generateReport: api.generateReport,
                    requestCashboxWithdrawal: (p: any) => api.createCashboxRequest({ ...p, requestType: 'withdrawal'}),
                    resolveCashboxRequest: api.resolveCashboxRequest,
                };
                
                const method = apiMethods[funcCall.name];
                if (method) {
                    const payload = { ...args, user: user };
                    result = await method(payload);
                     if (result && result.error) {
                        successMessage = `خطا در اجرای دستور: ${result.error}`;
                    }
                } else {
                     successMessage = `دستور ناشناخته: ${funcCall.name}`;
                }
            }
        } catch(e) {
            console.error("Function call execution error:", e);
            successMessage = "خطایی در اجرای دستور رخ داد.";
        }
        
        session?.sendToolResponse({
            functionResponses: {
                id: funcCall.id,
                name: funcCall.name,
                response: { result: successMessage }
            }
        });
    }, [api, user, session]);

    const startSession = useCallback(async () => {
        if (session || !user) return;

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        setTranscriptHistory([]);

        const sessionPromise = geminiService.ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    setIsListening(true);
                    streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current);
                    scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                         sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent) {
                        const { modelTurn, inputTranscription, outputTranscription, turnComplete } = message.serverContent;
                        
                        // Handle audio output
                        const base64Audio = modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            setAssistantIsSpeaking(true);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);

                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0) {
                                    setAssistantIsSpeaking(false);
                                }
                            });
                            
                            const currentTime = outputAudioContextRef.current.currentTime;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        // Handle transcript
                        if(inputTranscription || outputTranscription) {
                            setTranscriptHistory(prev => {
                                const newHistory = [...prev];
                                const lastItem = newHistory[newHistory.length - 1];
                                if(inputTranscription) {
                                    if(lastItem?.source === 'user') {
                                        lastItem.text += inputTranscription.text;
                                    } else {
                                        newHistory.push({id: Date.now(), source: 'user', text: inputTranscription.text});
                                    }
                                }
                                if(outputTranscription) {
                                     if(lastItem?.source === 'ai') {
                                        lastItem.text += outputTranscription.text;
                                    } else {
                                        newHistory.push({id: Date.now(), source: 'ai', text: outputTranscription.text});
                                    }
                                }
                                return newHistory;
                            });
                        }
                    }

                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            handleFunctionCall(fc);
                        }
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setIsListening(false);
                },
                onclose: (e: CloseEvent) => {
                    setIsListening(false);
                    stopSession();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                systemInstruction: `شما دستیار صوتی هوشمند "صرافی الشیخ" استین و به دو زبان رسمی افغانستان (دری و پشتو) تسلط کامل دارین.

**قوانین اصلی:**
1.  **زبان پیش‌فرض:** همیشه به صورت پیش‌فرض با لهجه شیرین **دری افغانستان** صحبت کنین. از کلمات و اصطلاحات رایج در افغانستان استفاده کنین و از فارسی ایرانی پرهیز کنین.
2.  **تغییر زبان به پشتو:** فقط و فقط اگر کاربر به صورت واضح از شما خواست که به پشتو صحبت کنین (مثلاً گفت "په پښتو خبری وکړه" یا "به پشتو گپ بزن")، زبان خود را به پشتو تغییر داده و تا آخر همان مکالمه به پشتو ادامه بدین.
3.  **دو وظیفه اصلی شما:**
    *   **اجرای دستورات (اپراتور):** دستورات مالی و اداری کاربر را با دقت گوش کرده و توابع مربوطه را فراخوانی کنین. (مثلاً ثبت حواله، گزارش‌گیری و غیره).
    *   **آموزش و راهنمایی (رهنما):** اگر کاربر در مورد استفاده از اپلیکیشن سوالی داشت، با استفاده از "پایگاه دانش" زیر، او را به زبان ساده و روان راهنمایی کنین.

**--- پایگاه دانش داخلی اپلیکیشن (به زبان دری) ---**

*   **داشبورد (صفحه اصلی):** ای صفحه اصلی شماست. اینجی می‌تانین خلاصه فعالیت‌های روزانه، مثل تعداد حواله‌ها، درخواست‌های منتظر تایید و گراف‌های مالی ره ببینین.
*   **صندوق (Cashbox):** این بخش برای مدیریت پیسه نقد (رسید و برد) از صندوق اصلی صرافی اس. تمام پیسه‌هایی که نقد می‌گیرین یا پرداخت می‌کنین، باید از طریق "ثبت رسید/برد جدید" اینجی ثبت شوه.
*   **حواله‌جات داخلی:** برای روان کدن پیسه به ولایت‌های دیگه افغانستان از ای بخش استفاده کنین. حواله ره می‌تانین نقدی یا از حساب مشتری ثبت کنین. حواله‌هایی که از همکارها میایه ره هم از اینجی پرداخت کرده می‌تانین.
*   **تبادلات (Foreign Transfers):** ای بخش برای تبدیل اسعار بین دارایی‌های مختلف شما (صندوق‌ها و حساب‌های بانکی) استفاده می‌شه. ای کار دو مرحله داره:
    1.  **مرحله اول - شروع تبادله:** با زدن دکمه "+ شروع تبادله جدید"، شما مشخص می‌کنین که کدام اسعار ره از کدام دارایی (مثلاً دالر از صندوق) می‌فروشن. ای کار یک درخواست "برد" در صندوق ثبت می‌کنه.
    2.  **مرحله دوم - تکمیل تبادله:** بعد ازی که صندوقدار درخواست برد ره تایید کد، وضعیت تبادله "در جریان" می‌شه. حالا باید روی دکمه "تکمیل تبادله" کلیک کرده و مشخص کنین که در مقابلش، کدام اسعار ره به کدام دارایی (مثلاً تومان به بانک ملت) گرفتین. ای کار یک درخواست "رسید" در صندوق ثبت می‌کنه.
    3.  **پایان:** وقتی هر دو درخواست برد و رسید تایید شد، تبادله "تکمیل شده" حساب می‌شه.
*   **حواله‌جات کمیشن‌کاری:** بری مدیریت حواله‌هایی که از طرف مشتری‌ها به مقاصد خاص (معمولاً خارج از کشور) انجام می‌دین و کمیشن می‌گیرین. اول ورود پیسه ره ثبت می‌کنین و بعد دستور پرداختشه اجرا می‌کنین.
*   **انتقال داخلی بین مشتریان:** برای انتقال پیسه بین حساب دو مشتری که در سیستم ثبت اس، از ای بخش کار بگیرین.
*   **مشتریان:** در ای بخش لیست تمام مشتریای خوده دیده می‌تانین، مشتری جدید ثبت کنین و دفتر حساب هر مشتری ره ببینین.
*   **حساب همکاران:** بری مدیریت حساب صرافای دیگه که همرایشان کار می‌کنین. می‌تانین لیست همکارا و باقی‌مانده حساب خوده همرایشان ببینین.
*   **مصارف:** بری ثبت تمام خرچ‌های صرافی مثل کرایه، معاش کارمندها و مصرف مهمانداری از ای بخش استفاده کنین.
*   **گزارشات:** بری جور کدن گزارش‌های مالی دقیق مثل سود و زیان یا خلاصه کارکرد صندوق.
*   **تنظیمات:** ای بخش مخصوص مدیر سیستم اس و بری مدیریت کاربرها، تعیین دسترسی‌ها، ثبت همکار و حساب بانکی جدید و گرفتن بکاپ از اطلاعات استفاده می‌شه.`,
                tools: geminiService.tools,
            },
        });
        
        setSession(await sessionPromise);

    }, [session, user, handleFunctionCall]);

    const stopSession = useCallback(() => {
        setIsListening(false);
        setAssistantIsSpeaking(false);
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        session?.close();
        setSession(null);
    }, [session]);
    
    const toggleSession = () => {
        if(session) {
            stopSession();
        } else {
            startSession();
        }
    };

    const getButtonClass = () => {
        if (!session) return 'bg-cyan-500/80 hover:bg-cyan-400';
        if (assistantIsSpeaking) return 'bg-fuchsia-500 animate-pulse';
        if (isListening) return 'bg-green-500 animate-pulse';
        return 'bg-red-600'; // Connected but idle
    }

    return (
        <div className="fixed bottom-8 left-8 z-50 flex flex-col items-center" style={{ direction: 'rtl' }}>
            {session && (
                 <div className="w-[350px] h-80 bg-[#12122E]/80 backdrop-blur-sm border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)] rounded-lg mb-4 flex flex-col animate-fadeIn">
                     <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {transcriptHistory.map(line => (
                             <div key={line.id} className={`flex ${line.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <p className={`px-3 py-2 rounded-lg text-lg ${line.source === 'user' ? 'bg-cyan-600/50 text-slate-100' : 'bg-slate-600/50 text-slate-200'}`}>
                                    {line.text}
                                </p>
                            </div>
                        ))}
                     </div>
                 </div>
            )}
             <button
                onClick={toggleSession}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-110 ${getButtonClass()}`}
                style={{
                     boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)',
                     border: '3px solid rgba(0,255,255,0.7)',
                }}
                aria-label="دستیار صوتی"
            >
                <HolographicMicIcon className="w-12 h-12" />
            </button>
        </div>
    );
};

export default VoiceAssistant;