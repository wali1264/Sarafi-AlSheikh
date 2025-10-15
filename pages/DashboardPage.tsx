import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import ActivityFeed from '../components/ActivityFeed';
import { useApi } from '../hooks/useApi';
import { Currency, DashboardAnalyticsData } from '../types';
import DashboardChartContainer from '../components/DashboardChartContainer';

interface DashboardStats {
    totalTransfersToday: number;
    totalVolumeToday: { amount: number, currency: Currency };
    pendingRequests: number;
    totalPartners: number;
}

const DashboardPage: React.FC = () => {
    const api = useApi();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [analyticsData, setAnalyticsData] = useState<DashboardAnalyticsData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch stats
            const transfers = await api.getDomesticTransfers();
            const partners = await api.getPartnerAccounts();
            const cashboxRequests = await api.getCashboxRequests();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const transfersToday = transfers.filter(t => t.createdAt >= today);
            
            setStats({
                totalTransfersToday: transfersToday.length,
                totalVolumeToday: {
                    amount: transfersToday.reduce((sum, t) => sum + (t.currency === Currency.USD ? t.amount : 0), 0),
                    currency: Currency.USD
                },
                pendingRequests: cashboxRequests.filter(r => r.status === 'Pending').length,
                totalPartners: partners.length,
            });

            // Fetch analytics data
            const analytics = await api.getDashboardAnalytics();
            setAnalyticsData(analytics);
        };

        fetchData();
    }, [api]);

    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <div>
                <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">داشبورد مدیریتی</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard 
                        title="حواله های امروز" 
                        value={stats?.totalTransfersToday ?? '...'} 
                        accent="cyan" 
                    />
                    <StatCard 
                        title="حجم معاملات امروز (دالر)" 
                        value={stats ? new Intl.NumberFormat('en-US').format(stats.totalVolumeToday.amount) : '...'}
                        accent="magenta" 
                    />
                    <StatCard 
                        title="درخواست های در انتظار" 
                        value={stats?.pendingRequests ?? '...'}
                        accent="green" 
                    />
                    <StatCard 
                        title="همکاران فعال" 
                        value={stats?.totalPartners ?? '...'}
                        accent="plain" 
                    />
                </div>
            </div>

            {analyticsData && <DashboardChartContainer analyticsData={analyticsData} />}

            <ActivityFeed />
        </div>
    );
};

export default DashboardPage;