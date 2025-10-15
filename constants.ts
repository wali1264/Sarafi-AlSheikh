import { Role, Currency, User } from './types';

export const ROLES: Role[] = [Role.Manager, Role.Cashier, Role.Domestic_Clerk, Role.Foreign_Clerk];

export const CURRENCIES: Currency[] = [Currency.AFN, Currency.IRR, Currency.USD];

export const MOCK_USERS: User[] = [
    { id: 'user-1', name: 'احمد ولی', role: Role.Manager },
    { id: 'user-2', name: 'فاطمه زهرا', role: Role.Cashier },
    { id: 'user-3', name: 'جواد حسینی', role: Role.Domestic_Clerk },
    { id: 'user-4', name: 'زینب علیزاده', role: Role.Foreign_Clerk },
];

export const MOCK_PARTNERS = [
    { id: 'partner-1', name: 'صرافی هرات', initialBalance: 5000, currency: Currency.USD },
    { id: 'partner-2', name: 'صرافی بلخ', initialBalance: -10000, currency: Currency.AFN },
    { id: 'partner-3', name: 'صرافی قندهار', initialBalance: 0, currency: Currency.USD },
    { id: 'partner-4', name: 'صرافی اعتماد', initialBalance: 2500, currency: Currency.USD },
];