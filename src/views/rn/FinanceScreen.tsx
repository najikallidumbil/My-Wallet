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
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { MetricCard } from '../../components/rn/MetricCard';
import { CategoryIcon } from '../../components/rn/CategoryIcon';
import { Transaction } from '../../types';

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
  } = useWallet();

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { totalIncome, totalExpense, availableCashBalance } = incomeExpenseSummary;
  const { totalBudget, remainingBudget, percentage: spentPercentage } = budgetSummary;

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Main Available Balance Card */}
      <View style={styles.mainBalanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>AVAILABLE CASH BALANCE</Text>
          <View style={styles.balancePill}>
            <Wallet size={12} color={colors.income.text} />
            <Text style={styles.balancePillText}>Physical Cash</Text>
          </View>
        </View>
        <Text style={styles.balanceAmount}>{formatRupees(availableCashBalance)}</Text>
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
      <View style={styles.gridRow}>
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

      {/* 4. Monthly Budget Progress Card */}
      {totalBudget > 0 && (
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <View>
              <Text style={styles.budgetTitle}>Monthly Budget Cap</Text>
              <Text style={styles.budgetSub}>
                Remaining: {formatRupees(remainingBudget)}
              </Text>
            </View>
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
        </View>
      )}

      {/* 5. Filter & Search Bar */}
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

      {/* 6. Recent Transactions List */}
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
                >
                  {isInc ? '+' : '-'} {formatRupees(tx.amount)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
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
    padding: 16,
    paddingBottom: 90,
    gap: 14,
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
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
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
    fontWeight: '800',
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
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.slate[900],
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.slate[200],
  },
  filterTabActive: {
    backgroundColor: colors.brand[600],
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[600],
  },
  filterTabTextActive: {
    color: colors.white,
  },
  txListContainer: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.slate[400],
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
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
    flexWrap: 'wrap',
    marginTop: 2,
    gap: 4,
  },
  txDate: {
    fontSize: 11,
    color: colors.slate[400],
  },
  txMetaDot: {
    fontSize: 11,
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
    fontSize: 10,
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
