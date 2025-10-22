export enum Currency {
    AFN = 'AFN',
    USD = 'USD',
    PKR = 'PKR',
    EUR = 'EUR',
    IRT_BANK = 'IRT_BANK',
    IRT_CASH = 'IRT_CASH',
}

export const permissionModules = [
    'dashboard', 'cashbox', 'domesticTransfers', 'foreignTransfers', 'commissionTransfers',
    'accountTransfers', 'customers', 'partnerAccounts', 'expenses', 'reports', 'settings', 'amanat'
] as const;
export type PermissionModule = typeof permissionModules[number];

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'process';

export type Permissions = {
    [key in PermissionModule]?: {
        [key in PermissionAction]?: boolean;
    };
};

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
    role?: Role;
}

export interface ExternalLogin {
    username: string;
    password?: string; // Optional on return
    loginType: 'customer' | 'partner';
    linkedEntityId: string;
    id: string; // To uniquely identify and delete logins
}

export type AuthenticatedUser = (User & { userType: 'internal'; role: Role }) | 
                               (ExternalLogin & { userType: 'customer'; entity: Customer }) | 
                               (ExternalLogin & { userType: 'partner'; entity: PartnerAccount });


export interface CreateExternalLoginPayload {
    username: string;
    password?: string;
    loginType: 'customer' | 'partner';
    linkedEntityId: string;
    user: User;
}
export interface DeleteExternalLoginPayload {
    id: string;
    user: User;
}


