import React from 'react';
import { ReportType, ProfitAndLossReportData, CashboxSummaryReportData } from '../types';
import { reportTypeTranslations } from '../utils/translations';

interface ReportViewerProps {
    reportData: ProfitAndLossReportData | CashboxSummaryReportData;
    reportType: ReportType;
}

const PrintIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8a2 2 0 01-2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 01-2 2" />
    </svg>
);
const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);


const ReportViewer: React.FC<ReportViewerProps> = ({ reportData, reportType }) => {

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        let data: any[] = [];
        let headers: string[] = [];

        if (reportType === ReportType.ProfitAndLoss) {
            const rd = reportData as ProfitAndLossReportData;
            headers = ["Type", "Description", "Amount", "Date"];
            data = [
                ...rd.revenueItems.map(item => ({ Type: "Revenue", ...item })),
                ...rd.expenseItems.map(item => ({ Type: "Expense", ...item })),
            ];
        } else if (reportType === ReportType.CashboxSummary) {
            const rd = reportData as CashboxSummaryReportData;
            headers = ["Timestamp", "Type", "Amount", "Currency", "Reason", "User"];
            data = rd.transactions;
        }

        csvContent += headers.join(",") + "\r\n";
        data.forEach(row => {
            const values = headers.map(header => JSON.stringify(row[header.toLowerCase() as keyof typeof row] ?? '', (key, value) => typeof value === 'string' ? value.replace(/"/g, '""') : value));
            csvContent += values.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const renderProfitAndLoss = (data: ProfitAndLossReportData) => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
                <div className="bg-green-500/10 p-4 border border-green-500/30 rounded-lg">
                    <h4 className="text-xl text-slate-400">مجموع درآمد</h4>
                    <p className="text-4xl font-bold text-green-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalRevenue)} {data.currency}</p>
                </div>
                 <div className="bg-red-500/10 p-4 border border-red-500/30 rounded-lg">
                    <h4 className="text-xl text-slate-400">مجموع مصارف</h4>
                    <p className="text-4xl font-bold text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalExpenses)} {data.currency}</p>
                </div>
                 <div className="bg-cyan-500/10 p-4 border border-cyan-500/30 rounded-lg">
                    <h4 className="text-xl text-slate-400">سود خالص</h4>
                    <p className={`text-4xl font-bold ${data.netProfit >= 0 ? 'text-cyan-300' : 'text-red-400'}`}>{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.netProfit)} {data.currency}</p>
                </div>
            </div>
            <table className="w-full text-lg text-right text-slate-300">
                <thead className="text-xl text-slate-400 uppercase">
                    <tr>
                        <th className="px-6 py-4 font-medium">تاریخ</th>
                        <th className="px-6 py-4 font-medium">شرح</th>
                        <th className="px-6 py-4 font-medium">نوع</th>
                        <th className="px-6 py-4 font-medium">مبلغ</th>
                    </tr>
                </thead>
                <tbody>
                    {data.revenueItems.map((item, i) => (
                        <tr key={`rev-${i}`} className="border-b border-cyan-400/10"><td className="px-6 py-3">{item.date.toLocaleDateString('fa-IR-u-nu-latn')}</td><td className="px-6 py-3">{item.description}</td><td className="px-6 py-3 text-green-400">درآمد</td><td className="px-6 py-3 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(item.amount)}</td></tr>
                    ))}
                    {data.expenseItems.map((item, i) => (
                        <tr key={`exp-${i}`} className="border-b border-cyan-400/10"><td className="px-6 py-3">{item.date.toLocaleDateString('fa-IR-u-nu-latn')}</td><td className="px-6 py-3">{item.description}</td><td className="px-6 py-3 text-red-400">مصرف</td><td className="px-6 py-3 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(item.amount)}</td></tr>
                    ))}
                </tbody>
            </table>
        </>
    );

    const renderCashboxSummary = (data: CashboxSummaryReportData) => (
         <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
                <div className="bg-green-500/10 p-4 border border-green-500/30 rounded-lg">
                    <h4 className="text-xl text-slate-400">مجموع ورودی</h4>
                    <p className="text-4xl font-bold text-green-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalInflow)} {data.currency}</p>
                </div>
                 <div className="bg-red-500/10 p-4 border border-red-500/30 rounded-lg">
                    <h4 className="text-xl text-slate-400">مجموع خروجی</h4>
                    <p className="text-4xl font-bold text-red-400">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.totalOutflow)} {data.currency}</p>
                </div>
                 <div className="bg-cyan-500/10 p-4 border border-cyan-500/30 rounded-lg">
                    <h4 className="text-xl text-slate-400">تغییر خالص</h4>
                    <p className={`text-4xl font-bold ${data.netChange >= 0 ? 'text-cyan-300' : 'text-red-400'}`}>{new Intl.NumberFormat('fa-IR-u-nu-latn').format(data.netChange)} {data.currency}</p>
                </div>
            </div>
             <table className="w-full text-lg text-right text-slate-300">
                <thead className="text-xl text-slate-400 uppercase">
                    <tr>
                        <th className="px-6 py-4 font-medium">تاریخ</th>
                        <th className="px-6 py-4 font-medium">دلیل</th>
                        <th className="px-6 py-4 font-medium">نوع</th>
                        <th className="px-6 py-4 font-medium">مبلغ</th>
                    </tr>
                </thead>
                 <tbody>
                    {data.transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-cyan-400/10">
                            <td className="px-6 py-3">{new Date(tx.timestamp).toLocaleString('fa-IR-u-nu-latn')}</td>
                            <td className="px-6 py-3">{tx.reason}</td>
                            <td className={`px-6 py-3 font-medium ${tx.type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>{tx.type === 'inflow' ? 'ورودی' : 'خروجی'}</td>
                            <td className="px-6 py-3 font-mono text-left">{new Intl.NumberFormat('fa-IR-u-nu-latn').format(tx.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );

    return (
        <div id="report-view" className="bg-[#12122E]/80 border-2 border-cyan-400/20 shadow-[0_0_40px_rgba(0,255,255,0.2)] animate-fadeIn" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
            <div className="p-6 border-b-2 border-cyan-400/20 flex justify-between items-center">
                <h2 className="text-3xl font-semibold text-cyan-300 tracking-wider">
                    {reportTypeTranslations[reportType]}
                </h2>
                <div className="flex gap-4">
                    <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-base transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">
                        <PrintIcon /> چاپ
                    </button>
                    <button onClick={handleExport} className="flex items-center px-4 py-2 bg-slate-600/50 text-slate-100 hover:bg-cyan-400/20 hover:text-cyan-300 text-base transition-colors border border-slate-500/50 hover:border-cyan-400/60 rounded">
                        <DownloadIcon /> دریافت CSV
                    </button>
                </div>
            </div>
            <div className="p-6 overflow-x-auto">
                {reportType === ReportType.ProfitAndLoss && renderProfitAndLoss(reportData as ProfitAndLossReportData)}
                {reportType === ReportType.CashboxSummary && renderCashboxSummary(reportData as CashboxSummaryReportData)}
            </div>
        </div>
    );
};

export default ReportViewer;