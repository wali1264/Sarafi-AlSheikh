import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Amanat, AmanatStatus, Role } from '../types';
import { amanatStatusTranslations } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import CreateAmanatModal from '../components/CreateAmanatModal';

const getStatusStyle = (status: AmanatStatus) => {
    switch (status) {
        case AmanatStatus.Active: return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
        case AmanatStatus.Returned: return 'text-green-400 border-green-400/50 bg-green-400/10';
        default: return 'text-slate-400 border-slate-400/50 bg-slate-400/10';
    }
};

const AmanatPage: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [amanatList, setAmanatList] = useState<Amanat[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const canCreate = user && [Role.Manager, Role.Domestic_Clerk, Role.Foreign_Clerk].includes(user.role);

    const fetchData = useCallback(async () => {
        const data = await api.getAmanat();
        setAmanatList(data.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
    };
    
    const handleReturnAmanat = async (amanatId: string) => {
        if (!user) return;
        if (window.confirm('آیا از بازگرداندن این امانت اطمینان دارید؟ یک درخواست برداشت از صندوق ایجاد خواهد شد.')) {
            const result = await api.returnAmanat({ amanatId, user });
            if ('error' in result) {
                alert(`Error: ${result.error}`);
            } else {
                fetchData();
            }
        }
    };


    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">مدیریت امانات</h1>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">لیست امانات</h2>
                    {canCreate && (
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            ثبت امانت جدید
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">کد</th>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ ثبت</th>
                                <th scope="col" className="px-6 py-4 font-medium">نام مشتری</th>
                                <th scope="col" className="px-6 py-4 font-medium">مبلغ</th>
                                <th scope="col" className="px-6 py-4 font-medium">یادداشت</th>
                                <th scope="col" className="px-6 py-4 font-medium">وضعیت</th>
                                <th scope="col" className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {amanatList.map(a => (
                                <tr key={a.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-cyan-300">{a.id}</td>
                                    <td className="px-6 py-4">{a.createdAt.toLocaleDateString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4">{a.customerName}</td>
                                    <td className="px-6 py-4 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(a.amount)} {a.currency}</td>
                                    <td className="px-6 py-4">{a.notes}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full border ${getStatusStyle(a.status)}`}>
                                            {amanatStatusTranslations[a.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        {a.status === AmanatStatus.Active && (
                                            <button 
                                                onClick={() => handleReturnAmanat(a.id)}
                                                className="px-4 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-base transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                                            >
                                                ثبت بازگشت
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {user && (
                <CreateAmanatModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleSuccess}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default AmanatPage;