
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { AccountTransfer, User, Customer } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateAccountTransferModal from '../components/CreateAccountTransferModal';
import AssignTransferModal from '../components/AssignTransferModal';

const AccountTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
    const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<AccountTransfer | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [transferData, customerData] = await Promise.all([
            api.getAccountTransfers(),
            api.getCustomers()
        ]);
        setTransfers(transferData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setCustomers(new Map(customerData.map(c => [c.id, c])));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setCreateModalOpen(false);
        setAssignModalOpen(false);
        setSelectedTransfer(null);
        fetchData();
    };
    
    const handleAssignClick = (transfer: AccountTransfer) => {
        setSelectedTransfer(transfer);
        setAssignModalOpen(true);
    };

    const { completedTransfers, pendingTransfers } = useMemo(() => {
        const completed = transfers.filter(t => t.status === 'Completed');
        const pending = transfers.filter(t => t.status === 'PendingAssignment');
        return { completedTransfers: completed, pendingTransfers: pending };
    }, [transfers]);

    const TransferTable: React.FC<{
        title: string;
        data: AccountTransfer[];
        isPending?: boolean;
    }> = ({ title, data, isPending = false }) => (
        <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6 border-b-2 border-cyan-400/20">
                <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">{title}</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-lg text-right text-slate-300">
                    <thead className="text-xl text-slate-400 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-medium">تاریخ</th>
                            <th className="px-6 py-4 font-medium">از حساب</th>
                            <th className="px-6 py-4 font-medium">به حساب</th>
                            <th className="px-6 py-4 font-medium">مبلغ</th>
                            <th className="px-6 py-4 font-medium">توضیحات</th>
                            {isPending && <th className="px-6 py-4 font-medium"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(t => (
                            <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(t.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                <td className="px-6 py-4 font-semibold text-slate-100">{customers.get(t.fromCustomerId)?.name || 'ناشناس'}</td>
                                <td className="px-6 py-4 font-semibold text-slate-100">{customers.get(t.toCustomerId)?.name || 'ناشناس'}</td>
                                <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                <td className="px-6 py-4">{t.description}</td>
                                {isPending && (
                                    <td className="px-6 py-4 text-left">
                                        <button onClick={() => handleAssignClick(t)} className="px-4 py-2 bg-amber-600/50 hover:bg-amber-500/50 text-amber-200 rounded">تخصیص</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">انتقالات بین حسابی</h1>
                {hasPermission('accountTransfers', 'create') && (
                    <button onClick={() => setCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + انتقال جدید
                    </button>
                )}
            </div>
            
            {pendingTransfers.length > 0 && (
                <TransferTable title="حواله‌های در انتظار تخصیص" data={pendingTransfers} isPending />
            )}
            
            <TransferTable title="تاریخچه انتقالات" data={completedTransfers} />
            
            {isCreateModalOpen && user && (
                <CreateAccountTransferModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleSuccess} currentUser={user} />
            )}
            {isAssignModalOpen && user && selectedTransfer && (
                <AssignTransferModal isOpen={isAssignModalOpen} onClose={() => setAssignModalOpen(false)} onSuccess={handleSuccess} currentUser={user} transfer={selectedTransfer} />
            )}
        </div>
    );
};

export default AccountTransfersPage;
