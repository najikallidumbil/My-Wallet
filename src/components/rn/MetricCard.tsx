import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';

interface MetricCardProps {
  title: string;
  amount?: number;
  customValue?: React.ReactNode;
  subtitle?: string;
  badge?: string;
  variant?: 'income' | 'expense' | 'receivable' | 'payable' | 'overview' | 'neutral' | 'overdue';
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  amount,
  customValue,
  subtitle,
  badge,
  variant = 'neutral',
  icon,
  action,
}) => {
  const getTheme = () => {
    switch (variant) {
      case 'income':
        return {
          bg: colors.income.bg,
          border: colors.income.border,
          text: colors.income.text,
          badgeBg: '#d1fae5',
        };
      case 'expense':
        return {
          bg: colors.expense.bg,
          border: colors.expense.border,
          text: colors.expense.text,
          badgeBg: '#ffe4e6',
        };
      case 'receivable':
        return {
          bg: colors.receivable.bg,
          border: colors.receivable.border,
          text: colors.receivable.text,
          badgeBg: '#e0f2fe',
        };
      case 'payable':
        return {
          bg: colors.payable.bg,
          border: colors.payable.border,
          text: colors.payable.text,
          badgeBg: '#fef3c7',
        };
      case 'overview':
        return {
          bg: colors.overview.bg,
          border: colors.overview.border,
          text: colors.overview.text,
          badgeBg: '#e0e7ff',
        };
      case 'overdue':
        return {
          bg: '#fff5f5',
          border: colors.expense.border,
          text: colors.expense.text,
          badgeBg: '#ffe4e6',
        };
      default:
        return {
          bg: colors.white,
          border: colors.slate[200],
          text: colors.slate[900],
          badgeBg: colors.slate[100],
        };
    }
  };

  const theme = getTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {icon && <View style={styles.iconBox}>{icon}</View>}
        {badge && (
          <View style={[styles.badgeBox, { backgroundColor: theme.badgeBg }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>{badge}</Text>
          </View>
        )}
      </View>

      {customValue ? (
        <View style={styles.customValueBox}>
          {customValue}
        </View>
      ) : (
        <Text
          style={[styles.amount, { color: theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatRupees(amount ?? 0)}
        </Text>
      )}

      {(subtitle || action) && (
        <View style={styles.bottomRow}>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {action}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    height: 'auto',
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 6,
  },
  amount: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  customValueBox: {
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 6,
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '500',
    flex: 1,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
