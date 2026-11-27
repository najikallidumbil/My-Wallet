import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wallet, Settings as SettingsIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { AppMode } from '../../types';

interface HeaderProps {
  currentMode: AppMode;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, onOpenSettings }) => {
  const getModeLabel = () => {
    switch (currentMode) {
      case 'income_expense':
        return 'Finance • Income & Expense';
      case 'khata_book':
        return 'Khata Book • Lending & Budgeting';
      case 'financial_overview':
        return 'Overview • Combined Analytics';
      default:
        return 'Khata Book • Lending & Budgeting';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Wallet size={20} color={colors.white} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>MY WALLET</Text>
          {/* Subtitle is fully visible and readable without truncation or ellipsis */}
          <Text style={styles.subtitle}>{getModeLabel()}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={onOpenSettings}
          accessibilityLabel="Open Settings"
          activeOpacity={0.7}
        >
          <SettingsIcon size={20} color={colors.slate[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    minHeight: 58,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: colors.slate[500],
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
