import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { User, PartnerAccount, Role, Currency, SystemSettings } from '../types';
import { roleTranslations } from '../utils/translations';
import { ROLES, CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';

// --- Reusable Components ---

const SettingsCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-[#12122E]/80 border-2 border-cyan-400/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
        <div className="p-6 border-b-2 border-cyan-400/20">
            <h2 className="text-3xl font-semibold text-slate-100 tracking-wider">{title}</h2>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const ActionButton: React.FC<{ onClick?: () => void; children: React.ReactNode; className?: string; type?: 'button' | 'submit' | 'reset'; disabled?: boolean }> = ({ onClick, children, className = '', type = 'button', disabled = false }) => (
     <button 
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 ${className}`}
        style={{
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
            boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
        }}
    >
        {children}
    </button>
);

// --- Settings Page ---

const SettingsPage: React.FC = () => {
    const api = useApi();
    const [users, setUsers] = useState<User[]>([]);
    const [partners, setPartners] = useState<PartnerAccount[]>([]);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [isPartnerModalOpen, setPartnerModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        const [userData, partnerData, settingsData] = await Promise.all([
            api.getUsers(),
            api.getPartnerAccounts(),
            api.getSystemSettings()
        ]);
        setUsers(userData);
        setPartners(partnerData);
        setSettings(settingsData);
    }, [api]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSettingsChange = (currency: Currency, value: string) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                approvalThresholds: {
                    ...prev.approvalThresholds,
                    [currency]: parseFloat(persianToEnglishNumber(value)) || 0,
                }
            };
        });
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        await api.updateSystemSettings({ settings });
        alert("تنظیمات با موفقیت ذخیره شد.");
        fetchData();
    };

    const handleUserCreated = () => {
        setUserModalOpen(false);
        fetchData();
    };

    const handlePartnerCreated = () => {
        setPartnerModalOpen(false);
        fetchData();
    };
    
    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('آیا از حذف این کاربر اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
            const result = await api.deleteUser({ id: userId });
            if ('error' in result) {
                alert(`خطا: ${result.error}`);
            } else {
                fetchData();
            }
        }
    };
    
    const handleBackup = async () => {
        const backupData = await api.getBackupState();
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sarrafai_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("فایل قابل خواندن نیست");
                const backupData = JSON.parse(text);
                
                if (window.confirm("آیا اطمینان دارید؟ با این کار تمام اطلاعات فعلی شما با اطلاعات فایل پشتیبان جایگزین خواهد شد. این عمل غیرقابل بازگشت است.")) {
                    await api.restoreState(backupData);
                    alert("بازیابی با موفقیت انجام شد! برنامه اکنون دوباره بارگیری می‌شود.");
                    window.location.reload();
                }
            } catch (err) {
                console.error(err);
                alert("بازیابی پشتیبان با شکست مواجه شد. ممکن است فایل نامعتبر باشد.");
            } finally {
                if(fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };


    return (
        <div style={{direction: 'rtl'}} className="space-y-12">
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">تنظیمات و مدیریت</h1>

             <SettingsCard title="پشتیبان‌گیری و بازیابی اطلاعات">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1">
                        <h3 className="text-xl text-slate-200 font-bold">ایجاد فایل پشتیبان</h3>
                        <p className="text-slate-400 mt-2 mb-4">از تمام اطلاعات سیستم (حواله‌ها، مصارف، حساب‌ها و غیره) یک فایل پشتیبان با فرمت JSON تهیه کنید و آن را در مکانی امن نگهداری کنید.</p>
                        <ActionButton onClick={handleBackup}>دانلود فایل پشتیبان</ActionButton>
                    </div>
                     <div className="w-full md:w-px bg-cyan-400/20 self-stretch"></div>
                    <div className="flex-1">
                        <h3 className="text-xl text-slate-200 font-bold">بازیابی از فایل پشتیبان</h3>
                        <p className="text-slate-400 mt-2 mb-4">
                            <span className="font-bold text-red-400">هشدار:</span>
                             این عمل تمام اطلاعات فعلی شما را پاک کرده و اطلاعات موجود در فایل پشتیبان را جایگزین می‌کند.
                        </p>
                        <ActionButton onClick={handleRestoreClick} className="bg-amber-500 hover:bg-amber-400 focus:ring-amber-500/50">بارگذاری فایل پشتیبان</ActionButton>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                </div>
            </SettingsCard>
            
            {settings && (
                <SettingsCard title="تنظیمات صندوق">
                    <p className="text-slate-400 mb-6">مبالغی که از این حد تعیین شده کمتر باشند، به صورت خودکار تایید خواهند شد و نیازی به تایید مدیر نخواهند داشت.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CURRENCIES.map(currency => (
                            <div key={currency}>
                                <label className="block text-lg font-medium text-cyan-300 mb-2">حد تایید برای {currency}</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={settings.approvalThresholds[currency] || ''}
                                    onChange={(e) => handleSettingsChange(currency, e.target.value)}
                                    className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"
                                />
                            </div>
                        ))}
                    </div>
                     <div className="mt-6 text-left">
                        <ActionButton onClick={handleSaveSettings}>ذخیره تنظیمات</ActionButton>
                    </div>
                </SettingsCard>
            )}

            <SettingsCard title="مدیریت کاربران">
                 <div className="overflow-x-auto mb-6">
                    <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">نام کاربر</th>
                                <th scope="col" className="px-6 py-4 font-medium">نقش</th>
                                <th scope="col" className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-cyan-400/10">
                                    <td className="px-6 py-4 font-semibold text-slate-100">{user.name}</td>
                                    <td className="px-6 py-4">{roleTranslations[user.role]}</td>
                                    <td className="px-6 py-4 text-left">
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300">حذف</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ActionButton onClick={() => setUserModalOpen(true)}>افزودن کاربر جدید</ActionButton>
            </SettingsCard>
            
            <SettingsCard title="مدیریت همکاران">
                <div className="overflow-x-auto mb-6">
                    {/* Placeholder for partners list */}
                     <table className="w-full text-lg text-right text-slate-300">
                        <thead className="text-xl text-slate-400 uppercase">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-medium">نام همکار</th>
                                <th scope="col" className="px-6 py-4 font-medium">موجودی</th>
                                <th scope="col" className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                             {partners.map(p => (
                                <tr key={p.id} className="border-b border-cyan-400/10">
                                    <td className="px-6 py-4 font-semibold text-slate-100">{p.name}</td>
                                    <td className="px-6 py-4 font-mono">{new Intl.NumberFormat().format(p.balance)} {p.currency}</td>
                                    <td className="px-6 py-4 text-left">
                                        {/* Future actions like edit/delete */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
                <ActionButton onClick={() => setPartnerModalOpen(true)}>افزودن همکار جدید</ActionButton>
            </SettingsCard>

            {isUserModalOpen && <CreateUserModal onClose={() => setUserModalOpen(false)} onSuccess={handleUserCreated} />}
            {isPartnerModalOpen && <CreatePartnerModal onClose={() => setPartnerModalOpen(false)} onSuccess={handlePartnerCreated} />}
        </div>
    );
};

// --- Modals (defined in the same file for simplicity) ---

interface CreateUserModalProps {
    onClose: () => void;
    onSuccess: () => void;
}
const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onSuccess }) => {
    const api = useApi();
    const [name, setName] = useState('');
    const [role, setRole] = useState<Role>(Role.Domestic_Clerk);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await api.createUser({ name, role });
        setIsLoading(false);
        onSuccess();
    };

    return (
         <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-3xl font-bold text-cyan-300">افزودن کاربر جدید</h2></div>
                    <div className="p-8 space-y-6">
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">نام کاربر</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"/>
                        </div>
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">نقش</label>
                            <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400">
                                {ROLES.map(r => <option key={r} value={r}>{roleTranslations[r]}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <ActionButton type="submit" disabled={isLoading}>{isLoading ? 'در حال ثبت...' : 'ثبت کاربر'}</ActionButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface CreatePartnerModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreatePartnerModal: React.FC<CreatePartnerModalProps> = ({ onClose, onSuccess }) => {
    const api = useApi();
    const [formData, setFormData] = useState({ name: '', initialBalance: '', currency: Currency.USD });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'initialBalance') {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await api.createPartner({ 
            name: formData.name,
            initialBalance: parseFloat(formData.initialBalance) || 0,
            currency: formData.currency as Currency,
        });
        setIsLoading(false);
        onSuccess();
    };

     return (
         <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-3xl font-bold text-cyan-300">افزودن همکار جدید</h2></div>
                    <div className="p-8 space-y-6">
                         <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="نام صراف همکار" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"/>
                         <input type="text" inputMode="decimal" name="initialBalance" value={formData.initialBalance} onChange={handleChange} placeholder="موجودی اولیه (اختیاری)" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400"/>
                         <select name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400">
                             {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <ActionButton type="submit" disabled={isLoading}>{isLoading ? 'در حال ثبت...' : 'ثبت همکار'}</ActionButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;