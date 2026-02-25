
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { Customer, User, Currency } from '../types';
import { useToast } from '../contexts/ToastContext';

interface CreateBalanceEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer: Customer;
    rentedBalance: number;
    currentUser: User;
}

const CreateBalanceEntryModal: React.FC<CreateBalanceEntryModalProps> = ({ isOpen, onClose, onSuccess, customer, rentedBalance, currentUser }) => {
    const api = useApi();
    const { addToast } = useToast();
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const summaryParts = [];
            for (const [currency, balance] of Object.entries(customer.balances)) {
                if (balance !== 0) {
                    summaryParts.push(`${new Intl.NumberFormat('en-US').format(balance as number)} ${currency}`);
                }
            }
            if (rentedBalance !== 0) {
                summaryParts.push(`${new Intl.NumberFormat('en-US').format(rentedBalance)} IRT_BANK (کرایی)`);
            }

            const summaryText = summaryParts.length > 0 ? summaryParts.join(' | ') : 'تراز صفر';

            const result = await api.createBalanceSnapshot({
                customer_id: customer.id,
                created_by: currentUser.id,
                balances_data: {
                    main_balances: customer.balances,
                    rented_balance: rentedBalance
                },
                summary_text: summaryText,
                notes: notes
            });

            if ('error' in result) {
                addToast(result.error as string, 'error');
            } else {
                addToast('بیلان با موفقیت قید شد.', 'success');
                onSuccess();
            }
        } catch (error) {
            addToast('خطا در ثبت بیلان.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-2xl border-2 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                 style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-amber-500/20">
                    <h2 className="text-4xl font-bold text-amber-400 tracking-wider">قید بیلان مشتری</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="bg-slate-900/40 p-4 border border-amber-500/10 rounded-lg">
                        <h3 className="text-xl text-slate-400 mb-2">خلاصه وضعیت فعلی:</h3>
                        <div className="text-2xl font-bold text-slate-100">
                            {customer.name} (کد: {customer.code})
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            {Object.entries(customer.balances).map(([curr, bal]) => {
                                const balance = bal as number;
                                return balance !== 0 && (
                                    <div key={curr} className="flex justify-between items-center bg-black/20 p-2 rounded">
                                        <span className="text-slate-400">{curr}:</span>
                                        <span className={`font-mono ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {new Intl.NumberFormat('en-US').format(balance)}
                                        </span>
                                    </div>
                                );
                            })}
                            {rentedBalance !== 0 && (
                                <div className="flex justify-between items-center bg-black/20 p-2 rounded col-span-2">
                                    <span className="text-teal-400">IRT_BANK (کرایی):</span>
                                    <span className={`font-mono ${rentedBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {new Intl.NumberFormat('en-US').format(rentedBalance)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xl font-medium text-slate-300 mb-2">یادداشت (اختیاری):</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full text-xl px-4 py-3 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-amber-400 h-32"
                            placeholder="توضیحات مربوط به این بیلان..."
                        />
                    </div>

                    <div className="flex justify-end space-x-4 space-x-reverse pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors"
                        >
                            انصراف
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-10 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/50 transition-all transform hover:scale-105 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(245, 158, 11, 0.5)'
                            }}
                        >
                            {isSubmitting ? 'در حال ثبت...' : 'تایید و ثبت بیلان'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default CreateBalanceEntryModal;
