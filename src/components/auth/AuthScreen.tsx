import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Wallet,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Settings,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { setCustomSupabaseCredentials, getSupabaseConfig } from '../../lib/supabase';

export const AuthScreen: React.FC = () => {
  const {
    isConfigured,
    sendOtp,
    verifyOtp,
    enableGuestMode,
  } = useAuth();

  // Screen modes: 'email' | 'otp' | 'config' | 'recovery'
  const [step, setStep] = useState<'email' | 'otp' | 'config' | 'recovery'>('email');

  // Input states
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Manual Supabase Config State (for when .env is not present)
  const currentConfig = getSupabaseConfig();
  const [customUrl, setCustomUrl] = useState(currentConfig.url);
  const [customKey, setCustomKey] = useState(currentConfig.anonKey);

  // References for 6 OTP input boxes
  const inputRefs = useRef<Array<any>>([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Send OTP
  const handleSendOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const res = await sendOtp(trimmedEmail);
    setIsLoading(false);

    if (res.success) {
      setStep('otp');
      setResendCooldown(60);
      setSuccessMessage(`A 6-digit verification code was sent to ${trimmedEmail}`);
      // Focus first input box
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    } else {
      setErrorMessage(res.error || 'Failed to send OTP. Please check your connection.');
    }
  };

  // Handle OTP digit changes
  const handleDigitChange = (val: string, index: number) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Paste handling
      const pasted = cleaned.slice(0, 6).split('');
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(5, pasted.length);
      inputRefs.current[nextIndex]?.focus();
      if (pasted.length === 6) {
        handleVerifyOtp(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all 6 digits entered
    if (cleaned && index === 5) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = codeToVerify || otpDigits.join('');
    if (token.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP code.');
      return;
    }

    setIsLoading(true);
    const res = await verifyOtp(email, token);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Authentication successful! Welcome to My Wallet.');
    } else {
      setErrorMessage(res.error || 'Invalid or expired OTP code. Please try again.');
    }
  };

  // Save manual Supabase credentials
  const handleSaveConfig = () => {
    if (!customUrl.startsWith('https://')) {
      setErrorMessage('Supabase URL must start with https://');
      return;
    }
    if (!customKey || customKey.length < 20) {
      setErrorMessage('Please enter a valid Supabase anon key.');
      return;
    }

    setCustomSupabaseCredentials(customUrl, customKey);
    setErrorMessage(null);
    setSuccessMessage('Supabase credentials updated! You can now log in.');
    setStep('email');
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Brand Header */}
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Wallet size={28} color={colors.white} />
            </View>
            <View>
              <Text style={styles.brandTitle}>MY WALLET</Text>
              <Text style={styles.brandSubtitle}>Cloud Finance & Khata Vault</Text>
            </View>
          </View>

          {/* Configuration status indicator */}
          {!isConfigured && step !== 'config' && (
            <View style={styles.unconfiguredBanner}>
              <AlertCircle size={16} color={colors.warning.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.unconfiguredTitle}>Supabase Not Connected</Text>
                <Text style={styles.unconfiguredText}>
                  Connect your Supabase project for multi-user cloud sync or explore in offline mode.
                </Text>
                <View style={styles.unconfiguredActions}>
                  <TouchableOpacity
                    style={styles.configBtn}
                    onPress={() => setStep('config')}
                  >
                    <Settings size={14} color={colors.brand[600]} />
                    <Text style={styles.configBtnText}>Enter API Keys</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={enableGuestMode}
                  >
                    <Text style={styles.guestBtnText}>Use Offline Mode</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Messages */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.expense.text} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBox}>
              <CheckCircle2 size={16} color={colors.income.text} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* STEP 1: EMAIL INPUT */}
          {step === 'email' && (
            <View style={styles.stepContent}>
              <View style={styles.headerBlock}>
                <Text style={styles.stepTitle}>Sign In / Sign Up</Text>
                <Text style={styles.stepDesc}>
                  Enter your email address. We'll send a 6-digit OTP code to verify your identity.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={colors.slate[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.slate[400]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send OTP Code</Text>
                    <ArrowRight size={18} color={colors.white} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securityNote}>
                <ShieldCheck size={14} color={colors.brand[600]} />
                <Text style={styles.securityNoteText}>
                  Passwordless authentication with Row Level Security (RLS) data isolation.
                </Text>
              </View>
            </View>
          )}

          {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
          {step === 'otp' && (
            <View style={styles.stepContent}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setStep('email');
                  setOtpDigits(['', '', '', '', '', '']);
                  setErrorMessage(null);
                }}
              >
                <ArrowLeft size={16} color={colors.slate[600]} />
                <Text style={styles.backBtnText}>Change Email</Text>
              </TouchableOpacity>

              <View style={styles.headerBlock}>
                <Text style={styles.stepTitle}>Verify Email OTP</Text>
                <Text style={styles.stepDesc}>
                  Enter the 6-digit code sent to{' '}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
              </View>

              {/* 6 Digit Input Boxes */}
              <View style={styles.otpBoxesRow}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref) => {
                      inputRefs.current[idx] = ref;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(val) => handleDigitChange(val, idx)}
                    onKeyPress={(e) => handleKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={idx === 0 ? 6 : 1}
                    selectTextOnFocus
                    editable={!isLoading}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (isLoading || otpDigits.join('').length !== 6) && styles.btnDisabled,
                ]}
                onPress={() => handleVerifyOtp()}
                disabled={isLoading || otpDigits.join('').length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <KeyRound size={18} color={colors.white} />
                    <Text style={styles.primaryBtnText}>Verify & Access Wallet</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={styles.resendRow}>
                <Text style={styles.resendLabel}>Didn't receive the code?</Text>
                <TouchableOpacity
                  disabled={resendCooldown > 0 || isLoading}
                  onPress={handleSendOtp}
                  style={styles.resendBtn}
                >
                  <RotateCcw size={14} color={resendCooldown > 0 ? colors.slate[400] : colors.brand[600]} />
                  <Text
                    style={[
                      styles.resendBtnText,
                      resendCooldown > 0 && styles.resendBtnTextDisabled,
                    ]}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: MANUAL SUPABASE CONFIGURATION */}
          {step === 'config' && (
            <View style={styles.stepContent}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => {
                  setStep('email');
                  setErrorMessage(null);
                }}
              >
                <ArrowLeft size={16} color={colors.slate[600]} />
                <Text style={styles.backBtnText}>Back to Sign In</Text>
              </TouchableOpacity>

              <View style={styles.headerBlock}>
                <Text style={styles.stepTitle}>Supabase Cloud Settings</Text>
                <Text style={styles.stepDesc}>
                  Enter your Supabase Project URL and public Anon Key from Project Settings → API.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Supabase Project URL</Text>
                <TextInput
                  style={styles.configInput}
                  placeholder="https://xyzcompany.supabase.co"
                  placeholderTextColor={colors.slate[400]}
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Supabase Public Anon Key</Text>
                <TextInput
                  style={[styles.configInput, styles.keyInput]}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  placeholderTextColor={colors.slate[400]}
                  value={customKey}
                  onChangeText={setCustomKey}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSaveConfig}
              >
                <Sparkles size={18} color={colors.white} />
                <Text style={styles.primaryBtnText}>Connect & Save Credentials</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.slate[100],
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
  },
  unconfiguredBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: colors.warning.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning.border,
    marginBottom: 16,
  },
  unconfiguredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning.text,
  },
  unconfiguredText: {
    fontSize: 11,
    color: colors.slate[600],
    marginTop: 2,
    lineHeight: 16,
  },
  unconfiguredActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brand[300],
  },
  configBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  guestBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.slate[200],
    borderRadius: 6,
  },
  guestBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.expense.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.expense.border,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.expense.text,
    fontWeight: '500',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.income.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.income.border,
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: colors.income.text,
    fontWeight: '500',
  },
  stepContent: {
    gap: 16,
  },
  headerBlock: {
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
  stepDesc: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 4,
    lineHeight: 18,
  },
  emailHighlight: {
    fontWeight: '700',
    color: colors.brand[700],
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[700],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    backgroundColor: colors.slate[50],
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[900],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    borderRadius: 12,
    height: 48,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  securityNoteText: {
    flex: 1,
    fontSize: 11,
    color: colors.slate[500],
    lineHeight: 15,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 13,
    color: colors.slate[600],
    fontWeight: '600',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 10,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    borderRadius: 12,
    backgroundColor: colors.slate[50],
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.slate[900],
  },
  otpBoxFilled: {
    borderColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  resendLabel: {
    fontSize: 12,
    color: colors.slate[500],
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[600],
  },
  resendBtnTextDisabled: {
    color: colors.slate[400],
  },
  configInput: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    backgroundColor: colors.slate[50],
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: colors.slate[900],
  },
  keyInput: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
});
