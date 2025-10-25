import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

// Import necessary components and types for the demo
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DashboardPage from './DashboardPage';
import SettingsPage from './SettingsPage';
import DomesticTransfersPage from './DomesticTransfersPage';
import CashboxPage from './CashboxPage';
import ExpensesPage from './ExpensesPage';

// FIX: AuthContext must be exported from its module to be used here.
import { AuthContext, AuthenticatedUser } from '../contexts/AuthContext';
import ApiContext from '../contexts/ApiContext';
import SarrafiApiService from '../services/sarrafiApiService';
// FIX: Import enums to fix type errors when assigning status strings.
import { User, Role, DomesticTransfer, CashboxRequest, Expense, ExpenseCategory, Currency, TransferStatus, CashboxRequestStatus, ExpenseStatus, PartnerAccount, BankAccount } from '../types';

// --- Mock Data and Services ---

const mockUser: AuthenticatedUser = {
    id: 'demo-admin',
    name: 'مدیر دمو',
    username: 'demoadmin',
    role_id: 'admin_role',
    userType: 'internal',
    role: {
        id: 'admin_role',
        name: 'مدیر کل',
        permissions: {
            dashboard: { view: true },
            settings: { view: true, create: true, edit: true, delete: true },
            domesticTransfers: { view: true, create: true, edit: true, process: true },
            cashbox: { view: true, create: true, approve: true },
            expenses: { view: true, create: true },
            partnerAccounts: { view: true, create: true, edit: true, delete: true },
        },
    },
};

