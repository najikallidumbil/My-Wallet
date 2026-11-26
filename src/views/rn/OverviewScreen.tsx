import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Wallet,
  Scale,
  HandCoins,
  ArrowRightLeft,
  Plus,
  Landmark,
  Building2,
  Smartphone,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { useResponsive } from '../../lib/useResponsive';
import { Transaction } from '../../types';

// Analytics & Charts
import {
  AnalyticsDateFilterType,
  getAnalyticsDateRange,
  getComparisonDateRange,
  calculateDashboardKPIs,
} from '../../lib/analyticsEngine';
import { IncomeExpenseCurveChart } from '../../components/rn/charts/IncomeExpenseCurveChart';
import { ExpenseDonutChart } from '../../components/rn/charts/ExpenseDonutChart';
import { IncomeDonutChart } from '../../components/rn/charts/IncomeDonutChart';
import { MonthlyTrendsBarChart } from '../../components/rn/charts/MonthlyTrendsBarChart';
import { BalanceGrowthAreaChart } from '../../components/rn/charts/BalanceGrowthAreaChart';

// Modals
import { AnalyticsTransactionModal } from '../../components/rn/analytics/AnalyticsTransactionModal';
import { CustomDateRangeModal } from '../../components/rn/analytics/CustomDateRangeModal';
import { TransactionDetailsModal } from '../../components/rn/TransactionDetailsModal';

interface OverviewScreenProps {
  onOpenTransfer: () => void;
  onAddAccount: () => void;
}

