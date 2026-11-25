import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PlusCircle,
  MinusCircle,
  Paperclip,
  Search,
  Target,
  AlertTriangle,
  AlertCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { MetricCard } from '../../components/rn/MetricCard';
import { CategoryIcon } from '../../components/rn/CategoryIcon';
import { Transaction } from '../../types';
import { useResponsive } from '../../lib/useResponsive';
import { IncomeExpenseBarChart } from '../../components/rn/charts/IncomeExpenseBarChart';
import { CashFlowLineChart } from '../../components/rn/charts/CashFlowLineChart';
import { BudgetModal } from '../../components/rn/BudgetModal';

interface FinanceScreenProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({
  onAddIncome,
  onAddExpense,
  onSelectTransaction,
}) => {
  const {
    transactions,
    categories,
    accounts,
    incomeExpenseSummary,
    budgetSummary,
    selectedBudgetMonth,
    setSelectedBudgetMonth,
  } = useWallet();

  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { totalIncome, totalExpense, availableCashBalance } = incomeExpenseSummary;
  const { totalBudget, totalSpent, remainingBudget, percentage: spentPercentage } = budgetSummary;

  const getMonthLabel = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedBudgetMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    setSelectedBudgetMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedBudgetMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    setSelectedBudgetMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Filtered transactions for Mode 1 (Mode 1 must only display income & expense)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(q);
        const matchesDesc = tx.description?.toLowerCase().includes(q);
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getAccount = (id?: string) => accounts.find((a) => a.id === id);

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
        {/* 1. Main Available Balance Card */}
        <View style={styles.mainBalanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>AVAILABLE CASH BALANCE</Text>
            <View style={styles.balancePill}>
              <Wallet size={12} color={colors.income.text} />
              <Text style={styles.balancePillText}>Physical Cash</Text>
            </View>
          </View>
          <Text
            style={[styles.balanceAmount, isNarrowMobile && styles.balanceAmountSmall]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRupees(availableCashBalance)}
          </Text>
          <Text style={styles.balanceSubtitle}>
            Opening Balance + Total Income - Total Expense
          </Text>
        </View>

        {/* 2. Quick Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.incomeBtn]}
            onPress={onAddIncome}
            activeOpacity={0.8}
          >
            <PlusCircle size={18} color={colors.white} />
            <Text style={styles.actionBtnText}>Add Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.expenseBtn]}
            onPress={onAddExpense}
            activeOpacity={0.8}
          >
            <MinusCircle size={18} color={colors.white} />
            <Text style={styles.actionBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Income & Expense Dual Metric Cards */}
        <View style={isNarrowMobile ? styles.stackCol : styles.gridRow}>
          <View style={styles.gridCol}>
            <MetricCard
              title="Total Income"
              amount={totalIncome}
              variant="income"
              subtitle="Money received"
              icon={<TrendingUp size={16} color={colors.income.text} />}
            />
          </View>
          <View style={styles.gridCol}>
            <MetricCard
              title="Total Expense"
              amount={totalExpense}
              variant="expense"
              subtitle="Money spent"
              icon={<TrendingDown size={16} color={colors.expense.text} />}
            />
          </View>
        </View>

        {/* 4. Monthly Budget Section (Fully Editable, with 80% & 100% Alerts) */}
        {totalBudget === 0 ? (
          <View style={styles.budgetEmptyCard}>
            <View style={styles.budgetEmptyHeader}>
              <View style={styles.budgetEmptyIcon}>
                <Target size={22} color={colors.brand[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.budgetEmptyTitle}>Set Your Monthly Budget</Text>
                <Text style={styles.budgetEmptySub}>
                  Set an expense target for {getMonthLabel(selectedBudgetMonth)} to track spending limits and get warnings.
                </Text>
              </View>
            </View>

            <View style={styles.budgetEmptyActionRow}>
              <View style={styles.budgetMonthPill}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthPillBtn} activeOpacity={0.7}>
                  <ChevronLeft size={16} color={colors.slate[600]} />
                </TouchableOpacity>
                <Text style={styles.monthPillText}>{getMonthLabel(selectedBudgetMonth)}</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthPillBtn} activeOpacity={0.7}>
                  <ChevronRight size={16} color={colors.slate[600]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.setBudgetBtn}
                onPress={() => setIsBudgetModalOpen(true)}
                activeOpacity={0.8}
              >
                <Target size={15} color={colors.white} />
                <Text style={styles.setBudgetBtnText}>Set Monthly Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetMonthControl}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthPillBtn} activeOpacity={0.7}>
                  <ChevronLeft size={16} color={colors.slate[700]} />
                </TouchableOpacity>
                <Text style={styles.budgetTitle}>{getMonthLabel(selectedBudgetMonth)} Budget</Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthPillBtn} activeOpacity={0.7}>
                  <ChevronRight size={16} color={colors.slate[700]} />
                </TouchableOpacity>
              </View>

              <View style={styles.budgetHeaderRight}>
                <View
                  style={[
                    styles.budgetBadge,
                    spentPercentage >= 100
                      ? styles.budgetBadgeDanger
                      : spentPercentage >= 80
                      ? styles.budgetBadgeWarning
                      : styles.budgetBadgeNormal,
                  ]}
                >
                  <Text
                    style={[
                      styles.budgetBadgeText,
                      spentPercentage >= 100
                        ? styles.budgetBadgeTextDanger
                        : spentPercentage >= 80
                        ? styles.budgetBadgeTextWarning
                        : styles.budgetBadgeTextNormal,
                    ]}
                  >
                    {Math.round(spentPercentage)}% Used
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editBudgetIconBtn}
                  onPress={() => setIsBudgetModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <Edit3 size={15} color={colors.brand[600]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 4 Values: Monthly Budget, Total Expenses, Remaining Budget, Percentage Used */}
            <View style={styles.budgetMetricsRow}>
              <View style={styles.budgetMetricItem}>
                <Text style={styles.budgetMetricLabel}>Monthly Budget</Text>
                <Text style={styles.budgetMetricVal}>{formatRupees(totalBudget)}</Text>
              </View>
              <View style={styles.budgetMetricItem}>
                <Text style={styles.budgetMetricLabel}>Total Expenses</Text>
                <Text style={[styles.budgetMetricVal, { color: colors.expense.text }]}>
                  {formatRupees(totalSpent)}
                </Text>
              </View>
              <View style={styles.budgetMetricItem}>
                <Text style={styles.budgetMetricLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.budgetMetricVal,
                    { color: remainingBudget >= 0 ? colors.income.text : colors.expense.text },
                  ]}
                >
                  {formatRupees(remainingBudget)}
                </Text>
              </View>
              <View style={styles.budgetMetricItem}>
                <Text style={styles.budgetMetricLabel}>Used</Text>
                <Text style={styles.budgetMetricVal}>{Math.round(spentPercentage)}%</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(2, spentPercentage))}%`,
                    backgroundColor:
                      spentPercentage >= 100
                        ? colors.expense.solid
                        : spentPercentage >= 80
                        ? colors.payable.solid
                        : colors.income.solid,
                  },
                ]}
              />
            </View>

            {/* Threshold Warnings */}
            {spentPercentage >= 100 && (
              <View style={styles.budgetAlertDanger}>
                <AlertCircle size={14} color={colors.expense.text} />
                <Text style={styles.budgetAlertTextDanger}>
                  Budget Exceeded: Over budget by {formatRupees(Math.abs(remainingBudget))}
                </Text>
              </View>
            )}
            {spentPercentage >= 80 && spentPercentage < 100 && (
              <View style={styles.budgetAlertWarning}>
                <AlertTriangle size={14} color={colors.payable.text} />
                <Text style={styles.budgetAlertTextWarning}>
                  Budget Alert: 80%+ limit reached. Remaining: {formatRupees(remainingBudget)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 5. Responsive Charts */}
        <View style={isWide ? styles.chartGrid2Col : styles.stackCol}>
          <View style={styles.gridCol}>
            <IncomeExpenseBarChart transactions={transactions} />
          </View>
          <View style={styles.gridCol}>
            <CashFlowLineChart transactions={transactions} initialBalance={availableCashBalance} />
          </View>
        </View>

        {/* 6. Filter & Search Bar */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.slate[400]} />
            <TextInput
              placeholder="Search transactions..."
              placeholderTextColor={colors.slate[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
              onPress={() => setFilterType('all')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterType === 'all' && styles.filterTabTextActive,
                ]}
              >
                All ({transactions.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterType === 'income' && styles.filterTabActive]}
              onPress={() => setFilterType('income')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterType === 'income' && styles.filterTabTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterType === 'expense' && styles.filterTabActive]}
              onPress={() => setFilterType('expense')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterType === 'expense' && styles.filterTabTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Recent Transactions List */}
        <View style={styles.txListContainer}>
          <Text style={styles.sectionTitle}>
            Transactions ({filteredTransactions.length})
          </Text>

          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {transactions.length === 0
                  ? 'No transactions recorded yet. Tap "Add Income" or "Add Expense" to get started.'
                  : 'No transactions matched your active filters.'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const isInc = tx.type === 'income';
              const cat = getCategory(tx.categoryId);
              const acc = getAccount(tx.accountId);

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txItem}
                  onPress={() => onSelectTransaction(tx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconBox,
                        { backgroundColor: cat?.color ? `${cat.color}15` : colors.slate[100] },
                      ]}
                    >
                      <CategoryIcon
                        name={cat?.icon}
                        size={18}
                        color={cat?.color || colors.slate[600]}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <View style={styles.txMeta}>
                        <Text style={styles.txDate}>{formatDate(tx.transactionDate)}</Text>
                        {tx.transactionTime && (
                          <Text style={styles.txMetaDot}>• {tx.transactionTime}</Text>
                        )}
                        {acc && <Text style={styles.txMetaDot}>• {acc.name}</Text>}
                        {tx.attachments && tx.attachments.length > 0 && (
                          <View style={styles.attachPill}>
                            <Paperclip size={10} color={colors.slate[500]} />
                            <Text style={styles.attachText}>{tx.attachments.length}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.txAmount,
                      isInc ? styles.txAmountIncome : styles.txAmountExpense,
                    ]}
                    numberOfLines={1}
                  >
                    {isInc ? '+' : '-'} {formatRupees(tx.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      <BudgetModal
        visible={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        initialMonth={selectedBudgetMonth}
      />
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
  mainBalanceCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.income.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  balancePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.slate[900],
    letterSpacing: -1,
  },
  balanceAmountSmall: {
    fontSize: 24,
  },
  balanceSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 6,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  incomeBtn: {
    backgroundColor: colors.income.solid,
  },
  expenseBtn: {
    backgroundColor: colors.expense.solid,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  stackCol: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chartGrid2Col: {
    flexDirection: 'row',
    gap: 14,
  },
  gridCol: {
    flex: 1,
  },
  budgetEmptyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderStyle: 'dashed',
    gap: 14,
  },
  budgetEmptyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  budgetEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetEmptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  budgetEmptySub: {
    fontSize: 12,
    color: colors.slate[500],
    lineHeight: 16,
    marginTop: 2,
  },
  budgetEmptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  budgetMonthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  monthPillBtn: {
    padding: 6,
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
    paddingHorizontal: 4,
  },
  setBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[600],
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  setBudgetBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  budgetMonthControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  budgetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBudgetIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
  },
  budgetMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  budgetMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  budgetMetricLabel: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '600',
    marginBottom: 2,
  },
  budgetMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[800],
  },
  budgetAlertDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.expense.bg,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    marginTop: 8,
  },
  budgetAlertTextDanger: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.expense.text,
    flex: 1,
  },
  budgetAlertWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.payable.bg,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    marginTop: 8,
  },
  budgetAlertTextWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.payable.text,
    flex: 1,
  },
  budgetCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  budgetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[800],
  },
  budgetSub: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '600',
    marginTop: 2,
  },
  budgetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  budgetBadgeNormal: {
    backgroundColor: colors.income.bg,
  },
  budgetBadgeWarning: {
    backgroundColor: colors.payable.bg,
  },
  budgetBadgeDanger: {
    backgroundColor: colors.expense.bg,
  },
  budgetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  budgetBadgeTextNormal: {
    color: colors.income.text,
  },
  budgetBadgeTextWarning: {
    color: colors.payable.text,
  },
  budgetBadgeTextDanger: {
    color: colors.expense.text,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.slate[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  filterSection: {
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.slate[900],
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.slate[200],
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[600],
  },
  filterTabTextActive: {
    fontWeight: '800',
    color: colors.slate[900],
  },
  txListContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  emptyContainer: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  emptyText: {
    fontSize: 12,
    color: colors.slate[400],
    textAlign: 'center',
    lineHeight: 18,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  txDate: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '500',
  },
  txMetaDot: {
    fontSize: 10,
    color: colors.slate[400],
  },
  attachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  attachText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.slate[600],
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountIncome: {
    color: colors.income.text,
  },
  txAmountExpense: {
    color: colors.expense.text,
  },
});
