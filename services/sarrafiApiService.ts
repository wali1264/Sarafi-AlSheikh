
import {
    User,
    Role,
    Currency,
    TransferStatus,
    DomesticTransfer,
    ExpenseCategory,
    Expense,
    PartnerAccount,
    PartnerTransaction,
    CashboxBalance,
    CashboxRequest,
    CashboxRequestStatus,
    ForeignTransaction,
    ForeignTransactionType,
    BankAccount,
    ReportType,
    ProfitAndLossReportData,
    CashboxSummaryReportData,
    Amanat,
    AmanatStatus,
    DashboardAnalyticsData,
    CreateDomesticTransferPayload,
    UpdateTransferStatusPayload,
    FindTransferByIdPayload,
    PayoutIncomingTransferPayload,
    CreateExpensePayload,
    SettlePartnerBalancePayload,
    CreateCashboxRequestPayload,
    ResolveCashboxRequestPayload,
    AddBankAccountPayload,
    LogForeignTransactionPayload,
    GenerateReportPayload,
    GetPartnerAccountByNamePayload,
    SettlePartnerBalanceByNamePayload,
    CreateAmanatPayload,
    ReturnAmanatPayload,
    CreateUserPayload,
    DeleteUserPayload,
    CreatePartnerPayload,
    SystemSettings,
    UpdateSystemSettingsPayload,
    ForeignTransactionStatus,
    Customer,
    CreateCustomerPayload,
    UpdateCashboxRequestReviewedStatusPayload,
    CustomerTransaction,
    AccountTransfer,
    CreateAccountTransferPayload,
    ReassignTransferPayload,
} from '../types';
import { expenseCategoryTranslations } from '../utils/translations';
import notificationService from './notificationService'; // Import the new service

const SUSPENSE_ACCOUNT_CODE = '_SUSPENSE_';
const SUSPENSE_ACCOUNT_ID = 'cust-suspense';

// In-memory mock database
class MockDatabase {
    users: User[] = [];
    customers: Customer[] = [];
    domesticTransfers: DomesticTransfer[] = [];
    expenses: Expense[] = [];
    partnerAccounts: PartnerAccount[] = [];
    partnerTransactions: PartnerTransaction[] = [];
    customerTransactions: CustomerTransaction[] = [];
    accountTransfers: AccountTransfer[] = [];
    cashboxBalances: CashboxBalance[] = [];
    cashboxRequests: CashboxRequest[] = [];
    foreignTransactions: ForeignTransaction[] = [];
    bankAccounts: BankAccount[] = [];
    amanat: Amanat[] = [];
    systemSettings: SystemSettings = {
        approvalThresholds: {
            [Currency.USD]: 1000,
            [Currency.AFN]: 100000,
            [Currency.IRR]: 50000000,
            [Currency.PKR]: 100000,
            [Currency.IRT]: 50000000,
        }
    };
    
    // Counters
    userIdCounter = 5;
    customerIdCounter = 3;
    partnerIdCounter = 5;
    transferIdCounter = 12345;
    expenseIdCounter = 1;
    cashboxRequestIdCounter = 1;
    foreignTransactionIdCounter = 1;
    bankAccountIdCounter = 1;
    amanatIdCounter = 1;
    partnerTransactionIdCounter = 1;
    customerTransactionIdCounter = 1;
    accountTransferIdCounter = 1;

    constructor() {
        // Initial data
        this.users = [
            { id: 'user-1', name: 'احمد ولی', role: Role.Manager },
            { id: 'user-2', name: 'فاطمه زهرا', role: Role.Cashier },
            { id: 'user-3', name: 'جواد حسینی', role: Role.Domestic_Clerk },
            { id: 'user-4', name: 'زینب علیزاده', role: Role.Foreign_Clerk },
        ];
        this.customers = [
            { id: 'cust-1', name: 'احمد جوینی', code: '001', whatsappNumber: '+93799123456', balances: { [Currency.USD]: 5000, [Currency.AFN]: -100000 } },
            { id: 'cust-2', name: 'شرکت تجاری آریا', code: '201', whatsappNumber: '+93788987654', balances: { [Currency.USD]: 150000 } },
            // --- SYSTEM ACCOUNT ---
            { id: SUSPENSE_ACCOUNT_ID, name: 'حواله های در انتظار تخصیص', code: SUSPENSE_ACCOUNT_CODE, whatsappNumber: '', balances: { [Currency.USD]: 0 } },
        ];
        this.partnerAccounts = [
            { id: 'partner-1', name: 'صرافی هرات', balance: 5000, currency: Currency.USD },
            { id: 'partner-2', name: 'صرافی بلخ', balance: -10000, currency: Currency.AFN },
            { id: 'partner-3', name: 'صرافی قندهار', balance: 0, currency: Currency.USD },
            { id: 'partner-4', name: 'صرافی اعتماد', balance: 2500, currency: Currency.USD },
        ];
        this.cashboxBalances = [
            { currency: Currency.USD, balance: 100000 },
            { currency: Currency.AFN, balance: 5000000 },
            { currency: Currency.IRR, balance: 200000000 },
            { currency: Currency.PKR, balance: 0 },
            { currency: Currency.IRT, balance: 0 },
        ];
         // Seed some data for charts
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            this.domesticTransfers.push({
                id: `DT-123${i}`,
                createdAt: date,
                sender: { name: 'مشتری نمونه', tazkereh: '123' },
                receiver: { name: 'گیرنده نمونه', tazkereh: '456' },
                amount: 1000 + Math.random() * 4000,
                currency: Currency.USD,
                commission: 50 + Math.random() * 50,
                destinationProvince: 'کابل',
                partnerSarraf: ['صرافی هرات', 'صرافی بلخ', 'صرافی اعتماد'][i % 3],
                status: TransferStatus.Paid,
                createdBy: 'جواد حسینی',
                history: [],
            });
        }
        this.expenses.push({ id: 'EXP-1', createdAt: new Date(today.setDate(today.getDate() - 2)), category: ExpenseCategory.Rent, description: 'کرایه دفتر', amount: 500, currency: Currency.USD, user: 'احمد ولی' });
        this.expenses.push({ id: 'EXP-2', createdAt: new Date(today.setDate(today.getDate() - 5)), category: ExpenseCategory.Salary, description: 'حقوق کارمندان', amount: 2000, currency: Currency.USD, user: 'احمد ولی' });
        this.expenses.push({ id: 'EXP-3', createdAt: new Date(today.setDate(today.getDate() - 10)), category: ExpenseCategory.Utilities, description: 'هزینه برق', amount: 100, currency: Currency.USD, user: 'احمد ولی' });

        this.cashboxRequests = [
            { id: 'CBR-1', createdAt: new Date(new Date().setDate(new Date().getDate() - 1)), requestType: 'deposit', amount: 5000, currency: Currency.AFN, reason: 'واریز توسط مشتری 001', requestedBy: 'فاطمه زهرا', status: CashboxRequestStatus.AutoApproved, customerId: 'cust-1', reviewed: true, reviewedBy: 'احمد ولی', reviewedAt: new Date() },
            { id: 'CBR-2', createdAt: new Date(), requestType: 'withdrawal', amount: 200, currency: Currency.USD, reason: 'پرداخت هزینه پذیرایی', requestedBy: 'احمد ولی', status: CashboxRequestStatus.AutoApproved, reviewed: false },
            { id: 'CBR-3', createdAt: new Date(), requestType: 'withdrawal', amount: 99999, currency: Currency.USD, reason: 'درخواست در حال انتظار', requestedBy: 'زینب علیزاده', status: CashboxRequestStatus.Pending, reviewed: false },
             { id: 'CBR-4', createdAt: new Date(new Date().setDate(new Date().getDate() - 2)), requestType: 'deposit', amount: 1000, currency: Currency.USD, reason: 'دریافت از مشتری گذری', requestedBy: 'جواد حسینی', status: CashboxRequestStatus.AutoApproved, reviewed: true, reviewedBy: 'احمد ولی', reviewedAt: new Date() },
        ];
        this.cashboxRequestIdCounter = 5;
    }
}

const db = new MockDatabase();

// --- Helper Functions ---
const asyncResponse = <T>(data: T, delay = 300): Promise<T> =>
    new Promise(resolve => setTimeout(() => resolve(data), delay));

const asyncError = (message: string, delay = 300): Promise<{ error: string }> =>
    new Promise(resolve => setTimeout(() => resolve({ error: message }), delay));


export default class SarrafiApiService {
    private customers: Customer[] = [];

    constructor() {
        this.customers = db.customers;
    }

    // --- System Settings ---
    async getSystemSettings(): Promise<SystemSettings> {
        return asyncResponse({ ...db.systemSettings });
    }

    async updateSystemSettings(payload: UpdateSystemSettingsPayload): Promise<SystemSettings> {
        db.systemSettings = payload.settings;
        return asyncResponse({ ...db.systemSettings });
    }
    
    // --- User Management ---
    async getUsers(): Promise<User[]> {
        return asyncResponse([...db.users]);
    }

    async createUser(payload: CreateUserPayload): Promise<User> {
        const newUser: User = {
            id: `user-${db.userIdCounter++}`,
            ...payload
        };
        db.users.push(newUser);
        return asyncResponse(newUser);
    }
    
    async deleteUser(payload: DeleteUserPayload): Promise<{ success: boolean } | { error: string }> {
        // Prevent deleting the last manager or the user themselves (for simplicity)
        const userToDelete = db.users.find(u => u.id === payload.id);
        if (!userToDelete) return asyncError("کاربر یافت نشد.");
        if (userToDelete.role === Role.Manager && db.users.filter(u => u.role === Role.Manager).length === 1) {
            return asyncError("نمی‌توانید آخرین مدیر سیستم را حذف کنید.");
        }
        db.users = db.users.filter(u => u.id !== payload.id);
        return asyncResponse({ success: true });
    }

    // --- Customer Management ---
    async getCustomers(): Promise<Customer[]> {
        // Exclude system accounts from general customer lists
        return asyncResponse(db.customers.filter(c => c.code !== SUSPENSE_ACCOUNT_CODE));
    }
    
    async getCustomerById(id: string): Promise<Customer | undefined> {
        return asyncResponse(db.customers.find(c => c.id === id));
    }

    async getCustomerByCode(code: string): Promise<Customer | undefined> {
        return asyncResponse(db.customers.find(c => c.code === code));
    }

    async getTransactionsForCustomer(customerId: string): Promise<CustomerTransaction[]> {
        return asyncResponse(db.customerTransactions.filter(tx => tx.customerId === customerId));
    }

    async createCustomer(payload: CreateCustomerPayload): Promise<Customer | {error: string}> {
        if(db.customers.some(c => c.code === payload.code)) {
            return asyncError('کد مشتری تکراری است.');
        }
        const newCustomer: Customer = {
            id: `cust-${db.customerIdCounter++}`,
            ...payload,
            balances: {}
        };
        db.customers.push(newCustomer);
        this.customers.push(newCustomer); // Update local cache
        return asyncResponse(newCustomer);
    }

    // --- Partner Management ---
     async createPartner(payload: CreatePartnerPayload): Promise<PartnerAccount> {
        const newPartner: PartnerAccount = {
            id: `partner-${db.partnerIdCounter++}`,
            name: payload.name,
            balance: payload.initialBalance,
            currency: payload.currency,
        };
        db.partnerAccounts.push(newPartner);
        return asyncResponse(newPartner);
    }

    // Domestic Transfers
    async getDomesticTransfers(): Promise<DomesticTransfer[]> {
        return asyncResponse([...db.domesticTransfers]);
    }

