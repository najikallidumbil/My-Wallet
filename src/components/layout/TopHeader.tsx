import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Sun,
  Moon,
  Database,
  Plus,
  ShieldCheck,
  ArrowLeftRight,
  BookOpen,
  PieChart,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AppMode } from '../../types';

export const TopHeader: React.FC = () => {
  const { currentMode, setCurrentMode, activeTab, isSupabaseMode, openQuickAdd } = useWallet();
  const { isDark, toggleTheme } = useTheme();

  const getPageDetails = () => {
    switch (activeTab) {
      case 'income_expense':
      case 'transactions':
        return {
          title: 'Income & Expense',
          subtitle: 'Personal cashflow tracking, income deposits and daily expenditures',
        };
      case 'khata_book':
      case 'credit-debt':
        return {
          title: 'Khata Book (Credit & Debt)',
          subtitle: 'Personal lending and borrowing management with person-wise accounts',
        };
      case 'financial_overview':
      case 'dashboard':
        return {
          title: 'Combined Financial Overview',
          subtitle: 'Actual cash balance, net worth, cashflow, and multi-account status',
        };
      case 'accounts':
        return {
          title: 'Multi-Account Management',
          subtitle: 'Cash, bank accounts, UPI wallets, and internal fund transfers',
        };
      case 'categories':
        return {
          title: 'Smart Categories',
          subtitle: 'Custom income and expense categories, icons, and colors',
        };
      case 'recurring':
        return {
          title: 'Recurring Transactions',
          subtitle: 'Automated daily, weekly, monthly, and yearly scheduled cashflows',
        };
      case 'reports':
        return {
          title: 'Reports & Data Exports',
          subtitle: 'Daily, weekly, monthly, yearly reports with PDF and Excel export',
        };
      case 'analytics':
        return {
          title: 'Analytics & Trends',
          subtitle: 'Visual breakdowns of your cashflow and category spending',
        };
      case 'settings':
      default:
        return {
          title: 'Settings & Security',
          subtitle: 'Supabase credentials, currency, PIN and local backup',
        };
    }
  };

  const { title, subtitle } = getPageDetails();

  const modes: { id: AppMode; label: string; icon: React.ReactNode }[] = [
    {
      id: 'income_expense',
      label: 'Income & Expense',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
    },
    {
      id: 'khata_book',
      label: 'Khata Book',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    {
      id: 'financial_overview',
      label: 'Overview',
      icon: <PieChart className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Title & Subtitle */}
        <div className="min-w-0">
          <h1 className="text-base md:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate">
            {subtitle}
          </p>
        </div>

        {/* Center: Top-Level 3 Mode Switcher (Desktop & Tablet) */}
        <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-inner">
          {modes.map((m) => {
            const isActive = currentMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setCurrentMode(m.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions & Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Supabase Status Pill */}
          <div
            className={cn(
              'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              isSupabaseMode
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            )}
            title={
              isSupabaseMode
                ? 'Connected to Supabase PostgreSQL'
                : 'Running in Local Storage Mode. Add Supabase keys to sync.'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden xl:inline">
              {isSupabaseMode ? 'Supabase Connected' : 'Local Mode'}
            </span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isSupabaseMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              )}
            />
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/60 dark:border-slate-700/60"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Quick Add Button */}
          <button
            onClick={() => openQuickAdd('expense')}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-medium shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Security Pill */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
