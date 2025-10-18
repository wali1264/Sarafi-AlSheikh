// types.ts

// --- Enums ---

export enum Currency {
    AFN = 'AFN',
    USD = 'USD',
    PKR = 'PKR',
    EUR = 'EUR',
    IRT_BANK = 'IRT_BANK',
    IRT_CASH = 'IRT_CASH',
}

export enum TransferStatus {
    Pending = 'Pending',
    Executed = 'Executed',
    Paid = 'Paid',
    Cancelled = 'Cancelled',
}

export enum CashboxRequestStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
    AutoApproved = 'AutoApproved',
}

export enum ExpenseCategory {
    Salary = 'Salary',
    Rent = 'Rent',
    Utilities = 'Utilities',
    Hospitality = 'Hospitality',
    Commission = 'Commission', // Added for exchange fees
    Other = 'Other',
}

export enum AmanatStatus {
    Active = 'Active',
    Returned = 'Returned',
}

export enum ReportType {
    ProfitAndLoss = 'ProfitAndLoss',
    CashboxSummary = 'CashboxSummary',
    InternalLedger = 'InternalLedger',
}

// --- Permissions ---

export const permissionModules = ['dashboard', 'cashbox', 'domesticTransfers', 'foreignTransfers', 'commissionTransfers', 'accountTransfers', 'customers', 'partnerAccounts', 'expenses', 'reports', 'amanat', 'settings'] as const;
export type PermissionModule = typeof permissionModules[number];
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'process';

export type Permissions = {
    [key in PermissionModule]?: {
        [key in PermissionAction]?: boolean;
    };
};

// --- Core Models ---

export interface Role {
    id: string;
    name: string;
    permissions: Permissions;
}

export interface User {
    id: string;
    name: string;
    username: string;
    password?: string;
    roleId: string;
    role?: Role; // Populated on login
}

export interface Customer {
    id: string;
    name: string;
    code: string;
    whatsappNumber: string;
    balances: { [key in Currency]?: number };
}

export interface PartnerAccount {
    id: string;
    name: string;
    balances: { [key in Currency]?: number };
    status: 'Active' | 'Inactive';
    province: string;
    whatsappNumber: string;
}

export interface BankAccount {
    id: string;
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    cardToCardNumber?: string;
    balance: number;
    currency: Currency;
    status: 'Active' | 'Inactive';
}

export interface SystemSettings {
    approvalThresholds: {
        [key in Currency]?: number;
    };
}

// --- Transactional Models ---

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
    customerId?: string; // if paid from customer account
    history: { status: TransferStatus, timestamp: Date, user: string }[];
    partnerReference?: string;
}

export interface PartnerTransaction {
    id: string;
    partnerId: string;
    timestamp: Date;
    type: 'credit' | 'debit';
    amount: number;
    currency: Currency;
    description: string;
    linkedTransferId?: string;
}

export interface CustomerTransaction {
    id: string;
    customerId: string;
    timestamp: Date;
    type: 'credit' | 'debit';
    amount: number;
    currency: Currency;
    description: string;
    linkedEntityId: string;
    linkedEntityType: 'DomesticTransfer' | 'CashDeposit' | 'CashWithdrawal' | 'AccountTransfer' | 'ForeignTransaction' | 'InternalExchange' | 'CommissionTransfer';
}

export interface AccountTransfer {
    id: string;
    timestamp: Date;
    fromCustomerId: string;
    toCustomerId: string;
    amount: number;
    currency: Currency;
    description: string;
    user: string;
    status: 'Completed' | 'PendingAssignment';
    debitTransactionId: string;
    creditTransactionId: string;
}

export interface ForeignTransaction {
    id: string;
    timestamp: Date;
    description: string;
    fromAsset: string; // e.g., "صندوق دالر" or "بانک ملت"
    fromCurrency: Currency;
    fromAmount: number; // Actual amount that left our asset
    toAsset: string; // e.g., "صندوق افغانی" or "بانک صادرات"
    toCurrency: Currency;
    toAmount: number; // Actual amount that entered our asset
    user: string;
    // Link to other ledgers for full traceability
    linkedCustomerTransactionId?: string;
    linkedExpenseId?: string;
}

export interface CommissionTransfer {
    id: string;
    createdAt: Date;
    customerId: string;
    amount: number;
    currency: Currency;
    receivedIntoBankAccountId: string;
    commission: number; // Agreed upon commission
    status: 'Pending' | 'Completed';
    createdBy: string;
    
    // Details of the payout
    completedAt?: Date;
    paidFromBankAccountId?: string;
    destinationAccountNumber?: string;
    finalAmountPaid?: number;

    // Link to other ledgers
    linkedCustomerCreditTransactionId: string;
    linkedCustomerDebitTransactionId?: string;
}


export interface Expense {
    id: string;
    createdAt: Date;
    category: ExpenseCategory;
    amount: number;
    currency: Currency;
    description: string;
    user: string;
    linkedCashboxRequestId?: string; // Optional for direct expenses
    linkedForeignTransactionId?: string; // Link to the exchange transaction
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
    reviewed: boolean;
    reviewedBy?: string;
    reviewedAt?: Date;
    customerCode?: string; // If linked to a customer for direct deposit/withdrawal
    linkedEntity?: {
        type: 'DomesticTransfer' | 'Expense' | 'Amanat' | 'ForeignTransaction' | 'Manual';
        id: string;
        description: string;
    };
}

export interface Amanat {
    id: string;
    createdAt: Date;
    customerName: string;
    amount: number;
    currency: Currency;
    notes: string;
    status: AmanatStatus;
    createdBy: string;
    returnedAt?: Date;
    returnedBy?: string;
    linkedCashboxDepositId: string;
    linkedCashboxWithdrawalId?: string;
}

