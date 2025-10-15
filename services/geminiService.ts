import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { Currency, ExpenseCategory, ForeignTransactionType, ReportType, TransferStatus } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

class GeminiService {
    public ai: GoogleGenAI;
    public tools: { functionDeclarations: FunctionDeclaration[] }[];

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
        this.tools = [{ functionDeclarations: this.getFunctionDeclarations() }];
    }

    private getFunctionDeclarations(): FunctionDeclaration[] {
        return [
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

const geminiService = new GeminiService(process.env.API_KEY);
export default geminiService;