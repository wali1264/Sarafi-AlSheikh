import React, { useState, FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { SettlePartnerBalancePayload, User, PartnerAccount } from '../types';
import { persianToEnglishNumber } from '../utils/translations';

interface SettleBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    partner: PartnerAccount;
}

const SettleBalanceModal: React.FC<SettleBalanceModalProps> = ({ isOpen, onClose, onSuccess, currentUser, partner }) => {
    const api = useApi();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(persianToEnglishNumber(e.target.value));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload: SettlePartnerBalancePayload = {
            partnerId: partner.id,
            amount: parseFloat(amount) || 0,
            currency: partner.currency,
            user: currentUser,
        };

        const result = await api.settlePartnerBalance(payload);

        setIsLoading(false);
        if ('error' in result) {
            setError(result.error);
        } else {
            setAmount('');
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت تسویه حساب</h2>
                        <p className="text-lg text-slate-400 mt-1">برای {partner.name}</p>
                    </div>
                    <div className="p-8 space-y-6">
                        {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                        
                        <div>
                            <label htmlFor="amount" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">
                                مبلغ تسویه ({partner.currency})
                            </label>
                            <input
                                type="text"
                                id="amount"
                                name="amount"
                                value={amount}
                                onChange={handleChange}
                                placeholder="مبلغ تسویه شده را وارد کنید"
                                required
                                inputMode="decimal"
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300"
                            />
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">لغو</button>
                        <button type="submit" disabled={isLoading} 
                                className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                    boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                                }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت تسویه'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettleBalanceModal;