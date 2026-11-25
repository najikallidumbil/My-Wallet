import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Wallet,
  TrendingUp,
  Users,
  PieChart,
  Plus,
  Settings,
  Cloud,
  Scale,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { AppMode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';

interface DesktopSidebarProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onOpenQuickAdd: () => void;
  onOpenSettings: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentMode,
  onSelectMode,
  onOpenQuickAdd,
  onOpenSettings,
}) => {
  const { user } = useAuth();
  const { combinedFinancialSummary, syncState, khataSummary } = useWallet();

  const getInitials = () => {
    if (!user?.email) return 'MW';
    return user.email.substring(0, 2).toUpperCase();
  };

  const navItems = [
    {
      id: 'income_expense' as AppMode,
      label: 'Finance Management',
      sublabel: 'Income & Expense',
      icon: TrendingUp,
      activeColor: colors.income.solid,
      activeBg: colors.income.bg,
      activeText: colors.income.text,
    },
    {
      id: 'khata_book' as AppMode,
      label: 'Khata Book',
      sublabel: 'Lending & Borrowing',
      icon: Users,
      badge: khataSummary.overdueCount > 0 ? khataSummary.overdueCount : undefined,
      activeColor: colors.receivable.solid,
      activeBg: colors.receivable.bg,
      activeText: colors.receivable.text,
    },
    {
      id: 'financial_overview' as AppMode,
      label: 'Financial Overview',
      sublabel: 'Combined Balance & Assets',
      icon: PieChart,
      activeColor: colors.overview.solid,
      activeBg: colors.overview.bg,
      activeText: colors.overview.text,
    },
  ];

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.logoCircle}>
          <Wallet size={22} color={colors.white} />
        </View>
        <View style={styles.brandTextCol}>
          <Text style={styles.brandTitle}>MY WALLET</Text>
          <View style={styles.syncRow}>
            <Cloud
              size={12}
              color={syncState === 'synced' ? colors.income.solid : colors.warning.solid}
            />
            <Text style={styles.syncStatus}>
              {syncState === 'synced' ? 'Cloud Synced' : 'Syncing...'}
            </Text>
          </View>
        </View>
      </View>

      {/* New Transaction Button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={onOpenQuickAdd}
        activeOpacity={0.85}
      >
        <Plus size={18} color={colors.white} strokeWidth={2.5} />
        <Text style={styles.addBtnText}>New Transaction</Text>
      </TouchableOpacity>

      {/* Navigation List */}
      <View style={styles.navSection}>
        <Text style={styles.sectionHeader}>NAVIGATION</Text>
        {navItems.map((item) => {
          const isActive = currentMode === item.id;
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                isActive && { backgroundColor: item.activeBg, borderColor: item.activeColor },
              ]}
              onPress={() => onSelectMode(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.navIconBox,
                  isActive
                    ? { backgroundColor: item.activeColor }
                    : { backgroundColor: colors.slate[100] },
                ]}
              >
                <Icon
                  size={18}
                  color={isActive ? colors.white : colors.slate[600]}
                />
              </View>

              <View style={styles.navLabelBox}>
                <Text
                  style={[
                    styles.navItemLabel,
                    isActive && { color: item.activeText, fontWeight: '800' },
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={styles.navItemSub}>{item.sublabel}</Text>
              </View>

              {item.badge && (
                <View style={styles.badgeBox}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Financial Snapshot Card */}
      <View style={styles.snapshotCard}>
        <View style={styles.snapshotRow}>
          <Scale size={14} color={colors.overview.text} />
          <Text style={styles.snapshotLabel}>NET WORTH</Text>
        </View>
        <Text style={styles.snapshotAmount}>
          {formatRupees(combinedFinancialSummary.netWorth)}
        </Text>
        <View style={styles.snapshotDivider} />
        <View style={styles.snapshotFooter}>
          <Text style={styles.snapshotSub}>Actual Cash:</Text>
          <Text style={styles.snapshotSubValue}>
            {formatRupees(combinedFinancialSummary.actualCashBalance)}
          </Text>
        </View>
      </View>

      {/* Bottom Profile & Settings Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.profileRow}
          onPress={onOpenSettings}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email || 'Guest User'}
            </Text>
            <Text style={styles.profileRole}>Supabase Secure</Text>
          </View>
          <Settings size={18} color={colors.slate[400]} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.slate[200],
    padding: 16,
    justifyContent: 'space-between',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextCol: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: 0.5,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  syncStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[500],
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 16,
    gap: 8,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  navSection: {
    marginTop: 20,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 10,
  },
  navIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabelBox: {
    flex: 1,
  },
  navItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
  navItemSub: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '500',
  },
  badgeBox: {
    backgroundColor: colors.expense.solid,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
  },
  snapshotCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 12,
    marginTop: 'auto',
    marginBottom: 16,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  snapshotAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.slate[900],
    letterSpacing: -0.5,
  },
  snapshotDivider: {
    height: 1,
    backgroundColor: colors.slate[200],
    marginVertical: 8,
  },
  snapshotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snapshotSub: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '600',
  },
  snapshotSubValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingTop: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[800],
  },
  profileRole: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '500',
  },
});