    async createDomesticTransfer(payload: CreateDomesticTransferPayload): Promise<DomesticTransfer | { error: string }> {
        if (![Role.Manager, Role.Domestic_Clerk].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای ایجاد حواله داخلی را ندارید.");
        }
        if (payload.amount <= 0) return asyncError("مبلغ باید بیشتر از صفر باشد.");
        
        const newTransfer: DomesticTransfer = {
            id: `DT-${db.transferIdCounter++}`,
            createdAt: new Date(),
            sender: { name: payload.senderName, tazkereh: payload.senderTazkereh },
            receiver: { name: payload.receiverName, tazkereh: payload.receiverTazkereh },
            amount: payload.amount,
            currency: payload.currency,
            commission: payload.commission,
            destinationProvince: payload.destinationProvince,
            partnerSarraf: payload.partnerSarraf,
            status: TransferStatus.Pending,
            createdBy: payload.user.name,
            history: [{ status: TransferStatus.Pending, timestamp: new Date(), user: payload.user.name }],
            customerId: undefined
        };

        // --- INTELLIGENT INTEGRATION LOGIC ---
        if (payload.isCashPayment) {
            // Walk-in customer, create an automatic cashbox deposit
            const cashboxPayload: CreateCashboxRequestPayload = {
                requestType: 'deposit',
                amount: payload.amount + payload.commission,
                currency: payload.currency,
                reason: `بابت حواله نقدی کد ${newTransfer.id} برای ${payload.senderName}`,
                user: payload.user,
                linkedEntity: { type: 'DomesticTransfer', id: newTransfer.id, description: `حواله نقدی برای ${payload.senderName}` },
            };
            const cashboxResult = await this.createCashboxRequest(cashboxPayload);
             if ('error' in cashboxResult) {
                return asyncError(`حواله ثبت شد، اما در ثبت خودکار صندوق خطا رخ داد: ${cashboxResult.error}`);
            }
        } else {
            // Registered customer, deduct from their account balance
            if (!payload.customerCode) return asyncError("برای پرداخت از حساب، کد مشتری الزامی است.");
            const customer = db.customers.find(c => c.code === payload.customerCode);
            if (!customer) return asyncError("مشتری با کد وارد شده یافت نشد.");

            const totalDeduction = payload.amount + payload.commission;
            const currentBalance = customer.balances[payload.currency] || 0;
            customer.balances[payload.currency] = currentBalance - totalDeduction;

            const customerTx: CustomerTransaction = {
                id: `CTX-${db.customerTransactionIdCounter++}`,
                customerId: customer.id,
                timestamp: new Date(),
                type: 'debit',
                amount: totalDeduction,
                currency: payload.currency,
                description: `بابت حواله داخلی کد ${newTransfer.id}`,
                linkedEntityId: newTransfer.id,
                linkedEntityType: 'DomesticTransfer',
            };
            db.customerTransactions.push(customerTx);
            newTransfer.customerId = customer.id;
        }

        db.domesticTransfers.push(newTransfer);
        
        // Partner account integration (remains the same)
        const partner = db.partnerAccounts.find(p => p.name === payload.partnerSarraf);
        if (partner) {
            partner.balance -= payload.amount;
            const partnerTx: PartnerTransaction = {
                id: `PTX-${db.partnerTransactionIdCounter++}`,
                partnerId: partner.id,
                timestamp: new Date(),
                type: 'debit',
                amount: payload.amount,
                currency: payload.currency,
                description: `بابت حواله داخلی کد ${newTransfer.id}`
            };
            db.partnerTransactions.push(partnerTx);
        }

        return asyncResponse(newTransfer);
    }
    
    async findTransferById(payload: FindTransferByIdPayload): Promise<DomesticTransfer | { error: string }> {
        const transfer = db.domesticTransfers.find(t => t.id.toLowerCase() === payload.transferId.toLowerCase());
        if (!transfer) return asyncError("حواله با این کد یافت نشد.");
        return asyncResponse(transfer);
    }
    
    async updateTransferStatus(payload: UpdateTransferStatusPayload): Promise<DomesticTransfer | { error: string }> {
         if (![Role.Manager, Role.Domestic_Clerk].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای این عملیات را ندارید.");
        }
        const transfer = db.domesticTransfers.find(t => t.id === payload.transferId);
        if (!transfer) return asyncError("حواله یافت نشد.");
        transfer.status = payload.newStatus;
        transfer.history.push({ status: payload.newStatus, timestamp: new Date(), user: payload.user.name });
        return asyncResponse(transfer);
    }

    async payoutIncomingTransfer(payload: PayoutIncomingTransferPayload): Promise<DomesticTransfer | { error: string }> {
        const transfer = db.domesticTransfers.find(t => t.id === payload.transferId);
        if (!transfer) return asyncError("حواله یافت نشد.");
        if (transfer.status !== TransferStatus.Executed) return asyncError("این حواله آماده پرداخت نیست.");

        const cashboxRequestPayload: CreateCashboxRequestPayload = {
            requestType: 'withdrawal',
            amount: transfer.amount,
            currency: transfer.currency,
            reason: `پرداخت حواله ورودی کد ${transfer.id}`,
            user: payload.user,
            linkedEntity: { type: 'DomesticTransfer', id: transfer.id, description: `پرداخت حواله ورودی از ${transfer.partnerSarraf}` },
        };
        const cashboxResult = await this.createCashboxRequest(cashboxRequestPayload);
        if ('error' in cashboxResult) {
            return cashboxResult;
        }

        // If auto-approved, we can proceed with updating partner balance
        if ([CashboxRequestStatus.Approved, CashboxRequestStatus.AutoApproved].includes(cashboxResult.status)) {
            transfer.status = TransferStatus.Paid;
            transfer.history.push({ status: TransferStatus.Paid, timestamp: new Date(), user: payload.user.name });

            const partner = db.partnerAccounts.find(p => p.name === transfer.partnerSarraf);
            if (partner) {
                partner.balance += transfer.amount; // They owe us more now
                const partnerTx: PartnerTransaction = {
                    id: `PTX-${db.partnerTransactionIdCounter++}`,
                    partnerId: partner.id,
                    timestamp: new Date(),
                    type: 'credit',
                    amount: transfer.amount,
                    currency: transfer.currency,
                    description: `پرداخت حواله ورودی کد ${transfer.id}`
                };
                db.partnerTransactions.push(partnerTx);
            }
        } else {
             // If manual approval is needed, we don't change the transfer status yet.
             // This logic needs to be handled when the request is approved.
        }

        return asyncResponse(transfer);
    }
    
