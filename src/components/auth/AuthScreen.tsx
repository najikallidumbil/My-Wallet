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
  AlertCircle,
  Settings,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import { useResponsive } from '../../lib/useResponsive';

export const AuthScreen: React.FC = () => {
  const { isNarrowMobile } = useResponsive();
  const {
    connectionStatus,
    connectionError,
    projectDomain,
    sendOtp,
    verifyOtp,
    enableGuestMode,
    checkConnection,
  } = useAuth();

  // Screen modes for OTP: 'email' | 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email');

  // Input states
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Configuration modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Guide accordion
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showOtpHelp, setShowOtpHelp] = useState(false);

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

  // Handle Send OTP (Works for both new and existing users)
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
      setErrorMessage(
        res.error ||
          'Failed to send OTP code. Please check your Supabase connection and verify Email Auth is enabled.'
      );
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

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, isNarrowMobile && styles.scrollContainerNarrow]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isNarrowMobile && styles.cardNarrow]}>
          {/* Brand Header */}
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Wallet size={28} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>MY WALLET</Text>
              <Text style={styles.brandSubtitle}>Personal Finance & Khata Book</Text>
            </View>
          </View>

          {/* 1. CONNECTION STATUS BANNER */}
          {connectionStatus === 'connected' && (
            <View style={styles.connectedBanner}>
              <View style={styles.statusDotGreen} />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedTitle}>Supabase Cloud Connected</Text>
                <Text style={styles.connectedSubtitle} numberOfLines={1}>
                  {projectDomain || 'ruhifsmbgfhxoumfvoyl.supabase.co'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.apiSettingsBtn}
                onPress={() => setIsConfigModalOpen(true)}
              >
                <Settings size={13} color={colors.brand[600]} />
                <Text style={styles.apiSettingsText}>API Settings</Text>
              </TouchableOpacity>
            </View>
          )}

          {connectionStatus === 'not_configured' && (
            <View style={styles.unconfiguredBanner}>
              <AlertCircle size={18} color={colors.warning.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.unconfiguredTitle}>Supabase Not Connected</Text>
                <Text style={styles.unconfiguredText}>
                  Supabase credentials are not configured. Connect your Supabase project to enable email OTP login and cloud backup.
                </Text>
                <View style={styles.unconfiguredActions}>
                  <TouchableOpacity
                    style={styles.configBtn}
                    onPress={() => setIsConfigModalOpen(true)}
                  >
                    <Settings size={13} color={colors.brand[700]} />
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

          {connectionStatus === 'error' && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={colors.expense.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorBannerTitle}>Supabase Connection Error</Text>
                <Text style={styles.errorBannerSubtitle}>
                  {connectionError || 'Could not verify connection to Supabase.'}
                </Text>
                <View style={styles.unconfiguredActions}>
                  <TouchableOpacity
                    style={styles.configBtn}
                    onPress={() => setIsConfigModalOpen(true)}
                  >
                    <Settings size={13} color={colors.brand[700]} />
                    <Text style={styles.configBtnText}>Fix API Keys</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={() => checkConnection()}
                  >
                    <RotateCcw size={13} color={colors.slate[700]} />
                    <Text style={styles.guestBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {connectionStatus === 'offline' && (
            <View style={styles.offlineBanner}>
              <AlertCircle size={18} color={colors.slate[600]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.offlineTitle}>Network Offline</Text>
                <Text style={styles.offlineText}>
                  Cannot reach Supabase servers. Check your internet connection or use offline mode.
                </Text>
                <View style={styles.unconfiguredActions}>
                  <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={() => checkConnection()}
                  >
                    <RotateCcw size={13} color={colors.slate[700]} />
                    <Text style={styles.guestBtnText}>Retry</Text>
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

          {/* STEP 1: EMAIL INPUT FOR OTP */}
          {step === 'email' && (
            <View style={styles.stepContent}>
              <View style={styles.headerBlock}>
                <Text style={styles.stepTitle}>Sign In with Email OTP</Text>
                <Text style={styles.stepDesc}>
                  Enter your email address to receive a secure 6-digit verification code. Works for both new accounts and existing wallets.
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
                    <Text style={styles.primaryBtnText}>Send Verification OTP</Text>
                    <ArrowRight size={18} color={colors.white} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securityNote}>
                <ShieldCheck size={14} color={colors.brand[600]} />
                <Text style={styles.securityNoteText}>
                  Passwordless authentication with Supabase Row Level Security (RLS) data isolation.
                </Text>
              </View>

              {/* Help & Setup Guide Accordion */}
              <TouchableOpacity
                style={styles.guideToggle}
                onPress={() => setShowSetupGuide(!showSetupGuide)}
                activeOpacity={0.7}
              >
                <HelpCircle size={14} color={colors.slate[500]} />
                <Text style={styles.guideToggleText}>Supabase Email OTP Setup Checklist</Text>
                {showSetupGuide ? (
                  <ChevronUp size={14} color={colors.slate[500]} />
                ) : (
                  <ChevronDown size={14} color={colors.slate[500]} />
                )}
              </TouchableOpacity>

              {showSetupGuide && (
                <View style={styles.guideBox}>
                  <Text style={styles.guideStep}>
                    1. <Text style={styles.boldText}>Enable Email Provider:</Text> In Supabase Dashboard → Authentication → Providers → Email, ensure "Enable Email provider" is checked.
                  </Text>
                  <Text style={styles.guideStep}>
                    2. <Text style={styles.boldText}>Database Schema:</Text> In Supabase Dashboard → SQL Editor, run <Text style={styles.codeText}>supabase/schema.sql</Text> to initialize tables and RLS policies.
                  </Text>
                  <Text style={styles.guideStep}>
                    3. <Text style={styles.boldText}>Confirm Signup Template (New Users):</Text> In Supabase Dashboard → Authentication → Email Templates → Confirm Signup, include <Text style={styles.codeText}>{"{{ .Token }}"}</Text> so newly registered users receive a 6-digit OTP code.
                  </Text>
                  <Text style={styles.guideStep}>
                    4. <Text style={styles.boldText}>Magic Link Template (Existing Users):</Text> In Supabase Dashboard → Authentication → Email Templates → Magic Link, include <Text style={styles.codeText}>{"{{ .Token }}"}</Text> so returning users receive a 6-digit OTP code.
                  </Text>
                </View>
              )}
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
                  Enter the 6-digit verification code sent to{' '}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
              </View>

              {/* 6 Digit Input Boxes */}
              <View style={[styles.otpBoxesRow, isNarrowMobile && styles.otpBoxesRowNarrow]}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref) => {
                      inputRefs.current[idx] = ref;
                    }}
                    style={[
                      styles.otpBox,
                      isNarrowMobile && styles.otpBoxNarrow,
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
                  <RotateCcw
                    size={14}
                    color={resendCooldown > 0 ? colors.slate[400] : colors.brand[600]}
                  />
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

              {/* Help Callout for Supabase 6-Digit OTP Templates */}
              <TouchableOpacity
                style={styles.guideToggle}
                onPress={() => setShowOtpHelp(!showOtpHelp)}
                activeOpacity={0.7}
              >
                <HelpCircle size={14} color={colors.brand[600]} />
                <Text style={[styles.guideToggleText, { color: colors.brand[700] }]}>
                  OTP not arriving to existing email? (Troubleshooting)
                </Text>
                {showOtpHelp ? (
                  <ChevronUp size={14} color={colors.brand[600]} />
                ) : (
                  <ChevronDown size={14} color={colors.brand[600]} />
                )}
              </TouchableOpacity>

              {showOtpHelp && (
                <View style={styles.guideBox}>
                  <Text style={styles.guideStep}>
                    <Text style={styles.boldText}>1. Magic Link Template (Existing Users):</Text> In Supabase Dashboard → <Text style={styles.boldText}>Authentication → Email Templates → Magic Link</Text>, ensure the template body includes <Text style={styles.codeText}>{"{{ .Token }}"}</Text>. Supabase uses "Confirm Signup" for new accounts, but uses "Magic Link" for existing accounts!
                  </Text>
                  <Text style={styles.guideStep}>
                    <Text style={styles.boldText}>2. SMTP Suppression / Bounce List:</Text> If your custom SMTP previously had an HTTP 504 timeout, your email provider (e.g. Resend, Brevo, SendGrid) may have placed your email on its <Text style={styles.boldText}>Suppression / Bounce List</Text>. Log into your SMTP dashboard and delete/unsuppress your email.
                  </Text>
                  <Text style={styles.guideStep}>
                    <Text style={styles.boldText}>3. Check Spam & Promotions:</Text> Search Gmail's <Text style={styles.boldText}>Spam</Text> and <Text style={styles.boldText}>Promotions</Text> folders for emails from your sender or <Text style={styles.codeText}>noreply@mail.app.supabase.io</Text>.
                  </Text>
                  <Text style={styles.guideStep}>
                    <Text style={styles.boldText}>4. Rate Limits:</Text> Wait 60 seconds before tapping <Text style={styles.boldText}>Resend OTP</Text> to avoid Supabase rate limit throttling.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Supabase Configuration Modal */}
        <SupabaseConfigModal
          visible={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
        />
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
  scrollContainerNarrow: {
    padding: 10,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 24,
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardNarrow: {
    padding: 14,
    borderRadius: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
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
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.income.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.income.border,
    marginBottom: 16,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.income.solid,
  },
  connectedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.income.text,
  },
  connectedSubtitle: {
    fontSize: 10,
    color: colors.slate[600],
    marginTop: 1,
  },
  apiSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  apiSettingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand[700],
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
    paddingVertical: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
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
    paddingVertical: 6,
    backgroundColor: colors.slate[200],
    borderRadius: 8,
  },
  guestBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  errorBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: colors.expense.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.expense.border,
    marginBottom: 16,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.expense.text,
  },
  errorBannerSubtitle: {
    fontSize: 11,
    color: colors.slate[600],
    marginTop: 2,
    lineHeight: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: colors.slate[100],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 16,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
  },
  offlineText: {
    fontSize: 11,
    color: colors.slate[600],
    marginTop: 2,
    lineHeight: 16,
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
    fontWeight: '800',
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
    fontWeight: '700',
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
  otpBoxesRowNarrow: {
    gap: 5,
    marginVertical: 8,
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
  otpBoxNarrow: {
    height: 44,
    fontSize: 18,
    borderRadius: 10,
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
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  guideToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[600],
  },
  guideBox: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  guideStep: {
    fontSize: 11,
    color: colors.slate[600],
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '700',
    color: colors.slate[800],
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.brand[700],
    fontWeight: '700',
  },
});
