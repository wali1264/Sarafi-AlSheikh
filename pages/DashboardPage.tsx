import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Customer, PartnerAccount, Currency } from '../types';
import ActivityFeed from '../components/ActivityFeed';

// New BalanceSummaryCard Component
const BalanceSummaryCard: React.FC<{ 
    title: string; 
    balances: { [key in Currency]?: number }; 
    type: 'credit' | 'debt'; 
    isLoading: boolean;
}> = ({ title, balances, type, isLoading }) => {
    const colorClass = type === 'credit' ? 'text-green-400' : 'text-red-400';
    const borderClass = type === 'credit' ? 'border-green-500/30' : 'border-red-500/30';

    const nonZeroBalances = useMemo(() => 
        Object.entries(balances)
              .filter(([, amount]) => amount && amount !== 0)
              .map(([currency, amount]) => ({ currency, amount: amount! }))
    , [balances]);

    return (
        <div 
            className={`bg-[#12122E]/80 p-6 border-2 ${borderClass} shadow-[0_0_20px_rgba(0,255,255,0.1)] flex flex-col min-h-[300px]`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}
        >
            <h3 className={`text-2xl font-semibold text-slate-100 tracking-wider mb-4 border-b pb-2 ${borderClass}`}>{title}</h3>
            {isLoading ? (
                <div className="space-y-4 animate-pulse flex-grow">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="h-5 w-1/4 bg-slate-700 rounded"></div>
                            <div className="h-5 w-1/2 bg-slate-700 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto flex-grow">
                    {nonZeroBalances.length > 0 ? (
                        nonZeroBalances.map(({ currency, amount }) => (
                            <div key={currency} className="flex justify-between items-baseline text-xl">
                                <span className="text-slate-400">{currency}:</span>
                                <span className={`font-mono font-bold ${colorClass}`}>
                                    {new Intl.NumberFormat('en-US').format(Math.abs(amount))}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-slate-500 text-lg">حسابی برای نمایش وجود ندارد.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const api = useApi();
    const [summary, setSummary] = useState({
        customerCredit: {} as { [key in Currency]?: number },
        customerDebt: {} as { [key in Currency]?: number },
        partnerCredit: {} as { [key in Currency]?: number },
        partnerDebt: {} as { [key in Currency]?: number },
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const calculateSummaries = async () => {
            setIsLoading(true);
            const [customers, partners] = await Promise.all([
                api.getCustomers(),
                api.getPartnerAccounts()
            ]);

            const newSummary = {
                customerCredit: {} as { [key in Currency]?: number },
                customerDebt: {} as { [key in Currency]?: number },
                partnerCredit: {} as { [key in Currency]?: number },
                partnerDebt: {} as { [key in Currency]?: number },
            };

            // Process Customers: Positive balance means we owe them (our debt). Negative means they owe us (our credit).
            customers.forEach(customer => {
                for (const currency in customer.balances) {
                    const balance = customer.balances[currency as Currency] || 0;
                    if (balance > 0) {
                        newSummary.customerDebt[currency as Currency] = (newSummary.customerDebt[currency as Currency] || 0) + balance;
                    } else if (balance < 0) { 
                        newSummary.customerCredit[currency as Currency] = (newSummary.customerCredit[currency as Currency] || 0) + Math.abs(balance);
                    }
                }
            });
            
            // Process Partners: Positive balance means we owe them (our debt). Negative means they owe us (our credit).
            partners.forEach(partner => {
                for (const currency in partner.balances) {
                    const balance = partner.balances[currency as Currency] || 0;
                    if (balance > 0) {
                        newSummary.partnerDebt[currency as Currency] = (newSummary.partnerDebt[currency as Currency] || 0) + balance;
                    } else if (balance < 0) {
                        newSummary.partnerCredit[currency as Currency] = (newSummary.partnerCredit[currency as Currency] || 0) + Math.abs(balance);
                    }
                }
            });
            
            setSummary(newSummary);
            setIsLoading(false);
        };

        calculateSummaries();
    }, [api]);

    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div>
                <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">داشبورد مدیریتی</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <BalanceSummaryCard 
                    title="مجموع طلب از مشتریان"
                    balances={summary.customerCredit}
                    type="credit"
                    isLoading={isLoading}
                />
                <BalanceSummaryCard 
                    title="مجموع بدهی به مشتریان"
                    balances={summary.customerDebt}
                    type="debt"
                    isLoading={isLoading}
                />
                <BalanceSummaryCard 
                    title="مجموع طلب از همکاران"
                    balances={summary.partnerCredit}
                    type="credit"
                    isLoading={isLoading}
                />
                <BalanceSummaryCard 
                    title="مجموع بدهی به همکاران"
                    balances={summary.partnerDebt}
                    type="debt"
                    isLoading={isLoading}
                />
            </div>

            <ActivityFeed />
        </div>
    );
};

export default DashboardPage;