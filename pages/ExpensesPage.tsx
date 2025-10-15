import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Expense, ExpenseCategory, Role } from '../types';
import { expenseCategoryTranslations } from '../utils/translations';
import CreateExpenseModal from '../components/CreateExpenseModal';
import { useAuth } from '../contexts/AuthContext';

const getCategoryStyle = (category: ExpenseCategory) => {
    switch (category) {
        case ExpenseCategory.Salary: return 'text-blue-400 border-blue-400/50 bg-blue-400/10';
        case ExpenseCategory.Rent: return 'text-purple-400 border-purple-400/50 bg-purple-400/10';
        case ExpenseCategory.Utilities: return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
        case ExpenseCategory.Hospitality: return 'text-green-400 border-green-400/50 bg-green-400/10';
        default: return 'text-slate-400 border-slate-400/50 bg-slate-400/10';
    }
};

const ExpensesPage: React.FC = () => {
    const api = useApi();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const canCreate = user && user.role === Role.Manager;

    const fetchData = useCallback(async () => {
        const data = await api.getExpenses();
        setExpenses(data.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExpenseCreated = () => {
        fetchData();
        setIsCreateModalOpen(false);
    }

    return (
        <div style={{direction: 'rtl'}}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">مدیریت مصارف</h1>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">تاریخچه مصارف</h2>
                    {canCreate && (
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            ثبت مصرف جدید
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">دسته‌بندی</th>
                                <th scope="col" className="px-6 py-4 font-medium">توضیحات</th>
                                <th scope="col" className="px-6 py-4 font-medium">مبلغ</th>
                                <th scope="col" className="px-6 py-4 font-medium">ثبت کننده</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(e => (
                                <tr key={e.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">{e.createdAt.toLocaleDateString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-base font-semibold rounded-full border ${getCategoryStyle(e.category)}`}>
                                            {expenseCategoryTranslations[e.category]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-100">{e.description}</td>
                                    <td className="px-6 py-4 font-mono text-left text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(e.amount)} {e.currency}</td>
                                    <td className="px-6 py-4">{e.user}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {user && (
                <CreateExpenseModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handleExpenseCreated}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default ExpensesPage;