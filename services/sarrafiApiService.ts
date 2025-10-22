import { supabase } from './supabaseClient';
import { 
    User, Role, Permissions, DomesticTransfer, CreateDomesticTransferPayload, 
    UpdateTransferStatusPayload, TransferStatus, PartnerAccount, PartnerTransaction, 
    Currency, Expense, CreateExpensePayload, CashboxRequest,
    CreateCashboxRequestPayload, ResolveCashboxRequestPayload, CashboxRequestStatus,
    CashboxBalance, SystemSettings, UpdateSystemSettingsPayload, ActivityLog,
    Customer, CustomerTransaction, AccountTransfer, CreateAccountTransferPayload, ReassignTransferPayload,
    BankAccount, AddBankAccountPayload,
    ForeignTransaction, IncreaseCashboxBalancePayload,
    InitiateForeignExchangePayload, CompleteForeignExchangePayload, ForeignTransactionStatus,
    CreateUserPayload, UpdateUserPayload, DeleteUserPayload, CreateRolePayload, UpdateRolePayload, CreatePartnerPayload,
    UpdatePartnerPayload, DeletePartnerPayload, UpdateBankAccountPayload, DeleteBankAccountPayload,
    CreateCustomerPayload, UpdateCustomerPayload, FindTransfersByQueryPayload, PayoutIncomingTransferPayload,
    DashboardAnalyticsData, ProfitAndLossReportData, ReportType, CashboxSummaryReportData, GenerateReportPayload,
    GetPartnerAccountByNamePayload, Asset, InternalCustomerExchangePayload,
    InternalLedgerReportData, CommissionTransfer, LogCommissionTransferPayload, ExecuteCommissionTransferPayload,
    Amanat, CreateAmanatPayload, ReturnAmanatPayload,
    ReceiveFromPartnerPayload,
    PayToPartnerPayload,
    AuthenticatedUser,
    ExternalLogin,
    CreateExternalLoginPayload,
    DeleteExternalLoginPayload,
    InternalExchange,
} from '../types';

// --- Sarrafi API Service with Supabase ---

class SarrafiApiService {

    private async logActivity(user: string, action: string) {
        await supabase.from('activityLogs').insert({ user, action });
    }
    
    // --- Auth ---
    async login(username: string, password?: string): Promise<AuthenticatedUser | { error: string }> {
        const { data, error } = await supabase.rpc('login', {
            p_username: username,
            p_password: password
        });

        if (error) {
            console.error('Login RPC error:', error);
            return { error: error.message };
        }
        if (!data) {
             return { error: 'نام کاربری یا رمز عبور اشتباه است.' };
        }
        
        // The RPC function is expected to return a JSON object that matches the AuthenticatedUser structure.
        return data as AuthenticatedUser;
    }

    // --- External Logins ---
    async getExternalLogins(): Promise<(ExternalLogin & { entityName: string })[]> {
         const { data, error } = await supabase.rpc('get_external_logins_with_details');
         if (error) {
            console.error(error);
            return [];
        }
        return data || [];
    }

