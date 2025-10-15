import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { DomesticTransfer, Role, TransferStatus } from '../types';
import { statusTranslations } from '../utils/translations';
import CreateTransferModal from '../components/CreateTransferModal';
import UpdateTransferStatusModal from '../components/UpdateTransferStatusModal';
import ProcessIncomingTransferModal from '../components/ProcessIncomingTransferModal';
import { useAuth } from '../contexts/AuthContext';

const getStatusStyle = (status: TransferStatus) => {
    switch (status) {
        case TransferStatus.Pending: return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
        case TransferStatus.Executed: return 'text-blue-400 border-blue-400/50 bg-blue-400/10';
        case TransferStatus.Paid: return 'text-green-400 border-green-400/50 bg-green-400/10';
        default: return 'text-slate-400 border-slate-400/50 bg-slate-400/10';
    }
};

const DomesticTransfersPage: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [transfers, setTransfers] = useState<DomesticTransfer[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<DomesticTransfer | null>(null);

    const canCreate = user && [Role.Manager, Role.Domestic_Clerk].includes(user.role);
    const canProcess = user && [Role.Manager, Role.Domestic_Clerk, Role.Cashier].includes(user.role);

    const fetchData = useCallback(async () => {
        const data = await api.getDomesticTransfers();
        setTransfers(data.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
        setIsUpdateModalOpen(false);
        setIsProcessModalOpen(false);
        setSelectedTransfer(null);
    }

    const openUpdateModal = (transfer: DomesticTransfer) => {
        setSelectedTransfer(transfer);
        setIsUpdateModalOpen(true);
    }

    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">حواله جات داخلی</h1>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center gap-4 flex-wrap">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">مدیریت حواله ها</h2>
                    <div className="flex gap-4">
                         {canProcess && (
                            <button 
                                onClick={() => setIsProcessModalOpen(true)}
                                className="px-6 py-3 text-xl font-bold tracking-wider text-cyan-300 bg-transparent border-2 border-cyan-400/50 hover:bg-cyan-400/20 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                }}
                            >
                                پرداخت حواله ورودی
                            </button>
                         )}
                        {canCreate && (
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                    boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                                }}
                            >
                                ایجاد حواله جدید
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">کد</th>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">فرستنده</th>
                                <th scope="col" className="px-6 py-4 font-medium">گیرنده</th>
                                <th scope="col" className="px-6 py-4 font-medium">مبلغ</th>
                                <th scope="col" className="px-6 py-4 font-medium">صراف همکار</th>
                                <th scope="col" className="px-6 py-4 font-medium">وضعیت</th>
                                <th scope="col" className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.map(t => (
                                <tr key={t.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-cyan-300">{t.id}</td>
                                    <td className="px-6 py-4">{t.createdAt.toLocaleDateString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4">{t.sender.name}</td>
                                    <td className="px-6 py-4">{t.receiver.name}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(t.amount)} {t.currency}</td>
                                    <td className="px-6 py-4">{t.partnerSarraf}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full border ${getStatusStyle(t.status)}`}>
                                            {statusTranslations[t.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => openUpdateModal(t)}
                                            className="px-4 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-base transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                                        >
                                            به‌روزرسانی
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {user && (
                <CreateTransferModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
            {user && selectedTransfer && (
                <UpdateTransferStatusModal
                    isOpen={isUpdateModalOpen}
                    onClose={() => setIsUpdateModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    transfer={selectedTransfer}
                />
            )}
             {user && (
                <ProcessIncomingTransferModal
                    isOpen={isProcessModalOpen}
                    onClose={() => setIsProcessModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default DomesticTransfersPage;