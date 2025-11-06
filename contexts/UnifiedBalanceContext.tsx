
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useRentedAccounts } from './RentedAccountContext';
import { Customer, PartnerAccount, Currency } from '../types';

interface UnifiedBalanceContextType {
    unifiedCustomers: Customer[];
    getUnifiedCustomerById: (id: string) => Customer | undefined;
}

const UnifiedBalanceContext = createContext<UnifiedBalanceContextType | undefined>(undefined);

export const UnifiedBalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { users: rentedUsers, customers: baseCustomers, isLoading } = useRentedAccounts();
    
    const unifiedCustomers = useMemo(() => {
        if (isLoading || !baseCustomers || !rentedUsers) {
            return baseCustomers || []; // Return base customers while loading to prevent UI flicker
        }

        return baseCustomers.map(customer => {
            const rentedUser = rentedUsers.find(u => u.type === 'Customer' && u.entityId === customer.id);
            
            if (rentedUser && rentedUser.balance !== 0) {
                const newBalances = { ...customer.balances };
                const currentBankBalance = newBalances[Currency.IRT_BANK] || 0;
                newBalances[Currency.IRT_BANK] = currentBankBalance + rentedUser.balance;
                return { ...customer, balances: newBalances };
            }
            return customer;
        });

    }, [baseCustomers, rentedUsers, isLoading]);

    const getUnifiedCustomerById = (id: string) => {
        return unifiedCustomers.find(c => c.id === id);
    };
    
    const value = {
        unifiedCustomers,
        getUnifiedCustomerById,
    };

    return (
        <UnifiedBalanceContext.Provider value={value}>
            {children}
        </UnifiedBalanceContext.Provider>
    );
};

export const useUnifiedBalance = (): UnifiedBalanceContextType => {
    const context = useContext(UnifiedBalanceContext);
    if (context === undefined) {
        throw new Error('useUnifiedBalance must be used within a UnifiedBalanceProvider');
    }
    return context;
};
      