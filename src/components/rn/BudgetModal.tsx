import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {
  X,
  Target,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Trash2,
  Calendar,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { useResponsive } from '../../lib/useResponsive';

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  initialMonth?: string;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  visible,
  onClose,
  initialMonth,
}) => {
  const {
    budgets,
    setOverallMonthlyBudget,
    selectedBudgetMonth,
    setSelectedBudgetMonth,
    getBudgetForMonth,
  } = useWallet();

  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const [activeMonth, setActiveMonth] = useState<string>(
    initialMonth || selectedBudgetMonth || new Date().toISOString().slice(0, 7)
  );
  const [budgetInput, setBudgetInput] = useState('');

  // Sync state when opened or month changes
  useEffect(() => {
    if (visible) {
      const monthToUse = initialMonth || selectedBudgetMonth || new Date().toISOString().slice(0, 7);
      setActiveMonth(monthToUse);
      const b = budgets.find((item) => item.month === monthToUse);
      setBudgetInput(b && (b.totalBudget ?? 0) > 0 ? String(b.totalBudget) : '');
    }
  }, [visible, initialMonth, selectedBudgetMonth, budgets]);

  // Compute month summary
  const monthSummary = getBudgetForMonth(activeMonth);

  const getMonthLabel = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = activeMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const prevMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setActiveMonth(prevMonthStr);
    const b = budgets.find((item) => item.month === prevMonthStr);
    setBudgetInput(b && (b.totalBudget ?? 0) > 0 ? String(b.totalBudget) : '');
  };

  const handleNextMonth = () => {
    const [year, month] = activeMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setActiveMonth(nextMonthStr);
    const b = budgets.find((item) => item.month === nextMonthStr);
    setBudgetInput(b && (b.totalBudget ?? 0) > 0 ? String(b.totalBudget) : '');
  };

  const handleSave = () => {
    const num = parseFloat(budgetInput.trim());
    if (isNaN(num) || num < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid monthly budget amount (or 0 to clear).');
      return;
    }

    setOverallMonthlyBudget(num, activeMonth);
    setSelectedBudgetMonth(activeMonth);
    onClose();
    Alert.alert(
      'Budget Saved',
      num > 0
        ? `Monthly budget for ${getMonthLabel(activeMonth)} set to ${formatRupees(num)}.`
        : `Monthly budget for ${getMonthLabel(activeMonth)} cleared.`
    );
  };

  const handleClearBudget = () => {
    setOverallMonthlyBudget(0, activeMonth);
    setSelectedBudgetMonth(activeMonth);
    setBudgetInput('');
    onClose();
    Alert.alert('Budget Cleared', `Budget for ${getMonthLabel(activeMonth)} removed.`);
  };

  const quickPills = [25000, 40000, 50000, 75000, 100000];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.backdrop, isWide && styles.backdropWide]}>
        <View
          style={[
            styles.modalCard,
            isWide && styles.modalCardWide,
            isNarrowMobile && styles.modalCardNarrow,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Target size={20} color={colors.white} />
              </View>
              <View>
                <Text style={styles.title}>Monthly Budget</Text>
                <Text style={styles.subtitle}>Set your personal expense cap</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {/* Month Navigator */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.monthNavBtn}
                activeOpacity={0.7}
              >
                <ChevronLeft size={18} color={colors.slate[700]} />
              </TouchableOpacity>

              <View style={styles.monthLabelBox}>
                <Calendar size={14} color={colors.brand[600]} />
                <Text style={styles.monthLabelText}>{getMonthLabel(activeMonth)}</Text>
              </View>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.monthNavBtn}
                activeOpacity={0.7}
              >
                <ChevronRight size={18} color={colors.slate[700]} />
              </TouchableOpacity>
            </View>

            {/* Current Spending Reference */}
            <View style={styles.spentInfoCard}>
              <View style={styles.spentLeft}>
                <TrendingDown size={18} color={colors.expense.text} />
                <View>
                  <Text style={styles.spentLabel}>Expenses for {getMonthLabel(activeMonth)}</Text>
                  <Text style={styles.spentAmount}>
                    {formatRupees(monthSummary.totalSpent)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Target Budget Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MONTHLY BUDGET TARGET (₹)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.slate[400]}
                keyboardType="numeric"
                value={budgetInput}
                onChangeText={setBudgetInput}
              />
            </View>

            {/* Quick Suggestion Pills */}
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Quick Amounts:</Text>
              <View style={styles.pillsRow}>
                {quickPills.map((pill) => (
                  <TouchableOpacity
                    key={pill}
                    style={[
                      styles.pill,
                      budgetInput === String(pill) && styles.pillActive,
                    ]}
                    onPress={() => setBudgetInput(String(pill))}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        budgetInput === String(pill) && styles.pillTextActive,
                      ]}
                    >
                      {formatRupees(pill)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              {monthSummary.totalBudget > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClearBudget}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={colors.expense.text} />
                  <Text style={styles.clearBtnText}>Remove</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  monthSummary.totalBudget === 0 && styles.saveBtnFull,
                ]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Check size={18} color={colors.white} />
                <Text style={styles.saveBtnText}>Save Budget</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  backdropWide: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 32,
  },
  modalCardWide: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalCardNarrow: {
    padding: 14,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    gap: 14,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 6,
    marginBottom: 12,
  },
  monthNavBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  monthLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[800],
  },
  spentInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.expense.bg,
    borderWidth: 1,
    borderColor: colors.expense.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  spentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spentLabel: {
    fontSize: 11,
    color: colors.slate[600],
    fontWeight: '600',
  },
  spentAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.expense.text,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[500],
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  amountInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '900',
    color: colors.slate[900],
  },
  quickSection: {
    marginBottom: 16,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[400],
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  pillActive: {
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[600],
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  pillTextActive: {
    color: colors.brand[700],
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.expense.border,
    backgroundColor: colors.expense.bg,
    gap: 6,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.expense.text,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    borderRadius: 14,
    paddingVertical: 13,
    gap: 6,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnFull: {
    flex: 1,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
