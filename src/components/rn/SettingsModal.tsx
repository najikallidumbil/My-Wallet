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
  ActivityIndicator,
  Share,
  Platform,
  Switch,
} from 'react-native';
import {
  X,
  Settings,
  Trash2,
  Wallet,
  Shield,
  Check,
  Mail,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  LogOut,
  KeyRound,
  FileText,
  AlertCircle,
  Sparkles,
  Phone,
  Lock,
  Fingerprint,
  Smile,
  Clock,
  Database,
  History,
  HardDrive,
  Save,
  Tag,
  ChevronRight,
  Layers,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { useSecurity } from '../../context/SecurityContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { SupabaseConfigModal } from '../auth/SupabaseConfigModal';
import { ClearDataOtpModal } from './ClearDataOtpModal';
import { PinSetupModal } from '../security/PinSetupModal';
import { CategoryManagementModal } from './CategoryManagementModal';
import { WalletBackupEntry } from '../../services/backupService';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    openingBalance,
    setOpeningBalance,
    resetToDefaults,
    transactions,
    creditDebtRecords,
    people,
    accounts,
    categories,
    syncState,
    lastSyncedAt,
    pendingSyncCount,
    hasUnmigratedLocalData,
    triggerManualSync,
    migrateLocalDataToCloud,
    exportAllDataJson,
    exportTransactionsCsv,
    restoreFromJsonBackup,
    triggerBackupNow,
    backupHistory,
    lastBackupTime,
    refreshBackupHistory,
    restoreFromBackupEntry,
  } = useWallet();

  const {
    user,
    profile,
    registeredMobile,
    setRegisteredMobile,
    removeRegisteredMobile,
    signOut,
    requestRecoveryEmailOtp,
    verifyRecoveryEmailOtp,
  } = useAuth();

  const {
    isAppLockEnabled,
    isBiometricEnabled,
    hasPin,
    autoLockDuration,
    biometricCapability,
    setAppLockEnabled,
    setBiometricEnabled,
    setAutoLockDuration,
    lockApp,
  } = useSecurity();

  // App Security PIN Modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'setup' | 'change'>('setup');

  // Clear All Data OTP Modal state
  const [isClearDataOtpModalOpen, setIsClearDataOtpModalOpen] = useState(false);

  // Backup System state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isBackupHistoryModalOpen, setIsBackupHistoryModalOpen] = useState(false);

  // Balance edit state
  const [inputBalance, setInputBalance] = useState(String(openingBalance));

  // Syncing states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Recovery email workflow states
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryEmailInput, setRecoveryEmailInput] = useState('');
  const [recoveryOtpInput, setRecoveryOtpInput] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'input' | 'otp'>('input');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Optional Mobile Number State
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [mobileInputValue, setMobileInputValue] = useState('');
  const [mobileModalError, setMobileModalError] = useState<string | null>(null);
  const [isSavingMobile, setIsSavingMobile] = useState(false);

  // Restore JSON modal states
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Toggle App Lock handler
  const handleToggleAppLock = async (value: boolean) => {
    if (value) {
      if (!hasPin) {
        Alert.alert(
          'Set App Security PIN',
          'Please create a 4 to 6 digit security PIN first before enabling App Lock.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Set PIN',
              onPress: () => {
                setPinModalMode('setup');
                setIsPinModalOpen(true);
              },
            },
          ]
        );
        return;
      }
      await setAppLockEnabled(true);
    } else {
      await setAppLockEnabled(false);
    }
  };

  // Update opening balance
  const handleSaveOpeningBalance = () => {
    const val = parseFloat(inputBalance);
    if (isNaN(val)) {
      Alert.alert('Invalid Balance', 'Please enter a valid numeric opening balance.');
      return;
    }
    setOpeningBalance(val);
    Alert.alert('Saved', `Opening balance set to ${formatRupees(val)}.`);
  };

  // Manual Cloud Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await triggerManualSync();
    setIsSyncing(false);
    if (res.success) {
      Alert.alert('Sync Complete', 'All financial data is safely synchronized with Supabase Cloud.');
    } else {
      Alert.alert('Sync Notice', res.error || 'Failed to sync with cloud.');
    }
  };

  // Trigger immediate Backup
  const handleBackupNow = async () => {
    setIsBackingUp(true);
    const res = await triggerBackupNow();
    setIsBackingUp(false);
    if (res.success && res.backup) {
      Alert.alert(
        'Backup Created Successfully',
        `Snapshot "${res.backup.backupName}" saved securely.\n\n` +
          `• Transactions: ${res.backup.recordCounts.transactions}\n` +
          `• Khata Records: ${res.backup.recordCounts.khataRecords}\n` +
          `• Contacts: ${res.backup.recordCounts.people}\n` +
          `• Accounts: ${res.backup.recordCounts.accounts}`
      );
    } else {
      Alert.alert('Backup Error', res.error || 'Failed to create backup.');
    }
  };

  // Confirm and Restore a Backup Snapshot
  const handleConfirmRestoreEntry = (entry: WalletBackupEntry) => {
    Alert.alert(
      'Restore Backup Snapshot',
      `Restore "${entry.backupName}"?\n\n` +
        `• ${entry.recordCounts.transactions} Transactions\n` +
        `• ${entry.recordCounts.khataRecords} Khata Records\n` +
        `• ${entry.recordCounts.people} Contacts\n\n` +
        `Existing records will be safely merged and updated without deleting newer data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now',
          style: 'default',
          onPress: async () => {
            const res = await restoreFromBackupEntry(entry);
            if (res.success) {
              Alert.alert('Restore Complete', `Successfully merged ${res.restoredCount} records from backup.`);
              setIsBackupHistoryModalOpen(false);
            } else {
              Alert.alert('Restore Error', res.error || 'Failed to restore backup snapshot.');
            }
          },
        },
      ]
    );
  };

  // Migrate local data
  const handleMigrate = async () => {
    setIsMigrating(true);
    const res = await migrateLocalDataToCloud();
    setIsMigrating(false);
    if (res.success) {
      Alert.alert('Migration Successful', `${res.migratedCount} local records have been securely claimed into your cloud account.`);
    } else {
      Alert.alert('Migration Notice', res.error || 'Failed to migrate records.');
    }
  };

  // Export JSON Backup
  const handleExportJson = async () => {
    try {
      const jsonStr = exportAllDataJson();
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my_wallet_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'My Wallet Backup',
          message: jsonStr,
        });
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Failed to export backup JSON');
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const csvStr = exportTransactionsCsv();
      if (Platform.OS === 'web') {
        const blob = new Blob([csvStr], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'My Wallet Transactions CSV',
          message: csvStr,
        });
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Failed to export CSV');
    }
  };

  // Handle Restore
  const handleProcessRestore = async () => {
    if (!restoreJsonInput.trim()) {
      setRestoreError('Please paste valid JSON backup content.');
      return;
    }

    setRestoreLoading(true);
    setRestoreError(null);
    const res = await restoreFromJsonBackup(restoreJsonInput);
    setRestoreLoading(false);

    if (res.success) {
      Alert.alert('Restore Complete', `Successfully restored ${res.restoredCount} new records.`);
      setIsRestoreModalOpen(false);
      setRestoreJsonInput('');
    } else {
      setRestoreError(res.error || 'Failed to restore backup.');
    }
  };

  // Recovery Email OTP Flow
  const handleRequestRecoveryOtp = async () => {
    setRecoveryError(null);
    setRecoverySuccess(null);
    setDevOtpHint(null);

    const email = recoveryEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setRecoveryError('Please enter a valid secondary email address.');
      return;
    }

    if (user?.email && email === user.email.toLowerCase()) {
      setRecoveryError('Recovery email must be different from your primary login email.');
      return;
    }

    setRecoveryLoading(true);
    const res = await requestRecoveryEmailOtp(email);
    setRecoveryLoading(false);

    if (res.success) {
      setRecoveryStep('otp');
      setRecoverySuccess(`A 6-digit verification code was generated for ${email}`);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
    } else {
      setRecoveryError(res.error || 'Failed to send OTP.');
    }
  };

  const handleVerifyRecoveryOtp = async () => {
    setRecoveryError(null);
    if (recoveryOtpInput.trim().length !== 6) {
      setRecoveryError('Please enter the 6-digit verification code.');
      return;
    }

    setRecoveryLoading(true);
    const res = await verifyRecoveryEmailOtp(recoveryEmailInput, recoveryOtpInput);
    setRecoveryLoading(false);

    if (res.success) {
      Alert.alert('Recovery Email Verified', 'Your backup recovery email is now verified and active.');
      setIsRecoveryModalOpen(false);
      setRecoveryStep('input');
      setRecoveryEmailInput('');
      setRecoveryOtpInput('');
    } else {
      setRecoveryError(res.error || 'Invalid or expired OTP code.');
    }
  };

  // Mobile Number Handlers (Optional, User-Scoped, Direct to Supabase)
  const handleOpenAddMobile = () => {
    setMobileInputValue('');
    setMobileModalError(null);
    setIsMobileModalOpen(true);
  };

  const handleOpenEditMobile = () => {
    setMobileInputValue(registeredMobile || '');
    setMobileModalError(null);
    setIsMobileModalOpen(true);
  };

  const handleSaveMobileNumber = async () => {
    const cleaned = mobileInputValue.trim();
    if (!cleaned) {
      setMobileModalError('Please enter a mobile number or close the dialog.');
      return;
    }
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      setMobileModalError('Please enter a valid phone number with at least 7 digits.');
      return;
    }

    setIsSavingMobile(true);
    setMobileModalError(null);
    try {
      const res = await setRegisteredMobile(cleaned);
      if (res.success) {
        setIsMobileModalOpen(false);
      } else {
        setMobileModalError(res.error || 'Failed to update mobile number');
      }
    } catch (e: any) {
      setMobileModalError(e?.message || 'Failed to save mobile number');
    } finally {
      setIsSavingMobile(false);
    }
  };

  const handleConfirmRemoveMobile = () => {
    Alert.alert(
      'Remove Mobile Number',
      'Are you sure you want to remove your mobile number from your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsSavingMobile(true);
            try {
              const res = await removeRegisteredMobile();
              if (res.success) {
                setIsMobileModalOpen(false);
              } else {
                Alert.alert('Error', res.error || 'Failed to remove mobile number');
              }
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to remove mobile number');
            } finally {
              setIsSavingMobile(false);
            }
          },
        },
      ]
    );
  };

  // Clear All Data - Protected by OTP Security
  const handleClearAll = () => {
    setIsClearDataOtpModalOpen(true);
  };

  const handleConfirmedClearAllData = async () => {
    await resetToDefaults();
    setInputBalance('0');
    Alert.alert('Data Cleared', 'All financial records and account data have been permanently deleted.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Settings size={20} color={colors.slate[800]} />
              <Text style={styles.title}>Settings & Configuration</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. USER PROFILE & SECURITY */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={16} color={colors.brand[600]} />
                <Text style={styles.sectionTitle}>User Profile & Identity</Text>
              </View>

              {user ? (
                <View style={styles.profileBox}>
                  {/* Primary Email */}
                  <View style={styles.emailRow}>
                    <View style={styles.emailIconBox}>
                      <Mail size={16} color={colors.brand[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emailLabel}>Primary Email</Text>
                      <Text style={styles.emailValue}>{user.email}</Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <Check size={12} color={colors.income.text} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>

                  {/* Mobile Number (Optional, User-Scoped) */}
                  <View style={styles.emailRow}>
                    <View style={[styles.emailIconBox, { backgroundColor: colors.brand[50] }]}>
                      <Phone size={16} color={colors.brand[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emailLabel}>Mobile Number</Text>
                      {registeredMobile ? (
                        <Text style={styles.emailValue}>{registeredMobile}</Text>
                      ) : (
                        <Text style={styles.emptyMobileText}>Not added (Optional)</Text>
                      )}
                    </View>
                    {registeredMobile ? (
                      <View style={styles.mobileActionsContainer}>
                        <TouchableOpacity
                          style={styles.mobileEditBtn}
                          onPress={handleOpenEditMobile}
                        >
                          <Text style={styles.mobileEditBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.mobileRemoveBtn}
                          onPress={handleConfirmRemoveMobile}
                        >
                          <Trash2 size={14} color={colors.expense.text} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addMobileBtn}
                        onPress={handleOpenAddMobile}
                      >
                        <Text style={styles.addMobileBtnText}>+ Add Mobile Number</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Backup / Recovery Email */}
                  <View style={styles.emailRow}>
                    <View style={[styles.emailIconBox, { backgroundColor: colors.cyan[50] }]}>
                      <Shield size={16} color={colors.cyan[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emailLabel}>Backup / Recovery Email</Text>
                      <Text style={styles.emailValue}>
                        {profile?.recoveryEmail || 'Not configured'}
                      </Text>
                    </View>
                    {profile?.recoveryEmailVerified ? (
                      <View style={styles.verifiedBadge}>
                        <Check size={12} color={colors.income.text} />
                        <Text style={styles.verifiedText}>Active</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addRecoveryBtn}
                        onPress={() => {
                          setIsRecoveryModalOpen(true);
                          setRecoveryStep('input');
                          setRecoveryError(null);
                        }}
                      >
                        <Text style={styles.addRecoveryBtnText}>
                          {profile?.recoveryEmail ? 'Verify' : '+ Add Backup'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Sign Out Button */}
                  <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={async () => {
                      await signOut();
                      onClose();
                    }}
                  >
                    <LogOut size={16} color={colors.expense.text} />
                    <Text style={styles.signOutText}>Sign Out from My Wallet</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.guestBox}>
                  <Text style={styles.guestText}>
                    Running in offline/guest vault. Connect your email to enable multi-device sync and cloud backup.
                  </Text>
                </View>
              )}
            </View>

            {/* 2. APP LOCK & BIOMETRIC SECURITY */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Lock size={16} color={colors.brand[600]} />
                <Text style={styles.sectionTitle}>App Lock & Biometric Security</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Protect your financial transactions, ledgers, and sensitive balances with device biometrics and PIN lock.
              </Text>

              {/* Master App Lock Toggle */}
              <View style={styles.securityToggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.securityToggleLabel}>Enable App Lock</Text>
                  <Text style={styles.securityToggleDesc}>
                    Require authentication each time the app is opened or resumed
                  </Text>
                </View>
                <Switch
                  value={isAppLockEnabled}
                  onValueChange={handleToggleAppLock}
                  trackColor={{ false: colors.slate[300], true: colors.brand[600] }}
                  thumbColor={colors.white}
                />
              </View>

              {isAppLockEnabled && (
                <View style={styles.securitySubSection}>
                  {/* Biometric Auth Row */}
                  <View style={styles.securityItemRow}>
                    <View style={styles.securityItemIconBox}>
                      {biometricCapability.primaryType === 'facial' ? (
                        <Smile size={18} color={colors.brand[600]} />
                      ) : (
                        <Fingerprint size={18} color={colors.brand[600]} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.securityItemTitle}>
                        {biometricCapability.primaryType === 'facial'
                          ? 'Face Authentication (Face ID)'
                          : biometricCapability.primaryType === 'fingerprint'
                          ? 'Fingerprint Authentication'
                          : 'Biometric Authentication'}
                      </Text>
                      <Text style={styles.securityItemSubtitle}>
                        {!biometricCapability.hasHardware
                          ? 'Biometric hardware not detected on this device'
                          : !biometricCapability.isEnrolled
                          ? 'No biometrics registered in device settings'
                          : `Unlock using device ${biometricCapability.typeLabel}`}
                      </Text>
                    </View>
                    <Switch
                      value={isBiometricEnabled && biometricCapability.hasHardware && biometricCapability.isEnrolled}
                      disabled={!biometricCapability.hasHardware || !biometricCapability.isEnrolled}
                      onValueChange={(val) => {
                        if (!biometricCapability.hasHardware || !biometricCapability.isEnrolled) {
                          Alert.alert(
                            'Biometrics Not Available',
                            'Please configure fingerprint or facial recognition in your phone settings to enable this feature.'
                          );
                          return;
                        }
                        setBiometricEnabled(val);
                      }}
                      trackColor={{ false: colors.slate[300], true: colors.brand[600] }}
                      thumbColor={colors.white}
                    />
                  </View>

                  {/* App PIN Row */}
                  <View style={styles.securityItemRow}>
                    <View style={[styles.securityItemIconBox, { backgroundColor: colors.cyan[50] }]}>
                      <KeyRound size={18} color={colors.cyan[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.securityItemTitle}>App Security PIN</Text>
                      <Text style={styles.securityItemSubtitle}>
                        {hasPin ? 'PIN is configured (4-6 digits)' : 'No PIN configured yet'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.pinConfigBtn}
                      onPress={() => {
                        setPinModalMode(hasPin ? 'change' : 'setup');
                        setIsPinModalOpen(true);
                      }}
                    >
                      <Text style={styles.pinConfigBtnText}>
                        {hasPin ? 'Change PIN' : 'Set PIN'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Auto Lock Duration */}
                  <View style={styles.autoLockBox}>
                    <View style={styles.autoLockHeader}>
                      <Clock size={16} color={colors.slate[600]} />
                      <Text style={styles.autoLockTitle}>Auto Lock Duration</Text>
                    </View>
                    <Text style={styles.autoLockSubtitle}>
                      Automatically lock when the app goes into the background
                    </Text>
                    <View style={styles.durationPillsRow}>
                      {(
                        [
                          { id: 'immediately', label: 'Immediately' },
                          { id: '30s', label: '30s' },
                          { id: '1m', label: '1m' },
                          { id: '5m', label: '5m' },
                          { id: '10m', label: '10m' },
                        ] as const
                      ).map((item) => {
                        const isSelected = autoLockDuration === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.durationPill,
                              isSelected && styles.durationPillActive,
                            ]}
                            onPress={() => setAutoLockDuration(item.id)}
                          >
                            <Text
                              style={[
                                styles.durationPillText,
                                isSelected && styles.durationPillTextActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Lock App Now Button */}
                  <TouchableOpacity
                    style={styles.lockNowBtn}
                    onPress={() => {
                      onClose();
                      lockApp();
                    }}
                  >
                    <Lock size={15} color={colors.white} />
                    <Text style={styles.lockNowBtnText}>Lock App Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 3. CLOUD DATABASE & AUTOMATIC BACKUP */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Cloud size={16} color={colors.brand[600]} />
                <Text style={styles.sectionTitle}>Cloud Database & Automatic Backup</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Real-time Supabase cloud synchronization, offline queue protection, and automatic snapshots.
              </Text>

              {/* Sync Status Row */}
              <View style={styles.syncStatusRow}>
                <View style={styles.statusPill}>
                  {syncState === 'synced' ? (
                    <>
                      <Cloud size={14} color={colors.income.text} />
                      <Text style={[styles.statusText, { color: colors.income.text }]}>
                        {pendingSyncCount > 0 ? `${pendingSyncCount} queued` : 'Synced'}
                      </Text>
                    </>
                  ) : syncState === 'syncing' ? (
                    <>
                      <ActivityIndicator size="small" color={colors.warning.text} />
                      <Text style={[styles.statusText, { color: colors.warning.text }]}>Syncing...</Text>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} color={colors.slate[500]} />
                      <Text style={[styles.statusText, { color: colors.slate[600] }]}>
                        {pendingSyncCount > 0 ? `${pendingSyncCount} Offline` : 'Offline'}
                      </Text>
                    </>
                  )}
                </View>

                {lastSyncedAt && (
                  <Text style={styles.lastSyncText}>Last synced {lastSyncedAt}</Text>
                )}

                <TouchableOpacity
                  style={styles.syncNowBtn}
                  onPress={handleManualSync}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} color={colors.brand[600]} />
                  <Text style={styles.syncNowText}>Sync Now</Text>
                </TouchableOpacity>
              </View>

              {/* Automatic & Cloud Backup Card */}
              <View style={styles.backupBox}>
                <View style={styles.backupHeaderRow}>
                  <View style={styles.backupIconBox}>
                    <Database size={16} color={colors.brand[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.backupTitle}>Automated & Cloud Backups</Text>
                    <Text style={styles.backupSubtitle}>
                      {lastBackupTime
                        ? `Last backup: ${new Date(lastBackupTime).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : 'No backup snapshot created yet'}
                    </Text>
                  </View>
                </View>

                <View style={styles.backupActionsRow}>
                  <TouchableOpacity
                    style={styles.backupNowBtn}
                    onPress={handleBackupNow}
                    disabled={isBackingUp}
                  >
                    {isBackingUp ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Save size={14} color={colors.white} />
                        <Text style={styles.backupNowBtnText}>Backup Now</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backupHistoryBtn}
                    onPress={() => {
                      refreshBackupHistory();
                      setIsBackupHistoryModalOpen(true);
                    }}
                  >
                    <History size={14} color={colors.brand[700]} />
                    <Text style={styles.backupHistoryBtnText}>
                      Snapshots ({backupHistory.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.apiConfigBtn}
                onPress={() => setIsSupabaseModalOpen(true)}
              >
                <Settings size={14} color={colors.brand[600]} />
                <Text style={styles.apiConfigText}>Configure Supabase Cloud API</Text>
              </TouchableOpacity>

              {/* Local Data Migration Prompt if unmigrated records exist */}
              {hasUnmigratedLocalData && (
                <View style={styles.migrateBanner}>
                  <Sparkles size={16} color={colors.brand[600]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.migrateTitle}>Unmigrated Local Records</Text>
                    <Text style={styles.migrateDesc}>
                      You have local records that can be securely claimed into your cloud account.
                    </Text>
                    <TouchableOpacity
                      style={styles.migrateBtn}
                      onPress={handleMigrate}
                      disabled={isMigrating}
                    >
                      {isMigrating ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.migrateBtnText}>Claim / Migrate Records</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Data Export & Restore Actions */}
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionCard} onPress={handleExportJson}>
                  <Download size={16} color={colors.slate[700]} />
                  <Text style={styles.actionCardTitle}>Export Backup (JSON)</Text>
                  <Text style={styles.actionCardDesc}>Full vault data</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={handleExportCsv}>
                  <FileText size={16} color={colors.slate[700]} />
                  <Text style={styles.actionCardTitle}>Export CSV</Text>
                  <Text style={styles.actionCardDesc}>Spreadsheet format</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => {
                    setIsRestoreModalOpen(true);
                    setRestoreError(null);
                  }}
                >
                  <Upload size={16} color={colors.brand[600]} />
                  <Text style={[styles.actionCardTitle, { color: colors.brand[600] }]}>
                    Restore Backup
                  </Text>
                  <Text style={styles.actionCardDesc}>From JSON file</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. CATEGORIES & SUBCATEGORIES MANAGEMENT */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Tag size={16} color={colors.brand[600]} />
                <Text style={styles.sectionTitle}>Categories & Subcategories</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Customize income & expense categories, subcategories, icons, and colors
              </Text>

              <TouchableOpacity
                style={styles.categoryManageBtn}
                onPress={() => setIsCategoryModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryManageLeft}>
                  <View style={styles.categoryManageIcon}>
                    <Layers size={18} color={colors.brand[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryManageTitle}>Manage Categories</Text>
                    <Text style={styles.categoryManageSubtitle}>
                      {categories.filter((c) => c.type === 'income').length} Income • {categories.filter((c) => c.type === 'expense').length} Expense categories
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            {/* 5. PHYSICAL OPENING BALANCE */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Wallet size={16} color={colors.income.text} />
                <Text style={styles.sectionTitle}>Physical Opening Balance</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Starting liquid capital before logging income/expenses
              </Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.balanceInput}
                  keyboardType="numeric"
                  value={inputBalance}
                  onChangeText={setInputBalance}
                  placeholder="0.00"
                />
                <TouchableOpacity
                  style={styles.saveBalanceBtn}
                  onPress={handleSaveOpeningBalance}
                >
                  <Check size={16} color={colors.white} />
                  <Text style={styles.saveBalanceText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. LOCAL VAULT STATISTICS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Shield size={16} color={colors.brand[600]} />
                <Text style={styles.sectionTitle}>Vault Statistics</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{transactions.length}</Text>
                  <Text style={styles.statLabel}>Transactions</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{creditDebtRecords.length}</Text>
                  <Text style={styles.statLabel}>Khata Records</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{people.length}</Text>
                  <Text style={styles.statLabel}>People</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{accounts.length}</Text>
                  <Text style={styles.statLabel}>Accounts</Text>
                </View>
              </View>
            </View>

            {/* 6. CLEAR ALL DATA - SECURED WITH OTP */}
            <View style={[styles.sectionCard, styles.dangerCard]}>
              <View style={styles.sectionHeader}>
                <Trash2 size={16} color={colors.expense.text} />
                <Text style={[styles.sectionTitle, { color: colors.expense.text }]}>
                  Reset Vault & Clear All Data
                </Text>
              </View>
              <Text style={styles.sectionDesc}>
                Permanently clear transactions, khata ledgers, budgets, and all wallet data. Protected by 6-digit Email OTP verification.
              </Text>

              <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} activeOpacity={0.8}>
                <Trash2 size={16} color={colors.white} />
                <Text style={styles.clearBtnText}>Clear All Data</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* RECOVERY EMAIL MODAL */}
      <Modal visible={isRecoveryModalOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.innerModalCard}>
            <View style={styles.header}>
              <Text style={styles.innerModalTitle}>Backup Recovery Email</Text>
              <TouchableOpacity onPress={() => setIsRecoveryModalOpen(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            {recoveryError && (
              <View style={styles.errorBox}>
                <AlertCircle size={14} color={colors.expense.text} />
                <Text style={styles.errorText}>{recoveryError}</Text>
              </View>
            )}

            {recoverySuccess && (
              <View style={styles.successBox}>
                <Check size={14} color={colors.income.text} />
                <Text style={styles.successText}>{recoverySuccess}</Text>
              </View>
            )}

            {devOtpHint && (
              <View style={styles.devHintBox}>
                <KeyRound size={14} color={colors.brand[600]} />
                <Text style={styles.devHintText}>Verification Code: {devOtpHint}</Text>
              </View>
            )}

            {recoveryStep === 'input' ? (
              <View style={{ gap: 12 }}>
                <Text style={styles.innerModalDesc}>
                  Add a secondary email address to recover your account if you ever lose access to your primary email.
                </Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="recovery@example.com"
                  placeholderTextColor={colors.slate[400]}
                  value={recoveryEmailInput}
                  onChangeText={setRecoveryEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={handleRequestRecoveryOtp}
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Send Verification OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={styles.innerModalDesc}>
                  Enter the 6-digit verification code sent to {recoveryEmailInput}.
                </Text>
                <TextInput
                  style={[styles.modalTextInput, { textAlign: 'center', fontSize: 20, letterSpacing: 4 }]}
                  placeholder="000000"
                  placeholderTextColor={colors.slate[400]}
                  value={recoveryOtpInput}
                  onChangeText={setRecoveryOtpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={handleVerifyRecoveryOtp}
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Verify & Save Recovery Email</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* RESTORE JSON BACKUP MODAL */}
      <Modal visible={isRestoreModalOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.innerModalCard}>
            <View style={styles.header}>
              <Text style={styles.innerModalTitle}>Restore from JSON Backup</Text>
              <TouchableOpacity onPress={() => setIsRestoreModalOpen(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            {restoreError && (
              <View style={styles.errorBox}>
                <AlertCircle size={14} color={colors.expense.text} />
                <Text style={styles.errorText}>{restoreError}</Text>
              </View>
            )}

            <Text style={styles.innerModalDesc}>
              Paste the contents of your exported JSON backup file below. Existing transactions will not be duplicated.
            </Text>

            <TextInput
              style={styles.jsonInput}
              multiline
              placeholder='{"version": "1.0", "transactions": [...] }'
              placeholderTextColor={colors.slate[400]}
              value={restoreJsonInput}
              onChangeText={setRestoreJsonInput}
            />

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleProcessRestore}
              disabled={restoreLoading}
            >
              {restoreLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Restore Records</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* OPTIONAL MOBILE NUMBER MODAL */}
      <Modal visible={isMobileModalOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.innerModalCard}>
            <View style={styles.header}>
              <Text style={styles.innerModalTitle}>
                {registeredMobile ? 'Edit Mobile Number' : 'Add Mobile Number'}
              </Text>
              <TouchableOpacity onPress={() => setIsMobileModalOpen(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            {mobileModalError && (
              <View style={styles.errorBox}>
                <AlertCircle size={14} color={colors.expense.text} />
                <Text style={styles.errorText}>{mobileModalError}</Text>
              </View>
            )}

            <View style={{ gap: 12 }}>
              <Text style={styles.innerModalDesc}>
                Your mobile number is optional and saved directly to your account profile. No SMS OTP is required.
              </Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor={colors.slate[400]}
                value={mobileInputValue}
                onChangeText={setMobileInputValue}
                keyboardType="phone-pad"
                autoFocus
              />
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSaveMobileNumber}
                disabled={isSavingMobile}
              >
                {isSavingMobile ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>
                    {registeredMobile ? 'Update Mobile Number' : 'Save Mobile Number'}
                  </Text>
                )}
              </TouchableOpacity>

              {registeredMobile && (
                <TouchableOpacity
                  style={[styles.modalSecondaryBtn, { borderColor: colors.expense.border, marginTop: 4 }]}
                  onPress={handleConfirmRemoveMobile}
                  disabled={isSavingMobile}
                >
                  <Text style={[styles.modalSecondaryBtnText, { color: colors.expense.text }]}>
                    Remove Number from Profile
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* CATEGORIES & SUBCATEGORIES MANAGEMENT MODAL */}
      <CategoryManagementModal
        visible={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* SUPABASE CLOUD CONFIG MODAL */}
      <SupabaseConfigModal
        visible={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* CLEAR ALL DATA OTP VERIFICATION SECURITY MODAL */}
      <ClearDataOtpModal
        visible={isClearDataOtpModalOpen}
        onClose={() => setIsClearDataOtpModalOpen(false)}
        onConfirmDelete={handleConfirmedClearAllData}
      />

      {/* APP SECURITY PIN SETUP / CHANGE MODAL */}
      <PinSetupModal
        visible={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        mode={pinModalMode}
      />

      {/* BACKUP SNAPSHOTS HISTORY & RESTORE MODAL */}
      <Modal visible={isBackupHistoryModalOpen} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.innerModalCard, { maxHeight: '85%' }]}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Database size={18} color={colors.brand[600]} />
                <Text style={styles.innerModalTitle}>Wallet Backup Snapshots</Text>
              </View>
              <TouchableOpacity onPress={() => setIsBackupHistoryModalOpen(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
              <Text style={styles.innerModalDesc}>
                Available backup snapshots stored locally and in Supabase Cloud. Restoring a snapshot will safely merge and recover records without deleting newer data.
              </Text>

              {backupHistory.length === 0 ? (
                <View style={styles.emptyBackupBox}>
                  <HardDrive size={32} color={colors.slate[400]} />
                  <Text style={styles.emptyBackupText}>No backup snapshots created yet.</Text>
                  <Text style={styles.emptyBackupSubtext}>
                    Click "Backup Now" in Settings to create your first wallet snapshot.
                  </Text>
                </View>
              ) : (
                backupHistory.map((item) => (
                  <View key={item.id} style={styles.backupItemCard}>
                    <View style={styles.backupItemTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.backupItemName}>{item.backupName}</Text>
                          {item.isCloudSynced && (
                            <View style={styles.cloudBadge}>
                              <Cloud size={10} color={colors.income.text} />
                              <Text style={styles.cloudBadgeText}>Cloud</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.backupItemDate}>
                          {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.restoreItemBtn}
                        onPress={() => handleConfirmRestoreEntry(item)}
                      >
                        <Upload size={12} color={colors.white} />
                        <Text style={styles.restoreItemBtnText}>Restore</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.backupCountsRow}>
                      <Text style={styles.backupCountTag}>
                        {item.recordCounts?.transactions || 0} Tx
                      </Text>
                      <Text style={styles.backupCountTag}>
                        {item.recordCounts?.khataRecords || 0} Khata
                      </Text>
                      <Text style={styles.backupCountTag}>
                        {item.recordCounts?.people || 0} Contacts
                      </Text>
                      <Text style={styles.backupCountTag}>
                        {item.recordCounts?.accounts || 0} Accounts
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate[900],
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    padding: 16,
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 10,
  },
  dangerCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate[800],
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.slate[500],
    lineHeight: 16,
  },
  profileBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 12,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailLabel: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '600',
  },
  emailValue: {
    fontSize: 13,
    color: colors.slate[900],
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.income.bg,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
  },
  addRecoveryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.brand[600],
    borderRadius: 6,
  },
  addRecoveryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  emptyMobileText: {
    fontSize: 12,
    color: colors.slate[400],
    fontStyle: 'italic',
  },
  addMobileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 6,
  },
  addMobileBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
  },
  mobileActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mobileEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 6,
  },
  mobileEditBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  mobileRemoveBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: '#fff1f2',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    marginTop: 4,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.expense.text,
  },
  guestBox: {
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  guestText: {
    fontSize: 12,
    color: colors.slate[600],
    lineHeight: 16,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lastSyncText: {
    fontSize: 11,
    color: colors.slate[400],
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.brand[50],
    borderRadius: 6,
  },
  syncNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  apiConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    marginTop: 8,
  },
  apiConfigText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  migrateBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.brand[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  migrateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[900],
  },
  migrateDesc: {
    fontSize: 11,
    color: colors.slate[600],
    marginTop: 2,
  },
  migrateBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand[600],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  migrateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    alignItems: 'center',
    gap: 4,
  },
  actionCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[800],
    textAlign: 'center',
  },
  actionCardDesc: {
    fontSize: 10,
    color: colors.slate[400],
  },
  categoryManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginTop: 4,
  },
  categoryManageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryManageIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.brand[500]}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryManageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  categoryManageSubtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.slate[900],
  },
  saveBalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.income.text,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveBalanceText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
  },
  statLabel: {
    fontSize: 10,
    color: colors.slate[500],
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.expense.text,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  innerModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  innerModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate[900],
  },
  innerModalDesc: {
    fontSize: 12,
    color: colors.slate[500],
    lineHeight: 16,
  },
  modalTextInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.slate[900],
    backgroundColor: colors.slate[50],
  },
  jsonInput: {
    height: 120,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: colors.slate[900],
    backgroundColor: colors.slate[50],
    textAlignVertical: 'top',
  },
  modalPrimaryBtn: {
    height: 42,
    backgroundColor: colors.brand[600],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  modalSecondaryBtn: {
    height: 40,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[700],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: colors.expense.bg,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 11,
    color: colors.expense.text,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: colors.income.bg,
    borderRadius: 8,
  },
  successText: {
    fontSize: 11,
    color: colors.income.text,
    flex: 1,
  },
  devHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: colors.brand[50],
    borderRadius: 8,
  },
  devHintText: {
    fontSize: 11,
    color: colors.brand[800],
    fontWeight: '700',
  },
  // App Lock & Biometric Security Styles
  securityToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  securityToggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  securityToggleDesc: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
    lineHeight: 15,
  },
  securitySubSection: {
    gap: 10,
    marginTop: 4,
  },
  securityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  securityItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  securityItemSubtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  pinConfigBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 8,
  },
  pinConfigBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  autoLockBox: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 6,
  },
  autoLockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoLockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[800],
  },
  autoLockSubtitle: {
    fontSize: 11,
    color: colors.slate[500],
  },
  durationPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  durationPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  durationPillActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  durationPillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  lockNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.slate[800],
    borderRadius: 10,
    marginTop: 4,
  },
  lockNowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },

  // Backup & Restore Styles
  backupBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 10,
    marginTop: 8,
  },
  backupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backupIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  backupSubtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 1,
  },
  backupActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  backupNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.brand[600],
    borderRadius: 8,
  },
  backupNowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  backupHistoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 8,
  },
  backupHistoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[700],
  },
  emptyBackupBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyBackupText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[700],
  },
  emptyBackupSubtext: {
    fontSize: 11,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  backupItemCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 8,
  },
  backupItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backupItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.income.bg,
    borderRadius: 4,
  },
  cloudBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.income.text,
  },
  backupItemDate: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  restoreItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.slate[800],
    borderRadius: 6,
  },
  restoreItemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  backupCountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    paddingTop: 6,
  },
  backupCountTag: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[600],
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
});
