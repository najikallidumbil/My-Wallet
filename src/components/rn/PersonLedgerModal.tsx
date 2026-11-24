import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  X,
  MessageCircle,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { PersonSummary, CreditDebtRecord } from '../../types';

interface PersonLedgerModalProps {
  visible: boolean;
  personSummary: PersonSummary | null;
  onClose: () => void;
  onOpenQuickAdd: (mode: 'credit' | 'debt') => void;
}

export const PersonLedgerModal: React.FC<PersonLedgerModalProps> = ({
  visible,
  personSummary,
  onClose,
  onOpenQuickAdd,
}) => {
  if (!personSummary) return null;

  const {
    creditDebtRecords,
    settleCreditDebt,
  } = useWallet();

  const [settlingRecordId, setSettlingRecordId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  // Get all credit/debt records for this person
  const personRecords = creditDebtRecords.filter(
    (r) => r.personId === personSummary.id || r.counterpartName === personSummary.name
  );

  const isRec = personSummary.netBalance > 0;
  const isPay = personSummary.netBalance < 0;

  const handleWhatsApp = () => {
    if (!personSummary.phone) {
      Alert.alert('No Phone Number', `No phone number saved for ${personSummary.name}.`);
      return;
    }
    const cleanPhone = personSummary.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const amountStr = formatRupees(Math.abs(personSummary.netBalance));
    const msg = `Hi ${personSummary.name}, reminder regarding the outstanding balance of ${amountStr} with My Wallet. Thank you!`;
    const url = `whatsapp://send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`);
    });
  };

  const handleSMS = () => {
    if (!personSummary.phone) {
      Alert.alert('No Phone Number', `No phone number saved for ${personSummary.name}.`);
      return;
    }
    const cleanPhone = personSummary.phone.replace(/[^0-9]/g, '');
    const amountStr = formatRupees(Math.abs(personSummary.netBalance));
    const msg = `Hi ${personSummary.name}, reminder regarding the outstanding balance of ${amountStr}. Thank you.`;
    Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`);
  };

  const handleConfirmSettle = (record: CreditDebtRecord) => {
    const num = parseFloat(settleAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    if (num > record.remainingAmount) {
      Alert.alert(
        'Amount Exceeds Balance',
        `Payment cannot exceed remaining balance of ${formatRupees(record.remainingAmount)}.`
      );
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    settleCreditDebt(
      record.id,
      num,
      [],
      settleNotes.trim() || undefined,
      today,
      time
    );

    setSettlingRecordId(null);
    setSettleAmount('');
    setSettleNotes('');
    Alert.alert('Payment Recorded', `Successfully recorded payment of ${formatRupees(num)}.`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.personHeader}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {personSummary.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.personName}>{personSummary.name}</Text>
                <Text style={styles.personPhone}>{personSummary.phone || 'No phone'}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          {/* Balance Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <Text style={styles.heroLabel}>OUTSTANDING STANDING</Text>
              <View
                style={[
                  styles.statusPill,
                  isRec ? styles.pillRec : isPay ? styles.pillPay : styles.pillSettled,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isRec ? styles.textRec : isPay ? styles.textPay : styles.textSettled,
                  ]}
                >
                  {isRec ? "You'll Get" : isPay ? "You'll Pay" : 'Settled'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.heroAmount,
                isRec ? styles.textRec : isPay ? styles.textPay : styles.textSettled,
              ]}
            >
              {formatRupees(Math.abs(personSummary.netBalance))}
            </Text>

            {/* Quick WhatsApp / SMS Shortcuts */}
            {personSummary.phone && personSummary.netBalance !== 0 && (
              <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactBtn} onPress={handleWhatsApp}>
                  <MessageCircle size={14} color="#15803d" />
                  <Text style={[styles.contactBtnText, { color: '#15803d' }]}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactBtn} onPress={handleSMS}>
                  <Phone size={14} color={colors.slate[600]} />
                  <Text style={styles.contactBtnText}>SMS</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Transaction Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.lendBtn]}
              onPress={() => {
                onClose();
                onOpenQuickAdd('credit');
              }}
            >
              <ArrowUpRight size={16} color={colors.white} />
              <Text style={styles.actionBtnText}>Give (Lend)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.borrowBtn]}
              onPress={() => {
                onClose();
                onOpenQuickAdd('debt');
              }}
            >
              <ArrowDownLeft size={16} color={colors.white} />
              <Text style={styles.actionBtnText}>Borrow</Text>
            </TouchableOpacity>
          </View>

          {/* Statement Transaction History */}
          <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.historyTitle}>
              Ledger Entries ({personRecords.length})
            </Text>

            {personRecords.length === 0 ? (
              <Text style={styles.emptyHistory}>No entries for this person yet.</Text>
            ) : (
              personRecords.map((r) => {
                const isEntryCredit = r.type === 'credit';
                const isFullySettled = r.remainingAmount <= 0;
                const isSettlingThis = settlingRecordId === r.id;

                return (
                  <View key={r.id} style={styles.entryCard}>
                    <View style={styles.entryTop}>
                      <View>
                        <View style={styles.badgeRow}>
                          <Text
                            style={[
                              styles.entryTypeBadge,
                              isEntryCredit ? styles.badgeCredit : styles.badgeDebt,
                            ]}
                          >
                            {isEntryCredit ? 'Lent (Credit)' : 'Borrowed (Debt)'}
                          </Text>
                          {isFullySettled && (
                            <View style={styles.settledBadge}>
                              <CheckCircle2 size={12} color={colors.income.text} />
                              <Text style={styles.settledText}>Fully Paid</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.entryDate}>
                          {formatDate(r.transactionDate)}{r.transactionTime ? ` • ${r.transactionTime}` : ''}
                        </Text>
                        {r.dueDate && (
                          <Text style={styles.entryDue}>Due: {formatDate(r.dueDate)}</Text>
                        )}
                      </View>

                      <View style={styles.entryAmountBox}>
                        <Text style={styles.entryOriginalAmount}>
                          {formatRupees(r.originalAmount)}
                        </Text>
                        {!isFullySettled && (
                          <Text style={styles.entryRemainingAmount}>
                            Due: {formatRupees(r.remainingAmount)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Repayments History */}
                    {r.repayments && r.repayments.length > 0 && (
                      <View style={styles.repaymentsBox}>
                        <Text style={styles.repaymentsTitle}>Payment History:</Text>
                        {r.repayments.map((rep) => (
                          <View key={rep.id} style={styles.repRow}>
                            <Text style={styles.repDate}>{formatDate(rep.paymentDate)}</Text>
                            <Text style={styles.repAmount}>+ {formatRupees(rep.amount)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Settle / Partial Payment Trigger */}
                    {!isFullySettled && !isSettlingThis && (
                      <TouchableOpacity
                        style={styles.settleTrigger}
                        onPress={() => {
                          setSettlingRecordId(r.id);
                          setSettleAmount(String(r.remainingAmount));
                        }}
                      >
                        <Text style={styles.settleTriggerText}>
                          {isEntryCredit ? '+ Record Payment Received' : '+ Record Payment Made'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Inline Settlement Input Form */}
                    {isSettlingThis && (
                      <View style={styles.inlineSettleForm}>
                        <Text style={styles.inlineSettleTitle}>Record Payment</Text>
                        <TextInput
                          style={styles.inlineInput}
                          placeholder="Amount (₹)"
                          keyboardType="numeric"
                          value={settleAmount}
                          onChangeText={setSettleAmount}
                        />
                        <TextInput
                          style={[styles.inlineInput, { marginTop: 6 }]}
                          placeholder="Notes (optional)"
                          value={settleNotes}
                          onChangeText={setSettleNotes}
                        />
                        <View style={styles.inlineBtnRow}>
                          <TouchableOpacity
                            style={[styles.inlineBtn, styles.inlineSaveBtn]}
                            onPress={() => handleConfirmSettle(r)}
                          >
                            <Text style={styles.inlineSaveText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.inlineBtn, styles.inlineCancelBtn]}
                            onPress={() => setSettlingRecordId(null)}
                          >
                            <Text style={styles.inlineCancelText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
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
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  personName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
  },
  personPhone: {
    fontSize: 12,
    color: colors.slate[400],
  },
  closeBtn: {
    padding: 6,
  },
  heroCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillRec: {
    backgroundColor: colors.receivable.bg,
  },
  pillPay: {
    backgroundColor: colors.payable.bg,
  },
  pillSettled: {
    backgroundColor: colors.slate[200],
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '900',
  },
  textRec: {
    color: colors.receivable.text,
  },
  textPay: {
    color: colors.payable.text,
  },
  textSettled: {
    color: colors.slate[800],
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 6,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  lendBtn: {
    backgroundColor: colors.receivable.solid,
  },
  borrowBtn: {
    backgroundColor: colors.payable.solid,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  historyScroll: {
    maxHeight: 320,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[800],
    marginBottom: 10,
  },
  emptyHistory: {
    fontSize: 12,
    color: colors.slate[400],
    textAlign: 'center',
    paddingVertical: 20,
  },
  entryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 12,
    marginBottom: 10,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryTypeBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCredit: {
    backgroundColor: colors.receivable.bg,
    color: colors.receivable.text,
  },
  badgeDebt: {
    backgroundColor: colors.payable.bg,
    color: colors.payable.text,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.income.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  settledText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.income.text,
  },
  entryDate: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 4,
  },
  entryDue: {
    fontSize: 10,
    color: colors.slate[500],
    marginTop: 2,
  },
  entryAmountBox: {
    alignItems: 'flex-end',
  },
  entryOriginalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[800],
  },
  entryRemainingAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.payable.text,
    marginTop: 2,
  },
  repaymentsBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  repaymentsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[400],
    marginBottom: 4,
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  repDate: {
    fontSize: 10,
    color: colors.slate[500],
  },
  repAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
  },
  settleTrigger: {
    backgroundColor: colors.brand[50],
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  settleTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  inlineSettleForm: {
    marginTop: 8,
    backgroundColor: colors.slate[50],
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  inlineSettleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[700],
    marginBottom: 6,
  },
  inlineInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.slate[900],
  },
  inlineBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  inlineBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  inlineSaveBtn: {
    backgroundColor: colors.brand[600],
  },
  inlineSaveText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  inlineCancelBtn: {
    backgroundColor: colors.slate[200],
  },
  inlineCancelText: {
    color: colors.slate[700],
    fontSize: 12,
    fontWeight: '700',
  },
});
