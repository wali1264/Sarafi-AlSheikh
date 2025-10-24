import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { ReportType, Currency, ProfitAndLossReportData, CashboxSummaryReportData, GenerateReportPayload, InternalLedgerReportData } from '../types';
import { reportTypeTranslations } from '../utils/translations';
import { CURRENCIES } from '../constants';
import ReportViewer from '../components/ReportViewer';

type ReportData = ProfitAndLossReportData | CashboxSummaryReportData | InternalLedgerReportData;

export const ReportsPage: React.FC = () => {
    const api = useApi();
    const [reportType, setReportType] = useState<ReportType>(ReportType.ProfitAndLoss);
    const [currency, setCurrency] = useState<Currency>(Currency.USD);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); // Start of current month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setError(null);
        setReportData(null);

        const payload: GenerateReportPayload = {
            report_type: reportType,
            start_date: startDate,
            end_date: endDate,
            currency,
        };

        const result = await api.generateReport(payload);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
        } else {
            setReportData(result as ReportData);
        }
    };
    
    const isCurrencyFilterVisible = reportType !== ReportType.InternalLedger;


    return (
        <div style={{ direction: 'rtl' }}>
            <h1 className="text-5xl font-bold text-slate-100 mb-10 tracking-wider">گزارش گیری پیشرفته</h1>
            
            <div id="report-controls" className="bg-[#12122E]/80 border-2 border-cyan-400/20 p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)] mb-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                    {/* Report Type */}
                    <div>
                        <label htmlFor="reportType" className="block text-lg font-medium text-cyan-300 mb-2">نوع گزارش</label>
                        <select id="reportType" value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400">
                            {Object.values(ReportType).map(rt => (
                                <option key={rt} value={rt}>{reportTypeTranslations[rt]}</option>
                            ))}
                        </select>
                    </div>
                    {/* Currency */}
                    {isCurrencyFilterVisible && (
                        <div>
                            <label htmlFor="currency" className="block text-lg font-medium text-cyan-300 mb-2">واحد پولی</label>
                            <select id="currency" value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400">
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                    {/* Start Date */}
                    <div>
                        <label htmlFor="startDate" className="block text-lg font-medium text-cyan-300 mb-2">تاریخ شروع</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400" />
                    </div>
                    {/* End Date */}
                    <div>
                        <label htmlFor="endDate" className="block text-lg font-medium text-cyan-300 mb-2">تاریخ پایان</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-xl px-3 py-2 bg-slate-900/50 border-2 border-slate-600/50 rounded-md text-slate-100 focus:outline-none focus:border-cyan-400" />
                    </div>
                    {/* Generate Button */}
                    <button 
                        onClick={handleGenerateReport}
                        disabled={isLoading}
                        className="w-full px-6 py-3 text-xl font-bold tracking-wider text-slate-900 bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 transition-all transform hover:scale-105 disabled:opacity-50"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
                            boxShadow: '0 0 25px rgba(0, 255, 255, 0.5)'
                        }}>
                        {isLoading ? 'در حال تولید...' : 'تولید گزارش'}
                    </button>
                </div>
            </div>

            {isLoading && <div className="text-center text-2xl text-slate-400 p-10">در حال تولید گزارش...</div>}
            {error && <div className="text-center text-2xl text-red-400 p-10">{error}</div>}
            {reportData && <ReportViewer reportData={reportData} reportType={reportType} />}
        </div>
    );
};
