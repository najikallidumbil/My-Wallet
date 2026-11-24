import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { formatRupees } from '../lib/currency';
import { formatDate } from '../lib/date';
import { AccountType } from '../types';
import { DueRemindersWidget } from '../components/dashboard/DueRemindersWidget';
import { CategoryIcon } from '../components/common/CategoryIcon';
import {
  Building2,
  Smartphone,
  Banknote,
  Landmark,
  ArrowRightLeft,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Check,
  Sparkles,
  Wallet,
  Scale,
  PieChart,
  BarChart3,
  Activity,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const FinancialOverviewView: React.FC = () => {
  const {
    combinedFinancialSummary,
    khataSummary,
    transactions,
    creditDebtRecords,
    categories,
    accounts,
    accountTransfers,
    addAccount,
    transferBetweenAccounts,
    setCurrentMode,
    setActiveTab,
    setSelectedAccountId,
  } = useWallet();

  const {
    actualCashBalance,
    netWorth,
    totalReceivable,
    totalPayable,
    openingCash,
  } = combinedFinancialSummary;

  // Khata Net Balance = Receivable - Payable
  const khataNetBalance = totalReceivable - totalPayable;

  // Date Filter for Dashboard Analytics
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'this_year'>('all');

  // Timeframe filter for Income vs Expense interactive bar chart: 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [barTimeframe, setBarTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  // Active tooltip hover states
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [trendChartMode, setTrendChartMode] = useState<'both' | 'cash' | 'net_worth'>('both');

  // Transfer Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferTime, setTransferTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [transferNotes, setTransferNotes] = useState('');

  // Add Account Modal state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');

  // Filtered transactions for the selected dashboard date filter
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.toISOString().slice(0, 7);

    return transactions.filter((tx) => {
      if (dateFilter === 'this_month') {
        return tx.transactionDate.startsWith(currentMonth);
      }
      if (dateFilter === 'this_year') {
        return tx.transactionDate.startsWith(String(currentYear));
      }
      return true;
    });
  }, [transactions, dateFilter]);

  // =========================================================================
  // 1. VISUAL FINANCIAL BREAKDOWN DATA
  // Compares Actual Cash (Green), Receivable (Blue), Payable (Orange)
  // =========================================================================
  const breakdownData = useMemo(() => {
    const cash = Math.max(0, actualCashBalance);
    const rec = Math.max(0, totalReceivable);
    const pay = Math.max(0, totalPayable);
    const totalVolume = cash + rec + pay;
    const maxVal = Math.max(cash, rec, pay, 1);

    return {
      cash,
      rec,
      pay,
      totalVolume,
      cashPct: totalVolume > 0 ? (cash / totalVolume) * 100 : 33.3,
      recPct: totalVolume > 0 ? (rec / totalVolume) * 100 : 33.3,
      payPct: totalVolume > 0 ? (pay / totalVolume) * 100 : 33.3,
      cashBarWidth: (cash / maxVal) * 100,
      recBarWidth: (rec / maxVal) * 100,
      payBarWidth: (pay / maxVal) * 100,
    };
  }, [actualCashBalance, totalReceivable, totalPayable]);

  // =========================================================================
  // 2. INCOME VS EXPENSE INTERACTIVE BAR CHART DATA
  // Supports Daily, Weekly, Monthly, Yearly filters with real data
  // =========================================================================
  const barChartData = useMemo(() => {
    const today = new Date();

    if (barTimeframe === 'daily') {
      // Last 7 days
      const days: { dateStr: string; label: string; fullLabel: string; income: number; expense: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
        const fullLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        days.push({ dateStr, label, fullLabel, income: 0, expense: 0 });
      }

      for (const tx of transactions) {
        const bucket = days.find((d) => d.dateStr === tx.transactionDate);
        if (bucket) {
          if (tx.type === 'income') bucket.income += tx.amount;
          if (tx.type === 'expense') bucket.expense += tx.amount;
        }
      }
      return days;
    }

    if (barTimeframe === 'weekly') {
      // Last 4 weeks
      const weeks: { key: string; label: string; fullLabel: string; income: number; expense: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const start = new Date(today);
        start.setDate(today.getDate() - i * 7 - 6);
        const end = new Date(today);
        end.setDate(today.getDate() - i * 7);

        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);
        const label = `W${4 - i}`;
        const fullLabel = `${formatDate(startStr)} - ${formatDate(endStr)}`;
        weeks.push({ key: `${startStr}_${endStr}`, label, fullLabel, income: 0, expense: 0 });
      }

      for (const tx of transactions) {
        for (let i = 3; i >= 0; i--) {
          const start = new Date(today);
          start.setDate(today.getDate() - i * 7 - 6);
          const end = new Date(today);
          end.setDate(today.getDate() - i * 7);
          const startStr = start.toISOString().slice(0, 10);
          const endStr = end.toISOString().slice(0, 10);

          if (tx.transactionDate >= startStr && tx.transactionDate <= endStr) {
            const bucket = weeks[3 - i];
            if (tx.type === 'income') bucket.income += tx.amount;
            if (tx.type === 'expense') bucket.expense += tx.amount;
            break;
          }
        }
      }
      return weeks;
    }

    if (barTimeframe === 'monthly') {
      // Last 6 months
      const months: { monthKey: string; label: string; fullLabel: string; income: number; expense: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString('en-IN', { month: 'short' });
        const fullLabel = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        months.push({ monthKey, label, fullLabel, income: 0, expense: 0 });
      }

      for (const tx of transactions) {
        const mKey = tx.transactionDate.slice(0, 7);
        const bucket = months.find((m) => m.monthKey === mKey);
        if (bucket) {
          if (tx.type === 'income') bucket.income += tx.amount;
          if (tx.type === 'expense') bucket.expense += tx.amount;
        }
      }
      return months;
    }

    // Yearly: Last 3 years
    const currentYear = today.getFullYear();
    const years: { yearKey: string; label: string; fullLabel: string; income: number; expense: number }[] = [
      { yearKey: String(currentYear - 2), label: String(currentYear - 2), fullLabel: `Year ${currentYear - 2}`, income: 0, expense: 0 },
      { yearKey: String(currentYear - 1), label: String(currentYear - 1), fullLabel: `Year ${currentYear - 1}`, income: 0, expense: 0 },
      { yearKey: String(currentYear), label: String(currentYear), fullLabel: `Year ${currentYear}`, income: 0, expense: 0 },
    ];

    for (const tx of transactions) {
      const yKey = tx.transactionDate.slice(0, 4);
      const bucket = years.find((y) => y.yearKey === yKey);
      if (bucket) {
        if (tx.type === 'income') bucket.income += tx.amount;
        if (tx.type === 'expense') bucket.expense += tx.amount;
      }
    }
    return years;
  }, [transactions, barTimeframe]);

  const barChartMaxVal = useMemo(() => {
    let max = 1000;
    for (const item of barChartData) {
      if (item.income > max) max = item.income;
      if (item.expense > max) max = item.expense;
    }
    return max;
  }, [barChartData]);

  const barChartTotals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const item of barChartData) {
      inc += item.income;
      exp += item.expense;
    }
    return { income: inc, expense: exp, net: inc - exp };
  }, [barChartData]);

  // =========================================================================
  // 3. EXPENSE CATEGORY DONUT CHART DATA
  // Aggregates expenses by category with percentages and amounts
  // =========================================================================
  const expenseDonutData = useMemo(() => {
    const expenseTx = filteredTransactions.filter((tx) => tx.type === 'expense');
    const totalExp = expenseTx.reduce((sum, tx) => sum + tx.amount, 0);

    const map = new Map<string, { categoryId: string; name: string; color: string; icon: string; amount: number }>();

    for (const tx of expenseTx) {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const catId = tx.categoryId || 'other';
      const catName = cat?.name || 'Uncategorized';
      const catColor = cat?.color || '#94a3b8';
      const catIcon = cat?.icon || 'Tag';

      const existing = map.get(catId);
      if (existing) {
        existing.amount += tx.amount;
      } else {
        map.set(catId, {
          categoryId: catId,
          name: catName,
          color: catColor,
          icon: catIcon,
          amount: tx.amount,
        });
      }
    }

    const items = Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: totalExp > 0 ? (item.amount / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Compute SVG donut dasharray offsets (Radius = 65, Circumference ≈ 408.4)
    const circumference = 2 * Math.PI * 65;
    let accumulatedOffset = 0;

    const segments = items.map((item) => {
      const strokeLength = (item.percentage / 100) * circumference;
      const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });

    return {
      totalExpense: totalExp,
      circumference,
      segments,
      topCategories: segments.slice(0, 5),
    };
  }, [filteredTransactions, categories]);

  // =========================================================================
  // 4. CASH FLOW & NET WORTH PROGRESSION TIMELINE DATA
  // Calculates real chronological progression of actual physical cash and overall net worth
  // =========================================================================
  const cashFlowTimeline = useMemo(() => {
    interface TimelineEvent {
      date: string;
      time: string;
      title: string;
      cashDelta: number;
      isIncomeExpense: boolean;
    }

    const events: TimelineEvent[] = [];

    // Income & Expense cash and net worth impact
    for (const tx of transactions) {
      if (tx.type === 'income') {
        events.push({
          date: tx.transactionDate,
          time: tx.transactionTime || '12:00',
          title: tx.title,
          cashDelta: tx.amount,
          isIncomeExpense: true,
        });
      } else if (tx.type === 'expense') {
        events.push({
          date: tx.transactionDate,
          time: tx.transactionTime || '12:00',
          title: tx.title,
          cashDelta: -tx.amount,
          isIncomeExpense: true,
        });
      }
    }

    // Khata lending and borrowing physical cash impact (0 net effect on Net Worth)
    for (const record of creditDebtRecords) {
      if (record.type === 'credit') {
        // Money lent out -> Cash physically decreases
        events.push({
          date: record.transactionDate,
          time: record.transactionTime || '12:00',
          title: `Credit to ${record.counterpartName}`,
          cashDelta: -record.originalAmount,
          isIncomeExpense: false,
        });
        // Repayments received -> Cash physically increases
        if (record.repayments && record.repayments.length > 0) {
          for (const rep of record.repayments) {
            events.push({
              date: rep.paymentDate,
              time: rep.paymentTime || '12:00',
              title: `Repayment from ${record.counterpartName}`,
              cashDelta: rep.amount,
              isIncomeExpense: false,
            });
          }
        }
      } else if (record.type === 'debt') {
        // Money borrowed in -> Cash physically increases
        events.push({
          date: record.transactionDate,
          time: record.transactionTime || '12:00',
          title: `Borrowed from ${record.counterpartName}`,
          cashDelta: record.originalAmount,
          isIncomeExpense: false,
        });
        // Repayments paid out -> Cash physically decreases
        if (record.repayments && record.repayments.length > 0) {
          for (const rep of record.repayments) {
            events.push({
              date: rep.paymentDate,
              time: rep.paymentTime || '12:00',
              title: `Repaid to ${record.counterpartName}`,
              cashDelta: -rep.amount,
              isIncomeExpense: false,
            });
          }
        }
      }
    }

    // Sort chronologically ascending
    events.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.time.localeCompare(b.time);
    });

    let currentCash = openingCash;
    const totalInc = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExp = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const openingNetWorth = netWorth - (totalInc - totalExp);
    let currentNetWorth = openingNetWorth;

    const points: {
      date: string;
      cashBalance: number;
      netWorthBalance: number;
      label: string;
      cashLabel: string;
      netWorthLabel: string;
    }[] = [];

    // Anchor starting point
    if (events.length > 0) {
      points.push({
        date: events[0].date,
        cashBalance: currentCash,
        netWorthBalance: currentNetWorth,
        label: `Opening Point`,
        cashLabel: `Cash: ${formatRupees(currentCash)}`,
        netWorthLabel: `Net Worth: ${formatRupees(currentNetWorth)}`,
      });
    } else {
      points.push({
        date: new Date().toISOString().slice(0, 10),
        cashBalance: currentCash,
        netWorthBalance: currentNetWorth,
        label: `Current Balance`,
        cashLabel: `Cash: ${formatRupees(currentCash)}`,
        netWorthLabel: `Net Worth: ${formatRupees(currentNetWorth)}`,
      });
    }

    // Compute cumulative balance
    for (const ev of events) {
      currentCash += ev.cashDelta;
      if (ev.isIncomeExpense) {
        currentNetWorth += ev.cashDelta;
      }
      points.push({
        date: ev.date,
        cashBalance: Math.round(currentCash * 100) / 100,
        netWorthBalance: Math.round(currentNetWorth * 100) / 100,
        label: `${ev.title} (${ev.cashDelta > 0 ? '+' : ''}${formatRupees(ev.cashDelta)})`,
        cashLabel: `Cash: ${formatRupees(currentCash)}`,
        netWorthLabel: `Net Worth: ${formatRupees(currentNetWorth)}`,
      });
    }

    // Min and Max for scaling
    const cashBalances = points.map((p) => p.cashBalance);
    const nwBalances = points.map((p) => p.netWorthBalance);
    const allBalances = [...cashBalances, ...nwBalances];
    const minBal = Math.min(...allBalances, 0);
    const maxBal = Math.max(...allBalances, 1000);
    const range = maxBal - minBal || 1;

    // SVG coordinates (viewBox 0 0 600 180)
    const svgWidth = 600;
    const svgHeight = 180;
    const paddingX = 35;
    const paddingY = 25;

    const coords = points.map((p, idx) => {
      const x =
        points.length === 1
          ? svgWidth / 2
          : paddingX + (idx / (points.length - 1)) * (svgWidth - paddingX * 2);
      const y =
        svgHeight - paddingY - ((p.cashBalance - minBal) / range) * (svgHeight - paddingY * 2);
      const yNW =
        svgHeight - paddingY - ((p.netWorthBalance - minBal) / range) * (svgHeight - paddingY * 2);
      return { x, y, yNW, ...p };
    });

    const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const areaPoints = `${coords[0].x.toFixed(1)},${svgHeight - paddingY} ${polylinePoints} ${coords[
      coords.length - 1
    ].x.toFixed(1)},${svgHeight - paddingY}`;

    const nwPolylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.yNW.toFixed(1)}`).join(' ');
    const nwAreaPoints = `${coords[0].x.toFixed(1)},${svgHeight - paddingY} ${nwPolylinePoints} ${coords[
      coords.length - 1
    ].x.toFixed(1)},${svgHeight - paddingY}`;

    return {
      points: coords,
      polylinePoints,
      areaPoints,
      nwPolylinePoints,
      nwAreaPoints,
      minBal,
      maxBal,
      currentBal: actualCashBalance,
      currentNetWorth: netWorth,
      highestBal: Math.max(...cashBalances),
      lowestBal: Math.min(...cashBalances),
      highestNW: Math.max(...nwBalances),
      lowestNW: Math.min(...nwBalances),
    };
  }, [transactions, creditDebtRecords, openingCash, actualCashBalance, netWorth]);

  // Handlers for Account & Transfers
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0 || fromAccountId === toAccountId) {
      alert('Please select different accounts and a valid positive amount.');
      return;
    }

    transferBetweenAccounts(
      fromAccountId,
      toAccountId,
      amount,
      transferDate,
      transferTime,
      transferNotes.trim() || undefined
    );

    setTransferAmount('');
    setTransferNotes('');
    setIsTransferModalOpen(false);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    addAccount({
      name: newAccName.trim(),
      type: newAccType,
      openingBalance: parseFloat(newAccBalance) || 0,
      accountNumber: newAccNumber.trim() || undefined,
      color:
        newAccType === 'cash'
          ? '#10b981'
          : newAccType === 'bank'
          ? '#3b82f6'
          : newAccType === 'upi'
          ? '#6366f1'
          : '#f59e0b',
    });

    setNewAccName('');
    setNewAccBalance('');
    setNewAccNumber('');
    setIsAddAccountOpen(false);
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case 'upi':
        return <Smartphone className="w-5 h-5 text-indigo-500" />;
      case 'cash':
        return <Banknote className="w-5 h-5 text-emerald-500" />;
      default:
        return <Landmark className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          HEADER & ACTION BAR
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
              Mode 3
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Combined Financial Overview
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidated financial portfolio overview across cash, receivables, payables, and net worth
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dashboard Date Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg font-semibold transition-all',
                dateFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('this_month')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg font-semibold transition-all',
                dateFilter === 'this_month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('this_year')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg font-semibold transition-all',
                dateFilter === 'this_year'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              This Year
            </button>
          </div>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          1. CLEAR FINANCIAL SUMMARY (5 SEPARATE METRIC CARDS)
          ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* CARD 1: ACTUAL CASH */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Actual Cash
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                Total In Hand &amp; Bank
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatRupees(actualCashBalance)}
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              Liquid Cash &amp; Banks
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug border-t border-slate-100 dark:border-slate-800 pt-2">
            Money currently available in cash in hand, bank accounts, and UPI wallets.
          </p>
        </div>

        {/* CARD 2: TOTAL RECEIVABLE */}
        <div
          onClick={() => {
            setCurrentMode('khata_book');
            setActiveTab('khata_book');
          }}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/60 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-sky-400 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
                Total Receivable
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                Money Others Owe Me
              </p>
            </div>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <p className="text-xl md:text-2xl font-black text-sky-600 dark:text-sky-400 tracking-tight">
              {formatRupees(totalReceivable)}
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100/70 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
              Khata Assets
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug border-t border-slate-100 dark:border-slate-800 pt-2">
            Total money given or lent to others that is pending to be collected back.
          </p>
        </div>

        {/* CARD 3: TOTAL PAYABLE */}
        <div
          onClick={() => {
            setCurrentMode('khata_book');
            setActiveTab('khata_book');
          }}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-sm relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Total Payable
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                Money I Owe Others
              </p>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {formatRupees(totalPayable)}
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/70 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Khata Liabilities
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug border-t border-slate-100 dark:border-slate-800 pt-2">
            Total money borrowed from others that you must repay in future.
          </p>
        </div>

        {/* CARD 4: KHATA NET BALANCE */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Khata Net Balance
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                Net Lending Position
              </p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <p
              className={cn(
                'text-xl md:text-2xl font-black tracking-tight',
                khataNetBalance >= 0
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {formatRupees(khataNetBalance, { showSign: true })}
            </p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/70 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
              Net Outstanding
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug border-t border-slate-100 dark:border-slate-800 pt-2">
            Net balance across all personal lending and borrowing accounts.
          </p>
        </div>

        {/* CARD 5: TOTAL NET WORTH (CLEARLY MARKED AS NOT AVAILABLE CASH) */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-800/60 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block">
                Total Net Worth
              </span>
              <p className="text-xs font-semibold text-white mt-0.5">
                Total Financial Equity
              </p>
            </div>
            <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <p className="text-xl md:text-2xl font-black text-white tracking-tight">
              {formatRupees(netWorth)}
            </p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <AlertCircle className="w-3 h-3" />
              <span>Not Available Cash</span>
            </span>
          </div>

          <p className="text-[11px] text-indigo-200/80 leading-snug border-t border-white/10 pt-2">
            Comprehensive financial standing across liquid cash and net Khata assets.
          </p>
        </div>
      </div>

      {/* =====================================================================
          2. VISUAL FINANCIAL BREAKDOWN (HORIZONTAL BAR CHART COMPARISON)
          Compares Actual Cash (Green), Receivable (Blue), Payable (Orange)
          ===================================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Visual Financial Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Horizontal comparison of your liquid cash, money to collect, and money to repay
            </p>
          </div>
        </div>

        {/* Proportional Multi-Segment Progress Strip */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${breakdownData.cashPct}%` }}
              title={`Actual Cash: ${breakdownData.cashPct.toFixed(1)}%`}
            />
            <div
              className="bg-sky-500 h-full transition-all duration-500"
              style={{ width: `${breakdownData.recPct}%` }}
              title={`Receivable: ${breakdownData.recPct.toFixed(1)}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${breakdownData.payPct}%` }}
              title={`Payable: ${breakdownData.payPct.toFixed(1)}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Cash ({breakdownData.cashPct.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
              Receivable ({breakdownData.recPct.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Payable ({breakdownData.payPct.toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Detailed Horizontal Bar Comparison Rows */}
        <div className="space-y-3.5 pt-1">
          {/* Row 1: Actual Cash (Green) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Actual Cash
                </span>
                <span className="text-[10px] text-slate-400">Available Liquid Money</span>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {formatRupees(actualCashBalance)}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(4, breakdownData.cashBarWidth)}%` }}
              />
            </div>
          </div>

          {/* Row 2: Total Receivable (Blue) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-sky-500 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Total Receivable
                </span>
                <span className="text-[10px] text-slate-400">Money Others Owe Me</span>
              </div>
              <span className="font-black text-sky-600 dark:text-sky-400 text-sm">
                {formatRupees(totalReceivable)}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(4, breakdownData.recBarWidth)}%` }}
              />
            </div>
          </div>

          {/* Row 3: Total Payable (Orange) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Total Payable
                </span>
                <span className="text-[10px] text-slate-400">Money I Owe Others</span>
              </div>
              <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                {formatRupees(totalPayable)}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(4, breakdownData.payBarWidth)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. INCOME VS EXPENSE CHART & 4. EXPENSE CATEGORY DONUT CHART (2-COL)
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. INCOME VS EXPENSE INTERACTIVE BAR CHART */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Income vs Expense Comparison
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparative inflow vs outflow with flexible periodic views
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
                    onClick={() => setBarTimeframe(t.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-semibold transition-all',
                      barTimeframe === t.id
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Dual-Bar Visualization */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2">
                {barChartData.map((item, index) => {
                  const incHeight = Math.max(4, (item.income / barChartMaxVal) * 160);
                  const expHeight = Math.max(4, (item.expense / barChartMaxVal) * 160);
                  const isHovered = hoveredBarIndex === index;

                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                      onMouseEnter={() => setHoveredBarIndex(index)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {/* Hover Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-16 z-30 bg-slate-900 text-white rounded-xl px-3 py-2 text-[11px] shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none animate-fade-in">
                          <p className="font-bold text-indigo-300">{item.fullLabel}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-emerald-400">
                              + {formatRupees(item.income)}
                            </span>
                            <span className="text-rose-400">
                              - {formatRupees(item.expense)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-0.5 border-t border-slate-800 pt-0.5">
                            Net: {formatRupees(item.income - item.expense, { showSign: true })}
                          </p>
                        </div>
                      )}

                      {/* Dual Bars: Income (Emerald) and Expense (Rose) */}
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-40">
                        {/* Income Bar */}
                        <div
                          className="w-1/2 max-w-[18px] bg-emerald-500 hover:bg-emerald-400 rounded-t-md transition-all duration-300 shadow-xs"
                          style={{ height: `${incHeight}px` }}
                        />
                        {/* Expense Bar */}
                        <div
                          className="w-1/2 max-w-[18px] bg-rose-500 hover:bg-rose-400 rounded-t-md transition-all duration-300 shadow-xs"
                          style={{ height: `${expHeight}px` }}
                        />
                      </div>

                      {/* X-Axis Label */}
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart Summary Footer & Legend */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Income: {formatRupees(barChartTotals.income)}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                Expense: {formatRupees(barChartTotals.expense)}
              </span>
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
              Net Surplus: {formatRupees(barChartTotals.net, { showSign: true })}
            </span>
          </div>
        </div>

        {/* 4. EXPENSE CATEGORY DONUT CHART */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Expense by Category
                </h3>
              </div>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                {expenseDonutData.segments.length} Categories
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Category distribution of personal expenses
            </p>

            {/* Donut Chart Visual */}
            <div className="flex items-center justify-center my-4 relative">
              {expenseDonutData.totalExpense === 0 ? (
                <div className="w-44 h-44 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-center p-4">
                  <span className="text-xs text-slate-400">No expenses in selected period</span>
                </div>
              ) : (
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 160 160">
                    {/* Background circle track */}
                    <circle
                      cx="80"
                      cy="80"
                      r="65"
                      fill="transparent"
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="18"
                    />

                    {/* Donut segment strokes */}
                    {expenseDonutData.segments.map((seg) => (
                      <circle
                        key={seg.categoryId}
                        cx="80"
                        cy="80"
                        r="65"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={hoveredCategory === seg.categoryId ? 22 : 18}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredCategory(seg.categoryId)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    ))}
                  </svg>

                  {/* Donut Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Spent
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[120px]">
                      {formatRupees(expenseDonutData.totalExpense)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Category List */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
            {expenseDonutData.segments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No category records.</p>
            ) : (
              expenseDonutData.topCategories.map((cat) => (
                <div
                  key={cat.categoryId}
                  onMouseEnter={() => setHoveredCategory(cat.categoryId)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={cn(
                    'p-2 rounded-xl flex items-center justify-between text-xs transition-colors',
                    hoveredCategory === cat.categoryId
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" color={cat.color} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {cat.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {cat.percentage.toFixed(1)}%
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatRupees(cat.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          5. CASH FLOW & NET WORTH PROGRESSION GRAPH
          ===================================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cash Balance & Net Worth Progression
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chronological trend line tracking your liquid cash in hand vs overall net wealth
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setTrendChartMode('both')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all',
                  trendChartMode === 'both'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Both Lines
              </button>
              <button
                onClick={() => setTrendChartMode('cash')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all',
                  trendChartMode === 'cash'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Cash Flow
              </button>
              <button
                onClick={() => setTrendChartMode('net_worth')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all',
                  trendChartMode === 'net_worth'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                Net Worth
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Cash: {formatRupees(cashFlowTimeline.currentBal)}
              </span>
              <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Net Worth: {formatRupees(cashFlowTimeline.currentNetWorth)}
              </span>
            </div>
          </div>
        </div>

        {/* Responsive Line Chart SVG */}
        <div className="relative w-full h-52 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-2 border border-slate-100 dark:border-slate-800/60 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cashflow-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="networth-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            <line x1="35" y1="35" x2="565" y2="35" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
            <line x1="35" y1="90" x2="565" y2="90" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
            <line x1="35" y1="145" x2="565" y2="145" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />

            {/* Net Worth Area & Polyline */}
            {(trendChartMode === 'both' || trendChartMode === 'net_worth') && (
              <>
                {cashFlowTimeline.points.length > 1 && (
                  <polygon points={cashFlowTimeline.nwAreaPoints} fill="url(#networth-grad)" />
                )}
                {cashFlowTimeline.points.length > 1 ? (
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeDasharray={trendChartMode === 'both' ? '4 2' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={cashFlowTimeline.nwPolylinePoints}
                  />
                ) : (
                  <line x1="35" y1="90" x2="565" y2="90" stroke="#6366f1" strokeWidth="2.5" />
                )}
              </>
            )}

            {/* Cash Flow Area & Polyline */}
            {(trendChartMode === 'both' || trendChartMode === 'cash') && (
              <>
                {cashFlowTimeline.points.length > 1 && (
                  <polygon points={cashFlowTimeline.areaPoints} fill="url(#cashflow-grad)" />
                )}
                {cashFlowTimeline.points.length > 1 ? (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={cashFlowTimeline.polylinePoints}
                  />
                ) : (
                  <line x1="35" y1="90" x2="565" y2="90" stroke="#10b981" strokeWidth="2.5" />
                )}
              </>
            )}

            {/* Data Points */}
            {cashFlowTimeline.points.map((pt, idx) => (
              <g key={idx}>
                {(trendChartMode === 'both' || trendChartMode === 'cash') && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredLineIndex === idx ? 6 : 4}
                    className="fill-emerald-500 stroke-white dark:stroke-slate-900 transition-all cursor-pointer"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredLineIndex(idx)}
                    onMouseLeave={() => setHoveredLineIndex(null)}
                  />
                )}
                {(trendChartMode === 'both' || trendChartMode === 'net_worth') && (
                  <circle
                    cx={pt.x}
                    cy={pt.yNW}
                    r={hoveredLineIndex === idx ? 6 : 4}
                    className="fill-indigo-500 stroke-white dark:stroke-slate-900 transition-all cursor-pointer"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredLineIndex(idx)}
                    onMouseLeave={() => setHoveredLineIndex(null)}
                  />
                )}
              </g>
            ))}
          </svg>

          {/* Interactive Tooltip on Point Hover */}
          {hoveredLineIndex !== null && cashFlowTimeline.points[hoveredLineIndex] && (
            <div
              className="absolute z-20 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl shadow-xl border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 animate-fade-in space-y-1"
              style={{
                left: `${(cashFlowTimeline.points[hoveredLineIndex].x / 600) * 100}%`,
                top: `${(Math.min(cashFlowTimeline.points[hoveredLineIndex].y, cashFlowTimeline.points[hoveredLineIndex].yNW) / 180) * 100}%`,
              }}
            >
              <p className="text-[10px] text-slate-400">
                {formatDate(cashFlowTimeline.points[hoveredLineIndex].date)}
              </p>
              <p className="font-semibold text-slate-200">
                {cashFlowTimeline.points[hoveredLineIndex].label}
              </p>
              <div className="flex items-center gap-3 pt-0.5 border-t border-slate-800 text-[11px]">
                <span className="text-emerald-400 font-bold">
                  {cashFlowTimeline.points[hoveredLineIndex].cashLabel}
                </span>
                <span className="text-indigo-400 font-bold">
                  {cashFlowTimeline.points[hoveredLineIndex].netWorthLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          6. KHATA BOOK SUMMARY (6 DETAILED METRICS WITH LINK TO KHATA BOOK)
          ===================================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                Mode 2 Ledger
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Khata Book Lending & Borrowing Summary
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Complete ledger audit of original amounts given, received back, borrowed, and repaid
            </p>
          </div>

          <button
            onClick={() => {
              setCurrentMode('khata_book');
              setActiveTab('khata_book');
            }}
            className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 self-start sm:self-auto active:scale-95 transition-all"
          >
            <span>Open Full Khata Book</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6 Khata Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* 1. Total Money Given */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Total Given
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Total Lent
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white block">
              {formatRupees(khataSummary.totalGivenOriginal)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Original Lending</span>
          </div>

          {/* 2. Total Money Received Back */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
              Received Back
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Total Recovered
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block">
              {formatRupees(khataSummary.totalReceivedBack)}
            </span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 block mt-1">
              Collected Back
            </span>
          </div>

          {/* 3. Remaining Receivable */}
          <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300 block">
              Remaining Receivable
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Net Outstanding
            </span>
            <span className="text-base font-black text-sky-600 dark:text-sky-400 block">
              {formatRupees(khataSummary.totalReceivable)}
            </span>
            <span className="text-[10px] text-sky-600/80 dark:text-sky-400/80 block mt-1 font-semibold">
              Pending Collection
            </span>
          </div>

          {/* 4. Total Money Borrowed */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Total Borrowed
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Total Borrowed
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white block">
              {formatRupees(khataSummary.totalBorrowedOriginal)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Original Debt Taken</span>
          </div>

          {/* 5. Total Debt Repaid */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Debt Repaid
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Total Repaid
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white block">
              {formatRupees(khataSummary.totalRepaid)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Already Paid Back</span>
          </div>

          {/* 6. Remaining Payable */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block">
              Remaining Payable
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Net Outstanding
            </span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 block">
              {formatRupees(khataSummary.totalPayable)}
            </span>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 block mt-1 font-semibold">
              Pending Obligation
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          7. MULTI-ACCOUNT MANAGEMENT & INTERNAL TRANSFERS
          ===================================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Multiple Accounts & Portfolios ({accounts.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cash in hand, bank accounts, UPI wallets, and internal fund transfers
            </p>
          </div>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between space-y-3 cursor-pointer hover:border-brand-500/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-xs group-hover:scale-105 transition-transform">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {acc.name}
                    </h4>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {acc.type} {acc.accountNumber ? `· ${acc.accountNumber}` : ''}
                    </span>
                  </div>
                </div>

                {acc.isDefault && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                    Default
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">Available Balance</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {formatRupees(acc.currentBalance)}
                </span>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium group-hover:underline flex items-center gap-0.5 mt-1">
                  View statement &amp; transfers &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Transfer History Snippet */}
        {accountTransfers.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Recent Internal Account Transfers ({accountTransfers.length})
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {accountTransfers.slice(0, 3).map((tr) => {
                const fromAcc = accounts.find((a) => a.id === tr.fromAccountId);
                const toAcc = accounts.find((a) => a.id === tr.toAccountId);
                return (
                  <div
                    key={tr.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between text-slate-600 dark:text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-brand-500" />
                      <span>
                        {fromAcc?.name || 'Account'} → {toAcc?.name || 'Account'}
                      </span>
                      {tr.notes && <span className="text-slate-400 italic">({tr.notes})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupees(tr.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(tr.date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          8. DUE REMINDERS WIDGET
          ===================================================================== */}
      <DueRemindersWidget />

      {/* =====================================================================
          MODAL: FUND TRANSFER
          ===================================================================== */}
      {isTransferModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsTransferModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Transfer Funds Between Accounts
                </h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-brand-50/60 dark:bg-brand-950/40 rounded-xl text-xs text-brand-700 dark:text-brand-300">
              Internal transfers move money between your own accounts. They do not alter your overall Income, Expense, or Net Worth.
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    From Account *
                  </label>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupees(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To Account *
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupees(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Time
                  </label>
                  <input
                    type="time"
                    required
                    value={transferTime}
                    onChange={(e) => setTransferTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ATM withdrawal / GPay recharge"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Execute Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD ACCOUNT
          ===================================================================== */}
      {isAddAccountOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAddAccountOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add New Financial Account
              </h3>
              <button
                onClick={() => setIsAddAccountOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICICI Savings Account"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="upi">UPI Wallet</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="custom">Custom Portfolio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Identifier / Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. •••• 5521 or UPI ID"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
