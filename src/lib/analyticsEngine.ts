/**
 * Analytics Engine & Date Filtering for MY WALLET
 * Provides high-precision financial analytics, grouping, MoM calculations, and category breakdowns.
 */

import { Transaction, Category } from '../types';

export type AnalyticsDateFilterType =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

export interface DateRangeResult {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

export interface ComparisonRangeResult {
  prevStartDate: string;
  prevEndDate: string;
  prevLabel: string;
}

/**
 * Resolves start and end ISO dates for standard analytics filter presets.
 */
export function getAnalyticsDateRange(
  filter: AnalyticsDateFilterType,
  customStart?: string,
  customEnd?: string
): DateRangeResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (filter) {
    case 'today': {
      const todayStr = toYMD(now);
      return { startDate: todayStr, endDate: todayStr, label: 'Today' };
    }

    case 'this_week': {
      // Week starting Monday
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        startDate: toYMD(mon),
        endDate: toYMD(sun),
        label: 'This Week',
      };
    }

    case 'this_month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: 'This Month',
      };
    }

    case 'last_month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: 'Last Month',
      };
    }

    case 'last_3_months': {
      const start = new Date(year, month - 2, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: 'Last 3 Months',
      };
    }

    case 'last_6_months': {
      const start = new Date(year, month - 5, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: 'Last 6 Months',
      };
    }

    case 'this_year': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return {
        startDate: toYMD(start),
        endDate: toYMD(end),
        label: `${year}`,
      };
    }

    case 'custom': {
      const s = customStart || toYMD(new Date(year, month, 1));
      const e = customEnd || toYMD(now);
      return {
        startDate: s <= e ? s : e,
        endDate: s <= e ? e : s,
        label: 'Custom Range',
      };
    }
  }
}

/**
 * Computes previous matching period for Month-over-Month (MoM) or Period-over-Period comparisons.
 */
export function getComparisonDateRange(
  filter: AnalyticsDateFilterType,
  startDate: string,
  endDate: string
): ComparisonRangeResult {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (filter === 'today') {
    const yest = new Date(s);
    yest.setDate(s.getDate() - 1);
    const yStr = toYMD(yest);
    return { prevStartDate: yStr, prevEndDate: yStr, prevLabel: 'vs Yesterday' };
  }

  if (filter === 'this_week') {
    const prevMon = new Date(s);
    prevMon.setDate(s.getDate() - 7);
    const prevSun = new Date(e);
    prevSun.setDate(e.getDate() - 7);
    return {
      prevStartDate: toYMD(prevMon),
      prevEndDate: toYMD(prevSun),
      prevLabel: 'vs Last Week',
    };
  }

  if (filter === 'this_month') {
    const year = s.getFullYear();
    const month = s.getMonth();
    const prevStart = new Date(year, month - 1, 1);
    const prevEnd = new Date(year, month, 0);
    return {
      prevStartDate: toYMD(prevStart),
      prevEndDate: toYMD(prevEnd),
      prevLabel: 'vs Last Month',
    };
  }

  if (filter === 'last_month') {
    const year = s.getFullYear();
    const month = s.getMonth();
    const prevStart = new Date(year, month - 1, 1);
    const prevEnd = new Date(year, month, 0);
    return {
      prevStartDate: toYMD(prevStart),
      prevEndDate: toYMD(prevEnd),
      prevLabel: 'vs 2 Months Ago',
    };
  }

  if (filter === 'this_year') {
    const year = s.getFullYear() - 1;
    return {
      prevStartDate: `${year}-01-01`,
      prevEndDate: `${year}-12-31`,
      prevLabel: 'vs Last Year',
    };
  }

  // Duration-based fallback for 3M, 6M, and Custom
  const durationMs = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    prevStartDate: toYMD(prevStart),
    prevEndDate: toYMD(prevEnd),
    prevLabel: 'vs Previous Period',
  };
}

