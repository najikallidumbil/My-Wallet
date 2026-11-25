import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  X,
  UserPlus,
  Check,
  Contact,
  AlertCircle,
  Smartphone,
  Phone,
  User,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { Person } from '../../types';
import {
  pickContactFromDevice,
  findDuplicatePerson,
  openDeviceSettings,
  ContactPhoneNumber,
} from '../../lib/contactPicker';
import { PhoneSelectorModal } from './PhoneSelectorModal';

interface AddPersonModalProps {
  visible: boolean;
  onClose: () => void;
  onPersonAdded?: (person: Person) => void;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  visible,
  onClose,
  onPersonAdded,
}) => {
  const { people, addPerson } = useWallet();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Phone selection dialog state for contacts with multiple numbers
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [pendingPhones, setPendingPhones] = useState<ContactPhoneNumber[]>([]);
  const [pendingContactName, setPendingContactName] = useState('');

  const handleClose = () => {
    setName('');
    setPhone('');
    setImportNotice(null);
    setPhoneModalVisible(false);
    onClose();
  };

  const handleImportFromContacts = async () => {
    setImportNotice(null);
    setIsImporting(true);

    try {
      const result = await pickContactFromDevice();

      if (result.success && result.contact) {
        const { name: importedName, phone: importedPhone, phones, hasNoPhone } = result.contact;
        setName(importedName);

        if (phones && phones.length > 1) {
          // Multiple numbers: ask user to select preferred number
          setPendingContactName(importedName);
          setPendingPhones(phones);
          setPhoneModalVisible(true);
        } else if (hasNoPhone || !importedPhone) {
          setPhone('');
          setImportNotice('Contact name imported. Please enter phone number manually.');
          Alert.alert(
            'No Phone Number Found',
            'No phone number found for this contact. Please enter manually.'
          );
        } else {
          setPhone(importedPhone);
          setImportNotice('Contact imported. You can edit details before saving.');
        }

        // Check for duplicates to inform the user
        const duplicate = findDuplicatePerson(importedName, importedPhone, people);
        if (duplicate) {
          Alert.alert(
            'Contact Already Exists',
            `"${duplicate.name}" (${duplicate.phone || 'No phone'}) is already in your Khata Book. Saving will use and update their existing profile.`
          );
        }
      } else if (result.permissionDenied) {
        if (result.canOpenSettings) {
          Alert.alert(
            'Contacts Permission Required',
            'MY WALLET needs permission to access your device contacts so you can quickly add people to your Khata Book.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openDeviceSettings() },
            ]
          );
        } else {
          Alert.alert(
            'Permission Denied',
            'Contacts permission was denied. You can enter the name and phone number manually, or enable permission in Settings.'
          );
        }
      } else if (!result.cancelled && result.error) {
        Alert.alert('Contacts Notice', result.error);
      }
    } catch (err) {
      Alert.alert(
        'Contacts',
        'Could not access phone contacts. Please enter name and phone number manually.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Required Field', 'Please enter a name for the person or customer.');
      return;
    }

    const cleanPhone = phone.trim() || undefined;

    // Check duplicate
    const duplicate = findDuplicatePerson(cleanName, cleanPhone, people);
    if (duplicate) {
      Alert.alert(
        'Duplicate Contact Found',
        `"${duplicate.name}" already exists in your Khata Book. Do you want to proceed and link with this contact?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Use Existing Contact',
            onPress: async () => {
              setIsSaving(true);
              try {
                const saved = await addPerson({
                  name: cleanName,
                  phone: cleanPhone,
                });
                onPersonAdded?.(saved);
                handleClose();
              } catch (err: any) {
                Alert.alert('Database Save Error', err.message || 'Failed to link existing contact.');
              } finally {
                setIsSaving(false);
              }
            },
          },
        ]
      );
      return;
    }

    setIsSaving(true);
    try {
      const saved = await addPerson({
        name: cleanName,
        phone: cleanPhone,
      });

      onPersonAdded?.(saved);
      handleClose();
      Alert.alert('Person Added', `"${cleanName}" saved to Supabase and Khata Book.`);
    } catch (err: any) {
      console.error('[AddPerson Error]', err);
      Alert.alert(
        'Database Save Failed',
        err.message || 'Could not save person to database. Please check your Supabase connection and try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={styles.titleIconBox}>
                  <UserPlus size={18} color={colors.brand[600]} />
                </View>
                <View>
                  <Text style={styles.title}>Add Person / Customer</Text>
                  <Text style={styles.subtitle}>Khata Book Contact</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Import from Device Contacts Action Button */}
              <TouchableOpacity
                style={styles.importBtn}
                onPress={handleImportFromContacts}
                disabled={isImporting}
                activeOpacity={0.8}
              >
                <View style={styles.importBtnLeft}>
                  <View style={styles.importIconBox}>
                    {isImporting ? (
                      <ActivityIndicator size="small" color={colors.brand[700]} />
                    ) : (
                      <Contact size={18} color={colors.brand[700]} />
                    )}
                  </View>
                  <View style={styles.importBtnTextContainer}>
                    <Text style={styles.importBtnTitle}>Import from Device Contacts</Text>
                    <Text style={styles.importBtnSub}>
                      Pick directly from your phone address book
                    </Text>
                  </View>
                </View>
                <View style={styles.importBadge}>
                  <Smartphone size={12} color={colors.brand[600]} />
                  <Text style={styles.importBadgeText}>Contacts</Text>
                </View>
              </TouchableOpacity>

              {/* Import Notice Pill */}
              {importNotice && (
                <View style={styles.noticePill}>
                  <AlertCircle size={14} color={colors.income.text} />
                  <Text style={styles.noticeText}>{importNotice}</Text>
                </View>
              )}

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Name Field */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>
                    <User size={12} color={colors.slate[500]} /> FULL NAME *
                  </Text>
                  <TouchableOpacity
                    style={styles.quickImportPill}
                    onPress={handleImportFromContacts}
                    activeOpacity={0.7}
                  >
                    <Contact size={11} color={colors.brand[600]} />
                    <Text style={styles.quickImportText}>Pick</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Rahul Sharma, Rahman, Vendor..."
                  placeholderTextColor={colors.slate[400]}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Phone Field */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>
                    <Phone size={12} color={colors.slate[500]} /> MOBILE PHONE NUMBER (OPTIONAL)
                  </Text>
                  {pendingPhones.length > 1 && (
                    <TouchableOpacity
                      style={styles.quickImportPill}
                      onPress={() => setPhoneModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickImportText}>Choose from {pendingPhones.length} nos</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +91 98765 43210 (Used for WhatsApp & SMS)"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Save Action */}
              <TouchableOpacity
                style={[styles.submitBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Check size={18} color={colors.white} />
                    <Text style={styles.submitBtnText}>Save Person</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Phone Selection Modal for Contacts with Multiple Numbers */}
      <PhoneSelectorModal
        visible={phoneModalVisible}
        contactName={pendingContactName || name}
        phones={pendingPhones}
        onSelectPhone={(selectedNum) => {
          setPhone(selectedNum);
          setImportNotice(`Selected number: ${selectedNum}`);
        }}
        onClose={() => setPhoneModalVisible(false)}
      />
    </>
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
    maxHeight: '90%',
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
    gap: 10,
  },
  titleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.brand[50],
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
    fontWeight: '600',
    color: colors.slate[500],
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  importBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  importBtnTextContainer: {
    flex: 1,
  },
  importIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand[900],
  },
  importBtnSub: {
    fontSize: 11,
    color: colors.brand[700],
    marginTop: 1,
  },
  importBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  importBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brand[700],
  },
  noticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.income.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
    flex: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate[200],
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[600],
    letterSpacing: 0.5,
  },
  quickImportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  quickImportText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand[700],
  },
  textInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
    marginTop: 8,
    gap: 8,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