const mockSarrafiApiService = (
    getMockData: () => any,
    updateMockData: (updater: (prev: any) => any) => void
): Partial<SarrafiApiService> => ({
    getUsers: async () => getMockData().users,
    getRoles: async () => getMockData().roles,
    getDomesticTransfers: async () => getMockData().transfers,
    getCashboxRequests: async () => getMockData().cashboxRequests,
    getExpenses: async () => getMockData().expenses,
    getPartnerAccounts: async () => getMockData().partners,
    getBankAccounts: async () => getMockData().bankAccounts,
    getCustomers: async () => [],
    getSystemSettings: async () => ({ approval_thresholds: { [Currency.USD]: 1000 } }),
    getDashboardAnalytics: async () => ({
        weeklyActivity: { labels: ["هفته جاری", "۱ هفته پیش", "۲ هفته پیش", "۳ هفته پیش", "۴ هفته پیش", "۵ هفته پیش"], domesticCounts: [3, 5, 2, 8, 4, 6], foreignCounts: [1, 2, 1, 3, 2, 4] },
        partnerActivity: [{ label: 'صرافی اعتماد', value: 12 }, { label: 'صرافی آریا', value: 8 }],
        cashboxSummary: [{ currency: 'USD', balance: 50000 }, { currency: 'AFN', balance: 2500000 }],
    }),
    createRole: async (payload) => {
        const newRole: Role = { ...payload, id: `role-${Date.now()}` };
        updateMockData(prev => ({ ...prev, roles: [...prev.roles, newRole] }));
        return newRole;
    },
    createUser: async (payload) => {
        const newUser: User = { ...payload, id: `user-${Date.now()}` };
        updateMockData(prev => ({ ...prev, users: [...prev.users, newUser] }));
        return newUser;
    },
    createPartner: async (payload) => {
        const newPartner: PartnerAccount = {
            id: `p-${Date.now()}`,
            name: payload.name,
            province: payload.province,
            whatsapp_number: payload.whatsapp_number,
            balances: {},
            status: 'Active',
        };
        updateMockData(prev => ({...prev, partners: [...prev.partners, newPartner]}));
        return newPartner;
    },
    addBankAccount: async(payload) => {
        const newAccount: BankAccount = {
            id: `ba-${Date.now()}`,
            account_holder: payload.account_holder,
            bank_name: payload.bank_name,
            account_number: payload.account_number,
            balance: 0,
            currency: payload.currency,
            status: 'Active',
        };
        updateMockData(prev => ({...prev, bankAccounts: [...prev.bankAccounts, newAccount]}));
        return newAccount;
    },
    createDomesticTransfer: async (payload) => {
        const newTransfer: DomesticTransfer = {
            id: `DT-${Math.floor(10000 + Math.random() * 90000)}`,
            created_at: new Date(),
            sender: { name: payload.sender_name, tazkereh: payload.sender_tazkereh },
            receiver: { name: payload.receiver_name, tazkereh: payload.receiver_tazkereh },
            amount: payload.amount,
            currency: payload.currency,
            commission: payload.commission,
            destination_province: payload.destination_province,
            partner_sarraf: payload.partner_sarraf,
            status: payload.is_cash_payment ? TransferStatus.PendingCashbox : TransferStatus.Unexecuted,
            created_by: 'مدیر دمو',
            history: [{ status: payload.is_cash_payment ? TransferStatus.PendingCashbox : TransferStatus.Unexecuted, timestamp: new Date(), user: 'مدیر دemo' }],
        };
         const newCashboxRequest: CashboxRequest = {
            id: `CR-${Math.floor(10000 + Math.random() * 90000)}`,
            created_at: new Date(),
            requested_by: 'مدیر دمو',
            status: CashboxRequestStatus.Pending,
            reviewed: false,
            request_type: 'deposit',
            amount: payload.amount + payload.commission,
            currency: payload.currency,
            reason: `دریافت وجه بابت حواله ${newTransfer.id}`,
            linked_entity: { type: 'DomesticTransfer', id: newTransfer.id, description: '' }
        };

        updateMockData(prev => ({
            ...prev,
            transfers: [newTransfer, ...prev.transfers],
            cashboxRequests: payload.is_cash_payment ? [newCashboxRequest, ...prev.cashboxRequests] : prev.cashboxRequests,
        }));
        return newTransfer;
    },
    resolveCashboxRequest: async (payload) => {
        let updatedRequest: CashboxRequest | undefined;
        updateMockData(prev => {
            const newRequests = prev.cashboxRequests.map((r: CashboxRequest) => {
                if (r.id === payload.request_id) {
                    updatedRequest = { ...r, status: payload.resolution === 'approve' ? CashboxRequestStatus.Approved : CashboxRequestStatus.Rejected, resolved_by: 'مدیر دمو', resolved_at: new Date() };
                    return updatedRequest;
                }
                return r;
            });
            return { ...prev, cashboxRequests: newRequests };
        });
        return updatedRequest!;
    },
    createExpense: async (payload) => {
        const newExpense: Expense = {
            id: `EXP-${Date.now()}`,
            created_at: new Date(),
            user: payload.user.name,
            category: payload.category,
            amount: payload.amount,
            currency: payload.currency,
            description: payload.description,
            status: ExpenseStatus.PendingApproval,
        };
        const newCashboxRequest: CashboxRequest = {
            id: `CR-${Math.floor(10000 + Math.random() * 90000)}`,
            created_at: new Date(),
            requested_by: 'مدیر دمو',
            status: CashboxRequestStatus.Pending,
            reviewed: false,
            request_type: 'withdrawal',
            amount: payload.amount,
            currency: payload.currency,
            reason: payload.description,
            linked_entity: { type: 'Expense', id: newExpense.id, description: '' }
        };
        updateMockData(prev => ({ 
            ...prev, 
            expenses: [newExpense, ...prev.expenses],
            cashboxRequests: [newCashboxRequest, ...prev.cashboxRequests],
        }));
        return newExpense;
    }
});

type DemoAction = 
    | { type: 'navigate'; path: string }
    | { type: 'speak'; text: string }
    | { type: 'wait'; duration: number }
    | { type: 'type'; selector: string; text: string; speed?: number }
    | { type: 'click'; selector: string; }
    | { type: 'show_transcript'; source: 'user' | 'ai', text: string }
    | { type: 'end'; };