export interface DashboardKPIs {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number; // percentage 0-100%
  incomeCount: number;
  expenseCount: number;
  // Comparison vs previous period
  prevIncome: number;
  prevExpenses: number;
  prevSavings: number;
  incomeChangePct: number;
  expenseChangePct: number;
  savingsChangePct: number;
  comparisonLabel: string;
}

/**
 * Filter transactions within an inclusive date range [startDate, endDate].
 */
export function filterTransactionsByDate(
  transactions: Transaction[],
  startDate: string,
  endDate: string
): Transaction[] {
  return transactions.filter((t) => {
    const d = t.transactionDate;
    return d >= startDate && d <= endDate;
  });
}

/**
 * Calculates core financial dashboard KPIs with period-over-period percentage changes.
 */
export function calculateDashboardKPIs(
  allTransactions: Transaction[],
  currentDateRange: DateRangeResult,
  prevDateRange: ComparisonRangeResult,
  currentBalance: number
): DashboardKPIs {
  const currentTxs = filterTransactionsByDate(
    allTransactions,
    currentDateRange.startDate,
    currentDateRange.endDate
  );

  const prevTxs = filterTransactionsByDate(
    allTransactions,
    prevDateRange.prevStartDate,
    prevDateRange.prevEndDate
  );

  // Current Period
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const t of currentTxs) {
    if (t.type === 'income') {
      totalIncome += t.amount;
      incomeCount++;
    } else if (t.type === 'expense') {
      totalExpenses += t.amount;
      expenseCount++;
    }
  }

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / totalIncome) * 100))) : 0;

  // Previous Period
  let prevIncome = 0;
  let prevExpenses = 0;

  for (const t of prevTxs) {
    if (t.type === 'income') {
      prevIncome += t.amount;
    } else if (t.type === 'expense') {
      prevExpenses += t.amount;
    }
  }

  const prevSavings = prevIncome - prevExpenses;

  // Percentage Changes
  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
  };

  const incomeChangePct = calcPct(totalIncome, prevIncome);
  const expenseChangePct = calcPct(totalExpenses, prevExpenses);
  const savingsChangePct = prevSavings !== 0
    ? Math.round(((netSavings - prevSavings) / Math.abs(prevSavings)) * 100 * 10) / 10
    : netSavings > 0 ? 100 : 0;

  return {
    totalBalance: currentBalance,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    incomeCount,
    expenseCount,
    prevIncome,
    prevExpenses,
    prevSavings,
    incomeChangePct,
    expenseChangePct,
    savingsChangePct,
    comparisonLabel: prevDateRange.prevLabel,
  };
}

export type ChartGrouping = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CurveDataPoint {
  label: string;
  fullDate: string;
  income: number;
  expense: number;
  net: number;
}

/**
 * Automatically chooses optimal grouping for a given date range.
 */
export function getAutoGrouping(startDate: string, endDate: string): ChartGrouping {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays <= 7) return 'daily';
  if (diffDays <= 45) return 'daily';
  if (diffDays <= 120) return 'weekly';
  if (diffDays <= 730) return 'monthly';
  return 'yearly';
}

/**
 * Groups transactions into time buckets for the smooth Income vs Expense curved chart.
 */