// --- Other Models ---

export interface CashboxBalance {
    currency: Currency;
    balance: number;
}

export interface ActivityLog {
    id: string;
    timestamp: Date;
    user: string;
    action: string;
}

export interface Asset {
    id: string; // e.g., 'cashbox_USD' or 'bank_ba-1'
    name: string; // e.g., "صندوق دالر" or "بانک ملت"
    currency: Currency;
}


// --- API Payloads ---

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
    isCashPayment: boolean;
    customerCode?: string;
    partnerReference?: string;
    user: User;
}

export interface UpdateTransferStatusPayload {
    transferId: string;
    newStatus: TransferStatus;
    user: User;
}

export interface CreateCashboxRequestPayload {
    requestType: 'deposit' | 'withdrawal';
    amount: number;
    currency: Currency;
    reason: string;
    user: User;
    customerCode?: string;
    linkedEntity?: CashboxRequest['linkedEntity'];
}

export interface ResolveCashboxRequestPayload {
    requestId: string;
    resolution: 'approve' | 'reject';
    user: User;
}

export interface CreateExpensePayload {
    category: ExpenseCategory;
    amount: number;
    currency: Currency;
    description: string;
    user: User;
    // Optional fields for direct expense creation without cashbox
    skipCashboxRequest?: boolean;
    linkedForeignTransactionId?: string;
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

export interface CreateUserPayload {
    name: string;
    username: string;
    password?: string;
    roleId: string;
}

export interface UpdateUserPayload extends CreateUserPayload {
    id: string;
}
export interface DeleteUserPayload {
    id: string;
}

export interface CreateRolePayload {
    name: string;
    permissions: Permissions;
}

export interface UpdateRolePayload extends CreateRolePayload {
    id: string;
}

export interface CreateCustomerPayload {
    name: string;
    code: string;
    whatsappNumber: string;
    balances: { [key in Currency]?: number };
}
export interface UpdateCustomerPayload extends Omit<CreateCustomerPayload, 'balances'> {
    id: string;
    user: User;
}
export interface CreatePartnerPayload {
    name: string;
    balances: { [key in Currency]?: number };
    province: string;
    whatsappNumber: string;
    user: User;
}
export interface UpdatePartnerPayload {
    id: string;
    name: string;
    province: string;
    whatsappNumber: string;
    user: User;
}
export interface DeletePartnerPayload {
    id: string;
    user: User;
}
export interface AddBankAccountPayload {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    cardToCardNumber?: string;
    initialBalance: number;
    currency: Currency;
    user: User;
}
export interface UpdateBankAccountPayload {
    id: string;
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    cardToCardNumber?: string;
    user: User;
}
export interface DeleteBankAccountPayload {
    id: string;
    user: User;
}

export interface LogForeignTransactionPayload {
    description: string;
    user: User;

    // This describes the physical/internal money movement
    fromAssetId: string;
    fromAmount: number; // The actual amount that left our asset
    toAssetId: string;
    toAmount: number; // The actual amount that entered our asset

    // This describes the customer-facing side of the transaction (optional)
    customerCode?: string;
    customerAmount?: number; // The amount on the customer's book
    customerTransactionType?: 'debit' | 'credit';
}

export interface LogCommissionTransferPayload {
    customerCode: string;
    amount: number;
    currency: Currency;
    receivedIntoBankAccountId: string;
    commission: number;
    user: User;
}

export interface ExecuteCommissionTransferPayload {
    transferId: string;
    paidFromBankAccountId: string;
    destinationAccountNumber: string;
    user: User;
}

export interface InternalCustomerExchangePayload {
    customerId: string;
    fromCurrency: Currency;
    fromAmount: number;
    toCurrency: Currency;
    toAmount: number;
    rate: number;
    user: User;
}


export interface FindTransfersByQueryPayload {
    query: string;
}

export interface PayoutIncomingTransferPayload {
    transferId: string;
    user: User;
}
export interface SettlePartnerBalancePayload {
    partnerId: string;
    amount: number;
    currency: Currency;
    user: User;
}
export interface GetPartnerAccountByNamePayload {
    partnerName: string;
}
export interface SettlePartnerBalanceByNamePayload {
    partnerName: string;
    amount: number;
    currency: Currency;
    user: User;
}
export interface CreateAccountTransferPayload {
    fromCustomerCode: string;
    toCustomerCode: string;
    amount: number;
    currency: Currency;
    description: string;
    user: User;
    isPendingAssignment: boolean;
}
export interface ReassignTransferPayload {
    transferId: string;
    finalCustomerCode: string;
    user: User;
}

export interface UpdateSystemSettingsPayload {
    settings: SystemSettings;
}

// --- Analytics & Reports ---

export interface DashboardAnalyticsData {
    expensesByCategory: { label: string, value: number }[];
    partnerActivity: { label: string, value: number }[];
    profitLossTrend: { month: string, revenue: number, expenses: number }[];
}

export interface ProfitAndLossReportData {
    currency: Currency;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    revenueItems: { description: string, amount: number, date: Date }[];
    expenseItems: { description: string, amount: number, date: Date }[];
}
export interface CashboxSummaryReportData {
    currency: Currency;
    totalInflow: number;
    totalOutflow: number;
    netChange: number;
    transactions: { id: string, timestamp: Date, type: 'inflow' | 'outflow', amount: number, reason: string, user: string }[];
}

export interface InternalLedgerReportData {
    transactions: ForeignTransaction[];
}


export interface GenerateReportPayload {
    reportType: ReportType;
    startDate: string;
    endDate: string;
    currency: Currency;
}