    // Expenses
    async getExpenses(): Promise<Expense[]> {
        return asyncResponse([...db.expenses]);
    }

    async createExpense(payload: CreateExpensePayload): Promise<Expense | { error: string }> {
        if (payload.user.role !== Role.Manager) return asyncError("فقط مدیر میتواند هزینه ثبت کند.");
        
        const expenseId = `EXP-${db.expenseIdCounter++}`;
        const cashboxRequestPayload: CreateCashboxRequestPayload = {
            requestType: 'withdrawal',
            amount: payload.amount,
            currency: payload.currency,
            reason: `بابت هزینه: ${payload.description}`,
            user: payload.user,
            linkedEntity: { type: 'Expense', id: expenseId, description: payload.description },
        };
        const cashboxResult = await this.createCashboxRequest(cashboxRequestPayload);
        if ('error' in cashboxResult) return cashboxResult;

        const newExpense: Expense = {
            id: expenseId,
            createdAt: new Date(),
            ...payload,
            user: payload.user.name,
            linkedCashboxRequestId: cashboxResult.id,
        };
        db.expenses.push(newExpense);
        return asyncResponse(newExpense);
    }

    // Partner Accounts
    async getPartnerAccounts(): Promise<PartnerAccount[]> {
        return asyncResponse([...db.partnerAccounts]);
    }

    async getPartnerAccountById(id: string): Promise<PartnerAccount | undefined> {
        return asyncResponse(db.partnerAccounts.find(p => p.id === id));
    }
    
    async getPartnerAccountByName(payload: GetPartnerAccountByNamePayload): Promise<PartnerAccount | { error: string }> {
        const partner = db.partnerAccounts.find(p => p.name === payload.partnerName);
        if (!partner) return asyncError("همکار با این نام یافت نشد.");
        return asyncResponse(partner);
    }

    async getTransactionsForPartner(partnerId: string): Promise<PartnerTransaction[]> {
        return asyncResponse(db.partnerTransactions.filter(tx => tx.partnerId === partnerId));
    }
    
    async settlePartnerBalance(payload: SettlePartnerBalancePayload): Promise<PartnerAccount | { error: string }> {
        if (![Role.Manager, Role.Domestic_Clerk].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای تسویه حساب را ندارید.");
        }
        const partner = db.partnerAccounts.find(p => p.id === payload.partnerId);
        if (!partner) return asyncError("همکار یافت نشد.");

        const settlementAmount = partner.balance < 0 ? payload.amount : -payload.amount;
        partner.balance += settlementAmount;

        const partnerTx: PartnerTransaction = {
            id: `PTX-${db.partnerTransactionIdCounter++}`,
            partnerId: partner.id,
            timestamp: new Date(),
            type: settlementAmount > 0 ? 'debit' : 'credit', 
            amount: payload.amount,
            currency: payload.currency,
            description: `تسویه حساب توسط ${payload.user.name}`
        };
        db.partnerTransactions.push(partnerTx);

        return asyncResponse(partner);
    }
    
    async settlePartnerBalanceByName(payload: SettlePartnerBalanceByNamePayload): Promise<PartnerAccount | { error: string }> {
         const partner = db.partnerAccounts.find(p => p.name === payload.partnerName);
        if (!partner) return asyncError("همکار یافت نشد.");
        
        const payloadForSettle: SettlePartnerBalancePayload = {
            ...payload,
            partnerId: partner.id
        }
        return this.settlePartnerBalance(payloadForSettle);
    }

    // Cashbox
    async getCashboxBalances(): Promise<CashboxBalance[]> {
        return asyncResponse([...db.cashboxBalances]);
    }
    
    async getCashboxRequests(): Promise<CashboxRequest[]> {
        // Deprecated, use getLedgerEntries
        return asyncResponse([...db.cashboxRequests]);
    }

    async getLedgerEntries(): Promise<CashboxRequest[]> {
        const approvedStatuses = [CashboxRequestStatus.Approved, CashboxRequestStatus.AutoApproved];
        const entries = db.cashboxRequests.filter(r => approvedStatuses.includes(r.status));
        return asyncResponse([...entries]);
    }

     async getCashboxRequestById(id: string): Promise<CashboxRequest | undefined> {
        return asyncResponse(db.cashboxRequests.find(r => r.id === id));
    }

    async createCashboxRequest(payload: CreateCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        const threshold = db.systemSettings.approvalThresholds[payload.currency] ?? 0;
        const needsManagerApproval = payload.amount > threshold;

        const newStatus = needsManagerApproval ? CashboxRequestStatus.Pending : CashboxRequestStatus.AutoApproved;

        if (payload.requestType === 'withdrawal') {
            const cashbox = db.cashboxBalances.find(cb => cb.currency === payload.currency);
            if (!cashbox || cashbox.balance < payload.amount) {
                return asyncError("موجودی صندوق کافی نیست.");
            }
        }

        const customer = db.customers.find(c => c.code === payload.customerCode);
        
        const newRequest: CashboxRequest = {
            id: `CBR-${db.cashboxRequestIdCounter++}`,
            createdAt: new Date(),
            status: newStatus,
            requestType: payload.requestType,
            amount: payload.amount,
            currency: payload.currency,
            reason: payload.reason,
            requestedBy: payload.user.name,
            linkedEntity: payload.linkedEntity,
            customerId: customer ? customer.id : undefined,
            reviewed: false,
        };
        db.cashboxRequests.push(newRequest);
        
        // If auto-approved, process it immediately
        if (newRequest.status === CashboxRequestStatus.AutoApproved) {
            await this.processCashboxTransaction(newRequest);
        }

        return asyncResponse(newRequest);
    }
    