export function calculateCurveData(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
  grouping: ChartGrouping
): CurveDataPoint[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const inRangeTxs = filterTransactionsByDate(transactions, startDate, endDate);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (grouping === 'daily') {
    const points: CurveDataPoint[] = [];
    const curr = new Date(start);

    // Limit daily points to 31 max to keep chart readable and performant
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const step = totalDays > 31 ? Math.ceil(totalDays / 31) : 1;

    while (curr <= end) {
      const curStr = toYMD(curr);
      const dayLabel = curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      // Gather day txs
      const dayTxs = inRangeTxs.filter((t) => t.transactionDate === curStr);
      let inc = 0;
      let exp = 0;
      for (const t of dayTxs) {
        if (t.type === 'income') inc += t.amount;
        else if (t.type === 'expense') exp += t.amount;
      }

      points.push({
        label: dayLabel,
        fullDate: curStr,
        income: inc,
        expense: exp,
        net: inc - exp,
      });

      curr.setDate(curr.getDate() + step);
    }
    return points.length > 0 ? points : [{ label: 'Today', fullDate: startDate, income: 0, expense: 0, net: 0 }];
  }

  if (grouping === 'weekly') {
    const points: CurveDataPoint[] = [];
    const curr = new Date(start);
    let weekIndex = 1;

    while (curr <= end) {
      const weekStartStr = toYMD(curr);
      const weekEndDate = new Date(curr);
      weekEndDate.setDate(curr.getDate() + 6);
      if (weekEndDate > end) weekEndDate.setTime(end.getTime());
      const weekEndStr = toYMD(weekEndDate);

      const weekLabel = `W${weekIndex} (${curr.getDate()}/${curr.getMonth() + 1})`;

      const wTxs = inRangeTxs.filter((t) => t.transactionDate >= weekStartStr && t.transactionDate <= weekEndStr);
      let inc = 0;
      let exp = 0;
      for (const t of wTxs) {
        if (t.type === 'income') inc += t.amount;
        else if (t.type === 'expense') exp += t.amount;
      }

      points.push({
        label: weekLabel,
        fullDate: `${weekStartStr} to ${weekEndStr}`,
        income: inc,
        expense: exp,
        net: inc - exp,
      });

      weekIndex++;
      curr.setDate(curr.getDate() + 7);
    }
    return points;
  }

  if (grouping === 'monthly') {
    const points: CurveDataPoint[] = [];
    const curr = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (curr <= lastMonth) {
      const yr = curr.getFullYear();
      const mo = curr.getMonth();
      const monthPrefix = `${yr}-${pad(mo + 1)}`;
      const monthLabel = curr.toLocaleDateString('en-IN', { month: 'short' });

      const mTxs = inRangeTxs.filter((t) => t.transactionDate.startsWith(monthPrefix));
      let inc = 0;
      let exp = 0;
      for (const t of mTxs) {
        if (t.type === 'income') inc += t.amount;
        else if (t.type === 'expense') exp += t.amount;
      }

      points.push({
        label: monthLabel,
        fullDate: curr.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        income: inc,
        expense: exp,
        net: inc - exp,
      });

      curr.setMonth(curr.getMonth() + 1);
    }
    return points;
  }

  // Yearly grouping
  const points: CurveDataPoint[] = [];
  const startYr = start.getFullYear();
  const endYr = end.getFullYear();

  for (let yr = startYr; yr <= endYr; yr++) {
    const yrStr = String(yr);
    const yTxs = inRangeTxs.filter((t) => t.transactionDate.startsWith(yrStr));
    let inc = 0;
    let exp = 0;
    for (const t of yTxs) {
      if (t.type === 'income') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    }

    points.push({
      label: yrStr,
      fullDate: yrStr,
      income: inc,
      expense: exp,
      net: inc - exp,
    });
  }

  return points;
}

export interface SubcategorySpendItem {
  id?: string;
  name: string;
  amount: number;
  percentage: number; // percentage of category total
  count: number;
}

export interface CategoryAnalyticsItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number; // percentage of total (income or expense)
  transactionCount: number;
  subcategories: SubcategorySpendItem[];
  // MoM comparison
  prevAmount: number;
  changePct: number; // vs prev period
}

/**
 * Calculates complete category & subcategory breakdown for Income or Expense.
 */
