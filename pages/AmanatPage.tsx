
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Amanat, AmanatStatus, User, ReturnAmanatPayload } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateAmanatModal from '../components/CreateAmanatModal';
import { amanatStatusTranslations } from '../utils/translations';

const AmanatPage: React.FC = () => {
    const api = useApi();
    const { user, hasPermission } = useAuth();
    const [amanatList, setAmanatList] = useState<Amanat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState<'Active' | 'Returned'>('Active');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await api.getAmanat();
        setAmanatList(data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoading(false);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const handleReturnAmanat = async (amanatId: string) => {
        if (!user) return;
        if (window.confirm("آیا از بازگشت این امانت اطمینان دارید؟ یک درخواست برداشت از صندوق ایجاد خواهد شد.")) {
            const payload: ReturnAmanatPayload = { amanatId, user };
            const result = await api.returnAmanat(payload);
            if ('error' in result) {
                alert(`Error: ${result.error}`);
            } else {
                fetchData();
            }
        }
    };

    const filteredList = useMemo(() => amanatList.filter(a => a.status === filter), [amanatList, filter]);

    const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
        <button
            onClick={onClick}
            className={`px-6 py-3 text-2xl font-bold transition-colors duration-300 border-b-4 ${
                active ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div style={{direction: 'rtl'}}>
             <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت امانات</h1>
                 {hasPermission('amanat', 'create') && (
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'}}>
                        + ثبت امانت جدید
                    </button>
                )}
            </div>

            <div className="border-b-2 border-cyan-400/20 mb-8">
                <TabButton active={filter === 'Active'} onClick={() => setFilter('Active')}>امانات فعال</TabButton>
                <TabButton active={filter === 'Returned'} onClick={() => setFilter('Returned')}>امانات بازگشت داده شده</TabButton>
            </div>
            
            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                 <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                           <tr>
                                <th className="px-6 py-4 font-medium">تاریخ ثبت</th>
                                <th className="px-6 py-4 font-medium">نام مشتری</th>
                                <th className="px-6 py-4 font-medium">مبلغ</th>
                                <th className="px-6 py-4 font-medium">یادداشت</th>
                                <th className="px-6 py-4 font-medium">وضعیت</th>
                                <th className="px-6 py-4 font-medium"></th>
                           </tr>
                        </thead>
                        <tbody>
                            {filteredList.map(a => (
                                <tr key={a.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(a.createdAt).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-100">{a.customerName}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(a.amount)} {a.currency}</td>
                                    <td className="px-6 py-4">{a.notes}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full ${a.status === AmanatStatus.Active ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/20 text-slate-300'}`}>
                                            {amanatStatusTranslations[a.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        {a.status === AmanatStatus.Active && hasPermission('amanat', 'process') && (
                                            <button onClick={() => handleReturnAmanat(a.id)} className="px-4 py-2 bg-amber-600/50 hover:bg-amber-500/50 text-amber-200 rounded">بازگشت امانت</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && user && (
                <CreateAmanatModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default AmanatPage;
