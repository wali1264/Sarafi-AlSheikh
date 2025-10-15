import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { PartnerAccount, PartnerTransaction, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import SettleBalanceModal from '../components/SettleBalanceModal';

const PartnerAccountDetailPage: React.FC = () => {
    const { partnerId } = useParams<{ partnerId: string }>();
    const navigate = useNavigate();
    const api = useApi();
    const { user } = useAuth();

    const [partner, setPartner] = useState<PartnerAccount | null>(null);
    const [transactions, setTransactions] = useState<PartnerTransaction[]>([]);
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    
    const canSettle = user && [Role.Manager, Role.Domestic_Clerk].includes(user.role);

    const fetchData = useCallback(async () => {
        if (!partnerId) return;
        const partnerData = await api.getPartnerAccountById(partnerId);
        if (partnerData) {
            setPartner(partnerData);
            const txData = await api.getTransactionsForPartner(partnerId);
            setTransactions(txData.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
        } else {
            // Handle not found case, maybe navigate back
            navigate('/partner-accounts');
        }
    }, [api, partnerId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setIsSettlementModalOpen(false);
        fetchData(); // Refresh data after settlement
    };

    if (!partner) {
        return <div className="text-center text-slate-400 text-2xl">در حال بارگذاری اطلاعات همکار...</div>;
    }

    const getBalanceStyle = (balance: number) => {
        if (balance < 0) return 'text-red-400'; // We owe them
        if (balance > 0) return 'text-green-400'; // They owe us
        return 'text-slate-300';
    };
    
    const getBalanceLabel = (balance: number) => {
        if (balance < 0) return 'شما بدهکار هستید';
        if (balance > 0) return 'ایشان بدهکار هستند';
        return 'حساب تسویه است';
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <button onClick={() => navigate('/partner-accounts')} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست همکاران
            </button>
            
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{partner.name}</h1>
                    <div className={`mt-2 text-3xl font-bold ${getBalanceStyle(partner.balance)}`}>{getBalanceLabel(partner.balance)}</div>
                </div>
                <div className="text-left">
                    <div className="text-2xl text-slate-400">موجودی فعلی</div>
                    <div className={`text-5xl font-mono font-bold ${getBalanceStyle(partner.balance)}`}>
                         {new Intl.NumberFormat('fa-IR-u-nu-latn').format(Math.abs(partner.balance))} {partner.currency}
                    </div>
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">تاریخچه تراکنش ها</h2>
                    {canSettle && (
                        <button 
                            onClick={() => setIsSettlementModalOpen(true)}
                            className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}
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
                                <th scope="col" className="px-6 py-4 font-medium">بدهکار (ما طلبکار)</th>
                                <th scope="col" className="px-6 py-4 font-medium">بستانکار (ما بدهکار)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">{tx.timestamp.toLocaleString('fa-IR-u-nu-latn')}</td>
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
            {user && (
                <SettleBalanceModal
                    isOpen={isSettlementModalOpen}
                    onClose={() => setIsSettlementModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    partner={partner}
                />
            )}
        </div>
    );
};

export default PartnerAccountDetailPage;