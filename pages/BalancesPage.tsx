
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
    const api = useApi();
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

    const getTransactionsForPeriod = (allTransactions: any[], endSnapshot: BalanceSnapshot | null, startSnapshot: BalanceSnapshot | null) => {
        const endTime = endSnapshot ? new Date(endSnapshot.created_at).getTime() : Date.now();
        const startTime = startSnapshot ? new Date(startSnapshot.created_at).getTime() : 0;
        
        return allTransactions.filter(tx => {
            const txTime = new Date(tx.timestamp).getTime();
            return txTime > startTime && txTime <= endTime;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const formatTransactionTable = (transactions: any[], title: string = 'ریز تراکنش‌ها') => {
        if (transactions.length === 0) return `<p style="font-size: 12px; color: #666; margin: 10px 0;">تراکنشی در این ${title} ثبت نشده است.</p>`;
        
        let table = `
            <h3 style="font-size: 13px; color: #555; margin-top: 15px;">${title}:</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px;">
                <thead>
                    <tr style="background: #eee;">
                        <th style="border: 1px solid #ddd; padding: 5px;">تاریخ</th>
                        <th style="border: 1px solid #ddd; padding: 5px;">شرح</th>
                        <th style="border: 1px solid #ddd; padding: 5px;">نوع</th>
                        <th style="border: 1px solid #ddd; padding: 5px;">مبلغ</th>
                        <th style="border: 1px solid #ddd; padding: 5px;">ارز</th>
                    </tr>
                </thead>
                <tbody>
        `;

        transactions.forEach(tx => {
            const isRented = tx.rented_account_id !== undefined;
            table += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${new Date(tx.timestamp).toLocaleDateString('fa-IR')}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${tx.description || (isRented ? 'تراکنش حساب K' : '')}</td>
                    <td style="border: 1px solid #ddd; padding: 5px; text-align: center; color: ${tx.type === 'debit' || tx.type === 'withdrawal' ? 'red' : 'green'}">
                        ${(tx.type === 'debit' || tx.type === 'withdrawal') ? 'برد' : 'رسید'}
                    </td>
                    <td style="border: 1px solid #ddd; padding: 5px; text-align: left;">${tx.amount.toLocaleString()}</td>
                    <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${tx.currency || 'تومان'} ${isRented ? '(K)' : ''}</td>
                </tr>
            `;
        });

        table += '</tbody></table>';
        return table;
    };

    const handlePrint = async () => {
        const [allTransactions, rentedTransactions, unifiedBalances] = await Promise.all([
            api.getTransactionsForCustomer(customer.id),
            api.getRentedTransactionsForCustomer(customer.id),
            api.getUnifiedPortalBalance({ userId: customer.id, userType: 'Customer' })
        ]);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let content = `
            <div style="direction: rtl; font-family: sans-serif; padding: 20px;">
                <h1 style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">بیلانس مشتری: ${customer.name} (${customer.code})</h1>
                <p style="font-size: 12px; color: #666;">تاریخ چاپ: ${new Date().toLocaleString('fa-IR')}</p>
                
                <div style="margin-top: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 8px; background: #fafafa;">
                    <h2 style="margin-top: 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px;">وضعیت فعلی حساب (لحظه‌ای)</h2>
                    <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 15px;">
        `;

        // Current Live Balances from Unified Data
        Object.entries(unifiedBalances || {}).forEach(([curr, amount]) => {
            if (curr === 'IRT_BANK') return; // Skip K here to show it separately
            content += `
                <div style="background: white; border: 1px solid #ddd; padding: 8px 12px; border-radius: 4px; min-width: 120px;">
                    <span style="font-size: 10px; color: #888; display: block;">${curr}</span>
                    <strong style="font-size: 14px; color: ${(amount as number) >= 0 ? '#27ae60' : '#e74c3c'}">${(amount as number).toLocaleString()}</strong>
                </div>
            `;
        });

        // Current Rented Balance (K) from Unified Data
        const currentRentedBalance = unifiedBalances['IRT_BANK'] || 0;
        content += `
            <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 8px 12px; border-radius: 4px; min-width: 120px;">
                <span style="font-size: 10px; color: #b45309; display: block;">K (تومان)</span>
                <strong style="font-size: 14px; color: ${currentRentedBalance >= 0 ? '#27ae60' : '#e74c3c'}">${currentRentedBalance.toLocaleString()}</strong>
            </div>
        `;

        content += `</div>`;
        
        // Transactions from latest snapshot to now
        const currentPeriodTxs = getTransactionsForPeriod(allTransactions, null, latestSnapshot);
        const currentPeriodRentedTxs = getTransactionsForPeriod(rentedTransactions, null, latestSnapshot);
        
        content += `<h3 style="font-size: 14px; color: #34495e; margin-top: 20px;">ریز تراکنش‌های دوره اخیر (از آخرین بیلانس تا کنون):</h3>`;
        content += formatTransactionTable(currentPeriodTxs, 'تراکنش‌های ارزی');
        if (currentPeriodRentedTxs.length > 0) {
            content += formatTransactionTable(currentPeriodRentedTxs, 'تراکنش‌های حساب K');
        }
        content += `</div>`;

        // Snapshots and their periods
        snapshots.forEach((snap, index) => {
            const isSelected = selectedSnapshots.has(snap.id);
            const isDetailed = index === 0 || (isSelected && printOptions[snap.id] === 'detailed');
            
            if (index === 0 || isSelected) {
                content += `
                    <div style="margin-top: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
                        <div style="display: flex; justify-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">
                            <h2 style="margin: 0; font-size: 16px; color: #2c3e50;">بیلانس ثبت شده در تاریخ: ${new Date(snap.created_at).toLocaleString('fa-IR')}</h2>
                            <span style="font-size: 10px; color: #999; margin-right: auto;">توسط: ${snap.created_by_name || snap.created_by}</span>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                `;

                Object.entries(snap.balances_data.main_balances || {}).forEach(([curr, amount]) => {
                    content += `
                        <div style="background: #f9f9f9; border: 1px solid #eee; padding: 5px 10px; border-radius: 4px;">
                            <span style="font-size: 9px; color: #777;">${curr}:</span>
                            <strong style="font-size: 12px; color: ${(amount as number) >= 0 ? '#1e8449' : '#c0392b'}">${(amount as number).toLocaleString()}</strong>
                        </div>
                    `;
                });

                // Rented Balance in Snapshot (K)
                const snapRentedBalance = snap.balances_data.rented_balance || 0;
                content += `
                    <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 5px 10px; border-radius: 4px;">
                        <span style="font-size: 9px; color: #b45309;">K (تومان):</span>
                        <strong style="font-size: 12px; color: ${snapRentedBalance >= 0 ? '#1e8449' : '#c0392b'}">${snapRentedBalance.toLocaleString()}</strong>
                    </div>
                `;

                content += `</div>`;

                if (isDetailed) {
                    const nextSnap = snapshots[index + 1] || null;
                    const periodTxs = getTransactionsForPeriod(allTransactions, snap, nextSnap);
                    const periodRentedTxs = getTransactionsForPeriod(rentedTransactions, snap, nextSnap);
                    
                    content += formatTransactionTable(periodTxs, 'ریز تراکنش‌های ارزی منتهی به این بیلانس');
                    if (periodRentedTxs.length > 0) {
                        content += formatTransactionTable(periodRentedTxs, 'ریز تراکنش‌های حساب K منتهی به این بیلانس');
                    }
                }

                if (snap.notes) {
                    content += `<p style="font-size: 11px; color: #777; font-style: italic; margin-top: 10px; border-top: 1px dashed #eee; pt: 5px;">یادداشت: ${snap.notes}</p>`;
                }
                
                content += `</div>`;
            }
        });

        content += `</div>`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>چاپ بیلانس - ${customer.name}</title>
                    <style>
                        @media print {
                            body { margin: 0; padding: 0; }
                            .no-print { display: none; }
                        }
                        body { font-family: 'Tahoma', sans-serif; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    </style>
                </head>
                <body onload="window.print();window.close()">${content}</body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleShare = async () => {
        const [allTransactions, rentedTransactions, unifiedBalances] = await Promise.all([
            api.getTransactionsForCustomer(customer.id),
            api.getRentedTransactionsForCustomer(customer.id),
            api.getUnifiedPortalBalance({ userId: customer.id, userType: 'Customer' })
        ]);

        let shareText = `📋 بیلانس مشتری: ${customer.name} (${customer.code})\n`;
        shareText += `📅 تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}\n\n`;

        shareText += `--- 💰 وضعیت فعلی (لحظه‌ای) ---\n`;
        Object.entries(unifiedBalances || {}).forEach(([curr, amount]) => {
            if (curr === 'IRT_BANK') return;
            shareText += `🔹 ${curr}: ${(amount as number).toLocaleString()}\n`;
        });
        
        const currentRentedBalance = unifiedBalances['IRT_BANK'] || 0;
        shareText += `🔸 K (تومان): ${currentRentedBalance.toLocaleString()}\n`;
        
        const currentPeriodTxs = getTransactionsForPeriod(allTransactions, null, latestSnapshot);
        const currentPeriodRentedTxs = getTransactionsForPeriod(rentedTransactions, null, latestSnapshot);

        if (currentPeriodTxs.length > 0) {
            shareText += `\n📥 تراکنش‌های ارزی اخیر:\n`;
            currentPeriodTxs.slice(0, 5).forEach(tx => {
                shareText += `▫️ ${new Date(tx.timestamp).toLocaleDateString('fa-IR')} | ${tx.description.substring(0, 20)}... | ${tx.amount.toLocaleString()} ${tx.currency} (${tx.type === 'debit' ? 'برد' : 'رسید'})\n`;
            });
        }
        if (currentPeriodRentedTxs.length > 0) {
            shareText += `\n📥 تراکنش‌های حساب K اخیر:\n`;
            currentPeriodRentedTxs.slice(0, 5).forEach(tx => {
                shareText += `▫️ ${new Date(tx.timestamp).toLocaleDateString('fa-IR')} | ${tx.amount.toLocaleString()} تومان (${tx.type === 'withdrawal' ? 'برد' : 'رسید'})\n`;
            });
        }

        snapshots.forEach((snap, index) => {
            const isSelected = selectedSnapshots.has(snap.id);
            const isDetailed = index === 0 || (isSelected && printOptions[snap.id] === 'detailed');

            if (index === 0 || isSelected) {
                shareText += `\n--------------------------\n`;
                shareText += `📌 بیلانس مورخ: ${new Date(snap.created_at).toLocaleDateString('fa-IR')}\n`;
                
                Object.entries(snap.balances_data.main_balances || {}).forEach(([curr, amount]) => {
                    shareText += `🔸 ${curr}: ${(amount as number).toLocaleString()}\n`;
                });
                shareText += `🔸 K (تومان): ${(snap.balances_data.rented_balance || 0).toLocaleString()}\n`;

                if (isDetailed) {
                    const nextSnap = snapshots[index + 1] || null;
                    const periodTxs = getTransactionsForPeriod(allTransactions, snap, nextSnap);
                    const periodRentedTxs = getTransactionsForPeriod(rentedTransactions, snap, nextSnap);

                    if (periodTxs.length > 0) {
                        shareText += `\n📝 ریز تراکنش‌های ارزی این دوره:\n`;
                        periodTxs.slice(0, 3).forEach(tx => {
                            shareText += `▪️ ${new Date(tx.timestamp).toLocaleDateString('fa-IR')} | ${tx.amount.toLocaleString()} ${tx.currency} (${tx.type === 'debit' ? 'برد' : 'رسید'})\n`;
                        });
                    }
                    if (periodRentedTxs.length > 0) {
                        shareText += `\n📝 ریز تراکنش‌های حساب K این دوره:\n`;
                        periodRentedTxs.slice(0, 3).forEach(tx => {
                            shareText += `▪️ ${new Date(tx.timestamp).toLocaleDateString('fa-IR')} | ${tx.amount.toLocaleString()} تومان (${tx.type === 'withdrawal' ? 'برد' : 'رسید'})\n`;
                        });
                    }
                }
            }
        });

        if (navigator.share) {
            navigator.share({
                title: `بیلانس ${customer.name}`,
                text: shareText,
            }).catch(err => console.error('Error sharing:', err));
        } else {
            navigator.clipboard.writeText(shareText);
            alert('متن بیلانس در حافظه کپی شد.');
        }
    };

    const getBalanceStyle = (balance: number) => {
        if (balance >= 0) return 'text-green-400';
        if (balance < 0) return 'text-red-400';
        return 'text-slate-300';
    };

    return (
        <div className="bg-[#12122E]/80 border-2 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)] overflow-hidden transition-all hover:border-amber-500/40" 
             style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-slate-100 truncate max-w-[180px]">{customer.name}</h3>
                            <div className="flex items-center">
                                <button 
                                    onClick={handlePrint}
                                    className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                                    title="چاپ بیلانس"
                                >
                                    <PrinterIcon />
                                </button>
                                <button 
                                    onClick={handleShare}
                                    className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                                    title="اشتراک‌گذاری بیلانس"
                                >
                                    <ShareIcon />
                                </button>
                            </div>
                        </div>
                        <span className="text-lg font-mono text-amber-400">کد: {customer.code}</span>
                    </div>
                    {latestSnapshot && (
                        <div className="text-left">
                            <span className="text-sm text-slate-500 block">آخرین بیلانس:</span>
                            <span className="text-sm text-slate-400">{new Date(latestSnapshot.created_at).toLocaleDateString('fa-IR')}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3 mb-6">
                    {latestSnapshot ? (
                        <div className="bg-black/20 p-4 rounded border border-amber-500/10">
                            {/* Smart Flexible Currency Grid */}
                            <div className="flex flex-wrap gap-2 mb-1">
                                {Object.entries(latestSnapshot.balances_data.main_balances || {}).map(([currency, amount]) => (
                                    <div key={currency} className="flex-1 min-w-[100px] flex justify-between items-center bg-white/5 p-2 rounded border border-white/5 transition-all hover:bg-white/10">
                                        <span className="text-[10px] text-slate-400 font-medium">{currency}</span>
                                        <span className={`font-bold ${getBalanceStyle(amount as number)}`}
                                              style={{ fontSize: (amount as number).toString().length > 10 ? '0.75rem' : '0.9rem' }}>
                                            {(amount as number).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Distinct Rented Balance Display */}
                            {latestSnapshot.balances_data.rented_balance !== 0 && (
                                <div className="mt-2 flex justify-between items-center bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-amber-200/70 font-semibold">مانده کرایی (تومان)</span>
                                    </div>
                                    <span className={`text-sm font-bold ${getBalanceStyle(latestSnapshot.balances_data.rented_balance)}`}>
                                        {latestSnapshot.balances_data.rented_balance.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            
                            {latestSnapshot.notes && (
                                <p className="text-[11px] text-slate-500 mt-3 italic border-t border-white/5 pt-2">"{latestSnapshot.notes}"</p>
                            )}
                            <div className="mt-2 flex justify-end">
                                <span className="text-[9px] text-slate-600">ثبت توسط: {latestSnapshot.created_by_name || latestSnapshot.created_by}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-500 italic text-center py-4">هیچ بیلانس ثبت نشده است.</div>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors ${snapshots.length <= 1 ? 'invisible' : ''}`}
                    >
                        {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        <span className="text-lg">تاریخچه بیلانس‌ها ({snapshots.length})</span>
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
        
        const confirm = window.confirm('آیا از ثبت بیلانس برای تمام مشتریان اطمینان دارید؟ این عملیات وضعیت فعلی تمام حساب‌ها را ذخیره می‌کند.');
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
                        .map(([curr, amount]) => `${(amount as number) >= 0 ? 'بدهکار' : 'طلبکار'}: ${Math.abs(amount as number).toLocaleString()} ${curr}`)
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
                    notes: 'ثبت همگانی بیلانس'
                });
            }

            const result = await api.createBulkBalanceSnapshots(bulkSnapshots);
            if ('error' in result) {
                addToast(`خطا در ثبت همگانی: ${result.error}`, 'error');
            } else {
                addToast('بیلانس تمام مشتریان با موفقیت ثبت شد.', 'success');
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
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت بیلانس‌ها</h1>
                <div className="flex gap-4">
                    <button 
                        onClick={handleBulkRecord}
                        disabled={isBulkRecording || customers.length === 0}
                        className="px-6 py-3 text-xl font-bold tracking-wider text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)' }}
                    >
                        {isBulkRecording ? 'در حال ثبت...' : 'ثبت همگانی بیلانس'}
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
                <div className="text-center py-20 text-slate-400 text-2xl">در حال بارگذاری بیلانس‌ها...</div>
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
