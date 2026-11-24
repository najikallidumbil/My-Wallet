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
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';

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
    syncState,
    lastSyncedAt,
    hasUnmigratedLocalData,
    triggerManualSync,
    migrateLocalDataToCloud,
    exportAllDataJson,
    exportTransactionsCsv,
    restoreFromJsonBackup,
  } = useWallet();

  const {
    user,
    profile,
    signOut,
    requestRecoveryEmailOtp,
    verifyRecoveryEmailOtp,
  } = useAuth();

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

  // Restore JSON modal states
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

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

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Records',
      'Are you sure you want to clear all transactions, khata records, and reset accounts to clean initial state?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            resetToDefaults();
            setInputBalance('0');
            Alert.alert('Cleared', 'All records have been cleared successfully.');
          },
        },
      ]
    );
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

            {/* 2. CLOUD SYNCHRONIZATION & BACKUP */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Cloud size={16} color={colors.brand[600]} />
                <Text style={styles.sectionTitle}>Cloud Synchronization</Text>
              </View>

              <View style={styles.syncStatusRow}>
                <View style={styles.statusPill}>
                  {syncState === 'synced' ? (
                    <>
                      <Cloud size={14} color={colors.income.text} />
                      <Text style={[styles.statusText, { color: colors.income.text }]}>Synced</Text>
                    </>
                  ) : syncState === 'syncing' ? (
                    <>
                      <ActivityIndicator size="small" color={colors.warning.text} />
                      <Text style={[styles.statusText, { color: colors.warning.text }]}>Syncing...</Text>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} color={colors.slate[500]} />
                      <Text style={[styles.statusText, { color: colors.slate[600] }]}>Offline</Text>
                    </>
                  )}
                </View>

                {lastSyncedAt && (
                  <Text style={styles.lastSyncText}>Last synced at {lastSyncedAt}</Text>
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

            {/* 3. PHYSICAL OPENING BALANCE */}
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

            {/* 4. LOCAL VAULT STATISTICS */}
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

            {/* 5. CLEAR ALL RECORDS */}
            <View style={[styles.sectionCard, styles.dangerCard]}>
              <View style={styles.sectionHeader}>
                <Trash2 size={16} color={colors.expense.text} />
                <Text style={[styles.sectionTitle, { color: colors.expense.text }]}>
                  Reset Vault
                </Text>
              </View>
              <Text style={styles.sectionDesc}>
                Permanently clear transactions and customer ledgers from this device.
              </Text>

              <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
                <Trash2 size={16} color={colors.white} />
                <Text style={styles.clearBtnText}>Clear All Records</Text>
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
});
