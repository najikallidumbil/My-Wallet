import React from 'react';
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
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { MetricCard } from '../../components/rn/MetricCard';
import { CategoryIcon } from '../../components/rn/CategoryIcon';

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
    accounts,
    categorySpending,
  } = useWallet();

  const {
    actualCashBalance,
    totalReceivable,
    totalPayable,
    netWorth,
  } = combinedFinancialSummary;

  const khataNet = totalReceivable - totalPayable;

  // Visual Breakdown proportions
  const totalBar = Math.max(1, actualCashBalance + totalReceivable + totalPayable);
  const cashPct = Math.max(5, (actualCashBalance / totalBar) * 100);
  const recPct = Math.max(5, (totalReceivable / totalBar) * 100);
  const payPct = Math.max(5, (totalPayable / totalBar) * 100);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Net Worth Executive Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroLabel}>TOTAL NET WORTH</Text>
          <View style={styles.heroBadge}>
            <Scale size={12} color={colors.overview.text} />
            <Text style={styles.heroBadgeText}>Financial Equity</Text>
          </View>
        </View>

        <Text style={styles.heroAmount}>{formatRupees(netWorth)}</Text>
        <Text style={styles.heroSubtitle}>
          Actual Cash ({formatRupees(actualCashBalance)}) + Khata Net ({formatRupees(khataNet)})
        </Text>
      </View>

      {/* 2. Visual Financial Breakdown Bar */}
      <View style={styles.breakdownCard}>
        <Text style={styles.cardTitle}>Visual Asset & Liability Breakdown</Text>
        <View style={styles.barContainer}>
          <View style={[styles.barSegment, { flex: cashPct, backgroundColor: colors.income.solid }]} />
          <View style={[styles.barSegment, { flex: recPct, backgroundColor: colors.receivable.solid }]} />
          <View style={[styles.barSegment, { flex: payPct, backgroundColor: colors.payable.solid }]} />
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.income.solid }]} />
            <Text style={styles.legendText}>Cash: {formatRupees(actualCashBalance)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.receivable.solid }]} />
            <Text style={styles.legendText}>Receivable: {formatRupees(totalReceivable)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.payable.solid }]} />
            <Text style={styles.legendText}>Payable: {formatRupees(totalPayable)}</Text>
          </View>
        </View>
      </View>

      {/* 3. 4 Supporting Metric Cards */}
      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <MetricCard
            title="Actual Cash"
            amount={actualCashBalance}
            variant="income"
            subtitle="Money currently available"
            icon={<Wallet size={16} color={colors.income.text} />}
          />
        </View>
        <View style={styles.gridCol}>
          <MetricCard
            title="Khata Net Balance"
            amount={khataNet}
            variant={khataNet >= 0 ? 'receivable' : 'payable'}
            subtitle="Receivable - Payable"
            icon={<Scale size={16} color={khataNet >= 0 ? colors.receivable.text : colors.payable.text} />}
          />
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <MetricCard
            title="Total Receivable"
            amount={totalReceivable}
            variant="receivable"
            subtitle="Money others owe me"
            icon={<HandCoins size={16} color={colors.receivable.text} />}
          />
        </View>
        <View style={styles.gridCol}>
          <MetricCard
            title="Total Payable"
            amount={totalPayable}
            variant="payable"
            subtitle="Money I owe others"
            icon={<HandCoins size={16} color={colors.payable.text} />}
          />
        </View>
      </View>

      {/* 4. Multi-Account Balances */}
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
                <View>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  <Text style={styles.accountType}>
                    {acc.type.toUpperCase()} • Opening: {formatRupees(acc.openingBalance)}
                  </Text>
                </View>
              </View>

              <Text style={styles.accountBalance}>
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

      {/* 5. Expense Breakdown by Category */}
      {categorySpending.length > 0 && (
        <View style={styles.categoryCard}>
          <Text style={styles.sectionTitle}>Top Spending Categories</Text>
          <View style={styles.categoryList}>
            {categorySpending.slice(0, 5).map((cs) => (
              <View key={cs.categoryId} style={styles.catItem}>
                <View style={styles.catLeft}>
                  <View
                    style={[
                      styles.catIconBox,
                      { backgroundColor: `${cs.categoryColor}15` },
                    ]}
                  >
                    <CategoryIcon name={cs.categoryIcon} size={16} color={cs.categoryColor} />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName}>{cs.categoryName}</Text>
                    <Text style={styles.catPct}>{cs.percentage.toFixed(1)}% of total</Text>
                  </View>
                </View>

                <Text style={styles.catAmount}>{formatRupees(cs.totalAmount)}</Text>
              </View>
            ))}
          </View>
        </View>
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
    padding: 16,
    paddingBottom: 90,
    gap: 14,
  },
  heroCard: {
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
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overview.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.overview.text,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.overview.text,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 6,
    fontWeight: '500',
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[800],
    marginBottom: 10,
  },
  barContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.slate[100],
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.slate[600],
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  accountsCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  sectionSub: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand[100],
    gap: 4,
  },
  transferBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  accountList: {
    gap: 10,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 12,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 6,
  },
  addAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[600],
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 12,
  },
  categoryList: {
    gap: 8,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  catPct: {
    fontSize: 10,
    color: colors.slate[400],
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[900],
  },
});
