import React from 'react';

// Mock data, in a real app this would come from an API
const mockActivities = [
    { id: 1, user: 'احمد ولی', action: 'حواله داخلی جدیدی به مبلغ 5,000 دالر برای "صرافی هرات" ثبت کرد.', time: '۲ دقیقه پیش' },
    { id: 2, user: 'فاطمه زهرا', action: 'درخواست برداشت 20,000 افغانی از صندوق را تایید کرد.', time: '۱۰ دقیقه پیش' },
    { id: 3, user: 'جواد حسینی', action: 'وضعیت حواله DT-12345 را به "پرداخت شده" تغییر داد.', time: '۱ ساعت پیش' },
    { id: 4, user: 'زینب علیزاده', action: 'تراکنش خارجی فروش تومان بانکی برای "مشتری نمونه" ثبت کرد.', time: '۳ ساعت پیش' },
    { id: 5, user: 'احمد ولی', action: 'هزینه جدیدی برای "کرایه" به مبلغ ۵۰۰ دالر ثبت کرد.', time: 'دیروز' },
    { id: 6, user: 'جواد حسینی', action: 'امانت جدیدی به مبلغ ۱,۰۰۰ دالر برای "مشتری ویژه" ثبت کرد.', time: 'دیروز' },
];

const ActivityFeed: React.FC = () => {
    return (
        <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6 border-b-2 border-cyan-400/20">
                <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">فعالیت های اخیر</h2>
            </div>
            <div className="p-2">
                <ul className="divide-y divide-cyan-400/10">
                    {mockActivities.map(activity => (
                        <li key={activity.id} className="p-4 flex justify-between items-start hover:bg-cyan-400/5 transition-colors">
                            <div className="text-lg">
                                <span className="font-bold text-cyan-300">{activity.user}</span>
                                <span className="text-slate-300"> {activity.action}</span>
                            </div>
                            <span className="text-slate-500 text-base flex-shrink-0 ml-4">{activity.time}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ActivityFeed;