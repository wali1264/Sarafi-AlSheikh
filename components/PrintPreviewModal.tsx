import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CashboxRequest } from '../types';
import { cashboxRequestStatusTranslations } from '../utils/translations';

interface PrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmPrint: (request: CashboxRequest, printNote: string) => void;
    request: CashboxRequest;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, onConfirmPrint, request }) => {
    const [printNote, setPrintNote] = useState('');

    if (!isOpen) return null;

    const handlePrint = () => {
        onConfirmPrint(request, printNote);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                    <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">پیش‌نمایش چاپ سند</h2>
                </div>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <dl className="space-y-4 text-xl p-6 border border-slate-600/50 rounded-lg bg-slate-900/30">
                        <div className="flex justify-between items-baseline">
                            <dt className="text-slate-400">کد درخواست:</dt>
                            <dd className="font-mono text-cyan-300">{request.id}</dd>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <dt className="text-slate-400">نوع:</dt>
                            <dd className={`font-bold text-2xl ${request.requestType === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>{request.requestType === 'withdrawal' ? 'برد' : 'رسید'}</dd>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <dt className="text-slate-400">مبلغ:</dt>
                            <dd className="font-mono font-bold text-3xl text-slate-100">{new Intl.NumberFormat('fa-IR').format(request.amount)} {request.currency}</dd>
                        </div>
                        <div className="flex flex-col pt-2 border-t border-slate-700">
                            <dt className="text-slate-400 mb-1">شرح:</dt>
                            <dd className="text-slate-200 bg-slate-800/50 p-3 rounded-md text-base">{request.reason}</dd>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-700">
                            <dt className="text-slate-400">وضعیت:</dt>
                            <dd>{cashboxRequestStatusTranslations[request.status]}</dd>
                        </div>
                    </dl>
                    <div>
                        <label htmlFor="printNote" className="block text-lg font-medium text-cyan-300 mb-2">یادداشت برای چاپ (اختیاری)</label>
                        <textarea
                            id="printNote"
                            value={printNote}
                            onChange={(e) => setPrintNote(e.target.value)}
                            placeholder="این یادداشت فقط روی نسخه چاپی نمایش داده می‌شود..."
                            rows={3}
                            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                        ></textarea>
                    </div>
                </div>
                <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">بستن</button>
                    <button
                        onClick={handlePrint}
                        className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                            boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                        }}
                    >
                        چاپ نهایی
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default PrintPreviewModal;
