

import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { ForeignTransaction, User, Asset } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LogForeignTransactionModal from '../components/LogForeignTransactionModal';

const ForeignTransfersPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [transactions, setTransactions] = useState<ForeignTransaction[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [txData, assetsData] = await Promise.all([
            api.getForeignTransactions(),
            api.getAvailableAssets()
        ]);
        setTransactions(txData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setAssets(assetsData);
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    return (
        <div style={{direction: 'rtl'}}>
             <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت تبادلات</h1>
                 {hasPermission('foreignTransfers', 'create') && (
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + ثبت تبادله جدید
                    </button>
                )}
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="p-6 border-b-2 border-cyan-400/20">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر روزنامه تبادلات</h2>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">تاریخ</th>
                                <th className="px-6 py-4 font-medium">شرح</th>
                                <th className="px-6 py-4 font-medium">برد از (فروش)</th>
                                <th className="px-6 py-4 font-medium text-left">مبلغ فروش</th>
                                <th className="px-6 py-4 font-medium">رسید به (خرید)</th>
                                <th className="px-6 py-4 font-medium text-left">مبلغ خرید</th>
                           </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 text-slate-100">{tx.description}</td>
                                    <td className="px-6 py-4 font-semibold text-cyan-300">{tx.fromAsset}</td>
                                    <td className="px-6 py-4 font-mono text-left text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.fromAmount)} {tx.fromCurrency}</td>
                                    <td className="px-6 py-4 font-semibold text-fuchsia-400">{tx.toAsset}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.toAmount)} {tx.toCurrency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && user && (
                <LogForeignTransactionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                    assets={assets}
                />
            )}
        </div>
    );
};

export default ForeignTransfersPage;