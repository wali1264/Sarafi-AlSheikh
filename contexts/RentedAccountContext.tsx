import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { RentedAccount, RentedAccountTransaction, RentedAccountUser, Currency, Customer, PartnerAccount } from '../types';
import { useAuth } from './AuthContext';
import { useApi } from '../hooks/useApi';

// --- MOCK DATA (will be kept for development until replaced by DB) ---
const now = new Date();
const mockAccountsData: RentedAccount[] = [
    { id: 'rented_acc_1', partner_name: 'محمود احمدی', bank_name: 'ملت', account_holder: 'صرافی الشیخ', account_number: '1111-1111', balance: 0, currency: Currency.IRT_BANK, created_at: now, status: 'Active' },
    { id: 'rented_acc_2', partner_name: 'حسین رضایی', bank_name: 'صادرات', account_holder: 'صرافی الشیخ', account_number: '2222-2222', balance: 0, currency: Currency.IRT_BANK, created_at: now, status: 'Active' },
    { id: 'rented_acc_3', partner_name: 'علی کریمی', bank_name: 'تجارت', account_holder: 'صرافی الشیخ', account_number: '3333-3333', balance: 0, currency: Currency.IRT_BANK, created_at: now, status: 'Inactive' },
];

const mockTransactionsData: RentedAccountTransaction[] = [
    // Mock transactions link to real customer/partner IDs if possible, or use placeholders
    // This mock customer ID is a real one from the other mock data, making the link possible.
    { id: 'tx_rent_1', rented_account_id: 'rented_acc_1', user_id: 'c915b1e6-343d-4a37-b08e-e2b855a5b51a', user_type: 'Customer', type: 'deposit', amount: 1000000, commission_percentage: 0, commission_amount: 0, total_transaction_amount: 1000000, timestamp: new Date(now.getTime() - 1000 * 60 * 120), created_by: 'مدیر کل', receipt_serial: 'ABC-123', source_bank_name: 'ملی', source_card_last_digits: '1111' },
    // This mock partner ID should exist in the partner's mock data. Let's use a placeholder.
    { id: 'tx_rent_2', rented_account_id: 'rented_acc_2', user_id: 'partner-uuid-placeholder-1', user_type: 'Partner', type: 'deposit', amount: 5000000, commission_percentage: 0, commission_amount: 0, total_transaction_amount: 5000000, timestamp: new Date(now.getTime() - 1000 * 60 * 90), created_by: 'مدیر کل', receipt_serial: 'DEF-456', source_bank_name: 'تجارت', source_card_last_digits: '2222' },
    { id: 'tx_rent_3', rented_account_id: 'rented_acc_1', user_id: 'c915b1e6-343d-4a37-b08e-e2b855a5b51a', user_type: 'Customer', type: 'withdrawal', amount: 200000, commission_percentage: 2, commission_amount: 4000, total_transaction_amount: 204000, timestamp: new Date(now.getTime() - 1000 * 60 * 30), created_by: 'ادمین سیستم', destination_bank_name: 'پاسارگاد', destination_account: '3333-3333' },
];


// --- CONTEXT INTERFACE ---
interface RentedAccountContextType {
    accounts: RentedAccount[];
    transactions: RentedAccountTransaction[];
    users: RentedAccountUser[];
    addAccount: (details: Omit<RentedAccount, 'id' | 'balance' | 'created_at' | 'currency'>) => void;
    addTransaction: (details: Omit<RentedAccountTransaction, 'id' | 'created_by'>) => void;
    toggleAccountStatus: (accountId: string) => void;
    customers: Customer[];
    partners: PartnerAccount[];
}

const RentedAccountContext = createContext<RentedAccountContextType | undefined>(undefined);

