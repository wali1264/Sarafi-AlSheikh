import React, { useState, FormEvent, useMemo, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { LogForeignTransactionPayload, User, Asset, Customer } from '../types';
import { persianToEnglishNumber } from '../utils/translations';
import { debounce } from '../utils/debounce';

interface LogForeignTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
    assets: Asset[];
}

const LogForeignTransactionModal: React.FC<LogForeignTransactionModalProps> = ({ isOpen, onClose, onSuccess, currentUser, assets }) => {
    const api = useApi();
    const [formData, setFormData] = useState({
        fromAssetId: '',
        fromAmount: '',
        toAssetId: '',
        toAmount: '',
        description: '',
        involvesCustomer: false,
        customerCode: '',
        customerAmount: '',
        customerTransactionType: 'debit' as 'debit' | 'credit',
    });
    
    const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
    const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const fromAsset = useMemo(() => assets.find(a => a.id === formData.fromAssetId), [assets, formData.fromAssetId]);
    const toAsset = useMemo(() => assets.find(a => a.id === formData.toAssetId), [assets, formData.toAssetId]);

    const checkCustomerCode = useCallback(debounce(async (code: string) => {
        if (!code) {
            setCustomer(undefined);
            return;
        }
        setIsCheckingCustomer(true);
        const result = await api.getCustomerByCode(code);
        setCustomer(result || null);
        setIsCheckingCustomer(false);
    }, 500), [api]);

    useEffect(() => {
        if (formData.customerCode) {
            checkCustomerCode(formData.customerCode);
        } else {
            setCustomer(undefined);
        }
    }, [formData.customerCode, checkCustomerCode]);


    const calculatedFee = useMemo(() => {
        if (!formData.involvesCustomer || !formData.customerAmount) return null;
        const customerAmount = parseFloat(formData.customerAmount);
        const fromAmount = parseFloat(formData.fromAmount);
        const toAmount = parseFloat(formData.toAmount);
        
        if(isNaN(customerAmount) || (isNaN(fromAmount) && isNaN(toAmount))) return null;

        let fee = 0;
        let feeCurrency = '';

        if(formData.customerTransactionType === 'debit') { // Customer gives/owes money
            if(!isNaN(toAmount) && toAsset?.currency === fromAsset?.currency) {
                 fee = customerAmount - toAmount;
                 feeCurrency = toAsset.currency;
            }
        } else { // Customer receives money
             if(!isNaN(fromAmount) && toAsset?.currency === fromAsset?.currency) {
                fee = fromAmount - customerAmount;
                feeCurrency = fromAsset.currency;
            }
        }

        if (fee === 0) return null;

        return {
            amount: fee,
            currency: feeCurrency,
            text: fee > 0 ? `کارمزد/هزینه: ${new Intl.NumberFormat().format(fee)} ${feeCurrency}` : `سود: ${new Intl.NumberFormat().format(Math.abs(fee))} ${feeCurrency}`
        }

    }, [formData, fromAsset, toAsset]);


    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({
            fromAssetId: '', fromAmount: '', toAssetId: '', toAmount: '',
            description: '', involvesCustomer: false, customerCode: '',
            customerAmount: '', customerTransactionType: 'debit',
        });
        setError(null);
        setIsLoading(false);
        setCustomer(undefined);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }
        
        const numericFields = ['fromAmount', 'toAmount', 'customerAmount', 'customerCode'];
        if (numericFields.includes(name)) {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (formData.involvesCustomer && !customer) {
            setError("کد مشتری وارد شده معتبر نیست. لطفاً مجدداً بررسی کنید.");
            return;
        }
        setIsLoading(true);
        setError(null);

        const payload: LogForeignTransactionPayload = {
            description: formData.description,
            fromAssetId: formData.fromAssetId,
            fromAmount: parseFloat(formData.fromAmount) || 0,
            toAssetId: formData.toAssetId,
            toAmount: parseFloat(formData.toAmount) || 0,
            user: currentUser,
            ...(formData.involvesCustomer && {
                customerCode: formData.customerCode,
                customerAmount: parseFloat(formData.customerAmount) || 0,
                customerTransactionType: formData.customerTransactionType,
            }),
        };
        
        const result = await api.logForeignTransaction(payload);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
        } else {
            onSuccess();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <div className="px-8 py-5 border-b-2 border-cyan-400/20"><h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ثبت تبادله جدید</h2></div>
                
                <form onSubmit={handleSubmit}>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                        
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-2">شرح تبادله</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="توضیحات مربوط به این تبادله..." required rows={2} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right"></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-4 border-2 border-red-500/20 bg-red-500/10 rounded-md space-y-4">
                                <h3 className="text-2xl font-bold text-red-300">برد از (فروش)</h3>
                                <div>
                                    <label className="block text-lg font-medium text-slate-200 mb-2">دارایی مبدا</label>
                                    <select name="fromAssetId" value={formData.fromAssetId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-red-400 text-right">
                                        <option value="">-- انتخاب دارایی --</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                     <label className="block text-lg font-medium text-slate-200 mb-2">مبلغ واقعی فروش ({fromAsset?.currency})</label>
                                     <input name="fromAmount" value={formData.fromAmount} onChange={handleChange} placeholder="0.00" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-red-400 text-right font-mono" />
                                </div>
                            </div>

                             <div className="p-4 border-2 border-green-500/20 bg-green-500/10 rounded-md space-y-4">
                                <h3 className="text-2xl font-bold text-green-300">رسید به (خرید)</h3>
                                <div>
                                    <label className="block text-lg font-medium text-slate-200 mb-2">دارایی مقصد</label>
                                    <select name="toAssetId" value={formData.toAssetId} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-green-400 text-right">
                                         <option value="">-- انتخاب دارایی --</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                     <label className="block text-lg font-medium text-slate-200 mb-2">مبلغ واقعی خرید ({toAsset?.currency})</label>
                                     <input name="toAmount" value={formData.toAmount} onChange={handleChange} placeholder="0.00" required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-green-400 text-right font-mono" />
                                </div>
                            </div>
                        </div>
                        
                         <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md space-y-4">
                            <label className="flex items-center gap-3 text-2xl font-bold text-cyan-300 cursor-pointer">
                                <input type="checkbox" name="involvesCustomer" checked={formData.involvesCustomer} onChange={handleChange} className="w-6 h-6 rounded bg-slate-700 border-slate-500 text-cyan-400 focus:ring-cyan-500" />
                                این تراکنش مربوط به یک مشتری است
                            </label>
                            {formData.involvesCustomer && (
                                <div className="animate-fadeIn space-y-4 pt-4 border-t border-cyan-400/20">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-lg font-medium text-slate-200 mb-2">کد مشتری</label>
                                            <input name="customerCode" value={formData.customerCode} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                                            {isCheckingCustomer && <p className="text-sm text-slate-400 mt-1">در حال بررسی...</p>}
                                            {customer && <p className="text-sm text-green-400 mt-1">✓ {customer.name}</p>}
                                            {customer === null && formData.customerCode && !isCheckingCustomer && <p className="text-sm text-red-400 mt-1">مشتری یافت نشد.</p>}
                                        </div>
                                        <div>
                                             <label className="block text-lg font-medium text-slate-200 mb-2">مبلغ در دفتر مشتری</label>
                                             <input name="customerAmount" value={formData.customerAmount} onChange={handleChange} required type="text" inputMode="decimal" className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md" />
                                        </div>
                                    </div>
                                    <div>
                                         <label className="block text-lg font-medium text-slate-200 mb-2">نوع تراکنش مشتری</label>
                                          <select name="customerTransactionType" value={formData.customerTransactionType} onChange={handleChange} required className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md">
                                             <option value="debit">بدهکار (مشتری به ما پول می‌دهد/بدهکار می‌شود)</option>
                                             <option value="credit">بستانکار (ما به مشتری پول می‌دهیم/بستانکار می‌شویم)</option>
                                          </select>
                                    </div>
                                </div>
                            )}
                         </div>
                        
                         {calculatedFee && (
                             <div className={`text-center p-3 rounded-md text-xl font-bold ${calculatedFee.amount > 0 ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                                {calculatedFee.text}
                             </div>
                         )}

                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={handleClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md">لغو</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)', boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)' }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت تبادله'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LogForeignTransactionModal;