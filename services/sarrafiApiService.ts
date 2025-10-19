// A comprehensive mock API service that simulates a backend using localStorage.

import { 
    User, Role, Permissions, DomesticTransfer, CreateDomesticTransferPayload, 
    UpdateTransferStatusPayload, TransferStatus, PartnerAccount, PartnerTransaction, 
    SettlePartnerBalancePayload, Currency, Expense, CreateExpensePayload, CashboxRequest,
    CreateCashboxRequestPayload, ResolveCashboxRequestPayload, CashboxRequestStatus,
    CashboxBalance, SystemSettings, UpdateSystemSettingsPayload, ActivityLog,
    Customer, CustomerTransaction, AccountTransfer, CreateAccountTransferPayload, ReassignTransferPayload,
    BankAccount, AddBankAccountPayload,
    ForeignTransaction, LogForeignTransactionPayload, IncreaseCashboxBalancePayload,
    CreateUserPayload, UpdateUserPayload, DeleteUserPayload, CreateRolePayload, UpdateRolePayload, CreatePartnerPayload,
    UpdatePartnerPayload, DeletePartnerPayload, UpdateBankAccountPayload, DeleteBankAccountPayload,
    CreateCustomerPayload, UpdateCustomerPayload, FindTransfersByQueryPayload, PayoutIncomingTransferPayload,
    DashboardAnalyticsData, ProfitAndLossReportData, ReportType, CashboxSummaryReportData, GenerateReportPayload,
    SettlePartnerBalanceByNamePayload, GetPartnerAccountByNamePayload, Asset, ExpenseCategory, InternalCustomerExchangePayload,
    InternalLedgerReportData, CommissionTransfer, LogCommissionTransferPayload, ExecuteCommissionTransferPayload,
// FIX: Import types for Amanat feature
    Amanat, AmanatStatus, CreateAmanatPayload, ReturnAmanatPayload
} from '../types';
import { CURRENCIES } from '../constants';
import notificationService from './notificationService';
import { statusTranslations } from '../utils/translations';

// --- In-Memory Database with localStorage Persistence ---

class InMemoryDatabase {
    private static instance: InMemoryDatabase;
    private db: { [key: string]: any[] } = {};
    private isInitialized = false;

    private constructor() {
        this.init();
    }

    public static getInstance(): InMemoryDatabase {
        if (!InMemoryDatabase.instance) {
            InMemoryDatabase.instance = new InMemoryDatabase();
        }
        return InMemoryDatabase.instance;
    }

    private init() {
        if (this.isInitialized) return;
        const DB_VERSION = '2.1.0'; // Updated version to include EUR currency
        try {
            const storedVersion = localStorage.getItem('sarrafi_db_version');
            const storedDb = localStorage.getItem('sarrafi_db');

            // If version is mismatched, or if there's no stored DB (first time run), we must seed.
            if (storedVersion !== DB_VERSION || !storedDb) {
                console.log(`Database version mismatch or not found. Wiping and re-seeding to version ${DB_VERSION}.`);
                this.seed();
                localStorage.setItem('sarrafi_db_version', DB_VERSION);
            } else {
                // Version matches, load from storage as usual
                this.db = JSON.parse(storedDb);
                // Revive date objects from ISO strings after JSON.parse
                this.db.domesticTransfers?.forEach((t: any) => {
                    t.createdAt = new Date(t.createdAt);
                    t.history?.forEach((h: any) => h.timestamp = new Date(h.timestamp));
                });
                this.db.expenses?.forEach((e: any) => e.createdAt = new Date(e.createdAt));
                this.db.cashboxRequests?.forEach((r: any) => {
                    r.createdAt = new Date(r.createdAt);
                    if (r.resolvedAt) r.resolvedAt = new Date(r.resolvedAt);
                    if (r.reviewedAt) r.reviewedAt = new Date(r.reviewedAt);
                });
                this.db.partnerTransactions?.forEach((t: any) => t.timestamp = new Date(t.timestamp));
                this.db.customerTransactions?.forEach((t: any) => t.timestamp = new Date(t.timestamp));
                this.db.accountTransfers?.forEach((t: any) => t.timestamp = new Date(t.timestamp));
                this.db.foreignTransactions?.forEach((t: any) => t.timestamp = new Date(t.timestamp));
                this.db.commissionTransfers?.forEach((t: any) => {
                    t.createdAt = new Date(t.createdAt);
                    if (t.completedAt) t.completedAt = new Date(t.completedAt);
                });
                // FIX: Revive date objects for Amanat
                this.db.amanat?.forEach((a: any) => {
                    a.createdAt = new Date(a.createdAt);
                    if (a.returnedAt) a.returnedAt = new Date(a.returnedAt);
                });
                this.db.activityLogs?.forEach((l: any) => l.timestamp = new Date(l.timestamp));
            }
        } catch (error) {
            console.error("Failed to initialize database, seeding new data.", error);
            this.seed();
            localStorage.setItem('sarrafi_db_version', DB_VERSION);
        }
        this.isInitialized = true;
    }
    
    private save() {
        try {
            localStorage.setItem('sarrafi_db', JSON.stringify(this.db));
        } catch (error) {
            console.error("Failed to save database to localStorage.", error);
        }
    }
    
    public get<T>(table: string): T[] {
        return this.db[table] || [];
    }

    public getById<T extends {id: string}>(table: string, id: string): T | undefined {
        return this.get<T>(table).find(item => item.id === id);
    }
    
    public add<T extends {id: string}>(table: string, item: T): T {
        if (!this.db[table]) {
            this.db[table] = [];
        }
        this.db[table].push(item);
        this.save();
        return item;
    }