    async resolveCashboxRequest(payload: ResolveCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        if (payload.user.role !== Role.Manager) {
            return asyncError("فقط مدیر میتواند درخواست‌های صندوق را رسیدگی کند.");
        }
        const request = db.cashboxRequests.find(r => r.id === payload.requestId);
        if (!request) return asyncError("درخواست یافت نشد.");
        if (request.status !== CashboxRequestStatus.Pending) return asyncError("این درخواست قبلا رسیدگی شده است.");

        request.status = payload.resolution === 'approve' ? CashboxRequestStatus.Approved : CashboxRequestStatus.Rejected;
        request.resolvedBy = payload.user.name;
        request.resolvedAt = new Date();

        if (request.status === CashboxRequestStatus.Approved) {
            await this.processCashboxTransaction(request);
        } else {
             // If rejected, cancel linked foreign transaction
            const linkedTx = db.foreignTransactions.find(ft => ft.linkedCashboxRequestId === request.id);
            if(linkedTx) {
                linkedTx.status = ForeignTransactionStatus.Cancelled;
            }
        }

        return asyncResponse(request);
    }
    
    async updateCashboxRequestReviewedStatus(payload: UpdateCashboxRequestReviewedStatusPayload): Promise<CashboxRequest | { error: string }> {
        if (payload.user.role !== Role.Manager) {
            return asyncError("فقط مدیر میتواند وضعیت بازبینی را تغییر دهد.");
        }
        const request = db.cashboxRequests.find(r => r.id === payload.requestId);
        if (!request) return asyncError("تراکنش یافت نشد.");

        request.reviewed = payload.reviewed;
        request.reviewedBy = payload.user.name;
        request.reviewedAt = new Date();
        
        // Here you could trigger other actions, like sending a WhatsApp notification
        if(request.reviewed) {
            const customer = this.customers.find(c => c.id === request.customerId);
            if(customer && customer.whatsappNumber) {
                const message = `تراکنش شما به مبلغ ${request.amount} ${request.currency} برای "${request.reason}" تایید نهایی شد.`;
                notificationService.sendWhatsAppNotification(customer.whatsappNumber, message);
            }
        }


        return asyncResponse(request);
    }

    private async processCashboxTransaction(request: CashboxRequest): Promise<void> {
        const cashbox = db.cashboxBalances.find(cb => cb.currency === request.currency);
        if (cashbox) {
            if (request.requestType === 'deposit') cashbox.balance += request.amount;
            else cashbox.balance -= request.amount;
        }

        // --- NEW INTEGRATION: Update customer balance if linked ---
        if (request.customerId) {
            const customer = db.customers.find(c => c.id === request.customerId);
            if (customer) {
                const txType = request.requestType === 'deposit' ? 'credit' : 'debit';
                const currentBalance = customer.balances[request.currency] || 0;
                
                if (txType === 'credit') {
                    customer.balances[request.currency] = currentBalance + request.amount;
                } else {
                    customer.balances[request.currency] = currentBalance - request.amount;
                }

                const customerTx: CustomerTransaction = {
                    id: `CTX-${db.customerTransactionIdCounter++}`,
                    customerId: customer.id,
                    timestamp: new Date(),
                    type: txType,
                    amount: request.amount,
                    currency: request.currency,
                    description: request.reason,
                    linkedEntityId: request.id,
                    linkedEntityType: request.requestType === 'deposit' ? 'CashDeposit' : 'CashWithdrawal'
                };
                db.customerTransactions.push(customerTx);
            }
        }

        // Finalize linked foreign transaction
        const linkedTx = db.foreignTransactions.find(ft => ft.linkedCashboxRequestId === request.id);
        if(linkedTx) {
            linkedTx.status = ForeignTransactionStatus.Completed;
        }
    }
    
    // Foreign Transfers & Account Transfers
    async getAccountTransfers(): Promise<AccountTransfer[]> {
        return asyncResponse([...db.accountTransfers]);
    }

    async createAccountTransfer(payload: CreateAccountTransferPayload): Promise<AccountTransfer | { error: string }> {
        const { fromCustomerCode, toCustomerCode, amount, currency, user, isPendingAssignment } = payload;
        
        // Use suspense account code if pending assignment
        const finalToCustomerCode = isPendingAssignment ? SUSPENSE_ACCOUNT_CODE : toCustomerCode;

        if (fromCustomerCode === finalToCustomerCode) return asyncError("حساب مبدا و مقصد نمی‌توانند یکسان باشند.");
        if (amount <= 0) return asyncError("مبلغ انتقال باید بیشتر از صفر باشد.");
        if (![Role.Manager, Role.Foreign_Clerk, Role.Domestic_Clerk].includes(user.role)) {
            return asyncError("شما دسترسی لازم برای این عملیات را ندارید.");
        }

        const fromCustomer = db.customers.find(c => c.code === fromCustomerCode);
        const toCustomer = db.customers.find(c => c.code === finalToCustomerCode);

        if (!fromCustomer) return asyncError(`مشتری با کد مبدا ${fromCustomerCode} یافت نشد.`);
        if (!toCustomer) return asyncError(`مشتری با کد مقصد ${finalToCustomerCode} یافت نشد.`);
        
        const timestamp = new Date();
        const transferId = `AT-${db.accountTransferIdCounter++}`;
        const status = isPendingAssignment ? 'PendingAssignment' : 'Completed';

        // Create debit transaction for sender
        const debitTx: CustomerTransaction = {
            id: `CTX-${db.customerTransactionIdCounter++}`,
            customerId: fromCustomer.id,
            timestamp,
            type: 'debit',
            amount,
            currency,
            description: `انتقال به ${toCustomer.name} (${toCustomer.code})`,
            linkedEntityId: transferId,
            linkedEntityType: 'AccountTransfer',
        };
        db.customerTransactions.push(debitTx);
        const fromBalance = fromCustomer.balances[currency] || 0;
        fromCustomer.balances[currency] = fromBalance - amount;

        // Create credit transaction for receiver
        const creditTx: CustomerTransaction = {
            id: `CTX-${db.customerTransactionIdCounter++}`,
            customerId: toCustomer.id,
            timestamp,
            type: 'credit',
            amount,
            currency,
            description: `دریافت از ${fromCustomer.name} (${fromCustomer.code})`,
            linkedEntityId: transferId,
            linkedEntityType: 'AccountTransfer',
        };
        db.customerTransactions.push(creditTx);
        const toBalance = toCustomer.balances[currency] || 0;
        toCustomer.balances[currency] = toBalance + amount;
        
        const newTransfer: AccountTransfer = {
            id: transferId,
            timestamp,
            fromCustomerId: fromCustomer.id,
            toCustomerId: toCustomer.id,
            amount,
            currency,
            description: payload.description,
            user: user.name,
            debitTransactionId: debitTx.id,
            creditTransactionId: creditTx.id,
            status: status,
        };
        db.accountTransfers.push(newTransfer);

        return asyncResponse(newTransfer);
    }

