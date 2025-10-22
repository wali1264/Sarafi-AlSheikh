import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { ActivityLog } from '../types';
import { formatTimeAgo } from '../utils/timeFormatter';
import { supabase } from '../services/supabaseClient';


const ActivityFeed: React.FC = () => {
    const api = useApi();
    const [activities, setActivities] = useState<ActivityLog[]>([]);

    useEffect(() => {
        const fetchActivities = async () => {
            const data = await api.getActivityLogs();
            setActivities(data);
        };
        fetchActivities();
    }, [api]);

    useEffect(() => {
        const channel = supabase
            .channel('activity-feed-inserts')
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'activity_logs' }, 
                (payload) => {
                    setActivities(prevActivities => [payload.new as ActivityLog, ...prevActivities]);
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6 border-b-2 border-cyan-400/20">
                <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">فعالیت های اخیر</h2>
            </div>
            <div className="p-2">
                 {activities.length === 0 ? (
                    <p className="p-4 text-center text-slate-400 text-lg">هنوز فعالیتی ثبت نشده است.</p>
                ) : (
                    <ul className="divide-y divide-cyan-400/10">
                        {activities.map(activity => (
                            <li key={activity.id} className="p-4 flex justify-between items-start hover:bg-cyan-400/5 transition-colors">
                                <div className="text-lg">
                                    <span className="font-bold text-cyan-300">{activity.user}</span>
                                    <span className="text-slate-300"> {activity.action}</span>
                                </div>
                                <span className="text-slate-500 text-base flex-shrink-0 ml-4">{formatTimeAgo(new Date(activity.timestamp))}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;