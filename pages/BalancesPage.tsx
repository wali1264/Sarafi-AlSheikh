
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

const ShareIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
);

const PrinterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

const BalanceCard: React.FC<{ customer: Customer; snapshots: BalanceSnapshot[] }> = ({ customer, snapshots }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set());
    const [printOptions, setPrintOptions] = useState<{ [key: string]: 'summary' | 'detailed' }>({});
    
    const latestSnapshot = snapshots[0];
    const history = snapshots.slice(1);

    const toggleSnapshotSelection = (id: string) => {
        const newSet = new Set(selectedSnapshots);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
            // Default to detailed for new selections
            if (!printOptions[id]) {
                setPrintOptions(prev => ({ ...prev, [id]: 'detailed' }));
            }
        }
        setSelectedSnapshots(newSet);
    };

    const handleShare = () => {
        let shareText = `بیلان مشتری: ${customer.name} (${customer.code})\n`;
        shareText += `تاریخ: ${new Date().toLocaleDateString('fa-IR')}\n\n`;

        // Always include latest if it exists
        if (latestSnapshot) {
            shareText += `--- آخرین وضعیت ---\n`;
            shareText += `${latestSnapshot.summary_text}\n\n`;
        }

        // Include selected history
        const selected = snapshots.filter(s => selectedSnapshots.has(s.id));
        if (selected.length > 0) {
            shareText += `--- سوابق انتخابی ---\n`;
            selected.forEach(s => {
                const option = printOptions[s.id] || 'detailed';
                shareText += `تاریخ: ${new Date(s.created_at).toLocaleDateString('fa-IR')}\n`;
                shareText += `نوع: ${option === 'summary' ? 'خلاصه' : 'تفصیلی'}\n`;
                shareText += `${s.summary_text}\n\n`;
            });
        }

        if (navigator.share) {
            navigator.share({
                title: `بیلان ${customer.name}`,
                text: shareText,
            }).catch(err => console.error('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(shareText);
            alert('متن بیلان در حافظه کپی شد.');
        }
    };

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
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-slate-100">{customer.name}</h3>
                            <button 
                                onClick={handleShare}
                                className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
                                title="اشتراک‌گذاری بیلان"
                            >
                                <ShareIcon />
                            </button>
                        </div>
                        <span className="text-lg font-mono text-amber-400">کد: {customer.code}</span>
                    </div>
                    {latestSnapshot && (
                        <div className="text-left">
                            <span className="text-sm text-slate-500 block">آخرین بیلان:</span>
                            <span className="text-sm text-slate-400">{new Date(latestSnapshot.created_at).toLocaleDateString('fa-IR')}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3 mb-6">
                    {latestSnapshot ? (
                        <div className="bg-black/20 p-4 rounded border border-amber-500/10">
                            {/* Detailed Currency Display */}
                            <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-white/5">
                                {Object.entries(latestSnapshot.balances_data.main_balances || {}).map(([currency, amount]) => (
                                    <div key={currency} className="flex justify-between items-center bg-white/5 p-2 rounded">
                                        <span className="text-xs text-slate-400">{currency}</span>
                                        <span className={`text-sm font-bold ${getBalanceStyle(amount as number)}`}>
                                            {(amount as number).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                {latestSnapshot.balances_data.rented_balance !== 0 && (
                                    <div className="flex justify-between items-center bg-white/5 p-2 rounded col-span-2">
                                        <span className="text-xs text-slate-400">مانده کرایی (تومان)</span>
                                        <span className={`text-sm font-bold ${getBalanceStyle(latestSnapshot.balances_data.rented_balance)}`}>
                                            {latestSnapshot.balances_data.rented_balance.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-lg text-slate-300 leading-relaxed">{latestSnapshot.summary_text}</p>
                            {latestSnapshot.notes && (
                                <p className="text-sm text-slate-500 mt-2 italic">"{latestSnapshot.notes}"</p>
                            )}
                            <div className="mt-3 flex justify-end">
                                <span className="text-[10px] text-slate-600">ثبت توسط: {latestSnapshot.created_by_name || latestSnapshot.created_by}</span>
                            </div>
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
                    <div className="flex justify-between items-center px-2 mb-2">
                        <span className="text-xs text-slate-500">انتخاب برای چاپ/اشتراک‌گذاری:</span>
                        {selectedSnapshots.size > 0 && (
                            <button 
                                onClick={() => setSelectedSnapshots(new Set())}
                                className="text-[10px] text-red-400 hover:text-red-300"
                            >
                                لغو انتخاب‌ها
                            </button>
                        )}
                    </div>
                    {history.map(snap => (
                        <div key={snap.id} className={`p-3 border-l-4 rounded-r transition-all ${selectedSnapshots.has(snap.id) ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-900/40 border-amber-500/30'}`}>
                            <div className="flex items-start gap-3">
                                <input 
                                    type="checkbox" 
                                    checked={selectedSnapshots.has(snap.id)}
                                    onChange={() => toggleSnapshotSelection(snap.id)}
                                    className="mt-1 w-4 h-4 rounded border-amber-500/30 bg-slate-800 text-amber-500 focus:ring-amber-500"
                                />
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] mb-1">
                                        <span className="text-slate-400">{new Date(snap.created_at).toLocaleString('fa-IR')}</span>
                                        <span className="text-slate-500">توسط: {snap.created_by_name || snap.created_by}</span>
                                    </div>
                                    <p className="text-sm text-slate-300">{snap.summary_text}</p>
                                    
                                    {selectedSnapshots.has(snap.id) && (
                                        <div className="mt-2 flex items-center gap-4 border-t border-white/5 pt-2">
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name={`print-opt-${snap.id}`}
                                                    checked={printOptions[snap.id] === 'summary'}
                                                    onChange={() => setPrintOptions(prev => ({ ...prev, [snap.id]: 'summary' }))}
                                                    className="w-3 h-3 text-amber-500 bg-slate-800 border-slate-600"
                                                />
                                                <span className="text-[10px] text-slate-400">خلاصه</span>
                                            </label>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name={`print-opt-${snap.id}`}
                                                    checked={printOptions[snap.id] === 'detailed'}
                                                    onChange={() => setPrintOptions(prev => ({ ...prev, [snap.id]: 'detailed' }))}
                                                    className="w-3 h-3 text-amber-500 bg-slate-800 border-slate-600"
                                                />
                                                <span className="text-[10px] text-slate-400">تفصیلی</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
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
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBulkRecording, setIsBulkRecording] = useState(false);
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

    const handleBulkRecord = async () => {
        if (!user) return;
        
        const confirm = window.confirm('آیا از ثبت بیلان برای تمام مشتریان اطمینان دارید؟ این عملیات وضعیت فعلی تمام حساب‌ها را ذخیره می‌کند.');
        if (!confirm) return;

        setIsBulkRecording(true);
        try {
            const bulkSnapshots: Omit<BalanceSnapshot, 'id' | 'created_at'>[] = [];
            
            for (const customer of customers) {
                // Calculate summary text
                let summary = '';
                const balanceEntries = Object.entries(customer.balances || {});
                if (balanceEntries.length === 0) {
                    summary = 'حساب تصفیه است.';
                } else {
                    summary = balanceEntries
                        .map(([curr, amount]) => `${(amount as number) > 0 ? 'بدهکار' : 'طلبکار'}: ${Math.abs(amount as number).toLocaleString()} ${curr}`)
                        .join(' | ');
                }

                bulkSnapshots.push({
                    customer_id: customer.id,
                    created_by: user.id,
                    balances_data: {
                        main_balances: customer.balances || {},
                        rented_balance: 0, // Simplified for bulk
                    },
                    summary_text: summary,
                    notes: 'ثبت همگانی بیلان'
                });
            }

            const result = await api.createBulkBalanceSnapshots(bulkSnapshots);
            if ('error' in result) {
                addToast(`خطا در ثبت همگانی: ${result.error}`, 'error');
            } else {
                addToast('بیلان تمام مشتریان با موفقیت ثبت شد.', 'success');
                fetchData();
            }
        } catch (error) {
            console.error(error);
            addToast('خطای غیرمنتظره در ثبت همگانی', 'error');
        } finally {
            setIsBulkRecording(false);
        }
    };

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
                <div className="flex gap-4">
                    <button 
                        onClick={handleBulkRecord}
                        disabled={isBulkRecording || customers.length === 0}
                        className="px-6 py-3 text-xl font-bold tracking-wider text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)' }}
                    >
                        {isBulkRecording ? 'در حال ثبت...' : 'ثبت همگانی بیلان'}
                    </button>
                    <button 
                        onClick={() => navigate('/customers')}
                        className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}
                    >
                        بازگشت به مشتریان
                    </button>
                </div>
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
