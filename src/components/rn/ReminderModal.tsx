import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { X, MessageCircle, Phone, Calendar } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { CreditDebtRecord } from '../../types';

interface ReminderModalProps {
  visible: boolean;
  record: CreditDebtRecord | null;
  onClose: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  visible,
  record,
  onClose,
}) => {
  const [customMsg, setCustomMsg] = useState('');

  useEffect(() => {
    if (record) {
      const isCredit = record.type === 'credit';
      const amountStr = formatRupees(record.remainingAmount);
      const msg = isCredit
        ? `Hi ${record.counterpartName}, this is a friendly reminder regarding the outstanding balance of ${amountStr}${
            record.dueDate ? ` due on ${formatDate(record.dueDate)}` : ''
          }. Please arrange payment when convenient. Thank you!`
        : `Hi ${record.counterpartName}, updating you regarding the pending amount of ${amountStr}. Please let me know your preferred repayment method. Thank you!`;
      setCustomMsg(msg);
    }
  }, [record]);

  if (!visible || !record) return null;

  const isCredit = record.type === 'credit';
  const amountStr = formatRupees(record.remainingAmount);

  const handleSendWhatsApp = () => {
    if (!record.counterpartPhone) {
      Alert.alert('No Phone Number', `No phone number saved for ${record.counterpartName}.`);
      return;
    }

    const cleanPhone = record.counterpartPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `whatsapp://send?phone=${phoneWithCountry}&text=${encodeURIComponent(customMsg)}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(customMsg)}`);
    });
  };

  const handleSendSMS = () => {
    if (!record.counterpartPhone) {
      Alert.alert('No Phone Number', `No phone number saved for ${record.counterpartName}.`);
      return;
    }

    const cleanPhone = record.counterpartPhone.replace(/[^0-9]/g, '');
    Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(customMsg)}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Send Payment Reminder</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          {/* Record Summary Box */}
          <View style={styles.summaryBox}>
            <View>
              <Text style={styles.personName}>{record.counterpartName}</Text>
              <Text style={styles.phoneText}>
                {record.counterpartPhone || 'No phone number provided'}
              </Text>
              {record.dueDate && (
                <View style={styles.dueRow}>
                  <Calendar size={12} color={colors.slate[400]} />
                  <Text style={styles.dueText}>Due: {formatDate(record.dueDate)}</Text>
                </View>
              )}
            </View>

            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>
                {isCredit ? 'Receivable' : 'Payable'}
              </Text>
              <Text
                style={[
                  styles.amountVal,
                  isCredit ? styles.amountCredit : styles.amountDebt,
                ]}
              >
                {amountStr}
              </Text>
            </View>
          </View>

          {/* Customizable Message Text */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MESSAGE PREVIEW & CUSTOMIZATION</Text>
            <TextInput
              style={styles.messageInput}
              multiline
              numberOfLines={4}
              value={customMsg}
              onChangeText={setCustomMsg}
            />
          </View>

          {/* Send Buttons Row */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.whatsappBtn]}
              onPress={handleSendWhatsApp}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color={colors.white} />
              <Text style={styles.btnText}>Send via WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.smsBtn]}
              onPress={handleSendSMS}
              activeOpacity={0.8}
            >
              <Phone size={18} color={colors.white} />
              <Text style={styles.btnText}>Send via SMS</Text>
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
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate[900],
  },
  closeBtn: {
    padding: 6,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 16,
  },
  personName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[800],
  },
  phoneText: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dueText: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '600',
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[400],
    textTransform: 'uppercase',
  },
  amountVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  amountCredit: {
    color: colors.receivable.text,
  },
  amountDebt: {
    color: colors.payable.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[500],
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  messageInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: colors.slate[800],
    textAlignVertical: 'top',
    height: 90,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  whatsappBtn: {
    backgroundColor: '#16a34a',
  },
  smsBtn: {
    backgroundColor: colors.brand[600],
  },
  btnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
});
