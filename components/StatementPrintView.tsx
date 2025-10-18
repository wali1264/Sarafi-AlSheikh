import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { Customer, PartnerAccount, CustomerTransaction, PartnerTransaction, Currency } from '../types';

interface StatementPrintViewProps {
    type: 'customer' | 'partner';
}

type Transaction = (CustomerTransaction | PartnerTransaction) & { balanceAfter: number };

const StatementPrintView: React.FC<StatementPrintViewProps> = ({ type }) => {
    const { customerId, partnerId } = useParams();
    const api = useApi();
    const [entity, setEntity] = useState<Customer | PartnerAccount | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            setIsLoading(true);
            const id = type === 'customer' ? customerId : partnerId;
            if (!id) {
                setIsLoading(false);
                return;
            }

            try {
                if (type === 'customer') {
                    const customerData = await api.getCustomerById(id);
                    if (!customerData) throw new Error("Customer not found");
                    setEntity(customerData);
                    
                    const txData = await api.getTransactionsForCustomer(id);
                    
                    // We can only reliably calculate balance for a single currency ledger.
                    // This assumes customer statements are per-currency, which is a simplification.
                    // A more complex implementation would handle multi-currency balances.
                    let runningBalance = 0;
                    const processedTxs: Transaction[] = txData.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(tx => {
                        runningBalance += (tx.type === 'credit' ? tx.amount : -tx.amount);
                        return { ...tx, balanceAfter: runningBalance };
                    });
                    setTransactions(processedTxs.reverse());


                } else {
                    const partnerData = await api.getPartnerAccountById(id);
                    if (!partnerData) throw new Error("Partner not found");
                    setEntity(partnerData);
                    
                    const txData = await api.getTransactionsForPartner(id);
                    
                    let runningBalance = 0;
                    const processedTxs: Transaction[] = txData.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(tx => {
                        // For partners, 'debit' means we owe them (negative balance), 'credit' means they owe us (positive)
                        runningBalance += (tx.type === 'credit' ? tx.amount : -tx.amount);
                        return { ...tx, balanceAfter: runningBalance };
                    });
                    setTransactions(processedTxs.reverse());
                }
            } catch (error) {
                console.error("Error fetching statement data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [customerId, partnerId, type, api]);

    useEffect(() => {
        if (!isLoading && entity) {
            setTimeout(() => window.print(), 1000);
        }
    }, [isLoading, entity]);

    if (isLoading) return <div className="text-center p-10">در حال آماده سازی صورتحساب...</div>;
    if (!entity) return <div className="text-center p-10">اطلاعات مورد نظر یافت نشد.</div>;

    const isCustomer = (e: Customer | PartnerAccount): e is Customer => 'code' in e;
    // FIX: Object.values() can return `unknown[]`, causing a type error. Explicitly cast `balance` to a Number before adding it to the sum.
    const finalBalance = Object.values(entity.balances).reduce((sum, balance) => sum + (Number(balance) || 0), 0);

    const finalCurrency = isCustomer(entity)
        ? (Object.keys(entity.balances)[0] as Currency || '')
        : (Object.keys(entity.balances)[0] as Currency || '');


    return (
        <div id="printable-area" className="bg-white text-black p-8 max-w-4xl mx-auto font-sans" style={{ direction: 'rtl' }}>
            <header className="flex justify-between items-center pb-4 border-b-2 border-black mb-6">
                <div>
                    <h1 className="text-3xl font-bold">SarrafAI</h1>
                    <p className="text-lg">صورتحساب {type === 'customer' ? 'مشتری' : 'همکار'}</p>
                </div>
                <div className="text-left">
                    <p><strong>نام:</strong> {entity.name}</p>
                    {isCustomer(entity) && <p><strong>کد:</strong> {entity.code}</p>}
                    <p><strong>تاریخ گزارش:</strong> {new Date().toLocaleDateString('fa-IR')}</p>
                </div>
            </header>

            <main>
                <table className="w-full text-base text-right border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="p-2 font-bold">تاریخ</th>
                            <th className="p-2 font-bold">شرح</th>
                            <th className="p-2 font-bold text-left">رسید / بستانکار</th>
                            <th className="p-2 font-bold text-left">برد / بدهکار</th>
                            <th className="p-2 font-bold text-left">موجودی نهایی</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx.id} className="border-b border-gray-300">
                                <td className="p-2">{new Date(tx.timestamp).toLocaleString('fa-IR')}</td>
                                <td className="p-2">{tx.description}</td>
                                <td className="p-2 text-left font-mono text-green-700">
                                    {tx.type === 'credit' ? new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount) : '-'}
                                </td>
                                <td className="p-2 text-left font-mono text-red-700">
                                    {tx.type === 'debit' ? new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount) : '-'}
                                </td>
                                {/* FIX: Operator '>=' cannot be applied to types 'unknown' and 'number'. Explicitly cast tx.balanceAfter to a Number for comparison. */}
                                <td className={`p-2 text-left font-mono font-bold ${Number(tx.balanceAfter) >= 0 ? 'text-black' : 'text-red-700'}`}>
                                    {/* FIX: Argument of type 'unknown' is not assignable to parameter of type 'number'. Explicitly cast tx.balanceAfter to a Number. */}
                                    {new Intl.NumberFormat('fa-IR-u-nu-latn').format(Number(tx.balanceAfter))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            
             <footer className="mt-8 pt-4 border-t-2 border-black text-left">
                <p className="text-lg">
                    <span className="font-bold">موجودی نهایی کل ({finalCurrency}): </span>
                    <span className={`font-bold text-xl font-mono ${finalBalance >= 0 ? 'text-black' : 'text-red-700'}`}>
                        {new Intl.NumberFormat('fa-IR-u-nu-latn').format(finalBalance)}
                    </span>
                </p>
            </footer>
        </div>
    );
};

export default StatementPrintView;