export const RentedAccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const api = useApi();
    
    // State for mock data (can be replaced by API calls later)
    const [accounts, setAccounts] = useState<RentedAccount[]>(mockAccountsData);
    const [transactions, setTransactions] = useState<RentedAccountTransaction[]>(mockTransactionsData);
    
    // State for real data fetched from API
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [partners, setPartners] = useState<PartnerAccount[]>([]);

    useEffect(() => {
        api.getCustomers().then(setCustomers);
        api.getPartnerAccounts().then(setPartners);
    }, [api]);

    const addAccount = useCallback((details: Omit<RentedAccount, 'id' | 'balance' | 'created_at' | 'currency'>) => {
        const newAccount: RentedAccount = {
            ...details,
            id: `rented_acc_${Date.now()}`,
            balance: 0,
            currency: Currency.IRT_BANK,
            created_at: new Date(),
        };
        setAccounts(prev => [...prev, newAccount]);
    }, []);
    
    const toggleAccountStatus = useCallback((accountId: string) => {
        setAccounts(prev => prev.map(acc => 
            acc.id === accountId 
                ? { ...acc, status: acc.status === 'Active' ? 'Inactive' : 'Active' } 
                : acc
        ));
    }, []);

    const addTransaction = useCallback((details: Omit<RentedAccountTransaction, 'id' | 'created_by'>) => {
        if (!user || user.userType !== 'internal') return;
        const newTransaction: RentedAccountTransaction = {
            ...details,
            id: `tx_rent_${Date.now()}`,
            created_by: user.name,
        };
        setTransactions(prev => [newTransaction, ...prev]);
    }, [user]);

    const processedData = useMemo(() => {
        // --- 1. Create a combined map of all possible users (customers and partners) ---
        const allUsersMap = new Map<string, { name: string; type: 'Customer' | 'Partner' }>();
        customers.forEach(c => allUsersMap.set(`customer-${c.id}`, { name: c.name, type: 'Customer' }));
        partners.forEach(p => allUsersMap.set(`partner-${p.id}`, { name: p.name, type: 'Partner' }));

        // --- 2. Calculate user balances and last activity from transactions ---
        const userAggregates = new Map<string, { balance: number; lastActivity: Date; entityId: string }>();
        
        // Sort oldest to newest to calculate running balance correctly
        const sortedTransactions = [...transactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        sortedTransactions.forEach(tx => {
            const userIdentifier = `${tx.user_type.toLowerCase()}-${tx.user_id}`;
            const currentUserData = userAggregates.get(userIdentifier) || { balance: 0, lastActivity: new Date(0), entityId: tx.user_id };
            
            const amountChange = tx.type === 'deposit' ? tx.amount : -tx.total_transaction_amount;
            currentUserData.balance += amountChange;
            currentUserData.lastActivity = new Date(tx.timestamp); // Keep updating to get the latest
            
            userAggregates.set(userIdentifier, currentUserData);
        });
        
        // --- 3. Create the final RentedAccountUser[] array ---
        const finalUsers: RentedAccountUser[] = Array.from(userAggregates.entries()).map(([id, data]) => {
            const userInfo = allUsersMap.get(id);
            return {
                id,
                name: userInfo?.name || 'کاربر حذف شده',
                type: userInfo?.type || 'Customer',
                balance: data.balance,
                lastActivity: data.lastActivity,
                entityId: data.entityId,
            };
        });

        // --- 4. Calculate final account balances ---
        const accountBalances = new Map<string, number>();
        sortedTransactions.forEach(tx => {
            const currentBalance = accountBalances.get(tx.rented_account_id) || 0;
            const amountChange = tx.type === 'deposit' ? tx.amount : -tx.total_transaction_amount;
            accountBalances.set(tx.rented_account_id, currentBalance + amountChange);
        });

        const finalAccounts = accounts.map(acc => ({
            ...acc,
            balance: accountBalances.get(acc.id) || 0,
        }));

        return { finalAccounts, finalUsers };

    }, [accounts, transactions, customers, partners]);
    
    const value = useMemo(() => ({
        accounts: processedData.finalAccounts, 
        transactions, 
        users: processedData.finalUsers, 
        addAccount, 
        addTransaction,
        toggleAccountStatus,
        customers,
        partners
    }), [processedData, transactions, addAccount, addTransaction, toggleAccountStatus, customers, partners]);

    return (
        <RentedAccountContext.Provider value={value}>
            {children}
        </RentedAccountContext.Provider>
    );
};

export const useRentedAccounts = (): RentedAccountContextType => {
    const context = useContext(RentedAccountContext);
    if (context === undefined) {
        throw new Error('useRentedAccounts must be used within a RentedAccountProvider');
    }
    return context;
};
