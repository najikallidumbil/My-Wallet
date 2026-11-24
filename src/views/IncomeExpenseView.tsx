import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { formatRupees } from '../lib/currency';
import { formatDate, formatTime } from '../lib/date';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { PaymentBadge } from '../components/common/PaymentBadge';
import {
  Wallet,
  Plus,
  Search,
  Paperclip,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Target,
  Edit2,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const IncomeExpenseView: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    openingBalance,
    incomeExpenseSummary,
    budgetSummary,
    openQuickAdd,
    openRecordDetails,
    setSelectedCategoryId,
    setCategoryBudget,
    setOverallMonthlyBudget,
  } = useWallet();

  // Filters state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Income vs Expense Bar Chart Timeframe
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredDonutCat, setHoveredDonutCat] = useState<string | null>(null);

  // Budget Edit Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [overallBudgetInput, setOverallBudgetInput] = useState(
    budgetSummary.totalBudget ? String(budgetSummary.totalBudget) : ''
  );
  const [selectedCatForBudget, setSelectedCatForBudget] = useState(
    categories.find((c) => c.type === 'expense')?.id || ''
  );
  const [categoryBudgetInput, setCategoryBudgetInput] = useState('');

  // Strict Exclusion of Credit/Debt: Only 'income' and 'expense'
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentYear = today.getFullYear();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return transactions.filter((tx) => {
      if (tx.type !== 'income' && tx.type !== 'expense') return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
      if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(query);
        const matchesDesc = tx.description ? tx.description.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      const txDate = new Date(tx.transactionDate);
      txDate.setHours(0, 0, 0, 0);

      if (timeframe === 'today') {
        return txDate.getTime() === today.getTime();
      } else if (timeframe === 'week') {
        return txDate >= startOfWeek && txDate <= today;
      } else if (timeframe === 'month') {
        return tx.transactionDate.startsWith(currentMonth);
      } else if (timeframe === 'year') {
        return txDate.getFullYear() === currentYear;
      } else if (timeframe === 'custom') {
        if (customStart && tx.transactionDate < customStart) return false;
        if (customEnd && tx.transactionDate > customEnd) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, accountFilter, search, timeframe, customStart, customEnd]);

  // Dynamic calculations for the filtered timeframe
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of filteredTransactions) {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    }

    return {
      income,
      expense,
      netFlow: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // =========================================================================
  // 1. MONTHLY INCOME VS EXPENSE BAR CHART DATA
  // =========================================================================
  const barChartData = useMemo(() => {
    const today = new Date();

    if (chartTimeframe === 'daily') {
      const days: { key: string; label: string; income: number; expense: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
        days.push({ key: dateStr, label, income: 0, expense: 0 });
      }
      transactions.forEach((tx) => {
        const bucket = days.find((b) => b.key === tx.transactionDate);
        if (bucket) {
          if (tx.type === 'income') bucket.income += tx.amount;
          if (tx.type === 'expense') bucket.expense += tx.amount;
        }
      });
      return days;
    }

    if (chartTimeframe === 'weekly') {
      const weeks: { start: string; end: string; label: string; income: number; expense: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const start = new Date(today);
        start.setDate(today.getDate() - i * 7 - 6);
        const end = new Date(today);
        end.setDate(today.getDate() - i * 7);
        weeks.push({
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
          label: `W${4 - i}`,
          income: 0,
          expense: 0,
        });
      }
      transactions.forEach((tx) => {
        const bucket = weeks.find((w) => tx.transactionDate >= w.start && tx.transactionDate <= w.end);
        if (bucket) {
          if (tx.type === 'income') bucket.income += tx.amount;
          if (tx.type === 'expense') bucket.expense += tx.amount;
        }
      });
      return weeks;
    }

    if (chartTimeframe === 'monthly') {
      const months: { key: string; label: string; income: number; expense: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
          key: d.toISOString().slice(0, 7),
          label: d.toLocaleDateString('en-IN', { month: 'short' }),
          income: 0,
          expense: 0,
        });
      }
      transactions.forEach((tx) => {
        const mKey = tx.transactionDate.slice(0, 7);
        const bucket = months.find((m) => m.key === mKey);
        if (bucket) {
          if (tx.type === 'income') bucket.income += tx.amount;
          if (tx.type === 'expense') bucket.expense += tx.amount;
        }
      });
      return months;
    }

    // Yearly
    const curYear = today.getFullYear();
    const years = [
      { key: String(curYear - 2), label: String(curYear - 2), income: 0, expense: 0 },
      { key: String(curYear - 1), label: String(curYear - 1), income: 0, expense: 0 },
      { key: String(curYear), label: String(curYear), income: 0, expense: 0 },
    ];
    transactions.forEach((tx) => {
      const yKey = tx.transactionDate.slice(0, 4);
      const bucket = years.find((y) => y.key === yKey);
      if (bucket) {
        if (tx.type === 'income') bucket.income += tx.amount;
        if (tx.type === 'expense') bucket.expense += tx.amount;
      }
    });
    return years;
  }, [transactions, chartTimeframe]);

  const barMaxVal = useMemo(() => {
    let max = 1000;
    barChartData.forEach((item) => {
      if (item.income > max) max = item.income;
      if (item.expense > max) max = item.expense;
    });
    return max;
  }, [barChartData]);

  // =========================================================================
  // 2. CASH BALANCE TREND LINE GRAPH
  // =========================================================================
  const cashTrendPoints = useMemo(() => {
    const sorted = [...transactions]
      .filter((tx) => tx.type === 'income' || tx.type === 'expense')
      .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

    let runBal = openingBalance;
    const pts = [{ date: sorted[0]?.transactionDate || 'Start', balance: runBal }];

    sorted.forEach((tx) => {
      runBal += tx.type === 'income' ? tx.amount : -tx.amount;
      pts.push({ date: tx.transactionDate, balance: runBal });
    });

    const minBal = Math.min(...pts.map((p) => p.balance), 0);
    const maxBal = Math.max(...pts.map((p) => p.balance), 1000);
    const range = maxBal - minBal || 1;

    const coords = pts.map((p, idx) => {
      const x = pts.length === 1 ? 250 : 20 + (idx / (pts.length - 1)) * 460;
      const y = 90 - ((p.balance - minBal) / range) * 70;
      return { x, y, ...p };
    });

    const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const area = `${coords[0].x.toFixed(1)},100 ${polyline} ${coords[coords.length - 1].x.toFixed(1)},100`;

    return { coords, polyline, area, current: runBal, minBal, maxBal };
  }, [transactions, openingBalance]);

  // =========================================================================
  // 3. EXPENSE CATEGORY DONUT CHART DATA
  // =========================================================================
  const donutData = useMemo(() => {
    const expenseTx = filteredTransactions.filter((tx) => tx.type === 'expense');
    const totalExp = expenseTx.reduce((sum, tx) => sum + tx.amount, 0);

    const map = new Map<string, { id: string; name: string; color: string; icon: string; amount: number }>();
    expenseTx.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const catId = tx.categoryId || 'other';
      const existing = map.get(catId);
      if (existing) {
        existing.amount += tx.amount;
      } else {
        map.set(catId, {
          id: catId,
          name: cat?.name || 'Uncategorized',
          color: cat?.color || '#94a3b8',
          icon: cat?.icon || 'Tag',
          amount: tx.amount,
        });
      }
    });

    const items = Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: totalExp > 0 ? (item.amount / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const circumference = 2 * Math.PI * 60;
    let accOffset = 0;

    const segments = items.map((item) => {
      const strokeLen = (item.percentage / 100) * circumference;
      const strokeDasharray = `${strokeLen} ${circumference - strokeLen}`;
      const strokeDashoffset = -accOffset;
      accOffset += strokeLen;
      return { ...item, strokeDasharray, strokeDashoffset };
    });

    return { totalExp, circumference, segments };
  }, [filteredTransactions, categories]);

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);
  const getAccount = (accId?: string) => accounts.find((a) => a.id === accId);

  const handleSaveBudgetForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (overallBudgetInput) {
      setOverallMonthlyBudget(parseFloat(overallBudgetInput) || 0);
    }
    if (selectedCatForBudget && categoryBudgetInput) {
      setCategoryBudget(selectedCatForBudget, parseFloat(categoryBudgetInput) || 0);
    }
    setCategoryBudgetInput('');
    setIsBudgetModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
              Mode 1
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Income & Expense Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personal cashflow tracking, intelligent monthly budgeting, and category analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <span>Manage Budget</span>
          </button>

          <button
            onClick={() => openQuickAdd('income')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Income</span>
          </button>

          <button
            onClick={() => openQuickAdd('expense')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* 2. 5 Hero KPI Cards: Total Income, Total Expense, Available Balance, Total Budget, Remaining Budget */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Available Cash Balance */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-700 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-indigo-100 mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider">Available Cash</span>
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight block">
              {formatRupees(incomeExpenseSummary.availableCashBalance)}
            </span>
            <span className="text-[10px] text-indigo-200 mt-1 block">
              Liquid Spendable Cash
            </span>
          </div>
        </div>

        {/* Total Income */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Total Income</span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
              {formatRupees(incomeExpenseSummary.totalIncome)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Cash Inflow</span>
          </div>
        </div>

        {/* Total Expense */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-rose-600 dark:text-rose-400">Total Expense</span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 block">
              {formatRupees(incomeExpenseSummary.totalExpense)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Cash Outflow</span>
          </div>
        </div>

        {/* Total Budget */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Total Budget</span>
            <Target className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white block">
              {budgetSummary.totalBudget > 0 ? formatRupees(budgetSummary.totalBudget) : 'Not Set'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Monthly Target</span>
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Remaining Budget</span>
            {budgetSummary.warningCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
          </div>
          <div>
            <span
              className={cn(
                'text-xl md:text-2xl font-black block',
                budgetSummary.remainingBudget < 0
                  ? 'text-rose-600'
                  : 'text-slate-900 dark:text-white'
              )}
            >
              {budgetSummary.totalBudget > 0 ? formatRupees(budgetSummary.remainingBudget) : 'Unlimited'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {budgetSummary.percentage.toFixed(0)}% utilized
            </span>
          </div>
        </div>
      </div>

      {/* 3. Budget Management Tracking Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Budget Tracking & Threshold Warnings
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live spending progress against targets with 80%, 90%, and 100% threshold alerts
            </p>
          </div>

          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <Edit2 className="w-3 h-3" />
            <span>Set / Edit Budgets</span>
          </button>
        </div>

        {/* Overall Budget Progress Bar */}
        {budgetSummary.totalBudget > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">
                Overall Monthly Limit: {formatRupees(budgetSummary.totalBudget)}
              </span>
              <span
                className={cn(
                  'font-bold',
                  budgetSummary.percentage >= 100
                    ? 'text-rose-600'
                    : budgetSummary.percentage >= 80
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                )}
              >
                {formatRupees(budgetSummary.totalSpent)} spent ({budgetSummary.percentage.toFixed(1)}%)
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  budgetSummary.percentage >= 100
                    ? 'bg-rose-500'
                    : budgetSummary.percentage >= 90
                    ? 'bg-orange-500'
                    : budgetSummary.percentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(100, budgetSummary.percentage)}%` }}
              />
            </div>
          </div>
        )}

        {/* Category Budget Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {budgetSummary.categoryProgresses.length === 0 ? (
            <p className="text-xs text-slate-400 col-span-3 text-center py-4">
              No category budgets set. Click "Manage Budget" to establish monthly limits.
            </p>
          ) : (
            budgetSummary.categoryProgresses.map((item) => (
              <div
                key={item.categoryId}
                onClick={() => setSelectedCategoryId(item.categoryId)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer shadow-xs transition-all space-y-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: item.categoryColor }}
                    >
                      <CategoryIcon name={item.categoryIcon} className="w-4 h-4" color="#ffffff" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                        {item.categoryName}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Budget: {formatRupees(item.budget)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0',
                      item.status === 'exceeded'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : item.status === 'urgent'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                        : item.status === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    )}
                  >
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      item.status === 'exceeded'
                        ? 'bg-rose-500'
                        : item.status === 'urgent'
                        ? 'bg-orange-500'
                        : item.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Spent: <strong className="text-slate-800 dark:text-slate-200">{formatRupees(item.spent)}</strong></span>
                  <span>Rem: <strong className="text-slate-800 dark:text-slate-200">{formatRupees(item.remaining)}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Visual Charts: Income vs Expense Monthly Bar Chart + Cash Balance Trend + Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Income vs Expense Comparison
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Periodic inflow and outflow comparison
                </p>
              </div>

              {/* Timeframe Filter Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs self-start sm:self-auto">
                {(
                  [
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'yearly', label: 'Yearly' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setChartTimeframe(t.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-semibold transition-all',
                      chartTimeframe === t.id
                        ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bars */}
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              {barChartData.map((item, idx) => {
                const incHeight = Math.max(4, (item.income / barMaxVal) * 140);
                const expHeight = Math.max(4, (item.expense / barMaxVal) * 140);
                const isHovered = hoveredBarIndex === idx;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {isHovered && (
                      <div className="absolute -top-14 z-20 bg-slate-900 text-white rounded-xl px-2.5 py-1.5 text-[10px] shadow-xl whitespace-nowrap pointer-events-none animate-fade-in">
                        <p className="font-bold">{item.label}</p>
                        <p className="text-emerald-400">+{formatRupees(item.income)}</p>
                        <p className="text-rose-400">-{formatRupees(item.expense)}</p>
                      </div>
                    )}

                    <div className="w-full flex items-end justify-center gap-1 max-w-[36px] h-36">
                      <div
                        className="w-1/2 bg-emerald-500 hover:bg-emerald-400 rounded-t-md transition-all duration-300"
                        style={{ height: `${incHeight}px` }}
                      />
                      <div
                        className="w-1/2 bg-rose-500 hover:bg-rose-400 rounded-t-md transition-all duration-300"
                        style={{ height: `${expHeight}px` }}
                      />
                    </div>

                    <span className="text-[10px] font-semibold text-slate-400 mt-2 truncate w-full text-center">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Income
              </span>
              <span className="flex items-center gap-1 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                Expense
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">Strictly excludes credit & debt</span>
          </div>
        </div>

        {/* Expense Category Donut Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Category Analytics
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {donutData.segments.length} Categories
              </span>
            </div>

            {/* Donut Visual */}
            <div className="flex items-center justify-center my-3 relative">
              {donutData.totalExp === 0 ? (
                <div className="w-40 h-40 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                  No expenses
                </div>
              ) : (
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="transparent"
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="16"
                    />
                    {donutData.segments.map((seg) => (
                      <circle
                        key={seg.id}
                        cx="80"
                        cy="80"
                        r="60"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={hoveredDonutCat === seg.id ? 20 : 16}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredDonutCat(seg.id)}
                        onMouseLeave={() => setHoveredDonutCat(null)}
                        onClick={() => setSelectedCategoryId(seg.id)}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Total Spent</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[100px]">
                      {formatRupees(donutData.totalExp)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Progress Bars Below Chart */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
            {donutData.segments.slice(0, 5).map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className="space-y-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded-xl transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {cat.name}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                    {formatRupees(cat.amount)} ({cat.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Cash Balance Trend Line Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cash Balance Trend
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Current: {formatRupees(cashTrendPoints.current)}
          </span>
        </div>

        <div className="w-full h-32 bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 relative overflow-hidden flex items-end">
          <svg className="w-full h-full" viewBox="0 0 500 110" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {cashTrendPoints.coords.length > 1 && (
              <polygon points={cashTrendPoints.area} fill="url(#trend-grad)" />
            )}
            {cashTrendPoints.coords.length > 1 ? (
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={cashTrendPoints.polyline}
              />
            ) : (
              <line x1="20" y1="55" x2="480" y2="55" stroke="#6366f1" strokeWidth="2.5" />
            )}
          </svg>
        </div>
      </div>

      {/* 6. Filter Toolbar: Search, Type, Category, Account & Timeframe */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Timeframe Quick Filters */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0',
                  timeframe === t.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-medium shrink-0">
            {filteredSummary.count} transactions ({formatRupees(filteredSummary.netFlow, { showSign: true })})
          </span>
        </div>

        {/* Custom Date Range Selectors */}
        {timeframe === 'custom' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        )}

        {/* Search & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search income & expense by title or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Types (Income & Expense)</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 7. Recent Transactions List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Recent Cashflow Transactions ({filteredTransactions.length})
          </h3>
          <span className="text-xs text-slate-400">Click to view details & receipts</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            {transactions.length === 0
              ? 'No transactions recorded yet. Tap "Add Income" or "Add Expense" to get started.'
              : 'No transactions matched your active filters.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const cat = getCategory(tx.categoryId);
              const acc = getAccount(tx.accountId);

              return (
                <div
                  key={tx.id}
                  onClick={() => openRecordDetails(tx, 'transaction')}
                  className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs',
                        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      )}
                    >
                      <CategoryIcon
                        name={cat?.icon || (isIncome ? 'TrendingUp' : 'ShoppingBag')}
                        className="w-5 h-5"
                        color={cat?.color}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </span>
                        {tx.attachments && tx.attachments.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-full">
                            <Paperclip className="w-2.5 h-2.5" />
                            <span>{tx.attachments.length}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        <span>{formatDate(tx.transactionDate)}</span>
                        <span>·</span>
                        <span>{formatTime(tx.transactionTime)}</span>
                        {cat && (
                          <>
                            <span>·</span>
                            <span className="text-slate-500 dark:text-slate-300 font-medium">
                              {cat.name}
                            </span>
                          </>
                        )}
                        {acc && (
                          <>
                            <span>·</span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {acc.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <PaymentBadge method={tx.paymentMethod} />
                    <span
                      className={cn(
                        'text-sm font-black',
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {isIncome ? '+' : '-'}
                      {formatRupees(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Modal: Manage Monthly Budgets */}
      {isBudgetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsBudgetModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Budget Management
                </h3>
              </div>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudgetForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Overall Monthly Budget (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="e.g. 60000"
                  value={overallBudgetInput}
                  onChange={(e) => setOverallBudgetInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Total cap across all categories for the current month
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Limit
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select
                    value={selectedCatForBudget}
                    onChange={(e) => setSelectedCatForBudget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    {categories
                      .filter((c) => c.type === 'expense')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Limit (₹)"
                    value={categoryBudgetInput}
                    onChange={(e) => setCategoryBudgetInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Assign a monthly spending limit for this specific category
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
                >
                  Save Budgets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
