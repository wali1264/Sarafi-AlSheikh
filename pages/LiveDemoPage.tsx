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
import { User, Role, DomesticTransfer, CashboxRequest, Expense, ExpenseCategory, Currency, TransferStatus, CashboxRequestStatus, ExpenseStatus } from '../types';

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
            domesticTransfers: { view: true, create: true, edit: true },
            cashbox: { view: true, create: true, approve: true },
            expenses: { view: true, create: true },
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
    getPartnerAccounts: async () => [],
    getCustomers: async () => [],
    getSystemSettings: async () => ({ approval_thresholds: { [Currency.USD]: 1000 } }),
    getDashboardAnalytics: async () => ({
        weeklyActivity: { labels: ["هفته جاری", "۱ هفته پیش", "۲ هفته پیش", "۳ هفته پیش", "۴ هفته پیش", "۵ هفته پیش"], domesticCounts: [3, 5, 2, 8, 4, 6], foreignCounts: [1, 2, 1, 3, 2, 4] },
        partnerActivity: [{ label: 'صرافی اعتماد', value: 12 }, { label: 'صرافی آریا', value: 8 }],
        cashboxSummary: [{ currency: 'USD', balance: 50000 }, { currency: 'AFN', balance: 2500000 }],
    }),
    createUser: async (payload) => {
        const newUser: User = { ...payload, id: `user-${Date.now()}` };
        updateMockData(prev => ({ ...prev, users: [...prev.users, newUser] }));
        return newUser;
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
            // FIX: Use enum member instead of string literal for type safety.
            status: payload.is_cash_payment ? TransferStatus.PendingCashbox : TransferStatus.Unexecuted,
            created_by: 'مدیر دمو',
            // FIX: Use enum member instead of string literal for type safety.
            history: [{ status: payload.is_cash_payment ? TransferStatus.PendingCashbox : TransferStatus.Unexecuted, timestamp: new Date(), user: 'مدیر دمو' }],
        };
         const newCashboxRequest: CashboxRequest = {
            id: `CR-${Math.floor(10000 + Math.random() * 90000)}`,
            created_at: new Date(),
            requested_by: 'مدیر دمو',
            // FIX: Use enum member instead of string literal for type safety.
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
                    // FIX: Use enum members instead of string literals for type safety.
                    updatedRequest = { ...r, status: payload.resolution === 'approve' ? CashboxRequestStatus.Approved : CashboxRequestStatus.Rejected, resolved_by: 'مدیر دemo', resolved_at: new Date() };
                    return updatedRequest;
                }
                return r;
            });
            return { ...prev, cashboxRequests: newRequests };
        });
        return updatedRequest!;
    },
    createExpense: async (payload) => {
        // FIX: The 'Expense' type expects a user name (string), but the payload provides a user object.
        // Also, the 'status' property was missing.
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
        updateMockData(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
        return newExpense;
    }
    // Other methods can be mocked as needed
});

// --- Demo Script ---
type DemoAction = 
    | { type: 'navigate'; path: string }
    | { type: 'speak'; text: string }
    | { type: 'wait'; duration: number }
    | { type: 'type'; selector: string; text: string; speed?: number }
    | { type: 'click'; selector: string; }
    | { type: 'end'; };