const demoScript: DemoAction[] = [
    { type: 'wait', duration: 1500 },
    { type: 'speak', text: "با سلام. به دموی زنده و هوشمند اپلیکیشن صرافی الشیخ خوش آمدید." },
    { type: 'wait', duration: 4000 },
    { type: 'speak', text: "در این پیش‌نمایش ۶ دقیقه‌ای، شما را با یک روز کامل کاری در یک صرافی مدرن همراهی می‌کنیم تا قدرت، امنیت و سادگی سیستم ما را از نزدیک لمس کنید." },
    { type: 'wait', duration: 9000 },
    { type: 'speak', text: "کار خود را از داشبورد مدیریتی شروع می‌کنیم. اینجا قلب تپنده صرافی شماست و تمام اطلاعات کلیدی را در یک نگاه به شما نمایش می‌دهد." },
    { type: 'wait', duration: 8000 },
    { type: 'speak', text: "برای شروع یک روز کاری، ابتدا باید تنظیمات اولیه سیستم را پیکربندی کنیم. به بخش تنظیمات می‌رویم." },
    { type: 'navigate', path: 'settings' },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "اولین قدم، تعریف نقش‌های کاربری است. ما به یک نقش جدید برای صندوقدار نیاز داریم." },
    { type: 'click', selector: "button:contains('مدیریت نقش‌ها')" },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "button:contains('ایجاد نقش جدید')" },
    { type: 'wait', duration: 1000 },
    { type: 'speak', text: "نام نقش را 'صندوقدار' وارد کرده و دسترسی‌های لازم مانند مشاهده و تایید نهایی در صندوق را برایش فعال می‌کنیم." },
    { type: 'type', selector: "input[placeholder='نام نقش (مثلا: صندوقدار)']", text: 'صندوقدار' },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "label:contains('مشاهده')" }, // This will click the first one for dashboard
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "label:contains('تایید نهایی / ملاحظه')" }, // This will click the first one for cashbox approve
    { type: 'wait', duration: 1000 },
    { type: 'click', selector: "button:contains('ذخیره نقش')" },
    { type: 'wait', duration: 2000 },
    { type: 'speak', text: "حالا که نقش جدید را داریم، یک کاربر برای این نقش ایجاد می‌کنیم." },
    { type: 'click', selector: "button:contains('مدیریت کاربران')" },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "button:contains('افزودن کاربر جدید')" },
    { type: 'wait', duration: 1000 },
    { type: 'speak', text: "اطلاعات کارمند جدید، احمد ولی، را وارد کرده و نقش 'صندوقدار' را به او تخصیص می‌دهیم." },
    { type: 'type', selector: "input[placeholder='نام کامل']", text: 'احمد ولی' },
    { type: 'type', selector: "input[placeholder='نام کاربری (انگلیسی)']", text: 'ahmad' },
    { type: 'type', selector: "input[placeholder='رمز عبور']", text: 'securepass123' },
    { type: 'wait', duration: 1000 },
    { type: 'click', selector: "option:contains('صندوقدار')" },
    { type: 'wait', duration: 1000 },
    { type: 'click', selector: "button:contains('ثبت کاربر')" },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "در قدم بعدی، یک صراف همکار جدید در ولایت کابل را به سیستم اضافه می‌کنیم." },
    { type: 'click', selector: "button:contains('مدیریت همکاران')" },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "button:contains('+ ثبت همکار جدید')" },
    { type: 'wait', duration: 1000 },
    { type: 'type', selector: "input[placeholder='مثلا: صرافی اعتماد - هرات']", text: 'صرافی آریا - کابل' },
    { type: 'click', selector: "option[value='کابل']" },
    { type: 'type', selector: "input[placeholder='+93799123456']", text: '+93788123456' },
    { type: 'wait', duration: 1000 },
    { type: 'click', selector: "button:contains('ثبت همکار')" },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "و در نهایت، یک حساب بانکی جدید برای تراکنش‌های تومانی ثبت می‌کنیم." },
    { type: 'click', selector: "button:contains('حسابات بانکی')" },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "button:contains('+ افزودن حساب بانکی جدید')" },
    { type: 'wait', duration: 1000 },
    { type: 'type', selector: "input[placeholder='نام صاحب حساب']", text: 'شرکت صرافی الشیخ' },
    { type: 'type', selector: "input[placeholder='نام بانک']", text: 'بانک ملت' },
    { type: 'type', selector: "input[placeholder='شماره حساب']", text: '1234567890' },
    { type: 'wait', duration: 1000 },
    { type: 'click', selector: "button:contains('ثبت حساب')" },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "بسیار خب! پیکربندی اولیه ما تمام شد. حالا آماده انجام اولین معامله روز هستیم." },
    { type: 'navigate', path: 'domestic-transfers' },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "یک مشتری برای ارسال حواله به هرات مراجعه کرده. روی 'ثبت حواله خروجی' کلیک می‌کنیم." },
    { type: 'click', selector: "button:contains('+ ثبت حواله خروجی')" },
    { type: 'wait', duration: 2000 },
    { type: 'speak', text: "مشتری پول را به صورت نقدی پرداخت می‌کند. اطلاعات فرستنده، گیرنده، مبلغ و مقصد را با دقت وارد می‌کنیم." },
    { type: 'type', selector: "input[name='senderName']", text: 'جاوید امیری' },
    { type: 'type', selector: "input[name='senderTazkereh']", text: '987654321' },
    { type: 'type', selector: "input[name='receiverName']", text: 'فریدون فروغی' },
    { type: 'type', selector: "input[name='receiverTazkereh']", text: '123456789' },
    { type: 'type', selector: "input[name='amount']", text: '25000' },
    { type: 'type', selector: "input[name='commission']", text: '150' },
    { type: 'click', selector: "select[name='currency']" },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "option[value='AFN']" },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "select[name='destinationProvince']" },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "option[value='هرات']" },
    { type: 'wait', duration: 1500 },
    { type: 'click', selector: "select[name='partnerSarraf']" },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "option:contains('صرافی اعتماد')" },
    { type: 'wait', duration: 1500 },
    { type: 'click', selector: "button:contains('ثبت حواله خروجی')" },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "چون پرداخت نقدی بود، یک درخواست به صورت خودکار به صندوق ارسال شد. حواله تا زمان تایید صندوق، در حالت 'در انتظار' باقی می‌ماند. این یک لایه امنیتی مهم برای جلوگیری از خطا است." },
    { type: 'wait', duration: 8000 },
    { type: 'speak', text: "حالا به بخش صندوق می‌رویم تا این درخواست را تایید کنیم." },
    { type: 'navigate', path: 'cashbox' },
    { type: 'wait', duration: 4000 },
    { type: 'speak', text: "درخواست در لیست با وضعیت 'در انتظار مدیر' نمایش داده می‌شود. مدیر آن را بررسی و تایید می‌کند." },
    { type: 'click', selector: "button:contains('تایید')" },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "با تایید نهایی، پول رسماً به صندوق اضافه شده و موجودی به روز می‌شود." },
    { type: 'wait', duration: 5000 },
    { type: 'speak', text: "ثبت مصارف روزانه نیز به همین سادگی است. به بخش مصارف می‌رویم." },
    { type: 'navigate', path: 'expenses' },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "button:contains('+ ثبت مصرف جدید')" },
    { type: 'wait', duration: 1000 },
    { type: 'type', selector: "textarea[name='description']", text: 'خریداری چای و بوره برای دفتر' },
    { type: 'type', selector: "input[name='amount']", text: '350' },
    { type: 'click', selector: "button:contains('ثبت مصرف')" },
    { type: 'wait', duration: 4000 },
    { type: 'speak', text: "این درخواست نیز برای پرداخت وجه، منتظر تایید در صندوق خواهد بود. همه چیز یکپارچه و قابل ردیابی است." },
    { type: 'wait', duration: 6000 },
    { type: 'speak', text: "و در نهایت، به اوج قدرت سیستم، یعنی دستیار صوتی هوشمند می‌رسیم. به داشبورد برمی‌گردیم." },
    { type: 'navigate', path: 'dashboard' },
    { type: 'wait', duration: 3000 },
    { type: 'speak', text: "تصور کنید می‌خواهید بدون کلیک کردن، یک گزارش تحلیلی از کسب و کار خود بگیرید." },
    { type: 'click', selector: "[aria-label='دستیار صوتی']" },
    { type: 'wait', duration: 3000 },
    { type: 'show_transcript', source: 'user', text: "یک گزارش از سود و زیان ماه گذشته برایم آماده کن." },
    { type: 'wait', duration: 4000 },
    { type: 'show_transcript', source: 'ai', text: "البته. بر اساس داده‌های سیستم، مجموع درآمد شما از کمیشن‌ها در ماه گذشته ۲۵۰۰ دالر و مجموع مصارف شما ۱۱۰۰ دالر بوده است. سود خالص شما ۱۴۰۰ دالر می‌باشد." },
    { type: 'wait', duration: 10000 },
    { type: 'speak', text: "از تماشای این پیش‌نمایش جامع سپاسگزاریم. صرافی الشیخ، آینده مدیریت مالی شماست." },
    { type: 'end' }
];