    public update<T extends {id: string}>(table: string, id: string, updates: Partial<T>): T | undefined {
        const items = this.get<T>(table);
        const itemIndex = items.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            items[itemIndex] = { ...items[itemIndex], ...updates };
            this.save();
            return items[itemIndex];
        }
        return undefined;
    }
    
    public delete(table: string, id: string): boolean {
        // FIX: Directly access and filter the array in the database.
        // This prevents the generic `get<T>` method from potentially narrowing the array's type
        // to `{id: string}[]`, which would strip all other properties from the objects and
        // cause data corruption issues.
        const items = this.db[table] || [];
        const initialLength = items.length;
        this.db[table] = items.filter(item => item && item.id !== id);
        const success = this.db[table].length < initialLength;
        if (success) {
            this.save();
        }
        return success;
    }
    
    public replaceDb(newDbState: object) {
        this.db = { ...newDbState };
        this.save();
    }
    
    public getDbState() {
        return this.db;
    }


    private seed() {
        // Default permissions
        const adminPermissions: Permissions = {
            dashboard: { view: true }, cashbox: { view: true, create: true, approve: true },
            domesticTransfers: { view: true, create: true, edit: true, process: true },
            foreignTransfers: { view: true, create: true, edit: true, delete: true },
            commissionTransfers: { view: true, create: true, process: true },
            accountTransfers: { view: true, create: true }, customers: { view: true, create: true, edit: true },
            partnerAccounts: { view: true, create: true, edit: true, delete: true }, expenses: { view: true, create: true },
            reports: { view: true }, settings: { view: true, edit: true },
            amanat: { view: true, create: true, process: true },
        };
        const operatorPermissions: Permissions = {
            dashboard: { view: true }, cashbox: { view: true, create: true },
            domesticTransfers: { view: true, create: true, edit: true, process: true },
            foreignTransfers: { view: true, create: true },
            commissionTransfers: { view: true, create: true, process: true },
            accountTransfers: { view: true, create: true }, customers: { view: true, create: true, edit: true },
            partnerAccounts: { view: true }, expenses: { view: true, create: true },
            reports: { view: true }, settings: {},
            amanat: { view: true, create: true },
        };
        
        const roles: Role[] = [
            { id: 'role-1', name: 'مدیر کل', permissions: adminPermissions },
            { id: 'role-2', name: 'کارمند', permissions: operatorPermissions }
        ];

        const users: User[] = [
            { id: 'user-1', name: 'مدیر سیستم', username: 'admin', password: 'admin', roleId: 'role-1' },
            { id: 'user-2', name: 'کارمند', username: 'user', password: '123', roleId: 'role-2' }
        ];
        
        // Test data removed as per user request, only essential accounts remain.
        const customers: Customer[] = [
            { id: 'cust-suspense', name: 'حساب معلق سیستم', code: '_SUSPENSE_', whatsappNumber: '+93000000000', balances: {} }
        ];

        const partners: PartnerAccount[] = [];
        
        const cashboxBalances: CashboxBalance[] = [
            { currency: Currency.USD, balance: 0 },
            { currency: Currency.AFN, balance: 0 },
            { currency: Currency.PKR, balance: 0 },
            { currency: Currency.EUR, balance: 0 },
            { currency: Currency.IRT_CASH, balance: 0 },
        ];
        
        const bankAccounts: BankAccount[] = [
            { id: 'ba-1', accountHolder: 'شرکت صرافی', bankName: 'بانک ملت', accountNumber: '123456789', balance: 0, currency: Currency.IRT_BANK, status: 'Active' }
        ];

        const settings: SystemSettings = {
            approvalThresholds: {
                [Currency.USD]: 1000,
                [Currency.AFN]: 100000
            }
        };

        this.db = {
            users, roles, customers, partnerAccounts: partners, cashboxBalances,
            systemSettings: [settings], domesticTransfers: [], expenses: [],
            cashboxRequests: [], partnerTransactions: [], customerTransactions: [],
            accountTransfers: [], bankAccounts, foreignTransactions: [],
            commissionTransfers: [],
            amanat: [],
            activityLogs: [{id: 'log-0', timestamp: new Date(), user: 'سیستم', action: 'پایگاه داده با اطلاعات پاکسازی شده راه‌اندازی شد.'}]
        };

        this.save();
    }
}

// --- Sarrafi API Service ---

class SarrafiApiService {
    private db = InMemoryDatabase.getInstance();

    private logActivity(user: string, action: string) {
        const log: ActivityLog = { id: `log-${Date.now()}`, timestamp: new Date(), user, action };
        this.db.add('activityLogs', log);
    }

    private generateId(prefix: string): string {
        return `${prefix}-${Date.now().toString().slice(-6)}`;
    }
    
    // --- Auth ---
    async login(username: string, password?: string): Promise<User | { error: string }> {
        const user = this.db.get<User>('users').find(u => u.username === username && u.password === password);
        if (user) {
            const role = this.db.getById<Role>('roles', user.roleId);
            return { ...user, role };
        }
        return { error: 'نام کاربری یا رمز عبور اشتباه است.' };
    }

    // --- Users & Roles ---
    async getUsers(): Promise<User[]> { return this.db.get<User>('users'); }
    async createUser(payload: CreateUserPayload): Promise<User> {
        const newUser: User = { ...payload, id: this.generateId('user') };
        return this.db.add('users', newUser);
    }
    async updateUser(payload: UpdateUserPayload): Promise<User | undefined> {
        const { id, ...updates } = payload;
        if (!updates.password) delete updates.password;
        return this.db.update<User>('users', id, updates);
    }
    async deleteUser(payload: DeleteUserPayload): Promise<{ success: boolean }> {
        return { success: this.db.delete('users', payload.id) };
    }
    
    async getRoles(): Promise<Role[]> { return this.db.get<Role>('roles'); }
    async createRole(payload: CreateRolePayload): Promise<Role> {
        const newRole: Role = { ...payload, id: this.generateId('role') };
        return this.db.add('roles', newRole);
    }
    async updateRole(payload: UpdateRolePayload): Promise<Role | undefined> {
        return this.db.update<Role>('roles', payload.id, payload);
    }
    async deleteRole(payload: {id: string}): Promise<{ success: boolean }> {
        return { success: this.db.delete('roles', payload.id) };
    }

    // --- Customers ---
    async getCustomers(): Promise<Customer[]> { return this.db.get<Customer>('customers'); }
    // FIX: Explicitly provide the generic type to `getById` to ensure the full Customer object is returned.
    async getCustomerById(id: string): Promise<Customer | undefined> { return this.db.getById<Customer>('customers', id); }
    async getCustomerByCode(code: string): Promise<Customer | undefined> {
        return this.db.get<Customer>('customers').find(c => c.code === code);
    }
    // FIX: Added validation and updated return type to match UI expectations.
    async createCustomer(payload: CreateCustomerPayload): Promise<Customer | { error: string }> {
        const existing = this.db.get<Customer>('customers').find(c => c.code === payload.code);
        if (existing) return { error: `مشتری با کد ${payload.code} از قبل وجود دارد.` };
// FIX: Ensure the 'balances' property is not optional to match the 'Customer' type.
        const newCustomer: Customer = { ...payload, id: this.generateId('cust'), balances: payload.balances || {} };
        return this.db.add('customers', newCustomer);
    }
     async updateCustomer(payload: UpdateCustomerPayload): Promise<Customer | { error: string }> {
        this.logActivity(payload.user.name, `اطلاعات مشتری ${payload.name} (کد: ${payload.code}) را ویرایش کرد.`);
        const { id, user, ...customerData } = payload;
        const updated = this.db.update<Customer>('customers', id, customerData);
        return updated || { error: 'Customer not found' };
    }
    
    // --- Domestic Transfers ---
    async getDomesticTransfers(): Promise<DomesticTransfer[]> { return this.db.get<DomesticTransfer>('domesticTransfers'); }
    async getDomesticTransferById(id: string): Promise<DomesticTransfer | undefined> { return this.db.getById<DomesticTransfer>('domesticTransfers', id); }
    
