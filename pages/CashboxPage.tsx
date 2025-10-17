import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { CashboxBalance, CashboxRequest, User, Customer, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateCashboxRequestModal from '../components/CreateCashboxRequestModal';

const CashboxPage: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [balances, setBalances] = useState<CashboxBalance[]>([]);
    const [ledger, setLedger] = useState<CashboxRequest[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const customerMap = useMemo(() => {
        return new Map(customers.map(c => [c.id, c.code]));
    }, [customers]);

    const fetchData = useCallback(async () => {
        const [balanceData, ledgerData, customerData] = await Promise.all([
            api.getCashboxBalances(),
            api.getLedgerEntries(),
            api.getCustomers()
        ]);
        setBalances(balanceData);
        setLedger(ledgerData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        setCustomers(customerData);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
    };

    const handleReviewedChange = async (requestId: string, reviewed: boolean) => {
        if (!user || user.role !== Role.Manager) return;
        
        await api.updateCashboxRequestReviewedStatus({ requestId, reviewed, user });
        // Optimistic update
        setLedger(prevLedger => prevLedger.map(entry => 
            entry.id === requestId ? { ...entry, reviewed, reviewedBy: user.name, reviewedAt: new Date() } : entry
        ));
    };

    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">روزنامچه صندوق</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
                {balances.map(b => (
                    <div key={b.currency} className="bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 text-right shadow-[0_0_20px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                        <h3 className="text-2xl font-semibold text-slate-300">موجودی {b.currency}</h3>
                        <p className="mt-2 text-5xl font-bold font-mono text-cyan-300 text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(b.balance)}</p>
                    </div>
                ))}
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر روزنامه</h2>
                    <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                        ثبت ورودی جدید
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">شرح / کد مشتری</th>
                                <th scope="col" className="px-6 py-4 font-medium text-left">رسید (ورودی)</th>
                                <th scope="col" className="px-6 py-4 font-medium text-left">برد (خروجی)</th>
                                <th scope="col" className="px-6 py-4 font-medium text-center">ملاحظه شد</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.map(entry => (
                                <tr key={entry.id} className={`border-b border-cyan-400/10 transition-colors ${entry.requestType === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    <td className="px-6 py-4">{entry.createdAt.toLocaleDateString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4">
                                        {entry.reason}
                                        {entry.customerId && (
                                            <span className="block font-mono text-cyan-300 text-sm mt-1">
                                                (کد مشتری: {customerMap.get(entry.customerId)})
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left text-green-300">
                                        {entry.requestType === 'deposit' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(entry.amount)} ${entry.currency}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-left text-red-300">
                                        {entry.requestType === 'withdrawal' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(entry.amount)} ${entry.currency}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={entry.reviewed}
                                            onChange={(e) => handleReviewedChange(entry.id, e.target.checked)}
                                            disabled={user?.role !== Role.Manager || entry.reviewed}
                                            className="w-6 h-6 rounded bg-slate-700 border-slate-500 text-cyan-400 focus:ring-cyan-500 disabled:opacity-50"
                                            title={entry.reviewed ? `تایید شده توسط ${entry.reviewedBy} در ${entry.reviewedAt?.toLocaleString('fa-IR')}` : 'در انتظار بازبینی مدیر'}
                                        />
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