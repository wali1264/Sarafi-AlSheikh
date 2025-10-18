
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { CashboxRequest, CashboxBalance, CashboxRequestStatus, ResolveCashboxRequestPayload, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateCashboxRequestModal from '../components/CreateCashboxRequestModal';
import { cashboxRequestStatusTranslations } from '../utils/translations';
import { CURRENCIES } from '../constants';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{ title: string, value: string, currency: string }> = ({ title, value, currency }) => (
     <div className="bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 text-right shadow-[0_0_20px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
        <h3 className="text-xl font-semibold text-slate-300 tracking-wider">{title}</h3>
        <p className="mt-2 text-4xl font-bold font-mono text-cyan-300 whitespace-nowrap overflow-hidden text-ellipsis">
            {value} <span className="text-2xl text-slate-400">{currency}</span>
        </p>
    </div>
);

const CashboxPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    
    const [requests, setRequests] = useState<CashboxRequest[]>([]);
    const [balances, setBalances] = useState<CashboxBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const canApprove = hasPermission('cashbox', 'approve');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [reqData, balData] = await Promise.all([
            api.getCashboxRequests(),
            api.getCashboxBalances()
        ]);
        setRequests(reqData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setBalances(balData);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const handleResolve = async (requestId: string, resolution: 'approve' | 'reject') => {
        if (!user) return;
        const payload: ResolveCashboxRequestPayload = { requestId, resolution, user };
        await api.resolveCashboxRequest(payload);
        fetchData();
    };
    
    const handlePrint = (requestId: string) => {
        const printUrl = `#/print/cashbox/${requestId}`;
        window.open(printUrl, '_blank');
    };

    const getStatusStyle = (status: CashboxRequestStatus) => {
        switch (status) {
            case CashboxRequestStatus.Approved:
            case CashboxRequestStatus.AutoApproved:
                return 'bg-green-500/20 text-green-300';
            case CashboxRequestStatus.Pending:
                return 'bg-yellow-500/20 text-yellow-300';
            case CashboxRequestStatus.Rejected:
                return 'bg-red-500/20 text-red-300';
            default:
                return 'bg-slate-600/20 text-slate-300';
        }
    };

    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div>
                <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت صندوق</h1>
                    {hasPermission('cashbox', 'create') && (
                        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                            + ثبت رسید/برد جدید
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-8">
                    {CURRENCIES.map(currency => {
                        const balance = balances.find(b => b.currency === currency)?.balance ?? 0;
                        return <StatCard key={currency} title={`موجودی ${currency}`} value={new Intl.NumberFormat('en-US').format(balance)} currency={currency} />
                    })}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-6 border-b-2 border-cyan-400/20">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">روزنامچه (درخواست‌های صندوق)</h2>
                </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-lg text-right text-slate-300">
                         <thead className="text-xl text-slate-400 uppercase">
                             <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">نوع</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">شرح</th>
                                <th className="px-6 py-4 font-medium">درخواست کننده</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                                <th className="px-6 py-4 font-medium"></th>
                             </tr>
                         </thead>
                         <tbody>
                            {requests.map(req => (
                                <tr key={req.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(req.createdAt).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className={`px-6 py-4 font-bold ${req.requestType === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                        {req.requestType === 'deposit' ? 'رسید' : 'برد'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(req.amount)} {req.currency}</td>
                                    <td className="px-6 py-4">{req.reason}</td>
                                    <td className="px-6 py-4">{req.requestedBy}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${getStatusStyle(req.status)}`}>
                                            {cashboxRequestStatusTranslations[req.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left whitespace-nowrap">
                                        {req.status === 'Pending' && canApprove && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleResolve(req.id, 'approve')} className="px-3 py-1 bg-green-600/50 hover:bg-green-500/50 text-green-200 rounded">تایید</button>
                                                <button onClick={() => handleResolve(req.id, 'reject')} className="px-3 py-1 bg-red-600/50 hover:bg-red-500/50 text-red-200 rounded">رد</button>
                                            </div>
                                        )}
                                        <button onClick={() => handlePrint(req.id)} className="text-cyan-300 hover:text-cyan-200 ml-4">چاپ</button>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                 </div>
            </div>
            
            {isModalOpen && user && (
                <CreateCashboxRequestModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}

        </div>
    );
};

export default CashboxPage;