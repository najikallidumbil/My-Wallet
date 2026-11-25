import React, { useState, useMemo } from 'react';
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
  CheckSquare,
  Square,
  Languages,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { PersonSummary, MessageType, MessageLanguage } from '../../types';
import { useResponsive } from '../../lib/useResponsive';
import {
  generateKhataMessage,
  getWhatsAppUrl,
  getWhatsAppWebUrl,
  getSMSUrl,
} from '../../lib/smartMessaging';

interface BulkReminderModalProps {
  visible: boolean;
  people: PersonSummary[];
  onClose: () => void;
}

export const BulkReminderModal: React.FC<BulkReminderModalProps> = ({
  visible,
  people,
  onClose,
}) => {
  const { logMessage } = useWallet();
  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messageType, setMessageType] = useState<MessageType>('payment_reminder');
  const [language, setLanguage] = useState<MessageLanguage>('en');
  const [customNote, setCustomNote] = useState('');

  // Sequential Sender Workflow State
  const [workflowActive, setWorkflowActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentPersonIds, setSentPersonIds] = useState<Set<string>>(new Set());
  const [activePersonCustomMessage, setActivePersonCustomMessage] = useState<string>('');

  // Filter only active people with pending balances (> 0)
  const pendingPeople = useMemo(() => {
    return people.filter((p) => Math.abs(p.netBalance) > 0);
  }, [people]);

  // Selected people array
  const selectedPeople = useMemo(() => {
    return people.filter((p) => selectedIds.has(p.id));
  }, [people, selectedIds]);

  // Selection summary metrics
  const selectionSummary = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    let overdueCount = 0;

    for (const p of selectedPeople) {
      if (p.netBalance > 0) receivable += p.netBalance;
      else if (p.netBalance < 0) payable += Math.abs(p.netBalance);
      if (p.paymentStatus === 'overdue' || p.hasOverdue) overdueCount++;
    }

    return {
      count: selectedPeople.length,
      receivable,
      payable,
      totalPending: receivable + payable,
      overdueCount,
    };
  }, [selectedPeople]);

  // Bulk Quick-Select Shortcuts
  const handleSelectAll = () => {
    const all = new Set(pendingPeople.map((p) => p.id));
    setSelectedIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectOverdue = () => {
    const overdue = new Set(
      pendingPeople
        .filter((p) => p.paymentStatus === 'overdue' || p.hasOverdue)
        .map((p) => p.id)
    );
    setSelectedIds(overdue);
    setMessageType('overdue_reminder');
  };

  const handleSelectCreditOnly = () => {
    const credit = new Set(
      pendingPeople.filter((p) => p.netBalance > 0).map((p) => p.id)
    );
    setSelectedIds(credit);
    setMessageType('payment_reminder');
  };

  const handleSelectDebtOnly = () => {
    const debt = new Set(
      pendingPeople.filter((p) => p.netBalance < 0).map((p) => p.id)
    );
    setSelectedIds(debt);
    setMessageType('payment_made');
  };

  const toggleSelectPerson = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Start Sequential Sender
  const handleStartWorkflow = () => {
    if (selectedPeople.length === 0) {
      Alert.alert('No People Selected', 'Please select at least one person to send reminders.');
      return;
    }

    setCurrentIndex(0);
    setSentPersonIds(new Set());
    setWorkflowActive(true);

    const firstPerson = selectedPeople[0];
    if (firstPerson) {
      const msg = generateKhataMessage({
        personName: firstPerson.name,
        type:
          firstPerson.paymentStatus === 'overdue' || firstPerson.hasOverdue
            ? 'overdue_reminder'
            : messageType,
        language,
        netBalance: firstPerson.netBalance,
        remainingBalance: Math.abs(firstPerson.netBalance),
        dueDate: firstPerson.nextDueDate,
        customNote,
      });
      setActivePersonCustomMessage(msg);
    }
  };

  const currentPerson = selectedPeople[currentIndex];

  const updateCurrentPersonMessage = (index: number) => {
    const p = selectedPeople[index];
    if (p) {
      const msg = generateKhataMessage({
        personName: p.name,
        type:
          p.paymentStatus === 'overdue' || p.hasOverdue
            ? 'overdue_reminder'
            : messageType,
        language,
        netBalance: p.netBalance,
        remainingBalance: Math.abs(p.netBalance),
        dueDate: p.nextDueDate,
        customNote,
      });
      setActivePersonCustomMessage(msg);
    }
  };

  // Send single WhatsApp in sequence
  const handleSequentialWhatsApp = async () => {
    if (!currentPerson) return;
    if (!currentPerson.phone) {
      Alert.alert(
        'No Phone Number',
        `No phone number saved for ${currentPerson.name}. Please skip or edit their phone number.`
      );
      return;
    }

    const cleanPhone = currentPerson.phone.trim();
    const appUrl = getWhatsAppUrl(cleanPhone, activePersonCustomMessage);
    const webUrl = getWhatsAppWebUrl(cleanPhone, activePersonCustomMessage);

    await logMessage({
      personId: currentPerson.id,
      personName: currentPerson.name,
      recipientPhone: cleanPhone,
      messageType,
      channel: 'whatsapp',
      status: 'opened_in_whatsapp',
      messageContent: activePersonCustomMessage,
      language,
      amount: Math.abs(currentPerson.netBalance),
      sentAt: new Date().toISOString(),
    });

    setSentPersonIds((prev) => new Set(prev).add(currentPerson.id));

    Linking.openURL(appUrl).catch(() => {
      Linking.openURL(webUrl);
    });

    // Move to next contact
    if (currentIndex < selectedPeople.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      updateCurrentPersonMessage(nextIdx);
    } else {
      Alert.alert(
        'Batch Completed',
        `Finished sending reminders to all ${selectedPeople.length} selected contacts.`
      );
      setWorkflowActive(false);
      onClose();
    }
  };

  // Send single SMS in sequence
  const handleSequentialSMS = async () => {
    if (!currentPerson) return;
    if (!currentPerson.phone) {
      Alert.alert('No Phone Number', `No phone number saved for ${currentPerson.name}.`);
      return;
    }

    const cleanPhone = currentPerson.phone.trim();
    const smsUrl = getSMSUrl(cleanPhone, activePersonCustomMessage);

    await logMessage({
      personId: currentPerson.id,
      personName: currentPerson.name,
      recipientPhone: cleanPhone,
      messageType,
      channel: 'sms',
      status: 'opened_in_sms',
      messageContent: activePersonCustomMessage,
      language,
      amount: Math.abs(currentPerson.netBalance),
      sentAt: new Date().toISOString(),
    });

    setSentPersonIds((prev) => new Set(prev).add(currentPerson.id));
    Linking.openURL(smsUrl);

    if (currentIndex < selectedPeople.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      updateCurrentPersonMessage(nextIdx);
    } else {
      Alert.alert('Completed', 'Finished all reminders.');
      setWorkflowActive(false);
      onClose();
    }
  };

  const handleSkipPerson = () => {
    if (currentIndex < selectedPeople.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      updateCurrentPersonMessage(nextIdx);
    } else {
      setWorkflowActive(false);
      onClose();
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
            <View>
              <Text style={styles.title}>
                {workflowActive ? 'Sending Reminders' : 'Bulk Payment Reminders'}
              </Text>
              <Text style={styles.subtitle}>
                {workflowActive
                  ? `Contact ${currentIndex + 1} of ${selectedPeople.length} (${Math.round(
                      ((currentIndex + 1) / selectedPeople.length) * 100
                    )}%)`
                  : 'Send individual, private messages sequentially'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setWorkflowActive(false);
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          {/* WORKFLOW VIEW: Sequential Sending */}
          {workflowActive && currentPerson ? (
            <ScrollView style={styles.workflowScroll} showsVerticalScrollIndicator={false}>
              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(5, ((currentIndex + 1) / selectedPeople.length) * 100)
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressText}>
                    Person {currentIndex + 1} of {selectedPeople.length}
                  </Text>
                  <Text style={styles.progressSentText}>
                    {sentPersonIds.size} Sent
                  </Text>
                </View>
              </View>

              {/* Current Person Card */}
              <View style={styles.currentPersonCard}>
                <View style={styles.currentPersonHeader}>
                  <View style={styles.personAvatarBox}>
                    <Text style={styles.personAvatarText}>
                      {currentPerson.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentPersonName}>{currentPerson.name}</Text>
                    <Text style={styles.currentPersonPhone}>
                      {currentPerson.phone || 'No phone number saved'}
                    </Text>
                  </View>
                  <View style={styles.currentPersonBalanceBox}>
                    <Text
                      style={[
                        styles.currentPersonBalance,
                        currentPerson.netBalance >= 0
                          ? styles.textReceivable
                          : styles.textPayable,
                      ]}
                    >
                      {formatRupees(Math.abs(currentPerson.netBalance))}
                    </Text>
                    <Text style={styles.currentPersonBalanceSub}>
                      {currentPerson.netBalance >= 0 ? 'To Receive' : 'To Pay'}
                    </Text>
                  </View>
                </View>

                {/* Editable Personalized Message Preview */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    INDIVIDUAL MESSAGE (PREVIEW & EDIT)
                  </Text>
                  <TextInput
                    style={styles.workflowMessageBox}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    value={activePersonCustomMessage}
                    onChangeText={setActivePersonCustomMessage}
                  />
                </View>
              </View>

              {/* Action Buttons for current contact */}
              <View style={styles.workflowActionRow}>
                <TouchableOpacity
                  style={[styles.workflowBtn, styles.whatsAppBtn]}
                  onPress={handleSequentialWhatsApp}
                  activeOpacity={0.8}
                >
                  <MessageCircle size={18} color={colors.white} />
                  <Text style={styles.workflowBtnText}>Open in WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.workflowBtn, styles.smsBtn]}
                  onPress={handleSequentialSMS}
                  activeOpacity={0.8}
                >
                  <Phone size={18} color={colors.white} />
                  <Text style={styles.workflowBtnText}>Open in SMS</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkipPerson}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Skip This Contact &gt;</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* SELECTION VIEW: Pick Recipients & Filter */
            <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
              {/* Shortcut Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.shortcutScroll}
              >
                <TouchableOpacity
                  style={styles.shortcutPill}
                  onPress={handleSelectAll}
                >
                  <Text style={styles.shortcutText}>Select All ({pendingPeople.length})</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shortcutPill, styles.shortcutPillDanger]}
                  onPress={handleSelectOverdue}
                >
                  <Text style={[styles.shortcutText, styles.shortcutTextDanger]}>
                    Overdue Only
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutPill}
                  onPress={handleSelectCreditOnly}
                >
                  <Text style={styles.shortcutText}>Receivables (Credit)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutPill}
                  onPress={handleSelectDebtOnly}
                >
                  <Text style={styles.shortcutText}>Payables (Debt)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shortcutPill, styles.shortcutPillNeutral]}
                  onPress={handleDeselectAll}
                >
                  <Text style={styles.shortcutTextNeutral}>Clear Selection</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Selection Summary KPI Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Selected</Text>
                    <Text style={styles.summaryVal}>{selectionSummary.count} People</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Receivable</Text>
                    <Text style={[styles.summaryVal, { color: colors.receivable.text }]}>
                      {formatRupees(selectionSummary.receivable)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Payable</Text>
                    <Text style={[styles.summaryVal, { color: colors.payable.text }]}>
                      {formatRupees(selectionSummary.payable)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Message Language & Custom Note Config */}
              <View style={styles.configCard}>
                <View style={styles.configHeader}>
                  <Text style={styles.configTitle}>REMINDER SETTINGS</Text>
                  <TouchableOpacity
                    style={styles.langPill}
                    onPress={() => setLanguage((l) => (l === 'en' ? 'ml' : 'en'))}
                  >
                    <Languages size={12} color={colors.brand[600]} />
                    <Text style={styles.langPillText}>
                      {language === 'en' ? 'English (മലയാളം)' : 'മലയാളം (EN)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.noteInput}
                  placeholder="Add note to all messages (e.g. Pay via GPay to 9876543210)"
                  placeholderTextColor={colors.slate[400]}
                  value={customNote}
                  onChangeText={setCustomNote}
                />
              </View>

              {/* Contact Checklist */}
              <Text style={styles.listHeading}>
                SELECT CONTACTS ({selectedIds.size} / {pendingPeople.length})
              </Text>

              <View style={styles.peopleList}>
                {pendingPeople.map((p) => {
                  const isChecked = selectedIds.has(p.id);
                  const isRec = p.netBalance > 0;
                  const isOverdue = p.paymentStatus === 'overdue' || p.hasOverdue;

                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.personRow, isChecked && styles.personRowSelected]}
                      onPress={() => toggleSelectPerson(p.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.checkboxBox}>
                        {isChecked ? (
                          <CheckSquare size={20} color={colors.brand[600]} />
                        ) : (
                          <Square size={20} color={colors.slate[300]} />
                        )}
                      </View>

                      <View style={styles.personInfo}>
                        <View style={styles.personTopRow}>
                          <Text style={styles.personName} numberOfLines={1}>
                            {p.name}
                          </Text>
                          {isOverdue && (
                            <View style={styles.overdueBadge}>
                              <Text style={styles.overdueBadgeText}>Overdue</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.personPhone}>{p.phone || 'No phone'}</Text>
                      </View>

                      <View style={styles.personAmountBox}>
                        <Text
                          style={[
                            styles.personAmount,
                            isRec ? styles.textReceivable : styles.textPayable,
                          ]}
                        >
                          {formatRupees(Math.abs(p.netBalance))}
                        </Text>
                        <Text style={styles.personAmountSub}>
                          {isRec ? 'Receivable' : 'Payable'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Action Trigger Footer (when not in workflow) */}
          {!workflowActive && (
            <TouchableOpacity
              style={[
                styles.startWorkflowBtn,
                selectedIds.size === 0 && styles.btnDisabled,
              ]}
              onPress={handleStartWorkflow}
              disabled={selectedIds.size === 0}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color={colors.white} />
              <Text style={styles.startWorkflowBtnText}>
                Start Reminders for {selectedIds.size} Contacts
              </Text>
            </TouchableOpacity>
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
    maxWidth: 620,
    borderRadius: 24,
    maxHeight: '85%',
  },
  modalCardNarrow: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  bodyScroll: {
    flexGrow: 0,
  },
  shortcutScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  shortcutPill: {
    backgroundColor: colors.brand[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  shortcutPillDanger: {
    backgroundColor: colors.expense.bg,
  },
  shortcutPillNeutral: {
    backgroundColor: colors.slate[100],
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  shortcutTextDanger: {
    color: colors.expense.text,
  },
  shortcutTextNeutral: {
    color: colors.slate[600],
  },
  summaryCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[800],
  },
  configCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  configTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.5,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  langPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand[700],
  },
  noteInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    color: colors.slate[900],
  },
  listHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[500],
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  peopleList: {
    gap: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  personRowSelected: {
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[300],
  },
  checkboxBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInfo: {
    flex: 1,
  },
  personTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[900],
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
  personAmountBox: {
    alignItems: 'flex-end',
  },
  personAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  personAmountSub: {
    fontSize: 9,
    color: colors.slate[400],
    fontWeight: '600',
  },
  textReceivable: {
    color: colors.receivable.text,
  },
  textPayable: {
    color: colors.payable.text,
  },
  startWorkflowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  startWorkflowBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: colors.slate[400],
  },
  workflowScroll: {
    flexGrow: 0,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBg: {
    height: 8,
    backgroundColor: colors.slate[100],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand[600],
    borderRadius: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  progressSentText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.income.text,
  },
  currentPersonCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  currentPersonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  personAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand[700],
  },
  currentPersonName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
  },
  currentPersonPhone: {
    fontSize: 11,
    color: colors.slate[500],
  },
  currentPersonBalanceBox: {
    alignItems: 'flex-end',
  },
  currentPersonBalance: {
    fontSize: 14,
    fontWeight: '900',
  },
  currentPersonBalanceSub: {
    fontSize: 9,
    color: colors.slate[400],
    fontWeight: '600',
  },
  inputGroup: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  workflowMessageBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate[900],
    minHeight: 110,
  },
  workflowActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  workflowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  whatsAppBtn: {
    backgroundColor: '#16a34a',
  },
  smsBtn: {
    backgroundColor: colors.slate[800],
  },
  workflowBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[500],
  },
});
