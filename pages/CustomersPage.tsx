import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Customer, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CreateCustomerModal from '../components/CreateCustomerModal';

const CustomersPage: React.FC = () => {
    const api = useApi();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const canCreate = user && [Role.Manager, Role.Domestic_Clerk, Role.Foreign_Clerk].includes(user.role);

    const fetchData = useCallback(async () => {
        const data = await api.getCustomers();
        setCustomers(data);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
    };

    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">مدیریت مشتریان</h1>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">لیست مشتریان ثبت شده</h2>
                    {canCreate && (
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            ثبت مشتری جدید
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">اسم مشتری</th>
                                <th scope="col" className="px-6 py-4 font-medium">کد مشتری</th>
                                <th scope="col" className="px-6 py-4 font-medium">شماره واتس‌اپ</th>
                                <th scope="col" className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-100">{c.name}</td>
                                    <td className="px-6 py-4 font-mono text-cyan-300">{c.code}</td>
                                    <td className="px-6 py-4 font-mono text-left">{c.whatsappNumber}</td>
                                    <td className="px-6 py-4 text-left">
                                        <button 
                                            onClick={() => navigate(`/customers/${c.id}`)}
                                            className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                                        >
                                            مشاهده حساب
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {user && (
                <CreateCustomerModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
};

export default CustomersPage;