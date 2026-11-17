import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { Eye, EyeOff, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

export const BalanceCard: React.FC = () => {
  const { financialSummary } = useWallet();
  const [showBalance, setShowBalance] = useState(true);

  const { totalBalance, monthlyIncome, monthlyExpense, savingsRate } = financialSummary;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl shadow-indigo-950/20 border border-indigo-900/40">
      {/* Decorative ambient gradients */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-indigo-200/80">
            Total Net Balance
          </span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            className="text-indigo-300/80 hover:text-white transition-colors p-1"
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Savings Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-emerald-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{savingsRate}% Saved this month</span>
        </div>
      </div>

      {/* Main Balance Display */}
      <div className="mb-6 relative z-10">
        <div className="text-3xl md:text-5xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
          {showBalance ? (
            formatRupees(totalBalance)
          ) : (
            <span className="tracking-widest">₹ ••••••••</span>
          )}
        </div>
        <p className="text-xs text-indigo-200/70 mt-1">
          Real-time aggregate across all liquid funds & accounts
        </p>
      </div>

      {/* Bottom Metrics: Monthly Cashflow */}
      <div className="grid grid-cols-2 gap-4 pt-5 border-t border-indigo-800/50 relative z-10">
        {/* Monthly Income */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-indigo-200/80 block font-medium">Monthly Income</span>
            <span className="text-base md:text-lg font-bold text-white">
              {showBalance ? formatRupees(monthlyIncome) : '₹ ••••'}
            </span>
          </div>
        </div>

        {/* Monthly Expense */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-indigo-200/80 block font-medium">Monthly Expenses</span>
            <span className="text-base md:text-lg font-bold text-white">
              {showBalance ? formatRupees(monthlyExpense) : '₹ ••••'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
