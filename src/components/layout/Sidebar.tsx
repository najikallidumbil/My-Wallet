import React from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  PieChart,
  WalletCards,
  Tags,
  Repeat,
  FileSpreadsheet,
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
import { ActiveTab, AppMode } from '../../types';
import { formatRupees } from '../../lib/currency';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const {
    currentMode,
    setCurrentMode,
    activeTab,
    setActiveTab,
    openQuickAdd,
    financialSummary,
    combinedFinancialSummary,
    isSupabaseMode,
  } = useWallet();
  const { isDark, toggleTheme } = useTheme();

  const totalOverdue = financialSummary.overdueCreditCount + financialSummary.overdueDebtCount;

  const mainModes: { id: AppMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'income_expense',
      label: 'Income & Expense',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      desc: 'Cashflow tracking',
    },
    {
      id: 'khata_book',
      label: 'Khata Book',
      icon: <BookOpen className="w-4 h-4" />,
      desc: 'Credit & Debt ledger',
    },
    {
      id: 'financial_overview',
      label: 'Financial Overview',
      icon: <PieChart className="w-4 h-4" />,
      desc: 'Net worth & actual cash',
    },
  ];

  const secondaryNavItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'accounts',
      label: 'Accounts & Transfers',
      icon: <WalletCards className="w-4 h-4" />,
    },
    {
      id: 'categories',
      label: 'Smart Categories',
      icon: <Tags className="w-4 h-4" />,
    },
    {
      id: 'recurring',
      label: 'Recurring Rules',
      icon: <Repeat className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'Analytics & Insights',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Finance & Khata System</p>
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
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => openQuickAdd('expense')}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-medium text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Navigation Scrollable Area */}
      <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {/* Section 1: Three Primary Modes */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pb-1.5">
            Main Modes
          </div>
          <div className="space-y-1">
            {mainModes.map((mode) => {
              const isActive = currentMode === mode.id && (activeTab === mode.id || activeTab === 'dashboard' || activeTab === 'transactions' || activeTab === 'credit-debt');
              return (
                <button
                  key={mode.id}
                  onClick={() => setCurrentMode(mode.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left',
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-bold border border-brand-200/60 dark:border-brand-800/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'p-1.5 rounded-lg',
                        isActive
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {mode.icon}
                    </span>
                    <div>
                      <span className="block">{mode.label}</span>
                      <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        {mode.desc}
                      </span>
                    </div>
                  </div>
                  {mode.id === 'khata_book' && totalOverdue > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {totalOverdue}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Management & Reports */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pb-1.5">
            Tools & Management
          </div>
          <div className="space-y-1">
            {secondaryNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left',
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn(isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400')}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {Boolean(item.badge) && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mini Financial Summary Card */}
      <div className="p-3.5 mx-3 mb-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-semibold">Net Worth</span>
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
            Audited
          </span>
        </div>
        <p className="text-base font-extrabold text-slate-900 dark:text-white">
          {formatRupees(combinedFinancialSummary.netWorth)}
        </p>

        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Actual Cash</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {formatRupees(combinedFinancialSummary.actualCashBalance)}
          </span>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
            MW
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              Personal Vault
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {isSupabaseMode ? 'Supabase Connected' : 'Local Storage Encrypted'}
            </p>
          </div>
        </div>
        <div title="Row Level Security & Local DB Ready">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
};