    async reassignPendingTransfer(payload: ReassignTransferPayload): Promise<AccountTransfer | { error: string }> {
        if (![Role.Manager, Role.Foreign_Clerk, Role.Domestic_Clerk].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای این عملیات را ندارید.");
        }
        
        const transfer = db.accountTransfers.find(t => t.id === payload.transferId);
        if (!transfer) return asyncError("انتقال مورد نظر یافت نشد.");
        if (transfer.status !== 'PendingAssignment') return asyncError("این انتقال در حالت انتظار تخصیص نیست.");

        const finalCustomer = db.customers.find(c => c.code === payload.finalCustomerCode);
        if (!finalCustomer) return asyncError(`مشتری با کد ${payload.finalCustomerCode} یافت نشد.`);

        const suspenseAccount = db.customers.find(c => c.id === SUSPENSE_ACCOUNT_ID);
        if (!suspenseAccount) return asyncError("خطای سیستمی: حساب معلق یافت نشد.");
        
        const timestamp = new Date();

        // 1. Debit the suspense account
        const debitTx: CustomerTransaction = {
            id: `CTX-${db.customerTransactionIdCounter++}`,
            customerId: suspenseAccount.id,
            timestamp,
            type: 'debit',
            amount: transfer.amount,
            currency: transfer.currency,
            description: `تخصیص انتقال ${transfer.id} به ${finalCustomer.name}`,
            linkedEntityId: transfer.id,
            linkedEntityType: 'AccountTransferReassignment',
        };
        db.customerTransactions.push(debitTx);
        const suspenseBalance = suspenseAccount.balances[transfer.currency] || 0;
        suspenseAccount.balances[transfer.currency] = suspenseBalance - transfer.amount;

        // 2. Credit the final customer's account
        const creditTx: CustomerTransaction = {
            id: `CTX-${db.customerTransactionIdCounter++}`,
            customerId: finalCustomer.id,
            timestamp,
            type: 'credit',
            amount: transfer.amount,
            currency: transfer.currency,
            description: `دریافت وجه تخصیص داده شده از انتقال ${transfer.id}`,
            linkedEntityId: transfer.id,
            linkedEntityType: 'AccountTransferReassignment',
        };
        db.customerTransactions.push(creditTx);
        const finalCustomerBalance = finalCustomer.balances[transfer.currency] || 0;
        finalCustomer.balances[transfer.currency] = finalCustomerBalance + transfer.amount;

        // 3. Update the original transfer record
        transfer.status = 'Completed';
        transfer.finalCustomerId = finalCustomer.id;

        if (finalCustomer.whatsappNumber) {
            const message = `مبلغ ${transfer.amount} ${transfer.currency} به حساب شما واریز شد. (بابت تخصیص حواله در انتظار)`;
            notificationService.sendWhatsAppNotification(finalCustomer.whatsappNumber, message);
        }
        
        return asyncResponse(transfer);
    }
    
    async getBankAccounts(): Promise<BankAccount[]> {
        return asyncResponse([...db.bankAccounts]);
    }

    async addBankAccount(payload: AddBankAccountPayload): Promise<BankAccount | { error: string }> {
        const newAccount: BankAccount = { 
            id: `BA-${db.bankAccountIdCounter++}`, 
            balance: payload.initialBalance,
            ...payload 
        };
        db.bankAccounts.push(newAccount);
        return asyncResponse(newAccount);
    }

    async getForeignTransactions(): Promise<ForeignTransaction[]> {
        return asyncResponse([...db.foreignTransactions]);
    }
    
    async logForeignTransaction(payload: LogForeignTransactionPayload): Promise<ForeignTransaction | { error: string }> {
        if (![Role.Manager, Role.Foreign_Clerk].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای ثبت تراکنش خارجی را ندارید.");
        }
        const bankAccount = db.bankAccounts.find(ba => ba.id === payload.bankAccountId);
        if (!bankAccount) return asyncError("حساب بانکی انتخاب شده یافت نشد.");

        const txId = `FT-${db.foreignTransactionIdCounter++}`;
        
        const newTx: ForeignTransaction = {
            id: txId,
            timestamp: new Date(),
            type: payload.transactionType,
            customerName: payload.customerName,
            tomanAmount: payload.tomanAmount,
            rate: payload.rate,
            description: payload.description,
            user: payload.user.name,
            bankAccountId: payload.bankAccountId,
            commission: payload.commission,
            commissionCurrency: payload.commissionCurrency,
            cashTransactionAmount: payload.cashTransactionAmount,
            cashTransactionCurrency: payload.cashTransactionCurrency,
            linkedCashboxRequestId: undefined, // Will be set next
            status: ForeignTransactionStatus.PendingCashConfirmation,
        };
        
        // Automatically create a cashbox request if cash is involved
        if (payload.cashTransactionAmount && payload.cashTransactionCurrency && payload.cashTransactionAmount > 0) {
            const requestType = [ForeignTransactionType.BuyBankTomanWithForeignCash, ForeignTransactionType.BuyBankTomanWithTomanCash].includes(payload.transactionType)
                ? 'deposit'
                : 'withdrawal';

            const cashboxRequestPayload: CreateCashboxRequestPayload = {
                requestType,
                amount: payload.cashTransactionAmount,
                currency: payload.cashTransactionCurrency,
                reason: `مربوط به تراکنش خارجی ${txId}`,
                user: payload.user,
                linkedEntity: { type: 'ForeignTransaction', id: txId, description: `تراکنش خارجی برای ${payload.customerName}` }
            };
            const cashboxRequestResult = await this.createCashboxRequest(cashboxRequestPayload);
             if ('error' in cashboxRequestResult) {
                return asyncError(`خطا در ایجاد درخواست صندوق: ${cashboxRequestResult.error}`);
            }
            newTx.linkedCashboxRequestId = cashboxRequestResult.id;
            
            // If request was auto-approved, the transaction is already completed
            if(cashboxRequestResult.status === CashboxRequestStatus.AutoApproved) {
                newTx.status = ForeignTransactionStatus.Completed;
            }
        } else {
             // No cash involved, so transaction is completed immediately
            newTx.status = ForeignTransactionStatus.Completed;
        }
        
        // Update bank account balance only if transaction is not cancelled later
         if (newTx.status !== ForeignTransactionStatus.Cancelled) {
            if (payload.transactionType === ForeignTransactionType.InternalBankTomanTransfer) {
                // This case needs more logic for debiting one and crediting another, skipped for now
            } else if ([ForeignTransactionType.SellBankTomanForForeignCash, ForeignTransactionType.SellBankTomanForTomanCash].includes(payload.transactionType)) {
                bankAccount.balance += payload.tomanAmount; // Toman received in our account
            } else {
                bankAccount.balance -= payload.tomanAmount; // Toman sent from our account
            }
        }

        db.foreignTransactions.push(newTx);
        return asyncResponse(newTx);
    }

    // Amanat
    async getAmanat(): Promise<Amanat[]> {
        return asyncResponse([...db.amanat]);
    }

    async createAmanat(payload: CreateAmanatPayload): Promise<Amanat | { error: string }> {
        if (![Role.Manager, Role.Domestic_Clerk, Role.Foreign_Clerk].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای ثبت امانت را ندارید.");
        }
        const amanatId = `AM-${db.amanatIdCounter++}`;
        
        const cashboxRequestPayload: CreateCashboxRequestPayload = {
            requestType: 'deposit',
            amount: payload.amount,
            currency: payload.currency,
            reason: `امانت دریافتی از ${payload.customerName} (کد: ${amanatId})`,
            user: payload.user,
            linkedEntity: { type: 'Amanat', id: amanatId, description: `دریافت امانت از ${payload.customerName}` },
        };
        const cashboxRequestResult = await this.createCashboxRequest(cashboxRequestPayload);
        if ('error' in cashboxRequestResult) {
            return asyncError(`خطا در ایجاد درخواست صندوق: ${cashboxRequestResult.error}`);
        }
        
        const newAmanat: Amanat = {
            id: amanatId,
            createdAt: new Date(),
            customerName: payload.customerName,
            amount: payload.amount,
            currency: payload.currency,
            status: AmanatStatus.Active,
            notes: payload.notes,
            createdBy: payload.user.name,
            linkedCashboxRequestId: cashboxRequestResult.id,
        };
        db.amanat.push(newAmanat);
        return asyncResponse(newAmanat);
    }
    
    async returnAmanat(payload: ReturnAmanatPayload): Promise<Amanat | { error: string }> {
        if (![Role.Manager, Role.Domestic_Clerk, Role.Foreign_Clerk].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای بازگرداندن امانت را ندارید.");
        }
        const amanat = db.amanat.find(a => a.id === payload.amanatId);
        if (!amanat) return asyncError("امانت یافت نشد.");
        if (amanat.status === AmanatStatus.Returned) return asyncError("این امانت قبلاً بازگردانده شده است.");

        const cashboxRequestPayload: CreateCashboxRequestPayload = {
            requestType: 'withdrawal',
            amount: amanat.amount,
            currency: amanat.currency,
            reason: `بازگشت امانت به ${amanat.customerName} (کد: ${amanat.id})`,
            user: payload.user,
            linkedEntity: { type: 'AmanatReturn', id: amanat.id, description: `بازگشت امانت به ${amanat.customerName}` },
        };
         const cashboxRequestResult = await this.createCashboxRequest(cashboxRequestPayload);
         if ('error' in cashboxRequestResult) {
            return asyncError(`خطا در ایجاد درخواست صندوق: ${cashboxRequestResult.error}`);
        }

        amanat.status = AmanatStatus.Returned;
        amanat.returnedBy = payload.user.name;
        amanat.returnedAt = new Date();
        amanat.linkedReturnCashboxRequestId = cashboxRequestResult.id;

        return asyncResponse(amanat);
    }
    
    // Reports
    async generateReport(payload: GenerateReportPayload): Promise<ProfitAndLossReportData | CashboxSummaryReportData | { error: string }> {
        const startDate = new Date(payload.startDate);
        const endDate = new Date(payload.endDate);
        endDate.setHours(23, 59, 59, 999);

        if (payload.reportType === ReportType.ProfitAndLoss) {
            const revenueItems = db.domesticTransfers
                .filter(t => t.currency === payload.currency && t.createdAt >= startDate && t.createdAt <= endDate && t.commission > 0)
                .map(t => ({ date: t.createdAt, description: `کارمزد حواله ${t.id}`, amount: t.commission }));
            
            // Add foreign transfer commissions to revenue/expense
            db.foreignTransactions
                .filter(t => t.commissionCurrency === payload.currency && t.timestamp >= startDate && t.timestamp <= endDate)
                .forEach(t => {
                    if (t.commission > 0) {
                        revenueItems.push({ date: t.timestamp, description: `کارمزد تراکنش ${t.id}`, amount: t.commission });
                    }
                });

            const expenseItems = db.expenses
                .filter(e => e.currency === payload.currency && e.createdAt >= startDate && e.createdAt <= endDate)
                .map(e => ({ date: e.createdAt, description: e.description, amount: e.amount }));

            db.foreignTransactions
                .filter(t => t.commissionCurrency === payload.currency && t.timestamp >= startDate && t.timestamp <= endDate)
                .forEach(t => {
                    if (t.commission < 0) {
                        expenseItems.push({ date: t.timestamp, description: `کمیسیون پرداختی تراکنش ${t.id}`, amount: Math.abs(t.commission) });
                    }
                });

            const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
            const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);

            const report: ProfitAndLossReportData = {
                ...payload,
                totalRevenue,
                totalExpenses,
                netProfit: totalRevenue - totalExpenses,
                revenueItems,
                expenseItems,
            };
            return asyncResponse(report);
        }

