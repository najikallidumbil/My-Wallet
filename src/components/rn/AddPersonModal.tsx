import React, { useState, useEffect } from 'react';
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
  Phone,
  User,
  ArrowLeft,
  ChevronRight,
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

type AddPersonStep = 'choose' | 'form';
type AddPersonSource = 'contacts' | 'manual';

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  visible,
  onClose,
  onPersonAdded,
}) => {
  const { people, addPerson } = useWallet();

  const [step, setStep] = useState<AddPersonStep>('choose');
  const [source, setSource] = useState<AddPersonSource>('manual');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Phone selection dialog state for contacts with multiple numbers
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [pendingPhones, setPendingPhones] = useState<ContactPhoneNumber[]>([]);
  const [pendingContactName, setPendingContactName] = useState('');

  // Reset to initial choose screen whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      setStep('choose');
      setSource('manual');
      setName('');
      setPhone('');
      setImportNotice(null);
      setIsImporting(false);
      setIsSaving(false);
      setPhoneModalVisible(false);
    }
  }, [visible]);

  const handleClose = () => {
    setName('');
    setPhone('');
    setImportNotice(null);
    setPhoneModalVisible(false);
    setStep('choose');
    onClose();
  };

  const handleBackToOptions = () => {
    setStep('choose');
    setImportNotice(null);
  };

  // Option 1: Pick contact from device
  const handleSelectFromContacts = async () => {
    setImportNotice(null);
    setIsImporting(true);

    try {
      const result = await pickContactFromDevice();

      if (result.success && result.contact) {
        const { name: importedName, phone: importedPhone, phones, hasNoPhone } = result.contact;
        setName(importedName);
        setSource('contacts');

        if (phones && phones.length > 1) {
          // Multiple numbers: ask user to select preferred number
          setPendingContactName(importedName);
          setPendingPhones(phones);
          setPhoneModalVisible(true);
        } else if (hasNoPhone || !importedPhone) {
          setPhone('');
          setImportNotice('Contact name imported. Please enter mobile number.');
        } else {
          setPhone(importedPhone);
          setImportNotice('Contact imported. You can edit details before saving.');
        }

        // Check for duplicates
        const duplicate = findDuplicatePerson(importedName, importedPhone, people);
        if (duplicate) {
          Alert.alert(
            'Contact Already Exists',
            `"${duplicate.name}" (${duplicate.phone || 'No phone'}) is already in your Khata Book. Saving will use and update their existing profile.`
          );
        }

        // Advance to form screen for review/editing
        setStep('form');
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
        'Contacts Notice',
        'Could not access phone contacts. Please enter name and phone number manually.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Option 2: Add Person manually
  const handleSelectManual = () => {
    setName('');
    setPhone('');
    setImportNotice(null);
    setSource('manual');
    setStep('form');
  };

  // Save Person to Supabase
  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Required Field', 'Please enter a full name for the person.');
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
      Alert.alert('Person Added', `"${cleanName}" added successfully.`);
    } catch (err: any) {
      console.error('[AddPerson Error]', err);
      Alert.alert(
        'Database Save Failed',
        err.message || 'Could not save person to database. Please check your connection and try again.'
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
            {/* STEP 1: INITIAL TWO-OPTION INTERFACE */}
            {step === 'choose' ? (
              <View>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.titleRow}>
                    <View style={styles.titleIconBox}>
                      <UserPlus size={18} color={colors.brand[600]} />
                    </View>
                    <View>
                      <Text style={styles.title}>Add Person</Text>
                      <Text style={styles.subtitle}>Choose an option to continue</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <X size={20} color={colors.slate[600]} />
                  </TouchableOpacity>
                </View>

                {/* ONLY TWO CLEAR OPTIONS */}
                <View style={styles.optionsContainer}>
                  {/* Option 1: From Contacts */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={handleSelectFromContacts}
                    disabled={isImporting}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.optionIconBox, styles.contactsIconBox]}>
                      {isImporting ? (
                        <ActivityIndicator size="small" color={colors.brand[600]} />
                      ) : (
                        <Contact size={22} color={colors.brand[600]} />
                      )}
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>From Contacts</Text>
                      <Text style={styles.optionDescription}>
                        Select a contact from your phone address book
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.slate[400]} />
                  </TouchableOpacity>

                  {/* Option 2: Add Person (Manual) */}
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={handleSelectManual}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.optionIconBox, styles.manualIconBox]}>
                      <UserPlus size={22} color={colors.income.text} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Add Person</Text>
                      <Text style={styles.optionDescription}>
                        Enter full name and mobile number manually
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.slate[400]} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* STEP 2: ENTRY / EDITING FORM */
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header with Back Button */}
                <View style={styles.header}>
                  <View style={styles.titleRow}>
                    <TouchableOpacity
                      onPress={handleBackToOptions}
                      style={styles.backBtn}
                      activeOpacity={0.7}
                    >
                      <ArrowLeft size={18} color={colors.slate[700]} />
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.title}>
                        {source === 'contacts' ? 'Contact Details' : 'Add Person'}
                      </Text>
                      <Text style={styles.subtitle}>
                        {source === 'contacts'
                          ? 'Review & edit before saving'
                          : 'Enter person details'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <X size={20} color={colors.slate[600]} />
                  </TouchableOpacity>
                </View>

                {/* Import Notice Pill */}
                {importNotice && (
                  <View style={styles.noticePill}>
                    <AlertCircle size={14} color={colors.income.text} />
                    <Text style={styles.noticeText}>{importNotice}</Text>
                  </View>
                )}

                {/* Field 1: Full Name (Required) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <User size={12} color={colors.slate[500]} /> FULL NAME *
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Rajesh Kumar"
                    placeholderTextColor={colors.slate[400]}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoFocus={source === 'manual'}
                  />
                </View>

                {/* Field 2: Mobile Number (Optional) */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={styles.inputLabel}>
                      <Phone size={12} color={colors.slate[500]} /> MOBILE PHONE NUMBER (OPTIONAL)
                    </Text>
                    {pendingPhones.length > 1 && (
                      <TouchableOpacity
                        style={styles.phoneChangePill}
                        onPress={() => setPhoneModalVisible(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.phoneChangeText}>
                          Select number ({pendingPhones.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. +91 98765 43210 (Used for Reminders)"
                    placeholderTextColor={colors.slate[400]}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                {/* Save Action Button */}
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

                {/* Secondary Back Link */}
                <TouchableOpacity
                  style={styles.secondaryBackBtn}
                  onPress={handleBackToOptions}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBackText}>Back to options</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
    flex: 1,
  },
  titleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
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
  optionsContainer: {
    gap: 12,
    marginVertical: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[50],
  },
  optionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactsIconBox: {
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  manualIconBox: {
    backgroundColor: colors.income.bg,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate[900],
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[500],
    lineHeight: 16,
  },
  noticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.income.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
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
    marginBottom: 6,
  },
  phoneChangePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  phoneChangeText: {
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
    paddingVertical: 12,
    fontSize: 14,
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
  secondaryBackBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  secondaryBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[500],
  },
});
