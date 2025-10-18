import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Customer, CustomerTransaction, Currency, User } from '../types';
import { CURRENCIES } from '../constants';
import InternalExchangeModal from '../components/InternalExchangeModal';
import { useAuth } from '../contexts/AuthContext';

const CustomerDetailPage: React.FC = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const navigate = useNavigate();
    const api = useApi();
    const { user } = useAuth();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [isInternalExchangeModalOpen, setInternalExchangeModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!customerId) return;
        const customerData = await api.getCustomerById(customerId);
        if (customerData) {
            setCustomer(customerData);
            const txData = await api.getTransactionsForCustomer(customerId);
            setTransactions(txData.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
            navigate('/customers');
        }
    }, [api, customerId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleModalSuccess = () => {
        setInternalExchangeModalOpen(false);
        fetchData(); // Refresh data after successful operation
    };


    if (!customer) {
        return <div className="text-center text-slate-400 text-2xl">در حال بارگذاری اطلاعات مشتری...</div>;
    }

    const getBalanceStyle = (balance: number) => {
        if (balance < 0) return 'text-red-400'; // Customer owes us
        if (balance > 0) return 'text-green-400'; // We owe customer
        return 'text-slate-300';
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <button onClick={() => navigate('/customers')} className="text-cyan-300 hover:text-cyan-200 text-lg mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" /></svg>
                بازگشت به لیست مشتریان
            </button>
            
            <div className="flex justify-between items-start mb-10 flex-wrap gap-4">
                <div>
                    <h1 className="text-5xl font-bold text-slate-100 tracking-wider">{customer.name}</h1>
                    <div className="mt-2 text-3xl font-mono text-cyan-300">کد: {customer.code}</div>
                </div>
                 <div className="text-left space-y-2">
                    <h3 className="text-2xl text-slate-400">موجودی حسابات</h3>
                    {CURRENCIES.map(currency => {
                        const balance = customer.balances[currency] || 0;
                        if (balance === 0 && !transactions.some(tx => tx.currency === currency)) return null; 
                        return (
                            <div key={currency} className={`text-3xl font-mono font-bold ${getBalanceStyle(balance)}`}>
                                {new Intl.NumberFormat('fa-IR-u-nu-latn').format(balance)} {currency}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">دفتر حساب مشتری</h2>
                     <div className="flex gap-4">
                         <button 
                            onClick={() => setInternalExchangeModalOpen(true)}
                            className="px-5 py-2 bg-amber-600/50 text-amber-100 hover:bg-amber-500/50 text-lg transition-colors border border-amber-500/50 rounded"
                         >
                            + تبدیل ارز داخلی
                        </button>
                         <button 
                            onClick={() => navigate(`/print/customer-statement/${customerId}`)}
                            className="px-5 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-lg transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded"
                         >
                            چاپ صورتحساب
                        </button>
                     </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">تاریخ</th>
                                <th scope="col" className="px-6 py-4 font-medium">توضیحات</th>
                                <th scope="col" className="px-6 py-4 font-medium">رسیدن (بستانکار)</th>
                                <th scope="col" className="px-6 py-4 font-medium">بردان (بدهکار)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                                    <td className="px-6 py-4">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                                    <td className="px-6 py-4 text-slate-100">{tx.description}</td>
                                    <td className="px-6 py-4 font-mono text-left text-green-400">
                                        {tx.type === 'credit' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                     <td className="px-6 py-4 font-mono text-left text-red-400">
                                        {tx.type === 'debit' ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)} ${tx.currency}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isInternalExchangeModalOpen && user && (
                <InternalExchangeModal
                    isOpen={isInternalExchangeModalOpen}
                    onClose={() => setInternalExchangeModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    currentUser={user}
                    customer={customer}
                />
            )}

        </div>
    );
};

export default CustomerDetailPage;