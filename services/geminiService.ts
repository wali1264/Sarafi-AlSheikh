import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Currency, ExpenseCategory, ReportType, TransferStatus } from '../types';

// TODO: For production, this key should be moved to a secure environment variable (e.g., Vercel Environment Variables)
// and accessed via `process.env.API_KEY`. Hardcoding is for temporary experimental deployment only.
const apiKey = 'AIzaSyDja-PjvYDlcBaRV3g0dNxJU0LEonda2As';

class GeminiService {
    public ai: GoogleGenAI;
    public tools: { functionDeclarations: FunctionDeclaration[] }[];

    constructor(apiKey: string | undefined) {
        // Initialize with the key, even if it's undefined. The API will handle the error upon first call.
        this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
        this.tools = [{ functionDeclarations: this.getFunctionDeclarations() }];
    }

    private getFunctionDeclarations(): FunctionDeclaration[] {
        return [
            {
                name: 'createAccountTransfer',
                description: 'انتقال مبلغ بین حساب دو مشتری ثبت شده در سیستم',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        fromCustomerCode: { type: Type.STRING, description: 'کد مشتری که پول از حساب او کسر می‌شود' },
                        toCustomerCode: { type: Type.STRING, description: 'کد مشتری که پول به حساب او اضافه می‌شود' },
                        amount: { type: Type.NUMBER, description: 'مبلغ انتقال' },
                        currency: { type: Type.STRING, description: 'واحد پولی انتقال', enum: Object.values(Currency) },
                        description: { type: Type.STRING, description: 'توضیحات مربوط به انتقال' },
                    },
                    required: ['fromCustomerCode', 'toCustomerCode', 'amount', 'currency', 'description'],
                },
            },
            {
                name: 'createCustomer',
                description: 'ثبت یک مشتری جدید در سیستم با موجودی‌های اولیه',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: 'نام کامل مشتری' },
                        code: { type: Type.STRING, description: 'کد منحصر به فرد مشتری' },
                        whatsappNumber: { type: Type.STRING, description: 'شماره واتس‌اپ مشتری' },
                        balances: {
                            type: Type.OBJECT,
                            description: 'موجودی‌های اولیه برای هر ارز. برای بدهکاری از مقادیر منفی استفاده کنید.',
                            properties: {
                                AFN: { type: Type.NUMBER, description: 'موجودی اولیه به افغانی', nullable: true },
                                USD: { type: Type.NUMBER, description: 'موجودی اولیه به دالر آمریکا', nullable: true },
                                PKR: { type: Type.NUMBER, description: 'موجودی اولیه به روپیه پاکستان', nullable: true },
                                EUR: { type: Type.NUMBER, description: 'موجودی اولیه به یورو', nullable: true },
                                IRT_BANK: { type: Type.NUMBER, description: 'موجودی اولیه به تومان بانکی', nullable: true },
                                IRT_CASH: { type: Type.NUMBER, description: 'موجودی اولیه به تومان نقدی', nullable: true },
                            }
                        }
                    },
                    required: ['name', 'code', 'whatsappNumber'],
                },
            },
            {
                name: 'createDomesticTransfer',
                description: 'ایجاد یک حواله داخلی جدید',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        senderName: { type: Type.STRING, description: 'نام کامل فرستنده' },
                        senderTazkereh: { type: Type.STRING, description: 'شماره تذکره فرستنده' },
                        receiverName: { type: Type.STRING, description: 'نام کامل گیرنده' },
                        receiverTazkereh: { type: Type.STRING, description: 'شماره تذکره گیرنده' },
                        amount: { type: Type.NUMBER, description: 'مبلغ حواله' },
                        currency: { type: Type.STRING, description: 'واحد پولی حواله', enum: Object.values(Currency) },
                        commission: { type: Type.NUMBER, description: 'کارمزد حواله' },
                        destinationProvince: { type: Type.STRING, description: 'ولایت مقصد' },
                        partnerSarraf: { type: Type.STRING, description: 'نام صراف همکار در مقصد' },
                    },
                    required: ['senderName', 'senderTazkereh', 'receiverName', 'receiverTazkereh', 'amount', 'currency', 'commission', 'destinationProvince', 'partnerSarraf'],
                },
            },
            {
                name: 'createPartner',
                description: 'ثبت یک صراف همکار جدید با موجودی‌های اولیه برای ارزهای مختلف',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: 'نام کامل صراف همکار' },
                        balances: {
                            type: Type.OBJECT,
                            description: 'موجودی‌های اولیه برای هر ارز. برای بدهکاری از مقادیر منفی استفاده کنید.',
                            properties: {
                                AFN: { type: Type.NUMBER, description: 'موجودی اولیه به افغانی', nullable: true },
                                USD: { type: Type.NUMBER, description: 'موجودی اولیه به دالر آمریکا', nullable: true },
                                PKR: { type: Type.NUMBER, description: 'موجودی اولیه به روپیه پاکستان', nullable: true },
                                EUR: { type: Type.NUMBER, description: 'موجودی اولیه به یورو', nullable: true },
                                IRT_BANK: { type: Type.NUMBER, description: 'موجودی اولیه به تومان بانکی', nullable: true },
                                IRT_CASH: { type: Type.NUMBER, description: 'موجودی اولیه به تومان نقدی', nullable: true },
                            }
                        }
                    },
                    required: ['name', 'balances'],
                },
            },
             {
                name: 'updatePartner',
                description: 'ویرایش نام یک صراف همکار',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID همکار مورد نظر' },
                        name: { type: Type.STRING, description: 'نام جدید برای همکار' },
                    },
                    required: ['id', 'name'],
                },
            },
            {
                name: 'deletePartner',
                description: 'غیرفعال کردن (حذف ایمن) یک صراف همکار',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID همکاری که باید غیرفعال شود' },
                    },
                    required: ['id'],
                },
            },
             {
                name: 'updateBankAccount',
                description: 'ویرایش اطلاعات یک حساب بانکی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID حساب بانکی' },
                        accountHolder: { type: Type.STRING, description: 'نام جدید صاحب حساب' },
                        bankName: { type: Type.STRING, description: 'نام جدید بانک' },
                        accountNumber: { type: Type.STRING, description: 'شماره حساب جدید' },
                        cardToCardNumber: { type: Type.STRING, description: 'شماره کارت جدید (اختیاری)' },
                    },
                    required: ['id', 'accountHolder', 'bankName', 'accountNumber'],
                },
            },
            {
                name: 'deleteBankAccount',
                description: 'غیرفعال کردن (حذف ایمن) یک حساب بانکی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: 'ID حساب بانکی که باید غیرفعال شود' },
                    },
                    required: ['id'],
                },
            },
            {
                name: 'updateTransferStatus',
                description: 'به‌روزرسانی وضعیت یک حواله داخلی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        transferId: { type: Type.STRING, description: 'کد رهگیری حواله، مثلا DT-12345' },
                        newStatus: { type: Type.STRING, description: 'وضعیت جدید حواله', enum: [TransferStatus.Executed, TransferStatus.Paid] },
                    },
                    required: ['transferId', 'newStatus'],
                },
            },
            {
                name: 'payoutIncomingTransfer',
                description: 'پرداخت یک حواله ورودی به مشتری',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        transferId: { type: Type.STRING, description: 'کد رهگیری حواله ورودی' },
                    },
                    required: ['transferId'],
                },
            },
            {
                name: 'logExpense',
                description: 'ثبت یک هزینه یا مصرف جدید برای صرافی',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, description: 'دسته‌بندی هزینه', enum: Object.values(ExpenseCategory) },
                        amount: { type: Type.NUMBER, description: 'مبلغ هزینه' },
                        currency: { type: Type.STRING, description: 'واحد پولی هزینه', enum: Object.values(Currency) },
                        description: { type: Type.STRING, description: 'توضیحات مربوط به هزینه' },
                    },
                    required: ['category', 'amount', 'currency', 'description'],
                },
            },
             {
                name: 'logForeignTransaction',
                description: 'ثبت یک معامله تبادله ارز. این تابع می‌تواند تراکنش‌های پیچیده شامل مشتری و کارمزد را مدیریت کند.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING, description: 'شرح تبادله' },
                        fromAssetId: { type: Type.STRING, description: 'کد دارایی مبدا (مانند cashbox_USD یا bank_ba-1). این مبلغ واقعی است که از دارایی شما کسر می‌شود.' },
                        fromAmount: { type: Type.NUMBER, description: 'مبلغ برداشتی از مبدا' },
                        toAssetId: { type: Type.STRING, description: 'کد دارایی مقصد (مانند cashbox_AFN یا bank_ba-2). این مبلغ واقعی است که به دارایی شما اضافه می‌شود.' },
                        toAmount: { type: Type.NUMBER, description: 'مبلغ واریزی به مقصد' },
                        customerCode: { type: Type.STRING, description: 'کد مشتری (اختیاری)' },
                        customerAmount: { type: Type.NUMBER, description: 'مبلغی که باید در حساب مشتری ثبت شود (اختیاری)' },
                        customerTransactionType: { type: Type.STRING, description: 'نوع تراکنش برای مشتری: debit (بدهکار) یا credit (بستانکار) (اختیاری)', enum: ['debit', 'credit'] },
                    },
                    required: ['description', 'fromAssetId', 'fromAmount', 'toAssetId', 'toAmount'],
                },
            },
            {
                name: 'getBalanceForPartner',
                description: 'دریافت موجودی حساب یک صراف همکار',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        partnerName: { type: Type.STRING, description: 'نام صراف همکار' },
                    },
                    required: ['partnerName'],
                },
            },
            {
                name: 'settlePartnerBalance',
                description: 'ثبت تسویه حساب با یک صراف همکار',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        partnerName: { type: Type.STRING, description: 'نام صراف همکار' },
                        amount: { type: Type.NUMBER, description: 'مبلغ تسویه شده' },
                        currency: { type: Type.STRING, description: 'واحد پولی تسویه', enum: Object.values(Currency) },
                    },
                    required: ['partnerName', 'amount', 'currency'],
                },
            },
            {
                name: 'requestCashboxWithdrawal',
                description: 'ثبت درخواست برداشت پول از صندوق',
                 parameters: {
                    type: Type.OBJECT,
                    properties: {
                        amount: { type: Type.NUMBER, description: 'مبلغ درخواستی' },
                        currency: { type: Type.STRING, description: 'واحد پولی', enum: Object.values(Currency) },
                        reason: { type: Type.STRING, description: 'دلیل درخواست' },
                    },
                    required: ['amount', 'currency', 'reason'],
                },
            },
            {
                name: 'analyzeBusinessData',
                description: 'به سوالات تحلیلی و گزارش‌گیری در مورد کسب و کار پاسخ می‌دهد. مثال: "پرکارترین همکار ما کیست؟" یا "سود ما در ماه گذشته چقدر بود؟"',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        query: { type: Type.STRING, description: 'سوال کاربر به زبان طبیعی' },
                    },
                    required: ['query'],
                },
            }
        ];
    }
}

const geminiService = new GeminiService(apiKey);
export default geminiService;