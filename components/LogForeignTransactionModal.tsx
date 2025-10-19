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
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const fromAsset = useMemo(() => assets.find(a => a.id === formData.fromAssetId), [assets, formData.fromAssetId]);
    const toAsset = useMemo(() => assets.find(a => a.id === formData.toAssetId), [assets, formData.toAssetId]);

    if (!isOpen) return null;

    const resetForm = () => {
        setFormData({
            fromAssetId: '', fromAmount: '', toAssetId: '', toAmount: '',
            description: '',
        });
        setError(null);
        setIsLoading(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        const numericFields = ['fromAmount', 'toAmount'];
        if (numericFields.includes(name)) {
            setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload: LogForeignTransactionPayload = {
            description: formData.description,
            fromAssetId: formData.fromAssetId,
            fromAmount: parseFloat(formData.fromAmount) || 0,
            toAssetId: formData.toAssetId,
            toAmount: parseFloat(formData.toAmount) || 0,
            user: currentUser,
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

                        <div className="p-4 border-2 border-amber-500/30 bg-amber-500/10 rounded-md">
                            <h4 className="text-xl font-bold text-amber-300 mb-2">نکته مهم</h4>
                            <p className="text-slate-300 text-lg">
                                این فرم فقط برای تبادلات داخلی بین دارایی‌های صرافی (صندوق‌ها و بانک‌ها) است.
                                <br />
                                برای انجام تبادله برای یک مشتری، لطفاً ابتدا وجه را از طریق بخش <strong>«صندوق»</strong> به حساب مشتری واریز/برداشت کرده، سپس به صفحه جزئیات مشتری رفته و از گزینه <strong>«تبدیل ارز داخلی»</strong> استفاده نمایید.
                            </p>
                        </div>
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