    async createDomesticTransfer(payload: CreateDomesticTransferPayload): Promise<DomesticTransfer | { error: string }> {
        // Prevent creation of dual-identity transfers
        if (payload.isCashPayment && payload.partnerReference) {
            return { error: 'یک حواله نمی‌تواند همزمان ورودی (دارای کد همکار) و پرداخت نقدی باشد.' };
        }

        const newTransfer: DomesticTransfer = {
            id: this.generateId('DT'),
            createdAt: new Date(),
            sender: { name: payload.senderName, tazkereh: payload.senderTazkereh },
            receiver: { name: payload.receiverName, tazkereh: payload.receiverTazkereh },
            amount: payload.amount,
            currency: payload.currency,
            commission: payload.commission,
            destinationProvince: payload.destinationProvince,
            partnerSarraf: payload.partnerSarraf,
            partnerReference: payload.partnerReference,
            status: TransferStatus.Unexecuted,
            createdBy: payload.user.name,
            history: [{ status: TransferStatus.Unexecuted, timestamp: new Date(), user: payload.user.name }]
        };

        // Handle payment method & transfer type
        // If partnerReference exists, it's an INCOMING transfer. No financial action on creation.
        if (payload.partnerReference) {
            // This is the registration of an incoming transfer.
            // Financials (cashbox withdrawal & partner balance update) will be handled upon execution.
        }
        // If it's an OUTGOING transfer...
        else if (payload.isCashPayment) {
            // Create a cashbox deposit request for the cash received from a walk-in customer.
            const reason = `واریز نقدی برای حواله خروجی ${newTransfer.id} به نام ${newTransfer.receiver.name}`;
            await this.createCashboxRequest({
                requestType: 'deposit',
                amount: payload.amount + payload.commission,
                currency: payload.currency,
                reason: reason,
                user: payload.user,
                linkedEntity: {type: 'DomesticTransfer', id: newTransfer.id, description: reason}
            });
        } else {
            // It's an OUTGOING transfer from a customer's account. Link the customer ID.
            // The financial transaction (debit from customer) will happen upon execution.
            const customer = await this.getCustomerByCode(payload.customerCode!);
            if (!customer) return { error: 'مشتری با این کد یافت نشد.' };
            newTransfer.customerId = customer.id;
        }

        this.logActivity(payload.user.name, `حواله ${newTransfer.id} را به مبلغ ${payload.amount} ${payload.currency} ایجاد کرد.`);
        return this.db.add('domesticTransfers', newTransfer);
    }

    async updateTransferStatus(payload: UpdateTransferStatusPayload): Promise<DomesticTransfer | { error: string }> {
        const transfer = this.db.getById<DomesticTransfer>('domesticTransfers', payload.transferId);
        if (!transfer) return { error: "حواله یافت نشد." };

        const validTransitions: { [key in TransferStatus]?: TransferStatus[] } = {
            [TransferStatus.Unexecuted]: [TransferStatus.Executed, TransferStatus.Cancelled],
        };

        if (validTransitions[transfer.status] && !validTransitions[transfer.status]!.includes(payload.newStatus)) {
            return { error: `تغییر وضعیت از '${statusTranslations[transfer.status]}' به '${statusTranslations[payload.newStatus]}' مجاز نیست.` };
        }
        if (!validTransitions[transfer.status]) {
             return { error: `حواله در وضعیت نهایی (${statusTranslations[transfer.status]}) قرار دارد و قابل تغییر نیست.` };
        }

        const originalStatus = transfer.status;
        
        // --- Handle Financial Transactions ONLY upon execution ---
        if (payload.newStatus === TransferStatus.Executed) {
            const isIncoming = !!transfer.partnerReference;

            // Step 1: Handle customer debit for outgoing transfers
            if (!isIncoming && transfer.customerId) {
                const customer = await this.getCustomerById(transfer.customerId);
                if (!customer) return { error: 'مشتری مرتبط با این حواله یافت نشد.' };
                
                const totalDeduction = transfer.amount + transfer.commission;
                const desc = `بابت اجرای حواله ${transfer.id} (مبلغ: ${transfer.amount}, کارمزد: ${transfer.commission})`;
                this._updateCustomerBalance(customer.id, -totalDeduction, transfer.currency, 'debit', desc, transfer.id, 'DomesticTransfer');
            }

            // Step 2: Handle partner and cashbox transactions
            const partner = await this.getPartnerAccountByName({ partnerName: transfer.partnerSarraf });
            if ('error' in partner) return { error: `همکار با نام '${transfer.partnerSarraf}' یافت نشد.` };

            if (isIncoming) {
                // This is a transfer sent TO us. We are paying it out (Executing it).
                
                // SECURITY CHECK: Ensure cashbox has sufficient funds before proceeding.
                const balances = this.db.get<CashboxBalance>('cashboxBalances');
                const balance = balances.find(b => b.currency === transfer.currency);
                const currentBalance = balance ? balance.balance : 0;

                if (currentBalance < transfer.amount) {
                    return { error: `موجودی صندوق ${transfer.currency} برای پرداخت این حواله کافی نیست. موجودی فعلی: ${new Intl.NumberFormat('en-US').format(currentBalance)}` };
                }

                const reason = `پرداخت به مشتری برای حواله ورودی ${transfer.id} از طرف ${transfer.partnerSarraf}`;
                await this.createCashboxRequest({
                    requestType: 'withdrawal',
                    amount: transfer.amount,
                    currency: transfer.currency,
                    reason, user: payload.user,
                    linkedEntity: { type: 'DomesticTransfer', id: transfer.id, description: reason }
                });
                this._updatePartnerBalance(partner.id, -transfer.amount, transfer.currency, 'debit', `پرداخت حواله ${transfer.id}`, transfer.id);

            } else {
                // This is a transfer sent FROM us. Our partner paid it out (Executed it).
                this._updatePartnerBalance(partner.id, transfer.amount, transfer.currency, 'credit', `اجرای حواله ${transfer.id}`, transfer.id);
            }
             // Send notification if it was an outgoing transfer from a customer account
            if (!isIncoming && transfer.customerId) {
                const customer = await this.getCustomerById(transfer.customerId);
                if (customer?.whatsappNumber) {
                    notificationService.sendWhatsAppNotification(customer.whatsappNumber, `حواله شما با کد ${transfer.id} به مبلغ ${transfer.amount} ${transfer.currency} به گیرنده پرداخت شد. SarrafAI`);
                }
            }
        }
        
        // Update status after all financial logic is successfully completed
        transfer.status = payload.newStatus;
        transfer.history.push({ status: payload.newStatus, timestamp: new Date(), user: payload.user.name });

        this.logActivity(payload.user.name, `وضعیت حواله ${transfer.id} را از ${statusTranslations[originalStatus]} به ${statusTranslations[payload.newStatus]} تغییر داد.`);
        return this.db.update<DomesticTransfer>('domesticTransfers', transfer.id, transfer) as DomesticTransfer;
    }
    
    async findTransfersByQuery(payload: FindTransfersByQueryPayload): Promise<DomesticTransfer[] | { error: string }> {
        const query = payload.query.toLowerCase().trim();
        if (!query) return [];

        const allTransfers = this.db.get<DomesticTransfer>('domesticTransfers');
        
        const results = allTransfers.filter(t => 
            t.id.toLowerCase().includes(query) ||
            (t.partnerReference && t.partnerReference.toLowerCase().includes(query)) ||
            t.sender.name.toLowerCase().includes(query) ||
            t.receiver.name.toLowerCase().includes(query)
        );

        return results;
    }

