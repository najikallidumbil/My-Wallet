import React, { useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  PieChart,
  Plus,
  MoreHorizontal,
  WalletCards,
  Tags,
  Repeat,
  FileSpreadsheet,
  Settings,
  X,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { ActiveTab, AppMode } from '../../types';
import { cn } from '../../lib/utils';

export const MobileBottomNav: React.FC = () => {
  const { currentMode, setCurrentMode, activeTab, setActiveTab, openQuickAdd, financialSummary } = useWallet();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const totalOverdue = financialSummary.overdueCreditCount + financialSummary.overdueDebtCount;

  const modeNavs: { id: AppMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'income_expense',
      label: 'Cashflow',
      icon: <ArrowLeftRight className="w-5 h-5" />,
    },
    {
      id: 'khata_book',
      label: 'Khata',
      icon: <BookOpen className="w-5 h-5" />,
      badge: totalOverdue > 0 ? totalOverdue : undefined,
    },
    {
      id: 'financial_overview',
      label: 'Overview',
      icon: <PieChart className="w-5 h-5" />,
    },
  ];

  const moreItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'accounts', label: 'Accounts & Transfers', icon: <WalletCards className="w-4 h-4" /> },
    { id: 'categories', label: 'Smart Categories', icon: <Tags className="w-4 h-4" /> },
    { id: 'recurring', label: 'Recurring Rules', icon: <Repeat className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Export', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* More Tools Drawer for Mobile */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in md:hidden"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Additional Tools & Settings
              </span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMoreMenuOpen(false);
                  }}
                  className={cn(
                    'p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all',
                    activeTab === item.id
                      ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <span className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs">
                    {item.icon}
                  </span>
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1.5 relative">
          {/* First 2 Modes */}
          {modeNavs.slice(0, 2).map((item) => {
            const isActive = currentMode === item.id && activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentMode(item.id);
                  setIsMoreMenuOpen(false);
                }}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <div className="relative">
                  {item.icon}
                  {Boolean(item.badge) && (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-0.5">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400 absolute -bottom-0.5" />
                )}
              </button>
            );
          })}

          {/* Center Floating Quick Add Action */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              onClick={() => openQuickAdd('expense')}
              aria-label="Add transaction"
              className="w-13 h-13 p-3.5 bg-gradient-to-tr from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">Add</span>
          </div>

          {/* 3rd Mode: Financial Overview */}
          <button
            onClick={() => {
              setCurrentMode('financial_overview');
              setIsMoreMenuOpen(false);
            }}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
              currentMode === 'financial_overview' && activeTab === 'financial_overview'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <PieChart className="w-5 h-5" />
            <span className="text-[11px] mt-0.5">Overview</span>
            {currentMode === 'financial_overview' && activeTab === 'financial_overview' && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400 absolute -bottom-0.5" />
            )}
          </button>

          {/* More Menu Trigger */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 relative"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[11px] mt-0.5">More</span>
          </button>
        </div>
      </div>
    </>
  );
};