const demoScript: DemoAction[] = [
    { type: 'wait', duration: 1000 },
    { type: 'speak', text: "با سلام. به دموی زنده اپلیکیشن صرافی الشیخ خوش آمدید. در این پیش‌نمایش، قدرت و سادگی سیستم ما را به صورت خودکار مشاهده خواهید کرد." },
    { type: 'wait', duration: 8000 },
    { type: 'speak', text: "این داشبورد مدیریتی است که نمای کلی از فعالیت‌های روزانه و هفتگی صرافی را به شما نشان می‌دهد." },
    { type: 'wait', duration: 5000 },
    { type: 'speak', text: "بیایید با هم یک کاربر جدید برای سیستم تعریف کنیم. به بخش تنظیمات می‌رویم." },
    { type: 'navigate', path: 'settings' },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "button:contains('افزودن کاربر جدید')" },
    { type: 'wait', duration: 1000 },
    { type: 'speak', text: "فرض کنید می‌خواهیم یک صندوقدار جدید به نام 'احمد' استخدام کنیم." },
    { type: 'type', selector: "input[placeholder='نام کامل']", text: 'احمد ولی' },
    { type: 'wait', duration: 500 },
    { type: 'type', selector: "input[placeholder='نام کاربری (انگلیسی)']", text: 'ahmad' },
    { type: 'wait', duration: 500 },
    { type: 'type', selector: "input[placeholder='رمز عبور']", text: 'securepass123' },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "button:contains('ثبت کاربر')" },
    { type: 'wait', duration: 2000 },
    { type: 'speak', text: "به همین سادگی، کاربر جدید با دسترسی‌های مشخص شده، به سیستم اضافه شد." },
    { type: 'wait', duration: 4000 },
    { type: 'speak', text: "حالا، یک حواله خروجی برای یک مشتری ثبت می‌کنیم." },
    { type: 'navigate', path: 'domestic-transfers' },
    { type: 'wait', duration: 2000 },
    { type: 'click', selector: "button:contains('+ ثبت حواله خروجی')" },
    { type: 'wait', duration: 1000 },
    { type: 'speak', text: "اطلاعات فرستنده، گیرنده و مبلغ را وارد می‌کنیم." },
    { type: 'type', selector: "input[name='senderName']", text: 'مشتری گذری' },
    { type: 'type', selector: "input[name='receiverName']", text: 'محمود کریمی' },
    { type: 'type', selector: "input[name='amount']", text: '5000' },
    { type: 'type', selector: "input[name='commission']", text: '50' },
    { type: 'click', selector: "select[name='destinationProvince']" },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "option[value='هرات']" },
    { type: 'wait', duration: 1000 },
    { type: 'click', selector: "select[name='partnerSarraf']" },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: "option[value='صرافی اعتماد']" },
    { type: 'wait', duration: 1000 },
    { type: 'click', selector: "button:contains('ثبت حواله خروجی')" },
    { type: 'wait', duration: 2000 },
    { type: 'speak', text: "چون پرداخت نقدی بود، یک درخواست به صورت خودکار به صندوق ارسال شد. برویم و آن را تایید کنیم." },
    { type: 'navigate', path: 'cashbox' },
    { type: 'wait', duration: 3000 },
    { type: 'click', selector: "button:contains('تایید')" },
    { type: 'wait', duration: 2000 },
    { type: 'speak', text: "با تایید صندوقدار، پول دریافت و حواله آماده اجرا می‌شود." },
    { type: 'wait', duration: 4000 },
    { type: 'speak', text: "و در نهایت، قدرت دستیار صوتی ما. فقط با صحبت کردن، دستورات خود را اجرا کنید." },
    { type: 'click', selector: "[aria-label='دستیار صوتی']" },
    { type: 'wait', duration: 2000 },
    { type: 'speak', text: "از تماشای این دموی زنده سپاسگزاریم. برای اطلاعات بیشتر با ما به تماس شوید." },
    { type: 'end' }
];

// --- Helper Functions for Demo ---

const typeEffect = (element: HTMLInputElement | HTMLTextAreaElement, text: string, speed: number, callback: () => void) => {
    let i = 0;
    element.focus();
    const interval = setInterval(() => {
        if (i < text.length) {
            const currentVal = element.value;
            const nextChar = text.charAt(i);
            element.value = currentVal + nextChar;
            // Dispatch input event to trigger React's state updates
            element.dispatchEvent(new Event('input', { bubbles: true }));
            i++;
        } else {
            clearInterval(interval);
            element.blur();
            callback();
        }
    }, speed);
};