    async payoutIncomingTransfer(payload: PayoutIncomingTransferPayload): Promise<DomesticTransfer | { error: string }> {
        return this.updateTransferStatus({ ...payload, newStatus: TransferStatus.Executed });
    }

    // --- Partner Accounts ---
    async getPartnerAccounts(): Promise<PartnerAccount[]> { return this.db.get<PartnerAccount>('partnerAccounts'); }
    // FIX: Explicitly provide the generic type to `getById` to ensure the full PartnerAccount object is returned.
    async getPartnerAccountById(id: string): Promise<PartnerAccount | undefined> { return this.db.getById<PartnerAccount>('partnerAccounts', id); }
    async getTransactionsForPartner(partnerId: string): Promise<PartnerTransaction[]> {
        return this.db.get<PartnerTransaction>('partnerTransactions').filter(t => t.partnerId === partnerId);
    }
    
    // --- Cashbox ---
    async getCashboxRequests(): Promise<CashboxRequest[]> { return this.db.get<CashboxRequest>('cashboxRequests'); }
    // FIX: Explicitly provide the generic type to `getById` to ensure the full CashboxRequest object is returned.
    async getCashboxRequestById(id: string): Promise<CashboxRequest | undefined> { return this.db.getById<CashboxRequest>('cashboxRequests', id); }
    async getCashboxBalances(): Promise<CashboxBalance[]> { return this.db.get<CashboxBalance>('cashboxBalances'); }

    // FIX: Added validation for customer code and updated return type to match UI expectations.
    async createCashboxRequest(payload: CreateCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        if (payload.customerCode) {
            const customer = this.db.get<Customer>('customers').find(c => c.code === payload.customerCode);
            if (!customer) {
                return { error: `مشتری با کد ${payload.customerCode} یافت نشد.` };
            }
        }

        const settings = this.db.get<SystemSettings>('systemSettings')[0];
        const threshold = settings.approvalThresholds[payload.currency] ?? 0;
        const status = payload.amount <= threshold ? CashboxRequestStatus.AutoApproved : CashboxRequestStatus.Pending;

        const newRequest: CashboxRequest = {
            id: this.generateId('CBR'),
            createdAt: new Date(),
            requestedBy: payload.user.name,
            status: status,
            reviewed: false,
            ...payload
        };
        
        if (status === CashboxRequestStatus.AutoApproved) {
            this._processCashboxRequest(newRequest);
        }

        this.logActivity(payload.user.name, `یک درخواست ${payload.requestType} به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return this.db.add('cashboxRequests', newRequest);
    }
    
    async resolveCashboxRequest(payload: ResolveCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        const request = this.db.getById<CashboxRequest>('cashboxRequests', payload.requestId);
        if (!request) return { error: "Request not found." };
        if (request.status !== CashboxRequestStatus.Pending) return { error: "Request already resolved." };

        const newStatus = payload.resolution === 'approve' ? CashboxRequestStatus.Approved : CashboxRequestStatus.Rejected;
        request.status = newStatus;
        request.resolvedBy = payload.user.name;
        request.resolvedAt = new Date();

        if (newStatus === CashboxRequestStatus.Approved) {
            this._processCashboxRequest(request);
        }
        
        this.logActivity(payload.user.name, `درخواست صندوق ${request.id} را ${newStatus === 'Approved' ? 'تایید' : 'رد'} کرد.`);
        const updatedRequest = this.db.update<CashboxRequest>('cashboxRequests', request.id, request);
        return updatedRequest || { error: 'Failed to update request' };
    }

    async increaseCashboxBalance(payload: IncreaseCashboxBalancePayload): Promise<CashboxRequest | { error: string }> {
        if (payload.amount <= 0) {
            return { error: 'مبلغ باید بیشتر از صفر باشد.' };
        }

        const reason = `افزایش موجودی دستی توسط مدیر: ${payload.description || 'ثبت موجودی اولیه/جدید'}`;
        
        const requestPayload: CreateCashboxRequestPayload = {
            requestType: 'deposit',
            amount: payload.amount,
            currency: payload.currency,
            reason,
            user: payload.user,
            linkedEntity: {
                type: 'Manual',
                id: 'BALANCE_ADJUST',
                description: reason
            }
        };

        const result = await this.createCashboxRequest(requestPayload);

        if (!('error' in result)) {
            this.logActivity(payload.user.name, `موجودی صندوق ${payload.currency} را به مبلغ ${payload.amount} افزایش داد.`);
        }

        return result;
    }

    private _processCashboxRequest(request: CashboxRequest) {
        const multiplier = request.requestType === 'deposit' ? 1 : -1;
        this._updateCashboxBalance(request.currency, request.amount * multiplier);

        if (request.customerCode) {
            const customer = this.db.get<Customer>('customers').find(c => c.code === request.customerCode);
            if(customer) {
                const type = request.requestType === 'deposit' ? 'credit' : 'debit';
                 this._updateCustomerBalance(customer.id, request.amount, request.currency, type, request.reason, request.id, type === 'credit' ? 'CashDeposit' : 'CashWithdrawal');
            }
        }
    }
    
    private _updateCashboxBalance(currency: Currency, amount: number) {
        const balances = this.db.get<CashboxBalance>('cashboxBalances');
        const balance = balances.find(b => b.currency === currency);
        if (balance) {
            balance.balance += amount;
        }
    }

    private _updateCustomerBalance(customerId: string, amount: number, currency: Currency, type: 'credit' | 'debit', description: string, linkedEntityId: string, linkedEntityType: CustomerTransaction['linkedEntityType']): CustomerTransaction {
        const customer = this.db.getById<Customer>('customers', customerId);
        if (!customer) throw new Error("Customer not found for balance update");
        
        const amountChange = type === 'credit' ? Math.abs(amount) : -Math.abs(amount);
        const newBalance = (customer.balances[currency] || 0) + amountChange;
        customer.balances[currency] = newBalance;
        this.db.update<Customer>('customers', customerId, { balances: customer.balances });
        
        const transaction: CustomerTransaction = {
            id: this.generateId('CT'),
            customerId,
            timestamp: new Date(),
            type,
            amount: Math.abs(amount),
            currency,
            description,
            linkedEntityId,
            linkedEntityType
        };
        return this.db.add('customerTransactions', transaction);
    }

    private _updatePartnerBalance(partnerId: string, amount: number, currency: Currency, type: 'credit' | 'debit', description: string, linkedTransferId?: string) {
        const partner = this.db.getById<PartnerAccount>('partnerAccounts', partnerId);
        if (!partner) return;

        // Corrected logic: The 'amount' parameter directly represents the change in balance.
        // Positive amount means our liability increases (credit).
        // Negative amount means our liability decreases (debit).
        const newBalance = (partner.balances[currency] || 0) + amount;
        partner.balances[currency] = newBalance;
        this.db.update<PartnerAccount>('partnerAccounts', partnerId, { balances: partner.balances });
        
        const transaction: PartnerTransaction = {
            id: this.generateId('PT'),
            partnerId: partner.id,
            timestamp: new Date(),
            type,
            amount: Math.abs(amount),
            currency,
            description,
            linkedTransferId,
        };
        this.db.add('partnerTransactions', transaction);
    }
    
    // --- Expenses ---
    async getExpenses(): Promise<Expense[]> { return this.db.get<Expense>('expenses'); }
    async createExpense(payload: CreateExpensePayload): Promise<Expense | { error: string }> {
         const { user, skipCashboxRequest, ...expenseData } = payload;
         const expenseId = this.generateId('EXP');
        
        const newExpense: Expense = {
            id: expenseId,
            createdAt: new Date(),
            user: user.name,
            ...expenseData,
        };

        if(!skipCashboxRequest) {
            const reason = `بابت هزینه: ${payload.description}`;
            const cashRequest = await this.createCashboxRequest({
                requestType: 'withdrawal',
                amount: payload.amount,
                currency: payload.currency,
                reason,
                user: payload.user,
                linkedEntity: { type: 'Expense', id: expenseId, description: reason }
            });
            if ('error' in cashRequest) {
                // This shouldn't happen if validation is correct, but handle it.
                return cashRequest;
            }
            newExpense.linkedCashboxRequestId = cashRequest.id;
        }
        
        this.logActivity(payload.user.name, `هزینه ای به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return this.db.add('expenses', newExpense);
    }
    
    // --- Reports & Analytics ---
    async getActivityLogs(): Promise<ActivityLog[]> { 
        return this.db.get<ActivityLog>('activityLogs').sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50); 
    }
    
