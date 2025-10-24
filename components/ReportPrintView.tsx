import React from 'react';
import { ReportType, ProfitAndLossReportData, CashboxSummaryReportData, InternalLedgerReportData } from '../types';
import { reportTypeTranslations, foreignTransactionStatusTranslations } from '../utils/translations';

interface ReportPrintViewProps {
    reportData: ProfitAndLossReportData | CashboxSummaryReportData | InternalLedgerReportData;
    reportType: ReportType;
}

const ReportPrintView: React.FC<ReportPrintViewProps> = ({ reportData, reportType }) => {
    
    const renderProfitAndLoss = (data: ProfitAndLossReportData) => (
        <>
            <div className="grid grid-cols-3 gap-4 mb-6 text-center text-sm">
                <div className="bg-green-100 p-2 rounded">
                    <h4>مجموع درآمد</h4>
                    <p className="font-bold text-green-700">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalRevenue)} {data.currency}</p>
                </div>
                 <div className="bg-red-100 p-2 rounded">
                    <h4>مجموع مصارف</h4>
                    <p className="font-bold text-red-700">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalExpenses)} {data.currency}</p>
                </div>
                 <div className="bg-blue-100 p-2 rounded">
                    <h4>سود خالص</h4>
                    <p className={`font-bold ${data.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.netProfit)} {data.currency}</p>
                </div>
            </div>
            <h3 className="text-lg font-bold mb-2 mt-4">جزئیات درآمدها</h3>
            <table className="w-full text-sm border-collapse border border-gray-400">
                <thead className="bg-gray-200"><tr className="text-right"><th className="p-2 border">تاریخ</th><th className="p-2 border">شرح</th><th className="p-2 border text-left">مبلغ</th></tr></thead>
                <tbody>{data.revenueItems.map((item, i) => (<tr key={`rev-${i}`} className="odd:bg-white even:bg-gray-50"><td className="p-2 border">{item.date.toLocaleDateString('fa-IR-u-nu-latn')}</td><td className="p-2 border">{item.description}</td><td className="p-2 border font-mono text-left text-green-700">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(item.amount)}</td></tr>))}</tbody>
            </table>
            <h3 className="text-lg font-bold mb-2 mt-4">جزئیات مصارف</h3>
             <table className="w-full text-sm border-collapse border border-gray-400">
                <thead className="bg-gray-200"><tr className="text-right"><th className="p-2 border">تاریخ</th><th className="p-2 border">شرح</th><th className="p-2 border text-left">مبلغ</th></tr></thead>
                <tbody>{data.expenseItems.map((item, i) => (<tr key={`exp-${i}`} className="odd:bg-white even:bg-gray-50"><td className="p-2 border">{item.date.toLocaleDateString('fa-IR-u-nu-latn')}</td><td className="p-2 border">{item.description}</td><td className="p-2 border font-mono text-left text-red-700">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(item.amount)}</td></tr>))}</tbody>
            </table>
        </>
    );

    const renderInternalLedger = (data: InternalLedgerReportData) => (
        <table className="w-full text-xs border-collapse border border-gray-400">
            <thead className="bg-gray-200 text-right">
                <tr>
                    <th className="p-2 border">تاریخ</th>
                    <th className="p-2 border">شرح</th>
                    <th className="p-2 border">برد از</th>
                    <th className="p-2 border text-left">مبلغ برد</th>
                    <th className="p-2 border">رسید به</th>
                    <th className="p-2 border text-left">مبلغ رسید</th>
                    <th className="p-2 border">وضعیت</th>
                </tr>
            </thead>
            <tbody>
                {data.transactions.map(tx => (
                    <tr key={tx.id} className="odd:bg-white even:bg-gray-50">
                        <td className="p-2 border whitespace-nowrap">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                        <td className="p-2 border">{tx.description}</td>
                        {/* FIX: Changed property access to snake_case to match type definitions. */}
                        <td className="p-2 border">{tx.from_asset_name}</td>
                        <td className="p-2 border font-mono text-left text-red-700">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.from_amount)} {tx.from_currency}</td>
                        <td className="p-2 border">{tx.to_asset_name}</td>
                        <td className="p-2 border font-mono text-left text-green-700">{tx.to_amount ? `${new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.to_amount)} ${tx.to_currency}` : '-'}</td>
                        <td className="p-2 border">{foreignTransactionStatusTranslations[tx.status]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
    
    const renderCashboxSummary = (data: CashboxSummaryReportData) => (
        <>
            <div className="grid grid-cols-3 gap-4 mb-6 text-center text-sm">
                <div className="bg-green-100 p-2 rounded">
                    <h4>مجموع ورودی (رسید)</h4>
                    <p className="font-bold text-green-700">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalInflow)} {data.currency}</p>
                </div>
                 <div className="bg-red-100 p-2 rounded">
                    <h4>مجموع خروجی (برد)</h4>
                    <p className="font-bold text-red-700">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalOutflow)} {data.currency}</p>
                </div>
                 <div className="bg-blue-100 p-2 rounded">
                    <h4>تغییر خالص</h4>
                    <p className={`font-bold ${data.netChange >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.netChange)} {data.currency}</p>
                </div>
            </div>
            <table className="w-full text-sm border-collapse border border-gray-400">
                <thead className="bg-gray-200">
                    <tr className="text-right">
                        <th className="p-2 border">تاریخ</th>
                        <th className="p-2 border">شرح</th>
                        <th className="p-2 border">نوع</th>
                        <th className="p-2 border text-left">مبلغ</th>
                    </tr>
                </thead>
                <tbody>
                    {data.transactions.map((tx) => (
                        <tr key={tx.id} className="odd:bg-white even:bg-gray-50">
                            <td className="p-2 border">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                            <td className="p-2 border">{tx.reason}</td>
                            <td className={`p-2 border font-medium ${tx.type === 'inflow' ? 'text-green-700' : 'text-red-700'}`}>{tx.type === 'inflow' ? 'رسید' : 'برد'}</td>
                            <td className="p-2 border font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );

    return (
        <div id="printable-area" className="bg-white text-black p-8 font-[sans-serif]" style={{ direction: 'rtl', width: '21cm', minHeight: '29.7cm', margin: 'auto' }}>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-8">
                <div>
                    <h1 className="text-4xl font-bold" style={{ fontFamily: "'Times New Roman', serif" }}>صرافی الشیخ</h1>
                    <p className="text-xl text-gray-600 mt-1">{reportTypeTranslations[reportType]}</p>
                </div>
                <div className="text-left text-sm text-gray-700">
                    <p><strong>تاریخ گزارش:</strong> {new Date().toLocaleDateString('fa-IR')}</p>
                </div>
            </header>
            
            <main>
                {reportType === ReportType.ProfitAndLoss && renderProfitAndLoss(reportData as ProfitAndLossReportData)}
                {reportType === ReportType.InternalLedger && renderInternalLedger(reportData as InternalLedgerReportData)}
                {reportType === ReportType.CashboxSummary && renderCashboxSummary(reportData as CashboxSummaryReportData)}
            </main>
        </div>
    );
};

export default ReportPrintView;