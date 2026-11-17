import React, { useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { formatRupees } from '../lib/currency';
import { CategoryIcon } from '../components/common/CategoryIcon';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  CreditCard,
  Sparkles,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { transactions, financialSummary, categorySpending } = useWallet();

  // Payment method breakdown
  const paymentMethodStats = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {
      upi: { total: 0, count: 0 },
      cash: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      bank_transfer: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };

    let grandTotal = 0;
    transactions.forEach((tx) => {
      grandTotal += tx.amount;
      const m = tx.paymentMethod || 'other';
      if (!counts[m]) counts[m] = { total: 0, count: 0 };
      counts[m].total += tx.amount;
      counts[m].count += 1;
    });

    return Object.entries(counts).map(([method, data]) => ({
      method,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const { monthlyIncome, monthlyExpense, netSavings, savingsRate, totalBalance } = financialSummary;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Financial Analytics & Insights
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          In-depth overview of your savings rate, category habits, and payment channels
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Balance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Cumulative Balance</span>
            <Wallet className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatRupees(totalBalance)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
            Net positive asset value
          </span>
        </div>

        {/* Monthly Income */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Monthly Income</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatRupees(monthlyIncome)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across active revenue streams
          </span>
        </div>

        {/* Monthly Expense */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Monthly Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatRupees(monthlyExpense)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Outflow this billing cycle
          </span>
        </div>

        {/* Savings Rate */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-brand-900 text-white shadow-sm border border-indigo-800">
          <div className="flex items-center justify-between text-xs text-indigo-200 mb-2">
            <span>Savings Efficiency</span>
            <Sparkles className="w-4 h-4 text-emerald-300" />
          </div>
          <p className="text-2xl font-black text-white">
            {savingsRate}%
          </p>
          <span className="text-[11px] text-emerald-300 font-medium mt-1 block">
            Net saved: {formatRupees(netSavings)}
          </span>
        </div>
      </div>

      {/* Cashflow Comparison Visual Bar */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Income vs Expense Flow
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ratio of inflow to outflow for current month
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Healthy Buffer
          </span>
        </div>

        {/* Dual Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400">
              Income: {formatRupees(monthlyIncome)} (100%)
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              Expense: {formatRupees(monthlyExpense)} ({monthlyIncome > 0 ? Math.round((monthlyExpense / monthlyIncome) * 100) : 0}%)
            </span>
          </div>

          <div className="w-full bg-emerald-100 dark:bg-emerald-950/60 h-4 rounded-full overflow-hidden flex">
            <div
              className="bg-rose-500 h-full rounded-l-full"
              style={{
                width: `${monthlyIncome > 0 ? Math.min(100, Math.round((monthlyExpense / monthlyIncome) * 100)) : 0}%`,
              }}
            />
            <div className="bg-emerald-500 h-full flex-1" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Burned Outflow</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Retained Savings ({formatRupees(netSavings)})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Category Breakdown & Payment Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Expense Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Category Spending Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Where your money goes most
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {categorySpending.map((cat) => (
              <div key={cat.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      name={cat.categoryIcon}
                      className="w-4 h-4"
                      color={cat.categoryColor}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {cat.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatRupees(cat.totalAmount)}
                    </span>
                    <span className="text-[11px] text-slate-400 w-8 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.categoryColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Channels Preference */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Payment Modes & Channels
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                UPI vs Net Banking vs Card vs Cash
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {paymentMethodStats.map((item) => {
              const labelMap: Record<string, string> = {
                upi: 'UPI (GPay, PhonePe, Paytm)',
                bank_transfer: 'Net Banking / NEFT',
                card: 'Credit & Debit Cards',
                cash: 'Cash Transactions',
                other: 'Other Modes',
              };

              return (
                <div key={item.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {labelMap[item.method] || item.method} ({item.count} txs)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupees(item.total)}
                      </span>
                      <span className="text-[11px] text-slate-400 w-8 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
