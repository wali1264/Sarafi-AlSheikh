import React, { useState, FormEvent } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { CreatePartnerPayload, Currency, User } from '../types';
import { CURRENCIES, AFGHANISTAN_PROVINCES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';

interface AddPartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const [formData, setFormData] = useState({
        name: '',
        province: AFGHANISTAN_PROVINCES[0],
        whatsappNumber: ''
    });
    const [balances, setBalances] = useState<{[key: string]: string}>({});
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBalanceChange = (currency: Currency, value: string) => {
        setBalances(prev => ({
            ...prev,
            [currency]: persianToEnglishNumber(value)
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const numericBalances: { [key in Currency]?: number } = {};
        for (const currency of CURRENCIES) {
            const value = balances[currency];
            if (value && value.trim() !== '') {
                numericBalances[currency] = parseFloat(value);
            }
        }

        const payload: CreatePartnerPayload = {
            ...formData,
            balances: numericBalances,
            user: currentUser,
        };

        const result = await api.createPartner(payload);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
        } else {
            onSuccess();
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-3xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت همکار جدید</h2>
                    </div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                        
                        <div>
                             <label htmlFor="name" className="block text-lg font-medium text-cyan-300 mb-2">نام کامل همکار</label>
                            <input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleFormChange}
                                placeholder="مثلا: صرافی اعتماد - هرات"
                                required
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="province" className="block text-lg font-medium text-cyan-300 mb-2">ولایت</label>
                                <select id="province" name="province" value={formData.province} onChange={handleFormChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                    {AFGHANISTAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="whatsappNumber" className="block text-lg font-medium text-cyan-300 mb-2">شماره واتس‌اپ</label>
                                <input id="whatsappNumber" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleFormChange} placeholder="+93799123456" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-left font-mono" />
                            </div>
                        </div>

                         <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md">
                            <h4 className="text-xl font-bold text-cyan-300 mb-2">موجودی‌های اولیه</h4>
                             <p className="text-sm text-yellow-400 mb-4">اگر شما بدهکار هستید، مبلغ را منفی وارد کنید. فیلدهای خالی صفر در نظر گرفته می‌شوند.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {CURRENCIES.map(currency => (
                                     <div key={currency}>
                                        <label htmlFor={`balance_${currency}`} className="block text-lg font-medium text-cyan-300 mb-2">{currency}</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            id={`balance_${currency}`}
                                            name={`balance_${currency}`}
                                            value={balances[currency] || ''}
                                            onChange={(e) => handleBalanceChange(currency, e.target.value)}
                                            placeholder="مثلا: -5000 یا 12000"
                                            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                                        />
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            {isLoading ? 'در حال ثبت...' : 'ثبت همکار'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default AddPartnerModal;