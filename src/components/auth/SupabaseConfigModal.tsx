import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Cloud,
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';
import { colors } from '../../theme/colors';

interface SupabaseConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    connectionStatus,
    connectionError,
    latencyMs,
    projectDomain,
    saveCredentials,
    resetCredentials,
  } = useAuth();

  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.anonKey);
  const [showKey, setShowKey] = useState(false);

  // Testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setKey(config.anonKey);
      setShowKey(false);
      setTestResult(null);
    }
  }, [visible]);

  // Test connection on demand
  const handleTestConnection = async () => {
    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();

    if (!trimmedUrl) {
      setTestResult({
        tested: true,
        success: false,
        message: 'Project URL is required.',
      });
      return;
    }
    if (!trimmedUrl.startsWith('https://')) {
      setTestResult({
        tested: true,
        success: false,
        message: 'Project URL must start with https://',
      });
      return;
    }
    if (!trimmedKey || trimmedKey.length < 20) {
      setTestResult({
        tested: true,
        success: false,
        message: 'Please enter a valid Supabase anon or publishable key.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(trimmedUrl, trimmedKey);
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        tested: true,
        success: true,
        message: `Successfully connected to ${res.projectDomain || 'Supabase'}!`,
        latency: res.latencyMs,
      });
    } else {
      setTestResult({
        tested: true,
        success: false,
        message: res.error || 'Connection test failed. Check URL and Key.',
      });
    }
  };

  // Save credentials
  const handleSave = async () => {
    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();

    if (!trimmedUrl.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Supabase Project URL must start with https://');
      return;
    }
    if (!trimmedKey || trimmedKey.length < 20) {
      Alert.alert('Invalid Key', 'Please enter a valid Supabase anon or publishable key.');
      return;
    }

    setIsTesting(true);
    const saveRes = await saveCredentials(trimmedUrl, trimmedKey);
    setIsTesting(false);

    if (saveRes.success) {
      Alert.alert('Connected', 'Supabase credentials saved and verified successfully!');
      onClose();
    } else {
      Alert.alert('Connection Warning', saveRes.error || 'Could not verify connection to Supabase.');
    }
  };

  // Reset to environment variables
  const handleResetToEnv = async () => {
    await resetCredentials();
    const config = getSupabaseConfig();
    setUrl(config.url);
    setKey(config.anonKey);
    setTestResult(null);
    Alert.alert('Reset to Defaults', 'Reverted to .env Supabase configuration.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Cloud size={20} color={colors.brand[600]} />
              </View>
              <View>
                <Text style={styles.title}>Supabase Connection</Text>
                <Text style={styles.subtitle}>
                  Cloud database & multi-user authentication
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Live Connection Status Pill */}
            <View style={styles.statusBanner}>
              <View style={styles.statusLeft}>
                {connectionStatus === 'connected' ? (
                  <>
                    <View style={[styles.statusDot, styles.dotGreen]} />
                    <Text style={styles.statusLabel}>
                      Connected {projectDomain ? `(${projectDomain})` : ''}
                    </Text>
                  </>
                ) : connectionStatus === 'checking' ? (
                  <>
                    <ActivityIndicator size="small" color={colors.warning.text} />
                    <Text style={styles.statusLabel}>Checking connection...</Text>
                  </>
                ) : connectionStatus === 'error' ? (
                  <>
                    <View style={[styles.statusDot, styles.dotRed]} />
                    <Text style={[styles.statusLabel, { color: colors.expense.text }]}>
                      Connection Error
                    </Text>
                  </>
                ) : connectionStatus === 'offline' ? (
                  <>
                    <WifiOff size={14} color={colors.slate[500]} />
                    <Text style={styles.statusLabel}>Network Offline</Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.statusDot, styles.dotAmber]} />
                    <Text style={[styles.statusLabel, { color: colors.warning.text }]}>
                      Not Configured
                    </Text>
                  </>
                )}
              </View>

              {latencyMs && connectionStatus === 'connected' ? (
                <Text style={styles.latencyText}>{latencyMs}ms</Text>
              ) : null}
            </View>

            {connectionError && connectionStatus !== 'connected' && (
              <View style={styles.errorBanner}>
                <AlertCircle size={14} color={colors.expense.text} />
                <Text style={styles.errorBannerText}>{connectionError}</Text>
              </View>
            )}

            {/* Test result alert box */}
            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  testResult.success ? styles.testSuccess : styles.testFail,
                ]}
              >
                {testResult.success ? (
                  <CheckCircle2 size={16} color={colors.income.text} />
                ) : (
                  <AlertCircle size={16} color={colors.expense.text} />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.testResultText,
                      testResult.success ? styles.testSuccessText : styles.testFailText,
                    ]}
                  >
                    {testResult.message}
                  </Text>
                  {testResult.latency ? (
                    <Text style={styles.testLatencyText}>
                      Response time: {testResult.latency}ms
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* Field 1: Project URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SUPABASE PROJECT URL *</Text>
              <View style={styles.inputContainer}>
                <Globe size={16} color={colors.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="https://xyzcompany.supabase.co"
                  placeholderTextColor={colors.slate[400]}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.helperText}>
                Found in Supabase Dashboard → Project Settings → API
              </Text>
            </View>

            {/* Field 2: Publishable / Anon Key with Show/Hide toggle */}
            <View style={styles.inputGroup}>
              <View style={styles.keyLabelRow}>
                <Text style={styles.inputLabel}>PUBLISHABLE / ANON KEY *</Text>
                <TouchableOpacity
                  style={styles.toggleKeyBtn}
                  onPress={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <>
                      <EyeOff size={13} color={colors.brand[600]} />
                      <Text style={styles.toggleKeyText}>Hide Key</Text>
                    </>
                  ) : (
                    <>
                      <Eye size={13} color={colors.brand[600]} />
                      <Text style={styles.toggleKeyText}>Show Key</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <KeyRound size={16} color={colors.slate[400]} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, styles.keyInput]}
                  placeholder="sb_publishable_... or eyJhbGciOi..."
                  placeholderTextColor={colors.slate[400]}
                  value={key}
                  onChangeText={setKey}
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.helperText}>
                Public client key only. Never enter the service_role key in frontend code.
              </Text>
            </View>

            {/* Security Notice */}
            <View style={styles.securityBox}>
              <ShieldAlert size={14} color={colors.brand[600]} />
              <Text style={styles.securityText}>
                Credentials are stored in local secure sandboxed app storage and used exclusively to authenticate with your Supabase project.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color={colors.brand[600]} />
                ) : (
                  <>
                    <RefreshCw size={14} color={colors.brand[600]} />
                    <Text style={styles.testBtnText}>Test Connection</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={isTesting}
              >
                <CheckCircle2 size={16} color={colors.white} />
                <Text style={styles.saveBtnText}>Save & Connect</Text>
              </TouchableOpacity>
            </View>

            {/* Reset to env defaults if modified */}
            {currentConfig.isCustom && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetToEnv}
              >
                <RotateCcw size={13} color={colors.slate[500]} />
                <Text style={styles.resetBtnText}>Revert to .env Defaults</Text>
              </TouchableOpacity>
            )}
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
    maxHeight: '90%',
    padding: 22,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
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
    color: colors.slate[500],
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    maxHeight: 460,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: colors.income.solid,
  },
  dotRed: {
    backgroundColor: colors.expense.solid,
  },
  dotAmber: {
    backgroundColor: colors.warning.solid,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
  latencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.income.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.expense.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 11,
    color: colors.expense.text,
    flex: 1,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  testSuccess: {
    backgroundColor: colors.income.bg,
    borderColor: colors.income.border,
  },
  testFail: {
    backgroundColor: colors.expense.bg,
    borderColor: colors.expense.border,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '700',
  },
  testSuccessText: {
    color: colors.income.text,
  },
  testFailText: {
    color: colors.expense.text,
  },
  testLatencyText: {
    fontSize: 10,
    color: colors.income.text,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  keyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  toggleKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  toggleKeyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.slate[900],
  },
  keyInput: {
    fontSize: 12,
  },
  helperText: {
    fontSize: 10,
    color: colors.slate[400],
    marginTop: 4,
    paddingHorizontal: 2,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.brand[50],
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 10,
    color: colors.brand[700],
    lineHeight: 14,
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand[700],
  },
  saveBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[500],
  },
});
