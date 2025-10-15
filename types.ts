export enum Role {
    Manager = 'Manager',
    Cashier = 'Cashier',
    Domestic_Clerk = 'Domestic_Clerk',
    Foreign_Clerk = 'Foreign_Clerk',
}

export enum Currency {
    USD = 'USD',
    AFN = 'AFN',
    IRR = 'IRR',
}

export enum TransferStatus {
    Pending = 'Pending',
    Executed = 'Executed',
    Paid = 'Paid',
}

export enum ExpenseCategory {
    Salary = 'Salary',
    Rent = 'Rent',
    Utilities = 'Utilities',
    Hospitality = 'Hospitality',
    Other = 'Other',
}

export enum ForeignTransactionType {
    SellBankTomanForForeignCash = 'SellBankTomanForForeignCash', // We get Toman in bank, give customer AFN/USD cash
    BuyBankTomanWithForeignCash = 'BuyBankTomanWithForeignCash',   // Customer gives us AFN/USD cash, we send Toman to their bank
    BuyBankTomanWithTomanCash = 'BuyBankTomanWithTomanCash', // Customer gives us Toman cash, we send Toman to their bank
    SellBankTomanForTomanCash = 'SellBankTomanForTomanCash', // We get Toman in bank, give customer Toman cash
    InternalBankTomanTransfer = 'InternalBankTomanTransfer', // Moving Toman between our own accounts
}


export enum ReportType {
    ProfitAndLoss = 'ProfitAndLoss',
    CashboxSummary = 'CashboxSummary',
}

export enum CashboxRequestStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export enum AmanatStatus {
    Active = 'Active',
    Returned = 'Returned',
}

export interface User {
    id: string;
    name: string;
    role: Role;
}

export interface DomesticTransfer {
    id: string;
    createdAt: Date;
    sender: { name: string; tazkereh: string };
    receiver: { name: string; tazkereh: string };
    amount: number;
    currency: Currency;
    commission: number;
    destinationProvince: string;
    partnerSarraf: string;
    status: TransferStatus;
    createdBy: string;
    history: { status: TransferStatus, timestamp: Date, user: string }[];
}

export interface Expense {
    id: string;
    createdAt: Date;
    category: ExpenseCategory;
    description: string;
    amount: number;
    currency: Currency;
    user: string;
}

export interface PartnerAccount {
    id: string;
    name: string;
    balance: number;
    currency: Currency;
}

export interface PartnerTransaction {
    id: string;
    partnerId: string;
    timestamp: Date;
    type: 'debit' | 'credit'; // debit means we owe them, credit means they owe us
    amount: number;
    currency: Currency;
    description: string;
}

export interface CashboxBalance {
    currency: Currency;
    balance: number;
}

export interface CashboxRequest {
    id: string;
    createdAt: Date;
    requestType: 'deposit' | 'withdrawal';
    amount: number;
    currency: Currency;
    reason: string;
    requestedBy: string;
    status: CashboxRequestStatus;
    resolvedBy?: string;
    resolvedAt?: Date;
}

export interface ForeignTransaction {
    id: string;
    timestamp: Date;
    type: ForeignTransactionType;
    customerName: string;
    tomanAmount: number;
    rate: number;
    description: string;
    user: string;
    
    // New detailed fields
    bankAccountId: string;
    commission: number; // Can be positive (we earned) or negative (we paid)
    commissionCurrency: Currency;
    cashTransactionAmount?: number; // The physical cash amount involved
    cashTransactionCurrency?: Currency; // The currency of the physical cash
    linkedCashboxRequestId?: string; // Link to the cashbox request
}


export interface BankAccount {
    id: string;
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    cardToCardNumber?: string;
    balance: number; // Optional initial balance
    currency: Currency;
}

export interface Amanat {
    id: string;
    createdAt: Date;
    customerName: string;
    amount: number;
    currency: Currency;
    status: AmanatStatus;
    notes: string;
    createdBy: string;
    returnedBy?: string;
    returnedAt?: Date;
    linkedCashboxRequestId?: string; // For the initial deposit
    linkedReturnCashboxRequestId?: string; // For the return withdrawal
}


// --- Dashboard Analytics Types ---

export interface ChartDataItem {
    label: string;
    value: number;
}

export interface ProfitLossDataPoint {
    month: string;
    revenue: number;
    expenses: number;
}

export interface DashboardAnalyticsData {
    expensesByCategory: ChartDataItem[];
    partnerActivity: ChartDataItem[];
    profitLossTrend: ProfitLossDataPoint[];
}


// Payload Types for API
export interface CreateDomesticTransferPayload {
    senderName: string;
    senderTazkereh: string;
    receiverName: string;
    receiverTazkereh: string;
    amount: number;
    currency: Currency;
    commission: number;
    destinationProvince: string;
    partnerSarraf: string;
    user: User;
}

export interface UpdateTransferStatusPayload {
    transferId: string;
    newStatus: TransferStatus;
    user: User;
}

export interface FindTransferByIdPayload {
    transferId: string;
}

export interface PayoutIncomingTransferPayload {
    transferId: string;
    user: User;
}

export interface CreateExpensePayload {
    category: ExpenseCategory;
    description: string;
    amount: number;
    currency: Currency;
    user: User;
}

export interface SettlePartnerBalancePayload {
    partnerId: string;
    amount: number;
    currency: Currency;
    user: User;
}

export interface SettlePartnerBalanceByNamePayload {
    partnerName: string;
    amount: number;
    currency: Currency;
    user: User;
}

export interface GetPartnerAccountByNamePayload {
    partnerName: string;
}


export interface CreateCashboxRequestPayload {
    requestType: 'deposit' | 'withdrawal';
    amount: number;
    currency: Currency;
    reason: string;
    user: User;
}

export interface ResolveCashboxRequestPayload {
    requestId: string;
    resolution: 'approve' | 'reject';
    user: User;
}

export interface AddBankAccountPayload {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    cardToCardNumber?: string;
    initialBalance: number;
    currency: Currency;
}

export interface LogForeignTransactionPayload {
    transactionType: ForeignTransactionType;
    customerName: string;
    tomanAmount: number;
    rate: number;
    description: string;
    user: User;
    
    // New detailed fields
    bankAccountId: string;
    commission: number;
    commissionCurrency: Currency;
    cashTransactionAmount?: number;
    cashTransactionCurrency?: Currency;
}


export interface GenerateReportPayload {
    reportType: ReportType;
    startDate: string;
    endDate: string;
    currency: Currency;
}

export interface CreateAmanatPayload {
    customerName: string;
    amount: number;
    currency: Currency;
    notes: string;
    user: User;
}

export interface ReturnAmanatPayload {
    amanatId: string;
    user: User;
}

export interface ProfitAndLossReportData {
    startDate: string;
    endDate: string;
    currency: Currency;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    revenueItems: { date: Date; description: string; amount: number }[];
    expenseItems: { date: Date; description: string; amount: number }[];
}

export interface CashboxSummaryReportData {
    startDate: string;
    endDate: string;
    currency: Currency;
    totalInflow: number;
    totalOutflow: number;
    netChange: number;
    transactions: {
        id: string;
        timestamp: Date;
        type: 'inflow' | 'outflow';
        amount: number;
        currency: Currency;
        reason: string;
        user: string
    }[];
}