// --- Helper Functions for Demo ---
const typeEffect = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, text: string, speed: number, callback: () => void) => {
    let i = 0;
    element.focus();
    const interval = setInterval(() => {
        if (i < text.length) {
            const currentVal = element.value;
            const nextChar = text.charAt(i);
            element.value = currentVal + nextChar;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            i++;
        } else {
            clearInterval(interval);
            element.blur();
            callback();
        }
    }, speed);
};

const findAndPrepareElement = (selector: string): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
        let element: HTMLElement | null = null;
        const interval = 200; // Check every 200ms
        const timeout = 5000; // Give up after 5 seconds
        let elapsedTime = 0;

        const tryToFind = () => {
            if (selector.includes(':contains')) {
                const [baseSelector, containsText] = selector.split(":contains('");
                const text = containsText.slice(0, -2);
                const elements = Array.from(document.querySelectorAll(baseSelector));
                element = elements.find(el => el.textContent?.trim().includes(text.trim())) as HTMLElement || null;
            } else {
                element = document.querySelector(selector);
            }

            if (element) {
                clearInterval(checkInterval);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                resolve(element);
            } else {
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(checkInterval);
                    reject(new Error(`Demo element not found after ${timeout/1000}s: ${selector}`));
                }
            }
        };

        const checkInterval = setInterval(tryToFind, interval);
    });
};