    async getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
        // This is a mock. A real implementation would query and aggregate data.
        const expenses = this.db.get<Expense>('expenses');
        const expensesByCategory = expenses.reduce((acc, exp) => {
            const item = acc.find(i => i.label === exp.category);
            if(item) item.value += exp.amount;
            else acc.push({ label: exp.category, value: exp.amount });
            return acc;
        }, [] as {label: string, value: number}[]);

        const partnerActivity = this.db.get<PartnerAccount>('partnerAccounts').map(p => ({
            label: p.name,
            value: Math.floor(Math.random() * 50) + 5 // random data
        }));

        const profitLossTrend = [
            { month: 'Jan', revenue: 5000, expenses: 2000 }, { month: 'Feb', revenue: 7000, expenses: 2500 },
            { month: 'Mar', revenue: 6000, expenses: 3000 }, { month: 'Apr', revenue: 8000, expenses: 2800 }
        ];

        return { expensesByCategory, partnerActivity, profitLossTrend };
    }

    // --- Placeholder for other methods ---
    async getSystemSettings(): Promise<SystemSettings> { return this.db.get<SystemSettings>('systemSettings')[0]; }
    async updateSystemSettings(payload: UpdateSystemSettingsPayload): Promise<SystemSettings> {
        const dbState = this.db.getDbState() as any;
        dbState.systemSettings = [payload.settings];
        this.db.replaceDb(dbState);
        return payload.settings;
    }
    
    async getFullBusinessContextAsText(): Promise<string> {
        const data = {
            customers: this.db.get('customers'),
            partners: this.db.get('partnerAccounts'),
            cashbox: this.db.get('cashboxBalances'),
            recentTransfers: this.db.get('domesticTransfers').slice(-10)
        };
        return JSON.stringify(data, null, 2);
    }
    
    async getBackupState(): Promise<object> {
        return this.db.getDbState();
    }

    async restoreState(state: object): Promise<{ success: boolean }> {
        this.db.replaceDb(state);
        return { success: true };
    }

    // --- Other methods from payloads ---
    async getTransactionsForCustomer(customerId: string): Promise<CustomerTransaction[]> {
        return this.db.get<CustomerTransaction>('customerTransactions').filter(t => t.customerId === customerId);
    }
    async getPartnerAccountByName(payload: GetPartnerAccountByNamePayload): Promise<PartnerAccount | {error: string}> {
        const partner = this.db.get<PartnerAccount>('partnerAccounts').find(p => p.name === payload.partnerName);
        return partner || { error: 'Partner not found' };
    }
    async settlePartnerBalance(payload: SettlePartnerBalancePayload): Promise<PartnerTransaction | { error: string }> {
        const partner = this.db.getById<PartnerAccount>('partnerAccounts', payload.partnerId);
        if (!partner) return { error: "Partner not found." };
    
        const amount = payload.amount;
        const currency = payload.currency;
        
        const type = amount >= 0 ? 'credit' : 'debit';
    
        const newBalance = (partner.balances[currency] || 0) + amount;
        partner.balances[currency] = newBalance;
        this.db.update<PartnerAccount>('partnerAccounts', partner.id, { balances: partner.balances });
    
        const transaction: PartnerTransaction = {
            id: this.generateId('PT'),
            partnerId: partner.id,
            timestamp: new Date(),
            type: type,
            amount: Math.abs(amount),
            currency: currency,
            description: `تسویه حساب توسط ${payload.user.name}`,
        };
        
        this.logActivity(payload.user.name, `تسویه حساب با ${partner.name} به مبلغ ${amount} ${currency} را ثبت کرد.`);
        return this.db.add('partnerTransactions', transaction);
    }
     async settlePartnerBalanceByName(payload: SettlePartnerBalanceByNamePayload): Promise<PartnerTransaction | { error: string }> {
        const partner = this.db.get<PartnerAccount>('partnerAccounts').find(p => p.name === payload.partnerName);
        if (!partner) return { error: 'Partner not found' };
        
        const settlePayload: SettlePartnerBalancePayload = {
            partnerId: partner.id,
            amount: payload.amount,
            currency: payload.currency,
            user: payload.user
        };
        return this.settlePartnerBalance(settlePayload);
    }
    async createAccountTransfer(payload: CreateAccountTransferPayload): Promise<AccountTransfer | { error: string }> {
        const fromCustomer = await this.getCustomerByCode(payload.fromCustomerCode);
        const toCustomer = await this.getCustomerByCode(payload.toCustomerCode);
        if (!fromCustomer || !toCustomer) return { error: "Customer not found" };

        const debitDesc = `انتقال به ${toCustomer.name} (کد: ${toCustomer.code})`;
        const creditDesc = `انتقال از ${fromCustomer.name} (کد: ${fromCustomer.code})`;

        this._updateCustomerBalance(fromCustomer.id, payload.amount, payload.currency, 'debit', debitDesc, '', 'AccountTransfer');
        this._updateCustomerBalance(toCustomer.id, payload.amount, payload.currency, 'credit', creditDesc, '', 'AccountTransfer');

        const newTransfer: AccountTransfer = {
            id: this.generateId('AT'),
            timestamp: new Date(),
            fromCustomerId: fromCustomer.id,
            toCustomerId: toCustomer.id,
            amount: payload.amount,
            currency: payload.currency,
            description: payload.description,
            user: payload.user.name,
            status: payload.isPendingAssignment ? 'PendingAssignment' : 'Completed',
            debitTransactionId: '', // Would be set in a real scenario
            creditTransactionId: '',
        };
        this.logActivity(payload.user.name, `مبلغ ${payload.amount} ${payload.currency} را از ${fromCustomer.name} به ${toCustomer.name} انتقال داد.`);
        return this.db.add('accountTransfers', newTransfer);
    }
    async getAccountTransfers(): Promise<AccountTransfer[]> { return this.db.get('accountTransfers'); }
    async reassignPendingTransfer(payload: ReassignTransferPayload): Promise<AccountTransfer | { error: string }> { return { error: "Not implemented" }; }
    
    // FIX: Added validation and updated return type to match UI expectations.
    async addBankAccount(payload: AddBankAccountPayload): Promise<BankAccount | { error: string }> {
        const existing = this.db.get<BankAccount>('bankAccounts').find(b => b.accountNumber === payload.accountNumber && b.bankName === payload.bankName);
        if (existing) return { error: `حساب بانکی با این شماره حساب و نام بانک از قبل وجود دارد.` };
        
        const { user, ...accountData } = payload;
        const newAccount: BankAccount = {
            ...accountData,
            id: this.generateId('BA'),
            balance: payload.initialBalance,
            status: 'Active',
        };
        this.logActivity(user.name, `حساب بانکی جدیدی برای ${payload.accountHolder} در بانک ${payload.bankName} ثبت کرد.`);
        return this.db.add('bankAccounts', newAccount);
    }

    async getBankAccounts(): Promise<BankAccount[]> { return this.db.get('bankAccounts'); }

    // FIX: Added validation and updated return type to match UI expectations.
    async createPartner(payload: CreatePartnerPayload): Promise<PartnerAccount | { error: string }> {
        const existing = this.db.get<PartnerAccount>('partnerAccounts').find(p => p.name === payload.name);
        if (existing) return { error: `همکار با نام "${payload.name}" از قبل وجود دارد.` };

        const { user, ...partnerData } = payload;
        const newPartner: PartnerAccount = {
            ...partnerData,
            id: this.generateId('PA'),
            status: 'Active',
        };
        this.logActivity(user.name, `همکار جدیدی با نام "${payload.name}" در ولایت ${payload.province} ثبت کرد.`);
        return this.db.add('partnerAccounts', newPartner);
    }

    async updatePartner(payload: UpdatePartnerPayload): Promise<PartnerAccount | { error: string}> {
        const { id, user, ...partnerData } = payload;
        const updated = this.db.update<PartnerAccount>('partnerAccounts', id, partnerData);
        if (updated) {
            this.logActivity(user.name, `اطلاعات همکار "${updated.name}" را ویرایش کرد.`);
            return updated;
        }
        return { error: 'Partner not found' };
    }

    async deletePartner(payload: DeletePartnerPayload): Promise<PartnerAccount | { error: string }> {
        const updated = this.db.update<PartnerAccount>('partnerAccounts', payload.id, { status: 'Inactive' });
        if (updated) {
            // FIX: The 'user' object is available on the payload, not in the global scope.
            this.logActivity(payload.user.name, `همکار "${updated.name}" را غیرفعال کرد.`);
            return updated;
        }
        return { error: 'Partner not found' };
    }

    async updateBankAccount(payload: UpdateBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { id, user, ...accountData } = payload;
        const updated = this.db.update<BankAccount>('bankAccounts', id, accountData);
        if (updated) {
            this.logActivity(user.name, `اطلاعات حساب بانکی "${updated.accountHolder} - ${updated.bankName}" را ویرایش کرد.`);
            return updated;
        }
        return { error: 'Bank account not found' };
    }

    async deleteBankAccount(payload: DeleteBankAccountPayload): Promise<BankAccount | { error: string }> {
        const updated = this.db.update<BankAccount>('bankAccounts', payload.id, { status: 'Inactive' });
        if(updated) {
            // FIX: Cannot find name 'user'. The 'user' object is available on the payload.
            this.logActivity(payload.user.name, `حساب بانکی "${updated.accountHolder} - ${updated.bankName}" را غیرفعال کرد.`);
            return updated;
        }
        return { error: 'Bank account not found' };
    }
    
    // --- Exchanges (Formerly Foreign Transfers) ---

    private _getAllAssets(): Asset[] {
        const cashboxAssets = this.db.get<CashboxBalance>('cashboxBalances').map(cb => ({
            id: `cashbox_${cb.currency}`,
            name: `صندوق ${cb.currency}`,
            currency: cb.currency,
        }));
        const bankAssets = this.db.get<BankAccount>('bankAccounts')
          .filter(ba => ba.status === 'Active')
          .map(ba => ({
            id: `bank_${ba.id}`,
            name: `${ba.bankName} - ${ba.accountHolder}`,
            currency: ba.currency,
        }));
        return [...cashboxAssets, ...bankAssets];
    }
    async getAvailableAssets(): Promise<Asset[]> {
        return this._getAllAssets();
    }

