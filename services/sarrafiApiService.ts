// A comprehensive mock API service that simulates a backend using localStorage.

import { 
    User, Role, Permissions, DomesticTransfer, CreateDomesticTransferPayload, 
    UpdateTransferStatusPayload, TransferStatus, PartnerAccount, PartnerTransaction, 
    Currency, Expense, CreateExpensePayload, CashboxRequest,
    CreateCashboxRequestPayload, ResolveCashboxRequestPayload, CashboxRequestStatus,
    CashboxBalance, SystemSettings, UpdateSystemSettingsPayload, ActivityLog,
    Customer, CustomerTransaction, AccountTransfer, CreateAccountTransferPayload, ReassignTransferPayload,
    BankAccount, AddBankAccountPayload,
// FIX: Removed LogForeignTransactionPayload and added types for the new two-step foreign exchange flow.
    ForeignTransaction, IncreaseCashboxBalancePayload,
    InitiateForeignExchangePayload, CompleteForeignExchangePayload, ForeignTransactionStatus,
    CreateUserPayload, UpdateUserPayload, DeleteUserPayload, CreateRolePayload, UpdateRolePayload, CreatePartnerPayload,
    UpdatePartnerPayload, DeletePartnerPayload, UpdateBankAccountPayload, DeleteBankAccountPayload,
    CreateCustomerPayload, UpdateCustomerPayload, FindTransfersByQueryPayload, PayoutIncomingTransferPayload,
    DashboardAnalyticsData, ProfitAndLossReportData, ReportType, CashboxSummaryReportData, GenerateReportPayload,
    GetPartnerAccountByNamePayload, Asset, ExpenseCategory, InternalCustomerExchangePayload,
    InternalLedgerReportData, CommissionTransfer, LogCommissionTransferPayload, ExecuteCommissionTransferPayload,
    CommissionTransferStatus,
// FIX: Import types for Amanat feature
    Amanat, AmanatStatus, CreateAmanatPayload, ReturnAmanatPayload,
    ReceiveFromPartnerPayload,
    PayToPartnerPayload,
    AuthenticatedUser,
    ExternalLogin,
    CreateExternalLoginPayload,
    DeleteExternalLoginPayload,
    ExpenseStatus,
    InternalExchange,
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

    private dateReviver(key: string, value: any): any {
        // A regex to check for ISO 8601 date strings
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        if (typeof value === 'string' && isoDateRegex.test(value)) {
            return new Date(value);
        }
        return value;
    }

    private init() {
        if (this.isInitialized) return;
        const DB_VERSION = '2.5.0'; // Updated version to remove default employee role.
        try {
            const storedVersion = localStorage.getItem('sarrafi_db_version');
            const storedDb = localStorage.getItem('sarrafi_db');

            // If version is mismatched, or if there's no stored DB (first time run), we must seed.
            if (storedVersion !== DB_VERSION || !storedDb) {
                console.log(`Database version mismatch or not found. Wiping and re-seeding to version ${DB_VERSION}.`);
                this.seed();
                localStorage.setItem('sarrafi_db_version', DB_VERSION);
            } else {
                // Version matches, load from storage and revive all date strings.
                this.db = JSON.parse(storedDb, this.dateReviver);
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
        const data = this.db[table] || [];
        // Return a deep copy to prevent direct state mutation and to ensure
        // React's change detection triggers UI updates correctly.
        // The reviver function will convert ISO date strings back to Date objects.
        const jsonString = JSON.stringify(data);
        return JSON.parse(jsonString, this.dateReviver);
    }

    public getById<T extends {id: string}>(table: string, id: string): T | undefined {
        const tableData = this.db[table] as T[] | undefined;
        if (!tableData) {
            return undefined;
        }
        const item = tableData.find(i => i.id === id);
        // Return a deep copy of the found item to ensure reference inequality.
        // The reviver function will convert ISO date strings back to Date objects.
        if (item) {
            const jsonString = JSON.stringify(item);
            return JSON.parse(jsonString, this.dateReviver);
        }
        return undefined;
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
        const items = this.db[table] || [];
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
        
        const roles: Role[] = [
            { id: 'role-1', name: 'مدیر کل', permissions: adminPermissions },
        ];

        const users: User[] = [
            { id: 'user-1', name: 'مدیر سیستم', username: 'admin', password: 'admin', roleId: 'role-1' },
        ];
        
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
            { currency: Currency.IRT_BANK, balance: 0 },
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
            commissionTransfers: [], externalLogins: [],
            amanat: [],
            internalExchanges: [],
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
    async login(username: string, password?: string): Promise<AuthenticatedUser | { error: string }> {
        // 1. Try to log in as an internal user
        const internalUser = this.db.get<User>('users').find(u => u.username === username && u.password === password);
        if (internalUser) {
            const role = this.db.getById<Role>('roles', internalUser.roleId);
            if (!role) {
                return { error: 'نقش کاربر یافت نشد. با مدیر سیستم تماس بگیرید.' };
            }
            return { ...internalUser, role, userType: 'internal' };
        }

        // 2. If not found, try to log in as an external user
        const externalLogin = this.db.get<ExternalLogin>('externalLogins').find(u => u.username === username && u.password === password);
        if (externalLogin) {
            if (externalLogin.loginType === 'customer') {
                const customer = this.db.getById<Customer>('customers', externalLogin.linkedEntityId);
                if (!customer) return { error: 'حساب مشتری مرتبط با این لاگین یافت نشد.' };
                return { ...externalLogin, userType: 'customer', entity: customer };
            } else if (externalLogin.loginType === 'partner') {
                const partner = this.db.getById<PartnerAccount>('partnerAccounts', externalLogin.linkedEntityId);
                if (!partner) return { error: 'حساب همکار مرتبط با این لاگین یافت نشد.' };
                return { ...externalLogin, userType: 'partner', entity: partner };
            }
        }

        // 3. If still not found, return error
        return { error: 'نام کاربری یا رمز عبور اشتباه است.' };
    }

    // --- External Logins ---
    async getExternalLogins(): Promise<(ExternalLogin & { entityName: string })[]> {
        const logins = this.db.get<ExternalLogin>('externalLogins');
        const customers = this.db.get<Customer>('customers');
        const partners = this.db.get<PartnerAccount>('partnerAccounts');

        return logins.map(login => {
            let entityName = 'یافت نشد';
            if (login.loginType === 'customer') {
                entityName = customers.find(c => c.id === login.linkedEntityId)?.name || 'مشتری حذف شده';
            } else {
                entityName = partners.find(p => p.id === login.linkedEntityId)?.name || 'همکار حذف شده';
            }
            return { ...login, entityName };
        });
    }

    async createExternalLogin(payload: CreateExternalLoginPayload): Promise<ExternalLogin | { error: string }> {
        const { user, ...loginData } = payload;

        // Check for username duplication across both user types
        const isUsernameTaken = this.db.get<User>('users').some(u => u.username === loginData.username) ||
                                this.db.get<ExternalLogin>('externalLogins').some(el => el.username === loginData.username);
        
        if (isUsernameTaken) {
            return { error: `نام کاربری "${loginData.username}" قبلا استفاده شده است.` };
        }

        const newLogin: ExternalLogin = {
            ...loginData,
            id: this.generateId('ext'),
        };
        this.logActivity(user.name, `دسترسی کاربری برای ${loginData.loginType} با نام کاربری ${loginData.username} ایجاد کرد.`);
        return this.db.add('externalLogins', newLogin);
    }
    
    async deleteExternalLogin(payload: DeleteExternalLoginPayload): Promise<{ success: boolean }> {
        const login = this.db.getById<ExternalLogin>('externalLogins', payload.id);
        if (login) {
            this.logActivity(payload.user.name, `دسترسی کاربر خارجی ${login.username} را حذف کرد.`);
        }
        return { success: this.db.delete('externalLogins', payload.id) };
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
    async getCustomerById(id: string): Promise<Customer | undefined> { return this.db.getById<Customer>('customers', id); }
    async getCustomerByCode(code: string): Promise<Customer | undefined> {
        return this.db.get<Customer>('customers').find(c => c.code === code);
    }
    async createCustomer(payload: CreateCustomerPayload): Promise<Customer | { error: string }> {
        const { user, ...customerData } = payload;
        const existing = this.db.get<Customer>('customers').find(c => c.code === customerData.code);
        if (existing) return { error: `مشتری با کد ${customerData.code} از قبل وجود دارد.` };
        
        const newCustomer: Customer = { 
            ...customerData, 
            id: this.generateId('cust'), 
            balances: {} 
        };
        this.db.add('customers', newCustomer);

        this.logActivity(user.name, `مشتری جدید ${newCustomer.name} (کد: ${newCustomer.code}) را با موجودی صفر ثبت کرد.`);
        return newCustomer;
    }
     async updateCustomer(payload: UpdateCustomerPayload): Promise<Customer | { error: string }> {
        const { id, user, ...customerData } = payload;
        const customer = this.db.getById<Customer>('customers', id);
        if (!customer) return { error: 'Customer not found' };

        this.logActivity(user.name, `اطلاعات مشتری ${customer.name} (کد: ${customer.code}) را ویرایش کرد.`);
        const updated = this.db.update<Customer>('customers', id, customerData);
        return updated || { error: 'Failed to update customer' };
    }
    
    // --- Domestic Transfers ---
    async getDomesticTransfers(): Promise<DomesticTransfer[]> { return this.db.get<DomesticTransfer>('domesticTransfers'); }
    async getDomesticTransferById(id: string): Promise<DomesticTransfer | undefined> { return this.db.getById<DomesticTransfer>('domesticTransfers', id); }
    
    async createDomesticTransfer(payload: CreateDomesticTransferPayload): Promise<DomesticTransfer | { error: string }> {
        if (payload.isCashPayment && payload.partnerReference) {
            return { error: 'یک حواله نمی‌تواند همزمان ورودی (دارای کد همکار) و پرداخت نقدی باشد.' };
        }

        // For outgoing cash payments, the initial status is PendingCashbox.
        // For incoming or customer account transfers, it's Unexecuted.
        const initialStatus = payload.isCashPayment && !payload.partnerReference 
            ? TransferStatus.PendingCashbox 
            : TransferStatus.Unexecuted;

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
            status: initialStatus,
            createdBy: payload.user.name,
            history: [{ status: initialStatus, timestamp: new Date(), user: payload.user.name }]
        };

        if (payload.partnerReference) {
           // Incoming transfer - no financial action on creation
        }
        else if (payload.isCashPayment) {
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
            const customer = await this.getCustomerByCode(payload.customerCode!);
            if (!customer) return { error: 'مشتری با این کد یافت نشد.' };
            newTransfer.customerId = customer.id;
        }

        this.logActivity(payload.user.name, `درخواست حواله ${newTransfer.id} را به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return this.db.add('domesticTransfers', newTransfer);
    }

    async updateTransferStatus(payload: UpdateTransferStatusPayload): Promise<DomesticTransfer | { error: string }> {
        const transfer = this.db.getById<DomesticTransfer>('domesticTransfers', payload.transferId);
        if (!transfer) return { error: "حواله یافت نشد." };

        const validTransitions: { [key in TransferStatus]?: TransferStatus[] } = {
            [TransferStatus.Unexecuted]: [TransferStatus.Executed, TransferStatus.Cancelled, TransferStatus.PendingCashbox],
            [TransferStatus.PendingCashbox]: [TransferStatus.Executed, TransferStatus.RejectedByCashbox, TransferStatus.Unexecuted] // Added Unexecuted for the new flow
        };

        if (validTransitions[transfer.status] && !validTransitions[transfer.status]!.includes(payload.newStatus)) {
            return { error: `تغییر وضعیت از '${statusTranslations[transfer.status]}' به '${statusTranslations[payload.newStatus]}' مجاز نیست.` };
        }
        if (!validTransitions[transfer.status]) {
             return { error: `حواله در وضعیت نهایی (${statusTranslations[transfer.status]}) قرار دارد و قابل تغییر نیست.` };
        }

        const originalStatus = transfer.status;
        
        if (payload.newStatus === TransferStatus.Executed) {
            const isIncoming = !!transfer.partnerReference;

            if (!isIncoming && transfer.customerId) {
                const customer = await this.getCustomerById(transfer.customerId);
                if (!customer) return { error: 'مشتری مرتبط با این حواله یافت نشد.' };
                
                const totalDeduction = transfer.amount + transfer.commission;
                const customerBalance = customer.balances[transfer.currency] || 0;
                if (customerBalance < totalDeduction) {
                    return { error: `موجودی حساب مشتری (${new Intl.NumberFormat().format(customerBalance)} ${transfer.currency}) برای اجرای این حواله کافی نیست.` };
                }

                const desc = `بابت اجرای حواله ${transfer.id} (مبلغ: ${transfer.amount}, کارمزد: ${transfer.commission})`;
                this._updateCustomerBalance(customer.id, -totalDeduction, transfer.currency, 'debit', desc, transfer.id, 'DomesticTransfer');
            }

            const partner = await this.getPartnerAccountByName({ partnerName: transfer.partnerSarraf });
            if ('error' in partner) return { error: `همکار با نام '${transfer.partnerSarraf}' یافت نشد.` };

            if (isIncoming) {
                // The actual withdrawal is now handled by the cashbox approval workflow.
                // Here, we just mark the transfer as executed and update the partner balance.
                this._updatePartnerBalance(partner.id, -transfer.amount, transfer.currency, 'debit', `پرداخت حواله ${transfer.id}`, transfer.id);
            } else {
                this._updatePartnerBalance(partner.id, transfer.amount, transfer.currency, 'credit', `اجرای حواله ${transfer.id}`, transfer.id);
            }
            if (!isIncoming && transfer.customerId) {
                const customer = await this.getCustomerById(transfer.customerId);
                if (customer?.whatsappNumber) {
                    notificationService.sendWhatsAppNotification(customer.whatsappNumber, `حواله شما با کد ${transfer.id} به مبلغ ${transfer.amount} ${transfer.currency} به گیرنده پرداخت شد. SarrafAI`);
                }
            }
        } else if (payload.newStatus === TransferStatus.Cancelled) {
            const isCashPaidOutgoing = !transfer.customerId && !transfer.partnerReference;

            if (isCashPaidOutgoing) {
                const reason = `بازگشت وجه بابت لغو حواله ${transfer.id} به ${transfer.sender.name}`;
                const rollbackAmount = transfer.amount + transfer.commission;
                this.db.update<DomesticTransfer>(transfer.id, 'domesticTransfers', { status: TransferStatus.PendingCashbox, history: [...transfer.history, { status: TransferStatus.PendingCashbox, timestamp: new Date(), user: payload.user.name }]});
                const cashboxResult = await this.createCashboxRequest({
                    requestType: 'withdrawal',
                    amount: rollbackAmount,
                    currency: transfer.currency,
                    reason,
                    user: payload.user,
                    linkedEntity: { type: 'DomesticTransfer', id: transfer.id, description: reason }
                });
                if('error' in cashboxResult) return cashboxResult;
                // Don't update status here, let the cashbox rejection handle it if needed.
                return this.db.getById<DomesticTransfer>('domesticTransfers', transfer.id)!;
                
            } else if (transfer.customerId) {
                const totalReturnAmount = transfer.amount + transfer.commission;
                const description = `بابت بازگشت وجه حواله لغو شده شماره ${transfer.id}`;
                this._updateCustomerBalance(transfer.customerId, totalReturnAmount, transfer.currency, 'credit', description, transfer.id, 'DomesticTransfer');
            }
        }
        
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
        const transfer = this.db.getById<DomesticTransfer>('domesticTransfers', payload.transferId);
        if (!transfer) return { error: 'حواله یافت نشد.' };
        if (transfer.status !== TransferStatus.Unexecuted) return { error: 'این حواله قبلا پردازش شده یا در وضعیت نامعتبر است.' };
        
        const reason = `پرداخت به مشتری برای حواله ورودی ${transfer.id} از طرف ${transfer.partnerSarraf}`;
        this.db.update<DomesticTransfer>(transfer.id, 'domesticTransfers', { status: TransferStatus.PendingCashbox, history: [...transfer.history, { status: TransferStatus.PendingCashbox, timestamp: new Date(), user: payload.user.name }]});

        const cashboxResult = await this.createCashboxRequest({
            requestType: 'withdrawal',
            amount: transfer.amount,
            currency: transfer.currency,
            reason, user: payload.user,
            linkedEntity: { type: 'DomesticTransfer', id: transfer.id, description: reason }
        });
        
        if ('error' in cashboxResult) {
            // Rollback status change
            this.db.update<DomesticTransfer>(transfer.id, 'domesticTransfers', { status: TransferStatus.Unexecuted, history: transfer.history });
            return cashboxResult;
        }

        return this.db.getById<DomesticTransfer>('domesticTransfers', transfer.id)!;
    }

    // --- Partner Accounts ---
    async getPartnerAccounts(): Promise<PartnerAccount[]> { return this.db.get<PartnerAccount>('partnerAccounts'); }
    async getPartnerAccountById(id: string): Promise<PartnerAccount | undefined> { return this.db.getById<PartnerAccount>('partnerAccounts', id); }
    async getTransactionsForPartner(partnerId: string): Promise<PartnerTransaction[]> {
        return this.db.get<PartnerTransaction>('partnerTransactions').filter(t => t.partnerId === partnerId);
    }
    
    // --- Cashbox ---
    async getCashboxRequests(): Promise<CashboxRequest[]> { return this.db.get<CashboxRequest>('cashboxRequests'); }
    async getCashboxRequestById(id: string): Promise<CashboxRequest | undefined> { return this.db.getById<CashboxRequest>('cashboxRequests', id); }
    async getCashboxBalances(): Promise<CashboxBalance[]> {
        const balances: CashboxBalance[] = this.db.get<CashboxBalance>('cashboxBalances');
        
        const conceptualIrtBank = balances.find(b => b.currency === Currency.IRT_BANK);
        const conceptualIrtBankBalance = conceptualIrtBank ? conceptualIrtBank.balance : 0;
        
        const bankAccounts = this.db.get<BankAccount>('bankAccounts');
        const totalPhysicalBankBalance = bankAccounts
            .filter(acc => acc.status === 'Active' && acc.currency === Currency.IRT_BANK)
            .reduce((sum, acc) => sum + acc.balance, 0);
            
        const finalIrtBankTotal = totalPhysicalBankBalance + conceptualIrtBankBalance;

        if (conceptualIrtBank) {
            conceptualIrtBank.balance = finalIrtBankTotal;
        } else {
            balances.push({ currency: Currency.IRT_BANK, balance: finalIrtBankTotal });
        }
        
        return balances;
    }

    private _hasCashierRole(): boolean {
        const users = this.db.get<User>('users');
        const roles = this.db.get<Role>('roles');
        return users.some(u => {
            const role = roles.find(r => r.id === u.roleId);
            return role?.permissions?.cashbox?.approve === true;
        });
    }

    async createCashboxRequest(payload: CreateCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        if (payload.customerCode) {
            const customer = this.db.get<Customer>('customers').find(c => c.code === payload.customerCode);
            if (!customer) return { error: `مشتری با کد ${payload.customerCode} یافت نشد.` };
            }

        const settings = this.db.get<SystemSettings>('systemSettings')[0];
        const threshold = settings.approvalThresholds[payload.currency];
        const needsManagerApproval = typeof threshold === 'number' && payload.amount > threshold;
        const hasCashier = this._hasCashierRole();

        let status: CashboxRequestStatus;
        if (payload.bypassCashier) {
            status = CashboxRequestStatus.AutoApproved;
        } else if (needsManagerApproval) {
            status = CashboxRequestStatus.Pending;
        } else if (hasCashier) {
            status = CashboxRequestStatus.PendingCashboxApproval;
        } else {
            status = CashboxRequestStatus.Pending; // Fallback to manager if no cashier exists
        }

        if (status === CashboxRequestStatus.AutoApproved && payload.requestType === 'withdrawal') {
            const checkResult = this._checkBalanceForRequest(payload.amount, payload.currency, payload.bankAccountId);
            if (checkResult.error) return { error: checkResult.error };
        }

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
        if (request.status !== CashboxRequestStatus.Pending && request.status !== CashboxRequestStatus.PendingCashboxApproval) {
             return { error: "Request already resolved or not in a resolvable state." };
        }

        if (payload.resolution === 'reject') {
            const newStatus = CashboxRequestStatus.Rejected;
            if (request.linkedEntity?.type === 'DomesticTransfer') {
                await this.updateTransferStatus({ transferId: request.linkedEntity.id, newStatus: TransferStatus.RejectedByCashbox, user: payload.user });
            }
            if (request.linkedEntity?.type === 'ForeignTransaction') {
                const ft = this.db.getById<ForeignTransaction>('foreignTransactions', request.linkedEntity.id);
                if (ft) {
                    this.db.update<ForeignTransaction>('foreignTransactions', ft.id, { status: ForeignTransactionStatus.Rejected });
                }
            }
            if (request.linkedEntity?.type === 'CommissionTransfer') {
                const ct = this.db.getById<CommissionTransfer>('commissionTransfers', request.linkedEntity.id);
                if (ct) {
                    this.db.update<CommissionTransfer>('commissionTransfers', ct.id, { status: CommissionTransferStatus.Rejected });
                }
            }
            if (request.linkedEntity?.type === 'Expense') {
                const expense = this.db.getById<Expense>('expenses', request.linkedEntity.id);
                if (expense) {
                    this.db.update<Expense>('expenses', expense.id, { status: ExpenseStatus.Rejected });
                }
            }
            this.logActivity(payload.user.name, `درخواست صندوق ${request.id} را رد کرد.`);
            return this.db.update<CashboxRequest>('cashboxRequests', request.id, { status: newStatus, resolvedBy: payload.user.name, resolvedAt: new Date() })!;
        }

        // --- Approval Logic ---
        const isManagerApproval = request.status === CashboxRequestStatus.Pending;
        const hasCashier = this._hasCashierRole();

        if (isManagerApproval) {
            if (hasCashier) {
                // Pass down to cashier
                this.logActivity(payload.user.name, `درخواست صندوق ${request.id} را تایید اولیه کرد.`);
                return this.db.update<CashboxRequest>('cashboxRequests', request.id, { status: CashboxRequestStatus.PendingCashboxApproval })!;
            } else {
                // Manager is the final approver (no cashier exists)
                const processResult = this._processCashboxRequest(request);
                // FIX: Replaced optional chaining with a standard truthy check to ensure type safety.
                if (processResult && processResult.error) return processResult;
                
                this.logActivity(payload.user.name, `درخواست صندوق ${request.id} را به عنوان تایید نهایی ثبت کرد.`);
                const updatedRequest = this.db.update<CashboxRequest>('cashboxRequests', request.id, { status: CashboxRequestStatus.Approved, resolvedBy: payload.user.name, resolvedAt: new Date() })!;
                await this._finalizeLinkedEntity(updatedRequest, payload.user);
                return updatedRequest;
            }
        } else { // Is Cashier Approval
            const processResult = this._processCashboxRequest(request);
            // FIX: Replaced optional chaining with a standard truthy check to ensure type safety.
            if (processResult && processResult.error) return processResult;
            
            this.logActivity(payload.user.name, `درخواست صندوق ${request.id} را تایید نهایی کرد.`);
            const updatedRequest = this.db.update<CashboxRequest>('cashboxRequests', request.id, { status: CashboxRequestStatus.Approved, resolvedBy: payload.user.name, resolvedAt: new Date() })!;
            await this._finalizeLinkedEntity(updatedRequest, payload.user);
            return updatedRequest;
        }
    }

    private async _finalizeLinkedEntity(request: CashboxRequest, user: User) {
        if (request.linkedEntity?.type === 'DomesticTransfer') {
            // This now handles both payout withdrawals and the new creation deposit flow
            if (request.requestType === 'deposit') {
                // Cash for an outgoing transfer was received and approved. The transfer can now be marked as unexecuted.
                 await this.updateTransferStatus({ transferId: request.linkedEntity.id, newStatus: TransferStatus.Unexecuted, user });
            } else { // withdrawal
                // Cash for an incoming transfer was paid out. The transfer is now executed.
                 await this.updateTransferStatus({ transferId: request.linkedEntity.id, newStatus: TransferStatus.Executed, user });
            }
        }
        if (request.linkedEntity?.type === 'ForeignTransaction') { 
            const ft = this.db.getById<ForeignTransaction>('foreignTransactions', request.linkedEntity.id);
            if (!ft) return;
            
            if (request.requestType === 'withdrawal' && request.id === ft.withdrawalRequestId) {
                // Withdrawal for FT is approved.
                this.db.update<ForeignTransaction>('foreignTransactions', ft.id, { status: ForeignTransactionStatus.PendingDeposit });
            } else if (request.requestType === 'deposit' && request.id === ft.depositRequestId) {
                // Deposit for FT is approved. It is complete.
                this.db.update<ForeignTransaction>('foreignTransactions', ft.id, { status: ForeignTransactionStatus.Completed });
            }
        }
        if (request.linkedEntity?.type === 'CommissionTransfer') {
            const ct = this.db.getById<CommissionTransfer>('commissionTransfers', request.linkedEntity.id);
            if (!ct) return;
    
            if (request.requestType === 'deposit' && request.id === ct.depositRequestId) {
                // Initial deposit is approved. Transfer is now ready for payout execution.
                this.db.update<CommissionTransfer>('commissionTransfers', ct.id, { status: CommissionTransferStatus.PendingExecution });
            } else if (request.requestType === 'withdrawal' && request.id === ct.withdrawalRequestId) {
                // Payout withdrawal is approved. Transfer is complete.
                this.db.update<CommissionTransfer>('commissionTransfers', ct.id, { status: CommissionTransferStatus.Completed });
            }
        }
        if (request.linkedEntity?.type === 'Expense') {
            const expense = this.db.getById<Expense>('expenses', request.linkedEntity.id);
            if (expense) {
                this.db.update<Expense>('expenses', expense.id, { status: ExpenseStatus.Approved });
            }
        }
        if (request.linkedEntity?.type === 'PartnerSettlement') {
            const details = request.linkedEntity.details as any;
            this._updatePartnerBalance(
                request.linkedEntity.id, // partnerId
                details.amount,
                details.currency,
                details.type,
                request.linkedEntity.description, // Use the reason from cashbox as description
                undefined, // linkedTransferId
                details.txDetails,
            );
        }
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
            },
            bankAccountId: payload.bankAccountId,
            sourceAccountNumber: payload.sourceAccountNumber,
        };
    
        const result = await this.createCashboxRequest(requestPayload);
    
        if (!('error' in result)) {
            this.logActivity(payload.user.name, `درخواست افزایش موجودی صندوق ${payload.currency} به مبلغ ${payload.amount} را ثبت کرد.`);
        }
    
        return result;
    }

    private _checkBalanceForRequest(amount: number, currency: Currency, bankAccountId?: string): { error?: string } {
        if (currency === Currency.IRT_BANK) {
            if (!bankAccountId) return { error: 'برای تراکنش بانکی، حساب بانکی مشخص نشده است.' };
            const bankAccount = this.db.getById<BankAccount>('bankAccounts', bankAccountId);
            if (!bankAccount) return { error: `حساب بانکی با شناسه ${bankAccountId} یافت نشد.` };
            if (bankAccount.balance < amount) return { error: `موجودی حساب بانکی ${bankAccount.bankName} (${new Intl.NumberFormat().format(bankAccount.balance)}) برای این عملیات کافی نیست.` };
        } else {
            const balance = this.db.get<CashboxBalance>('cashboxBalances').find(b => b.currency === currency);
            if (!balance || balance.balance < amount) return { error: `موجودی صندوق ${currency} (${new Intl.NumberFormat().format(balance?.balance || 0)}) برای این عملیات کافی نیست.` };
        }
        return {};
    }

    private _processCashboxRequest(request: CashboxRequest): void | { error: string } {
        if (request.requestType === 'withdrawal') {
            const checkResult = this._checkBalanceForRequest(request.amount, request.currency, request.bankAccountId);
            if (checkResult.error) {
                // FIX: Explicitly return an object with the 'error' property to match the return type.
                return { error: checkResult.error };
            }
        }

        const multiplier = request.requestType === 'deposit' ? 1 : -1;
        const amountChange = request.amount * multiplier;

        if (request.currency === Currency.IRT_BANK && request.bankAccountId) {
            const bankAccount = this.db.getById<BankAccount>('bankAccounts', request.bankAccountId);
            if (bankAccount) {
                 this.db.update<BankAccount>('bankAccounts', bankAccount.id, { balance: bankAccount.balance + amountChange });
            } else {
                 console.error(`Bank account with ID ${request.bankAccountId} not found.`);
                 return { error: `حساب بانکی با شناسه ${request.bankAccountId} یافت نشد.` };
            }
        } else {
             this._updateCashboxBalance(request.currency, amountChange);
        }

        if (request.customerCode) {
            const customer = this.db.get<Customer>('customers').find(c => c.code === request.customerCode);
            if(customer) {
                const type = request.requestType === 'deposit' ? 'credit' : 'debit';
                 this._updateCustomerBalance(customer.id, request.amount, request.currency, type, request.reason, request.id, type === 'credit' ? 'CashDeposit' : 'CashWithdrawal');
            }
        }
    }
    
    private _updateCashboxBalance(currency: Currency, amount: number) {
        const dbState = this.db.getDbState() as { [key: string]: any[] };
        const balances = dbState.cashboxBalances as CashboxBalance[];
        const balance = balances.find(b => b.currency === currency);
        if (balance) {
            balance.balance += amount;
            this.db.replaceDb(dbState);
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

    private _updatePartnerBalance(partnerId: string, amount: number, currency: Currency, type: 'credit' | 'debit', description: string, linkedTransferId?: string, txDetails: Partial<PartnerTransaction> = {}) {
        const partner = this.db.getById<PartnerAccount>('partnerAccounts', partnerId);
        if (!partner) return;

        const amountChange = type === 'credit' ? Math.abs(amount) : -Math.abs(amount);
        const newBalance = (partner.balances[currency] || 0) + amountChange;
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
            ...txDetails,
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
            status: ExpenseStatus.PendingApproval,
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
                return cashRequest;
            }
            newExpense.linkedCashboxRequestId = cashRequest.id;
        }
        
        this.logActivity(payload.user.name, `هزینه ای به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return this.db.add('expenses', newExpense);
    }
    
    // --- Reports & Analytics ---
    async getActivityLogs(): Promise<ActivityLog[]> { 
        return this.db.get<ActivityLog>('activityLogs').sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50); 
    }
    
    async getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
        const domesticTransfers = this.db.get<DomesticTransfer>('domesticTransfers');
        const foreignTransfers = this.db.get<ForeignTransaction>('foreignTransfers');
        const partners = this.db.get<PartnerAccount>('partnerAccounts');
        
        // 1. Weekly Activity Trend (last 6 weeks)
        const weeklyActivity = {
            labels: [] as string[],
            domesticCounts: [] as number[],
            foreignCounts: [] as number[],
        };
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i * 7) - now.getDay()); // Start of week (Sunday)
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            if (i === 0) {
                weeklyActivity.labels.push('هفته فعلی');
            } else if (i === 1) {
                weeklyActivity.labels.push('هفته گذشته');
            } else {
                weeklyActivity.labels.push(`-هفته ${i}`);
            }

            const domesticCount = domesticTransfers.filter(t => t.createdAt >= weekStart && t.createdAt <= weekEnd).length;
            const foreignCount = foreignTransfers.filter(t => t.timestamp >= weekStart && t.timestamp <= weekEnd).length;
            
            weeklyActivity.domesticCounts.push(domesticCount);
            weeklyActivity.foreignCounts.push(foreignCount);
        }

        // 2. Real Partner Activity (Top 10)
        const partnerActivity = partners
            .filter(p => p.status === 'Active')
            .map(p => {
                const transferCount = domesticTransfers.filter(t => t.partnerSarraf === p.name).length;
                return { label: p.name, value: transferCount };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        // 3. Cashbox Balances Summary
        const cashboxSummary = (await this.getCashboxBalances()).map(b => ({
            currency: b.currency,
            balance: b.balance
        }));

        return { weeklyActivity, partnerActivity, cashboxSummary };
    }


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

    async getTransactionsForCustomer(customerId: string): Promise<CustomerTransaction[]> {
        return this.db.get<CustomerTransaction>('customerTransactions').filter(t => t.customerId === customerId);
    }
    async getPartnerAccountByName(payload: GetPartnerAccountByNamePayload): Promise<PartnerAccount | {error: string}> {
        const partner = this.db.get<PartnerAccount>('partnerAccounts').find(p => p.name === payload.partnerName);
        return partner || { error: 'Partner not found' };
    }
    
    async settlePartnerBalanceByName(payload: { partnerName: string, amount: number, currency: Currency, type: 'pay' | 'receive', user: User }): Promise<{success: true} | { error: string }> {
        const partnerRes = await this.getPartnerAccountByName({ partnerName: payload.partnerName });
        if ('error' in partnerRes) {
            return { error: `همکار با نام '${payload.partnerName}' یافت نشد.` };
        }
        
        let result;
        if (payload.type === 'pay') {
            result = await this.payToPartner({
                partnerId: partnerRes.id,
                amount: payload.amount,
                currency: payload.currency,
                user: payload.user,
            });
        } else { // 'receive'
             result = await this.receiveFromPartner({
                partnerId: partnerRes.id,
                amount: payload.amount,
                currency: payload.currency,
                user: payload.user,
            });
        }

        if ('error' in result) return result;

        return { success: true };
    }

    async receiveFromPartner(payload: ReceiveFromPartnerPayload): Promise<CashboxRequest | { error: string }> {
        const partner = this.db.getById<PartnerAccount>('partnerAccounts', payload.partnerId);
        if (!partner) return { error: "همکار یافت نشد." };

        const amount = Math.abs(payload.amount);
        const description = `دریافت وجه تسویه حساب از همکار ${partner.name}`;

        const txDetails: Partial<PartnerTransaction> = {
            bankAccountId: payload.bankAccountId,
            sourceAccountNumber: payload.sourceAccountNumber,
            destinationAccountNumber: payload.destinationAccountNumber,
        };
        
        const linkedEntity = {
            type: 'PartnerSettlement',
            id: partner.id, // partnerId
            description: description,
            details: {
                amount: amount,
                currency: payload.currency,
                type: 'debit', // Receiving from partner DEBITS their account with us
                txDetails: txDetails
            }
        };

        const cashboxRequestResult = await this.createCashboxRequest({
            requestType: 'deposit',
            amount,
            currency: payload.currency,
            reason: description,
            user: payload.user,
            bankAccountId: payload.bankAccountId,
            sourceAccountNumber: payload.sourceAccountNumber,
            destinationAccountNumber: payload.destinationAccountNumber,
            linkedEntity: linkedEntity as any, // Cast to any to avoid type complexity here
        });

        if ('error' in cashboxRequestResult) return cashboxRequestResult;

        this.logActivity(payload.user.name, `درخواست دریافت تسویه از ${partner.name} به مبلغ ${amount} ${payload.currency} را ثبت کرد.`);
        
        return cashboxRequestResult;
    }

    async payToPartner(payload: PayToPartnerPayload): Promise<CashboxRequest | { error: string }> {
        const partner = this.db.getById<PartnerAccount>('partnerAccounts', payload.partnerId);
        if (!partner) return { error: "همکار یافت نشد." };

        const amount = Math.abs(payload.amount);
        const description = `پرداخت وجه تسویه حساب به همکار ${partner.name}`;
        
        const txDetails: Partial<PartnerTransaction> = {
             bankAccountId: payload.bankAccountId,
            sourceAccountNumber: payload.sourceAccountNumber,
            destinationAccountNumber: payload.destinationAccountNumber,
        };

        const linkedEntity = {
            type: 'PartnerSettlement',
            id: partner.id, // partnerId
            description: description,
            details: {
                amount: amount,
                currency: payload.currency,
                type: 'credit', // Paying a partner CREDITS their account with us
                txDetails: txDetails
            }
        };

        const cashboxRequestResult = await this.createCashboxRequest({
            requestType: 'withdrawal',
            amount,
            currency: payload.currency,
            reason: description,
            user: payload.user,
            bankAccountId: payload.bankAccountId,
            sourceAccountNumber: payload.sourceAccountNumber,
            destinationAccountNumber: payload.destinationAccountNumber,
            linkedEntity: linkedEntity as any, // Cast to any
        });

        if ('error' in cashboxRequestResult) return cashboxRequestResult;
        
        this.logActivity(payload.user.name, `درخواست پرداخت تسویه به ${partner.name} به مبلغ ${amount} ${payload.currency} را ثبت کرد.`);

        return cashboxRequestResult;
    }

     async createAccountTransfer(payload: CreateAccountTransferPayload): Promise<AccountTransfer | { error: string }> {
        const fromCustomer = await this.getCustomerByCode(payload.fromCustomerCode);
        if (!fromCustomer) return { error: `مشتری مبدا با کد ${payload.fromCustomerCode} یافت نشد.` };
        
        const toCustomer = await this.getCustomerByCode(payload.toCustomerCode);
        if (!toCustomer) return { error: `مشتری مقصد با کد ${payload.toCustomerCode} یافت نشد.` };
        
        const fromBalance = fromCustomer.balances[payload.currency] || 0;
        if (fromBalance < payload.amount) {
            return { error: `موجودی مشتری مبدا (${fromCustomer.name}) برای این انتقال کافی نیست.` };
        }

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
            debitTransactionId: '', // Will be filled below
            creditTransactionId: '', // Will be filled below
        };

        const debitDesc = `انتقال به ${toCustomer.name} (کد: ${toCustomer.code})`;
        const creditDesc = `انتقال از ${fromCustomer.name} (کد: ${fromCustomer.code})`;

        const debitTx = this._updateCustomerBalance(fromCustomer.id, payload.amount, payload.currency, 'debit', debitDesc, newTransfer.id, 'AccountTransfer');
        const creditTx = this._updateCustomerBalance(toCustomer.id, payload.amount, payload.currency, 'credit', creditDesc, newTransfer.id, 'AccountTransfer');
        
        newTransfer.debitTransactionId = debitTx.id;
        newTransfer.creditTransactionId = creditTx.id;

        this.logActivity(payload.user.name, `مبلغ ${payload.amount} ${payload.currency} را از ${fromCustomer.name} به ${toCustomer.name} انتقال داد.`);
        return this.db.add('accountTransfers', newTransfer);
    }
    async getAccountTransfers(): Promise<AccountTransfer[]> { return this.db.get('accountTransfers'); }
    async reassignPendingTransfer(payload: ReassignTransferPayload): Promise<AccountTransfer | { error: string }> {
        const { transferId, finalCustomerCode, user } = payload;

        // 1. Find the original transfer
        const transfer = this.db.getById<AccountTransfer>('accountTransfers', transferId);
        if (!transfer) {
            return { error: 'انتقال مورد نظر یافت نشد.' };
        }
        if (transfer.status !== 'PendingAssignment') {
            return { error: 'این انتقال در وضعیت انتظار برای تخصیص قرار ندارد.' };
        }

        // 2. Find the final customer and suspense account
        const finalCustomer = await this.getCustomerByCode(finalCustomerCode);
        if (!finalCustomer) {
            return { error: `مشتری با کد ${finalCustomerCode} یافت نشد.` };
        }

        const suspenseCustomer = await this.getCustomerByCode('_SUSPENSE_');
        if (!suspenseCustomer) {
            return { error: 'خطای سیستمی: حساب معلق یافت نشد.' };
        }

        // 3. Perform balance updates: debit suspense, credit final customer
        const amount = transfer.amount;
        const currency = transfer.currency;
        
        const suspenseBalance = suspenseCustomer.balances[currency] || 0;
        if (suspenseBalance < amount) {
            return { error: `موجودی حساب معلق برای تخصیص این حواله کافی نیست. موجودی فعلی: ${suspenseBalance} ${currency}` };
        }

        const debitDesc = `تخصیص حواله ${transfer.id} به ${finalCustomer.name} (کد: ${finalCustomer.code})`;
        this._updateCustomerBalance(suspenseCustomer.id, amount, currency, 'debit', debitDesc, transfer.id, 'AccountTransfer');

        const creditDesc = `دریافت از حساب معلق بابت حواله ${transfer.id}`;
        this._updateCustomerBalance(finalCustomer.id, amount, currency, 'credit', creditDesc, transfer.id, 'AccountTransfer');

        // 4. Update the original transfer record
        const updates: Partial<AccountTransfer> = {
            status: 'Completed',
            toCustomerId: finalCustomer.id,
            description: `${transfer.description} (تخصیص داده شده به ${finalCustomer.name})`,
        };
        const updatedTransfer = this.db.update<AccountTransfer>('accountTransfers', transferId, updates);

        if (!updatedTransfer) {
            // This case should be rare, but good to handle. A rollback would be ideal in a real DB.
            return { error: 'خطا در بروزرسانی سند انتقال اصلی.' };
        }

        // 5. Log activity
        this.logActivity(user.name, `حواله معلق ${transfer.id} را به مشتری ${finalCustomer.name} تخصیص داد.`);

        // 6. Return the now-completed transfer
        return updatedTransfer;
    }
    
    async addBankAccount(payload: AddBankAccountPayload): Promise<BankAccount | { error: string }> {
        const existing = this.db.get<BankAccount>('bankAccounts').find(b => b.accountNumber === payload.accountNumber && b.bankName === payload.bankName);
        if (existing) return { error: `حساب بانکی با این شماره حساب و نام بانک از قبل وجود دارد.` };
        
        const { user, ...accountData } = payload;
        const newAccount: BankAccount = {
            ...accountData,
            id: this.generateId('BA'),
            balance: 0,
            status: 'Active',
        };

        const addedAccount = this.db.add('bankAccounts', newAccount);
        
        this.logActivity(user.name, `حساب بانکی جدیدی برای ${payload.accountHolder} در بانک ${payload.bankName} ثبت کرد.`);
        return addedAccount;
    }


    async getBankAccounts(): Promise<BankAccount[]> { return this.db.get('bankAccounts'); }

    async createPartner(payload: CreatePartnerPayload): Promise<PartnerAccount | { error: string }> {
        const existing = this.db.get<PartnerAccount>('partnerAccounts').find(p => p.name === payload.name);
        if (existing) return { error: `همکار با نام "${payload.name}" از قبل وجود دارد.` };

        const { user, ...partnerData } = payload;
        const newPartner: PartnerAccount = {
            ...partnerData,
            id: this.generateId('PA'),
            status: 'Active',
            balances: {},
        };
        this.db.add('partnerAccounts', newPartner);
        this.logActivity(user.name, `همکار جدیدی با نام "${payload.name}" در ولایت ${payload.province} ثبت کرد.`);
        
        return newPartner;
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
            // FIX: Correctly access the user from the payload for logging.
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
            // FIX: Correctly access the user from the payload for logging.
            this.logActivity(payload.user.name, `حساب بانکی "${updated.accountHolder} - ${updated.bankName}" را غیرفعال کرد.`);
            return updated;
        }
        return { error: 'Bank account not found' };
    }
    
    private _getAllAssets(): Asset[] {
        const cashboxAssets = this.db.get<CashboxBalance>('cashboxBalances')
          .filter(cb => cb.currency !== Currency.IRT_BANK) // Exclude the conceptual IRT_BANK cashbox
          .map(cb => ({
            id: `cashbox_${cb.currency}`,
            name: `صندوق ${cb.currency}`,
            currency: cb.currency,
        }));
        const bankAssets = this.db.get<BankAccount>('bankAccounts')
          .filter(ba => ba.status === 'Active')
          .map(ba => ({
            id: `bank_${ba.id}`,
            name: `${ba.bankName} - ${ba.accountNumber}`,
            currency: ba.currency,
        }));
        return [...cashboxAssets, ...bankAssets];
    }
    async getAvailableAssets(): Promise<Asset[]> {
        return this._getAllAssets();
    }

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
                const updates: Partial<BankAccount> = { balance: bankAccount.balance + amountChange };
                this.db.update<BankAccount>('bankAccounts', id, updates);
                return { success: true };
            }
            return { success: false, error: 'حساب بانکی یافت نشد' };
        }
        return { success: false, error: 'نوع دارایی نامعتبر است' };
    }
    
    // FIX: Add initiateForeignExchange method to handle the first step of a foreign exchange.
    async initiateForeignExchange(payload: InitiateForeignExchangePayload): Promise<ForeignTransaction | { error: string }> {
        const { user, description, fromAssetId, fromAmount } = payload;

        const allAssets = this._getAllAssets();
        const fromAsset = allAssets.find(a => a.id === fromAssetId);
        if (!fromAsset) return { error: 'دارایی مبدا نامعتبر است.' };

        const transactionId = this.generateId('FT');
        const reason = `برد بابت تبادله ${transactionId}: ${description}`;

        const cashRequest = await this.createCashboxRequest({
            requestType: 'withdrawal',
            amount: fromAmount,
            currency: fromAsset.currency,
            reason,
            user,
            bankAccountId: fromAssetId.startsWith('bank_') ? fromAssetId.substring(5) : undefined,
            linkedEntity: { type: 'ForeignTransaction', id: transactionId, description: reason }
        });

        if ('error' in cashRequest) {
            return cashRequest;
        }

        const newTransaction: ForeignTransaction = {
            id: transactionId,
            timestamp: new Date(),
            description,
            user: user.name,
            status: ForeignTransactionStatus.PendingWithdrawalApproval,
            fromAssetId,
            fromAssetName: fromAsset.name,
            fromCurrency: fromAsset.currency,
            fromAmount,
            withdrawalRequestId: cashRequest.id,
        };

        this.logActivity(user.name, `درخواست تبادله ${fromAmount} ${fromAsset.currency} از ${fromAsset.name} را ثبت کرد.`);
        return this.db.add('foreignTransactions', newTransaction);
    }

    // FIX: Add completeForeignExchange method to handle the second step of a foreign exchange.
    async completeForeignExchange(payload: CompleteForeignExchangePayload): Promise<ForeignTransaction | { error: string }> {
        const { user, transactionId, toAssetId, toAmount } = payload;
        
        const transaction = this.db.getById<ForeignTransaction>('foreignTransactions', transactionId);
        if (!transaction) return { error: 'تبادله مورد نظر یافت نشد.' };
        if (transaction.status !== ForeignTransactionStatus.PendingDeposit) return { error: 'این تبادله در وضعیت مناسب برای تکمیل نیست.' };

        const allAssets = this._getAllAssets();
        const toAsset = allAssets.find(a => a.id === toAssetId);
        if (!toAsset) return { error: 'دارایی مقصد نامعتبر است.' };
        
        const reason = `رسید بابت تبادله ${transactionId}: ${transaction.description}`;

        const cashRequest = await this.createCashboxRequest({
            requestType: 'deposit',
            amount: toAmount,
            currency: toAsset.currency,
            reason,
            user,
            bankAccountId: toAssetId.startsWith('bank_') ? toAssetId.substring(5) : undefined,
            linkedEntity: { type: 'ForeignTransaction', id: transactionId, description: reason }
        });

        if ('error' in cashRequest) {
            return cashRequest;
        }
        
        const updates: Partial<ForeignTransaction> = {
            status: ForeignTransactionStatus.PendingDepositApproval,
            toAssetId,
            toAssetName: toAsset.name,
            toCurrency: toAsset.currency,
            toAmount,
            depositRequestId: cashRequest.id,
        };
        
        this.logActivity(user.name, `مرحله دوم تبادله ${transactionId} را با واریز ${toAmount} ${toAsset.currency} ثبت کرد.`);
        const updatedTransaction = this.db.update<ForeignTransaction>('foreignTransactions', transactionId, updates);
        return updatedTransaction || { error: 'خطا در بروزرسانی تبادله.' };
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
    
    private _rollbackAssetBalances(fromAssetId: string, fromBalance: number, toAssetId: string, toBalance: number) {
        const [fromType, fromId] = fromAssetId.split(/_(.*)/s);
        if (fromType === 'cashbox') {
            this.db.get<CashboxBalance>('cashboxBalances').find(b => b.currency === fromId as Currency)!.balance = fromBalance;
        } else {
            const fromUpdates: Partial<BankAccount> = { balance: fromBalance };
            this.db.update<BankAccount>('bankAccounts', fromId, fromUpdates);
        }

        const [toType, toId] = toAssetId.split(/_(.*)/s);
        if (toType === 'cashbox') {
            this.db.get<CashboxBalance>('cashboxBalances').find(b => b.currency === toId as Currency)!.balance = toBalance;
        } else {
            const toUpdates: Partial<BankAccount> = { balance: toBalance };
            this.db.update<BankAccount>('bankAccounts', toId, toUpdates);
        }
    }

    async performInternalCustomerExchange(payload: InternalCustomerExchangePayload): Promise<{success: true} | { error: string }> {
        const { customerId, fromCurrency, fromAmount, toCurrency, toAmount, rate, user } = payload;
        
        const customer = await this.getCustomerById(customerId);
        if (!customer) return { error: 'مشتری یافت نشد.' };
        
        const currentBalance = customer.balances[fromCurrency] || 0;
        if (currentBalance < fromAmount) {
            return { error: `موجودی ${fromCurrency} مشتری کافی نیست. موجودی فعلی: ${currentBalance}` };
        }

        const newExchange: InternalExchange = {
            id: this.generateId('IEX'),
            timestamp: new Date(),
            customerId,
            fromCurrency,
            fromAmount,
            toCurrency,
            toAmount,
            rate,
            user: user.name,
        };
        this.db.add('internalExchanges', newExchange);
        
        const debitDesc = `تبدیل ${fromAmount} ${fromCurrency} به ${toCurrency} با نرخ ${rate}`;
        this._updateCustomerBalance(customerId, fromAmount, fromCurrency, 'debit', debitDesc, newExchange.id, 'InternalExchange');

        const creditDesc = `دریافت ${toAmount} ${toCurrency} از تبدیل ${fromCurrency} با نرخ ${rate}`;
        this._updateCustomerBalance(customerId, toAmount, toCurrency, 'credit', creditDesc, newExchange.id, 'InternalExchange');
        
        this.logActivity(user.name, `مبلغ ${fromAmount} ${fromCurrency} از حساب ${customer.name} را به ${toAmount} ${toCurrency} تبدیل کرد.`);
        
        notificationService.sendWhatsAppNotification(customer.whatsappNumber, `مبلغ ${fromAmount} ${fromCurrency} از حساب شما به ${toAmount} ${toCurrency} با نرخ ${rate} تبدیل شد. SarrafAI`);
        
        return { success: true };
    }


    async getForeignTransactions(): Promise<ForeignTransaction[]> { return this.db.get('foreignTransactions'); }
    
    async getInternalExchangesForCustomer(customerId: string): Promise<InternalExchange[]> {
        return this.db.get<InternalExchange>('internalExchanges').filter(ex => ex.customerId === customerId);
    }

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
        
        if (amount <= 0 || commissionPercentage < 0) return { error: 'مبلغ و فیصدی کمیشن باید معتبر باشند.' };
        if (!sourceAccountNumber) return { error: 'شماره حساب مبدأ الزامی است.' };

        const currency = Currency.IRT_BANK;
        const bankAccount = this.db.getById<BankAccount>('bankAccounts', receivedIntoBankAccountId);
        if (!bankAccount) return { error: 'حساب بانکی دریافت کننده وجه یافت نشد.' };
        if (bankAccount.currency !== currency) return { error: `این عملیات فقط برای حساب‌های تومان بانکی (${currency}) مجاز است.` };

        const transferId = this.generateId('CTF');
        const reason = `واریز وجه کمیشن‌کاری از طرف ${initiatorName} به حساب ${bankAccount.bankName}`;
        const cashRequest = await this.createCashboxRequest({
            requestType: 'deposit',
            amount,
            currency,
            reason,
            user,
            bankAccountId: receivedIntoBankAccountId,
            sourceAccountNumber,
            linkedEntity: { type: 'CommissionTransfer', id: transferId, description: reason }
        });

        if ('error' in cashRequest) return cashRequest;

        const newTransfer: CommissionTransfer = {
            id: transferId,
            createdAt: new Date(),
            initiatorType,
            initiatorId,
            amount,
            currency,
            sourceAccountNumber,
            receivedIntoBankAccountId,
            commissionPercentage,
            status: CommissionTransferStatus.PendingDepositApproval,
            createdBy: user.name,
            depositRequestId: cashRequest.id,
        };

        this.logActivity(user.name, `درخواست ورود وجه کمیشن‌کاری به مبلغ ${amount} ${currency} از ${initiatorName} را ثبت کرد.`);
        return this.db.add('commissionTransfers', newTransfer);
    }

    async executeCommissionTransfer(payload: ExecuteCommissionTransferPayload): Promise<CommissionTransfer | { error: string }> {
        const { user, transferId, paidFromBankAccountId, destinationAccountNumber } = payload;

        const transfer = this.db.getById<CommissionTransfer>('commissionTransfers', transferId);
        if (!transfer) return { error: 'حواله کمیشن‌کاری یافت نشد.' };
        if (transfer.status !== CommissionTransferStatus.PendingExecution) return { error: 'این حواله در وضعیت مناسب برای اجرا نیست.' };

        const bankAccount = this.db.getById<BankAccount>('bankAccounts', paidFromBankAccountId);
        if (!bankAccount) return { error: 'حساب بانکی پرداخت کننده وجه یافت نشد.' };
        if (bankAccount.currency !== transfer.currency) return { error: `واحد پولی حساب بانکی (${bankAccount.currency}) با واحد پولی حواله (${transfer.currency}) مطابقت ندارد.` };

        const commissionAmount = transfer.amount * (transfer.commissionPercentage / 100);
        const finalAmountPaid = transfer.amount - commissionAmount;

        if (bankAccount.balance < finalAmountPaid) {
            return { error: `موجودی حساب بانکی ${bankAccount.bankName} (${new Intl.NumberFormat().format(bankAccount.balance)}) کافی نیست. مبلغ مورد نیاز: ${new Intl.NumberFormat().format(finalAmountPaid)}` };
        }
        
        const reason = `پرداخت نهایی حواله کمیشن‌کاری ${transferId} به حساب ${destinationAccountNumber}`;
        const cashRequest = await this.createCashboxRequest({
            requestType: 'withdrawal',
            amount: finalAmountPaid,
            currency: transfer.currency,
            reason,
            user,
            bankAccountId: paidFromBankAccountId,
            destinationAccountNumber,
            linkedEntity: { type: 'CommissionTransfer', id: transferId, description: reason }
        });

        if ('error' in cashRequest) return cashRequest;
        
        const transferUpdates: Partial<CommissionTransfer> = {
            status: CommissionTransferStatus.PendingWithdrawalApproval,
            completedAt: new Date(),
            paidFromBankAccountId,
            destinationAccountNumber,
            commissionAmount,
            finalAmountPaid,
            withdrawalRequestId: cashRequest.id,
        };

        const updatedTransfer = this.db.update<CommissionTransfer>('commissionTransfers', transferId, transferUpdates);
        
        this.logActivity(user.name, `دستور پرداخت حواله کمیشن‌کاری ${transferId} را به مبلغ نهایی ${finalAmountPaid} ${transfer.currency} صادر کرد.`);
        
        const initiator = transfer.initiatorType === 'Customer'
            ? await this.getCustomerById(transfer.initiatorId)
            : await this.getPartnerAccountById(transfer.initiatorId);
            
        if(initiator && initiator.whatsappNumber && updatedTransfer?.status === CommissionTransferStatus.Completed) {
            notificationService.sendWhatsAppNotification(initiator.whatsappNumber, `مبلغ ${new Intl.NumberFormat().format(finalAmountPaid)} ${transfer.currency} طبق دستور شما به حساب ${destinationAccountNumber} واریز گردید. کمیسیون: ${new Intl.NumberFormat().format(commissionAmount)} ${transfer.currency}. SarrafAI`);
        }
        
        return updatedTransfer || { error: 'خطا در به‌روزرسانی حواله.' };
    }


    async generateReport(payload: GenerateReportPayload): Promise<ProfitAndLossReportData | CashboxSummaryReportData | InternalLedgerReportData | { error: string }> {
        const { reportType, startDate, endDate, currency } = payload;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (reportType === ReportType.InternalLedger) {
            const allTransactions = this.db.get<ForeignTransaction>('foreignTransactions');
            const filtered = allTransactions.filter(tx => {
                const txDate = tx.timestamp;
                return txDate >= start && txDate <= end;
            });
            return { transactions: filtered.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()) };
        }
        
        if (reportType === ReportType.ProfitAndLoss) {
            const revenueItems: { date: Date; description: string; amount: number }[] = [];
            const expenseItems: { date: Date; description: string; amount: number }[] = [];

            const domesticTransfers = this.db.get<DomesticTransfer>('domesticTransfers');
            domesticTransfers
                .filter(t => {
                    const completedDate = t.history.find(h => h.status === TransferStatus.Executed)?.timestamp;
                    return completedDate && completedDate >= start && completedDate <= end && t.commission > 0 && t.currency === payload.currency;
                })
                .forEach(t => {
                    const completedDate = t.history.find(h => h.status === TransferStatus.Executed)!.timestamp;
                    revenueItems.push({
                        date: completedDate,
                        description: `کارمزد حواله داخلی ${t.id}`,
                        amount: t.commission
                    });
                });

            const commissionTransfers = this.db.get<CommissionTransfer>('commissionTransfers');
            commissionTransfers
                .filter(t => t.status === 'Completed' && t.completedAt && t.completedAt >= start && t.completedAt <= end && t.commissionAmount && t.commissionAmount > 0 && t.currency === payload.currency)
                .forEach(t => {
                    revenueItems.push({
                        date: t.completedAt!,
                        description: `کمیشن حواله ${t.id}`,
                        amount: t.commissionAmount!
                    });
                });

            const allExpenses = this.db.get<Expense>('expenses');
            allExpenses
                .filter(e => {
                    const expenseDate = e.createdAt;
                    return expenseDate >= start && expenseDate <= end && e.currency === payload.currency;
                })
                .forEach(e => {
                    expenseItems.push({
                        date: e.createdAt,
                        description: e.description,
                        amount: e.amount
                    });
                });

            const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
            const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);

            return {
                totalRevenue,
                totalExpenses,
                netProfit: totalRevenue - totalExpenses,
                currency: payload.currency,
                revenueItems: revenueItems.sort((a,b) => b.date.getTime() - a.date.getTime()),
                expenseItems: expenseItems.sort((a,b) => b.date.getTime() - a.date.getTime()),
            } as ProfitAndLossReportData;
        }

        if (reportType === ReportType.CashboxSummary) {
            const allRequests = this.db.get<CashboxRequest>('cashboxRequests');
            
            const filteredRequests = allRequests.filter(req => {
                const reqDate = new Date(req.createdAt);
                const isApproved = req.status === CashboxRequestStatus.Approved || req.status === CashboxRequestStatus.AutoApproved;
                return isApproved && req.currency === currency && reqDate >= start && reqDate <= end;
            });

            let totalInflow = 0;
            let totalOutflow = 0;

            const transactions = filteredRequests.map(req => {
                if (req.requestType === 'deposit') {
                    totalInflow += req.amount;
                    return {
                        id: req.id,
                        timestamp: req.createdAt,
                        type: 'inflow' as const,
                        amount: req.amount,
                        currency: req.currency,
                        reason: req.reason,
                        user: req.requestedBy,
                    };
                } else { // withdrawal
                    totalOutflow += req.amount;
                    return {
                        id: req.id,
                        timestamp: req.createdAt,
                        type: 'outflow' as const,
                        amount: req.amount,
                        currency: req.currency,
                        reason: req.reason,
                        user: req.requestedBy,
                    };
                }
            });

            return {
                totalInflow,
                totalOutflow,
                netChange: totalInflow - totalOutflow,
                currency,
                transactions: transactions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
            } as CashboxSummaryReportData;
        }

        return { error: `گزارش از نوع '${reportType}' هنوز پیاده‌سازی نشده است.` };
    }
    
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
            bankAccountId: amanatData.bankAccountId,
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
        
        const reason = `بابت بازگشت امانت ${amanat.id} به ${amanat.customerName}`;
        const cashRequest = await this.createCashboxRequest({
            requestType: 'withdrawal',
            amount: amanat.amount,
            currency: amanat.currency,
            reason,
            user,
            bankAccountId: amanat.bankAccountId,
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