export interface CreateUserPayload {
    name: string;
    username: string;
    password?: string;
    roleId: string;
}
export interface UpdateUserPayload extends Partial<CreateUserPayload> {
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

export interface Customer {
    id: string;
    name: string;
    code: string;
    whatsappNumber: string;
    balances: { [key in Currency]?: number };
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

export interface CreateCustomerPayload {
    name: string;
    code: string;
    whatsappNumber: string;
    user: User;
}
export interface UpdateCustomerPayload extends Partial<Omit<Customer, 'id' | 'balances'>> {
    id: string;
    user: User;
}

export interface PartnerAccount {
    id: string;
    name: string;
    province: string;
    whatsappNumber: string;
    balances: { [key in Currency]?: number };
    status: 'Active' | 'Inactive';
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
    bankAccountId?: string;
    sourceAccountNumber?: string;
    destinationAccountNumber?: string;
}

export interface CreatePartnerPayload {
    name: string;
    province: string;
    whatsappNumber: string;
    user: User;
}
export interface UpdatePartnerPayload extends Partial<Omit<CreatePartnerPayload, 'user'>> {
    id: string;
    user: User;
}
export interface DeletePartnerPayload {
    id: string;
    user: User;
}

export interface ReceiveFromPartnerPayload {
    partnerId: string;
    amount: number;
    currency: Currency;
    user: User;
    bankAccountId?: string;
    sourceAccountNumber?: string;
    destinationAccountNumber?: string;
}
export interface PayToPartnerPayload {
    partnerId: string;
    amount: number;
    currency: Currency;
    user: User;
    bankAccountId?: string;
    sourceAccountNumber?: string;
    destinationAccountNumber?: string;
}

export interface GetPartnerAccountByNamePayload {
    partnerName: string;
}


export enum TransferStatus {
    Unexecuted = 'Unexecuted',
    PendingCashbox = 'PendingCashbox',
    Executed = 'Executed',
    Cancelled = 'Cancelled',
    RejectedByCashbox = 'RejectedByCashbox',
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
    partnerReference?: string;
    status: TransferStatus;
    createdBy: string;
    history: { status: TransferStatus; timestamp: Date; user: string }[];
    customerId?: string;
}

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
    partnerReference?: string;
    isCashPayment: boolean;
    customerCode?: string;
    user: User;
}
export interface UpdateTransferStatusPayload {
    transferId: string;
    newStatus: TransferStatus;
    user: User;
}
export interface FindTransfersByQueryPayload {
    query: string;
}
export interface PayoutIncomingTransferPayload {
    transferId: string;
    user: User;
}

export enum CashboxRequestStatus {
    Pending = 'Pending',
    PendingCashboxApproval = 'PendingCashboxApproval',
    Approved = 'Approved',
    Rejected = 'Rejected',
    AutoApproved = 'AutoApproved',
}

export interface CashboxBalance {
    currency: Currency;
    balance: number;
}

export interface CashboxRequest {
    id: string;
    createdAt: Date;
    requestedBy: string;
    status: CashboxRequestStatus;
    reviewed: boolean;
    requestType: 'withdrawal' | 'deposit';
    amount: number;
    currency: Currency;
    reason: string;
    customerCode?: string;
    resolvedBy?: string;
    resolvedAt?: Date;
    reviewedAt?: Date;
    linkedEntity?: {
        type: string;
        id: string;
        description: string;
        // FIX: Added optional 'details' property to support linked entities like PartnerSettlement that carry extra data.
        details?: any;
    };
    bankAccountId?: string;
    sourceAccountNumber?: string;
    destinationAccountNumber?: string;
}

export interface CreateCashboxRequestPayload {
    requestType: 'withdrawal' | 'deposit';
    amount: number;
    currency: Currency;
    reason: string;
    user: User;
    customerCode?: string;
    linkedEntity?: {
        type: string;
        id: string;
        description: string;
        details?: any;
    };
    bankAccountId?: string;
    sourceAccountNumber?: string;
    destinationAccountNumber?: string;
    bypassCashier?: boolean;
}
export interface ResolveCashboxRequestPayload {
    requestId: string;
    resolution: 'approve' | 'reject';
    user: User;
}
export interface IncreaseCashboxBalancePayload {
    amount: number;
    currency: Currency;
    description: string;
    user: User;
    bankAccountId?: string;
    sourceAccountNumber?: string;
}

export enum ExpenseCategory {
    Salary = 'Salary',
    Rent = 'Rent',
    Utilities = 'Utilities',
    Hospitality = 'Hospitality',
    Other = 'Other',
}

export enum ExpenseStatus {
    PendingApproval = 'PendingApproval',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

export interface Expense {
    id: string;
    createdAt: Date;
    user: string;
    category: ExpenseCategory;
    amount: number;
    currency: Currency;
    description: string;
    status: ExpenseStatus;
    linkedCashboxRequestId?: string;
    linkedForeignTransactionId?: string;
}

export interface CreateExpensePayload {
    category: ExpenseCategory;
    amount: number;
    currency: Currency;
    description: string;
    user: User;
    skipCashboxRequest?: boolean;
    linkedForeignTransactionId?: string;
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

export interface AddBankAccountPayload {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    cardToCardNumber?: string;
    currency: Currency;
    user: User;
}
export interface UpdateBankAccountPayload extends Partial<Omit<AddBankAccountPayload, 'currency'|'user'>> {
    id: string;
    user: User;
}
export interface DeleteBankAccountPayload {
    id: string;
    user: User;
}

export interface Asset {
    id: string;
    name: string;
    currency: Currency;
}

export enum ForeignTransactionStatus {
    PendingWithdrawalApproval = 'PendingWithdrawalApproval',
    PendingDeposit = 'PendingDeposit',
    PendingDepositApproval = 'PendingDepositApproval',
    Completed = 'Completed',
    Rejected = 'Rejected',
}

export interface ForeignTransaction {
    id: string;
    timestamp: Date;
    description: string;
    user: string;
    status: ForeignTransactionStatus;

    // Phase 1: Withdrawal
    fromAssetId: string;
    fromAssetName: string;
    fromCurrency: Currency;
    fromAmount: number;
    withdrawalRequestId: string;