const findElement = (selector: string): HTMLElement | null => {
    if (selector.includes(':contains')) {
        const [baseSelector, containsText] = selector.split(":contains('");
        const text = containsText.slice(0, -2);
        const elements = Array.from(document.querySelectorAll(baseSelector));
        return elements.find(el => el.textContent?.trim() === text.trim()) as HTMLElement || null;
    }
    return document.querySelector(selector);
};

// --- Main Demo Component ---
const LiveDemoPage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [narratorText, setNarratorText] = useState("در حال آماده سازی دمو...");
    const [isDemoFinished, setIsDemoFinished] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, visible: false });

    const [mockData, setMockData] = useState<any>({
        users: [{ id: 'demo-admin', name: 'مدیر دمو', username: 'demoadmin', role_id: 'admin_role' }],
        roles: [{ id: 'admin_role', name: 'مدیر کل', permissions: {} }, { id: 'cashier_role', name: 'صندوقدار', permissions: {} }],
        transfers: [],
        cashboxRequests: [],
        expenses: [],
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
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;
        setCursorPos({ x: targetX, y: targetY, visible: true });
        
        element.style.boxShadow = '0 0 20px 5px rgba(0, 255, 255, 0.7)';
        element.style.transition = 'box-shadow 0.3s ease-in-out';

        setTimeout(() => {
             element.style.boxShadow = '';
             callback();
        }, 800); // Wait for cursor to "arrive" and highlight
    };

    const processNextStep = useCallback(() => {
        if (currentStep >= demoScript.length) {
            setIsDemoFinished(true);
            return;
        }
        const action = demoScript[currentStep];

        const advance = () => setCurrentStep(s => s + 1);

        switch (action.type) {
            case 'navigate':
                if(navigateRef.current) {
                    setCursorPos(p => ({...p, visible: false}));
                    navigateRef.current(action.path);
                }
                setTimeout(advance, 1000);
                break;
            case 'speak':
                speak(action.text);
                advance(); // Move to next step immediately after starting speech
                break;
            case 'wait':
                setTimeout(advance, action.duration);
                break;
            case 'type':
            case 'click':
                 const element = findElement(action.selector);
                 if (element) {
                    moveCursorTo(element, () => {
                        if (action.type === 'click') {
                            element.click();
                            advance();
                        } else {
                            typeEffect(element as HTMLInputElement, action.text, action.speed || 100, advance);
                        }
                    });
                 } else {
                    console.warn(`Demo element not found: ${action.selector}`);
                    advance(); // Skip if not found
                 }
                break;
            case 'end':
                setIsDemoFinished(true);
                break;
        }
    }, [currentStep]);

    useEffect(() => {
        processNextStep();
    }, [currentStep, processNextStep]);
    
    // The component that allows using the navigate hook
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
                    className="fixed w-8 h-8 transition-all duration-500 ease-out transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9999]"
                    style={{ left: cursorPos.x, top: cursorPos.y, opacity: cursorPos.visible ? 1 : 0 }}
                >
                     <svg viewBox="0 0 24 24" fill="rgba(0, 255, 255, 0.8)" style={{ filter: 'drop-shadow(0 0 5px cyan)'}}><path d="M6.2,2.3L20.3,16.4c0.2,0.2,0.2,0.5,0,0.7l-2.3,2.3c-0.2,0.2-0.5,0.2-0.7,0L3.2,5.3c-0.2-0.2-0.2-0.5,0-0.7L5.5,2.3 C5.7,2.1,6,2.1,6.2,2.3z"/></svg>
                </div>
                {!isDemoFinished && (
                    <div className="fixed bottom-8 right-8 w-1/3 max-w-lg p-4 bg-black/70 backdrop-blur-sm border border-cyan-400/50 rounded-lg text-xl text-cyan-200 z-[9998]">
                        {narratorText}
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