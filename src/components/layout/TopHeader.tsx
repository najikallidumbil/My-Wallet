import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Database, Plus, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export const TopHeader: React.FC = () => {
  const { activeTab, isSupabaseMode, openQuickAdd } = useWallet();
  const { isDark, toggleTheme } = useTheme();

  const getPageDetails = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Financial Overview',
          subtitle: 'Track your real-time cashflow, credits and debt obligations',
        };
      case 'transactions':
        return {
          title: 'Transaction History',
          subtitle: 'View, filter and audit all your income & expenses',
        };
      case 'credit-debt':
        return {
          title: 'Credit & Debt (Khata)',
          subtitle: 'Keep track of money lent to others and borrowings',
        };
      case 'analytics':
        return {
          title: 'Analytics & Trends',
          subtitle: 'Visual breakdowns of your cashflow and category spending',
        };
      case 'settings':
        return {
          title: 'Settings & Security',
          subtitle: 'Supabase credentials, currency, PIN and local backup',
        };
    }
  };

  const { title, subtitle } = getPageDetails();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {subtitle}
          </p>
        </div>

        {/* Right: Actions & Badges */}
        <div className="flex items-center gap-2.5">
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
            <span className="text-[11px]">
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

          {/* Quick Add Button (Desktop) */}
          <button
            onClick={() => openQuickAdd('expense')}
            className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-medium shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
