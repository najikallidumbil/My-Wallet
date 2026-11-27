import React, { useState, useEffect } from 'react';
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
  Copy,
  Check,
  Languages,
  AlertTriangle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { PersonSummary, CreditDebtRecord, MessageType, MessageLanguage } from '../../types';
import { useResponsive } from '../../lib/useResponsive';
import {
  generateKhataMessage,
  getWhatsAppUrl,
  getWhatsAppWebUrl,
  getSMSUrl,
} from '../../lib/smartMessaging';

interface SmartMessageModalProps {
  visible: boolean;
  person: PersonSummary | null;
  record?: CreditDebtRecord | null;
  initialType?: MessageType;
  onClose: () => void;
}

export const SmartMessageModal: React.FC<SmartMessageModalProps> = ({
  visible,
  person,
  record,
  initialType = 'payment_reminder',
  onClose,
}) => {
  const { logMessage } = useWallet();
  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const [messageType, setMessageType] = useState<MessageType>(initialType);
  const [language, setLanguage] = useState<MessageLanguage>('en');
  const [customNote, setCustomNote] = useState('');
  const [editableMessage, setEditableMessage] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Sync state whenever modal opens or person/record/type changes
  useEffect(() => {
    if (visible && person) {
      setMessageType(
        person.paymentStatus === 'overdue' || (record && record.status === 'overdue')
          ? 'overdue_reminder'
          : initialType
      );
      setRecipientPhone(person.phone || record?.counterpartPhone || '');
      setCustomNote('');
      setIsCopied(false);

      const generated = generateKhataMessage({
        personName: person.name,
        type:
          person.paymentStatus === 'overdue' || (record && record.status === 'overdue')
            ? 'overdue_reminder'
            : initialType,
        language,
        netBalance: person.netBalance,
        originalAmount: record?.originalAmount || person.totalGiven || person.totalBorrowed,
        alreadyPaid: record?.settledAmount || person.totalReceivedBack || person.totalRepaid,
        remainingBalance:
          record?.remainingAmount !== undefined
            ? record.remainingAmount
            : Math.abs(person.netBalance),
        dueDate: record?.dueDate || person.nextDueDate,
        description: record?.notes,
        customNote: '',
      });
      setEditableMessage(generated);
    }
  }, [visible, person, record, initialType, language]);

  // Regenerate message when type, language, or custom note changes
  const handleRegenerate = (newType: MessageType, newLang: MessageLanguage, newNote: string) => {
    if (!person) return;
    const generated = generateKhataMessage({
      personName: person.name,
      type: newType,
      language: newLang,
      netBalance: person.netBalance,
      originalAmount: record?.originalAmount || person.totalGiven || person.totalBorrowed,
      alreadyPaid: record?.settledAmount || person.totalReceivedBack || person.totalRepaid,
      remainingBalance:
        record?.remainingAmount !== undefined
          ? record.remainingAmount
          : Math.abs(person.netBalance),
      dueDate: record?.dueDate || person.nextDueDate,
      description: record?.notes,
      customNote: newNote,
    });
    setEditableMessage(generated);
  };

  const handleTypeChange = (type: MessageType) => {
    setMessageType(type);
    handleRegenerate(type, language, customNote);
  };

  const handleLanguageToggle = () => {
    const nextLang = language === 'en' ? 'ml' : 'en';
    setLanguage(nextLang);
    handleRegenerate(messageType, nextLang, customNote);
  };

  const handleNoteChange = (text: string) => {
    setCustomNote(text);
    handleRegenerate(messageType, language, text);
  };

  // 1. WhatsApp Action
  const handleSendWhatsApp = async () => {
    if (!recipientPhone.trim()) {
      Alert.alert(
        'Phone Number Required',
        'Please enter the recipient phone number to send a WhatsApp reminder.'
      );
      return;
    }

    const cleanPhone = recipientPhone.trim();
    const appUrl = getWhatsAppUrl(cleanPhone, editableMessage);
    const webUrl = getWhatsAppWebUrl(cleanPhone, editableMessage);

    try {
      await logMessage({
        personId: person?.id,
        personName: person?.name || 'Customer',
        recipientPhone: cleanPhone,
        messageType,
        channel: 'whatsapp',
        status: 'opened_in_whatsapp',
        messageContent: editableMessage,
        language,
        amount: Math.abs(person?.netBalance || record?.remainingAmount || 0),
        sentAt: new Date().toISOString(),
      });

      Linking.openURL(appUrl).catch(() => {
        Linking.openURL(webUrl);
      });

      onClose();
    } catch (err) {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  // 2. SMS Action
  const handleSendSMS = async () => {
    if (!recipientPhone.trim()) {
      Alert.alert(
        'Phone Number Required',
        'Please enter the recipient phone number to send an SMS reminder.'
      );
      return;
    }

    const cleanPhone = recipientPhone.trim();
    const smsUrl = getSMSUrl(cleanPhone, editableMessage);

    try {
      await logMessage({
        personId: person?.id,
        personName: person?.name || 'Customer',
        recipientPhone: cleanPhone,
        messageType,
        channel: 'sms',
        status: 'opened_in_sms',
        messageContent: editableMessage,
        language,
        amount: Math.abs(person?.netBalance || record?.remainingAmount || 0),
        sentAt: new Date().toISOString(),
      });

      Linking.openURL(smsUrl);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Could not open SMS composer.');
    }
  };

  // 3. Copy to Clipboard Action
  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(editableMessage);
      }
      setIsCopied(true);

      await logMessage({
        personId: person?.id,
        personName: person?.name || 'Customer',
        recipientPhone: recipientPhone.trim() || undefined,
        messageType,
        channel: 'copied',
        status: 'prepared',
        messageContent: editableMessage,
        language,
        amount: Math.abs(person?.netBalance || record?.remainingAmount || 0),
        sentAt: new Date().toISOString(),
      });

      setTimeout(() => setIsCopied(false), 2500);
      Alert.alert('Message Copied', 'Personalized message copied to clipboard.');
    } catch (err) {
      Alert.alert('Notice', 'Could not copy automatically. You can copy the text directly.');
    }
  };

  if (!person) return null;

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
            <View style={styles.headerLeft}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {person.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title} numberOfLines={1}>
                  Smart Reminder: {person.name}
                </Text>
                <Text style={styles.subtitle}>
                  Balance: {formatRupees(Math.abs(person.netBalance))}{' '}
                  {person.netBalance > 0 ? '(Receivable)' : person.netBalance < 0 ? '(Payable)' : '(Settled)'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Language & Template Switcher Bar */}
            <View style={styles.controlRow}>
              <Text style={styles.sectionHeading}>MESSAGE TEMPLATE</Text>

              <TouchableOpacity
                style={styles.langPill}
                onPress={handleLanguageToggle}
                activeOpacity={0.7}
              >
                <Languages size={13} color={colors.brand[600]} />
                <Text style={styles.langPillText}>
                  {language === 'en' ? 'English (മലയാളം മാറ്റുക)' : 'മലയാളം (Switch to EN)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Message Type Selector Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeScroll}
            >
              <TouchableOpacity
                style={[
                  styles.typePill,
                  messageType === 'payment_reminder' && styles.typePillActive,
                ]}
                onPress={() => handleTypeChange('payment_reminder')}
              >
                <Clock size={13} color={messageType === 'payment_reminder' ? colors.white : colors.slate[600]} />
                <Text style={[styles.typePillText, messageType === 'payment_reminder' && styles.typePillTextActive]}>
                  Payment Reminder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  messageType === 'due_date_reminder' && styles.typePillActive,
                ]}
                onPress={() => handleTypeChange('due_date_reminder')}
              >
                <AlertTriangle size={13} color={messageType === 'due_date_reminder' ? colors.white : colors.slate[600]} />
                <Text style={[styles.typePillText, messageType === 'due_date_reminder' && styles.typePillTextActive]}>
                  Due Date
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  messageType === 'overdue_reminder' && styles.typePillActiveDanger,
                ]}
                onPress={() => handleTypeChange('overdue_reminder')}
              >
                <AlertTriangle size={13} color={messageType === 'overdue_reminder' ? colors.white : colors.expense.solid} />
                <Text style={[styles.typePillText, messageType === 'overdue_reminder' && styles.typePillTextActive]}>
                  Overdue Alert
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  messageType === 'payment_received' && styles.typePillActiveSuccess,
                ]}
                onPress={() => handleTypeChange('payment_received')}
              >
                <ArrowDownLeft size={13} color={messageType === 'payment_received' ? colors.white : colors.income.solid} />
                <Text style={[styles.typePillText, messageType === 'payment_received' && styles.typePillTextActive]}>
                  Payment Received
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  messageType === 'payment_made' && styles.typePillActive,
                ]}
                onPress={() => handleTypeChange('payment_made')}
              >
                <ArrowUpRight size={13} color={messageType === 'payment_made' ? colors.white : colors.slate[600]} />
                <Text style={[styles.typePillText, messageType === 'payment_made' && styles.typePillTextActive]}>
                  Payment Made
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePill,
                  messageType === 'personal' && styles.typePillActive,
                ]}
                onPress={() => handleTypeChange('personal')}
              >
                <FileText size={13} color={messageType === 'personal' ? colors.white : colors.slate[600]} />
                <Text style={[styles.typePillText, messageType === 'personal' && styles.typePillTextActive]}>
                  Personal Note
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Recipient Mobile Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RECIPIENT PHONE NUMBER</Text>
              <View style={styles.phoneInputRow}>
                <Phone size={15} color={colors.slate[400]} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="e.g. 9876543210 (WhatsApp / SMS)"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="phone-pad"
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                />
              </View>
            </View>

            {/* Optional Personal Note to Include */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADD PERSONAL NOTE (OPTIONAL)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Please send via UPI to 9876543210@upi"
                placeholderTextColor={colors.slate[400]}
                value={customNote}
                onChangeText={handleNoteChange}
              />
            </View>

            {/* Live Editable Message Box */}
            <View style={styles.inputGroup}>
              <View style={styles.previewHeader}>
                <Text style={styles.inputLabel}>MESSAGE PREVIEW (EDITABLE BEFORE SENDING)</Text>
                <TouchableOpacity onPress={handleCopy} style={styles.copyPill}>
                  {isCopied ? (
                    <Check size={12} color={colors.income.text} />
                  ) : (
                    <Copy size={12} color={colors.slate[600]} />
                  )}
                  <Text style={[styles.copyPillText, isCopied && { color: colors.income.text }]}>
                    {isCopied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.messageBox}
                multiline
                numberOfLines={7}
                textAlignVertical="top"
                value={editableMessage}
                onChangeText={setEditableMessage}
              />
            </View>
          </ScrollView>

          {/* Action Send Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.channelBtn, styles.whatsAppBtn]}
              onPress={handleSendWhatsApp}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color={colors.white} />
              <Text style={styles.channelBtnText}>Send via WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelBtn, styles.smsBtn]}
              onPress={handleSendSMS}
              activeOpacity={0.8}
            >
              <Phone size={18} color={colors.white} />
              <Text style={styles.channelBtnText}>Send via SMS</Text>
            </TouchableOpacity>
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
    maxWidth: 580,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand[700],
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    flexShrink: 0,
  },
  bodyScroll: {
    flexGrow: 0,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeading: {
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
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  langPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand[700],
  },
  typeScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 8,
    gap: 6,
  },
  typePillActive: {
    backgroundColor: colors.brand[600],
  },
  typePillActiveDanger: {
    backgroundColor: colors.expense.solid,
  },
  typePillActiveSuccess: {
    backgroundColor: colors.income.solid,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  typePillTextActive: {
    color: colors.white,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.slate[900],
  },
  noteInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.slate[900],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  copyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[600],
  },
  messageBox: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate[900],
    minHeight: 120,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  channelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  whatsAppBtn: {
    backgroundColor: '#16a34a',
  },
  smsBtn: {
    backgroundColor: colors.slate[800],
  },
  channelBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
});
