import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import {
  X,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface TypeSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: 'expense' | 'income' | 'credit' | 'debt') => void;
}

export const TypeSelectorModal: React.FC<TypeSelectorModalProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const options = [
    {
      type: 'expense' as const,
      title: 'Add Expense',
      description: 'Record spending on bills, food, shopping or travel',
      tag: 'Cash Out',
      color: colors.expense.solid,
      bgColor: colors.expense.bg,
      textColor: colors.expense.text,
      icon: <TrendingDown size={22} color={colors.expense.solid} />,
    },
    {
      type: 'income' as const,
      title: 'Add Income',
      description: 'Record salary, business earnings, dividend or gift',
      tag: 'Cash In',
      color: colors.income.solid,
      bgColor: colors.income.bg,
      textColor: colors.income.text,
      icon: <TrendingUp size={22} color={colors.income.solid} />,
    },
    {
      type: 'credit' as const,
      title: 'Give Money (Credit)',
      description: 'Lend money to someone (Khata receivable they owe you)',
      tag: 'Khata Receivable',
      color: colors.receivable.solid,
      bgColor: colors.receivable.bg,
      textColor: colors.receivable.text,
      icon: <ArrowUpRight size={22} color={colors.receivable.solid} />,
    },
    {
      type: 'debt' as const,
      title: 'Borrow Money (Debt)',
      description: 'Borrow money from someone (Khata payable you owe them)',
      tag: 'Khata Payable',
      color: colors.payable.solid,
      bgColor: colors.payable.bg,
      textColor: colors.payable.text,
      icon: <ArrowDownLeft size={22} color={colors.payable.solid} />,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Select Transaction Type</Text>
              <Text style={styles.subtitle}>
                Choose what kind of entry you want to record
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={styles.optionCard}
                onPress={() => {
                  onClose();
                  onSelectType(opt.type);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: opt.bgColor }]}>
                  {opt.icon}
                </View>
                <View style={styles.infoBox}>
                  <View style={styles.titleRow}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    <View style={[styles.badge, { backgroundColor: opt.bgColor }]}>
                      <Text style={[styles.badgeText, { color: opt.textColor }]}>
                        {opt.tag}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.optionDescription}>{opt.description}</Text>
                </View>
                <ChevronRight size={18} color={colors.slate[300]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  optionDescription: {
    fontSize: 11,
    color: colors.slate[500],
    lineHeight: 15,
  },
});
