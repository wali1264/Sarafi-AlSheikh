import React, { useState, FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { DomesticTransfer, User, TransferStatus, PayoutIncomingTransferPayload } from '../types';
import { statusTranslations } from '../utils/translations';

interface ProcessIncomingTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const ProcessIncomingTransferModal: React.FC<ProcessIncomingTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const [transferId, setTransferId] = useState('');
    const [foundTransfer, setFoundTransfer] = useState<DomesticTransfer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'search' | 'confirm'>('search');

    if (!isOpen) return null;

    const resetState = () => {
        setTransferId('');
        setFoundTransfer(null);
        setError(null);
        setIsLoading(false);
        setStep('search');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };
    
    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setFoundTransfer(null);
        
        const result = await api.findTransferById({ transferId });
        setIsLoading(false);
        if ('error' in result) {
            setError(result.error);
        } else {
            setFoundTransfer(result);
            setStep('confirm');
        }
    };

    const handlePayout = async () => {
        if (!foundTransfer) return;
        setIsLoading(true);
        setError(null);

        const payload: PayoutIncomingTransferPayload = {
            transferId: foundTransfer.id,
            user: currentUser,
        };
        
        const result = await api.payoutIncomingTransfer(payload);
        setIsLoading(false);
        if ('error' in result) {
            setError(result.error);
        } else {
            onSuccess();
            handleClose();
        }
    };

    const isPayoutDisabled = !foundTransfer || foundTransfer.status !== TransferStatus.Executed;

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                
                <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">پرداخت حواله ورودی</h2>
                </div>
                
                <div className="p-8 space-y-6">
                    {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                    
                    {step === 'search' && (
                         <form onSubmit={handleSearch} className="space-y-4">
                            <div>
                                <label htmlFor="transferId" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">کد رهگیری حواله</label>
                                <input
                                    type="text"
                                    id="transferId"
                                    name="transferId"
                                    value={transferId}
                                    onChange={(e) => setTransferId(e.target.value.toUpperCase())}
                                    placeholder="مثلا: DT-12345"
                                    required
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right font-mono"
                                />
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={isLoading} 
                                    className="w-full px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                        boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                                    }}>
                                    {isLoading ? 'در حال جستجو...' : 'جستجوی حواله'}
                                </button>
                            </div>
                         </form>
                    )}

                    {step === 'confirm' && foundTransfer && (
                        <div className="space-y-4 text-xl animate-fadeIn">
                             <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 border border-cyan-400/20 rounded-md bg-slate-900/30">
                                <div className="text-slate-400">مبلغ:</div>
                                <div className="font-bold font-mono text-cyan-300">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(foundTransfer.amount)} {foundTransfer.currency}</div>
                                
                                <div className="text-slate-400">فرستنده:</div>
                                <div className="font-bold">{foundTransfer.sender.name}</div>
                                
                                <div className="text-slate-400">گیرنده:</div>
                                <div className="font-bold">{foundTransfer.receiver.name}</div>

                                <div className="text-slate-400">صراف همکار:</div>
                                <div className="font-bold">{foundTransfer.partnerSarraf}</div>

                                <div className="text-slate-400">وضعیت فعلی:</div>
                                <div className="font-bold">{statusTranslations[foundTransfer.status]}</div>
                            </div>
                            {isPayoutDisabled && (
                                <p className="text-yellow-400 text-base">این حواله آماده پرداخت نیست. وضعیت آن باید "اجرا شده" باشد.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                    <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">بستن</button>
                    {step === 'confirm' && (
                        <button type="button" onClick={handlePayout} disabled={isLoading || isPayoutDisabled} 
                            className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(74, 222, 128, 0.5)'
                            }}>
                            {isLoading ? 'در حال پرداخت...' : 'تایید و پرداخت نهایی'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProcessIncomingTransferModal;