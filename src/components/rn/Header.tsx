import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wallet, Settings as SettingsIcon, Cloud } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { AppMode } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';

interface HeaderProps {
  currentMode: AppMode;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, onOpenSettings }) => {
  const { user } = useAuth();
  const { syncState } = useWallet();

  const getModeLabel = () => {
    switch (currentMode) {
      case 'income_expense':
        return 'Finance • Income & Expense';
      case 'khata_book':
        return 'Khata Book • Lending & Borrowing';
      case 'financial_overview':
        return 'Overview • Combined Analytics';
      default:
        return 'Finance Management';
    }
  };

  const getInitials = () => {
    if (!user?.email) return 'MW';
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Wallet size={20} color={colors.white} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>MY WALLET</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{getModeLabel()}</Text>
        </View>
      </View>

      <View style={styles.right}>
        {user ? (
          <TouchableOpacity
            style={styles.userBadge}
            onPress={onOpenSettings}
            accessibilityLabel="User Profile"
          >
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>{getInitials()}</Text>
            </View>
            {syncState === 'synced' ? (
              <Cloud size={14} color={colors.income.text} />
            ) : (
              <Cloud size={14} color={colors.warning.text} />
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={onOpenSettings}
          accessibilityLabel="Open Settings"
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
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  titleCol: {
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[500],
    marginTop: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.slate[100],
    borderRadius: 12,
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
  },
});
