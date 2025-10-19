import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { CommissionTransfer, User, Customer, BankAccount, PartnerAccount } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LogCommissionTransferModal from '../components/LogCommissionTransferModal';
import ExecuteCommissionTransferModal from '../components/ExecuteCommissionTransferModal';

const CommissionTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transfers, setTransfers] = useState<CommissionTransfer[]>([]);
    const [initiatorsMap, setInitiatorsMap] = useState<Map<string, {name: string}>>(new Map());
    const [bankAccountsMap, setBankAccountsMap] = useState<Map<string, BankAccount>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'PendingExecution' | 'Completed'>('PendingExecution');

    // Modal States
    const [isLogModalOpen, setLogModalOpen] = useState(false);
    const [isExecuteModalOpen, setExecuteModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<CommissionTransfer | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [data, customersData, partnersData, bankAccountsData] = await Promise.all([
            api.getCommissionTransfers(),
            api.getCustomers(),
            api.getPartnerAccounts(),
            api.getBankAccounts(),
        ]);
        
        const newInitiatorsMap = new Map<string, {name: string}>();
        customersData.forEach(c => newInitiatorsMap.set(c.id, { name: c.name }));
        partnersData.forEach(p => newInitiatorsMap.set(p.id, { name: p.name }));
        
        setTransfers(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setInitiatorsMap(newInitiatorsMap);
        setBankAccountsMap(new Map(bankAccountsData.map(b => [b.id, b])));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setLogModalOpen(false);
        setExecuteModalOpen(false);
        setSelectedTransfer(null);
        fetchData();
    };

    const handleExecuteClick = (transfer: CommissionTransfer) => {
        setSelectedTransfer(transfer);
        setExecuteModalOpen(true);
    };

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t => t.status === filter);
    }, [transfers, filter]);
    
    const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
        <button
            onClick={onClick}
            className={`px-6 py-3 text-2xl font-bold transition-colors duration-300 border-b-4 ${
                active ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
            {children}
        </button>
    );


    return (
        <div style={{ direction: 'rtl' }}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">حواله‌جات کمیشن‌کاری</h1>
                {hasPermission('commissionTransfers', 'create') && (
                    <button onClick={() => setLogModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                        + ثبت ورود وجه جدید
                    </button>
                )}
            </div>
            
            <div className="border-b-2 border-cyan-400/20 mb-8">
                <TabButton active={filter === 'PendingExecution'} onClick={() => setFilter('PendingExecution')}>در انتظار اجرا</TabButton>
                <TabButton active={filter === 'Completed'} onClick={() => setFilter('Completed')}>تکمیل شده</TabButton>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">از طرف</th>
                                <th className="px-6 py-4 font-medium">حساب مبدأ</th>
                                <th className="px-6 py-4 font-medium">مبلغ ورودی</th>
                                <th className="px-6 py-4 font-medium">فیصدی کمیسیون</th>
                                {filter === 'Completed' && <th className="px-6 py-4 font-medium">کمیسیون محاسبه شده</th>}
                                {filter === 'Completed' && <th className="px-6 py-4 font-medium">مبلغ نهایی پرداخت</th>}
                                <th className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="text-center p-8 text-slate-400">در حال بارگذاری...</td></tr>
                            ) : filteredTransfers.map(t => (
                                <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-100">
                                        <div>{initiatorsMap.get(t.initiatorId)?.name || 'ناشناس'}</div>
                                        <div className="text-sm text-slate-400">{t.initiatorType === 'Customer' ? 'مشتری' : 'همکار'}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-cyan-300">{t.sourceAccountNumber}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                    <td className="px-6 py-4 font-mono text-left text-amber-400">{t.commissionPercentage}%</td>
                                    {filter === 'Completed' && (
                                         <td className="px-6 py-4 font-mono text-left text-amber-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.commissionAmount || 0)} {t.currency}</td>
                                    )}
                                     {filter === 'Completed' && (
                                         <td className="px-6 py-4 font-mono text-left text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.finalAmountPaid || 0)} {t.currency}</td>
                                    )}
                                    <td className="px-6 py-4 text-left">
                                        {t.status === 'PendingExecution' && hasPermission('commissionTransfers', 'process') && (
                                            <button onClick={() => handleExecuteClick(t)} className="px-4 py-2 bg-amber-600/50 hover:bg-amber-500/50 text-amber-200 rounded text-base font-bold">
                                                اجرای دستور پرداخت
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isLogModalOpen && user && (
                <LogCommissionTransferModal
                    isOpen={isLogModalOpen}
                    onClose={() => setLogModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
             {isExecuteModalOpen && user && selectedTransfer && (
                <ExecuteCommissionTransferModal
                    isOpen={isExecuteModalOpen}
                    onClose={() => setExecuteModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    transfer={selectedTransfer}
                />
            )}
        </div>
    );
};

export default CommissionTransfersPage;