    async createExternalLogin(payload: CreateExternalLoginPayload): Promise<ExternalLogin | { error: string }> {
        const { data, error } = await supabase.from('externalLogins').insert({
            username: payload.username,
            password: payload.password,
            loginType: payload.loginType,
            linkedEntityId: payload.linkedEntityId
        }).select().single();

        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `دسترسی کاربری برای ${payload.loginType} با نام کاربری ${payload.username} ایجاد کرد.`);
        return data;
    }
    
    async deleteExternalLogin(payload: DeleteExternalLoginPayload): Promise<{ success: boolean }> {
        const { error } = await supabase.from('externalLogins').delete().eq('id', payload.id);
        if (error) return { success: false };
        // We don't know the username after deletion, so log might be less specific
        await this.logActivity(payload.user.name, `دسترسی کاربر خارجی با شناسه ${payload.id} را حذف کرد.`);
        return { success: true };
    }

    // --- Users & Roles ---
    async getUsers(): Promise<User[]> { 
        const { data, error } = await supabase.from('users').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async createUser(payload: CreateUserPayload): Promise<User> {
        const { data, error } = await supabase.from('users').insert(payload).select().single();
        if (error) throw error;
        return data;
    }
    async updateUser(payload: UpdateUserPayload): Promise<User | undefined> {
        const { id, ...updates } = payload;
        if (!updates.password) delete updates.password;
        const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async deleteUser(payload: DeleteUserPayload): Promise<{ success: boolean }> {
        const { error } = await supabase.from('users').delete().eq('id', payload.id);
        return { success: !error };
    }
    
    async getRoles(): Promise<Role[]> { 
        const { data, error } = await supabase.from('roles').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async createRole(payload: CreateRolePayload): Promise<Role> {
        const { data, error } = await supabase.from('roles').insert(payload).select().single();
        if (error) throw error;
        return data;
    }
    async updateRole(payload: UpdateRolePayload): Promise<Role | undefined> {
        const { data, error } = await supabase.from('roles').update(payload).eq('id', payload.id).select().single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async deleteRole(payload: {id: string}): Promise<{ success: boolean }> {
        const { error } = await supabase.from('roles').delete().eq('id', payload.id);
        return { success: !error };
    }

    // --- Customers ---
    async getCustomers(): Promise<Customer[]> { 
        const { data, error } = await supabase.from('customers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getCustomerById(id: string): Promise<Customer | undefined> { 
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async getCustomerByCode(code: string): Promise<Customer | undefined> {
        const { data, error } = await supabase.from('customers').select('*').eq('code', code).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async createCustomer(payload: CreateCustomerPayload): Promise<Customer | { error: string }> {
        const { user, ...customerData } = payload;
        const { data, error } = await supabase.rpc('create_customer', customerData);
        if (error) return { error: error.message };
        await this.logActivity(user.name, `مشتری جدید ${customerData.name} (کد: ${customerData.code}) را ثبت کرد.`);
        return data;
    }
     async updateCustomer(payload: UpdateCustomerPayload): Promise<Customer | { error: string }> {
        const { id, user, ...customerData } = payload;
        const { data, error } = await supabase.from('customers').update(customerData).eq('id', id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `اطلاعات مشتری ${data.name} (کد: ${data.code}) را ویرایش کرد.`);
        return data;
    }
    
    // --- Domestic Transfers ---
    async getDomesticTransfers(): Promise<DomesticTransfer[]> { 
        const { data, error } = await supabase.from('domesticTransfers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getDomesticTransferById(id: string): Promise<DomesticTransfer | undefined> { 
        const { data, error } = await supabase.from('domesticTransfers').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    
    async createDomesticTransfer(payload: CreateDomesticTransferPayload): Promise<DomesticTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('create_domestic_transfer', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `درخواست حواله ${data.id} را به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return data;
    }

    async updateTransferStatus(payload: UpdateTransferStatusPayload): Promise<DomesticTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('update_transfer_status', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `وضعیت حواله ${payload.transferId} را به ${payload.newStatus} تغییر داد.`);
        return data;
    }
    
    async findTransfersByQuery(payload: FindTransfersByQueryPayload): Promise<DomesticTransfer[] | { error: string }> {
        const { data, error } = await supabase.rpc('find_transfers', { query: payload.query });
        if (error) return { error: error.message };
        return data || [];
    }

    async payoutIncomingTransfer(payload: PayoutIncomingTransferPayload): Promise<DomesticTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('payout_incoming_transfer', payload);
        if (error) return { error: error.message };
        return data;
    }

    // --- Partner Accounts ---
    async getPartnerAccounts(): Promise<PartnerAccount[]> { 
        const { data, error } = await supabase.from('partnerAccounts').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getPartnerAccountById(id: string): Promise<PartnerAccount | undefined> { 
        const { data, error } = await supabase.from('partnerAccounts').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async getTransactionsForPartner(partnerId: string): Promise<PartnerTransaction[]> {
        const { data, error } = await supabase.from('partnerTransactions').select('*').eq('partnerId', partnerId);
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    // --- Cashbox ---
    async getCashboxRequests(): Promise<CashboxRequest[]> { 
        const { data, error } = await supabase.from('cashboxRequests').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getCashboxRequestById(id: string): Promise<CashboxRequest | undefined> { 
        const { data, error } = await supabase.from('cashboxRequests').select('*').eq('id', id).single();
        if (error) { console.error(error); return undefined; }
        return data;
    }
    async getCashboxBalances(): Promise<CashboxBalance[]> {
        const { data, error } = await supabase.rpc('get_cashbox_balances');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async createCashboxRequest(payload: CreateCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
       const { data, error } = await supabase.rpc('create_cashbox_request', payload);
       if (error) return { error: error.message };
       await this.logActivity(payload.user.name, `یک درخواست ${payload.requestType} به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
       return data;
    }
    
    async resolveCashboxRequest(payload: ResolveCashboxRequestPayload): Promise<CashboxRequest | { error: string }> {
        const { data, error } = await supabase.rpc('resolve_cashbox_request', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `درخواست صندوق ${payload.requestId} را ${payload.resolution === 'approve' ? 'تایید' : 'رد'} کرد.`);
        return data;
    }

    async increaseCashboxBalance(payload: IncreaseCashboxBalancePayload): Promise<CashboxRequest | { error: string }> {
        // This can be handled by the generic createCashboxRequest RPC
        const reason = `افزایش موجودی دستی توسط مدیر: ${payload.description || 'ثبت موجودی اولیه/جدید'}`;
        const requestPayload: CreateCashboxRequestPayload = {
            requestType: 'deposit',
            amount: payload.amount,
            currency: payload.currency,
            reason,
            user: payload.user,
            linkedEntity: { type: 'Manual', id: 'BALANCE_ADJUST', description: reason },
            bankAccountId: payload.bankAccountId,
            sourceAccountNumber: payload.sourceAccountNumber,
        };
        return this.createCashboxRequest(requestPayload);
    }
    
    // --- Expenses ---
    async getExpenses(): Promise<Expense[]> { 
        const { data, error } = await supabase.from('expenses').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async createExpense(payload: CreateExpensePayload): Promise<Expense | { error: string }> {
        const { data, error } = await supabase.rpc('create_expense', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `هزینه ای به مبلغ ${payload.amount} ${payload.currency} ثبت کرد.`);
        return data;
    }
    
    // --- Reports & Analytics ---
    async getActivityLogs(): Promise<ActivityLog[]> { 
        const { data, error } = await supabase.from('activityLogs').select('*').order('timestamp', { ascending: false }).limit(50);
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    async getDashboardAnalytics(): Promise<DashboardAnalyticsData> {
        const { data, error } = await supabase.rpc('get_dashboard_analytics');
        if (error) {
            console.error('getDashboardAnalytics error', error);
            // Return empty structure on error to prevent UI crash
            return {
                weeklyActivity: { labels: [], domesticCounts: [], foreignCounts: [] },
                partnerActivity: [],
                cashboxSummary: []
            };
        }
        return data;
    }


    async getSystemSettings(): Promise<SystemSettings> { 
        const { data, error } = await supabase.from('systemSettings').select('*').single();
        if (error) {
            console.error(error);
            // return default settings on error
            return { approvalThresholds: {} };
        }
        return data;
    }
    async updateSystemSettings(payload: UpdateSystemSettingsPayload): Promise<SystemSettings> {
        // Assuming there's only one row for settings with a known ID (e.g., 1)
        const { data, error } = await supabase.from('systemSettings').update(payload.settings).eq('id', 1).select().single();
        if (error) throw error;
        return data;
    }
    
    async getFullBusinessContextAsText(): Promise<string> {
        const { data, error } = await supabase.rpc('get_full_business_context');
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data, null, 2);
    }

    // FIX: Add missing getBackupState and restoreState methods to resolve errors in SettingsPage.
    async getBackupState(): Promise<any> {
        const { data, error } = await supabase.rpc('get_backup_state');
        if (error) {
            console.error('getBackupState RPC error:', error);
            throw error;
        }
        return data;
    }

    async restoreState(backupData: any): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase.rpc('restore_state', { p_state_data: backupData });
        if (error) {
            console.error('restoreState RPC error:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    async getTransactionsForCustomer(customerId: string): Promise<CustomerTransaction[]> {
        const { data, error } = await supabase.from('customerTransactions').select('*').eq('customerId', customerId);
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async getPartnerAccountByName(payload: GetPartnerAccountByNamePayload): Promise<PartnerAccount | {error: string}> {
        const { data, error } = await supabase.from('partnerAccounts').select('*').eq('name', payload.partnerName).single();
        if (error) return { error: 'Partner not found' };
        return data;
    }
    
    async settlePartnerBalanceByName(payload: { partnerName: string, amount: number, currency: Currency, type: 'pay' | 'receive', user: User }): Promise<{success: true} | { error: string }> {
        const { data, error } = await supabase.rpc('settle_partner_balance_by_name', {
            p_partner_name: payload.partnerName,
            p_amount: payload.amount,
            p_currency: payload.currency,
            p_type: payload.type,
            p_user: payload.user, // Pass the whole user object
        });
        if (error) return { error: error.message };
        return { success: true };
    }

    async receiveFromPartner(payload: ReceiveFromPartnerPayload): Promise<CashboxRequest | { error: string }> {
        const { data, error } = await supabase.rpc('receive_from_partner', payload);
        if (error) return { error: error.message };
        return data;
    }

    async payToPartner(payload: PayToPartnerPayload): Promise<CashboxRequest | { error: string }> {
        const { data, error } = await supabase.rpc('pay_to_partner', payload);
        if (error) return { error: error.message };
        return data;
    }

     async createAccountTransfer(payload: CreateAccountTransferPayload): Promise<AccountTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('create_account_transfer', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `مبلغ ${payload.amount} ${payload.currency} را بین دو مشتری انتقال داد.`);
        return data;
    }
    async getAccountTransfers(): Promise<AccountTransfer[]> { 
        const { data, error } = await supabase.from('accountTransfers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    async reassignPendingTransfer(payload: ReassignTransferPayload): Promise<AccountTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('reassign_pending_transfer', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `حواله معلق ${payload.transferId} را به مشتری ${payload.finalCustomerCode} تخصیص داد.`);
        return data;
    }
    
    async addBankAccount(payload: AddBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { user, ...accountData } = payload;
        const { data, error } = await supabase.from('bankAccounts').insert(accountData).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `حساب بانکی جدیدی برای ${payload.accountHolder} در بانک ${payload.bankName} ثبت کرد.`);
        return data;
    }


    async getBankAccounts(): Promise<BankAccount[]> { 
        const { data, error } = await supabase.from('bankAccounts').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async createPartner(payload: CreatePartnerPayload): Promise<PartnerAccount | { error: string }> {
        const { user, ...partnerData } = payload;
        const { data, error } = await supabase.rpc('create_partner', partnerData);
        if (error) return { error: error.message };
        await this.logActivity(user.name, `همکار جدیدی با نام "${payload.name}" در ولایت ${payload.province} ثبت کرد.`);
        return data;
    }

    async updatePartner(payload: UpdatePartnerPayload): Promise<PartnerAccount | { error: string}> {
        const { id, user, ...partnerData } = payload;
        const { data, error } = await supabase.from('partnerAccounts').update(partnerData).eq('id', id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `اطلاعات همکار "${data.name}" را ویرایش کرد.`);
        return data;
    }

    async deletePartner(payload: DeletePartnerPayload): Promise<PartnerAccount | { error: string }> {
        const { data, error } = await supabase.from('partnerAccounts').update({ status: 'Inactive' }).eq('id', payload.id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `همکار "${data.name}" را غیرفعال کرد.`);
        return data;
    }

    async updateBankAccount(payload: UpdateBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { id, user, ...accountData } = payload;
        const { data, error } = await supabase.from('bankAccounts').update(accountData).eq('id', id).select().single();
        if (error) return { error: error.message };
        await this.logActivity(user.name, `اطلاعات حساب بانکی "${data.accountHolder} - ${data.bankName}" را ویرایش کرد.`);
        return data;
    }

    async deleteBankAccount(payload: DeleteBankAccountPayload): Promise<BankAccount | { error: string }> {
        const { data, error } = await supabase.from('bankAccounts').update({ status: 'Inactive' }).eq('id', payload.id).select().single();
        if(error) return { error: error.message };
        await this.logActivity(payload.user.name, `حساب بانکی "${data.accountHolder} - ${data.bankName}" را غیرفعال کرد.`);
        return data;
    }
    
    async getAvailableAssets(): Promise<Asset[]> {
        const { data, error } = await supabase.rpc('get_available_assets');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    async initiateForeignExchange(payload: InitiateForeignExchangePayload): Promise<ForeignTransaction | { error: string }> {
        const { data, error } = await supabase.rpc('initiate_foreign_exchange', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `درخواست تبادله ${payload.fromAmount} از دارایی ${payload.fromAssetId} را ثبت کرد.`);
        return data;
    }

    async completeForeignExchange(payload: CompleteForeignExchangePayload): Promise<ForeignTransaction | { error: string }> {
        const { data, error } = await supabase.rpc('complete_foreign_exchange', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `مرحله دوم تبادله ${payload.transactionId} را با واریز ${payload.toAmount} ثبت کرد.`);
        return data;
    }

    async performInternalCustomerExchange(payload: InternalCustomerExchangePayload): Promise<{success: true} | { error: string }> {
        const { error } = await supabase.rpc('perform_internal_customer_exchange', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `مبلغ ${payload.fromAmount} ${payload.fromCurrency} از حساب مشتری ${payload.customerId} را به ${payload.toAmount} ${payload.toCurrency} تبدیل کرد.`);
        return { success: true };
    }


    async getForeignTransactions(): Promise<ForeignTransaction[]> { 
        const { data, error } = await supabase.from('foreignTransactions').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }
    
    async getInternalExchangesForCustomer(customerId: string): Promise<InternalExchange[]> {
        const { data, error } = await supabase.from('internalExchanges').select('*').eq('customerId', customerId);
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async getCommissionTransfers(): Promise<CommissionTransfer[]> {
        const { data, error } = await supabase.from('commissionTransfers').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async logCommissionTransfer(payload: LogCommissionTransferPayload): Promise<CommissionTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('log_commission_transfer', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `درخواست ورود وجه کمیشن‌کاری به مبلغ ${payload.amount} ${payload.receivedIntoBankAccountId} را ثبت کرد.`);
        return data;
    }

    async executeCommissionTransfer(payload: ExecuteCommissionTransferPayload): Promise<CommissionTransfer | { error: string }> {
        const { data, error } = await supabase.rpc('execute_commission_transfer', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `دستور پرداخت حواله کمیشن‌کاری ${payload.transferId} را صادر کرد.`);
        return data;
    }

    async generateReport(payload: GenerateReportPayload): Promise<ProfitAndLossReportData | CashboxSummaryReportData | InternalLedgerReportData | { error: string }> {
        const { data, error } = await supabase.rpc('generate_report', payload);
        if (error) return { error: error.message };
        return data;
    }
    
    async getAmanat(): Promise<Amanat[]> {
        const { data, error } = await supabase.from('amanat').select('*');
        if (error) { console.error(error); return []; }
        return data || [];
    }

    async createAmanat(payload: CreateAmanatPayload): Promise<Amanat | { error: string }> {
        const { data, error } = await supabase.rpc('create_amanat', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `امانتی به مبلغ ${payload.amount} ${payload.currency} برای ${payload.customerName} ثبت کرد.`);
        return data;
    }

    async returnAmanat(payload: ReturnAmanatPayload): Promise<Amanat | { error: string }> {
        const { data, error } = await supabase.rpc('return_amanat', payload);
        if (error) return { error: error.message };
        await this.logActivity(payload.user.name, `امانت ${payload.amanatId} را بازگشت داد.`);
        return data;
    }
}

export default SarrafiApiService;