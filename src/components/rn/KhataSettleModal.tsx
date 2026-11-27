import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { DateTimePickerField } from './DateTimePickerField';

interface KhataSettleModalProps {
  visible: boolean;
  mode: 'receive' | 'repay'; // 'receive' = payment received on credit; 'repay' = debt paid back
  initialPersonId?: string;
  onClose: () => void;
}

export const KhataSettleModal: React.FC<KhataSettleModalProps> = ({
  visible,
  mode,
  initialPersonId,
  onClose,
}) => {
  const {
    people,
    creditDebtRecords,
    settleCreditDebt,
  } = useWallet();

  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getNowLocal = () => {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    const hh = String(n.getHours()).padStart(2, '0');
    const mm = String(n.getMinutes()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  };

  const initialDateTime = getNowLocal();
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);

  const targetType = mode === 'receive' ? 'credit' : 'debt';

  // Get people who have pending records of this type
  const eligiblePeople = useMemo(() => {
    return people
      .map((p) => {
        const pendingRecords = creditDebtRecords.filter(
          (r) =>
            (r.personId === p.id || r.counterpartName.toLowerCase() === p.name.toLowerCase()) &&
            r.type === targetType &&
            r.remainingAmount > 0
        );
        const totalPending = pendingRecords.reduce((sum, r) => sum + r.remainingAmount, 0);
        return {
          person: p,
          pendingRecords,
          totalPending,
        };
      })
      .filter((item) => item.totalPending > 0);
  }, [people, creditDebtRecords, targetType]);

  // When modal opens or eligiblePeople changes, set default selected person
  useEffect(() => {
    if (visible) {
      setAmount('');
      setNotes('');
      const current = getNowLocal();
      setDate(current.date);
      setTime(current.time);

      if (initialPersonId && eligiblePeople.some((e) => e.person.id === initialPersonId)) {
        setSelectedPersonId(initialPersonId);
      } else if (eligiblePeople.length > 0) {
        setSelectedPersonId(eligiblePeople[0].person.id);
      } else {
        setSelectedPersonId('');
      }
      setSelectedRecordId('');
    }
  }, [visible, initialPersonId, eligiblePeople]);

  const activePersonData = useMemo(() => {
    return eligiblePeople.find((e) => e.person.id === selectedPersonId);
  }, [eligiblePeople, selectedPersonId]);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (!activePersonData) {
      Alert.alert('Select Person', 'Please select a person to record this payment.');
      return;
    }

    if (numAmount > activePersonData.totalPending) {
      Alert.alert(
        'Amount Exceeds Balance',
        `Payment cannot exceed total pending balance of ${formatRupees(activePersonData.totalPending)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Allocate payment across the selected record or the oldest pending records
      let remainingToSettle = numAmount;
      const recordsToProcess = selectedRecordId
        ? activePersonData.pendingRecords.filter((r) => r.id === selectedRecordId)
        : [...activePersonData.pendingRecords].sort((a, b) =>
            a.transactionDate.localeCompare(b.transactionDate)
          );

      for (const rec of recordsToProcess) {
        if (remainingToSettle <= 0) break;
        const amountForRec = Math.min(rec.remainingAmount, remainingToSettle);
        await settleCreditDebt(
          rec.id,
          amountForRec,
          [],
          notes.trim() || undefined,
          date,
          time
        );
        remainingToSettle -= amountForRec;
      }

      Alert.alert(
        'Payment Recorded',
        `Successfully recorded ${mode === 'receive' ? 'received payment' : 'debt repayment'} of ${formatRupees(
          numAmount
        )} for ${activePersonData.person.name}.`
      );

      onClose();
    } catch (err: any) {
      console.error('[KhataSettle Submit Error]', err);
      Alert.alert(
        'Settlement Failed',
        err.message || 'Could not record payment to database. Please check Supabase setup and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReceive = mode === 'receive';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <Text style={styles.title} numberOfLines={1}>
                {isReceive ? 'Receive Money (Payment Received)' : 'Repay Money (Debt Repaid)'}
              </Text>
              <Text style={styles.subtitle}>
                {isReceive
                  ? 'Record money received from someone who owes you'
                  : 'Record money you paid back to someone you owe'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          {eligiblePeople.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, isReceive ? styles.bgRec : styles.bgPay]}>
                <CheckCircle2
                  size={36}
                  color={isReceive ? colors.receivable.solid : colors.payable.solid}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {isReceive ? 'No Pending Receivables' : 'No Pending Debts'}
              </Text>
              <Text style={styles.emptyText}>
                {isReceive
                  ? 'There are currently no outstanding loans to collect. All credit accounts are fully settled!'
                  : 'You have no outstanding debts to repay. All borrowed accounts are clear!'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={onClose}>
                <Text style={styles.emptyBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Person Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isReceive ? 'SELECT PERSON (WHO PAID YOU?) *' : 'SELECT PERSON (WHO DID YOU REPAY?) *'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
                  {eligiblePeople.map((item) => (
                    <TouchableOpacity
                      key={item.person.id}
                      style={[
                        styles.personPill,
                        selectedPersonId === item.person.id && styles.personPillActive,
                      ]}
                      onPress={() => {
                        setSelectedPersonId(item.person.id);
                        setSelectedRecordId('');
                      }}
                    >
                      <UserCheck
                        size={14}
                        color={
                          selectedPersonId === item.person.id ? colors.white : colors.slate[600]
                        }
                      />
                      <Text
                        style={[
                          styles.personPillText,
                          selectedPersonId === item.person.id && styles.personPillTextActive,
                        ]}
                      >
                        {item.person.name} ({formatRupees(item.totalPending)})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Outstanding Balance Banner */}
              {activePersonData && (
                <View style={styles.balanceCard}>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>
                      {isReceive ? 'Total Money Owed To You' : 'Total Money You Owe'}
                    </Text>
                    <Text
                      style={[
                        styles.balanceAmount,
                        isReceive ? styles.textRec : styles.textPay,
                      ]}
                    >
                      {formatRupees(activePersonData.totalPending)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment Amount Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>AMOUNT (₹) *</Text>
                  {activePersonData && (
                    <TouchableOpacity
                      onPress={() => setAmount(String(activePersonData.totalPending))}
                    >
                      <Text style={styles.fullAmountBtnText}>
                        Pay Full ({formatRupees(activePersonData.totalPending)})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* ONE Single-Line Combined Date & Time Field */}
              <DateTimePickerField
                date={date}
                time={time}
                onChange={(newDate, newTime) => {
                  setDate(newDate);
                  setTime(newTime);
                }}
                label={mode === 'receive' ? 'PAYMENT RECEIVED DATE & TIME' : 'REPAYMENT DATE & TIME'}
              />

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PAYMENT NOTES / MODE</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  placeholder="e.g. Paid via GPay, Cash handed over, Bank transfer..."
                  placeholderTextColor={colors.slate[400]}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isReceive ? styles.btnRec : styles.btnPay,
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    {isReceive ? (
                      <ArrowDownLeft size={18} color={colors.white} />
                    ) : (
                      <ArrowUpRight size={18} color={colors.white} />
                    )}
                    <Text style={styles.submitBtnText}>
                      {isReceive ? 'Confirm Payment Received' : 'Confirm Debt Repaid'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
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
    maxHeight: '90%',
    padding: 22,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    flexShrink: 0,
  },
  scrollContent: {
    maxHeight: 460,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  fullAmountBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand[600],
  },
  pillsScroll: {
    flexDirection: 'row',
    marginTop: 6,
  },
  personPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    marginRight: 8,
  },
  personPillActive: {
    backgroundColor: colors.brand[600],
  },
  personPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
  personPillTextActive: {
    color: colors.white,
  },
  balanceCard: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[600],
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '900',
  },
  textRec: {
    color: colors.receivable.solid,
  },
  textPay: {
    color: colors.payable.solid,
  },
  amountInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '900',
    color: colors.slate[900],
  },
  textInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.slate[900],
  },
  notesInput: {
    marginTop: 6,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  dualCol: {
    flex: 1,
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 6,
  },
  inlineInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.slate[900],
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  btnRec: {
    backgroundColor: colors.receivable.solid,
  },
  btnPay: {
    backgroundColor: colors.payable.solid,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bgRec: {
    backgroundColor: colors.receivable.bg,
  },
  bgPay: {
    backgroundColor: colors.payable.bg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate[500],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: colors.brand[600],
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
