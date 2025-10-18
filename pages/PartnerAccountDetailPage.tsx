
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { PartnerAccount, PartnerTransaction, User, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import SettleBalanceModal from '../components/SettleBalanceModal';
import { CURRENCIES } from '../constants';

const PartnerAccountDetailPage: React.FC = () => {
    const { partnerId } = useParams<{ partnerId: string }>();
    const navigate = useNavigate();
    const api = useApi();
    const { user, hasPermission } = useAuth();

    const [partner, setPartner] = useState<PartnerAccount | null>(null);
    const [transactions, setTransactions] = useState<PartnerTransaction[]>([]);
    const [isSettleModalOpen, setSettleModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!partnerId) return;
        const partnerData = await api.getPartnerAccountById(partnerId);
        if (partnerData) {
            setPartner(partnerData);
            const txData = await api.getTransactionsForPartner(partnerId);
            setTransactions(txData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
            // If partner not found, redirect to the list page
            navigate('/partner-accounts');
        }
    }, [api, partnerId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSuccess = () => {
        setSettleModalOpen(false);
        fetchData();
    }

    if (!partner) {
        return <div className="text-center text-slate-400 text-2xl">در حال بارگذاری اطلاعات همکار...</div>;
    }

    const getBalanceStyle = (balance: number) => {
        if (balance < 0) return 'text-red-400'; // We owe them (Bedehkar)
        if (balance > 0) return 'text-green-400'; // They owe us (Talabkar)
        return 'text-slate-300';
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <button onClick={() => navigate('/partner-accounts')} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست همکاران
            </button>
            
            <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{partner.name}</h1>
                 <div className="text-left space-y-2">
                    <h3 className="text-2xl text-slate-400">موجودی حسابات</h3>
                    {CURRENCIES.map(currency => {
                        const balance = partner.balances[currency] || 0;
                        if (balance === 0 && !transactions.some(tx => tx.currency === currency)) return null; 
                        return (
                            <div key={currency} className={`text-3xl font-mono font-bold ${getBalanceStyle(balance)}`}>
                                {new Intl.NumberFormat('en-US').format(balance)} {currency}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر حساب همکار</h2>
                    {hasPermission('partnerAccounts', 'create') && (
                        <button 
                            onClick={() => setSettleModalOpen(true)}
                            className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                        >
                            ثبت تسویه حساب
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">توضیحات</th>
                                <th scope="col" className="px-6 py-4 font-medium">طلبکار (Credit)</th>
                                <th scope="col" className="px-6 py-4 font-medium">بدهکار (Debit)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 text-slate-100">{tx.description}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400">
                                        {tx.type === 'credit' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                     <td className="px-6 py-4 font-mono text-left text-red-400">
                                        {tx.type === 'debit' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isSettleModalOpen && user && (
                <SettleBalanceModal 
                    isOpen={isSettleModalOpen}
                    onClose={() => setSettleModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    partner={partner}
                />
            )}
        </div>
    );
};

export default PartnerAccountDetailPage;