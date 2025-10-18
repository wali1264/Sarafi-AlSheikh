import React, { useState, FormEvent, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { UpdateBankAccountPayload, User, BankAccount } from '../types';

interface EditBankAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    bankAccount: BankAccount;
}

const EditBankAccountModal: React.FC<EditBankAccountModalProps> = ({ isOpen, onClose, onSuccess, currentUser, bankAccount }) => {
    const api = useApi();
    const [formData, setFormData] = useState({
        accountHolder: '',
        bankName: '',
        accountNumber: '',
        cardToCardNumber: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if(bankAccount) {
            setFormData({
                accountHolder: bankAccount.accountHolder,
                bankName: bankAccount.bankName,
                accountNumber: bankAccount.accountNumber,
                cardToCardNumber: bankAccount.cardToCardNumber || '',
            });
        }
    }, [bankAccount]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload: UpdateBankAccountPayload = {
            id: bankAccount.id,
            ...formData,
            cardToCardNumber: formData.cardToCardNumber || undefined,
            user: currentUser,
        };
        const result = await api.updateBankAccount(payload);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
        } else {
            onSuccess();
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ویرایش حساب بانکی</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                        <input name="accountHolder" value={formData.accountHolder} onChange={handleChange} placeholder="نام صاحب حساب" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                        <input name="bankName" value={formData.bankName} onChange={handleChange} placeholder="نام بانک" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                        <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="شماره حساب" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                        <input name="cardToCardNumber" value={formData.cardToCardNumber} onChange={handleChange} placeholder="شماره کارت (اختیاری)" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                         <p className="text-sm text-slate-400 mt-2">توجه: موجودی حساب از این بخش قابل ویرایش نیست و تنها از طریق تراکنش‌ها تغییر می‌کند.</p>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 transition-all transform hover:scale-105 disabled:opacity-50">
                            {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default EditBankAccountModal;