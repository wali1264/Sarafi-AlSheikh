import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRentedAccounts } from '../contexts/RentedAccountContext';
import { useAuth } from '../contexts/AuthContext';
import { RentedAccountTransaction } from '../types';
import CreateRentedAccountModal from '../components/CreateRentedAccountModal';
import CreateRentedDepositModal from '../components/CreateRentedDepositModal';
import CreateRentedWithdrawalModal from '../components/CreateRentedWithdrawalModal';

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

const RentedAccountsPage: React.FC = () => {
    const { accounts, transactions, users, customers, partners, toggleAccountStatus } = useRentedAccounts();
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState<'journal' | 'accounts' | 'users'>('journal');

    // Modal States
    const [isCreateAccountModalOpen, setCreateAccountModalOpen] = useState(false);
    const [isDepositModalOpen, setDepositModalOpen] = useState(false);
    const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);

    const accountsMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc])), [accounts]);
    const usersMap = useMemo(() => {
        const map = new Map<string, {name: string}>();
        customers.forEach(c => map.set(`customer-${c.id}`, { name: c.name }));
        partners.forEach(p => map.set(`partner-${p.id}`, { name: p.name }));
        return map;
    }, [customers, partners]);

    const handleSuccess = () => {
        setCreateAccountModalOpen(false);
        setDepositModalOpen(false);
        setWithdrawalModalOpen(false);
    };

    return (
        <div style={{ direction: 'rtl' }} className="space-y-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-5xl font-bold text-slate-100 tracking-wider">مدیریت حسابات کرایی</h1>
                <div className="flex gap-4">
                     {hasPermission('rentedAccounts', 'create') && (
                        <>
                         <button onClick={() => setDepositModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'}}>+ ثبت واریزی</button>
                         <button onClick={() => setWithdrawalModalOpen(true)} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-red-500 hover:bg-red-400 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all transform hover:scale-105" style={{clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'}}>- ثبت برداشتی</button>
                        </>
                    )}
                </div>
            </div>

            <div className="border-b-2 border-cyan-400/20 mb-8">
                <TabButton active={activeTab === 'journal'} onClick={() => setActiveTab('journal')}>روزنامچه عمومی</TabButton>
                <TabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')}>لیست حسابات کرایی</TabButton>
                <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>دفتر حساب استفاده کنندگان</TabButton>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                {activeTab === 'journal' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-lg text-right text-slate-300">
                             <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th className="px-4 py-3">تاریخ</th>
                                    <th className="px-4 py-3">نوع</th>
                                    <th className="px-4 py-3">حساب کرایی</th>
                                    <th className="px-4 py-3">طرف حساب</th>
                                    <th className="px-4 py-3 text-left">مبلغ</th>
                                    <th className="px-4 py-3 text-left">کمیسیون</th>
                                    <th className="px-4 py-3">کاربر</th>
                               </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => {
                                     const account = accountsMap.get(tx.rented_account_id);
                                     const userIdentifier = `${tx.user_type.toLowerCase()}-${tx.user_id}`;
                                     const userName = users.find(u => u.id === userIdentifier)?.name || 'ناشناس';
                                    return (
                                        <tr key={tx.id} className="border-b border-cyan-400/10">
                                            <td className="px-4 py-3 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR')}</td>
                                            <td className={`px-4 py-3 font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'deposit' ? 'واریز' : 'برداشت'}</td>
                                            <td className="px-4 py-3">{account?.bank_name} ({account?.partner_name})</td>
                                            <td className="px-4 py-3 font-semibold">{userName}</td>
                                            <td className="px-4 py-3 text-left font-mono">{new Intl.NumberFormat('fa-IR').format(tx.amount)}</td>
                                            <td className="px-4 py-3 text-left font-mono text-amber-400">{tx.commission_amount > 0 ? new Intl.NumberFormat('fa-IR').format(tx.commission_amount) : '-'}</td>
                                            <td className="px-4 py-3">{tx.created_by}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                 {activeTab === 'accounts' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-semibold">لیست حسابات</h3>
                             {hasPermission('rentedAccounts', 'create') && (
                                <button onClick={() => setCreateAccountModalOpen(true)} className="px-4 py-2 text-lg font-bold text-cyan-300 bg-slate-700/50 rounded-md hover:bg-slate-700">+ افزودن حساب</button>
                             )}
                        </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-lg text-right text-slate-300">
                                <thead className="text-xl text-slate-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">کرایه از</th>
                                        <th className="px-4 py-3">بانک / شماره حساب</th>
                                        <th className="px-4 py-3 text-left">موجودی</th>
                                        <th className="px-4 py-3">وضعیت</th>
                                        <th className="px-4 py-3"></th>
                                   </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(acc => (
                                        <tr key={acc.id} className={`border-b border-cyan-400/10 ${acc.status === 'Inactive' ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3 font-semibold">{acc.partner_name}</td>
                                            <td className="px-4 py-3">{acc.bank_name} ({acc.account_number})</td>
                                            <td className="px-4 py-3 font-mono text-left font-bold">{new Intl.NumberFormat('fa-IR').format(acc.balance)}</td>
                                            <td className={`px-4 py-3 font-bold ${acc.status === 'Active' ? 'text-green-400' : 'text-slate-500'}`}>{acc.status === 'Active' ? 'فعال' : 'غیرفعال'}</td>
                                            <td className="px-4 py-3 text-left space-x-4 space-x-reverse">
                                                <button onClick={() => toggleAccountStatus(acc.id)} className="text-sm text-amber-400 hover:underline">تغییر وضعیت</button>
                                                <Link to={`/rented-accounts/${acc.id}`} className="text-cyan-300 hover:underline">مشاهده روزنامچه</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                 {activeTab === 'users' && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-lg text-right text-slate-300">
                            <thead className="text-xl text-slate-400 uppercase">
                                <tr>
                                    <th className="px-4 py-3">نام</th>
                                    <th className="px-4 py-3">آخرین فعالیت</th>
                                    <th className="px-4 py-3">نوع</th>
                                    <th className="px-4 py-3 text-left">موجودی ایزوله</th>
                                    <th className="px-4 py-3"></th>
                               </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-cyan-400/10">
                                        <td className="px-4 py-3 font-semibold">{user.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(user.lastActivity).toLocaleDateString('fa-IR')}</td>
                                        <td className="px-4 py-3">{user.type === 'Customer' ? 'مشتری' : 'همکار'}</td>
                                        <td className="px-4 py-3 font-mono text-left font-bold">{new Intl.NumberFormat('fa-IR').format(user.balance)}</td>
                                        <td className="px-4 py-3 text-left"><Link to={`/rented-accounts/user/${user.id}`} className="text-cyan-300 hover:underline">مشاهده دفتر حساب</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {isCreateAccountModalOpen && <CreateRentedAccountModal isOpen={isCreateAccountModalOpen} onClose={() => setCreateAccountModalOpen(false)} onSuccess={handleSuccess} />}
            {isDepositModalOpen && <CreateRentedDepositModal isOpen={isDepositModalOpen} onClose={() => setDepositModalOpen(false)} onSuccess={handleSuccess} />}
            {isWithdrawalModalOpen && <CreateRentedWithdrawalModal isOpen={isWithdrawalModalOpen} onClose={() => setWithdrawalModalOpen(false)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default RentedAccountsPage;
