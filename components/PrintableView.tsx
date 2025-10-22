import React from 'react';
import { CashboxRequest } from '../types';
import { cashboxRequestStatusTranslations } from '../utils/translations';

interface PrintableViewProps {
    request: CashboxRequest;
    printNote?: string;
}

const PrintableView: React.FC<PrintableViewProps> = ({ request, printNote }) => {
    const isWithdrawal = request.requestType === 'withdrawal';

    return (
        <div id="printable-area" className="bg-white text-black p-10 font-sans relative" style={{ direction: 'rtl', width: '210mm', minHeight: '297mm', margin: 'auto' }}>
            <header className="flex justify-between items-start pb-6 border-b-4 border-gray-800">
                <div>
                    <h1 className="text-5xl font-extrabold text-gray-900">صرافی الشیخ</h1>
                    <p className="text-2xl text-gray-600 mt-2">سند رسمی عملیات صندوق</p>
                </div>
                <div className="text-left text-lg">
                    <p><span className="font-bold">کد درخواست:</span> <span className="font-mono">{request.id}</span></p>
                    <p><span className="font-bold">تاریخ و ساعت:</span> {new Date(request.createdAt).toLocaleString('fa-IR')}</p>
                </div>
            </header>

            <main className="my-10 text-xl">
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                        <span className="font-bold text-gray-700">نوع عملیات:</span>
                        <span className={`font-extrabold text-3xl ${isWithdrawal ? 'text-red-600' : 'text-green-600'}`}>
                            {isWithdrawal ? 'برداشت از صندوق (برد)' : 'واریز به صندوق (رسید)'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-4">
                        <span className="font-bold text-gray-700">مبلغ:</span>
                        <span className="font-mono font-extrabold text-4xl text-gray-900">
                            {new Intl.NumberFormat('fa-IR-u-nu-latn').format(request.amount)}
                            <span className="text-2xl font-semibold ml-2">{request.currency}</span>
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                        <span className="font-bold text-gray-700">وضعیت نهایی:</span>
                        <span className="font-bold">{cashboxRequestStatusTranslations[request.status]}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4">
                        <span className="font-bold text-gray-700">درخواست کننده:</span>
                        <span>{request.requestedBy}</span>
                    </div>
                    
                    {request.resolvedBy && (
                         <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                            <span className="font-bold text-gray-700">تایید کننده:</span>
                            <span>{request.resolvedBy}</span>
                        </div>
                    )}

                    <div className="p-4 border-t-2 border-gray-200 mt-4">
                        <h3 className="font-bold text-gray-700 mb-2">شرح / توضیحات اصلی:</h3>
                        <p className="bg-gray-50 p-3 rounded-md min-h-[50px]">{request.reason}</p>
                    </div>
                    
                    {request.linkedEntity && (
                         <div className="p-4">
                            <h3 className="font-bold text-gray-700 mb-2">تراکنش مرتبط:</h3>
                            <p className="bg-gray-50 p-3 rounded-md">{request.linkedEntity.description} (کد: {request.linkedEntity.id})</p>
                        </div>
                    )}
                    
                    {printNote && (
                        <div className="p-4 border-t-2 border-gray-200 mt-4">
                            <h3 className="font-bold text-gray-700 mb-2">یادداشت ضمیمه چاپ:</h3>
                            <p className="bg-yellow-100 border border-yellow-300 p-3 rounded-md whitespace-pre-wrap">{printNote}</p>
                        </div>
                    )}
                </div>
            </main>

            <footer className="absolute bottom-10 left-10 right-10 pt-10 border-t-2 border-gray-400">
                <div className="grid grid-cols-3 gap-8 text-center text-base">
                    <div>
                        <div className="h-20 mb-2"></div>
                        <p className="border-t-2 border-gray-500 pt-2 font-bold">امضای درخواست کننده</p>
                    </div>
                     <div>
                        <div className="h-20 mb-2"></div>
                        <p className="border-t-2 border-gray-500 pt-2 font-bold">امضای صندوق دار</p>
                    </div>
                     <div>
                        <div className="h-20 mb-2"></div>
                        <p className="border-t-2 border-gray-500 pt-2 font-bold">مهر صرافی</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrintableView;
