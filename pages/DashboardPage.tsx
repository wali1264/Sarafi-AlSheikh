import React, { useEffect, useState, useCallback } from 'react';
import StatCard from '../components/StatCard';
import ActivityFeed from '../components/ActivityFeed';
import { useApi } from '../hooks/useApi';
import { Currency, DashboardAnalyticsData } from '../types';
import DashboardChartContainer from '../components/DashboardChartContainer';
import { supabase } from '../services/supabaseClient';

interface DashboardStats {
    totalTransfersToday: number;
    totalVolumeTodayString: string;
    pendingRequests: number;
    totalPartners: number;
}

const DashboardPage: React.FC = () => {
    const api = useApi();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [analyticsData, setAnalyticsData] = useState<DashboardAnalyticsData | null>(null);

    const fetchData = useCallback(async () => {
        // Fetch stats
        const transfers = await api.getDomesticTransfers();
        const partners = await api.getPartnerAccounts();
        const cashboxRequests = await api.getCashboxRequests();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const transfersToday = transfers.filter(t => new Date(t.created_at) >= today);
        
        const volumeByCurrency = transfersToday.reduce((acc, t) => {
            if (!acc[t.currency]) {
                acc[t.currency] = 0;
            }
            acc[t.currency] += t.amount;
            return acc;
        }, {} as { [key in Currency]?: number });

        const volumeString = Object.entries(volumeByCurrency)
            .map(([currency, amount]) => `${new Intl.NumberFormat('en-US').format(amount as number)} ${currency}`)
            .join(' | ');

        setStats({
            totalTransfersToday: transfersToday.length,
            totalVolumeTodayString: volumeString || '0',
            pendingRequests: cashboxRequests.filter(r => r.status === 'Pending').length,
            totalPartners: partners.length,
        });

        // Fetch analytics data
        const analytics = await api.getDashboardAnalytics();
        setAnalyticsData(analytics);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const channel = supabase
            .channel('dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'domestic_transfers' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cashbox_requests' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_accounts' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

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
                        title="حجم معاملات امروز" 
                        value={stats?.totalVolumeTodayString ?? '...'}
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