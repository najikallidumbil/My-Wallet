import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  BarChart3,
  Settings,
  Plus,
  Moon,
  Sun,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { ActiveTab } from '../../types';
import { formatRupees } from '../../lib/currency';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, openQuickAdd, financialSummary, isSupabaseMode } = useWallet();
  const { isDark, toggleTheme } = useTheme();

  const totalOverdue = financialSummary.overdueCreditCount + financialSummary.overdueDebtCount;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <ReceiptText className="w-5 h-5" />,
    },
    {
      id: 'credit-debt',
      label: 'Credit & Debt (Khata)',
      icon: <Users className="w-5 h-5" />,
      badge: totalOverdue > 0 ? totalOverdue : undefined,
    },
    {
      id: 'analytics',
      label: 'Analytics & Insights',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">My Wallet</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Finance & Khata</p>
          </div>
        </div>

        {/* Theme Quick Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Add Action */}
      <div className="px-5 pt-5 pb-2">
        <button
          onClick={() => openQuickAdd('expense')}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-medium text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pb-1">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {Boolean(item.badge) && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Balance / Status Summary */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Net Balance</span>
          <span className="text-[10px] uppercase font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
            Live
          </span>
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {formatRupees(financialSummary.totalBalance)}
        </p>

        <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Database</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isSupabaseMode ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              )}
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {isSupabaseMode ? 'Supabase Ready' : 'Local Workspace'}
            </span>
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center">
            AK
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              Personal Account
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              ₹ INR Currency
            </p>
          </div>
        </div>
        <div title="Secured with AES & RLS">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </div>
      </div>
    </aside>
  );
};
