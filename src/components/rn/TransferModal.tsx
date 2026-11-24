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
import { X, ArrowRightLeft, Check } from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
}) => {
  const { accounts, transferBetweenAccounts } = useWallet();

  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId] = useState(accounts[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);

  const handleTransfer = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transfer amount.');
      return;
    }
    if (fromId === toId) {
      Alert.alert('Same Account', 'Please choose different source and destination accounts.');
      return;
    }

    transferBetweenAccounts(fromId, toId, num, today, time, notes.trim() || undefined);
    Alert.alert(
      'Transfer Completed',
      `Transferred ${formatRupees(num)} from ${fromAcc?.name} to ${toAcc?.name}.`
    );
    setAmount('');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ArrowRightLeft size={20} color={colors.brand[600]} />
              <Text style={styles.title}>Account Transfer</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AMOUNT TO TRANSFER (₹)</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* From Account */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FROM ACCOUNT (SOURCE)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                {accounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.pill, fromId === a.id && styles.pillActive]}
                    onPress={() => setFromId(a.id)}
                  >
                    <Text style={[styles.pillText, fromId === a.id && styles.pillTextActive]}>
                      {a.name} ({formatRupees(a.currentBalance)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* To Account */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TO ACCOUNT (DESTINATION)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                {accounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.pill, toId === a.id && styles.pillActive]}
                    onPress={() => setToId(a.id)}
                  >
                    <Text style={[styles.pillText, toId === a.id && styles.pillTextActive]}>
                      {a.name} ({formatRupees(a.currentBalance)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>REFERENCE / NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ATM cash withdrawal, self UPI transfer..."
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleTransfer}>
              <Check size={18} color={colors.white} />
              <Text style={styles.submitBtnText}>Confirm Transfer</Text>
            </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 32,
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
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate[900],
  },
  closeBtn: {
    padding: 6,
  },
  inputGroup: {
    marginBottom: 14,
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
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
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
  pillsRow: {
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: colors.brand[600],
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  pillTextActive: {
    color: colors.white,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
