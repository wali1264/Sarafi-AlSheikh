import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { ForeignTransaction, BankAccount, Role } from '../types';
import { foreignTransactionTypeTranslations } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import AddBankAccountModal from '../components/AddBankAccountModal';
import LogForeignTransactionModal from '../components/LogForeignTransactionModal';

const ForeignTransfersPage: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<ForeignTransaction[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [isLogTxModalOpen, setIsLogTxModalOpen] = useState(false);
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    
    const canCreate = user && [Role.Manager, Role.Foreign_Clerk].includes(user.role);

    const fetchData = useCallback(async () => {
        const txData = await api.getForeignTransactions();
        setTransactions(txData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        const accountData = await api.getBankAccounts();
        setBankAccounts(accountData);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
        setIsLogTxModalOpen(false);
        setIsAddAccountModalOpen(false);
    };

    const getCommissionStyle = (commission: number) => {
        if (commission > 0) return 'text-green-400';
        if (commission < 0) return 'text-red-400';
        return 'text-slate-400';
    }

    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">حواله جات خارجی (ایران)</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {bankAccounts.map(acc => (
                     <div key={acc.id} className="bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 text-right shadow-[0_0_20px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                        <h3 className="text-2xl font-semibold text-slate-300">{acc.bankName} - {acc.accountHolder}</h3>
                        <p className="text-lg text-slate-400">{acc.accountNumber}</p>
                        <p className="mt-2 text-4xl font-bold font-mono text-cyan-300 text-left">{new Intl.NumberFormat('fa-IR').format(acc.balance)} {acc.currency}</p>
                    </div>
                ))}
            </div>


            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center gap-4 flex-wrap">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">تراکنش های اخیر</h2>
                    {canCreate && (
                        <div className="flex gap-4">
                            <button onClick={() => setIsAddAccountModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-cyan-300 bg-transparent border-2 border-cyan-400/50 hover:bg-cyan-400/20 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
                                افزودن حساب بانکی
                            </button>
                            <button onClick={() => setIsLogTxModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                                ثبت تراکنش جدید
                            </button>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">نوع تراکنش</th>
                                <th scope="col" className="px-6 py-4 font-medium">مشتری</th>
                                <th scope="col" className="px-6 py-4 font-medium">مبلغ تومان</th>
                                <th scope="col" className="px-6 py-4 font-medium">معامله نقدی</th>
                                <th scope="col" className="px-6 py-4 font-medium">کمیسیون</th>
                                <th scope="col" className="px-6 py-4 font-medium">توضیحات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4">{t.timestamp.toLocaleDateString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4">{foreignTransactionTypeTranslations[t.type]}</td>
                                    <td className="px-6 py-4">{t.customerName}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR').format(t.tomanAmount)}</td>
                                    <td className="px-6 py-4 font-mono text-left">{t.cashTransactionAmount ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.cashTransactionAmount)} ${t.cashTransactionCurrency}` : '-'}</td>
                                    <td className={`px-6 py-4 font-mono text-left ${getCommissionStyle(t.commission)}`}>{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.commission)} {t.commissionCurrency}</td>
                                    <td className="px-6 py-4">{t.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {user && (
                <LogForeignTransactionModal isOpen={isLogTxModalOpen} onClose={() => setIsLogTxModalOpen(false)} onSuccess={handleSuccess} currentUser={user} bankAccounts={bankAccounts} />
            )}
            <AddBankAccountModal isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} onSuccess={handleSuccess} />
        </div>
    );
};

export default ForeignTransfersPage;