import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { CashboxBalance, CashboxRequest, CashboxRequestStatus, User } from '../types';
import { cashboxRequestStatusTranslations } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import CreateCashboxRequestModal from '../components/CreateCashboxRequestModal';

const getStatusStyle = (status: CashboxRequestStatus) => {
    switch (status) {
        case CashboxRequestStatus.Pending: return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
        case CashboxRequestStatus.Approved: return 'text-green-400 border-green-400/50 bg-green-400/10';
        case CashboxRequestStatus.Rejected: return 'text-red-400 border-red-400/50 bg-red-400/10';
        default: return 'text-slate-400 border-slate-400/50 bg-slate-400/10';
    }
};

const CashboxPage: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [balances, setBalances] = useState<CashboxBalance[]>([]);
    const [requests, setRequests] = useState<CashboxRequest[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        const balanceData = await api.getCashboxBalances();
        setBalances(balanceData);
        const requestData = await api.getCashboxRequests();
        setRequests(requestData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
    };

    const handleResolve = async (requestId: string, resolution: 'approve' | 'reject') => {
        if (!user) return;
        // FIX: The payload for `resolveCashboxRequest` expects a `user` object, not `userName`.
        await api.resolveCashboxRequest({ requestId, resolution, user });
        fetchData();
    };

    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">مدیریت صندوق</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {balances.map(b => (
                    <div key={b.currency} className="bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 text-right shadow-[0_0_20px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                        <h3 className="text-2xl font-semibold text-slate-300">موجودی {b.currency}</h3>
                        <p className="mt-2 text-6xl font-bold font-mono text-cyan-300 text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(b.balance)}</p>
                    </div>
                ))}
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">درخواست های صندوق</h2>
                    <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                        ثبت درخواست جدید
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">نوع</th>
                                <th scope="col" className="px-6 py-4 font-medium">مبلغ</th>
                                <th scope="col" className="px-6 py-4 font-medium">دلیل</th>
                                <th scope="col" className="px-6 py-4 font-medium">درخواست کننده</th>
                                <th scope="col" className="px-6 py-4 font-medium">وضعیت</th>
                                <th scope="col" className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(r => (
                                <tr key={r.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                                    <td className="px-6 py-4">{r.createdAt.toLocaleDateString('fa-IR-u-nu-latn')}</td>
                                    <td className={`px-6 py-4 font-bold ${r.requestType === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>{r.requestType === 'withdrawal' ? 'برداشت' : 'واریز'}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(r.amount)} {r.currency}</td>
                                    <td className="px-6 py-4">{r.reason}</td>
                                    <td className="px-6 py-4">{r.requestedBy}</td>
                                    <td className="px-6 py-4"><span className={`px-3 py-1 text-base font-semibold rounded-full border ${getStatusStyle(r.status)}`}>{cashboxRequestStatusTranslations[r.status]}</span></td>
                                    <td className="px-6 py-4">
                                        {r.status === CashboxRequestStatus.Pending && user?.role === 'Manager' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleResolve(r.id, 'approve')} className="px-3 py-1 bg-green-600/50 text-green-200 hover:bg-green-500/50 text-base rounded">تایید</button>
                                                <button onClick={() => handleResolve(r.id, 'reject')} className="px-3 py-1 bg-red-600/50 text-red-200 hover:bg-red-500/50 text-base rounded">رد</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {user && <CreateCashboxRequestModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={handleSuccess} currentUser={user} />}
        </div>
    );
};

export default CashboxPage;