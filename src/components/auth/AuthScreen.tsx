import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import { useResponsive } from '../../lib/useResponsive';

export const AuthScreen: React.FC = () => {
  const { isNarrowMobile } = useResponsive();
  const { sendOtp, verifyOtp, enableGuestMode } = useAuth();

  // Screen modes: 'email' | 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email');

  // Input states
  const [email, setEmail] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState<number | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Hidden developer configuration mode (accessed via 5-tap gesture on brand icon)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const lastTapRef = useRef<number>(0);

  // TextInput references
  const emailInputRef = useRef<any>(null);
  const inputRefs = useRef<Array<any>>([]);

  // Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email.trim());

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Protected Developer Mode Gesture (5 rapid taps on logo)
  const handleSecretDeveloperTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 900) {
      const nextCount = logoTapCount + 1;
      setLogoTapCount(nextCount);
      if (nextCount >= 5) {
        setLogoTapCount(0);
        setIsConfigModalOpen(true);
      }
    } else {
      setLogoTapCount(1);
    }
    lastTapRef.current = now;
  };

  // Handle Send OTP
  const handleSendOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const res = await sendOtp(trimmedEmail);
    setIsLoading(false);

    if (res.success) {
      setStep('otp');
      setResendCooldown(30);
      setSuccessMessage(`We've sent a 6-digit verification code to ${trimmedEmail}`);
      // Focus first OTP input box smoothly
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 250);
    } else {
      setErrorMessage(
        res.error || 'Unable to send verification code. Please check your connection and try again.'
      );
    }
  };

  // Handle Resend OTP (with 30-second cooldown protection)
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const res = await sendOtp(trimmedEmail);
    setIsLoading(false);

    if (res.success) {
      setResendCooldown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(`A fresh 6-digit verification code has been sent to ${trimmedEmail}.`);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 200);
    } else {
      setErrorMessage(
        res.error || 'Failed to resend verification code. Please wait a moment and try again.'
      );
    }
  };

  // Handle OTP digit changes
  const handleDigitChange = (val: string, index: number) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Paste handling (e.g. user pasted full 6-digit code)
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
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsLoading(true);
    const res = await verifyOtp(email, token);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Verification successful! Opening your wallet...');
    } else {
      setErrorMessage(res.error || 'Invalid or expired verification code. Please try again.');
    }
  };

  // Switch back to email entry
  const handleChangeEmail = () => {
    setStep('email');
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            isNarrowMobile && styles.scrollContainerNarrow,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isNarrowMobile && styles.cardNarrow]}>
            {/* 1. BRAND HEADER */}
            <View style={styles.brandContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSecretDeveloperTap}
                style={styles.logoTouchable}
                accessibilityLabel="MY WALLET Brand Logo"
              >
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>

              <Text style={styles.brandTitle}>MY WALLET</Text>
              <Text style={styles.brandTagline}>Your Money. Your Control.</Text>
            </View>

            {/* 2. MESSAGES (Alert Banners) */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={colors.expense.text} style={styles.alertIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successBox}>
                <CheckCircle2 size={16} color={colors.income.text} style={styles.alertIcon} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* 3. STEP 1: EMAIL ENTRY */}
            {step === 'email' && (
              <View style={styles.formContainer}>
                <View style={styles.headingBlock}>
                  <Text style={styles.welcomeHeading}>Welcome to MY WALLET</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Manage your money, track expenses and stay in control.
                  </Text>
                </View>

                {/* Email Input Field */}
                <View style={styles.inputSection}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <Pressable
                    onPress={() => emailInputRef.current?.focus()}
                    style={[
                      styles.inputWrapper,
                      isEmailFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <View pointerEvents="none" style={styles.iconContainer}>
                      <Mail
                        size={18}
                        color={isEmailFocused ? colors.brand[600] : colors.slate[400]}
                      />
                    </View>
                    <TextInput
                      ref={emailInputRef}
                      style={styles.textInput}
                      placeholder="Enter your email address"
                      placeholderTextColor={colors.slate[400]}
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      importantForAutofill="yes"
                      editable={!isLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                      selectTextOnFocus={false}
                    />
                  </Pressable>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (isLoading || !isEmailValid) && styles.buttonDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={isLoading || !isEmailValid}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Continue with Email</Text>
                      <ArrowRight size={18} color={colors.white} strokeWidth={2.4} />
                    </>
                  )}
                </TouchableOpacity>

                {/* Passwordless Security Message */}
                <View style={styles.securityRow}>
                  <ShieldCheck size={16} color={colors.brand[600]} style={{ marginTop: 1 }} />
                  <Text style={styles.securityText}>
                    We'll send a 6-digit verification code to your email. Passwordless & secure.
                  </Text>
                </View>

                {/* Offline / Guest Mode Access */}
                <View style={styles.offlineRow}>
                  <TouchableOpacity
                    onPress={enableGuestMode}
                    activeOpacity={0.7}
                    style={styles.offlineButton}
                  >
                    <Text style={styles.offlineText}>Explore in Offline Mode</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 4. STEP 2: 6-DIGIT OTP VERIFICATION */}
            {step === 'otp' && (
              <View style={styles.formContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleChangeEmail}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={15} color={colors.brand[600]} />
                  <Text style={styles.backButtonText}>Change Email</Text>
                </TouchableOpacity>

                <View style={styles.headingBlock}>
                  <Text style={styles.welcomeHeading}>Verify Your Email</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Enter the 6-digit verification code sent to{'\n'}
                    <Text style={styles.emailHighlight}>{email}</Text>
                  </Text>
                </View>

                {/* 6-Digit OTP Box Array */}
                <View style={styles.otpSection}>
                  <Text style={styles.otpLabel}>6-Digit Verification Code</Text>
                  <View style={[styles.otpRow, isNarrowMobile && styles.otpRowNarrow]}>
                    {otpDigits.map((digit, idx) => {
                      const isFocused = focusedOtpIndex === idx;
                      const isFilled = digit.length > 0;

                      return (
                        <TextInput
                          key={idx}
                          ref={(ref) => {
                            inputRefs.current[idx] = ref;
                          }}
                          style={[
                            styles.otpInput,
                            isNarrowMobile && styles.otpInputNarrow,
                            isFilled && styles.otpInputFilled,
                            isFocused && styles.otpInputFocused,
                          ]}
                          value={digit}
                          onChangeText={(val) => handleDigitChange(val, idx)}
                          onKeyPress={(e) => handleKeyPress(e, idx)}
                          onFocus={() => setFocusedOtpIndex(idx)}
                          onBlur={() => setFocusedOtpIndex(null)}
                          keyboardType="number-pad"
                          maxLength={idx === 0 ? 6 : 1}
                          selectTextOnFocus
                          editable={!isLoading}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Primary Verification Action */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (isLoading || otpDigits.join('').length !== 6) && styles.buttonDisabled,
                  ]}
                  onPress={() => handleVerifyOtp()}
                  disabled={isLoading || otpDigits.join('').length !== 6}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Lock size={16} color={colors.white} strokeWidth={2.4} />
                      <Text style={styles.primaryButtonText}>Verify & Access Wallet</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Helpful Delivery & Spam Notice */}
                <View style={styles.spamTipBox}>
                  <View style={styles.spamTipRow}>
                    <Mail size={15} color={colors.brand[700]} style={styles.spamTipIcon} />
                    <Text style={styles.spamTipText}>
                      If you don't see the email in your inbox, please check your{' '}
                      <Text style={styles.spamTipBold}>Spam</Text> or{' '}
                      <Text style={styles.spamTipBold}>Junk</Text> folder.
                    </Text>
                  </View>
                </View>

                {/* Resend Code Section with 30s Countdown */}
                <View style={styles.resendSection}>
                  <Text style={styles.resendPrompt}>Didn't receive the code?</Text>
                  {resendCooldown > 0 ? (
                    <View style={styles.cooldownBadge}>
                      <Text style={styles.cooldownText}>Resend in {resendCooldown}s</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendOtp}
                      disabled={isLoading}
                      activeOpacity={0.7}
                      style={[styles.resendActionButton, isLoading && styles.buttonDisabled]}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={colors.brand[600]} />
                      ) : (
                        <>
                          <RotateCcw size={13} color={colors.brand[600]} />
                          <Text style={styles.resendActionText}>Resend Code</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* 5. SUBTLE FINTECH FOOTNOTE */}
            <View style={styles.footerNoteRow}>
              <Text style={styles.footerNoteText}>
                MY WALLET • Protected by Row Level Security
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Protected Developer Configuration Modal outside ScrollView */}
        {isConfigModalOpen && (
          <SupabaseConfigModal
            visible={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  scrollContainerNarrow: {
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 26,
    paddingVertical: 30,
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 28,
    elevation: 3,
  },
  cardNarrow: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoTouchable: {
    marginBottom: 12,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.brand[600],
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.slate[900],
    letterSpacing: 0.8,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[400],
    letterSpacing: 0.3,
    marginTop: 3,
  },
  formContainer: {
    gap: 18,
  },
  headingBlock: {
    alignItems: 'center',
    marginBottom: 4,
  },
  welcomeHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: colors.slate[500],
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 6,
  },
  emailHighlight: {
    fontWeight: '700',
    color: colors.brand[600],
  },
  inputSection: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    borderRadius: 14,
    backgroundColor: colors.slate[50],
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: colors.brand[600],
    backgroundColor: colors.white,
  },
  iconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.slate[900],
    fontWeight: '500',
    paddingVertical: 0,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    height: 50,
    borderRadius: 14,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: colors.slate[500],
    lineHeight: 16,
  },
  offlineRow: {
    alignItems: 'center',
    paddingTop: 2,
  },
  offlineButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
    textDecorationLine: 'underline',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: `${colors.brand[500]}10`,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[600],
  },
  otpSection: {
    gap: 8,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 4,
  },
  otpRowNarrow: {
    gap: 5,
  },
  otpInput: {
    flex: 1,
    maxWidth: 48,
    minWidth: 36,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    borderRadius: 12,
    backgroundColor: colors.slate[50],
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: colors.slate[900],
  },
  otpInputNarrow: {
    height: 46,
    fontSize: 18,
    borderRadius: 10,
  },
  otpInputFilled: {
    borderColor: colors.brand[500],
    backgroundColor: `${colors.brand[500]}0c`,
    color: colors.slate[900],
  },
  otpInputFocused: {
    borderColor: colors.brand[600],
    backgroundColor: colors.white,
  },
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  resendPrompt: {
    fontSize: 12,
    color: colors.slate[500],
  },
  cooldownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.slate[100],
  },
  cooldownText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[500],
  },
  resendActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${colors.brand[500]}10`,
  },
  resendActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[600],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.expense.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.expense.border,
    marginBottom: 14,
  },
  alertIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.expense.text,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.income.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.income.border,
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.income.text,
    lineHeight: 16,
  },
  spamTipBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  spamTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spamTipIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  spamTipText: {
    flex: 1,
    fontSize: 12,
    color: colors.slate[600],
    lineHeight: 18,
  },
  spamTipBold: {
    fontWeight: '800',
    color: colors.slate[800],
  },
  footerNoteRow: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[400],
    letterSpacing: 0.2,
  },
});
