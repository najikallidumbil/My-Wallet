import React, { useState, useMemo } from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { formatDate, formatTime } from '../../lib/date';
import { CategoryIcon } from '../common/CategoryIcon';
import { PaymentBadge } from '../common/PaymentBadge';
import {
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Edit2,
  Trash2,
  Tag,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface CategoryDetailsModalProps {
  categoryId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryDetailsModal: React.FC<CategoryDetailsModalProps> = ({
  categoryId,
  isOpen,
  onClose,
}) => {
  const {
    categories,
    transactions,
    budgets,
    setCategoryBudget,
    addSubcategory,
    deleteSubcategory,
    openQuickAdd,
    openRecordDetails,
  } = useWallet();

  // Period / Date Range filter
  const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'this_year' | 'all'>('this_month');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [subcatName, setSubcatName] = useState('');
  const [subcatBudget, setSubcatBudget] = useState('');

  const category = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || null;
  }, [categories, categoryId]);

  // Current Month String (YYYY-MM)
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const activeBudgetLimit = useMemo(() => {
    if (!category) return 0;
    const b = budgets.find((item) => item.month === currentMonth);
    return b?.categoryBudgets?.[category.id] ?? (category.budget || 0);
  }, [category, budgets, currentMonth]);

  // Filter transactions for this category based on date range
  const categoryTransactions = useMemo(() => {
    if (!category) return [];

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.toISOString().slice(0, 7);

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.toISOString().slice(0, 7);

    return transactions.filter((tx) => {
      if (tx.categoryId !== category.id) return false;

      if (dateRange === 'this_month') {
        return tx.transactionDate.startsWith(curMonth);
      }
      if (dateRange === 'last_month') {
        return tx.transactionDate.startsWith(prevMonth);
      }
      if (dateRange === 'this_year') {
        return tx.transactionDate.startsWith(String(curYear));
      }
      return true;
    });
  }, [category, transactions, dateRange]);

  // Total spent in selected date range
  const totalSpent = useMemo(() => {
    return categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [categoryTransactions]);

  // Remaining budget & percentage
  const remainingBudget = useMemo(() => {
    return Math.max(0, activeBudgetLimit - totalSpent);
  }, [activeBudgetLimit, totalSpent]);

  const spentPercentage = useMemo(() => {
    return activeBudgetLimit > 0 ? (totalSpent / activeBudgetLimit) * 100 : 0;
  }, [activeBudgetLimit, totalSpent]);

  // Daily average spending calculation
  const dailyAverage = useMemo(() => {
    if (categoryTransactions.length === 0) return 0;
    const now = new Date();
    let daysCount = now.getDate(); // default to elapsed days this month
    if (dateRange === 'last_month') {
      const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      daysCount = lastMonthDays;
    } else if (dateRange === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
      daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else if (dateRange === 'all') {
      daysCount = 90;
    }
    return Math.round(totalSpent / Math.max(1, daysCount));
  }, [totalSpent, categoryTransactions.length, dateRange]);

  // Spending trend graph data (daily aggregation)
  const spendingTrend = useMemo(() => {
    const dailyMap = new Map<string, number>();

    categoryTransactions.forEach((tx) => {
      dailyMap.set(tx.transactionDate, (dailyMap.get(tx.transactionDate) || 0) + tx.amount);
    });

    const sortedDates = Array.from(dailyMap.keys()).sort();
    if (sortedDates.length === 0) return [];

    let cum = 0;
    return sortedDates.map((date) => {
      cum += dailyMap.get(date) || 0;
      return {
        date,
        dayAmount: dailyMap.get(date) || 0,
        cumulative: cum,
      };
    });
  }, [categoryTransactions]);

  // Status threshold
  const budgetStatus = useMemo(() => {
    if (activeBudgetLimit <= 0) return 'no_budget';
    if (spentPercentage >= 100) return 'exceeded';
    if (spentPercentage >= 90) return 'urgent';
    if (spentPercentage >= 80) return 'warning';
    return 'normal';
  }, [activeBudgetLimit, spentPercentage]);

  if (!isOpen || !category) return null;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      setCategoryBudget(category.id, val, currentMonth);
    }
    setIsEditingBudget(false);
  };

  const handleAddSubcat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcatName.trim()) return;
    const b = parseFloat(subcatBudget) || undefined;
    addSubcategory(category.id, subcatName.trim(), b);
    setSubcatName('');
    setSubcatBudget('');
    setIsAddingSubcat(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header with Category Icon, Name, and Close Button */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: category.color }}
            >
              <CategoryIcon name={category.icon} className="w-6 h-6" color="#ffffff" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {category.name}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {category.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed category budget analytics and transaction ledger
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Date Range Filter Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            {(
              [
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setDateRange(t.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all',
                  dateRange === t.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              openQuickAdd(category.type === 'income' ? 'income' : 'expense');
              onClose();
            }}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add in Category</span>
          </button>
        </div>

        {/* 3. Hero Budget Status Card */}
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Spent / Budget Limit
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {formatRupees(totalSpent)}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / {activeBudgetLimit > 0 ? formatRupees(activeBudgetLimit) : 'No Limit'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              {budgetStatus === 'exceeded' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Budget Exceeded
                </span>
              )}
              {budgetStatus === 'urgent' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  90% Limit Reached
                </span>
              )}
              {budgetStatus === 'warning' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  80% Warning
                </span>
              )}
              {budgetStatus === 'normal' && activeBudgetLimit > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Within Budget
                </span>
              )}

              <button
                onClick={() => {
                  setBudgetInput(activeBudgetLimit ? String(activeBudgetLimit) : '');
                  setIsEditingBudget(!isEditingBudget);
                }}
                className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1 mt-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>{activeBudgetLimit > 0 ? 'Change Budget' : 'Set Budget'}</span>
              </button>
            </div>
          </div>

          {/* Edit Budget Input Drawer */}
          {isEditingBudget && (
            <form onSubmit={handleSaveBudget} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Monthly Budget for {category.name} (₹)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  placeholder="e.g. 10000"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shrink-0"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {/* Progress Bar */}
          {activeBudgetLimit > 0 && (
            <div className="space-y-1.5">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    budgetStatus === 'exceeded'
                      ? 'bg-rose-500'
                      : budgetStatus === 'urgent'
                      ? 'bg-orange-500'
                      : budgetStatus === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(100, spentPercentage)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{spentPercentage.toFixed(1)}% spent</span>
                <span>
                  Remaining: <strong className="text-slate-900 dark:text-white">{formatRupees(remainingBudget)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar: Daily Average Spending & Transactions Count */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Daily Average Spending
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatRupees(dailyAverage)} / day
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Transactions Count
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {categoryTransactions.length} logs
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Remaining Amount
              </span>
              <span
                className={cn(
                  'text-sm font-bold',
                  activeBudgetLimit > 0 && remainingBudget <= 0
                    ? 'text-rose-600'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {activeBudgetLimit > 0 ? formatRupees(remainingBudget) : 'Unlimited'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Spending Trend Line Graph */}
        {spendingTrend.length > 0 && (
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-brand-600" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Spending Progression Trend
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">Cumulative Outflow</span>
            </div>

            <div className="w-full h-32 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-2 relative overflow-hidden flex items-end">
              <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cat-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={category.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={category.color} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Polyline Coordinates */}
                {(() => {
                  const maxVal = Math.max(...spendingTrend.map((p) => p.cumulative), 1);
                  const pts = spendingTrend.map((p, idx) => {
                    const x = (idx / Math.max(1, spendingTrend.length - 1)) * 460 + 20;
                    const y = 100 - (p.cumulative / maxVal) * 80;
                    return { x, y, ...p };
                  });
                  const polyline = pts.map((pt) => `${pt.x},${pt.y}`).join(' ');
                  const area = `20,110 ${polyline} ${pts[pts.length - 1].x},110`;

                  return (
                    <>
                      <polygon points={area} fill="url(#cat-grad)" />
                      <polyline
                        fill="none"
                        stroke={category.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        points={polyline}
                      />
                      {pts.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r="3"
                          fill={category.color}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* 5. Subcategories Section */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Subcategories ({category.subcategories?.length || 0})
              </h4>
            </div>

            <button
              onClick={() => setIsAddingSubcat(!isAddingSubcat)}
              className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subcategory</span>
            </button>
          </div>

          {/* Add Subcategory Form */}
          {isAddingSubcat && (
            <form onSubmit={handleAddSubcat} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Subcategory Name"
                  value={subcatName}
                  onChange={(e) => setSubcatName(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
                <input
                  type="number"
                  placeholder="Budget (Optional)"
                  value={subcatBudget}
                  onChange={(e) => setSubcatBudget(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSubcat(false)}
                  className="px-3 py-1 text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-brand-600 text-white rounded-lg text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {category.subcategories && category.subcategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {category.subcategories.map((sub) => (
                <div
                  key={sub.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {sub.name}
                    </span>
                    {sub.budget && (
                      <span className="text-[10px] text-slate-400">
                        Budget: {formatRupees(sub.budget)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSubcategory(category.id, sub.id)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No subcategories defined.</p>
          )}
        </div>

        {/* 6. Filtered Category Transaction History */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Category Transaction History ({categoryTransactions.length})
            </h4>
            <span className="text-xs text-slate-400">{formatRupees(totalSpent)}</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {categoryTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                No transactions recorded for this category in selected date range.
              </div>
            ) : (
              categoryTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => openRecordDetails(tx, 'transaction')}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                      {tx.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{formatDate(tx.transactionDate)}</span>
                      <span>·</span>
                      <span>{formatTime(tx.transactionTime)}</span>
                      {tx.subcategoryName && (
                        <>
                          <span>·</span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {tx.subcategoryName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <PaymentBadge method={tx.paymentMethod} />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatRupees(tx.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
