import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { CategoryIcon } from '../common/CategoryIcon';
import { PieChart } from 'lucide-react';

export const CategorySpendingBreakdown: React.FC = () => {
  const { categorySpending, financialSummary } = useWallet();

  const topCategories = categorySpending.slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Top Spending Categories
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Expenses: {formatRupees(financialSummary.monthlyExpense)}
            </p>
          </div>
        </div>
      </div>

      {topCategories.length === 0 ? (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
          No expense categories recorded yet.
        </div>
      ) : (
        <div className="space-y-3.5">
          {topCategories.map((cat) => (
            <div key={cat.categoryId} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CategoryIcon
                    name={cat.categoryIcon}
                    className="w-3.5 h-3.5 shrink-0"
                    color={cat.categoryColor}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {cat.categoryName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({cat.transactionCount} {cat.transactionCount === 1 ? 'tx' : 'txs'})
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatRupees(cat.totalAmount)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 w-8 text-right">
                    {cat.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress meter */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.categoryColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
