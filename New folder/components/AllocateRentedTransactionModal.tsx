
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import { Customer, PartnerAccount, RentedAccountTransaction } from '../types';
import { debounce } from '../utils/debounce';
import { useToast } from '../contexts/ToastContext';

interface AllocateRentedTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transaction: RentedAccountTransaction;
}

const AllocateRentedTransactionModal: React.FC<AllocateRentedTransactionModalProps> = ({ isOpen, onClose, onSuccess, transaction }) => {
    const api = useApi();
    const { addTransaction, partners } = useRentedAccounts();
    const { addToast } = useToast();
    
    const [targetType, setTargetType] = useState<'Customer' | 'Partner'>('Customer');
    const [customerQuery, setCustomerQuery] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const checkCustomer = useCallback(debounce(async (query: string) => {
        if (!query) {
            setFoundCustomer(null);
            return;
        }
        setIsCheckingCustomer(true);
        const result = await api.findCustomerByCodeOrName(query);
        setFoundCustomer(result || null);
        setIsCheckingCustomer(false);
    }, 500), [api]);

    const handleCustomerQueryChange = (query: string) => {
        setCustomerQuery(query);
        checkCustomer(query);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        let finalUserId = '';
        let targetName = '';

        if (targetType === 'Customer') {
            if (!foundCustomer) {
                addToast('لطفا یک مشتری معتبر انتخاب کنید.', 'error');
                setIsLoading(false);
                return;
            }
            finalUserId = foundCustomer.id;
            targetName = foundCustomer.name;
        } else {
            const selectedPartner = partners.find(p => p.id === partnerId);
            if (!selectedPartner) {
                addToast('لطفا یک همکار معتبر انتخاب کنید.', 'error');
                setIsLoading(false);
                return;
            }
            finalUserId = selectedPartner.id;
            targetName = selectedPartner.name;
        }

        try {
            // STEP 1: Withdraw from Suspense account to clear it
            const withdrawSuccess = await addTransaction({
                rented_account_id: transaction.rented_account_id,
                user_id: undefined,
                user_type: 'Guest',
                guest_name: 'SUSPENSE',
                type: 'withdrawal',
                amount: transaction.amount,
                commission_percentage: 0,
                commission_amount: 0,
                total_transaction_amount: transaction.amount,
                timestamp: new Date(),
                destination_bank_name: 'تخصیص حساب معلق',
                destination_account: `انتقال به ${targetName}`,
            });

            if (!withdrawSuccess) throw new Error('خطا در کسر مبلغ از حساب معلق');

            // STEP 2: Deposit into the real account
            const depositSuccess = await addTransaction({
                rented_account_id: transaction.rented_account_id,
                user_id: finalUserId,
                user_type: targetType,
                type: 'deposit',
                amount: transaction.amount,
                commission_percentage: 0,
                commission_amount: 0,
                total_transaction_amount: transaction.amount,
                timestamp: new Date(),
                source_bank_name: 'حساب معلق (تخصیص)',
                receipt_serial: `ALLOC-${transaction.id.slice(-6)}`,
            });

            if (!depositSuccess) throw new Error('برداشت انجام شد اما واریز به حساب مشتری با خطا مواجه شد.');

            addToast(`مبلغ با موفقیت به حساب ${targetName} تخصیص یافت.`, 'success');
            onSuccess();
        } catch (error: any) {
            console.error(error);
            addToast(error.message || 'خطایی در فرآیند تخصیص رخ داد.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/95 w-full max-w-2xl border-2 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-amber-500/20">
                        <h2 className="text-4xl font-bold text-amber-300 tracking-wider">تخصیص رسید معلق</h2>
                        <p className="text-slate-400 mt-1">مبلغ: {new Intl.NumberFormat('fa-IR').format(transaction.amount)} تومان</p>
                    </div>
                    
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-200">
                            این رسید را به کدام مشتری یا همکار واقعی تخصیص می‌دهید؟
                        </div>

                        <div className="flex gap-x-4">
                            <label className={`flex-1 text-center text-lg p-3 rounded-md cursor-pointer transition-colors ${targetType === 'Customer' ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300'}`}>
                                <input type="radio" name="targetType" value="Customer" checked={targetType === 'Customer'} onChange={() => setTargetType('Customer')} className="hidden" />
                                مشتری
                            </label>
                            <label className={`flex-1 text-center text-lg p-3 rounded-md cursor-pointer transition-colors ${targetType === 'Partner' ? 'bg-cyan-400 text-slate-900 font-bold' : 'bg-slate-700/50 text-slate-300'}`}>
                                <input type="radio" name="targetType" value="Partner" checked={targetType === 'Partner'} onChange={() => setTargetType('Partner')} className="hidden" />
                                همکار
                            </label>
                        </div>

                        <div className="mt-4">
                            {targetType === 'Customer' ? (
                                <div>
                                    <label className="block text-lg font-medium text-cyan-300 mb-2">جستجوی مشتری</label>
                                    <input value={customerQuery} onChange={e => handleCustomerQueryChange(e.target.value)} placeholder="کد یا نام مشتری..." required className="w-full text-xl px-4 py-3 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-white" />
                                    {isCheckingCustomer && <p className="text-sm text-slate-400 mt-1">در حال جستجو...</p>}
                                    {foundCustomer && <p className="text-sm text-green-400 mt-1 font-bold">✓ مشتری انتخاب شد: {foundCustomer.name}</p>}
                                    {foundCustomer === null && customerQuery && !isCheckingCustomer && <p className="text-sm text-red-400 mt-1">مشتری با این مشخصات یافت نشد.</p>}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-lg font-medium text-cyan-300 mb-2">انتخاب همکار</label>
                                    <select value={partnerId} onChange={e => setPartnerId(e.target.value)} required className="w-full text-xl px-4 py-3 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-white">
                                        <option value="" disabled>-- لیست همکاران فعال --</option>
                                        {partners.filter(p => p.status === 'Active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-black/30 border-t-2 border-amber-500/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                            {isLoading ? 'در حال پردازش...' : 'تایید و انتقال به حساب'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default AllocateRentedTransactionModal;
