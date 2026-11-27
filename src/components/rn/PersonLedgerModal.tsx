import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Edit2,
  Check,
  ShieldCheck,
  Trash2,
  Download,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { PersonSummary, CreditDebtRecord, MessageType } from '../../types';
import { useResponsive } from '../../lib/useResponsive';
import { SmartMessageModal } from './SmartMessageModal';
import { PdfReportModal } from './reports/PdfReportModal';

interface PersonLedgerModalProps {
  visible: boolean;
  personSummary: PersonSummary | null;
  onClose: () => void;
  onOpenQuickAdd: (mode: 'credit' | 'debt', personName?: string, personPhone?: string) => void;
  onOpenSettleModal?: (mode: 'receive' | 'repay', personId?: string) => void;
}

export const PersonLedgerModal: React.FC<PersonLedgerModalProps> = ({
  visible,
  personSummary,
  onClose,
  onOpenQuickAdd,
  onOpenSettleModal,
}) => {
  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const {
    creditDebtRecords,
    settleCreditDebt,
    updatePerson,
    deletePerson,
  } = useWallet();

  // History Filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'this_month' | 'last_month' | 'pending' | 'settled'>('all');

  // Inline Settle State
  const [settlingRecordId, setSettlingRecordId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  // Edit Person State
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [editName, setEditName] = useState(personSummary?.name || '');
  const [editPhone, setEditPhone] = useState(personSummary?.phone || '');

  // Smart Message Modal State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [messageInitialType, setMessageInitialType] = useState<MessageType>('payment_reminder');
  const [selectedRecordForMessage, setSelectedRecordForMessage] = useState<CreditDebtRecord | null>(null);

  // Synchronize edit fields and filters when person changes
  useEffect(() => {
    if (personSummary) {
      setEditName(personSummary.name || '');
      setEditPhone(personSummary.phone || '');
      setIsEditingPerson(false);
      setSettlingRecordId(null);
      setSettleAmount('');
      setSettleNotes('');
      setHistoryFilter('all');
    }
  }, [personSummary?.id, personSummary?.name, personSummary?.phone]);

  // Get all credit/debt records for this person
  const personRecords = useMemo(() => {
    if (!personSummary) return [];
    const targetName = personSummary.name?.trim().toLowerCase();
    return creditDebtRecords
      .filter(
        (r) =>
          r.personId === personSummary.id ||
          (targetName && r.counterpartName?.trim().toLowerCase() === targetName)
      )
      .sort((a, b) => {
        const dateA = a.transactionDate || (a.createdAt ? a.createdAt.slice(0, 10) : '');
        const dateB = b.transactionDate || (b.createdAt ? b.createdAt.slice(0, 10) : '');
        return dateB.localeCompare(dateA);
      });
  }, [creditDebtRecords, personSummary]);

  // Filtered Ledger Entries
  const filteredRecords = useMemo(() => {
    if (!personSummary) return [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthD.getFullYear()}-${String(lastMonthD.getMonth() + 1).padStart(2, '0')}`;

    return personRecords.filter((r) => {
      const dateStr = r.transactionDate || (r.createdAt ? r.createdAt.slice(0, 10) : '');
      const isSettled = (r.remainingAmount || 0) <= 0;

      if (historyFilter === 'this_month') {
        return dateStr.startsWith(currentMonth);
      }
      if (historyFilter === 'last_month') {
        return dateStr.startsWith(lastMonth);
      }
      if (historyFilter === 'pending') {
        return !isSettled;
      }
      if (historyFilter === 'settled') {
        return isSettled;
      }
      return true;
    });
  }, [personRecords, historyFilter, personSummary]);

  if (!visible || !personSummary) return null;

  const isRec = (personSummary.netBalance || 0) > 0;
  const isPay = (personSummary.netBalance || 0) < 0;

  // Save edited person info
  const handleSavePersonEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Name cannot be empty.');
      return;
    }
    try {
      await updatePerson(personSummary.id, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
      });
      setIsEditingPerson(false);
      Alert.alert('Updated', 'Contact information saved.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update contact.');
    }
  };

  // Safe delete with validation
  const handleDeletePersonSafe = () => {
    if (Math.abs(personSummary.netBalance) > 0) {
      Alert.alert(
        'Cannot Delete Contact',
        `"${personSummary.name}" has an unsettled balance of ${formatRupees(
          Math.abs(personSummary.netBalance)
        )}. Please settle the outstanding balance before deleting this contact.`
      );
      return;
    }

    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete "${personSummary.name}" from your Khata Book?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePerson(personSummary.id);
              onClose();
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Failed to delete contact from database.');
            }
          },
        },
      ]
    );
  };

  // Confirm partial or full settlement
  const handleConfirmSettle = async (record: CreditDebtRecord) => {
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

    try {
      await settleCreditDebt(
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
    } catch (err: any) {
      Alert.alert('Settlement Failed', err.message || 'Failed to record payment in database.');
    }
  };

  const handleRecordPaymentReceived = () => {
    const hasReceivable =
      (personSummary.outstandingReceivable || 0) > 0 ||
      personRecords.some((r) => r.type === 'credit' && r.remainingAmount > 0);

    if (!hasReceivable) {
      Alert.alert(
        'No Pending Amount',
        `There is no pending receivable amount from ${personSummary.name} to record payment for.`
      );
      return;
    }
    onClose();
    if (onOpenSettleModal) {
      onOpenSettleModal('receive', personSummary.id);
    } else {
      onOpenQuickAdd('credit', personSummary.name, personSummary.phone);
    }
  };

  const handleRecordRepayment = () => {
    const hasPayable =
      (personSummary.outstandingPayable || 0) > 0 ||
      personRecords.some((r) => r.type === 'debt' && r.remainingAmount > 0);

    if (!hasPayable) {
      Alert.alert(
        'No Pending Amount',
        `There is no pending payable amount to repay to ${personSummary.name}.`
      );
      return;
    }
    onClose();
    if (onOpenSettleModal) {
      onOpenSettleModal('repay', personSummary.id);
    } else {
      onOpenQuickAdd('debt', personSummary.name, personSummary.phone);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            <View style={styles.personHeader}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {personSummary.name ? personSummary.name.slice(0, 2).toUpperCase() : '??'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {personSummary.name || 'Unknown Contact'}
                  </Text>
                  {personSummary.paymentStatus === 'overdue' && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueBadgeText}>Overdue</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.personPhone}>{personSummary.phone || 'No phone number'}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => setIsPdfModalOpen(true)}
                style={styles.headerPdfBtn}
                activeOpacity={0.7}
              >
                <Download size={13} color={colors.brand[600]} />
                <Text style={styles.headerPdfBtnText}>Statement</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Inline Person Editing Form (when triggered) */}
            {isEditingPerson && (
              <View style={styles.editPersonCard}>
                <Text style={styles.editCardTitle}>Edit Contact Details</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full Name"
                />
                <TextInput
                  style={[styles.editInput, { marginTop: 6 }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Mobile Phone (for reminders)"
                  keyboardType="phone-pad"
                />
                <View style={styles.editBtnRow}>
                  <TouchableOpacity
                    style={[styles.editActionBtn, styles.saveEditBtn]}
                    onPress={handleSavePersonEdit}
                  >
                    <Check size={14} color={colors.white} />
                    <Text style={styles.saveEditText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editActionBtn, styles.cancelEditBtn]}
                    onPress={() => setIsEditingPerson(false)}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 1. Net Outstanding Balance Hero */}
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <Text style={styles.heroLabel}>NET OUTSTANDING BALANCE</Text>
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
                    {isRec ? "You'll Get" : isPay ? "You'll Pay" : 'Settled (₹0)'}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.heroAmount,
                  isRec ? styles.textRec : isPay ? styles.textPay : styles.textSettled,
                ]}
              >
                {formatRupees(Math.abs(personSummary.netBalance || 0))}
              </Text>

              {/* Complete 6 Financial Metric Breakdown */}
              <View style={styles.financialMetricsGrid}>
                {/* Credit (Lending) Column */}
                <View style={styles.metricColumn}>
                  <Text style={styles.colTitle}>MONEY LENT (CREDIT)</Text>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Total Lent:</Text>
                    <Text style={styles.metricVal}>{formatRupees(personSummary.totalGiven || 0)}</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Received Back:</Text>
                    <Text style={[styles.metricVal, { color: colors.income.text }]}>
                      {formatRupees(personSummary.totalReceivedBack || 0)}
                    </Text>
                  </View>
                  <View style={[styles.metricRow, styles.metricHighlightRow]}>
                    <Text style={styles.metricLabelBold}>To Receive:</Text>
                    <Text style={[styles.metricValBold, { color: colors.receivable.text }]}>
                      {formatRupees(personSummary.outstandingReceivable || 0)}
                    </Text>
                  </View>
                </View>

                {/* Debt (Borrowing) Column */}
                <View style={styles.metricColumn}>
                  <Text style={styles.colTitle}>MONEY BORROWED (DEBT)</Text>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Total Borrowed:</Text>
                    <Text style={styles.metricVal}>{formatRupees(personSummary.totalBorrowed || 0)}</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Repaid by You:</Text>
                    <Text style={[styles.metricVal, { color: colors.income.text }]}>
                      {formatRupees(personSummary.totalRepaid || 0)}
                    </Text>
                  </View>
                  <View style={[styles.metricRow, styles.metricHighlightRow]}>
                    <Text style={styles.metricLabelBold}>To Pay:</Text>
                    <Text style={[styles.metricValBold, { color: colors.payable.text }]}>
                      {formatRupees(personSummary.outstandingPayable || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Primary Khata Actions: Lend, Receive, Borrow, Repay */}
            <View style={styles.actionsContainer}>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.lendBtn]}
                  onPress={() => {
                    onClose();
                    onOpenQuickAdd('credit', personSummary.name, personSummary.phone);
                  }}
                  activeOpacity={0.8}
                >
                  <ArrowUpRight size={15} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    Give Money (Lend)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.receiveBtn]}
                  onPress={handleRecordPaymentReceived}
                  activeOpacity={0.8}
                >
                  <ArrowDownLeft size={15} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    Record Payment Received
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.borrowBtn]}
                  onPress={() => {
                    onClose();
                    onOpenQuickAdd('debt', personSummary.name, personSummary.phone);
                  }}
                  activeOpacity={0.8}
                >
                  <ArrowDownLeft size={15} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    Borrow Money
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.repayBtn]}
                  onPress={handleRecordRepayment}
                  activeOpacity={0.8}
                >
                  <ArrowUpRight size={15} color={colors.white} strokeWidth={2.5} />
                  <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    Record Repayment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Secondary Actions: Reminders, Confirmation & Edit */}
            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={[styles.secBtn, styles.reminderBtn]}
                onPress={() => {
                  setMessageInitialType('payment_reminder');
                  setIsMessageModalOpen(true);
                }}
              >
                <MessageCircle size={15} color="#15803d" />
                <Text style={[styles.secBtnText, { color: '#15803d' }]}>
                  Send Reminder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secBtn, styles.confirmBtn]}
                onPress={() => {
                  setMessageInitialType(isRec ? 'payment_received' : 'payment_made');
                  setIsMessageModalOpen(true);
                }}
              >
                <ShieldCheck size={15} color={colors.brand[700]} />
                <Text style={[styles.secBtnText, { color: colors.brand[700] }]}>
                  Payment Receipt
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secBtn}
                onPress={() => {
                  setEditName(personSummary.name);
                  setEditPhone(personSummary.phone || '');
                  setIsEditingPerson((v) => !v);
                }}
              >
                <Edit2 size={14} color={colors.slate[700]} />
                <Text style={styles.secBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secBtn, styles.deleteBtn]}
                onPress={handleDeletePersonSafe}
              >
                <Trash2 size={14} color={colors.expense.text} />
              </TouchableOpacity>
            </View>

            {/* 3. Transaction History Ledger */}
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>
                  Ledger Statement ({personRecords.length})
                </Text>
              </View>

              {/* History Filter Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.historyFilterScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.historyFilterPill,
                    historyFilter === 'all' && styles.historyFilterPillActive,
                  ]}
                  onPress={() => setHistoryFilter('all')}
                >
                  <Text style={[styles.historyFilterText, historyFilter === 'all' && styles.historyFilterTextActive]}>
                    All ({personRecords.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.historyFilterPill,
                    historyFilter === 'pending' && styles.historyFilterPillActive,
                  ]}
                  onPress={() => setHistoryFilter('pending')}
                >
                  <Text style={[styles.historyFilterText, historyFilter === 'pending' && styles.historyFilterTextActive]}>
                    Pending Due
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.historyFilterPill,
                    historyFilter === 'this_month' && styles.historyFilterPillActive,
                  ]}
                  onPress={() => setHistoryFilter('this_month')}
                >
                  <Text style={[styles.historyFilterText, historyFilter === 'this_month' && styles.historyFilterTextActive]}>
                    This Month
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.historyFilterPill,
                    historyFilter === 'last_month' && styles.historyFilterPillActive,
                  ]}
                  onPress={() => setHistoryFilter('last_month')}
                >
                  <Text style={[styles.historyFilterText, historyFilter === 'last_month' && styles.historyFilterTextActive]}>
                    Last Month
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.historyFilterPill,
                    historyFilter === 'settled' && styles.historyFilterPillActive,
                  ]}
                  onPress={() => setHistoryFilter('settled')}
                >
                  <Text style={[styles.historyFilterText, historyFilter === 'settled' && styles.historyFilterTextActive]}>
                    Fully Paid
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Ledger Entries List */}
              {filteredRecords.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Text style={styles.emptyHistoryText}>
                    No ledger entries matching this filter.
                  </Text>
                </View>
              ) : (
                filteredRecords.map((r) => {
                  const isEntryCredit = r.type === 'credit';
                  const isFullySettled = (r.remainingAmount || 0) <= 0;
                  const isSettlingThis = settlingRecordId === r.id;

                  return (
                    <View key={r.id} style={styles.entryCard}>
                      <View style={styles.entryTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.badgeRow}>
                            <Text
                              style={[
                                styles.entryTypeBadge,
                                isEntryCredit ? styles.badgeCredit : styles.badgeDebt,
                              ]}
                            >
                              {isEntryCredit ? 'Lent (Credit)' : 'Borrowed (Debt)'}
                            </Text>
                            {isFullySettled ? (
                              <View style={styles.settledBadge}>
                                <CheckCircle2 size={12} color={colors.income.text} />
                                <Text style={styles.settledText}>Fully Paid</Text>
                              </View>
                            ) : (
                              <View style={styles.pendingBadge}>
                                <Clock size={11} color={colors.payable.text} />
                                <Text style={styles.pendingBadgeText}>Pending</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.entryDate}>
                            {formatDate(r.transactionDate)}
                            {r.transactionTime ? ` • ${r.transactionTime}` : ''}
                          </Text>
                          {r.dueDate && (
                            <Text style={styles.entryDue}>
                              Expected Due: {formatDate(r.dueDate)}
                            </Text>
                          )}
                          {r.notes ? (
                            <Text style={styles.entryNotes} numberOfLines={2}>
                              {r.notes}
                            </Text>
                          ) : null}
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
                          {/* Send specific reminder for this record */}
                          <TouchableOpacity
                            style={styles.recordRemindBtn}
                            onPress={() => {
                              setSelectedRecordForMessage(r);
                              setMessageInitialType('payment_reminder');
                              setIsMessageModalOpen(true);
                            }}
                          >
                            <MessageCircle size={12} color="#15803d" />
                            <Text style={styles.recordRemindBtnText}>Remind</Text>
                          </TouchableOpacity>
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
                            {isEntryCredit ? '+ Record Payment Received' : '+ Record Repayment'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Inline Settlement Input Form */}
                      {isSettlingThis && (
                        <View style={styles.inlineSettleForm}>
                          <Text style={styles.inlineSettleTitle}>
                            {isEntryCredit ? 'Record Payment Received' : 'Record Repayment'}
                          </Text>
                          <TextInput
                            style={styles.inlineInput}
                            placeholder="Payment Amount (₹)"
                            keyboardType="numeric"
                            value={settleAmount}
                            onChangeText={setSettleAmount}
                          />
                          <TextInput
                            style={[styles.inlineInput, { marginTop: 6 }]}
                            placeholder="Notes (optional, e.g. Paid via GPay)"
                            value={settleNotes}
                            onChangeText={setSettleNotes}
                          />
                          <View style={styles.inlineBtnRow}>
                            <TouchableOpacity
                              style={[styles.inlineBtn, styles.inlineSaveBtn]}
                              onPress={() => handleConfirmSettle(r)}
                            >
                              <Text style={styles.inlineSaveText}>Save Payment</Text>
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
            </View>
          </ScrollView>

          {/* Smart Message Modal instance */}
          <SmartMessageModal
            visible={isMessageModalOpen}
            person={personSummary}
            record={selectedRecordForMessage}
            initialType={messageInitialType}
            onClose={() => {
              setIsMessageModalOpen(false);
              setSelectedRecordForMessage(null);
            }}
          />

          {/* Person Khata PDF Statement Modal */}
          {personSummary && (
            <PdfReportModal
              visible={isPdfModalOpen}
              onClose={() => setIsPdfModalOpen(false)}
              initialReportType="khata"
              initialPersonId={personSummary.id}
            />
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
  backdropWide: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '92%',
  },
  modalCardWide: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 24,
    maxHeight: '88%',
  },
  modalCardNarrow: {
    padding: 14,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand[700],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  personName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
    flexShrink: 1,
  },
  overdueBadge: {
    backgroundColor: colors.expense.bg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  overdueBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.expense.text,
  },
  personPhone: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  headerPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand[50],
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  headerPdfBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  bodyScroll: {
    flexGrow: 0,
  },
  editPersonCard: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  editCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[600],
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.slate[900],
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  saveEditBtn: {
    backgroundColor: colors.brand[600],
  },
  saveEditText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  cancelEditBtn: {
    backgroundColor: colors.slate[200],
  },
  cancelEditText: {
    color: colors.slate[700],
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  textRec: {
    color: colors.receivable.text,
  },
  textPay: {
    color: colors.payable.text,
  },
  textSettled: {
    color: colors.slate[600],
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  financialMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  metricColumn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  colTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.slate[500],
  },
  metricVal: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[800],
  },
  metricHighlightRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  metricLabelBold: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[700],
  },
  metricValBold: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 6,
    minHeight: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  lendBtn: {
    backgroundColor: colors.receivable.solid,
  },
  receiveBtn: {
    backgroundColor: colors.income.solid,
  },
  borrowBtn: {
    backgroundColor: colors.payable.solid,
  },
  repayBtn: {
    backgroundColor: '#7c3aed',
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  secBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  reminderBtn: {
    flex: 1,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  deleteBtn: {
    backgroundColor: colors.expense.bg,
  },
  secBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[700],
  },
  historySection: {
    gap: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[900],
  },
  historyFilterScroll: {
    flexDirection: 'row',
  },
  historyFilterPill: {
    backgroundColor: colors.slate[100],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
  },
  historyFilterPillActive: {
    backgroundColor: colors.brand[600],
  },
  historyFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[600],
  },
  historyFilterTextActive: {
    color: colors.white,
  },
  emptyHistoryBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 11,
    color: colors.slate[400],
  },
  entryCard: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  entryTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    fontSize: 9,
    fontWeight: '800',
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
    backgroundColor: colors.income.bg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  settledText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.income.text,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.payable.bg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.payable.text,
  },
  entryDate: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '500',
  },
  entryDue: {
    fontSize: 10,
    color: colors.slate[600],
    fontWeight: '600',
    marginTop: 2,
  },
  entryNotes: {
    fontSize: 10,
    color: colors.slate[500],
    marginTop: 2,
  },
  entryAmountBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  entryOriginalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  entryRemainingAmount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.expense.text,
  },
  recordRemindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    marginTop: 4,
  },
  recordRemindBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  repaymentsBox: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  repaymentsTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.slate[400],
    marginBottom: 4,
  },
  repRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  repDate: {
    fontSize: 10,
    color: colors.slate[500],
  },
  repAmount: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.income.text,
  },
  settleTrigger: {
    backgroundColor: colors.brand[50],
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  settleTriggerText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand[700],
  },
  inlineSettleForm: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  inlineSettleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand[900],
  },
  inlineInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.slate[900],
  },
  inlineBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  inlineBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inlineSaveBtn: {
    backgroundColor: colors.brand[600],
  },
  inlineSaveText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  inlineCancelBtn: {
    backgroundColor: colors.slate[200],
  },
  inlineCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
});