// FIX: Fix for TS error on line 976
// Create explicitly typed update object to avoid issues with strict object literal checking.
    private _updateAssetBalance(assetId: string, amountChange: number): { success: boolean, error?: string } {
        const [type, id] = assetId.split(/_(.*)/s);
        
        if (type === 'cashbox') {
            const currency = id as Currency;
            const balances = this.db.get<CashboxBalance>('cashboxBalances');
            const balance = balances.find(b => b.currency === currency);
            if (balance) {
                balance.balance += amountChange;
                return { success: true };
            }
            return { success: false, error: 'صندوق یافت نشد' };
        } else if (type === 'bank') {
            const bankAccount = this.db.getById<BankAccount>('bankAccounts', id);
            if (bankAccount) {
                bankAccount.balance += amountChange;
                // FIX: Explicitly create a typed object to prevent TypeScript from incorrectly inferring the update payload type.
                const updates: Partial<BankAccount> = { balance: bankAccount.balance };
                this.db.update<BankAccount>('bankAccounts', id, updates);
                return { success: true };
            }
            return { success: false, error: 'حساب بانکی یافت نشد' };
        }
        return { success: false, error: 'نوع دارایی نامعتبر است' };
    }
    
    async logForeignTransaction(payload: LogForeignTransactionPayload): Promise<ForeignTransaction | { error: string }> {
        const { user, description, fromAssetId, fromAmount, toAssetId, toAmount } = payload;
        
        const allAssets = this._getAllAssets();
        const fromAsset = allAssets.find(a => a.id === fromAssetId);
        const toAsset = allAssets.find(a => a.id === toAssetId);

        if (!fromAsset || !toAsset) return { error: 'دارایی مبدا یا مقصد نامعتبر است.' };
        if (fromAmount <= 0 || toAmount <= 0) return { error: 'مبالغ باید مثبت باشند.' };

        // 1. Update internal asset balances
        const fromUpdateResult = this._updateAssetBalance(fromAssetId, -fromAmount);
        if (!fromUpdateResult.success) return { error: fromUpdateResult.error };

        const toUpdateResult = this._updateAssetBalance(toAssetId, toAmount);
        if (!toUpdateResult.success) {
            this._updateAssetBalance(fromAssetId, fromAmount); // Rollback
            return { error: toUpdateResult.error };
        }
        
        const newTransaction: ForeignTransaction = {
            id: this.generateId('FT'),
            timestamp: new Date(),
            description,
            fromAsset: fromAsset.name,
            fromCurrency: fromAsset.currency,
            fromAmount,
            toAsset: toAsset.name,
            toCurrency: toAsset.currency,
            toAmount,
            user: user.name,
        };

        this.logActivity(user.name, `تبادله ${fromAmount} ${fromAsset.currency} به ${toAmount} ${toAsset.currency} را ثبت کرد.`);
        return this.db.add('foreignTransactions', newTransaction);
    }

    private _getAssetBalance(assetId: string): number {
        const [type, id] = assetId.split(/_(.*)/s);
        if (type === 'cashbox') {
            const currency = id as Currency;
            return this.db.get<CashboxBalance>('cashboxBalances').find(b => b.currency === currency)?.balance || 0;
        } else if (type === 'bank') {
            return this.db.getById<BankAccount>('bankAccounts', id)?.balance || 0;
        }
        return 0;
    }
    
