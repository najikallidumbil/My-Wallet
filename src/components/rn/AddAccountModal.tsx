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
import { X, Plus, Landmark } from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { AccountType } from '../../types';

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  visible,
  onClose,
}) => {
  const { addAccount } = useWallet();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const accountTypes: { label: string; value: AccountType }[] = [
    { label: 'Bank Account', value: 'bank' },
    { label: 'UPI Wallet', value: 'upi' },
    { label: 'Cash in Hand', value: 'cash' },
    { label: 'Custom / Card', value: 'custom' },
  ];

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter account or wallet name.');
      return;
    }

    const ob = parseFloat(openingBalance) || 0;
    addAccount({
      name: name.trim(),
      type,
      openingBalance: ob,
      accountNumber: accountNumber.trim() || undefined,
      color: type === 'bank' ? '#3b82f6' : type === 'upi' ? '#6366f1' : '#10b981',
      icon: type === 'bank' ? 'Building2' : type === 'upi' ? 'Smartphone' : 'Banknote',
      isDefault: false,
    });

    setName('');
    setOpeningBalance('');
    setAccountNumber('');
    onClose();
    Alert.alert('Success', `Added account "${name.trim()}".`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Landmark size={20} color={colors.brand[600]} />
              <Text style={styles.title}>Add Account / Wallet</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Account Type Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ACCOUNT TYPE</Text>
              <View style={styles.typeRow}>
                {accountTypes.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        type === t.value && styles.typeBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Account Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ACCOUNT / WALLET NAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. HDFC Salary, Paytm Wallet, Cash..."
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Opening Balance */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OPENING BALANCE (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={openingBalance}
                onChangeText={setOpeningBalance}
              />
            </View>

            {/* Account Number (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ACCOUNT NUMBER / UPI ID (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Last 4 digits: 4892 or name@upi"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Plus size={18} color={colors.white} />
              <Text style={styles.submitBtnText}>Create Account</Text>
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
  },
  typeBtnActive: {
    backgroundColor: colors.brand[600],
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
  typeBtnTextActive: {
    color: colors.white,
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
