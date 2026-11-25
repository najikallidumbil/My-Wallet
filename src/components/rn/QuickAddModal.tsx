import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Camera,
  Image as ImageIcon,
  FileText,
  Trash2,
  Check,
  User,
  Phone,
  Sparkles,
  UserPlus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { Attachment, Person } from '../../types';
import { useResponsive } from '../../lib/useResponsive';
import { AddPersonModal } from './AddPersonModal';
import { DateTimePickerField } from './DateTimePickerField';
import { DatePickerField } from './DatePickerField';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: 'income' | 'expense' | 'credit' | 'debt';
  initialPersonName?: string;
  initialPersonPhone?: string;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  initialMode = 'expense',
  initialPersonName = '',
  initialPersonPhone = '',
}) => {
  const {
    categories,
    accounts,
    people,
    quickAdd,
    addPerson,
  } = useWallet();

  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  const [mode, setMode] = useState<'income' | 'expense' | 'credit' | 'debt'>(initialMode);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || 'acc-cash');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);

  const getNowLocal = () => {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    const hh = String(n.getHours()).padStart(2, '0');
    const mm = String(n.getMinutes()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  };

  const initialDateTime = getNowLocal();
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when modal is opened or initialMode changes
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setTitle('');
      setAmount('');
      setPersonName(initialPersonName);
      setPersonPhone(initialPersonPhone);
      setSelectedPersonId(null);
      setCategoryId('');
      setNotes('');
      setAttachments([]);
      setDueDate('');
      const current = getNowLocal();
      setDate(current.date);
      setTime(current.time);
    }
  }, [visible, initialMode, initialPersonName, initialPersonPhone]);

  // Filter categories by transaction type
  const availableCategories = useMemo(() => {
    return categories.filter((c) =>
      mode === 'income' ? c.type === 'income' : c.type === 'expense'
    );
  }, [categories, mode]);

  // Filter people suggestions for searchable suggestions
  const personSuggestions = useMemo(() => {
    if (!personName.trim()) return [];
    const q = personName.trim().toLowerCase();
    return people
      .filter((p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q)))
      .slice(0, 4);
  }, [people, personName]);

  const handleSelectPerson = (p: Person) => {
    setPersonName(p.name);
    setPersonPhone(p.phone || '');
    setSelectedPersonId(p.id);
  };

  const handlePersonNameChange = (text: string) => {
    setPersonName(text);
    const trimmed = text.trim().toLowerCase();
    const exactMatch = people.find((p) => p.name.trim().toLowerCase() === trimmed);
    if (exactMatch) {
      setSelectedPersonId(exactMatch.id);
      if (!personPhone && exactMatch.phone) {
        setPersonPhone(exactMatch.phone);
      }
    } else {
      setSelectedPersonId(null);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture receipt photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const newAttachment: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: asset.fileName || `Photo_${Date.now()}.jpg`,
          fileType: 'image/jpeg',
          fileSize: asset.fileSize || 0,
          storagePath: asset.uri,
          dataUrl: asset.uri,
          createdAt: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAttachment]);
      }
    } catch (err) {
      console.warn('Camera error:', err);
      Alert.alert('Camera Error', 'Could not access device camera.');
    }
  };

  const handleChooseImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Media library access is required to attach receipt images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newAtts: Attachment[] = result.assets.map((asset) => ({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: asset.fileName || `Image_${Date.now()}.jpg`,
          fileType: 'image/jpeg',
          fileSize: asset.fileSize || 0,
          storagePath: asset.uri,
          dataUrl: asset.uri,
          createdAt: new Date().toISOString(),
        }));
        setAttachments((prev) => [...prev, ...newAtts]);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      Alert.alert('Error', 'Could not open image gallery.');
    }
  };

  const handleChoosePDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const newAttachment: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: asset.name,
          fileType: 'application/pdf',
          fileSize: asset.size || 0,
          storagePath: asset.uri,
          dataUrl: asset.uri,
          createdAt: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAttachment]);
      }
    } catch (err) {
      console.warn('Document picker error:', err);
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'income' || mode === 'expense') {
        const cleanTitle = title.trim();
        if (!cleanTitle) {
          Alert.alert(
            'Required Field',
            mode === 'income'
              ? 'Please enter an income source / title.'
              : 'Please enter a transaction title.'
          );
          return;
        }

        const res = await quickAdd({
          mode,
          title: cleanTitle,
          amount: numAmount,
          categoryId: categoryId || availableCategories[0]?.id || (mode === 'income' ? 'cat-inc-1' : 'cat-exp-1'),
          accountId: accountId || accounts[0]?.id || 'acc-cash',
          date,
          time,
          description: notes.trim(),
          attachments,
        });

        if (res && !res.success) {
          Alert.alert('Database Save Error', res.error || 'Failed to save transaction to database.');
          return;
        }
      } else {
        // Credit or Debt (Khata)
        const cleanName = personName.trim();
        if (!cleanName) {
          Alert.alert('Required Field', 'Please enter or select the person\'s name.');
          return;
        }

        // Check if person exists in people (either by selected ID or case-insensitive name match)
        let matchedPerson =
          (selectedPersonId ? people.find((p) => p.id === selectedPersonId) : undefined) ||
          people.find((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase());

        let resolvedPersonId: string;
        let counterpartName = cleanName;
        let counterpartPhone = personPhone.trim();

        if (matchedPerson) {
          resolvedPersonId = matchedPerson.id;
          counterpartName = matchedPerson.name;
          if (!counterpartPhone && matchedPerson.phone) {
            counterpartPhone = matchedPerson.phone;
          }
        } else {
          // Automatically create new person record
          const createdPerson = await addPerson({
            name: cleanName,
            phone: counterpartPhone || undefined,
          });
          resolvedPersonId = createdPerson.id;
          counterpartName = createdPerson.name;
        }

        const res = await quickAdd({
          mode,
          title: counterpartName,
          counterpartName,
          counterpartPhone: counterpartPhone || undefined,
          personId: resolvedPersonId,
          amount: numAmount,
          date,
          time,
          dueDate: dueDate.trim() || undefined,
          description: notes.trim(),
          attachments,
        });

        if (res && !res.success) {
          Alert.alert('Database Save Error', res.error || 'Failed to save Khata record to database.');
          return;
        }
      }

      onClose();
    } catch (err: any) {
      console.error('[QuickAdd Submit Error]', err);
      Alert.alert(
        'Database Save Failed',
        err.message || 'Could not save record to database. Please check Supabase setup and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalTitle = () => {
    switch (mode) {
      case 'expense':
        return 'Add Expense';
      case 'income':
        return 'Add Income';
      case 'credit':
        return 'Give Money (Credit)';
      case 'debt':
        return 'Borrow Money (Debt)';
    }
  };

  const getModalSubtitle = () => {
    switch (mode) {
      case 'expense':
        return 'Personal expense • Deducts from cash balance';
      case 'income':
        return 'Personal income • Adds to cash balance';
      case 'credit':
        return 'Money given to person • Khata receivable (they owe you)';
      case 'debt':
        return 'Money borrowed from person • Khata payable (you owe them)';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.backdrop, isWide && styles.backdropWide]}>
        <View
          style={[
            styles.modalCard,
            isWide && styles.modalCardWide,
            isNarrowMobile && styles.modalCardNarrow,
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <Text style={styles.modalSubtitle}>{getModalSubtitle()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          {/* Mode Selector Pill Strip */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'expense' && styles.modeTabExpense]}
              onPress={() => setMode('expense')}
            >
              <Text
                style={[styles.modeTabText, mode === 'expense' && styles.modeTabTextActive]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'income' && styles.modeTabIncome]}
              onPress={() => setMode('income')}
            >
              <Text
                style={[styles.modeTabText, mode === 'income' && styles.modeTabTextActive]}
              >
                Income
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'credit' && styles.modeTabCredit]}
              onPress={() => setMode('credit')}
            >
              <Text
                style={[styles.modeTabText, mode === 'credit' && styles.modeTabTextActive]}
              >
                Lend (Credit)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'debt' && styles.modeTabDebt]}
              onPress={() => setMode('debt')}
            >
              <Text
                style={[styles.modeTabText, mode === 'debt' && styles.modeTabTextActive]}
              >
                Borrow (Debt)
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AMOUNT (₹) *</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.slate[400]}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Dynamic Field 1: Title (Income/Expense) or Person Details (Credit/Debt) */}
            {mode === 'credit' || mode === 'debt' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {mode === 'credit'
                      ? 'PERSON NAME (WHO RECEIVED MONEY?) *'
                      : 'PERSON NAME (WHO LENT YOU MONEY?) *'}
                  </Text>

                  {/* Unified Add Person Trigger */}
                  <View style={styles.personActionRow}>
                    <TouchableOpacity
                      style={styles.personActionBtn}
                      onPress={() => setIsAddPersonModalOpen(true)}
                      activeOpacity={0.7}
                    >
                      <UserPlus size={14} color={colors.brand[700]} />
                      <Text style={styles.personActionBtnText}>+ Add Person</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.personInputContainer}>
                    <User size={16} color={colors.slate[400]} style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInputWithIcon}
                      placeholder="Type person's name..."
                      placeholderTextColor={colors.slate[400]}
                      value={personName}
                      onChangeText={handlePersonNameChange}
                    />
                    {selectedPersonId && (
                      <View style={styles.linkedBadge}>
                        <Check size={12} color={colors.income.text} />
                        <Text style={styles.linkedBadgeText}>Saved</Text>
                      </View>
                    )}
                  </View>

                  {/* Searchable suggestions dropdown as user types */}
                  {personSuggestions.length > 0 && !selectedPersonId && (
                    <View style={styles.suggestionsBox}>
                      <Text style={styles.suggestionTitle}>Matching Contacts:</Text>
                      {personSuggestions.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectPerson(p)}
                        >
                          <View style={styles.suggestionAvatar}>
                            <Text style={styles.suggestionAvatarText}>
                              {p.name.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.suggestionInfo}>
                            <Text style={styles.suggestionName}>{p.name}</Text>
                            {p.phone ? (
                              <Text style={styles.suggestionPhone}>{p.phone}</Text>
                            ) : null}
                          </View>
                          <Sparkles size={14} color={colors.brand[600]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Quick selection pills for existing people */}
                  {people.length > 0 && (
                    <View style={styles.quickPeopleSection}>
                      <Text style={styles.quickPeopleLabel}>Quick Select:</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.personPills}
                      >
                        {people.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.personPill,
                              (selectedPersonId === p.id ||
                                personName.trim().toLowerCase() === p.name.trim().toLowerCase()) &&
                                styles.personPillActive,
                            ]}
                            onPress={() => handleSelectPerson(p)}
                          >
                            <Text
                              style={[
                                styles.personPillText,
                                (selectedPersonId === p.id ||
                                  personName.trim().toLowerCase() === p.name.trim().toLowerCase()) &&
                                  styles.personPillTextActive,
                              ]}
                            >
                              {p.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Optional Phone Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    PHONE NUMBER (FOR WHATSAPP / SMS REMINDERS)
                  </Text>
                  <View style={styles.personInputContainer}>
                    <Phone size={16} color={colors.slate[400]} style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInputWithIcon}
                      placeholder="10-digit mobile number (optional)"
                      placeholderTextColor={colors.slate[400]}
                      keyboardType="phone-pad"
                      value={personPhone}
                      onChangeText={setPersonPhone}
                    />
                  </View>
                </View>

                {/* Payment Due Date (Credit & Debt only) */}
                <DatePickerField
                  value={dueDate}
                  onChange={setDueDate}
                  label="EXPECTED REPAYMENT DUE DATE (OPTIONAL)"
                  placeholder="Select due date (optional)"
                />
              </>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {mode === 'income' ? 'INCOME SOURCE / TITLE *' : 'TRANSACTION TITLE / PURPOSE *'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    mode === 'income'
                      ? 'e.g. Monthly Salary, Freelance project, Dividend...'
                      : 'e.g. Grocery shopping, Electricity bill, Dinner...'
                  }
                  placeholderTextColor={colors.slate[400]}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            )}

            {/* Category Selector (Income & Expense only) */}
            {(mode === 'income' || mode === 'expense') && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {availableCategories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.catPill,
                        (categoryId === c.id || (!categoryId && availableCategories[0]?.id === c.id)) &&
                          styles.catPillActive,
                      ]}
                      onPress={() => setCategoryId(c.id)}
                    >
                      <View style={[styles.catDot, { backgroundColor: c.color }]} />
                      <Text
                        style={[
                          styles.catPillText,
                          (categoryId === c.id || (!categoryId && availableCategories[0]?.id === c.id)) &&
                            styles.catPillTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Account Selector (Income & Expense only) */}
            {(mode === 'income' || mode === 'expense') && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {mode === 'income' ? 'DEPOSITED TO ACCOUNT' : 'PAID FROM ACCOUNT'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {accounts.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.accPill,
                        accountId === a.id && styles.accPillActive,
                      ]}
                      onPress={() => setAccountId(a.id)}
                    >
                      <Text
                        style={[
                          styles.accPillText,
                          accountId === a.id && styles.accPillTextActive,
                        ]}
                      >
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ONE Single-Line Combined Date & Time Field */}
            <DateTimePickerField
              date={date}
              time={time}
              onChange={(newDate, newTime) => {
                setDate(newDate);
                setTime(newTime);
              }}
              label="TRANSACTION DATE & TIME"
            />

            {/* Notes / Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {mode === 'credit' || mode === 'debt' ? 'LOAN NOTES / REASON' : 'NOTES / DETAILS'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder={
                  mode === 'credit' || mode === 'debt'
                    ? 'Optional reason, terms or repayment details...'
                    : 'Optional notes or receipt reference...'
                }
                placeholderTextColor={colors.slate[400]}
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Attachments Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                ATTACHMENTS & RECEIPTS ({attachments.length})
              </Text>

              {/* Action Buttons: Take Photo, Choose Gallery, Choose PDF */}
              <View style={styles.attachBtnRow}>
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
                >
                  <Camera size={16} color={colors.brand[600]} />
                  <Text style={styles.attachBtnText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handleChooseImage}
                  activeOpacity={0.7}
                >
                  <ImageIcon size={16} color={colors.brand[600]} />
                  <Text style={styles.attachBtnText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handleChoosePDF}
                  activeOpacity={0.7}
                >
                  <FileText size={16} color={colors.brand[600]} />
                  <Text style={styles.attachBtnText}>PDF</Text>
                </TouchableOpacity>
              </View>

              {/* Previews List */}
              {attachments.length > 0 && (
                <View style={styles.previewGrid}>
                  {attachments.map((att) => {
                    const fileUri = att.dataUrl || att.storagePath;
                    const isImg =
                      att.fileType?.startsWith('image/') ||
                      fileUri?.match(/\.(jpg|jpeg|png|webp)/i);
                    return (
                      <View key={att.id} style={styles.previewItem}>
                        {isImg && fileUri ? (
                          <Image source={{ uri: fileUri }} style={styles.previewImage} />
                        ) : (
                          <View style={styles.previewPdfBox}>
                            <FileText size={24} color={colors.slate[600]} />
                            <Text style={styles.previewPdfName} numberOfLines={1}>
                              {att.fileName}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.removeAttachBtn}
                          onPress={() => handleRemoveAttachment(att.id)}
                        >
                          <Trash2 size={12} color={colors.white} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              mode === 'expense' && styles.submitBtnExpense,
              mode === 'income' && styles.submitBtnIncome,
              mode === 'credit' && styles.submitBtnCredit,
              mode === 'debt' && styles.submitBtnDebt,
              isSubmitting && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Check size={18} color={colors.white} />
                <Text style={styles.submitBtnText}>
                  Save {mode === 'credit' ? 'Credit Entry' : mode === 'debt' ? 'Debt Entry' : 'Transaction'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <AddPersonModal
        visible={isAddPersonModalOpen}
        onClose={() => setIsAddPersonModalOpen(false)}
        onPersonAdded={(p) => {
          handleSelectPerson(p);
        }}
      />
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
    maxHeight: '92%',
    padding: 20,
    paddingBottom: 32,
  },
  modalCardWide: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalCardNarrow: {
    padding: 14,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate[900],
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeTabExpense: {
    backgroundColor: colors.expense.solid,
  },
  modeTabIncome: {
    backgroundColor: colors.income.solid,
  },
  modeTabCredit: {
    backgroundColor: colors.receivable.solid,
  },
  modeTabDebt: {
    backgroundColor: colors.payable.solid,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[500],
  },
  modeTabTextActive: {
    color: colors.white,
  },
  formScroll: {
    maxHeight: 460,
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
    fontSize: 24,
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
  personActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  personActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 6,
  },
  personActionBtnSecondary: {
    backgroundColor: colors.slate[100],
    borderColor: colors.slate[300],
  },
  personActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[800],
  },
  personActionBtnTextDark: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[800],
  },
  personInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.slate[900],
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.income.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  linkedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
  },
  suggestionsBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 12,
    marginTop: 6,
    padding: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[400],
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 8,
  },
  suggestionAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand[700],
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[800],
  },
  suggestionPhone: {
    fontSize: 10,
    color: colors.slate[400],
  },
  quickPeopleSection: {
    marginTop: 8,
  },
  quickPeopleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[400],
    marginBottom: 4,
  },
  personPills: {
    flexDirection: 'row',
  },
  personPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    marginRight: 8,
  },
  personPillActive: {
    backgroundColor: colors.brand[600],
  },
  personPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  personPillTextActive: {
    color: colors.white,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  catScroll: {
    flexDirection: 'row',
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    marginRight: 8,
    gap: 6,
  },
  catPillActive: {
    backgroundColor: colors.slate[800],
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  catPillTextActive: {
    color: colors.white,
  },
  accPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    marginRight: 8,
  },
  accPillActive: {
    backgroundColor: colors.brand[600],
  },
  accPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  accPillTextActive: {
    color: colors.white,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  dualCol: {
    flex: 1,
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.slate[900],
  },
  attachBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  attachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand[100],
    paddingVertical: 10,
    gap: 6,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[700],
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  previewItem: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.slate[100],
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPdfBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  previewPdfName: {
    fontSize: 8,
    color: colors.slate[600],
    textAlign: 'center',
    marginTop: 2,
  },
  removeAttachBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.expense.solid,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  submitBtnExpense: {
    backgroundColor: colors.expense.solid,
  },
  submitBtnIncome: {
    backgroundColor: colors.income.solid,
  },
  submitBtnCredit: {
    backgroundColor: colors.receivable.solid,
  },
  submitBtnDebt: {
    backgroundColor: colors.payable.solid,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
