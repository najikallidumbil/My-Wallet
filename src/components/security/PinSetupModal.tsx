import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { X, Lock, Check, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useSecurity } from '../../context/SecurityContext';

interface PinSetupModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'setup' | 'change';
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  visible,
  onClose,
  mode,
}) => {
  const { hasPin, setAppPin, verifyCurrentPin, isAppLockEnabled, setAppLockEnabled } = useSecurity();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setErrorMessage(null);

    // If changing PIN, verify current PIN first
    if (mode === 'change' && hasPin) {
      if (!currentPin) {
        setErrorMessage('Please enter your current PIN.');
        return;
      }
      const isCurrentValid = await verifyCurrentPin(currentPin);
      if (!isCurrentValid) {
        setErrorMessage('Current PIN is incorrect.');
        return;
      }
    }

    // Validate new PIN
    if (!/^\d{4,6}$/.test(newPin)) {
      setErrorMessage('PIN must be 4 to 6 numeric digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('New PIN and confirmation do not match.');
      return;
    }

    const res = await setAppPin(newPin);
    if (res.success) {
      if (!isAppLockEnabled) {
        await setAppLockEnabled(true);
      }
      Alert.alert(
        'PIN Saved',
        mode === 'change'
          ? 'Your App PIN has been updated successfully.'
          : 'Your new App PIN is now active and App Lock has been enabled.'
      );
      resetForm();
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to save PIN.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        resetForm();
        onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Lock size={18} color={colors.brand[600]} />
              <Text style={styles.title}>
                {mode === 'change' ? 'Change App PIN' : 'Set App PIN'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                resetForm();
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.body}>
            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={15} color={colors.expense.text} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {mode === 'change' && hasPin && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current PIN</Text>
                <TextInput
                  style={styles.input}
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  placeholder="Enter current PIN"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New 4–6 Digit PIN</Text>
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter 4 to 6 digits"
                placeholderTextColor={colors.slate[400]}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Re-enter new PIN"
                placeholderTextColor={colors.slate[400]}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
            </View>

            <View style={styles.hintBox}>
              <ShieldCheck size={14} color={colors.brand[600]} />
              <Text style={styles.hintText}>
                Your PIN is securely hashed on your device and will be used as a fallback if biometric authentication fails.
              </Text>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Check size={16} color={colors.white} />
              <Text style={styles.saveBtnText}>Save Security PIN</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
    backgroundColor: colors.slate[50],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate[900],
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
    gap: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    color: colors.expense.text,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.slate[900],
    backgroundColor: colors.slate[50],
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.brand[50],
    padding: 10,
    borderRadius: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 11,
    color: colors.brand[900],
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: colors.brand[600],
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
