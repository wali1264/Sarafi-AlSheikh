
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Customer, BalanceSnapshot, Currency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabaseClient';

const ChevronDownIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const ChevronUpIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
);

const BalanceCard: React.FC<{ customer: Customer; snapshots: BalanceSnapshot[] }> = ({ customer, snapshots }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const latestSnapshot = snapshots[0];
    const history = snapshots.slice(1);

    const getBalanceStyle = (balance: number) => {
        if (balance > 0) return 'text-red-400';
        if (balance < 0) return 'text-green-400';
        return 'text-slate-300';
    };

    return (
        <div className="bg-[#12122E]/80 border-2 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)] overflow-hidden transition-all hover:border-amber-500/40" 
             style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-100">{customer.name}</h3>
                        <span className="text-lg font-mono text-amber-400">کد: {customer.code}</span>
                    </div>
                    {latestSnapshot && (
                        <div className="text-left">
                            <span className="text-sm text-slate-500 block">آخرین بیلان:</span>
                            <span className="text-sm text-slate-400">{new Date(latestSnapshot.created_at).toLocaleDateString('fa-IR')}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-2 mb-6">
                    {latestSnapshot ? (
                        <div className="bg-black/20 p-3 rounded border border-amber-500/10">
                            <p className="text-lg text-slate-300 leading-relaxed">{latestSnapshot.summary_text}</p>
                            {latestSnapshot.notes && (
                                <p className="text-sm text-slate-500 mt-2 italic">"{latestSnapshot.notes}"</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-slate-500 italic text-center py-4">هیچ بیلانی ثبت نشده است.</div>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors ${snapshots.length <= 1 ? 'invisible' : ''}`}
                    >
                        {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        <span className="text-lg">تاریخچه بیلان‌ها ({snapshots.length})</span>
                    </button>
                    <button 
                        onClick={() => window.location.href = `#/customers/${customer.id}`}
                        className="text-cyan-400 hover:text-cyan-300 text-lg underline underline-offset-4"
                    >
                        مشاهده دفتر حساب
                    </button>
                </div>
            </div>

            {isExpanded && history.length > 0 && (
                <div className="bg-black/30 border-t border-amber-500/10 p-4 space-y-3 animate-fadeIn">
                    {history.map(snap => (
                        <div key={snap.id} className="p-3 bg-slate-900/40 border-l-4 border-amber-500/30 rounded-r">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-400">{new Date(snap.created_at).toLocaleString('fa-IR')}</span>
                                <span className="text-slate-500">توسط: {snap.created_by}</span>
                            </div>
                            <p className="text-slate-300">{snap.summary_text}</p>
                            {snap.notes && <p className="text-xs text-slate-500 mt-1 italic">{snap.notes}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BalancesPage: React.FC = () => {
    const api = useApi();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [custData, snapData] = await Promise.all([
                api.getCustomers(),
                api.getBalanceSnapshots()
            ]);
            setCustomers(custData);
            setSnapshots(snapData);
        } catch (error) {
            addToast('خطا در بارگذاری داده‌ها', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [api, addToast]);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('balance-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_snapshots' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const snapshotsByCustomer = useMemo(() => {
        const map: { [key: string]: BalanceSnapshot[] } = {};
        snapshots.forEach(snap => {
            if (!map[snap.customer_id]) map[snap.customer_id] = [];
            map[snap.customer_id].push(snap);
        });
        return map;
    }, [snapshots]);

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => {
            // Sort by latest snapshot date if available
            const aLatest = snapshotsByCustomer[a.id]?.[0]?.created_at || '';
            const bLatest = snapshotsByCustomer[b.id]?.[0]?.created_at || '';
            if (aLatest && bLatest) return bLatest.localeCompare(aLatest);
            if (aLatest) return -1;
            if (bLatest) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [customers, searchTerm, snapshotsByCustomer]);

    return (
        <div style={{ direction: 'rtl' }}>
            <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت بیلان‌ها</h1>
                <button 
                    onClick={() => navigate('/customers')}
                    className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}
                >
                    بازگشت به مشتریان
                </button>
            </div>

            <div className="mb-8">
                <input 
                    type="text"
                    placeholder="جستجوی مشتری بر اساس نام یا کد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-2xl px-6 py-4 bg-slate-900/50 border-2 border-amber-500/20 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                />
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-slate-400 text-2xl">در حال بارگذاری بیلان‌ها...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredCustomers.map(customer => (
                        <BalanceCard 
                            key={customer.id} 
                            customer={customer} 
                            snapshots={snapshotsByCustomer[customer.id] || []} 
                        />
                    ))}
                    {filteredCustomers.length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-500 text-2xl bg-black/20 rounded-xl border-2 border-dashed border-slate-700">
                            هیچ مشتری با این مشخصات یافت نشد.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BalancesPage;
