import { Role, TransferStatus, ExpenseCategory, ForeignTransactionType, ReportType, CashboxRequestStatus, AmanatStatus, ForeignTransactionStatus } from '../types';

export const roleTranslations: Record<Role, string> = {
    [Role.Manager]: 'مدیر',
    [Role.Cashier]: 'صندوق‌دار',
    [Role.Domestic_Clerk]: 'مامور حواله داخلی',
    [Role.Foreign_Clerk]: 'مامور حواله خارجی',
};

export const statusTranslations: Record<TransferStatus, string> = {
    [TransferStatus.Pending]: 'در انتظار',
    [TransferStatus.Executed]: 'اجرا شده',
    [TransferStatus.Paid]: 'پرداخت شده',
};

export const expenseCategoryTranslations: Record<ExpenseCategory, string> = {
    [ExpenseCategory.Salary]: 'حقوق',
    [ExpenseCategory.Rent]: 'کرایه',
    [ExpenseCategory.Utilities]: 'خدمات رفاهی',
    [ExpenseCategory.Hospitality]: 'پذیرایی',
    [ExpenseCategory.Other]: 'متفرقه',
};

export const foreignTransactionTypeTranslations: Record<ForeignTransactionType, string> = {
    [ForeignTransactionType.SellBankTomanForForeignCash]: 'فروش تومان بانکی / تحویل ارز نقد',
    [ForeignTransactionType.BuyBankTomanWithForeignCash]: 'خرید تومان بانکی / دریافت ارز نقد',
    [ForeignTransactionType.BuyBankTomanWithTomanCash]: 'خرید تومان بانکی / دریافت تومان نقد',
    [ForeignTransactionType.SellBankTomanForTomanCash]: 'فروش تومان بانکی / تحویل تومان نقد',
    [ForeignTransactionType.InternalBankTomanTransfer]: 'انتقال داخلی بین حساب‌ها',
};

export const foreignTransactionStatusTranslations: Record<ForeignTransactionStatus, string> = {
    [ForeignTransactionStatus.PendingCashConfirmation]: 'در انتظار تایید صندوق',
    [ForeignTransactionStatus.Completed]: 'تکمیل شده',
    [ForeignTransactionStatus.Cancelled]: 'لغو شده',
};

export const reportTypeTranslations: Record<ReportType, string> = {
    [ReportType.ProfitAndLoss]: 'گزارش سود و زیان',
    [ReportType.CashboxSummary]: 'گزارش خلاصه صندوق',
}

export const cashboxRequestStatusTranslations: Record<CashboxRequestStatus, string> = {
    [CashboxRequestStatus.Pending]: 'در انتظار مدیر',
    [CashboxRequestStatus.Approved]: 'تایید شده',
    [CashboxRequestStatus.Rejected]: 'رد شده',
    [CashboxRequestStatus.AutoApproved]: 'تایید خودکار',
};

export const amanatStatusTranslations: Record<AmanatStatus, string> = {
    [AmanatStatus.Active]: 'فعال',
    [AmanatStatus.Returned]: 'برگشت داده شده',
};


/**
 * Converts Persian (and Arabic) numerals to English numerals.
 * @param str The string containing Persian numerals.
 * @returns A string with English numerals.
 */
export const persianToEnglishNumber = (str: string): string => {
    if (str === null || str === undefined) return '';
    return str
        .replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 0x0660).toString())
        .replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 0x06F0).toString());
};