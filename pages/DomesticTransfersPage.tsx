


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { DomesticTransfer, TransferStatus, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateTransferModal from '../components/CreateTransferModal';
import UpdateTransferStatusModal from '../components/UpdateTransferStatusModal';
import ProcessIncomingTransferModal from '../components/ProcessIncomingTransferModal';
import { statusTranslations } from '../utils/translations';

const DomesticTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transfers, setTransfers] = useState<DomesticTransfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');

    // Modal States
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
    const [isProcessModalOpen, setProcessModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<DomesticTransfer | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await api.getDomesticTransfers();
        setTransfers(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSuccess = () => {
        setCreateModalOpen(false);
        setUpdateModalOpen(false);
        setProcessModalOpen(false);
        setSelectedTransfer(null);
        fetchData();
    };

    const handleUpdateClick = (transfer: DomesticTransfer) => {
        if (transfer.status === TransferStatus.Paid || transfer.status === TransferStatus.Cancelled) {
            // Do not open modal for transfers in a final state
            return;
        }
        setSelectedTransfer(transfer);
        setUpdateModalOpen(true);
    };

    const filteredTransfers = useMemo(() => {
        return transfers.filter(t => {
            const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === '' ||
                t.id.toLowerCase().includes(searchTermLower) ||
                (t.partnerReference && t.partnerReference.toLowerCase().includes(searchTermLower)) ||
                t.sender.name.toLowerCase().includes(searchTermLower) ||
                t.receiver.name.toLowerCase().includes(searchTermLower) ||
                t.partnerSarraf.toLowerCase().includes(searchTermLower);
            return matchesStatus && matchesSearch;
        });
    }, [transfers, searchTerm, statusFilter]);

    const getStatusStyle = (status: TransferStatus) => {
        switch (status) {
            case TransferStatus.Paid:
                return 'bg-green-500/20 text-green-300';
            case TransferStatus.Executed:
                return 'bg-blue-500/20 text-blue-300';
            case TransferStatus.Pending:
                return 'bg-yellow-500/20 text-yellow-300';
            case TransferStatus.Cancelled:
                return 'bg-red-500/20 text-red-300';
            default:
                return 'bg-slate-600/20 text-slate-300';
        }
    };


    return (
        <div style={{direction: 'rtl'}}>
             <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت حواله‌جات داخلی</h1>
                <div className="flex gap-4">
                    {hasPermission('domesticTransfers', 'process') && (
                         <button onClick={() => setProcessModalOpen(true)} className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">
                            پرداخت حواله ورودی
                        </button>
                    )}
                    {hasPermission('domesticTransfers', 'create') && (
                        <button onClick={() => setCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                            + ایجاد حواله جدید
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-4 border-b-2 border-cyan-400/20 flex gap-4 items-center">
                    <input 
                        type="text"
                        placeholder="جستجو بر اساس کد، کد همکار، فرستنده، گیرنده..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                     <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="text-lg px-4 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                    >
                        <option value="all">همه وضعیت‌ها</option>
                        {Object.values(TransferStatus).map(s => <option key={s} value={s}>{statusTranslations[s as TransferStatus]}</option>)}
                    </select>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">کد / تاریخ</th>
                                <th className="px-6 py-4 font-medium">فرستنده</th>
                                <th className="px-6 py-4 font-medium">گیرنده</th>
                                <th className="px-6 py-4 font-medium">مقصد</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                                <th className="px-6 py-4 font-medium"></th>
                           </tr>
                        </thead>
                        <tbody>
                            {filteredTransfers.map(t => (
                                <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-cyan-300">{t.id}</div>
                                        {t.partnerReference && <div className="font-mono text-xs text-amber-400">همکار: {t.partnerReference}</div>}
                                        <div className="text-sm text-slate-400">{new Date(t.createdAt).toLocaleDateString('fa-IR-u-nu-latn')}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-100 font-semibold">{t.sender.name}</td>
                                    <td className="px-6 py-4 text-slate-100 font-semibold">{t.receiver.name}</td>
                                    <td className="px-6 py-4">
                                        <div>{t.destinationProvince}</div>
                                        <div className="text-sm text-slate-400">{t.partnerSarraf}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(t.status)}`}>
                                            {statusTranslations[t.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        {hasPermission('domesticTransfers', 'edit') && t.status !== TransferStatus.Paid && t.status !== TransferStatus.Cancelled && (
                                            <button onClick={() => handleUpdateClick(t)} className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">
                                                تغییر وضعیت
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>

            {isCreateModalOpen && user && (
                <CreateTransferModal 
                    isOpen={isCreateModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
            {isUpdateModalOpen && user && selectedTransfer && (
                <UpdateTransferStatusModal
                    isOpen={isUpdateModalOpen}
                    onClose={() => setUpdateModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    transfer={selectedTransfer}
                />
            )}
            {isProcessModalOpen && user && (
                 <ProcessIncomingTransferModal
                    isOpen={isProcessModalOpen}
                    onClose={() => setProcessModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default DomesticTransfersPage;