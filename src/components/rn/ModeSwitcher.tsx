import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, Users, PieChart } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { AppMode } from '../../types';
import { useResponsive } from '../../lib/useResponsive';

interface ModeSwitcherProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ currentMode, onSelectMode }) => {
  const { isNarrowMobile } = useResponsive();

  return (
    <View style={[styles.container, isNarrowMobile && styles.containerNarrow]}>
      <TouchableOpacity
        style={[
          styles.tab,
          isNarrowMobile && styles.tabNarrow,
          currentMode === 'income_expense' && styles.tabActiveIncome,
        ]}
        onPress={() => onSelectMode('income_expense')}
        activeOpacity={0.7}
      >
        <TrendingUp
          size={isNarrowMobile ? 14 : 16}
          color={currentMode === 'income_expense' ? colors.income.text : colors.slate[500]}
        />
        <Text
          style={[
            styles.tabText,
            isNarrowMobile && styles.tabTextNarrow,
            currentMode === 'income_expense' && styles.tabTextIncome,
          ]}
          numberOfLines={1}
        >
          Finance
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          isNarrowMobile && styles.tabNarrow,
          currentMode === 'khata_book' && styles.tabActiveKhata,
        ]}
        onPress={() => onSelectMode('khata_book')}
        activeOpacity={0.7}
      >
        <Users
          size={isNarrowMobile ? 14 : 16}
          color={currentMode === 'khata_book' ? colors.receivable.text : colors.slate[500]}
        />
        <Text
          style={[
            styles.tabText,
            isNarrowMobile && styles.tabTextNarrow,
            currentMode === 'khata_book' && styles.tabTextKhata,
          ]}
          numberOfLines={1}
        >
          Khata
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          isNarrowMobile && styles.tabNarrow,
          currentMode === 'financial_overview' && styles.tabActiveOverview,
        ]}
        onPress={() => onSelectMode('financial_overview')}
        activeOpacity={0.7}
      >
        <PieChart
          size={isNarrowMobile ? 14 : 16}
          color={currentMode === 'financial_overview' ? colors.overview.text : colors.slate[500]}
        />
        <Text
          style={[
            styles.tabText,
            isNarrowMobile && styles.tabTextNarrow,
            currentMode === 'financial_overview' && styles.tabTextOverview,
          ]}
          numberOfLines={1}
        >
          Overview
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 10,
    gap: 4,
  },
  containerNarrow: {
    marginHorizontal: 10,
    marginVertical: 6,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabNarrow: {
    paddingVertical: 7,
    gap: 4,
  },
  tabActiveIncome: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabActiveKhata: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabActiveOverview: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[500],
  },
  tabTextNarrow: {
    fontSize: 11,
  },
  tabTextIncome: {
    color: colors.income.text,
  },
  tabTextKhata: {
    color: colors.receivable.text,
  },
  tabTextOverview: {
    color: colors.overview.text,
  },
});
