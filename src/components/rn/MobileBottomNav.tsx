import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Users, PieChart, Plus, Settings } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { AppMode } from '../../types';

interface MobileBottomNavProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onOpenQuickAdd: () => void;
  onOpenSettings: () => void;
  overdueCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentMode,
  onSelectMode,
  onOpenQuickAdd,
  onOpenSettings,
  overdueCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(8, insets.bottom);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* 1. Cashflow / Finance */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectMode('income_expense')}
        activeOpacity={0.7}
      >
        <TrendingUp
          size={20}
          color={currentMode === 'income_expense' ? colors.income.text : colors.slate[400]}
        />
        <Text
          style={[
            styles.navLabel,
            currentMode === 'income_expense' && styles.navLabelIncome,
          ]}
        >
          Finance
        </Text>
      </TouchableOpacity>

      {/* 2. Khata Book */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectMode('khata_book')}
        activeOpacity={0.7}
      >
        <View style={styles.iconWrapper}>
          <Users
            size={20}
            color={currentMode === 'khata_book' ? colors.receivable.text : colors.slate[400]}
          />
          {overdueCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{overdueCount}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.navLabel,
            currentMode === 'khata_book' && styles.navLabelKhata,
          ]}
        >
          Khata
        </Text>
      </TouchableOpacity>

      {/* 3. Center Add (+) Button */}
      <TouchableOpacity
        style={styles.centerAddBtn}
        onPress={onOpenQuickAdd}
        activeOpacity={0.85}
        accessibilityLabel="Add Transaction"
      >
        <Plus size={24} color={colors.white} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* 4. Combined Overview */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onSelectMode('financial_overview')}
        activeOpacity={0.7}
      >
        <PieChart
          size={20}
          color={currentMode === 'financial_overview' ? colors.overview.text : colors.slate[400]}
        />
        <Text
          style={[
            styles.navLabel,
            currentMode === 'financial_overview' && styles.navLabelOverview,
          ]}
        >
          Overview
        </Text>
      </TouchableOpacity>

      {/* 5. Settings */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={onOpenSettings}
        activeOpacity={0.7}
      >
        <Settings size={20} color={colors.slate[400]} />
        <Text style={styles.navLabel}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.expense.solid,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[400],
  },
  navLabelIncome: {
    color: colors.income.text,
    fontWeight: '800',
  },
  navLabelKhata: {
    color: colors.receivable.text,
    fontWeight: '800',
  },
  navLabelOverview: {
    color: colors.overview.text,
    fontWeight: '800',
  },
  centerAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
