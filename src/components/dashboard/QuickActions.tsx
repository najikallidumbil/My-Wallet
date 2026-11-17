import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { PlusCircle, MinusCircle, HandCoins, Landmark } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const { openQuickAdd } = useWallet();

  const actions = [
    {
      label: 'Add Income',
      desc: 'Salary, freelance, profit',
      mode: 'income' as const,
      icon: <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-800',
      iconBg: 'bg-emerald-100/70 dark:bg-emerald-950/80',
    },
    {
      label: 'Add Expense',
      desc: 'Bills, food, shopping',
      mode: 'expense' as const,
      icon: <MinusCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      bg: 'hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800',
      iconBg: 'bg-rose-100/70 dark:bg-rose-950/80',
    },
    {
      label: 'Lend Money',
      desc: 'Credit (others owe me)',
      mode: 'credit' as const,
      icon: <HandCoins className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      bg: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:border-cyan-300 dark:hover:border-cyan-800',
      iconBg: 'bg-cyan-100/70 dark:bg-cyan-950/80',
    },
    {
      label: 'Borrow Money',
      desc: 'Debt (I owe others)',
      mode: 'debt' as const,
      icon: <Landmark className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-800',
      iconBg: 'bg-amber-100/70 dark:bg-amber-950/80',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((act) => (
        <button
          key={act.label}
          onClick={() => openQuickAdd(act.mode)}
          className={`p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between group ${act.bg}`}
        >
          <div className={`w-10 h-10 rounded-xl ${act.iconBg} flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105`}>
            {act.icon}
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-slate-900 dark:text-white">
              {act.label}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {act.desc}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
