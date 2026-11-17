import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { ArrowUpRight, ArrowDownLeft, AlertCircle, ChevronRight } from 'lucide-react';

export const CreditDebtSummary: React.FC = () => {
  const { financialSummary, setActiveTab, openQuickAdd } = useWallet();
  const {
    totalCreditPending,
    totalDebtPending,
    overdueCreditCount,
    overdueDebtCount,
  } = financialSummary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Credit: Money Others Owe Me (You will get) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-cyan-400 dark:hover:border-cyan-600 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                You will get (Credit)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Money others owe you
              </p>
            </div>
          </div>

          {overdueCreditCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-3 h-3" />
              <span>{overdueCreditCount} overdue</span>
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <span className="text-2xl md:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">
              {formatRupees(totalCreditPending)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">
              Receivable amount
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openQuickAdd('credit')}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900 transition-colors"
            >
              + Lend
            </button>
            <button
              onClick={() => setActiveTab('credit-debt')}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="View all credits"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Debt: Money I Owe Others (You owe) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-400 dark:hover:border-amber-600 transition-all">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                You owe (Debt)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Money you owe to others
              </p>
            </div>
          </div>

          {overdueDebtCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-3 h-3" />
              <span>{overdueDebtCount} overdue</span>
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <span className="text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {formatRupees(totalDebtPending)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">
              Payable obligations
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openQuickAdd('debt')}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
            >
              + Borrow
            </button>
            <button
              onClick={() => setActiveTab('credit-debt')}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="View all debts"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
