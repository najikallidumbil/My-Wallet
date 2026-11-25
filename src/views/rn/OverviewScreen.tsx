import React, { useMemo } from 'react';
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
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { MetricCard } from '../../components/rn/MetricCard';
import { useResponsive } from '../../lib/useResponsive';
import { IncomeExpenseBarChart } from '../../components/rn/charts/IncomeExpenseBarChart';
import { CashFlowLineChart } from '../../components/rn/charts/CashFlowLineChart';
import { CategoryDonutChart } from '../../components/rn/charts/CategoryDonutChart';
import { KhataAnalyticsChart } from '../../components/rn/charts/KhataAnalyticsChart';

interface OverviewScreenProps {
  onOpenTransfer: () => void;
  onAddAccount: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  onOpenTransfer,
  onAddAccount,
}) => {
  const {
    combinedFinancialSummary,
    khataSummary,
    accounts,
    categorySpending,
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

  // Visual Breakdown proportions for Financial Position Bar
  const totalBar = Math.max(1, Math.abs(actualCashBalance) + totalReceivable + totalPayable);
  const cashPct = Math.max(8, (Math.max(0, actualCashBalance) / totalBar) * 100);
  const recPct = Math.max(8, (totalReceivable / totalBar) * 100);
  const payPct = Math.max(8, (totalPayable / totalBar) * 100);

  // Recent Khata Activity (Credit, Debt, Repayments)
  const recentKhataActivity = useMemo(() => {
    return [...creditDebtRecords]
      .sort(
        (a, b) =>
          new Date(b.transactionDate || b.createdAt).getTime() -
          new Date(a.transactionDate || a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [creditDebtRecords]);

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

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue || status === 'overdue') {
      return {
        bg: colors.expense.bg,
        text: colors.expense.text,
        label: 'Overdue',
      };
    }
    switch (status) {
      case 'settled':
        return {
          bg: colors.income.bg,
          text: colors.income.text,
          label: 'Fully Settled',
        };
      case 'partial':
        return {
          bg: colors.payable.bg,
          text: colors.payable.text,
          label: 'Partially Paid',
        };
      default:
        return {
          bg: colors.slate[100],
          text: colors.slate[700],
          label: 'Pending',
        };
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
    >
      <View style={isWide ? styles.innerWide : styles.inner}>
        {/* 1. Main Net Worth Executive Banner */}
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

        {/* 2. Visual Financial Overview: The 4 Core Metric Cards */}
        <View style={isNarrowMobile ? styles.stackCol : (isWide ? styles.grid4Col : styles.grid2Col)}>
          {/* Card 1: Available Money (Actual Cash) */}
          <View style={styles.gridCol}>
            <MetricCard
              title="Available Money"
              amount={actualCashBalance}
              variant="income"
              subtitle="Cash & bank balance"
              icon={<Wallet size={16} color={colors.income.text} />}
            />
          </View>

          {/* Card 2: Money to Receive (Receivable) */}
          <View style={styles.gridCol}>
            <MetricCard
              title="Money to Receive"
              amount={totalReceivable}
              variant="receivable"
              subtitle="Others owe you (Khata)"
              icon={<ArrowDownLeft size={16} color={colors.receivable.text} />}
            />
          </View>

          {/* Card 3: Money to Pay (Payable) */}
          <View style={styles.gridCol}>
            <MetricCard
              title="Money to Pay"
              amount={totalPayable}
              variant="payable"
              subtitle="You owe others (Khata)"
              icon={<ArrowUpRight size={16} color={colors.payable.text} />}
            />
          </View>

          {/* Card 4: Total Net Worth */}
          <View style={styles.gridCol}>
            <MetricCard
              title="Total Net Worth"
              amount={netWorth}
              variant="overview"
              subtitle="Cash + Receive - Pay"
              icon={<Scale size={16} color={colors.overview.text} />}
            />
          </View>
        </View>

        {/* 3. Financial Position - Visual Asset & Liability Proportions */}
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
                <Text style={styles.legendLabel}>Receivable (Owed to You)</Text>
                <Text style={styles.legendVal}>{formatRupees(totalReceivable)}</Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.payable.solid }]} />
              <View>
                <Text style={styles.legendLabel}>Payable (You Owe)</Text>
                <Text style={styles.legendVal}>{formatRupees(totalPayable)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Graphs and Charts Section */}
        {/* A. Income vs Expense Bar Chart & Monthly Cash Flow */}
        <View style={isWide ? styles.chartGrid2Col : styles.stackCol}>
          <View style={styles.gridCol}>
            <IncomeExpenseBarChart transactions={transactions} />
          </View>
          <View style={styles.gridCol}>
            <CashFlowLineChart transactions={transactions} initialBalance={actualCashBalance} />
          </View>
        </View>

        {/* B. Credit vs Debt Analytics Chart & Category Donut */}
        <View style={isWide ? styles.chartGrid2Col : styles.stackCol}>
          <View style={styles.gridCol}>
            <KhataAnalyticsChart
              totalReceivable={totalReceivable}
              totalPayable={totalPayable}
              overdueCount={khataSummary.overdueCount}
            />
          </View>
          <View style={styles.gridCol}>
            <CategoryDonutChart categorySpending={categorySpending} />
          </View>
        </View>

        {/* 5. Recent Khata Activity Section (Dedicated for Khata Book on Overview) */}
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
                Give (Credit) or Borrow (Debt) transactions will show here with live pending balances.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCurrentMode('khata_book')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionBtnText}>Open Khata Book</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.khataList}>
              {recentKhataActivity.map((rec) => {
                const isCredit = rec.type === 'credit';
                const isOverdue = rec.status === 'overdue';
                const statusBadge = getStatusBadge(rec.status, isOverdue);
                const remaining = rec.remainingAmount ?? (rec.originalAmount - (rec.settledAmount || 0));

                return (
                  <View key={rec.id} style={styles.khataItem}>
                    <View style={styles.khataItemLeft}>
                      <View
                        style={[
                          styles.khataItemIconBox,
                          isCredit ? styles.iconBoxCredit : styles.iconBoxDebt,
                        ]}
                      >
                        {isCredit ? (
                          <ArrowDownLeft size={16} color={colors.receivable.solid} />
                        ) : (
                          <ArrowUpRight size={16} color={colors.payable.solid} />
                        )}
                      </View>

                      <View style={styles.khataItemInfo}>
                        <View style={styles.khataItemTopRow}>
                          <Text style={styles.khataPersonName} numberOfLines={1}>
                            {rec.counterpartName}
                          </Text>
                          <View
                            style={[
                              styles.khataTypePill,
                              isCredit ? styles.typePillCredit : styles.typePillDebt,
                            ]}
                          >
                            <Text
                              style={[
                                styles.khataTypePillText,
                                isCredit ? styles.typePillTextCredit : styles.typePillTextDebt,
                              ]}
                            >
                              {isCredit ? 'Credit (Lent)' : 'Debt (Borrowed)'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.khataMetaRow}>
                          <Text style={styles.khataDateText}>
                            {formatDate(rec.transactionDate || rec.createdAt)}
                          </Text>
                          {rec.dueDate && (
                            <>
                              <Text style={styles.khataMetaDot}>•</Text>
                              <Text
                                style={[
                                  styles.khataDueDateText,
                                  isOverdue && styles.khataDueDateOverdue,
                                ]}
                              >
                                Due: {rec.dueDate}
                              </Text>
                            </>
                          )}
                          {rec.settledAmount && rec.settledAmount > 0 ? (
                            <>
                              <Text style={styles.khataMetaDot}>•</Text>
                              <Text style={styles.khataSettledText}>
                                Paid: {formatRupees(rec.settledAmount)}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.khataItemRight}>
                      <Text
                        style={[
                          styles.khataRemainingAmount,
                          isCredit ? styles.amountReceivable : styles.amountPayable,
                        ]}
                        numberOfLines={1}
                      >
                        {formatRupees(remaining)}
                      </Text>
                      <View
                        style={[
                          styles.khataStatusBadge,
                          { backgroundColor: statusBadge.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.khataStatusText,
                            { color: statusBadge.text },
                          ]}
                        >
                          {statusBadge.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 6. Multi-Account Balances */}
        <View style={styles.accountsCard}>
          <View style={styles.accountsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Accounts & Wallets</Text>
              <Text style={styles.sectionSub}>Real-time balance per account</Text>
            </View>

            <TouchableOpacity
              style={styles.transferBtn}
              onPress={onOpenTransfer}
              activeOpacity={0.8}
            >
              <ArrowRightLeft size={14} color={colors.brand[600]} />
              <Text style={styles.transferBtnText}>Transfer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accountList}>
            {accounts.map((acc) => (
              <View key={acc.id} style={styles.accountItem}>
                <View style={styles.accountLeft}>
                  <View
                    style={[
                      styles.accountIconBox,
                      { backgroundColor: acc.color ? `${acc.color}15` : colors.slate[100] },
                    ]}
                  >
                    {getAccountIcon(acc.type)}
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName} numberOfLines={1}>
                      {acc.name}
                    </Text>
                    <Text style={styles.accountType}>
                      {acc.type.toUpperCase()} • Opening: {formatRupees(acc.openingBalance)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.accountBalance} numberOfLines={1}>
                  {formatRupees(acc.currentBalance)}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addAccountBtn}
            onPress={onAddAccount}
            activeOpacity={0.7}
          >
            <Plus size={16} color={colors.slate[600]} />
            <Text style={styles.addAccountText}>Add New Bank Account or Wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    paddingBottom: 90,
  },
  contentWide: {
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    gap: 14,
  },
  innerWide: {
    width: '100%',
    maxWidth: 1100,
    gap: 16,
  },
  netWorthCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.overview.border,
    shadowColor: colors.overview.solid,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  netWorthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  netWorthSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
    fontWeight: '500',
  },
  netWorthBadge: {
    backgroundColor: colors.overview.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  netWorthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.overview.text,
  },
  netWorthAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.overview.text,
    letterSpacing: -1,
    marginVertical: 4,
  },
  netWorthAmountSmall: {
    fontSize: 26,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  formulaItem: {
    alignItems: 'center',
    flex: 1,
  },
  formulaLabel: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '600',
    marginBottom: 2,
  },
  formulaValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  formulaOperator: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[400],
    paddingHorizontal: 4,
  },
  stackCol: {
    gap: 12,
  },
  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  grid4Col: {
    flexDirection: 'row',
    gap: 12,
  },
  chartGrid2Col: {
    flexDirection: 'row',
    gap: 14,
  },
  gridCol: {
    flex: 1,
    minWidth: 140,
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 12,
  },
  breakdownHeader: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  cardSub: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '500',
  },
  barContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.slate[100],
    gap: 2,
  },
  barSegment: {
    height: '100%',
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '600',
  },
  legendVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate[800],
  },
  khataSectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 12,
  },
  khataSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  khataHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  khataHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
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
    color: colors.slate[500],
    fontWeight: '500',
  },
  viewAllKhataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  viewAllKhataText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  emptyKhataBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyKhataTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[700],
    marginTop: 4,
  },
  emptyKhataSub: {
    fontSize: 12,
    color: colors.slate[400],
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  emptyActionBtn: {
    marginTop: 8,
    backgroundColor: colors.brand[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  khataList: {
    gap: 8,
  },
  khataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
    gap: 8,
  },
  khataItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  khataItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxCredit: {
    backgroundColor: colors.receivable.bg,
  },
  iconBoxDebt: {
    backgroundColor: colors.payable.bg,
  },
  khataItemInfo: {
    flex: 1,
  },
  khataItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  khataPersonName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[900],
  },
  khataTypePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  typePillCredit: {
    backgroundColor: colors.receivable.bg,
  },
  typePillDebt: {
    backgroundColor: colors.payable.bg,
  },
  khataTypePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  typePillTextCredit: {
    color: colors.receivable.text,
  },
  typePillTextDebt: {
    color: colors.payable.text,
  },
  khataMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  khataDateText: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '500',
  },
  khataMetaDot: {
    fontSize: 10,
    color: colors.slate[400],
  },
  khataDueDateText: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '500',
  },
  khataDueDateOverdue: {
    color: colors.expense.text,
    fontWeight: '700',
  },
  khataSettledText: {
    fontSize: 10,
    color: colors.income.text,
    fontWeight: '600',
  },
  khataItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  khataRemainingAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  amountReceivable: {
    color: colors.receivable.text,
  },
  amountPayable: {
    color: colors.payable.text,
  },
  khataStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  khataStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  accountsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 12,
  },
  accountsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  transferBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[600],
  },
  accountList: {
    gap: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  accountType: {
    fontSize: 10,
    color: colors.slate[400],
    marginTop: 1,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 6,
    marginTop: 4,
  },
  addAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[600],
  },
});
