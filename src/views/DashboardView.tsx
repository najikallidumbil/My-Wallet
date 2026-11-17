import React from 'react';
import { BalanceCard } from '../components/dashboard/BalanceCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { CreditDebtSummary } from '../components/dashboard/CreditDebtSummary';
import { DueRemindersWidget } from '../components/dashboard/DueRemindersWidget';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { CategorySpendingBreakdown } from '../components/dashboard/CategorySpendingBreakdown';

export const DashboardView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. Hero Balance Card */}
      <BalanceCard />

      {/* 2. One-Tap Quick Actions */}
      <QuickActions />

      {/* 3. Paired Credit & Debt Cards */}
      <CreditDebtSummary />

      {/* 4. Due Date Alert Widget (shows only if overdue or upcoming) */}
      <DueRemindersWidget />

      {/* 5. Recent Transactions & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTransactions />
        </div>
        <div>
          <CategorySpendingBreakdown />
        </div>
      </div>
    </div>
  );
};