// FIX: Fix for TS error on line 1018
// Create explicitly typed update objects to avoid issues with strict object literal checking.
    private _rollbackAssetBalances(fromAssetId: string, fromBalance: number, toAssetId: string, toBalance: number) {
        const [fromType, fromId] = fromAssetId.split(/_(.*)/s);
        if (fromType === 'cashbox') {
            this.db.get<CashboxBalance>('cashboxBalances').find(b => b.currency === fromId as Currency)!.balance = fromBalance;
        } else {
            // FIX: Explicitly create a typed object to prevent TypeScript from incorrectly inferring the update payload type.
            const fromUpdates: Partial<BankAccount> = { balance: fromBalance };
            this.db.update<BankAccount>('bankAccounts', fromId, fromUpdates);
        }

        const [toType, toId] = toAssetId.split(/_(.*)/s);
        if (toType === 'cashbox') {
            this.db.get<CashboxBalance>('cashboxBalances').find(b => b.currency === toId as Currency)!.balance = toBalance;
        } else {
            // FIX: Explicitly create a typed object to prevent TypeScript from incorrectly inferring the update payload type.
            const toUpdates: Partial<BankAccount> = { balance: toBalance };
            this.db.update<BankAccount>('bankAccounts', toId, toUpdates);
        }
    }

    async performInternalCustomerExchange(payload: InternalCustomerExchangePayload): Promise<{success: true} | { error: string }> {
        const { customerId, fromCurrency, fromAmount, toCurrency, toAmount, rate, user } = payload;
        
        const customer = await this.getCustomerById(customerId);
        if (!customer) return { error: 'مشتری یافت نشد.' };
        
        const currentBalance = customer.balances[fromCurrency] || 0;
        if (currentBalance < fromAmount) return { error: `موجودی ${fromCurrency} مشتری کافی نیست. موجودی فعلی: ${currentBalance}` };

        const exchangeId = this.generateId('IEX');
        
        // Debit the from amount
        const debitDesc = `تبدیل ${fromAmount} ${fromCurrency} به ${toCurrency} با نرخ ${rate}`;
        this._updateCustomerBalance(customerId, fromAmount, fromCurrency, 'debit', debitDesc, exchangeId, 'InternalExchange');

        // Credit the to amount
        const creditDesc = `دریافت ${toAmount} ${toCurrency} از تبدیل ${fromCurrency} با نرخ ${rate}`;
        this._updateCustomerBalance(customerId, toAmount, toCurrency, 'credit', creditDesc, exchangeId, 'InternalExchange');
        
        this.logActivity(user.name, `مبلغ ${fromAmount} ${fromCurrency} از حساب ${customer.name} را به ${toAmount} ${toCurrency} تبدیل کرد.`);
        
        notificationService.sendWhatsAppNotification(customer.whatsappNumber, `مبلغ ${fromAmount} ${fromCurrency} از حساب شما به ${toAmount} ${toCurrency} با نرخ ${rate} تبدیل شد. SarrafAI`);
        
        return { success: true };
    }


    async getForeignTransactions(): Promise<ForeignTransaction[]> { return this.db.get('foreignTransactions'); }
    
    // --- Commission Transfers ---
    async getCommissionTransfers(): Promise<CommissionTransfer[]> {
        return this.db.get<CommissionTransfer>('commissionTransfers');
    }

    async logCommissionTransfer(payload: LogCommissionTransferPayload): Promise<CommissionTransfer | { error: string }> {
        const { user, initiatorType, customerCode, partnerId, amount, sourceAccountNumber, receivedIntoBankAccountId, commissionPercentage } = payload;

        let initiatorId: string;
        let initiatorName: string;

        if (initiatorType === 'Customer') {
            if (!customerCode) return { error: 'کد مشتری ارائه نشده است.' };
            const customer = await this.getCustomerByCode(customerCode);
            if (!customer) return { error: `مشتری با کد ${customerCode} یافت نشد.` };
            initiatorId = customer.id;
            initiatorName = customer.name;
        } else { // Partner
            if (!partnerId) return { error: 'شناسه همکار ارائه نشده است.' };
            const partner = this.db.getById<PartnerAccount>('partnerAccounts', partnerId);
            if (!partner) return { error: `همکار با شناسه ${partnerId} یافت نشد.` };
            initiatorId = partner.id;
            initiatorName = partner.name;
        }
        
        if (amount <= 0 || commissionPercentage < 0) {
            return { error: 'مبلغ و فیصدی کمیشن باید معتبر باشند.' };
        }
        if (!sourceAccountNumber) {
             return { error: 'شماره حساب مبدأ الزامی است.' };
        }

        const currency = Currency.IRT_BANK; // Hardcoded currency

        const bankAccount = this.db.getById<BankAccount>('bankAccounts', receivedIntoBankAccountId);
        if (!bankAccount) return { error: 'حساب بانکی دریافت کننده وجه یافت نشد.' };
        if (bankAccount.currency !== currency) return { error: `این عملیات فقط برای حساب‌های تومان بانکی (${currency}) مجاز است.` };


        // 1. Update bank account balance (Increase)
        bankAccount.balance += amount;
        this.db.update<BankAccount>('bankAccounts', bankAccount.id, { balance: bankAccount.balance });

        // 2. Update cashbox balance (Increase) as per user request
        this._updateCashboxBalance(currency, amount);

        // 3. Create the commission transfer record
        const newTransfer: CommissionTransfer = {
            id: this.generateId('CTF'),
            createdAt: new Date(),
            initiatorType,
            initiatorId,
            amount,
            currency,
            sourceAccountNumber,
            receivedIntoBankAccountId,
            commissionPercentage: commissionPercentage,
            status: 'PendingExecution',
            createdBy: user.name,
        };

        this.logActivity(user.name, `ورود وجه کمیشن‌کاری به مبلغ ${amount} ${currency} از ${initiatorName} را ثبت کرد.`);
        return this.db.add('commissionTransfers', newTransfer);
    }

    async executeCommissionTransfer(payload: ExecuteCommissionTransferPayload): Promise<CommissionTransfer | { error: string }> {
        const { user, transferId, paidFromBankAccountId, destinationAccountNumber } = payload;

        const transfer = this.db.getById<CommissionTransfer>('commissionTransfers', transferId);
        if (!transfer) return { error: 'حواله کمیشن‌کاری یافت نشد.' };
        if (transfer.status === 'Completed') return { error: 'این حواله قبلاً اجرا شده است.' };

        const bankAccount = this.db.getById<BankAccount>('bankAccounts', paidFromBankAccountId);
        if (!bankAccount) return { error: 'حساب بانکی پرداخت کننده وجه یافت نشد.' };
        if (bankAccount.currency !== transfer.currency) return { error: `واحد پولی حساب بانکی (${bankAccount.currency}) با واحد پولی حواله (${transfer.currency}) مطابقت ندارد.` };

        const commissionAmount = transfer.amount * (transfer.commissionPercentage / 100);
        const finalAmountPaid = transfer.amount - commissionAmount;

        if (bankAccount.balance < finalAmountPaid) {
            return { error: `موجودی حساب بانکی ${bankAccount.bankName} (${new Intl.NumberFormat().format(bankAccount.balance)}) کافی نیست. مبلغ مورد نیاز: ${new Intl.NumberFormat().format(finalAmountPaid)}` };
        }

        // 1. Update paying bank account balance (Decrease)
        bankAccount.balance -= finalAmountPaid;
        this.db.update<BankAccount>('bankAccounts', bankAccount.id, { balance: bankAccount.balance });

        // 2. Update cashbox balance (Decrease) by the paid amount
        this._updateCashboxBalance(transfer.currency, -finalAmountPaid);
        
        // 3. Log commission as revenue. The net effect on the cashbox (+amount initially, -finalAmountPaid now) is that
        // the commissionAmount remains, representing our income. We just need to log it for reporting.
        const commissionReason = `درآمد کمیشن بابت حواله ${transfer.id}`;
        // Note: Creating an "Expense" for revenue is an anti-pattern, but it's the only existing mechanism 
        // in this system to log an item that could appear in a Profit & Loss report.
        await this.createExpense({
            category: ExpenseCategory.Commission,
            amount: commissionAmount,
            currency: transfer.currency,
            description: commissionReason,
            user,
            skipCashboxRequest: true, // This is crucial, as it's not a cash expense.
        });

        // 4. Update the commission transfer record
        const updates: Partial<CommissionTransfer> = {
            status: 'Completed',
            completedAt: new Date(),
            paidFromBankAccountId,
            destinationAccountNumber,
            commissionAmount,
            finalAmountPaid,
        };

        const updatedTransfer = this.db.update<CommissionTransfer>('commissionTransfers', transferId, updates);
        
        this.logActivity(user.name, `دستور پرداخت حواله کمیشن‌کاری ${transferId} را به مبلغ نهایی ${finalAmountPaid} ${transfer.currency} اجرا کرد.`);
        
        const initiator = transfer.initiatorType === 'Customer'
            ? await this.getCustomerById(transfer.initiatorId)
            : await this.getPartnerAccountById(transfer.initiatorId);
            
        if(initiator && initiator.whatsappNumber) {
            notificationService.sendWhatsAppNotification(initiator.whatsappNumber, `مبلغ ${new Intl.NumberFormat().format(finalAmountPaid)} ${transfer.currency} طبق دستور شما به حساب ${destinationAccountNumber} واریز گردید. کمیسیون: ${new Intl.NumberFormat().format(commissionAmount)} ${transfer.currency}. SarrafAI`);
        }
        
        return updatedTransfer || { error: 'خطا در به‌روزرسانی حواله.' };
    }


    async generateReport(payload: GenerateReportPayload): Promise<ProfitAndLossReportData | CashboxSummaryReportData | InternalLedgerReportData | { error: string }> {
        const { reportType, startDate, endDate } = payload;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the whole end day

        if (reportType === ReportType.InternalLedger) {
            const allTransactions = this.db.get<ForeignTransaction>('foreignTransactions');
            const filtered = allTransactions.filter(tx => {
                const txDate = new Date(tx.timestamp);
                return txDate >= start && txDate <= end;
            });
            return { transactions: filtered.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) };
        }

        // Placeholder for other reports
        return { error: `گزارش از نوع '${reportType}' هنوز پیاده‌سازی نشده است.` };
    }
    
    // FIX: Add methods for Amanat feature
    async getAmanat(): Promise<Amanat[]> {
        return this.db.get<Amanat>('amanat');
    }

    async createAmanat(payload: CreateAmanatPayload): Promise<Amanat | { error: string }> {
        const { user, ...amanatData } = payload;
        const amanatId = this.generateId('AMN');
        
        const reason = `بابت ثبت امانت برای ${amanatData.customerName} (یادداشت: ${amanatData.notes})`;
        const cashRequest = await this.createCashboxRequest({
            requestType: 'deposit',
            amount: amanatData.amount,
            currency: amanatData.currency,
            reason,
            user,
            linkedEntity: { type: 'Amanat', id: amanatId, description: reason }
        });
        
        if ('error' in cashRequest) {
            return cashRequest;
        }

        const newAmanat: Amanat = {
            id: amanatId,
            createdAt: new Date(),
            createdBy: user.name,
            status: AmanatStatus.Active,
            linkedCashboxDepositId: cashRequest.id,
            ...amanatData,
        };
        
        this.logActivity(user.name, `امانتی به مبلغ ${amanatData.amount} ${amanatData.currency} برای ${amanatData.customerName} ثبت کرد.`);
        return this.db.add('amanat', newAmanat);
    }

    async returnAmanat(payload: ReturnAmanatPayload): Promise<Amanat | { error: string }> {
        const { amanatId, user } = payload;
        const amanat = this.db.getById<Amanat>('amanat', amanatId);
        
        if (!amanat) return { error: 'امانت یافت نشد.' };
        if (amanat.status === AmanatStatus.Returned) return { error: 'این امانت قبلاً بازگشت داده شده است.' };
        
        const balances = this.db.get<CashboxBalance>('cashboxBalances');
        const balance = balances.find(b => b.currency === amanat.currency);
        const currentBalance = balance ? balance.balance : 0;
        if (currentBalance < amanat.amount) {
            return { error: `موجودی صندوق ${amanat.currency} برای بازگشت این امانت کافی نیست.` };
        }
        
        const reason = `بابت بازگشت امانت ${amanat.id} به ${amanat.customerName}`;
        const cashRequest = await this.createCashboxRequest({
            requestType: 'withdrawal',
            amount: amanat.amount,
            currency: amanat.currency,
            reason,
            user,
            linkedEntity: { type: 'Amanat', id: amanat.id, description: reason }
        });
        
        if ('error' in cashRequest) {
            return cashRequest;
        }
        
        const updates: Partial<Amanat> = {
            status: AmanatStatus.Returned,
            returnedAt: new Date(),
            returnedBy: user.name,
            linkedCashboxWithdrawalId: cashRequest.id,
        };
        
        this.logActivity(user.name, `امانت ${amanat.id} را به ${amanat.customerName} بازگشت داد.`);
        const updatedAmanat = this.db.update<Amanat>('amanat', amanatId, updates);
        return updatedAmanat || { error: 'خطا در به‌روزرسانی امانت.' };
    }

}

export default SarrafiApiService;