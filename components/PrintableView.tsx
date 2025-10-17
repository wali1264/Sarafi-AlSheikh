import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { CashboxRequest } from '../types';
import { cashboxRequestStatusTranslations } from '../utils/translations';

const PrintableView: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const api = useApi();
    const [request, setRequest] = useState<CashboxRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!requestId) return;

        const fetchRequest = async () => {
            setIsLoading(true);
            const data = await api.getCashboxRequestById(requestId);
            setRequest(data || null);
            setIsLoading(false);
        };

        fetchRequest();
    }, [requestId, api]);

    useEffect(() => {
        if (!isLoading && request) {
            // Delay print to allow content to render
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [isLoading, request]);

    if (isLoading) {
        return <div className="text-center p-10">در حال بارگذاری سند...</div>;
    }

    if (!request) {
        return <div className="text-center p-10">سند با کد درخواستی یافت نشد.</div>;
    }

    const isWithdrawal = request.requestType === 'withdrawal';

    return (
        <div id="printable-area" className="bg-white text-black p-8 max-w-2xl mx-auto font-sans" style={{ direction: 'rtl' }}>
            <header className="flex justify-between items-center pb-4 border-b-2 border-black">
                <div>
                    <h1 className="text-3xl font-bold">SarrafAI</h1>
                    <p className="text-lg">سند عملیات صندوق</p>
                </div>
                <div className="text-left">
                    <p><strong>کد درخواست:</strong> {request.id}</p>
                    <p><strong>تاریخ:</strong> {new Date(request.createdAt).toLocaleString('fa-IR')}</p>
                </div>
            </header>

            <main className="my-8">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-lg">
                    <div className="font-bold">نوع عملیات:</div>
                    <div className={`font-bold ${isWithdrawal ? 'text-red-700' : 'text-green-700'}`}>
                        {isWithdrawal ? 'برداشت از صندوق' : 'واریز به صندوق'}
                    </div>
                    
                    <div className="font-bold">مبلغ:</div>
                    <div className="font-mono font-bold text-2xl">
                        {new Intl.NumberFormat('fa-IR-u-nu-latn').format(request.amount)} {request.currency}
                    </div>

                    <div className="font-bold">درخواست کننده:</div>
                    <div>{request.requestedBy}</div>

                    <div className="font-bold">وضعیت:</div>
                    <div>{cashboxRequestStatusTranslations[request.status]}</div>
                    
                    <div className="font-bold col-span-2 mt-2">دلیل / توضیحات:</div>
                    <div className="col-span-2 border p-2 bg-gray-50 rounded min-h-[60px]">{request.reason}</div>

                    {request.linkedEntity && (
                         <>
                            <div className="font-bold col-span-2 mt-2">مربوط به:</div>
                            <div className="col-span-2 border p-2 bg-gray-50 rounded">
                                {request.linkedEntity.description} (کد: {request.linkedEntity.id})
                            </div>
                         </>
                    )}
                </div>
            </main>

            <footer className="pt-12">
                <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                        <p>_________________________</p>
                        <p className="font-bold mt-2">امضای درخواست کننده</p>
                    </div>
                     <div>
                        <p>_________________________</p>
                        <p className="font-bold mt-2">امضای صندوق دار</p>
                    </div>
                     <div>
                        <p>_________________________</p>
                        <p className="font-bold mt-2">امضای مدیر</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrintableView;