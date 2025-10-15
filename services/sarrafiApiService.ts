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
} from '../types';
import { expenseCategoryTranslations } from '../utils/translations';

// In-memory mock database
class MockDatabase {
    domesticTransfers: DomesticTransfer[] = [];
    expenses: Expense[] = [];
    partnerAccounts: PartnerAccount[] = [];
    partnerTransactions: PartnerTransaction[] = [];
    cashboxBalances: CashboxBalance[] = [];
    cashboxRequests: CashboxRequest[] = [];
    foreignTransactions: ForeignTransaction[] = [];
    bankAccounts: BankAccount[] = [];
    amanat: Amanat[] = [];
    
    // Counters
    transferIdCounter = 12345;
    expenseIdCounter = 1;
    cashboxRequestIdCounter = 1;
    foreignTransactionIdCounter = 1;
    bankAccountIdCounter = 1;
    amanatIdCounter = 1;
    partnerTransactionIdCounter = 1;

    constructor() {
        // Initial data
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
    }
}

const db = new MockDatabase();

// --- Helper Functions ---
const asyncResponse = <T>(data: T, delay = 300): Promise<T> =>
    new Promise(resolve => setTimeout(() => resolve(data), delay));

const asyncError = (message: string, delay = 300): Promise<{ error: string }> =>
    new Promise(resolve => setTimeout(() => resolve({ error: message }), delay));


export default class SarrafiApiService {
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
        };
        db.domesticTransfers.push(newTransfer);
        
        // Partner account integration
        const partner = db.partnerAccounts.find(p => p.name === payload.partnerSarraf);
        if (partner) {
            partner.balance -= payload.amount; // We owe them more now
            const partnerTx: PartnerTransaction = {
                id: `PTX-${db.partnerTransactionIdCounter++}`,
                partnerId: partner.id,
                timestamp: new Date(),
                type: 'debit', // we owe them
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
        if (![Role.Manager, Role.Domestic_Clerk, Role.Cashier].includes(payload.user.role)) {
            return asyncError("شما دسترسی لازم برای پرداخت حواله را ندارید.");
        }
        const transfer = db.domesticTransfers.find(t => t.id === payload.transferId);
        if (!transfer) return asyncError("حواله یافت نشد.");
        if (transfer.status !== TransferStatus.Executed) return asyncError("این حواله آماده پرداخت نیست.");
        
        const cashbox = db.cashboxBalances.find(cb => cb.currency === transfer.currency);
        if (!cashbox || cashbox.balance < transfer.amount) return asyncError("موجودی صندوق کافی نیست.");

        cashbox.balance -= transfer.amount;
        transfer.status = TransferStatus.Paid;
        transfer.history.push({ status: TransferStatus.Paid, timestamp: new Date(), user: payload.user.name });
        
        // Partner account integration (assuming this is an incoming transfer we pay on their behalf)
        const partner = db.partnerAccounts.find(p => p.name === transfer.partnerSarraf);
        if (partner) {
            partner.balance += transfer.amount; // They owe us more now
            const partnerTx: PartnerTransaction = {
                id: `PTX-${db.partnerTransactionIdCounter++}`,
                partnerId: partner.id,
                timestamp: new Date(),
                type: 'credit', // they owe us
                amount: transfer.amount,
                currency: transfer.currency,
                description: `پرداخت حواله ورودی کد ${transfer.id}`
            };
            db.partnerTransactions.push(partnerTx);
        }

        return asyncResponse(transfer);
    }
    
    // Expenses
    async getExpenses(): Promise<Expense[]> {
        return asyncResponse([...db.expenses]);
    }

    async createExpense(payload: CreateExpensePayload): Promise<Expense | { error: string }> {
        if (payload.user.role !== Role.Manager) {
            return asyncError("فقط مدیر میتواند هزینه ثبت کند.");
        }
        const cashbox = db.cashboxBalances.find(cb => cb.currency === payload.currency);
        if (!cashbox || cashbox.balance < payload.amount) return asyncError("موجودی صندوق برای این هزینه کافی نیست.");
        
        cashbox.balance -= payload.amount;
        const newExpense: Expense = {
            id: `EXP-${db.expenseIdCounter++}`,
            createdAt: new Date(),
            category: payload.category,
            description: payload.description,
            amount: payload.amount,
            currency: payload.currency,
            user: payload.user.name,
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
        return asyncResponse([...db.cashboxRequests]);
    }

    async createCashboxRequest(payload: CreateCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        const newRequest: CashboxRequest = {
            id: `CBR-${db.cashboxRequestIdCounter++}`,
            createdAt: new Date(),
            status: CashboxRequestStatus.Pending,
            requestType: payload.requestType,
            amount: payload.amount,
            currency: payload.currency,
            reason: payload.reason,
            requestedBy: payload.user.name,
        };
        db.cashboxRequests.push(newRequest);
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
            const cashbox = db.cashboxBalances.find(cb => cb.currency === request.currency);
            if(cashbox) {
                if(request.requestType === 'deposit') cashbox.balance += request.amount;
                else cashbox.balance -= request.amount;
            }
        }
        return asyncResponse(request);
    }
    
    // Foreign Transfers
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
        let cashboxRequestId: string | undefined = undefined;

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
                user: payload.user
            };
            const cashboxRequestResult = await this.createCashboxRequest(cashboxRequestPayload);
             if ('error' in cashboxRequestResult) {
                return asyncError(`خطا در ایجاد درخواست صندوق: ${cashboxRequestResult.error}`);
            }
            cashboxRequestId = cashboxRequestResult.id;
        }

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
            linkedCashboxRequestId: cashboxRequestId,
        };
        
        // Update bank account balance
        if (payload.transactionType === ForeignTransactionType.InternalBankTomanTransfer) {
            // This case needs more logic for debiting one and crediting another, skipped for now
        } else if ([ForeignTransactionType.SellBankTomanForForeignCash, ForeignTransactionType.SellBankTomanForTomanCash].includes(payload.transactionType)) {
            bankAccount.balance += payload.tomanAmount; // Toman received in our account
        } else {
            bankAccount.balance -= payload.tomanAmount; // Toman sent from our account
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
        // Customer gives us cash to hold, so we must request a deposit to our cashbox.
        const cashboxRequestPayload: CreateCashboxRequestPayload = {
            requestType: 'deposit',
            amount: payload.amount,
            currency: payload.currency,
            reason: `امانت دریافتی از ${payload.customerName} (کد: ${amanatId})`,
            user: payload.user,
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

        // We give cash back to the customer, so we must request a withdrawal from our cashbox.
        const cashboxRequestPayload: CreateCashboxRequestPayload = {
            requestType: 'withdrawal',
            amount: amanat.amount,
            currency: amanat.currency,
            reason: `بازگشت امانت به ${amanat.customerName} (کد: ${amanat.id})`,
            user: payload.user,
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

}