import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Clock,
  RotateCcw,
  Trash2,
  Lock,
  Inbox,
  Check,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useResponsive } from '../../lib/useResponsive';
import { getSupabaseClient } from '../../lib/supabase';

interface ClearDataOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void> | void;
}

type ClearDataStep = 'warning' | 'otp' | 'final_confirmation';

const OTP_VALID_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 30; // 30 seconds
const MAX_INCORRECT_ATTEMPTS = 5;

/**
 * Mask email for privacy (e.g. dani@gmail.com -> da****@gmail.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'your registered email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}****@${domain}`;
  }
  const visible = local.slice(0, 2);
  const maskedLen = Math.max(4, local.length - 2);
  return `${visible}${'*'.repeat(maskedLen)}@${domain}`;
}

export const ClearDataOtpModal: React.FC<ClearDataOtpModalProps> = ({
  visible,
  onClose,
  onConfirmDelete,
}) => {
  const { user, profile } = useAuth();
  const { isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  // Active authenticated user's email
  const userEmail = (user?.email || profile?.email || '').trim().toLowerCase();
  const maskedEmail = maskEmail(userEmail);

  // Flow step: 'warning' -> 'otp' -> 'final_confirmation'
  const [step, setStep] = useState<ClearDataStep>('warning');

  // OTP session state
  const [otpInput, setOtpInput] = useState('');
  const [expirySeconds, setExpirySeconds] = useState(OTP_VALID_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Loading indicators
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications and errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailNotification, setEmailNotification] = useState<string | null>(null);

  // Interval timer refs
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state whenever modal is opened or closed
  useEffect(() => {
    if (visible) {
      setStep('warning');
      setOtpInput('');
      setExpirySeconds(OTP_VALID_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setFailedAttempts(0);
      setIsLockedOut(false);
      setIsOtpVerified(false);
      setIsSendingOtp(false);
      setIsVerifyingOtp(false);
      setIsDeleting(false);
      setErrorMessage(null);
      setEmailNotification(null);
    } else {
      clearAllTimers();
    }
  }, [visible]);

  const clearAllTimers = () => {
    if (expiryTimerRef.current) {
      clearInterval(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
  };

  // Start 5-minute expiry countdown & 30-second resend cooldown
  const startTimers = () => {
    clearAllTimers();

    setExpirySeconds(OTP_VALID_SECONDS);
    expiryTimerRef.current = setInterval(() => {
      setExpirySeconds((prev) => {
        if (prev <= 1) {
          if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Format seconds into MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 1. Send Email OTP via Supabase Auth
  const handleSendOtp = async () => {
    if (!userEmail) {
      setErrorMessage('No registered email found. Please sign in with your email first.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage('Supabase is not configured or offline.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);
    setEmailNotification(null);

    try {
      const redirectUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'mywallet://';

      // Send OTP to the authenticated user's registered email
      // shouldCreateUser: false ensures we never create a new account
      const { error } = await client.auth.signInWithOtp({
        email: userEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          setErrorMessage('Rate limit reached: Please wait 60 seconds before requesting a fresh OTP.');
        } else {
          setErrorMessage(error.message || 'Failed to send verification OTP.');
        }
        return;
      }

      setOtpInput('');
      setFailedAttempts(0);
      setIsLockedOut(false);
      startTimers();

      setEmailNotification(
        `A 6-digit security OTP has been sent to ${maskedEmail}. Please check your inbox and spam folder.`
      );
      setStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 2. Resend OTP after 30-second cooldown
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLockedOut || isSendingOtp) return;
    if (!userEmail) return;

    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage('Supabase client is not available.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      const redirectUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'mywallet://';

      const { error } = await client.auth.signInWithOtp({
        email: userEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          setErrorMessage('Rate limit reached: Please wait before requesting another OTP.');
        } else {
          setErrorMessage(error.message || 'Failed to resend OTP.');
        }
        return;
      }

      setOtpInput('');
      startTimers();
      setEmailNotification(
        `Fresh 6-digit security OTP sent to ${maskedEmail}. Valid for 5 minutes.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 3. Verify entered 6-digit Email OTP against Supabase
  const handleVerifyOtp = async () => {
    if (isLockedOut || isVerifyingOtp) return;
    setErrorMessage(null);

    // Check expiry
    if (expirySeconds <= 0) {
      setErrorMessage('This OTP has expired. Please tap "Resend OTP" to request a new 6-digit code.');
      return;
    }

    const trimmedInput = otpInput.trim();
    if (trimmedInput.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage('Supabase client is not available.');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      // Primary verification with type: 'email' (Supabase standard)
      let { data, error } = await client.auth.verifyOtp({
        email: userEmail,
        token: trimmedInput,
        type: 'email',
      });

      // Fallback: type: 'magiclink' if token was generated as magiclink
      if (error && (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('expired'))) {
        try {
          const magicRes = await client.auth.verifyOtp({
            email: userEmail,
            token: trimmedInput,
            type: 'magiclink',
          });
          if (!magicRes.error && magicRes.data?.session) {
            data = magicRes.data;
            error = null;
          }
        } catch (_) {}
      }

      if (error) {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        setOtpInput('');

        if (newFailed >= MAX_INCORRECT_ATTEMPTS) {
          setIsLockedOut(true);
          clearAllTimers();
          setErrorMessage(
            'Maximum 5 incorrect attempts reached. Clear Data request has been permanently aborted for security. No data was deleted.'
          );
        } else {
          const remaining = MAX_INCORRECT_ATTEMPTS - newFailed;
          setErrorMessage(
            `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          );
        }
        return;
      }

      // Security validation: verify account identity matches authenticated session
      if (data?.user && user?.id && data.user.id !== user.id) {
        setErrorMessage('Security validation mismatch: Authenticated user identity does not match.');
        return;
      }

      // Successful verification
      setIsOtpVerified(true);
      clearAllTimers();
      setErrorMessage(null);
      setStep('final_confirmation');
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // 4. Final Confirmation Permanent Deletion
  const handleExecutePermanentDelete = async () => {
    // Strict security check: cannot bypass OTP verification
    if (!isOtpVerified || step !== 'final_confirmation') {
      setErrorMessage('Security validation failed: Email OTP verification must be completed first.');
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirmDelete();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to clear data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel & Abort Flow safely
  const handleCancel = () => {
    clearAllTimers();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, isWide && styles.modalCardWide]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <ShieldAlert size={20} color={colors.expense.text} />
              <Text style={styles.headerTitle}>Clear All Data Security</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Email Dispatch Notification Banner */}
            {emailNotification && (
              <View style={styles.emailNoticeBox}>
                <View style={styles.emailNoticeHeader}>
                  <Inbox size={15} color="#15803d" />
                  <Text style={styles.emailNoticeTitle}>Email OTP Dispatched</Text>
                </View>
                <Text style={styles.emailNoticeBody}>{emailNotification}</Text>
              </View>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <View style={[styles.errorBox, isLockedOut && styles.lockoutBox]}>
                {isLockedOut ? (
                  <Lock size={16} color={colors.expense.text} />
                ) : (
                  <AlertTriangle size={16} color={colors.expense.text} />
                )}
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* ========================================================= */}
            {/* STEP 1: WARNING CONFIRMATION DIALOG                        */}
            {/* ========================================================= */}
            {step === 'warning' && (
              <View style={styles.stepContainer}>
                {/* Warning Card */}
                <View style={styles.warningCard}>
                  <View style={styles.warningHeader}>
                    <AlertTriangle size={24} color={colors.expense.text} />
                    <Text style={styles.warningTitle}>Warning: Irreversible Action</Text>
                  </View>
                  <Text style={styles.warningDesc}>
                    You are requesting to permanently delete all financial records from My Wallet:
                  </Text>
                  <View style={styles.warningBulletList}>
                    <Text style={styles.warningBullet}>• All income and expense transactions</Text>
                    <Text style={styles.warningBullet}>• All credit and debt ledger accounts (Khata Book)</Text>
                    <Text style={styles.warningBullet}>• All contacts, accounts, budgets, and message logs</Text>
                    <Text style={styles.warningBullet}>• All local and cloud synchronized data</Text>
                  </View>
                  <Text style={styles.warningFooterNote}>
                    This operation cannot be undone. To prevent accidental or unauthorized data loss, a 6-digit OTP will be sent to your registered account email.
                  </Text>
                </View>

                {/* Registered Account Email Card (Auto-retrieved from Supabase session) */}
                <View style={styles.emailCard}>
                  <View style={styles.emailCardHeader}>
                    <Mail size={16} color={colors.brand[700]} />
                    <Text style={styles.emailCardLabel}>Registered Account Email</Text>
                  </View>

                  <View style={styles.displayEmailRow}>
                    <Text style={styles.displayEmailVal}>{maskedEmail}</Text>
                    <View style={styles.verifiedBadge}>
                      <Check size={12} color="#15803d" />
                      <Text style={styles.verifiedText}>Auth Verified</Text>
                    </View>
                  </View>

                  <Text style={styles.emailCardHint}>
                    A 6-digit security OTP will be sent to this email address. Valid for 5 minutes.
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                    disabled={isSendingOtp}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sendOtpBtn, isSendingOtp && styles.btnDisabled]}
                    onPress={handleSendOtp}
                    activeOpacity={0.8}
                    disabled={isSendingOtp || !userEmail}
                  >
                    {isSendingOtp ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <ShieldAlert size={16} color={colors.white} />
                        <Text style={styles.sendOtpBtnText}>Send Verification OTP</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* STEP 2: OTP VERIFICATION SCREEN                          */}
            {/* ========================================================= */}
            {step === 'otp' && (
              <View style={styles.stepContainer}>
                {/* OTP Prompt */}
                <View style={styles.otpHeaderBox}>
                  <Text style={styles.otpHeaderTitle}>Enter 6-Digit Email OTP</Text>
                  <Text style={styles.otpHeaderSub}>
                    Enter the verification code sent to {maskedEmail}
                  </Text>
                </View>

                {/* Timers & Attempts Status Strip */}
                <View style={styles.statusStrip}>
                  {/* Validity Timer (5 Minutes) */}
                  <View style={[styles.statusItem, expirySeconds <= 60 && styles.statusItemExpiring]}>
                    <Clock
                      size={14}
                      color={expirySeconds <= 60 ? colors.expense.text : colors.slate[600]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        expirySeconds <= 60 && styles.statusTextExpiring,
                      ]}
                    >
                      {expirySeconds > 0
                        ? `Valid for: ${formatTimer(expirySeconds)}`
                        : 'OTP Expired'}
                    </Text>
                  </View>

                  {/* Attempts Remaining (Max 5 attempts) */}
                  <View style={styles.statusItem}>
                    <ShieldAlert
                      size={14}
                      color={failedAttempts >= 3 ? colors.expense.text : colors.brand[600]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        failedAttempts >= 3 && { color: colors.expense.text, fontWeight: '700' },
                      ]}
                    >
                      Attempts: {MAX_INCORRECT_ATTEMPTS - failedAttempts} of {MAX_INCORRECT_ATTEMPTS}
                    </Text>
                  </View>
                </View>

                {/* 6-Digit Input */}
                <View style={styles.otpInputWrapper}>
                  <TextInput
                    style={[
                      styles.otpLargeInput,
                      isLockedOut && styles.otpInputLocked,
                      expirySeconds <= 0 && styles.otpInputExpired,
                    ]}
                    value={otpInput}
                    onChangeText={(val) => {
                      if (!isLockedOut && expirySeconds > 0) {
                        setOtpInput(val.replace(/\D/g, '').slice(0, 6));
                      }
                    }}
                    placeholder="••••••"
                    placeholderTextColor={colors.slate[300]}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLockedOut && expirySeconds > 0 && !isVerifyingOtp}
                    autoFocus
                  />
                  <Text style={styles.otpDigitHelp}>
                    {otpInput.length}/6 digits entered
                  </Text>
                </View>

                {/* Resend OTP Bar (30-second cooldown) */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendPrompt}>Didn't receive the email?</Text>
                  <TouchableOpacity
                    style={[
                      styles.resendBtn,
                      (resendCooldown > 0 || isLockedOut || isSendingOtp) && styles.resendBtnDisabled,
                    ]}
                    onPress={handleResendOtp}
                    disabled={resendCooldown > 0 || isLockedOut || isSendingOtp}
                  >
                    {isSendingOtp ? (
                      <ActivityIndicator size="small" color={colors.brand[600]} />
                    ) : (
                      <>
                        <RotateCcw
                          size={14}
                          color={resendCooldown > 0 || isLockedOut ? colors.slate[400] : colors.brand[600]}
                        />
                        <Text
                          style={[
                            styles.resendBtnText,
                            (resendCooldown > 0 || isLockedOut) && styles.resendBtnTextDisabled,
                          ]}
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                    disabled={isVerifyingOtp}
                  >
                    <Text style={styles.cancelBtnText}>
                      {isLockedOut ? 'Close' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  {!isLockedOut && (
                    <TouchableOpacity
                      style={[
                        styles.verifyBtn,
                        (otpInput.length !== 6 || expirySeconds <= 0 || isVerifyingOtp) &&
                          styles.verifyBtnDisabled,
                      ]}
                      onPress={handleVerifyOtp}
                      disabled={otpInput.length !== 6 || expirySeconds <= 0 || isVerifyingOtp}
                      activeOpacity={0.8}
                    >
                      {isVerifyingOtp ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <>
                          <ShieldCheck size={16} color={colors.white} />
                          <Text style={styles.verifyBtnText}>Verify OTP</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* STEP 3: FINAL CONFIRMATION PERMANENT DELETE               */}
            {/* ========================================================= */}
            {step === 'final_confirmation' && (
              <View style={styles.stepContainer}>
                {/* Verified Identity Badge */}
                <View style={styles.verifiedBadgeCard}>
                  <ShieldCheck size={28} color="#15803d" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifiedBadgeTitle}>Email OTP Identity Verified</Text>
                    <Text style={styles.verifiedBadgeSub}>
                      Authorized for registered account: {maskedEmail}
                    </Text>
                  </View>
                </View>

                {/* Final Destruction Warning */}
                <View style={styles.finalWarningCard}>
                  <View style={styles.warningHeader}>
                    <Trash2 size={24} color={colors.expense.text} />
                    <Text style={styles.finalWarningTitle}>Final Confirmation Required</Text>
                  </View>
                  <Text style={styles.finalWarningDesc}>
                    You have successfully passed email OTP security. Click the button below to permanently delete all data.
                  </Text>
                  <View style={styles.finalNoticeBox}>
                    <Text style={styles.finalNoticeText}>
                      ⚠️ Once you click "Permanently Delete All Data", all financial history will be permanently wiped from both your local device and Supabase Cloud.
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.finalActionsCol}>
                  <TouchableOpacity
                    style={[styles.permanentDeleteBtn, isDeleting && styles.btnDisabled]}
                    onPress={handleExecutePermanentDelete}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Trash2 size={18} color={colors.white} />
                        <Text style={styles.permanentDeleteBtnText}>
                          Permanently Delete All Data
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelKeepBtn}
                    onPress={handleCancel}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelKeepBtnText}>Cancel & Keep Data</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalCardWide: {
    maxWidth: 540,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate[900],
    flexShrink: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    flexShrink: 0,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  stepContainer: {
    gap: 16,
  },

  // Email Notice Box
  emailNoticeBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  emailNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailNoticeBody: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },

  // Error Banner
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  lockoutBox: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.expense.text,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Warning Card
  warningCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.expense.text,
  },
  warningDesc: {
    fontSize: 13,
    color: colors.slate[700],
    lineHeight: 18,
  },
  warningBulletList: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  warningBullet: {
    fontSize: 12,
    color: colors.slate[700],
    fontWeight: '500',
  },
  warningFooterNote: {
    fontSize: 12,
    color: colors.slate[600],
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Email Card
  emailCard: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  emailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  displayEmailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  displayEmailVal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate[900],
    letterSpacing: 0.5,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  emailCardHint: {
    fontSize: 11,
    color: colors.slate[500],
  },

  // OTP Step UI
  otpHeaderBox: {
    alignItems: 'center',
    gap: 6,
  },
  otpHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
  otpHeaderSub: {
    fontSize: 13,
    color: colors.slate[600],
    textAlign: 'center',
  },
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusItemExpiring: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.slate[700],
    fontWeight: '600',
  },
  statusTextExpiring: {
    color: colors.expense.text,
    fontWeight: '700',
  },
  otpInputWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  otpLargeInput: {
    width: '100%',
    maxWidth: 280,
    height: 60,
    borderWidth: 2,
    borderColor: colors.brand[500],
    borderRadius: 14,
    backgroundColor: colors.slate[50],
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    color: colors.slate[900],
  },
  otpInputLocked: {
    borderColor: colors.slate[300],
    backgroundColor: colors.slate[100],
    color: colors.slate[400],
  },
  otpInputExpired: {
    borderColor: colors.expense.solid,
  },
  otpDigitHelp: {
    fontSize: 12,
    color: colors.slate[500],
    fontWeight: '500',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resendPrompt: {
    fontSize: 13,
    color: colors.slate[600],
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  resendBtnDisabled: {
    opacity: 0.6,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand[600],
  },
  resendBtnTextDisabled: {
    color: colors.slate[400],
  },

  // Final Confirmation UI
  verifiedBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
  },
  verifiedBadgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
  },
  verifiedBadgeSub: {
    fontSize: 12,
    color: '#166534',
  },
  finalWarningCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  finalWarningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.expense.text,
  },
  finalWarningDesc: {
    fontSize: 13,
    color: colors.slate[700],
    lineHeight: 18,
  },
  finalNoticeBox: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  finalNoticeText: {
    fontSize: 12,
    color: colors.expense.text,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[300],
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
  },
  sendOtpBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.expense.solid,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sendOtpBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  verifyBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brand[600],
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  verifyBtnDisabled: {
    backgroundColor: colors.slate[300],
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  finalActionsCol: {
    gap: 10,
    marginTop: 8,
  },
  permanentDeleteBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  permanentDeleteBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  cancelKeepBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[300],
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelKeepBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
  },
});