export function calculateCategoryAnalytics(
  allTransactions: Transaction[],
  categories: Category[],
  type: 'expense' | 'income',
  currentDateRange: DateRangeResult,
  prevDateRange: ComparisonRangeResult
): {
  items: CategoryAnalyticsItem[];
  totalAmount: number;
  highestCategory: CategoryAnalyticsItem | null;
} {
  const currentTxs = filterTransactionsByDate(
    allTransactions,
    currentDateRange.startDate,
    currentDateRange.endDate
  ).filter((t) => t.type === type);

  const prevTxs = filterTransactionsByDate(
    allTransactions,
    prevDateRange.prevStartDate,
    prevDateRange.prevEndDate
  ).filter((t) => t.type === type);

  const totalAmount = currentTxs.reduce((sum, t) => sum + t.amount, 0);

  // Group current by category
  const catMap = new Map<
    string,
    {
      amount: number;
      count: number;
      subsMap: Map<string, { id?: string; amount: number; count: number }>;
    }
  >();

  for (const t of currentTxs) {
    const catId = t.categoryId || 'uncategorized';
    let entry = catMap.get(catId);
    if (!entry) {
      entry = { amount: 0, count: 0, subsMap: new Map() };
      catMap.set(catId, entry);
    }
    entry.amount += t.amount;
    entry.count++;

    // Subcategory grouping
    const subKey = t.subcategoryName || 'General / Unspecified';
    let subEntry = entry.subsMap.get(subKey);
    if (!subEntry) {
      subEntry = { id: t.subcategoryId, amount: 0, count: 0 };
      entry.subsMap.set(subKey, subEntry);
    }
    subEntry.amount += t.amount;
    subEntry.count++;
  }

  // Previous period category sums for MoM
  const prevCatMap = new Map<string, number>();
  for (const t of prevTxs) {
    const catId = t.categoryId || 'uncategorized';
    prevCatMap.set(catId, (prevCatMap.get(catId) || 0) + t.amount);
  }

  const items: CategoryAnalyticsItem[] = [];

  catMap.forEach((entry, catId) => {
    const cat = categories.find((c) => c.id === catId);
    const prevAmt = prevCatMap.get(catId) || 0;
    const changePct =
      prevAmt > 0
        ? Math.round(((entry.amount - prevAmt) / prevAmt) * 100 * 10) / 10
        : entry.amount > 0
        ? 100
        : 0;

    // Build subcategories
    const subcategories: SubcategorySpendItem[] = [];
    entry.subsMap.forEach((sub, name) => {
      subcategories.push({
        id: sub.id,
        name,
        amount: sub.amount,
        percentage: entry.amount > 0 ? Math.round((sub.amount / entry.amount) * 100) : 0,
        count: sub.count,
      });
    });

    subcategories.sort((a, b) => b.amount - a.amount);

    items.push({
      categoryId: catId,
      categoryName: cat?.name || (catId === 'uncategorized' ? 'Uncategorized' : 'Other'),
      categoryIcon: cat?.icon || 'Tag',
      categoryColor: cat?.color || '#94a3b8',
      totalAmount: entry.amount,
      percentage: totalAmount > 0 ? Math.round((entry.amount / totalAmount) * 100) : 0,
      transactionCount: entry.count,
      subcategories,
      prevAmount: prevAmt,
      changePct,
    });
  });

  items.sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    items,
    totalAmount,
    highestCategory: items[0] || null,
  };
}

export interface MonthlyTrendBarItem {
  monthKey: string; // YYYY-MM
  label: string; // 'Jan'
  year: number;
  income: number;
  expense: number;
  savings: number;
  isCurrentMonth: boolean;
}

/**
 * Calculates monthly Income vs Expense vs Net Savings for the last 6 or 12 calendar months.
 */
