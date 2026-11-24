import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { formatRupees } from '../lib/currency';
import { formatDate } from '../lib/date';
import {
  FileSpreadsheet,
  Printer,
  Download,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const ReportsView: React.FC = () => {
  const { transactions, categories, accounts } = useWallet();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Filter records by selected period
  const reportData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();
    const currentMonth = today.toISOString().slice(0, 7);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const filteredTx = transactions.filter((tx) => {
      const txDate = new Date(tx.transactionDate);
      txDate.setHours(0, 0, 0, 0);

      if (period === 'daily') {
        return txDate.getTime() === today.getTime();
      } else if (period === 'weekly') {
        return txDate >= startOfWeek && txDate <= today;
      } else if (period === 'monthly') {
        return tx.transactionDate.startsWith(currentMonth);
      } else if (period === 'yearly') {
        return txDate.getFullYear() === currentYear;
      } else if (period === 'custom') {
        if (customStart && tx.transactionDate < customStart) return false;
        if (customEnd && tx.transactionDate > customEnd) return false;
      }
      return true;
    });

    let totalIncome = 0;
    let totalExpense = 0;

    const catMap = new Map<string, number>();

    filteredTx.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
        catMap.set(tx.categoryId, (catMap.get(tx.categoryId) || 0) + tx.amount);
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

    const topCategories = Array.from(catMap.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Uncategorized',
          amount,
          percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      transactions: filteredTx,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      topCategories,
    };
  }, [transactions, categories, period, customStart, customEnd]);

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name || 'General';
  const getAccountName = (accId?: string) => accounts.find((a) => a.id === accId)?.name || 'Default';

  // Excel (.csv) Export
  const handleExportExcel = () => {
    const headers = [
      'Date',
      'Time',
      'Type',
      'Title',
      'Category',
      'Account',
      'Payment Method',
      'Amount (INR)',
      'Description',
    ];

    const rows = reportData.transactions.map((tx) => [
      tx.transactionDate,
      tx.transactionTime || '12:00',
      tx.type.toUpperCase(),
      `"${tx.title.replace(/"/g, '""')}"`,
      `"${getCategoryName(tx.categoryId)}"`,
      `"${getAccountName(tx.accountId)}"`,
      tx.paymentMethod,
      tx.amount.toFixed(2),
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Microsoft Excel auto-detect
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my_wallet_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // PDF / Print Export
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Reports & Financial Exports
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Detailed daily, weekly, monthly, and yearly statements with Excel & PDF exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            title="Download Excel CSV Spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel (.CSV)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            Period:
          </span>
          {(
            [
              { id: 'daily', label: 'Daily (Today)' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
              { id: 'custom', label: 'Custom Date Range' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0',
                period === p.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-400 block mb-1">Total Period Income</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatRupees(reportData.totalIncome)}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-400 block mb-1">Total Period Expense</span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatRupees(reportData.totalExpense)}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-medium text-slate-400 block mb-1">Net Cashflow Flow</span>
          <p
            className={`text-2xl font-black ${
              reportData.netSavings >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupees(reportData.netSavings, { showSign: true })}
          </p>
        </div>
      </div>

      {/* Printable Report Document Body */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Statement of Accounts ({period.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-400">
              Showing {reportData.transactions.length} verified transactions
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Generated: {new Date().toLocaleDateString('en-IN')}
          </span>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Title / Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No transactions recorded for this period.
                  </td>
                </tr>
              ) : (
                reportData.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                      {formatDate(tx.transactionDate)}{' '}
                      <span className="text-slate-400">{tx.transactionTime || ''}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                          tx.type === 'income'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        )}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {tx.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {getCategoryName(tx.categoryId)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {getAccountName(tx.accountId)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 px-3 text-right font-black',
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      )}
                    >
                      {formatRupees(tx.amount, { showSign: true })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
