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
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  Search,
  MessageCircle,
  Phone,
  AlertTriangle,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { MetricCard } from '../../components/rn/MetricCard';
import { PersonSummary } from '../../types';

interface KhataScreenProps {
  onLendMoney: () => void;
  onReceiveMoney: () => void;
  onBorrowMoney: () => void;
  onRepayMoney: () => void;
  onAddPerson: () => void;
  onSelectPerson: (personSummary: PersonSummary) => void;
}

export const KhataScreen: React.FC<KhataScreenProps> = ({
  onLendMoney,
  onReceiveMoney,
  onBorrowMoney,
  onRepayMoney,
  onAddPerson,
  onSelectPerson,
}) => {
  const {
    personSummaries,
    khataSummary,
  } = useWallet();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'receivable' | 'payable'>('all');

  const {
    totalReceivable,
    totalPayable,
    netKhataBalance: netBalance,
    overdueCount,
  } = khataSummary;

  // Filter people by search & receivable/payable status
  const filteredPeople = useMemo(() => {
    return personSummaries.filter((p) => {
      if (filterMode === 'receivable' && p.netBalance <= 0) return false;
      if (filterMode === 'payable' && p.netBalance >= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = p.phone ? p.phone.includes(q) : false;
        return matchesName || matchesPhone;
      }
      return true;
    });
  }, [personSummaries, filterMode, searchQuery]);

  const handleWhatsApp = (p: PersonSummary) => {
    if (!p.phone) {
      alert(`No phone number saved for ${p.name}. Please edit person to add phone.`);
      return;
    }
    const cleanPhone = p.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const amountStr = formatRupees(Math.abs(p.netBalance));
    const msg =
      p.netBalance > 0
        ? `Hi ${p.name}, friendly reminder regarding the outstanding balance of ${amountStr} with My Wallet. Please arrange repayment when convenient. Thank you!`
        : `Hi ${p.name}, update from My Wallet regarding the pending balance of ${amountStr}. Please let me know your preferred repayment mode. Thank you!`;

    const url = `whatsapp://send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      // Fallback to web link
      Linking.openURL(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`);
    });
  };

  const handleSMS = (p: PersonSummary) => {
    if (!p.phone) {
      alert(`No phone number saved for ${p.name}.`);
      return;
    }
    const cleanPhone = p.phone.replace(/[^0-9]/g, '');
    const amountStr = formatRupees(Math.abs(p.netBalance));
    const msg = `Hi ${p.name}, reminder regarding the outstanding balance of ${amountStr}. Thank you.`;
    Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Quick Action Grid */}
      <View style={styles.actionGrid}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.lendBtn]}
            onPress={onLendMoney}
            activeOpacity={0.8}
          >
            <ArrowUpRight size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Give (Lend)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.receiveBtn]}
            onPress={onReceiveMoney}
            activeOpacity={0.8}
          >
            <ArrowDownLeft size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Receive Money</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.borrowBtn]}
            onPress={onBorrowMoney}
            activeOpacity={0.8}
          >
            <ArrowDownLeft size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Borrow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.repayBtn]}
            onPress={onRepayMoney}
            activeOpacity={0.8}
          >
            <ArrowUpRight size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Repay Money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.personBtn]}
            onPress={onAddPerson}
            activeOpacity={0.8}
          >
            <UserPlus size={16} color={colors.slate[700]} />
            <Text style={[styles.actionBtnText, styles.personBtnText]}>+ Person</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 4 Executive KPI Cards */}
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

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <MetricCard
            title="Khata Net Balance"
            amount={netBalance}
            variant={netBalance >= 0 ? 'receivable' : 'payable'}
            subtitle={netBalance >= 0 ? 'Net to receive' : 'Net to pay'}
          />
        </View>
        <View style={styles.gridCol}>
          <View style={[styles.card, overdueCount > 0 && styles.cardOverdue]}>
            <View style={styles.overdueHeader}>
              <Text style={styles.overdueTitle}>OVERDUE REMINDERS</Text>
              {overdueCount > 0 ? (
                <AlertTriangle size={16} color={colors.expense.solid} />
              ) : (
                <HandCoins size={16} color={colors.income.solid} />
              )}
            </View>
            <Text
              style={[
                styles.overdueAmount,
                overdueCount > 0 ? styles.textOverdue : styles.textGood,
              ]}
            >
              {overdueCount} Pending
            </Text>
            <Text style={styles.overdueSub}>
              {overdueCount > 0
                ? 'Unsettled records past due'
                : 'All dues on track'}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Search & Filter Bar */}
      <View style={styles.filterSection}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.slate[400]} />
          <TextInput
            placeholder="Search person by name or phone..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
            onPress={() => setFilterMode('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterMode === 'all' && styles.filterTabTextActive,
              ]}
            >
              All Ledgers ({personSummaries.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'receivable' && styles.filterTabActive]}
            onPress={() => setFilterMode('receivable')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterMode === 'receivable' && styles.filterTabTextActive,
              ]}
            >
              You'll Get
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === 'payable' && styles.filterTabActive]}
            onPress={() => setFilterMode('payable')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterMode === 'payable' && styles.filterTabTextActive,
              ]}
            >
              You'll Pay
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Customer Ledgers List */}
      <View style={styles.ledgerContainer}>
        <Text style={styles.sectionTitle}>
          Customer & Friend Ledgers ({filteredPeople.length})
        </Text>

        {filteredPeople.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No people found. Click "Person" to start tracking a customer or friend ledger.
            </Text>
          </View>
        ) : (
          filteredPeople.map((p) => {
            const isRec = p.netBalance > 0;
            const isPay = p.netBalance < 0;

            return (
              <TouchableOpacity
                key={p.id}
                style={styles.personCard}
                onPress={() => onSelectPerson(p)}
                activeOpacity={0.7}
              >
                {/* Person Header */}
                <View style={styles.personHeader}>
                  <View style={styles.personLeft}>
                    <View style={styles.avatarBox}>
                      <Text style={styles.avatarText}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.personName}>{p.name}</Text>
                      <Text style={styles.personPhone}>{p.phone || 'No phone'}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isRec
                        ? styles.pillRec
                        : isPay
                        ? styles.pillPay
                        : styles.pillSettled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isRec
                          ? styles.statusTextRec
                          : isPay
                          ? styles.statusTextPay
                          : styles.statusTextSettled,
                      ]}
                    >
                      {isRec ? "You'll Get" : isPay ? "You'll Pay" : 'Settled'}
                    </Text>
                  </View>
                </View>

                {/* Outstanding Balance */}
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceTitle}>Outstanding Balance</Text>
                  <Text
                    style={[
                      styles.personBalanceAmount,
                      isRec
                        ? styles.textRec
                        : isPay
                        ? styles.textPay
                        : styles.textSettled,
                    ]}
                  >
                    {formatRupees(Math.abs(p.netBalance))}
                  </Text>
                </View>

                {/* 4 Metrics Strip */}
                <View style={styles.metricStrip}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Given</Text>
                    <Text style={styles.metricVal}>{formatRupees(p.totalGiven)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Received</Text>
                    <Text style={[styles.metricVal, { color: colors.income.text }]}>
                      {formatRupees(p.totalReceivedBack)}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Borrowed</Text>
                    <Text style={styles.metricVal}>{formatRupees(p.totalBorrowed)}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Repaid</Text>
                    <Text style={styles.metricVal}>{formatRupees(p.totalRepaid)}</Text>
                  </View>
                </View>

                {/* WhatsApp & SMS Shortcuts */}
                {p.phone && p.netBalance !== 0 && (
                  <View style={styles.shortcutRow}>
                    <TouchableOpacity
                      style={styles.shortcutBtn}
                      onPress={() => handleWhatsApp(p)}
                    >
                      <MessageCircle size={14} color="#15803d" />
                      <Text style={[styles.shortcutText, { color: '#15803d' }]}>
                        Send WhatsApp
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shortcutBtn}
                      onPress={() => handleSMS(p)}
                    >
                      <Phone size={14} color={colors.slate[600]} />
                      <Text style={styles.shortcutText}>Send SMS</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  actionGrid: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    gap: 5,
  },
  lendBtn: {
    backgroundColor: colors.receivable.solid,
  },
  receiveBtn: {
    backgroundColor: colors.income.solid,
  },
  borrowBtn: {
    backgroundColor: colors.payable.solid,
  },
  repayBtn: {
    backgroundColor: '#6366f1',
  },
  personBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    flex: 0.9,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  personBtnText: {
    color: colors.slate[800],
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.white,
    padding: 16,
  },
  cardOverdue: {
    borderColor: colors.expense.border,
    backgroundColor: colors.expense.bg,
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  overdueTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  overdueAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  textOverdue: {
    color: colors.expense.text,
  },
  textGood: {
    color: colors.income.text,
  },
  overdueSub: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 4,
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
  ledgerContainer: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
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
  personCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 14,
    gap: 10,
    backgroundColor: colors.slate[50],
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  personName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[800],
  },
  personPhone: {
    fontSize: 11,
    color: colors.slate[400],
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillRec: {
    backgroundColor: colors.receivable.bg,
    borderWidth: 1,
    borderColor: colors.receivable.border,
  },
  pillPay: {
    backgroundColor: colors.payable.bg,
    borderWidth: 1,
    borderColor: colors.payable.border,
  },
  pillSettled: {
    backgroundColor: colors.slate[100],
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextRec: {
    color: colors.receivable.text,
  },
  statusTextPay: {
    color: colors.payable.text,
  },
  statusTextSettled: {
    color: colors.slate[600],
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 12,
  },
  balanceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
  },
  personBalanceAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  textRec: {
    color: colors.receivable.text,
  },
  textPay: {
    color: colors.payable.text,
  },
  textSettled: {
    color: colors.slate[900],
  },
  metricStrip: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[700],
    marginTop: 2,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingVertical: 7,
    gap: 6,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[600],
  },
});