// --- Main Demo Component ---
const LiveDemoPage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [narratorText, setNarratorText] = useState("در حال آماده سازی دمو...");
    const [isDemoFinished, setIsDemoFinished] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, visible: false });
    const [transcripts, setTranscripts] = useState<{source: 'user' | 'ai', text: string}[]>([]);

    const [mockData, setMockData] = useState<any>({
        users: [{ id: 'demo-admin', name: 'مدیر دمو', username: 'demoadmin', role_id: 'admin_role' }],
        roles: [{ id: 'admin_role', name: 'مدیر کل', permissions: {} }],
        transfers: [],
        cashboxRequests: [],
        expenses: [],
        partners: [{id: 'p-1', name: 'صرافی اعتماد', province: 'هرات', balances: {}, status: 'Active'}],
        bankAccounts: [],
    });
    const getMockData = useCallback(() => mockData, [mockData]);
    const mockApi = useRef(mockSarrafiApiService(getMockData, setMockData)).current;

    const navigateRef = useRef<ReturnType<typeof useNavigate> | null>(null);

    const speak = (text: string) => {
        setNarratorText(text);
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fa-IR';
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }
    };
    
    const moveCursorTo = (element: HTMLElement, callback: () => void) => {
        const rect = element.getBoundingClientRect();
        const targetX = rect.left + window.scrollX + rect.width / 2;
        const targetY = rect.top + window.scrollY + rect.height / 2;
        
        setCursorPos(prev => ({ ...prev, x: targetX, y: targetY, visible: true }));
        
        element.style.boxShadow = '0 0 15px 3px rgba(0, 255, 255, 0.6)';
        element.style.transition = 'box-shadow 0.3s ease-in-out';
        element.style.borderRadius = '5px';

        setTimeout(() => {
             element.style.boxShadow = '';
             callback();
        }, 1200); // Wait for cursor to "arrive" and highlight
    };

    const processNextStep = useCallback(async () => {
        if (currentStep >= demoScript.length) {
            setIsDemoFinished(true);
            return;
        }
        const action = demoScript[currentStep];

        const advance = () => setCurrentStep(s => s + 1);

        try {
            switch (action.type) {
                case 'navigate':
                    if(navigateRef.current) {
                        setCursorPos(p => ({...p, visible: false}));
                        navigateRef.current(action.path);
                    }
                    setTimeout(advance, 1500); // Wait for navigation
                    break;
                case 'speak':
                    speak(action.text);
                    advance();
                    break;
                case 'wait':
                    setTimeout(advance, action.duration);
                    break;
                case 'type':
                case 'click':
                     const element = await findAndPrepareElement(action.selector);
                     moveCursorTo(element, () => {
                        if (action.type === 'click') {
                            element.click();
                            advance();
                        } else {
                            typeEffect(element as HTMLInputElement, action.text, action.speed || 80, advance);
                        }
                    });
                    break;
                case 'show_transcript':
                    setTranscripts(prev => [...prev, { source: action.source, text: action.text }]);
                    advance();
                    break;
                case 'end':
                    setIsDemoFinished(true);
                    break;
            }
        } catch (error) {
            console.error(error);
            speak("متاسفانه در اجرای دمو خطایی رخ داد. لطفا صفحه را مجدداً بارگذاری کنید.");
            setIsDemoFinished(true); // End demo on error
        }
    }, [currentStep]);

    useEffect(() => {
        processNextStep();
    }, [currentStep, processNextStep]);
    
    const NavigationManager = () => {
        navigateRef.current = useNavigate();
        return null;
    };

    return (
        <AuthContext.Provider value={{ user: mockUser, login: () => {}, logout: () => {}, hasPermission: () => true }}>
            <ApiContext.Provider value={mockApi as SarrafiApiService}>
                <NavigationManager />
                <div className="fixed top-0 left-0 right-0 h-10 bg-yellow-400 text-black text-center font-bold text-xl flex items-center justify-center z-50">
                     حالت دموی زنده
                </div>
                 <div className="flex h-screen bg-[#0D0C22] text-slate-100 font-sans pt-10" style={{ direction: 'rtl' }}>
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                            <Routes>
                                <Route index element={<DashboardPage />} />
                                <Route path="dashboard" element={<DashboardPage />} />
                                <Route path="settings" element={<SettingsPage />} />
                                <Route path="domestic-transfers" element={<DomesticTransfersPage />} />
                                <Route path="cashbox" element={<CashboxPage />} />
                                <Route path="expenses" element={<ExpensesPage />} />
                            </Routes>
                        </main>
                    </div>
                </div>

                {/* Demo UI Overlays */}
                <div 
                    className="fixed w-8 h-8 transition-all duration-700 ease-out transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9999]"
                    style={{ left: cursorPos.x, top: cursorPos.y, opacity: cursorPos.visible ? 1 : 0 }}
                >
                     <svg viewBox="0 0 24 24" fill="rgba(0, 255, 255, 0.9)" style={{ filter: 'drop-shadow(0 0 6px cyan)'}}><path d="M6.2,2.3L20.3,16.4c0.2,0.2,0.2,0.5,0,0.7l-2.3,2.3c-0.2,0.2-0.5,0.2-0.7,0L3.2,5.3c-0.2-0.2-0.2-0.5,0-0.7L5.5,2.3 C5.7,2.1,6,2.1,6.2,2.3z"/></svg>
                </div>
                {!isDemoFinished && (
                    <div className="fixed bottom-8 right-8 w-1/3 max-w-lg p-4 bg-black/80 backdrop-blur-md border border-cyan-400/50 rounded-lg text-xl text-cyan-200 z-[9998] shadow-lg">
                        {narratorText}
                    </div>
                )}
                {transcripts.length > 0 && !isDemoFinished && (
                     <div className="fixed bottom-48 left-8 w-[350px] bg-[#12122E]/80 backdrop-blur-sm border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)] rounded-lg flex flex-col animate-fadeIn z-[9998]">
                         <div className="p-4 space-y-3">
                            {transcripts.map((line, i) => (
                                 <div key={i} className={`flex ${line.source === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <p className={`px-3 py-2 rounded-lg text-lg ${line.source === 'user' ? 'bg-cyan-600/50 text-slate-100' : 'bg-slate-600/50 text-slate-200'}`}>
                                        {line.text}
                                    </p>
                                </div>
                            ))}
                         </div>
                     </div>
                )}
                {isDemoFinished && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] text-center p-8 animate-fadeIn">
                         <div>
                            <h2 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-fuchsia-500 mb-6">دمو به پایان رسید</h2>
                            <p className="text-2xl text-slate-300 mb-8">از تماشای پیش‌نمایش زنده "صرافی الشیخ" سپاسگزاریم.</p>
                            <p className="text-xl text-slate-400">برای دریافت اطلاعات بیشتر و مشاوره رایگان، با ما به تماس شوید.</p>
                            <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 text-2xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300">شروع مجدد دمو</button>
                        </div>
                    </div>
                )}
            </ApiContext.Provider>
        </AuthContext.Provider>
    );
};

export default LiveDemoPage;
