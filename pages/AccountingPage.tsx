
import React, { useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useApi } from '../hooks/useApi';
import { Currency } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';
import AccountingPrintView from '../components/AccountingPrintView';

type AnalysisResult = {
    grossAssets: number;
    netWorth: number;
    liquidNetWorth: number;
    breakdown: {
        liquidAssets: { [key in Currency]?: number };
        receivables: { [key in Currency]?: number };
        liabilities: { [key in Currency]?: number };
        commissionLiability: { [key in Currency]?: number };
        usdTotals: {
            totalLiquidAssetsUSD: number;
            totalReceivablesUSD: number;
            totalLiabilitiesUSD: number;
            totalCommissionLiabilityUSD: number;
        }
    }
};

const SettingsCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode }> = ({ title, children, actions }) => (
    <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
        <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
            <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">{title}</h2>
            <div>{actions}</div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const ResultCard: React.FC<{ title: string, value: number, description: string }> = ({ title, value, description }) => (
     <div className="bg-slate-800/50 p-6 rounded-lg text-center border border-cyan-400/20">
        <h3 className="text-2xl text-slate-400">{title}</h3>
        <p className="text-5xl font-bold font-mono text-cyan-300 my-3">
            ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}
        </p>
        <p className="text-base text-slate-500">{description}</p>
    </div>
);

const AccountingPage: React.FC = () => {
    const api = useApi();
    const [rates, setRates] = useState<{[key: string]: string}>({ 'USD': '1' });
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    
    const handleRateChange = (currency: Currency, value: string) => {
        setRates(prev => ({ ...prev, [currency]: value }));
    };

    const fetchLiveRates = async () => {
        setIsFetchingRates(true);
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            const newRates: {[key: string]: string} = { 'USD': '1' };
            CURRENCIES.forEach(currency => {
                if (data.rates[currency]) {
                    newRates[currency] = String(data.rates[currency]);
                }
            });
            setRates(newRates);
        } catch (error) {
            console.error("Failed to fetch exchange rates:", error);
            // Here you might want to add a toast notification for the user
        } finally {
            setIsFetchingRates(false);
        }
    };
    
    const handleCalculate = useCallback(async () => {
        setIsLoading(true);
        setAnalysis(null);

        const numericRates: {[key: string]: number} = {};
        for(const key in rates) {
            numericRates[key] = parseFloat(rates[key]) || 0;
        }

        const [cashboxBalances, customers, partners, commissionTransfers] = await Promise.all([
            api.getCashboxBalances(),
            api.getCustomers(),
            api.getPartnerAccounts(),
            api.getCommissionTransfers(),
        ]);
        
        const breakdown = {
            liquidAssets: {} as { [key in Currency]?: number },
            receivables: {} as { [key in Currency]?: number },
            liabilities: {} as { [key in Currency]?: number },
            commissionLiability: {} as { [key in Currency]?: number },
        };
        const addToBreakdown = (category: keyof typeof breakdown, currency: Currency, amount: number) => {
            breakdown[category][currency] = (breakdown[category][currency] || 0) + amount;
        };

        cashboxBalances.forEach(bal => addToBreakdown('liquidAssets', bal.currency, bal.balance));

        customers.forEach(c => {
            for (const key in c.balances) {
                const currency = key as Currency;
                const balance = c.balances[currency] || 0;
                if (balance > 0) addToBreakdown('liabilities', currency, balance);
                else if (balance < 0) addToBreakdown('receivables', currency, Math.abs(balance));
            }
        });

        partners.forEach(p => {
            for (const key in p.balances) {
                const currency = key as Currency;
                const balance = p.balances[currency] || 0;
                if (balance > 0) addToBreakdown('liabilities', currency, balance);
                else if (balance < 0) addToBreakdown('receivables', currency, Math.abs(balance));
            }
        });
        
        const pendingCommission = commissionTransfers.filter(t => ['PendingExecution', 'PendingWithdrawalApproval'].includes(t.status));
        pendingCommission.forEach(t => {
            const commissionAmount = t.amount * (t.commission_percentage / 100);
            const liabilityAmount = t.amount - commissionAmount;
            addToBreakdown('commissionLiability', t.currency, liabilityAmount);
            addToBreakdown('receivables', t.currency, commissionAmount);
        });

        const convertToUsd = (currency: Currency, amount: number) => {
            const rate = numericRates[currency];
            if (!rate || rate === 0) return 0; // Prevent division by zero
            return amount / rate;
        };
        
        let totals = {
            totalLiquidAssetsUSD: 0,
            totalReceivablesUSD: 0,
            totalLiabilitiesUSD: 0,
            totalCommissionLiabilityUSD: 0,
        };

        CURRENCIES.forEach(c => {
            totals.totalLiquidAssetsUSD += convertToUsd(c, breakdown.liquidAssets[c] || 0);
            totals.totalReceivablesUSD += convertToUsd(c, breakdown.receivables[c] || 0);
            totals.totalLiabilitiesUSD += convertToUsd(c, breakdown.liabilities[c] || 0);
            totals.totalCommissionLiabilityUSD += convertToUsd(c, breakdown.commissionLiability[c] || 0);
        });

        const grossAssets = totals.totalLiquidAssetsUSD + totals.totalReceivablesUSD;
        const netWorth = grossAssets - totals.totalLiabilitiesUSD - totals.totalCommissionLiabilityUSD;
        const liquidNetWorth = totals.totalLiquidAssetsUSD - totals.totalLiabilitiesUSD - totals.totalCommissionLiabilityUSD;


        setAnalysis({ grossAssets, netWorth, liquidNetWorth, breakdown: { ...breakdown, usdTotals: totals } });
        setIsLoading(false);

    }, [api, rates]);

    const handlePrint = () => {
        if (!analysis) return;
        const container = document.getElementById('printable-area-container');
        if (container) {
            ReactDOM.render(
                <AccountingPrintView analysis={analysis} rates={rates} />,
                container,
                () => {
                    setTimeout(() => {
                        window.print();
                        ReactDOM.unmountComponentAtNode(container);
                    }, 100);
                }
            );
        }
    };
    
    return (
        <div style={{ direction: 'rtl' }} className="space-y-12">
            <h1 className="text-5xl font-bold text-slate-100 mb-4 tracking-wider">حسابداری و تحلیل دارایی</h1>
            
            <SettingsCard 
                title="۱. مدیریت نرخ‌های تبدیل ارز (نسبت به USD)"
                actions={
                    <button onClick={fetchLiveRates} disabled={isFetchingRates} className="px-4 py-2 text-lg font-bold text-cyan-300 bg-slate-700/50 rounded-md hover:bg-slate-700 disabled:opacity-50">
                        {isFetchingRates ? 'در حال دریافت...' : 'به‌روزرسانی با نرخ جهانی'}
                    </button>
                }
            >
                <p className="text-slate-400 mb-6">برای محاسبه‌ی ارزش کل دارایی‌ها، نرخ تبدیل هر ارز را نسبت به دالر آمریکا وارد کنید. (مثال: اگر هر دالر ۷۰ افغانی باشد، عدد ۷۰ را وارد کنید)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {CURRENCIES.filter(c => c !== 'USD').map(currency => (
                        <div key={currency}>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">1 USD = ? {currency}</label>
                            <input
                                type="number"
                                step={currency === 'EUR' ? '0.001' : '0.1'}
                                value={rates[currency] || ''}
                                onChange={e => handleRateChange(currency, e.target.value)}
                                placeholder={`نرخ ${currency}`}
                                className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"
                            />
                        </div>
                    ))}
                </div>
            </SettingsCard>
            
             <div className="text-center">
                <button
                    onClick={handleCalculate}
                    disabled={isLoading}
                    className="px-12 py-4 text-2xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                    {isLoading ? 'در حال محاسبه...' : '۲. محاسبه دارایی خالص'}
                </button>
            </div>

            {analysis && (
                <div className="animate-fadeIn space-y-8 ml-32">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">۳. نتایج تحلیل (به ارزش USD)</h2>
                        <button onClick={handlePrint} className="px-6 py-3 text-xl font-bold text-cyan-300 bg-slate-700/50 rounded-md hover:bg-slate-700">چاپ گزارش</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <ResultCard title="مجموع کل دارایی‌ها (ناخالص)" value={analysis.grossAssets} description="شامل تمام موجودی نقد (صندوق و بانک) و کل طلبی که از دیگران دارید." />
                        <ResultCard title="دارایی خالص واقعی" value={analysis.netWorth} description="ثروت واقعی شما پس از کسر تمام بدهی‌ها و تعهدات از مجموع کل دارایی‌ها." />
                        <ResultCard title="دارایی خالص نقد" value={analysis.liquidNetWorth} description="سرمایه نقدی خالص شما، با فرض اینکه طلب‌های خود را هنوز دریافت نکرده‌اید." />
                    </div>
                </div>
            )}

        </div>
    );
};

export default AccountingPage;