        if (payload.reportType === ReportType.CashboxSummary) {
             const report: CashboxSummaryReportData = {
                ...payload,
                totalInflow: 1000,
                totalOutflow: 500,
                netChange: 500,
                transactions: [],
            };
            return asyncResponse(report);
        }

        return asyncError("نوع گزارش نامعتبر است.");
    }

    // --- Analytics ---
    async getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
        // 1. Expenses by Category
        const expensesByCategory: { [key: string]: number } = {};
        db.expenses.forEach(expense => {
            if (expense.currency === Currency.USD) { // Standardize to USD for comparison
                 const categoryName = expenseCategoryTranslations[expense.category];
                 if (!expensesByCategory[categoryName]) {
                    expensesByCategory[categoryName] = 0;
                }
                expensesByCategory[categoryName] += expense.amount;
            }
        });

        // 2. Partner Activity
        const partnerActivity: { [key: string]: number } = {};
        db.domesticTransfers.forEach(transfer => {
             if (!partnerActivity[transfer.partnerSarraf]) {
                partnerActivity[transfer.partnerSarraf] = 0;
            }
            partnerActivity[transfer.partnerSarraf]++;
        });

        // 3. Profit/Loss Trend (last 6 months)
        const profitLossTrend: { [key: string]: { revenue: number, expenses: number } } = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = date.toLocaleString('default', { month: 'long' });
            profitLossTrend[monthKey] = { revenue: 0, expenses: 0 };
        }

        db.domesticTransfers.forEach(t => {
            if (t.currency === Currency.USD) {
                const monthKey = t.createdAt.toLocaleString('default', { month: 'long' });
                if (profitLossTrend[monthKey]) {
                    profitLossTrend[monthKey].revenue += t.commission;
                }
            }
        });
        db.expenses.forEach(e => {
            if (e.currency === Currency.USD) {
                const monthKey = e.createdAt.toLocaleString('default', { month: 'long' });
                if (profitLossTrend[monthKey]) {
                    profitLossTrend[monthKey].expenses += e.amount;
                }
            }
        });
        
        const data: DashboardAnalyticsData = {
            expensesByCategory: Object.entries(expensesByCategory).map(([label, value]) => ({ label, value })),
            partnerActivity: Object.entries(partnerActivity).map(([label, value]) => ({ label, value })),
            profitLossTrend: Object.entries(profitLossTrend).map(([month, values]) => ({ month, ...values })),
        };
        return asyncResponse(data);
    }
    
    async getFullBusinessContextAsText(): Promise<string> {
        const context = {
            date: new Date().toISOString(),
            domesticTransfers: db.domesticTransfers.slice(-20), // Last 20 for brevity
            expenses: db.expenses.slice(-20),
            partnerAccounts: db.partnerAccounts,
        };
        return asyncResponse(JSON.stringify(context, null, 2));
    }

    // --- Backup & Restore ---
    async getBackupState(): Promise<any> {
        return asyncResponse({ ...db });
    }

    async restoreState(backup: any): Promise<{ success: boolean }> {
        const reviveDatesInArray = (arr: any[], keys: string[]) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(item => {
                if (!item) return item;
                keys.forEach(key => {
                    if (item[key]) {
                        item[key] = new Date(item[key]);
                    }
                });
                if (item.history) { // special case for history
                    item.history = item.history.map((h: any) => ({...h, timestamp: new Date(h.timestamp)}))
                }
                return item;
            });
        };

        db.domesticTransfers = reviveDatesInArray(backup.domesticTransfers, ['createdAt']);
        db.expenses = reviveDatesInArray(backup.expenses, ['createdAt']);
        db.partnerTransactions = reviveDatesInArray(backup.partnerTransactions, ['timestamp']);
        db.customerTransactions = reviveDatesInArray(backup.customerTransactions, ['timestamp']);
        db.cashboxRequests = reviveDatesInArray(backup.cashboxRequests, ['createdAt', 'resolvedAt', 'reviewedAt']);
        db.foreignTransactions = reviveDatesInArray(backup.foreignTransactions, ['timestamp']);
        db.amanat = reviveDatesInArray(backup.amanat, ['createdAt', 'returnedAt']);
        db.accountTransfers = reviveDatesInArray(backup.accountTransfers, ['timestamp']);

        // non-date arrays and objects
        db.users = backup.users || [];
        db.customers = backup.customers || [];
        db.partnerAccounts = backup.partnerAccounts || [];
        db.cashboxBalances = backup.cashboxBalances || [];
        db.bankAccounts = backup.bankAccounts || [];
        db.systemSettings = backup.systemSettings || { approvalThresholds: {} };
        
        // counters
        db.userIdCounter = backup.userIdCounter || 5;
        db.customerIdCounter = backup.customerIdCounter || 1;
        db.partnerIdCounter = backup.partnerIdCounter || 5;
        db.transferIdCounter = backup.transferIdCounter || 12345;
        db.expenseIdCounter = backup.expenseIdCounter || 1;
        db.cashboxRequestIdCounter = backup.cashboxRequestIdCounter || 1;
        db.foreignTransactionIdCounter = backup.foreignTransactionIdCounter || 1;
        db.bankAccountIdCounter = backup.bankAccountIdCounter || 1;
        db.amanatIdCounter = backup.amanatIdCounter || 1;
        db.partnerTransactionIdCounter = backup.partnerTransactionIdCounter || 1;
        db.customerTransactionIdCounter = backup.customerTransactionIdCounter || 1;
        db.accountTransferIdCounter = backup.accountTransferIdCounter || 1;


        return asyncResponse({ success: true });
    }
}
