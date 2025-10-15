import React, { useState, FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateCashboxRequestPayload, Currency, User } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';

interface CreateCashboxRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const CreateCashboxRequestModal: React.FC<CreateCashboxRequestModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const [formData, setFormData] = useState({
        requestType: 'withdrawal' as 'withdrawal' | 'deposit',
        amount: '',
        currency: Currency.USD,
        reason: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload: CreateCashboxRequestPayload = {
            ...formData,
            amount: parseFloat(formData.amount) || 0,
            user: currentUser,
        };

        const result = await api.createCashboxRequest(payload);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت درخواست صندوق</h2></div>
                    <div className="p-8 space-y-6">
                        {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="requestType" className="block text-lg font-medium text-cyan-300 mb-2">نوع درخواست</label>
                                <select name="requestType" value={formData.requestType} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                    <option value="withdrawal">برداشت</option>
                                    <option value="deposit">واریز</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="amount" className="block text-lg font-medium text-cyan-300 mb-2">مبلغ</label>
                                <input type="text" inputMode="decimal" name="amount" value={formData.amount} onChange={handleChange} placeholder="5000" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی</label>
                            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="reason" className="block text-lg font-medium text-cyan-300 mb-2">دلیل</label>
                            <textarea name="reason" value={formData.reason} onChange={handleChange} placeholder="توضیحات مربوط به درخواست..." required rows={3} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"></textarea>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت درخواست'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCashboxRequestModal;