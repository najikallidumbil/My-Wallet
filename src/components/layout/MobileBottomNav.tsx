import React from 'react';
import { LayoutDashboard, ReceiptText, Users, BarChart3, Plus, Settings } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { ActiveTab } from '../../types';
import { cn } from '../../lib/utils';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openQuickAdd, financialSummary } = useWallet();

  const totalOverdue = financialSummary.overdueCreditCount + financialSummary.overdueDebtCount;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'transactions',
      label: 'History',
      icon: <ReceiptText className="w-5 h-5" />,
    },
    {
      id: 'credit-debt',
      label: 'Khata',
      icon: <Users className="w-5 h-5" />,
      badge: totalOverdue > 0 ? totalOverdue : undefined,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 safe-bottom">
      <div className="flex items-center justify-around px-2 py-1.5 relative">
        {/* Left items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              {item.icon}
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
            aria-label="Add transaction or khata"
            className="w-13 h-13 p-3.5 bg-gradient-to-tr from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">Add</span>
        </div>

        {/* Right items */}
        {navItems.slice(2, 4).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
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

        {/* Settings button on mobile */}
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative',
            activeTab === 'settings'
              ? 'text-brand-600 dark:text-brand-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Settings</span>
          {activeTab === 'settings' && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400 absolute -bottom-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};