const FILTER_PRESETS: { key: AnalyticsDateFilterType; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3M' },
  { key: 'last_6_months', label: 'Last 6M' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  onOpenTransfer,
  onAddAccount,
}) => {
  const {
    combinedFinancialSummary,
    accounts,
    categories,
    transactions,
    creditDebtRecords,
    setCurrentMode,
  } = useWallet();

  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const {
    actualCashBalance,
    totalReceivable,
    totalPayable,
    netWorth,
  } = combinedFinancialSummary;

  // Active Date Filter state (Defaults to 'this_month')
  const [activeFilter, setActiveFilter] = useState<AnalyticsDateFilterType>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Drilldown modal states
  const [drilldownCategory, setDrilldownCategory] = useState<{
    id: string | null;
    name: string | null;
    subcategoryName?: string | null;
  } | null>(null);

  const [inspectTx, setInspectTx] = useState<Transaction | null>(null);

  // Resolve active date range & comparison range
  const dateRange = useMemo(() => {
    return getAnalyticsDateRange(activeFilter, customStart, customEnd);
  }, [activeFilter, customStart, customEnd]);

  const prevRange = useMemo(() => {
    return getComparisonDateRange(activeFilter, dateRange.startDate, dateRange.endDate);
  }, [activeFilter, dateRange]);

  // Compute Dashboard KPIs
  const kpis = useMemo(() => {
    return calculateDashboardKPIs(transactions, dateRange, prevRange, actualCashBalance);
  }, [transactions, dateRange, prevRange, actualCashBalance]);

  // Financial Position Bar Proportions
  const totalBar = Math.max(1, Math.abs(actualCashBalance) + totalReceivable + totalPayable);
  const cashPct = Math.max(8, (Math.max(0, actualCashBalance) / totalBar) * 100);
  const recPct = Math.max(8, (totalReceivable / totalBar) * 100);
  const payPct = Math.max(8, (totalPayable / totalBar) * 100);

  // Recent Khata Activity
  const recentKhataActivity = useMemo(() => {
    return [...creditDebtRecords]
      .sort(
        (a, b) =>
          new Date(b.transactionDate || b.createdAt).getTime() -
          new Date(a.transactionDate || a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [creditDebtRecords]);

  const handleSelectFilter = (filterKey: AnalyticsDateFilterType) => {
    if (filterKey === 'custom') {
      setIsCustomModalOpen(true);
    } else {
      setActiveFilter(filterKey);
    }
  };

  const handleApplyCustomRange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setActiveFilter('custom');
  };

  const handleInspectCategoryTransactions = (
    categoryId: string,
    categoryName: string,
    subcategoryName?: string
  ) => {
    setDrilldownCategory({
      id: categoryId,
      name: categoryName,
      subcategoryName,
    });
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 size={16} color="#3b82f6" />;
      case 'upi':
        return <Smartphone size={16} color="#6366f1" />;
      case 'cash':
        return <Banknote size={16} color="#10b981" />;
      default:
        return <Landmark size={16} color="#64748b" />;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { padding: isNarrowMobile ? 12 : 16 },
        isWide && styles.contentWide,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={isWide ? styles.innerWide : styles.inner}>
        {/* 1. Analytics Header & Date Filter Bar */}
        <View style={styles.filterSection}>
          <View style={styles.analyticsHeaderRow}>
            <View>
              <View style={styles.analyticsTitleWrap}>
                <Sparkles size={16} color={colors.brand[600]} />
                <Text style={styles.analyticsMainTitle}>Financial Analytics</Text>
              </View>
              <Text style={styles.dateRangeSubtitle}>
                {dateRange.startDate} to {dateRange.endDate} • {dateRange.label}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.customDateTrigger}
              onPress={() => setIsCustomModalOpen(true)}
              activeOpacity={0.7}
            >
              <Calendar size={14} color={colors.brand[600]} />
              <Text style={styles.customDateTriggerText}>Range</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsContent}
            style={styles.filterPillsScroll}
          >
            {FILTER_PRESETS.map((item) => {
              const isActive = activeFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleSelectFilter(item.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 2. Premium Analytics KPI Dashboard */}
        <View style={styles.kpiDashboardCard}>
          {/* Top Row: Total Balance & Net Savings */}
          <View style={styles.kpiTopRow}>
            <View style={styles.kpiMainBox}>
              <View style={styles.kpiHeaderRow}>
                <Wallet size={14} color={colors.slate[500]} />
                <Text style={styles.kpiMainLabel}>TOTAL BALANCE</Text>
              </View>
              <Text style={styles.kpiMainAmount} numberOfLines={1}>
                {formatRupees(actualCashBalance)}
              </Text>
              <Text style={styles.kpiMainSub}>Cash & Bank Liquid Capital</Text>
            </View>

            <View style={styles.kpiDividerVert} />

            <View style={styles.kpiMainBox}>
              <View style={styles.kpiHeaderRow}>
                <PiggyBank size={14} color={colors.overview.text} />
                <Text style={styles.kpiMainLabel}>NET SAVINGS</Text>
              </View>
              <Text
                style={[
                  styles.kpiMainAmount,
                  { color: kpis.netSavings >= 0 ? colors.income.text : colors.expense.text },
                ]}
                numberOfLines={1}
              >
                {kpis.netSavings >= 0 ? '+' : ''}
                {formatRupees(kpis.netSavings)}
              </Text>
              <View style={styles.savingsRatePill}>
                <Text style={styles.savingsRateText}>{kpis.savingsRate}% Savings Rate</Text>
              </View>
            </View>
          </View>

          {/* Bottom Grid: Income & Expense with MoM Badges */}
          <View style={styles.kpiBottomGrid}>
            {/* Income Tile */}
            <View style={styles.kpiTile}>
              <View style={styles.kpiTileHeader}>
                <View style={[styles.kpiTileDot, { backgroundColor: colors.income.solid }]} />
                <Text style={styles.kpiTileLabel}>Total Income</Text>
              </View>
              <Text style={[styles.kpiTileAmount, { color: colors.income.text }]} numberOfLines={1}>
                +{formatRupees(kpis.totalIncome)}
              </Text>
              <View style={styles.momBadgeRow}>
                <View
                  style={[
                    styles.momBadge,
                    {
                      backgroundColor:
                        kpis.incomeChangePct >= 0 ? colors.income.bg : colors.slate[100],
                    },
                  ]}
                >
                  {kpis.incomeChangePct >= 0 ? (
                    <TrendingUp size={10} color={colors.income.text} />
                  ) : (
                    <TrendingDown size={10} color={colors.slate[600]} />
                  )}
                  <Text
                    style={[
                      styles.momBadgeText,
                      { color: kpis.incomeChangePct >= 0 ? colors.income.text : colors.slate[700] },
                    ]}
                  >
                    {kpis.incomeChangePct >= 0 ? '+' : ''}
                    {kpis.incomeChangePct}%
                  </Text>
                </View>
                <Text style={styles.momLabel}>{kpis.comparisonLabel}</Text>
              </View>
            </View>

            {/* Expense Tile */}
            <View style={styles.kpiTile}>
              <View style={styles.kpiTileHeader}>
                <View style={[styles.kpiTileDot, { backgroundColor: colors.expense.solid }]} />
                <Text style={styles.kpiTileLabel}>Total Expenses</Text>
              </View>
              <Text style={[styles.kpiTileAmount, { color: colors.expense.text }]} numberOfLines={1}>
                -{formatRupees(kpis.totalExpenses)}
              </Text>
              <View style={styles.momBadgeRow}>
                <View
                  style={[
                    styles.momBadge,
                    {
                      backgroundColor:
                        kpis.expenseChangePct <= 0 ? colors.income.bg : colors.expense.bg,
                    },
                  ]}
                >
                  {kpis.expenseChangePct <= 0 ? (
                    <TrendingDown size={10} color={colors.income.text} />
                  ) : (
                    <TrendingUp size={10} color={colors.expense.text} />
                  )}
                  <Text
                    style={[
                      styles.momBadgeText,
                      {
                        color: kpis.expenseChangePct <= 0 ? colors.income.text : colors.expense.text,
                      },
                    ]}
                  >
                    {kpis.expenseChangePct >= 0 ? '+' : ''}
                    {kpis.expenseChangePct}%
                  </Text>
                </View>
                <Text style={styles.momLabel}>{kpis.comparisonLabel}</Text>
              </View>
            </View>
          </View>

          {/* Savings Rate Progress Bar */}
          <View style={styles.savingsProgressWrap}>
            <View style={styles.savingsProgressHeader}>
              <Text style={styles.savingsProgressLabel}>Savings Performance Rate</Text>
              <Text style={styles.savingsProgressVal}>
                {kpis.savingsRate}% of income saved
              </Text>
            </View>
            <View style={styles.savingsProgressBarTrack}>
              <View
                style={[
                  styles.savingsProgressBarFill,
                  {
                    width: `${Math.max(2, Math.min(100, kpis.savingsRate))}%`,
                    backgroundColor:
                      kpis.savingsRate >= 30
                        ? colors.income.solid
                        : kpis.savingsRate >= 10
                        ? colors.brand[500]
                        : colors.slate[400],
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 3. Advanced Interactive Graphs */}
        {/* A. Income vs Expense Smooth Curved Line Chart */}
        <IncomeExpenseCurveChart
          transactions={transactions}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />

        {/* B & C. Dual Donut Breakdown Charts (Expenses & Income) */}
        <View style={isWide ? styles.chartGrid2Col : styles.stackCol}>
          <View style={styles.gridCol}>
            <ExpenseDonutChart
              transactions={transactions}
              categories={categories}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onSelectCategoryTransactions={handleInspectCategoryTransactions}
            />
          </View>
          <View style={styles.gridCol}>
            <IncomeDonutChart
              transactions={transactions}
              categories={categories}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onSelectCategoryTransactions={handleInspectCategoryTransactions}
            />
          </View>
        </View>

        {/* D. Monthly Financial Trends Bar Chart (6M & 12M Comparison) */}
        <MonthlyTrendsBarChart transactions={transactions} />

        {/* E. Savings & Balance Growth Area Chart */}
        <BalanceGrowthAreaChart
          transactions={transactions}
          currentBalance={actualCashBalance}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />

        {/* 4. Combined Financial Position & Net Worth Banner */}
        <View style={styles.netWorthCard}>
          <View style={styles.netWorthHeader}>
            <View style={styles.netWorthTitleRow}>
              <View style={styles.netWorthIconBox}>
                <Scale size={20} color={colors.overview.text} />
              </View>
              <View>
                <Text style={styles.netWorthLabel}>TOTAL NET WORTH</Text>
                <Text style={styles.netWorthSubtitle}>Finance + Khata Combined Position</Text>
              </View>
            </View>
            <View style={styles.netWorthBadge}>
              <Text style={styles.netWorthBadgeText}>Combined</Text>
            </View>
          </View>

          <Text
            style={[styles.netWorthAmount, isNarrowMobile && styles.netWorthAmountSmall]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRupees(netWorth)}
          </Text>

          {/* Dynamic Formula Calculation Breakdown */}
          <View style={styles.formulaRow}>
            <View style={styles.formulaItem}>
              <Text style={styles.formulaLabel}>Actual Cash</Text>
              <Text style={[styles.formulaValue, { color: colors.income.text }]}>
                {formatRupees(actualCashBalance)}
              </Text>
            </View>
            <Text style={styles.formulaOperator}>+</Text>
            <View style={styles.formulaItem}>
              <Text style={styles.formulaLabel}>Receivable</Text>
              <Text style={[styles.formulaValue, { color: colors.receivable.text }]}>
                {formatRupees(totalReceivable)}
              </Text>
            </View>
            <Text style={styles.formulaOperator}>-</Text>
            <View style={styles.formulaItem}>
              <Text style={styles.formulaLabel}>Payable</Text>
              <Text style={[styles.formulaValue, { color: colors.payable.text }]}>
                {formatRupees(totalPayable)}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Financial Position Asset/Liability Proportions */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.cardTitle}>Financial Position Breakdown</Text>
            <Text style={styles.cardSub}>Visual distribution of assets and liabilities</Text>
          </View>

          <View style={styles.barContainer}>
            <View style={[styles.barSegment, { flex: cashPct, backgroundColor: colors.income.solid }]} />
            <View style={[styles.barSegment, { flex: recPct, backgroundColor: colors.receivable.solid }]} />
            <View style={[styles.barSegment, { flex: payPct, backgroundColor: colors.payable.solid }]} />
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.income.solid }]} />
              <View>
                <Text style={styles.legendLabel}>Available Cash</Text>
                <Text style={styles.legendVal}>{formatRupees(actualCashBalance)}</Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.receivable.solid }]} />
              <View>
                <Text style={styles.legendLabel}>Receivable (Khata)</Text>
                <Text style={styles.legendVal}>{formatRupees(totalReceivable)}</Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.payable.solid }]} />
              <View>
                <Text style={styles.legendLabel}>Payable (Khata)</Text>
                <Text style={styles.legendVal}>{formatRupees(totalPayable)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 6. Recent Khata Activity Section */}
        <View style={styles.khataSectionCard}>
          <View style={styles.khataSectionHeader}>
            <View style={styles.khataHeaderLeft}>
              <View style={styles.khataHeaderIconBox}>
                <BookOpen size={18} color={colors.brand[600]} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Recent Khata Activity</Text>
                <Text style={styles.sectionSub}>Recent credit, debt & repayments</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewAllKhataBtn}
              onPress={() => setCurrentMode('khata_book')}
              activeOpacity={0.8}
            >
              <Text style={styles.viewAllKhataText}>View All Khata</Text>
              <ChevronRight size={14} color={colors.brand[600]} />
            </TouchableOpacity>
          </View>

          {recentKhataActivity.length === 0 ? (
            <View style={styles.emptyKhataBox}>
              <HandCoins size={32} color={colors.slate[300]} />
              <Text style={styles.emptyKhataTitle}>No Khata records yet</Text>
              <Text style={styles.emptyKhataSub}>
                Lend or borrow money from contacts to start tracking dues.
              </Text>
            </View>
          ) : (
            <View style={styles.khataList}>
              {recentKhataActivity.map((record) => {
                const isCredit = record.type === 'credit';
                return (
                  <View key={record.id} style={styles.khataItem}>
                    <View style={styles.khataItemLeft}>
                      <View
                        style={[
                          styles.khataItemIconBox,
                          { backgroundColor: isCredit ? colors.receivable.bg : colors.payable.bg },
                        ]}
                      >
                        {isCredit ? (
                          <ArrowDownLeft size={16} color={colors.receivable.text} />
                        ) : (
                          <ArrowUpRight size={16} color={colors.payable.text} />
                        )}
                      </View>
                      <View style={styles.khataItemInfo}>
                        <Text style={styles.khataItemName} numberOfLines={1}>
                          {record.counterpartName}
                        </Text>
                        <Text style={styles.khataItemDate}>
                          {formatDate(record.transactionDate || record.createdAt)}
                          {record.dueDate ? ` • Due: ${formatDate(record.dueDate)}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.khataItemRight}>
                      <Text
                        style={[
                          styles.khataItemAmount,
                          { color: isCredit ? colors.receivable.text : colors.payable.text },
                        ]}
                      >
                        {isCredit ? '+' : '-'} {formatRupees(record.remainingAmount || record.originalAmount)}
                      </Text>
                      <View
                        style={[
                          styles.khataStatusBadge,
                          {
                            backgroundColor:
                              record.status === 'settled'
                                ? colors.income.bg
                                : record.status === 'overdue'
                                ? colors.expense.bg
                                : colors.slate[100],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.khataStatusText,
                            {
                              color:
                                record.status === 'settled'
                                  ? colors.income.text
                                  : record.status === 'overdue'
                                  ? colors.expense.text
                                  : colors.slate[700],
                            },
                          ]}
                        >
                          {record.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 7. Accounts Grid */}
        <View style={styles.accountsCard}>
          <View style={styles.accountsHeader}>
            <View>
              <Text style={styles.cardTitle}>Bank & Digital Wallets</Text>
              <Text style={styles.cardSub}>Liquid balances across accounts</Text>
            </View>
            <View style={styles.accountsActions}>
              <TouchableOpacity
                style={styles.transferBtn}
                onPress={onOpenTransfer}
                activeOpacity={0.8}
              >
                <ArrowRightLeft size={13} color={colors.brand[600]} />
                <Text style={styles.transferBtnText}>Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addAccountBtn}
                onPress={onAddAccount}
                activeOpacity={0.8}
              >
                <Plus size={13} color={colors.white} />
                <Text style={styles.addAccountBtnText}>Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.accountsGrid}>
            {accounts.map((acc) => (
              <View key={acc.id} style={styles.accountItem}>
                <View style={styles.accountIconBox}>{getAccountIcon(acc.type)}</View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={styles.accountBalance}>
                    {formatRupees(acc.currentBalance || 0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Custom Date Range Modal */}
      <CustomDateRangeModal
        visible={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        initialStartDate={dateRange.startDate}
        initialEndDate={dateRange.endDate}
        onApply={handleApplyCustomRange}
      />

      {/* Filtered Category Transactions Modal */}
      {drilldownCategory && (
        <AnalyticsTransactionModal
          visible={!!drilldownCategory}
          onClose={() => setDrilldownCategory(null)}
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          categoryId={drilldownCategory.id}
          categoryName={drilldownCategory.name}
          subcategoryName={drilldownCategory.subcategoryName}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onSelectTransaction={(tx) => {
            setDrilldownCategory(null);
            setInspectTx(tx);
          }}
        />
      )}

      {/* Full Transaction Details Inspection */}
      {inspectTx && (
        <TransactionDetailsModal
          visible={!!inspectTx}
          transaction={inspectTx}
          onClose={() => setInspectTx(null)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    paddingBottom: 40,
  },
  contentWide: {
    alignItems: 'center',
  },
  inner: {
    width: '100%',
  },
  innerWide: {
    width: '100%',
    maxWidth: 960,
  },
  filterSection: {
    marginBottom: 12,
  },
  analyticsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  analyticsTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analyticsMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.slate[900],
    letterSpacing: -0.3,
  },
  dateRangeSubtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
    fontWeight: '500',
  },
  customDateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  customDateTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
  },
  filterPillsScroll: {
    marginHorizontal: -4,
  },
  filterPillsContent: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  filterChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  filterChipActive: {
    backgroundColor: colors.slate[900],
    borderColor: colors.slate[900],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[600],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  kpiDashboardCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  kpiMainBox: {
    flex: 1,
  },
  kpiDividerVert: {
    width: 1,
    height: 48,
    backgroundColor: colors.slate[100],
    marginHorizontal: 12,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  kpiMainLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.6,
  },
  kpiMainAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.slate[900],
    letterSpacing: -0.4,
  },
  kpiMainSub: {
    fontSize: 10,
    color: colors.slate[400],
    marginTop: 2,
  },
  savingsRatePill: {
    backgroundColor: `${colors.income.solid}15`,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  savingsRateText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.income.text,
  },
  kpiBottomGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.slate[50],
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  kpiTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  kpiTileDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kpiTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[600],
  },
  kpiTileAmount: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  momBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  momBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  momBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  momLabel: {
    fontSize: 9,
    color: colors.slate[400],
  },
  savingsProgressWrap: {
    paddingTop: 8,
  },
  savingsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  savingsProgressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[500],
  },
  savingsProgressVal: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[800],
  },
  savingsProgressBarTrack: {
    height: 5,
    backgroundColor: colors.slate[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  savingsProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartGrid2Col: {
    flexDirection: 'row',
    gap: 12,
  },
  stackCol: {
    flexDirection: 'column',
    gap: 0,
  },
  gridCol: {
    flex: 1,
  },
  netWorthCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  netWorthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  netWorthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  netWorthIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.overview.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netWorthLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.overview.text,
    letterSpacing: 0.5,
  },
  netWorthSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
  },
  netWorthBadge: {
    backgroundColor: colors.overview.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  netWorthBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.overview.text,
  },
  netWorthAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.slate[900],
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  netWorthAmountSmall: {
    fontSize: 22,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  formulaItem: {
    alignItems: 'center',
  },
  formulaLabel: {
    fontSize: 9,
    color: colors.slate[400],
    fontWeight: '600',
    marginBottom: 2,
  },
  formulaValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  formulaOperator: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate[400],
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  breakdownHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate[900],
  },
  cardSub: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  barContainer: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.slate[100],
    marginBottom: 14,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 9,
    color: colors.slate[400],
    fontWeight: '600',
  },
  legendVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[800],
  },
  khataSectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  khataSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  khataHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  khataHeaderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${colors.brand[500]}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  sectionSub: {
    fontSize: 11,
    color: colors.slate[400],
  },
  viewAllKhataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${colors.brand[500]}12`,
  },
  viewAllKhataText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
  },
  emptyKhataBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyKhataTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[700],
    marginTop: 8,
  },
  emptyKhataSub: {
    fontSize: 11,
    color: colors.slate[400],
    textAlign: 'center',
    marginTop: 2,
  },
  khataList: {
    gap: 8,
  },
  khataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  khataItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  khataItemIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  khataItemInfo: {
    flex: 1,
  },
  khataItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  khataItemDate: {
    fontSize: 10,
    color: colors.slate[400],
    marginTop: 1,
  },
  khataItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  khataItemAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  khataStatusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  khataStatusText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  accountsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  accountsActions: {
    flexDirection: 'row',
    gap: 8,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${colors.brand[500]}12`,
  },
  transferBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.brand[600],
  },
  addAccountBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  accountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '48%',
    backgroundColor: colors.slate[50],
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[700],
  },
  accountBalance: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate[900],
    marginTop: 1,
  },
});
