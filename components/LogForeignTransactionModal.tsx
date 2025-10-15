import React, { useState, FormEvent, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { LogForeignTransactionPayload, User, BankAccount, ForeignTransactionType, Currency } from '../types';
import { foreignTransactionTypeTranslations, persianToEnglishNumber } from '../utils/translations';
import { CURRENCIES } from '../constants';

interface LogForeignTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    bankAccounts: BankAccount[];
}

const LogForeignTransactionModal: React.FC<LogForeignTransactionModalProps> = ({ isOpen, onClose, onSuccess, currentUser, bankAccounts }) => {
    const api = useApi();
    const [formData, setFormData] = useState({
        transactionType: ForeignTransactionType.SellBankTomanForForeignCash,
        customerName: '',
        tomanAmount: '',
        rate: '',
        bankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
        description: '',
        commission: '',
        commissionCurrency: Currency.IRR,
        cashTransactionAmount: '',
        cashTransactionCurrency: Currency.AFN,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'form' | 'confirm'>('form');

    const transactionConfig = useMemo(() => {
        const type = formData.transactionType as ForeignTransactionType;
        const isTomanToToman = [ForeignTransactionType.BuyBankTomanWithTomanCash, ForeignTransactionType.SellBankTomanForTomanCash].includes(type);
        const hasCashComponent = type !== ForeignTransactionType.InternalBankTomanTransfer;

        return {
            isTomanToToman,
            hasCashComponent,
            showRate: !isTomanToToman && hasCashComponent,
            showCommission: isTomanToToman,
            cashCurrencyOptions: isTomanToToman ? [Currency.IRR] : CURRENCIES.filter(c => c !== Currency.IRR),
            cashLabel: isTomanToToman ? "مبلغ تومان نقد" : "مبلغ نقدی ارز",
            commissionLabel: type === ForeignTransactionType.BuyBankTomanWithTomanCash ? "کمیسیون پرداختی" : "کمیسیون دریافتی",
        };
    }, [formData.transactionType]);

     const cashFlowDirection = useMemo(() => {
        const type = formData.transactionType as ForeignTransactionType;
        if ([ForeignTransactionType.BuyBankTomanWithForeignCash, ForeignTransactionType.BuyBankTomanWithTomanCash].includes(type)) {
            return 'deposit'; // We receive cash, so we deposit to cashbox
        }
        if ([ForeignTransactionType.SellBankTomanForForeignCash, ForeignTransactionType.SellBankTomanForTomanCash].includes(type)) {
            return 'withdrawal'; // We give cash, so we withdraw from cashbox
        }
        return null; // No cash involved
    }, [formData.transactionType]);

    if (!isOpen) return null;

     const resetForm = () => {
        setFormData({
            transactionType: ForeignTransactionType.SellBankTomanForForeignCash,
            customerName: '',
            tomanAmount: '',
            rate: '',
            bankAccountId: bankAccounts.length > 0 ? bankAccounts[0].id : '',
            description: '',
            commission: '',
            commissionCurrency: Currency.IRR,
            cashTransactionAmount: '',
            cashTransactionCurrency: Currency.AFN,
        });
        setError(null);
        setIsLoading(false);
        setStep('form');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Reset related fields when transaction type changes
        if (name === 'transactionType') {
            setFormData(prev => ({
                ...prev,
                rate: '',
                commission: '',
                cashTransactionAmount: '',
                // FIX: Cast select value to ForeignTransactionType enum to satisfy TypeScript.
                [name]: value as ForeignTransactionType
            }));
            return;
        }

        const numericFields = ['tomanAmount', 'rate', 'commission', 'cashTransactionAmount'];
        if (numericFields.includes(name)) {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleProceedToConfirm = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.bankAccountId && formData.transactionType !== ForeignTransactionType.InternalBankTomanTransfer) {
            setError("لطفاً یک حساب بانکی انتخاب کنید.");
            return;
        }
        if(transactionConfig.hasCashComponent && (!formData.cashTransactionAmount || parseFloat(formData.cashTransactionAmount) <= 0)) {
            setError(`برای این نوع تراکنش، فیلد "${transactionConfig.cashLabel}" الزامی است.`);
            return;
        }
        setStep('confirm');
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        const payload: LogForeignTransactionPayload = {
            transactionType: formData.transactionType as ForeignTransactionType,
            customerName: formData.customerName,
            tomanAmount: parseFloat(formData.tomanAmount) || 0,
            rate: parseFloat(formData.rate) || 0,
            description: formData.description,
            user: currentUser,
            bankAccountId: formData.bankAccountId,
            commission: parseFloat(formData.commission) || 0,
            commissionCurrency: formData.commissionCurrency as Currency,
            cashTransactionAmount: transactionConfig.hasCashComponent ? parseFloat(formData.cashTransactionAmount) || 0 : undefined,
            cashTransactionCurrency: transactionConfig.hasCashComponent ? (transactionConfig.isTomanToToman ? Currency.IRR : formData.cashTransactionCurrency as Currency) : undefined,
        };
        
        const result = await api.logForeignTransaction(payload);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
            setStep('form'); // Go back to form on error
        } else {
            onSuccess();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-3xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت تراکنش خارجی جدید</h2></div>
                
                {step === 'form' && (
                    <form onSubmit={handleProceedToConfirm}>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-lg font-medium text-cyan-300 mb-2">نوع تراکنش</label>
                                    <select name="transactionType" value={formData.transactionType} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                        {Object.values(ForeignTransactionType).map(t => <option key={t} value={t}>{foreignTransactionTypeTranslations[t]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-lg font-medium text-cyan-300 mb-2">حساب بانکی</label>
                                    <select name="bankAccountId" value={formData.bankAccountId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                        <option value="">-- انتخاب حساب بانکی --</option>
                                        {bankAccounts.map(ba => <option key={ba.id} value={ba.id}>{ba.bankName} - {ba.accountHolder}</option>)}
                                    </select>
                                </div>
                            </div>
                            <input name="customerName" value={formData.customerName} onChange={handleChange} placeholder="نام مشتری" required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            <input name="tomanAmount" value={formData.tomanAmount} onChange={handleChange} placeholder="مبلغ (تومان)" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                            
                            {transactionConfig.hasCashComponent && (
                                <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md animate-fadeIn">
                                    <h4 className="text-xl font-bold text-cyan-300 mb-2">جزئیات معامله نقدی</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <input name="cashTransactionAmount" value={formData.cashTransactionAmount} onChange={handleChange} placeholder={transactionConfig.cashLabel} required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                                        {transactionConfig.isTomanToToman ? (
                                            <input type="text" value="IRR" disabled className="w-full text-xl px-3 py-2 bg-slate-800/60 border-2 border-slate-600/50 rounded-md text-slate-400 text-right" />
                                        ) : (
                                            <select name="cashTransactionCurrency" value={formData.cashTransactionCurrency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                                {transactionConfig.cashCurrencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            )}

                             {transactionConfig.showRate && (
                                 <div className="animate-fadeIn">
                                    <label className="block text-lg font-medium text-cyan-300 mb-2">نرخ تبادله</label>
                                    <input name="rate" value={formData.rate} onChange={handleChange} placeholder="نرخ" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                                 </div>
                             )}
                             {transactionConfig.showCommission && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                                    <div>
                                        <label className="block text-lg font-medium text-cyan-300 mb-2">{transactionConfig.commissionLabel}</label>
                                        <input name="commission" value={formData.commission} onChange={handleChange} placeholder="کمیسیون" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right" />
                                    </div>
                                    <div>
                                        <label className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی کمیسیون</label>
                                         <select name="commissionCurrency" value={formData.commissionCurrency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right">
                                             {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                         </select>
                                    </div>
                                </div>
                             )}

                            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="توضیحات" required rows={2} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"></textarea>
                        </div>
                        <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                            <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                            <button type="submit" className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                                ادامه و تایید
                            </button>
                        </div>
                    </form>
                )}
                {step === 'confirm' && (
                     <div className="animate-fadeIn">
                        <div className="p-8 space-y-4">
                            <h3 className="text-2xl font-bold text-slate-200">لطفاً جزئیات تراکنش را تایید کنید:</h3>
                            <div className="text-xl grid grid-cols-2 gap-x-6 gap-y-3 p-4 border border-cyan-400/20 rounded-md bg-slate-900/30">
                                <div className="text-slate-400">نوع:</div> <div className="font-bold">{foreignTransactionTypeTranslations[formData.transactionType as ForeignTransactionType]}</div>
                                <div className="text-slate-400">مشتری:</div> <div className="font-bold">{formData.customerName}</div>
                                <div className="text-slate-400">مبلغ تومان:</div> <div className="font-bold font-mono">{new Intl.NumberFormat('fa-IR').format(parseFloat(formData.tomanAmount))}</div>
                                {transactionConfig.showCommission && <>
                                    <div className="text-slate-400">کمیسیون:</div> <div className="font-bold font-mono">{new Intl.NumberFormat('fa-IR').format(parseFloat(formData.commission))} {formData.commissionCurrency}</div>
                                </>}
                                 {transactionConfig.showRate && <>
                                    <div className="text-slate-400">نرخ:</div> <div className="font-bold font-mono">{new Intl.NumberFormat('fa-IR').format(parseFloat(formData.rate))}</div>
                                </>}
                                {transactionConfig.hasCashComponent && (
                                     <>
                                        <div className="text-slate-400 col-span-2 border-t border-cyan-400/20 mt-2 pt-2">عملیات صندوق:</div>
                                        <div className="text-slate-400">{cashFlowDirection === 'deposit' ? 'واریز به صندوق:' : 'برداشت از صندوق:'}</div>
                                        <div className={`font-bold font-mono ${cashFlowDirection === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                            {new Intl.NumberFormat('fa-IR-u-nu-latn').format(parseFloat(formData.cashTransactionAmount))} {transactionConfig.isTomanToToman ? Currency.IRR : formData.cashTransactionCurrency}
                                        </div>
                                    </>
                                )}
                            </div>
                            {transactionConfig.hasCashComponent && <p className="text-yellow-400 text-lg">با تایید نهایی، یک درخواست صندوق به صورت خودکار برای این معامله ثبت خواهد شد.</p>}
                        </div>
                        <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                            <button type="button" onClick={() => setStep('form')} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">ویرایش</button>
                            <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-green-500 hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(74, 222, 128, 0.5)' }}>
                                {isLoading ? 'در حال ثبت...' : 'تایید نهایی و ثبت'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogForeignTransactionModal;