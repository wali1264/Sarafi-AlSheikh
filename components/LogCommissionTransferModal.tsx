import React, { useState, FormEvent, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { LogCommissionTransferPayload, Currency, User, BankAccount } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';

interface LogCommissionTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const LogCommissionTransferModal: React.FC<LogCommissionTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const [formData, setFormData] = useState({
        customerCode: '',
        amount: '',
        currency: Currency.IRT_BANK,
        receivedIntoBankAccountId: '',
        commission: '',
    });
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            api.getBankAccounts().then(accounts => {
                const activeAccounts = accounts.filter(a => a.status === 'Active');
                setBankAccounts(activeAccounts);
                if (activeAccounts.length > 0) {
                    setFormData(prev => ({ ...prev, receivedIntoBankAccountId: activeAccounts[0].id }));
                }
            });
        }
    }, [isOpen, api]);

    if (!isOpen) return null;
    
    const resetForm = () => {
        setFormData({ customerCode: '', amount: '', currency: Currency.IRT_BANK, receivedIntoBankAccountId: bankAccounts[0]?.id || '', commission: '' });
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numericFields = ['amount', 'commission', 'customerCode'];
        if (numericFields.includes(name)) {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload: LogCommissionTransferPayload = {
            ...formData,
            amount: parseFloat(formData.amount) || 0,
            commission: parseFloat(formData.commission) || 0,
            user: currentUser,
        };

        const result = await api.logCommissionTransfer(payload);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
        } else {
            onSuccess();
            handleClose();
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت ورود وجه کمیشن‌کاری</h2></div>
                    <div className="p-8 space-y-6">
                        {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                        
                        <input name="customerCode" value={formData.customerCode} onChange={handleChange} placeholder="کد مشتری" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input name="amount" value={formData.amount} onChange={handleChange} placeholder="مبلغ ورودی" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                            <select name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        <select name="receivedIntoBankAccountId" value={formData.receivedIntoBankAccountId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100">
                            <option value="" disabled>-- انتخاب حساب بانکی دریافت کننده --</option>
                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountHolder}</option>)}
                        </select>
                        
                        <input name="commission" value={formData.commission} onChange={handleChange} placeholder="مبلغ کمیسیون توافقی" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100" />
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت ورود وجه'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default LogCommissionTransferModal;