    // Phase 2: Deposit (optional until completion)
    toAssetId?: string;
    toAssetName?: string;
    toCurrency?: Currency;
    toAmount?: number;
    depositRequestId?: string;
}


export interface InitiateForeignExchangePayload {
    user: User;
    description: string;
    fromAssetId: string;
    fromAmount: number;
}

export interface CompleteForeignExchangePayload {
    user: User;
    transactionId: string;
    toAssetId: string;
    toAmount: number;
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

export interface InternalExchange {
    id: string;
    timestamp: Date;
    customerId: string;
    fromCurrency: Currency;
    fromAmount: number;
    toCurrency: Currency;
    toAmount: number;
    rate: number;
    user: string;
}

export enum CommissionTransferStatus {
    PendingDepositApproval = 'PendingDepositApproval',
    PendingExecution = 'PendingExecution',
    PendingWithdrawalApproval = 'PendingWithdrawalApproval',
    Completed = 'Completed',
    Rejected = 'Rejected',
}

export interface CommissionTransfer {
    id: string;
    createdAt: Date;
    initiatorType: 'Customer' | 'Partner';
    initiatorId: string; // customer.id or partner.id
    amount: number; // The initial amount received
    currency: Currency; // will be fixed to IRT_BANK
    sourceAccountNumber: string; // The customer's bank account number
    receivedIntoBankAccountId: string;
    commissionPercentage: number;
    status: CommissionTransferStatus;
    createdBy: string;
    
    // Fields populated on execution
    completedAt?: Date;
    paidFromBankAccountId?: string;
    destinationAccountNumber?: string;
    commissionAmount?: number; // Calculated commission value
    finalAmountPaid?: number; // amount - commissionAmount
    
    // Link to cashbox requests
    depositRequestId?: string;
    withdrawalRequestId?: string;
}

export interface LogCommissionTransferPayload {
    user: User;
    initiatorType: 'Customer' | 'Partner';
    customerCode?: string;
    partnerId?: string;
    amount: number;
    sourceAccountNumber: string;
    receivedIntoBankAccountId: string;
    commissionPercentage: number;
}

export interface ExecuteCommissionTransferPayload {
    user: User;
    transferId: string;
    paidFromBankAccountId: string;
    destinationAccountNumber: string;
}

export interface SystemSettings {
    approvalThresholds: {
        [key in Currency]?: number;
    };
}
export interface UpdateSystemSettingsPayload {
    settings: SystemSettings;
}

export interface ActivityLog {
    id: string;
    timestamp: Date;
    user: string;
    action: string;
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
    status: 'PendingAssignment' | 'Completed';
    debitTransactionId: string;
    creditTransactionId: string;
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

export enum ReportType {
    ProfitAndLoss = 'ProfitAndLoss',
    CashboxSummary = 'CashboxSummary',
    InternalLedger = 'InternalLedger',
}

export interface DashboardAnalyticsData {
    partnerActivity: { label: string; value: number }[];
    weeklyActivity: {
        labels: string[];
        domesticCounts: number[];
        foreignCounts: number[];
    };
    cashboxSummary: { currency: string; balance: number }[];
}


export interface ProfitAndLossReportData {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    currency: Currency;
    revenueItems: { date: Date; description: string; amount: number }[];
    expenseItems: { date: Date; description: string; amount: number }[];
}

export interface CashboxSummaryReportData {
    totalInflow: number;
    totalOutflow: number;
    netChange: number;
    currency: Currency;
    transactions: {
        id: string;
        timestamp: Date;
        type: 'inflow' | 'outflow';
        amount: number;
        currency: Currency;
        reason: string;
        user: string;
    }[];
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

export enum AmanatStatus {
    Active = 'Active',
    Returned = 'Returned',
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
    linkedCashboxDepositId: string;
    returnedAt?: Date;
    returnedBy?: string;
    linkedCashboxWithdrawalId?: string;
    bankAccountId?: string; // To track which bank account received the amanat
}

export interface CreateAmanatPayload {
    customerName: string;
    amount: number;
    currency: Currency;
    notes: string;
    user: User;
    bankAccountId?: string; // To specify deposit account for IRT_BANK
}

export interface ReturnAmanatPayload {
    amanatId: string;
    user: User;
}