export function calculateMonthlyTrends(
  transactions: Transaction[],
  monthsCount: 6 | 12
): MonthlyTrendBarItem[] {
  const now = new Date();
  const currentYr = now.getFullYear();
  const currentMo = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');

  const items: MonthlyTrendBarItem[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(currentYr, currentMo - i, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const monthKey = `${yr}-${pad(mo + 1)}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const isCurrent = yr === currentYr && mo === currentMo;

    const mTxs = transactions.filter((t) => t.transactionDate.startsWith(monthKey));
    let inc = 0;
    let exp = 0;
    for (const t of mTxs) {
      if (t.type === 'income') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    }

    items.push({
      monthKey,
      label,
      year: yr,
      income: inc,
      expense: exp,
      savings: inc - exp,
      isCurrentMonth: isCurrent,
    });
  }

  return items;
}

export interface BalanceGrowthPoint {
  label: string;
  fullDate: string;
  balance: number;
  cumulativeSavings: number;
}

/**
 * Calculates balance and savings growth over time with smooth area progression.
 */
export function calculateBalanceGrowth(
  transactions: Transaction[],
  currentBalance: number,
  startDate: string,
  endDate: string,
  grouping: 'daily' | 'monthly' | 'yearly'
): BalanceGrowthPoint[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Sort all transactions ascending
  const sorted = [...transactions].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  const start = new Date(startDate);
  const end = new Date(endDate);

  const points: BalanceGrowthPoint[] = [];

  if (grouping === 'daily') {
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const step = totalDays > 31 ? Math.ceil(totalDays / 31) : 1;

    let runningSavings = 0;
    const curr = new Date(start);

    while (curr <= end) {
      const curStr = toYMD(curr);
      const label = curr.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      // Transactions up to this day
      const upToDayTxs = sorted.filter((t) => t.transactionDate <= curStr);
      let dayIncome = 0;
      let dayExpense = 0;
      for (const t of upToDayTxs) {
        if (t.type === 'income') dayIncome += t.amount;
        else if (t.type === 'expense') dayExpense += t.amount;
      }

      // In-range savings up to this day
      const inRangeUpToDay = sorted.filter(
        (t) => t.transactionDate >= startDate && t.transactionDate <= curStr
      );
      runningSavings = inRangeUpToDay.reduce(
        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
        0
      );

      const bal = currentBalance - (sorted.filter((t) => t.transactionDate > curStr).reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0));

      points.push({
        label,
        fullDate: curStr,
        balance: Math.max(0, bal),
        cumulativeSavings: runningSavings,
      });

      curr.setDate(curr.getDate() + step);
    }
  } else if (grouping === 'monthly') {
    const curr = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (curr <= lastMonth) {
      const yr = curr.getFullYear();
      const mo = curr.getMonth();
      const label = curr.toLocaleDateString('en-IN', { month: 'short' });

      // Transactions up to end of this month
      const monthEnd = new Date(yr, mo + 1, 0);
      const monthEndStr = toYMD(monthEnd);

      const inRangeUpToMonth = sorted.filter(
        (t) => t.transactionDate >= startDate && t.transactionDate <= monthEndStr
      );
      const runningSavings = inRangeUpToMonth.reduce(
        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
        0
      );

      const bal = currentBalance - (sorted.filter((t) => t.transactionDate > monthEndStr).reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0));

      points.push({
        label,
        fullDate: curr.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        balance: Math.max(0, bal),
        cumulativeSavings: runningSavings,
      });

      curr.setMonth(curr.getMonth() + 1);
    }
  } else {
    // Yearly
    const startYr = start.getFullYear();
    const endYr = end.getFullYear();

    for (let yr = startYr; yr <= endYr; yr++) {
      const yrEndStr = `${yr}-12-31`;
      const inRangeUpToYear = sorted.filter(
        (t) => t.transactionDate >= startDate && t.transactionDate <= yrEndStr
      );
      const runningSavings = inRangeUpToYear.reduce(
        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
        0
      );

      const bal = currentBalance - (sorted.filter((t) => t.transactionDate > yrEndStr).reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0));

      points.push({
        label: String(yr),
        fullDate: String(yr),
        balance: Math.max(0, bal),
        cumulativeSavings: runningSavings,
      });
    }
  }

  return points.length > 0
    ? points
    : [
        {
          label: 'Today',
          fullDate: startDate,
          balance: currentBalance,
          cumulativeSavings: 0,
        },
      ];
}
