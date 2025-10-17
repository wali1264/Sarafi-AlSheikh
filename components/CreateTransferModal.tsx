import React, { useState, FormEvent, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { CreateDomesticTransferPayload, Currency, User } from '../types';
import { CURRENCIES } from '../constants';
import { persianToEnglishNumber } from '../utils/translations';

interface CreateTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; type?: string; inputMode?: "decimal" | "text"; required?: boolean }> = 
({ label, name, value, onChange, placeholder, type = 'text', inputMode = 'text', required = true }) => (
    <div className="relative">
        <label htmlFor={name} className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            inputMode={inputMode}
            className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300"
        />
    </div>
);

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const api = useApi();
    const [formData, setFormData] = useState({
        senderName: '',
        senderTazkereh: '',
        receiverName: '',
        receiverTazkereh: '',
        amount: '',
        currency: Currency.USD,
        commission: '',
        destinationProvince: '',
        partnerSarraf: '',
        isCashPayment: true,
        customerCode: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Reset customer code if switching back to cash payment
        if (formData.isCashPayment) {
            setFormData(prev => ({...prev, customerCode: ''}));
        }
    }, [formData.isCashPayment]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        }
        else if (name === 'isCashPayment') {
             setFormData(prev => ({ ...prev, [name]: value === 'true' }));
        } else {
            const numericFields = ['amount', 'commission', 'customerCode'];
            if (numericFields.includes(name)) {
                setFormData(prev => ({ ...prev, [name]: persianToEnglishNumber(value) }));
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const payload: CreateDomesticTransferPayload = {
            ...formData,
            amount: parseFloat(formData.amount) || 0,
            commission: parseFloat(formData.commission) || 0,
            currency: formData.currency as Currency,
            customerCode: formData.isCashPayment ? undefined : formData.customerCode,
            user: currentUser,
        };

        const result = await api.createDomesticTransfer(payload);

        setIsLoading(false);
        if ('error' in result) {
            setError(result.error);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0D0C22]/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fadeIn" style={{ direction: 'rtl' }}>
            <div className="bg-[#12122E]/90 w-full max-w-4xl border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="px-8 py-5 border-b-2 border-cyan-400/20">
                        <h2 className="text-4xl font-bold text-cyan-300 tracking-wider">ایجاد حواله داخلی جدید</h2>
                    </div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        {error && <div className="border-2 border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-md text-lg">{error}</div>}
                        
                        <div>
                            <label className="block text-lg font-medium text-cyan-300 mb-3 text-right tracking-wider">نوع پرداخت</label>
                            <div className="flex gap-x-6 bg-slate-900/50 border-2 border-slate-600/50 p-2 rounded-md">
                               <label className={`flex-1 text-center text-xl p-2 rounded-md cursor-pointer transition-colors ${formData.isCashPayment ? 'bg-cyan-400 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                                   <input type="radio" name="isCashPayment" value="true" checked={formData.isCashPayment} onChange={handleChange} className="hidden" />
                                   پرداخت نقدی (مشتری گذری)
                                </label>
                                 <label className={`flex-1 text-center text-xl p-2 rounded-md cursor-pointer transition-colors ${!formData.isCashPayment ? 'bg-cyan-400 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                                   <input type="radio" name="isCashPayment" value="false" checked={!formData.isCashPayment} onChange={handleChange} className="hidden" />
                                   کسر از حساب مشتری
                                </label>
                            </div>
                        </div>

                        {!formData.isCashPayment && (
                             <div className="p-4 border-2 border-cyan-400/30 bg-cyan-400/10 rounded-md animate-fadeIn">
                                <InputField name="customerCode" label="کد مشتری" value={formData.customerCode} onChange={handleChange} placeholder="کد مشتری ثبت شده را وارد کنید" required={!formData.isCashPayment} />
                                <p className="text-sm text-yellow-400 mt-2">با انتخاب این گزینه، مبلغ کل (مبلغ + کارمزد) از موجودی حساب این مشتری کسر خواهد شد.</p>
                             </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <InputField name="senderName" label="نام فرستنده" value={formData.senderName} onChange={handleChange} placeholder="مثلا: احمد احمدی" />
                           <InputField name="senderTazkereh" label="شماره تذکره فرستنده" value={formData.senderTazkereh} onChange={handleChange} placeholder="123456789" />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <InputField name="receiverName" label="نام گیرنده" value={formData.receiverName} onChange={handleChange} placeholder="مثلا: محمود محمودی" />
                           <InputField name="receiverTazkereh" label="شماره تذکره گیرنده" value={formData.receiverTazkereh} onChange={handleChange} placeholder="987654321" />
                        </div>
                        <hr className="border-cyan-400/20" />
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField name="amount" label="مبلغ" value={formData.amount} onChange={handleChange} placeholder="1000" type="text" inputMode="decimal" />
                            <div>
                                <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2 text-right tracking-wider">واحد پولی</label>
                                <select id="currency" name="currency" value={formData.currency} onChange={handleChange} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400 text-right transition-colors duration-300">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <InputField name="commission" label="کارمزد" value={formData.commission} onChange={handleChange} placeholder="20" type="text" inputMode="decimal" />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField name="destinationProvince" label="ولایت مقصد" value={formData.destinationProvince} onChange={handleChange} placeholder="مثلا: هرات" />
                            <InputField name="partnerSarraf" label="صراف همکار" value={formData.partnerSarraf} onChange={handleChange} placeholder="مثلا: صرافی اعتماد" />
                        </div>
                    </div>
                    <div className="px-8 py-5 bg-black/30 border-t-2 border-cyan-400/20 flex justify-end space-x-4 space-x-reverse">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-xl font-bold tracking-wider text-slate-300 bg-transparent hover:bg-slate-600/30 rounded-md transition-colors">لغو</button>
                        <button type="submit" disabled={isLoading} 
                            className="px-8 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                             style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                            }}>
                            {isLoading ? 'در حال ثبت...' : 'ثبت حواله'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTransferModal;