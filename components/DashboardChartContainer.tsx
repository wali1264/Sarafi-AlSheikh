import React, { useEffect, useRef } from 'react';
import { DashboardAnalyticsData } from '../types';
// FIX: chart.js is loaded from the CDN, so we can assume Chart is available on the window
declare const Chart: any;

interface DashboardChartContainerProps {
    analyticsData: DashboardAnalyticsData;
}

const ChartCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-[#12122E]/80 p-6 border-2 border-cyan-400/20 shadow-[0_0_20px_rgba(0,255,255,0.2)] h-96 flex flex-col" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
        <h3 className="text-2xl font-semibold text-slate-300 tracking-wider mb-4 text-right">{title}</h3>
        <div className="relative flex-1">
            {children}
        </div>
    </div>
);

const DashboardChartContainer: React.FC<DashboardChartContainerProps> = ({ analyticsData }) => {
    const profitLossChartRef = useRef<HTMLCanvasElement>(null);
    const expensesChartRef = useRef<HTMLCanvasElement>(null);
    const partnersChartRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const chartInstances: any[] = [];
        
        // --- Chart Configs ---
        Chart.defaults.color = 'rgba(203, 213, 225, 0.7)';
        Chart.defaults.font.family = 'Teko, sans-serif';
        Chart.defaults.font.size = 16;
        Chart.defaults.plugins.legend.position = 'bottom';
        
        // 1. Profit/Loss Chart
        if (profitLossChartRef.current && analyticsData.profitLossTrend) {
            const ctx = profitLossChartRef.current.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: analyticsData.profitLossTrend.map(d => d.month),
                    datasets: [
                        {
                            label: 'درآمد (دالر)',
                            data: analyticsData.profitLossTrend.map(d => d.revenue),
                            borderColor: 'rgba(34, 211, 238, 1)',
                            backgroundColor: 'rgba(34, 211, 238, 0.2)',
                            fill: true,
                            tension: 0.4,
                        },
                        {
                            label: 'مصارف (دالر)',
                            data: analyticsData.profitLossTrend.map(d => d.expenses),
                            borderColor: 'rgba(244, 63, 94, 1)',
                            backgroundColor: 'rgba(244, 63, 94, 0.2)',
                            fill: true,
                            tension: 0.4,
                        },
                    ],
                },
                options: { responsive: true, maintainAspectRatio: false },
            });
            chartInstances.push(chart);
        }

        // 2. Expenses Chart
        if (expensesChartRef.current && analyticsData.expensesByCategory) {
            const ctx = expensesChartRef.current.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: analyticsData.expensesByCategory.map(d => d.label),
                    datasets: [{
                        data: analyticsData.expensesByCategory.map(d => d.value),
                        backgroundColor: ['#22d3ee', '#a855f7', '#eab308', '#22c55e', '#64748b'],
                    }],
                },
                 options: { responsive: true, maintainAspectRatio: false },
            });
            chartInstances.push(chart);
        }
        
        // 3. Partners Chart
        if (partnersChartRef.current && analyticsData.partnerActivity) {
            const ctx = partnersChartRef.current.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: analyticsData.partnerActivity.map(d => d.label),
                    datasets: [{
                        label: 'تعداد حواله ها',
                        data: analyticsData.partnerActivity.map(d => d.value),
                        backgroundColor: 'rgba(74, 222, 128, 0.6)',
                        borderColor: 'rgba(74, 222, 128, 1)',
                        borderWidth: 1,
                    }],
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: {
                            display: false,
                        }
                    }
                },
            });
            chartInstances.push(chart);
        }


        return () => {
            chartInstances.forEach(chart => chart.destroy());
        };
    }, [analyticsData]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-2">
                 <ChartCard title="روند سود و زیان (دالر)">
                    <canvas ref={profitLossChartRef}></canvas>
                </ChartCard>
            </div>
            <ChartCard title="تفکیک مصارف">
                <canvas ref={expensesChartRef}></canvas>
            </ChartCard>
             <ChartCard title="فعالیت همکاران (تعداد حواله)">
                 <canvas ref={partnersChartRef}></canvas>
            </ChartCard>
        </div>
    );
};

export default DashboardChartContainer;