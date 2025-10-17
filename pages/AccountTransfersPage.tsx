import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { AccountTransfer, Customer, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateAccountTransferModal from '../components/CreateAccountTransferModal';
import AssignTransferModal from '../components/AssignTransferModal';

const AccountTransfersPage: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<AccountTransfer | null>(null);
    const [activeTab, setActiveTab] = useState<'ledger' | 'pending'>('ledger');
    
    const canCreate = user && [Role.Manager, Role.Domestic_Clerk, Role.Foreign_Clerk].includes(user.role);
    
    const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

    const fetchData = useCallback(async () => {
        const [transferData, customerData] = await Promise.all([
            api.getAccountTransfers(),
            api.getCustomers(),
        ]);
        setTransfers(transferData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        setCustomers(customerData);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
        setIsAssignModalOpen(false);
        setSelectedTransfer(null);
    };

    const openAssignModal = (transfer: AccountTransfer) => {
        setSelectedTransfer(transfer);
        setIsAssignModalOpen(true);
    };

    const completedTransfers = useMemo(() => transfers.filter(t => t.status === 'Completed'), [transfers]);
    const pendingTransfers = useMemo(() => transfers.filter(t => t.status === 'PendingAssignment'), [transfers]);

    const TabButton: React.FC<{ tabId: 'ledger' | 'pending'; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-6 py-3 text-2xl font-bold transition-colors duration-300 border-b-4 ${
                activeTab === tabId
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
            {children}
        </button>
    );

    const renderTable = (data: AccountTransfer[]) => (
        <div className="overflow-x-auto">
            <table className="w-full text-lg text-right text-slate-300">
                <thead className="text-xl text-slate-400 uppercase">
                    <tr>
                        <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                        <th scope="col" className="px-6 py-4 font-medium">برد از (حساب)</th>
                        <th scope="col" className="px-6 py-4 font-medium">رسید به (حساب)</th>
                        <th scope="col" className="px-6 py-4 font-medium">مبلغ</th>
                        <th scope="col" className="px-6 py-4 font-medium">شرح</th>
                        <th scope="col" className="px-6 py-4 font-medium">کاربر</th>
                        {activeTab === 'pending' && <th scope="col" className="px-6 py-4 font-medium"></th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map(t => {
                        const fromCustomer = customerMap.get(t.fromCustomerId);
                        // For completed transfers that were pending, show the final customer
                        const toCustomer = t.finalCustomerId ? customerMap.get(t.finalCustomerId) : customerMap.get(t.toCustomerId);
                        
                        return (
                        <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                            <td className="px-6 py-4">{t.timestamp.toLocaleString('fa-IR-u-nu-latn')}</td>
                            <td className="px-6 py-4">
                                {fromCustomer?.name}
                                <span className="block font-mono text-sm text-red-400">({fromCustomer?.code})</span>
                            </td>
                            <td className="px-6 py-4">
                                {toCustomer?.name}
                                <span className="block font-mono text-sm text-green-400">({toCustomer?.code})</span>
                            </td>
                            <td className="px-6 py-4 font-mono text-left text-cyan-300">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                            <td className="px-6 py-4">{t.description}</td>
                            <td className="px-6 py-4 text-slate-400">{t.user}</td>
                            {activeTab === 'pending' && (
                                <td className="px-6 py-4 text-left">
                                    <button
                                        onClick={() => openAssignModal(t)}
                                        className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                                    >
                                        تخصیص
                                    </button>
                                </td>
                            )}
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    );


    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">انتقالات بین حسابی</h1>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 pb-0 border-b-2 border-cyan-400/20 flex justify-between items-center gap-4 flex-wrap">
                    <div className="flex">
                        <TabButton tabId="ledger">روزنامچه انتقالات</TabButton>
                        <TabButton tabId="pending">
                            حواله های در انتظار تخصیص
                            {pendingTransfers.length > 0 && <span className="inline-block bg-yellow-400 text-slate-900 text-sm font-bold mr-3 px-2 py-1 rounded-full">{pendingTransfers.length}</span>}
                        </TabButton>
                    </div>
                    {canCreate && (
                        <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            ثبت انتقال جدید
                        </button>
                    )}
                </div>
                {activeTab === 'ledger' ? renderTable(completedTransfers) : renderTable(pendingTransfers)}
            </div>
            {user && (
                <CreateAccountTransferModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={handleSuccess} currentUser={user} />
            )}
            {user && selectedTransfer && (
                <AssignTransferModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} onSuccess={handleSuccess} currentUser={user} transfer={selectedTransfer} />
            )}
        </div>
    );
};

export default AccountTransfersPage;