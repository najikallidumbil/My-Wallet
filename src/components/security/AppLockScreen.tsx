import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Wallet,
  Fingerprint,
  Smile,
  ShieldAlert,
  Delete,
  Lock,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useSecurity } from '../../context/SecurityContext';
import { useResponsive } from '../../lib/useResponsive';

export const AppLockScreen: React.FC = () => {
  const {
    isBiometricEnabled,
    biometricCapability,
    hasPin,
    unlockWithBiometrics,
    unlockWithPin,
  } = useSecurity();

  const { isNarrowMobile } = useResponsive();

  const [pinDigits, setPinDigits] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState<boolean>(false);

  // Auto prompt biometrics on mount if enabled
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isBiometricEnabled && biometricCapability.hasHardware && biometricCapability.isEnrolled) {
      timeout = setTimeout(() => {
        handleBiometricAuth();
      }, 350);
    }
    return () => clearTimeout(timeout);
  }, [isBiometricEnabled, biometricCapability]);

  const handleBiometricAuth = async () => {
    if (isBiometricPrompting) return;
    setIsBiometricPrompting(true);
    setErrorMessage(null);

    const res = await unlockWithBiometrics();
    setIsBiometricPrompting(false);

    if (!res.success && res.error && !res.error.includes('cancelled')) {
      setErrorMessage(res.error);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (pinDigits.length >= 6 || isVerifying) return;
    setErrorMessage(null);

    const newPin = pinDigits + digit;
    setPinDigits(newPin);

    // Auto submit if 4 or 6 digits
    if (newPin.length === 4 || newPin.length === 6) {
      // Auto verify at 4 digits first if configured, else wait or verify
      submitPin(newPin);
    }
  };

  const submitPin = async (candidatePin: string) => {
    setIsVerifying(true);
    const res = await unlockWithPin(candidatePin);
    setIsVerifying(false);

    if (!res.success) {
      // If it failed at 4 digits, but user might be typing a 6-digit PIN, let them continue if length < 6
      if (candidatePin.length === 4) {
        // We will wait in case they want to enter 2 more digits
        return;
      }
      setErrorMessage(res.error || 'Incorrect PIN code');
      setPinDigits('');
    }
  };

  const handleDeletePress = () => {
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
      setErrorMessage(null);
    }
  };

  const handleClearPress = () => {
    setPinDigits('');
    setErrorMessage(null);
  };

  const isFace = biometricCapability.primaryType === 'facial';

  return (
    <View style={styles.container}>
      {/* Background Decor */}
      <View style={styles.glowTop} />

      <View style={styles.innerContent}>
        {/* App Logo & Branding */}
        <View style={styles.brandingBox}>
          <View style={styles.logoBadge}>
            <Wallet size={36} color={colors.white} />
          </View>
          <Text style={styles.appTitle}>MY WALLET</Text>
          <View style={styles.secureTag}>
            <Lock size={12} color="#38bdf8" />
            <Text style={styles.secureTagText}>SECURED FINANCIAL VAULT</Text>
          </View>
        </View>

        {/* Error Banner */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <ShieldAlert size={16} color={colors.expense.text} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* PIN Entry Indicators */}
        <View style={styles.pinSection}>
          <Text style={styles.pinPromptText}>
            {hasPin ? 'Enter your Security PIN' : 'Authentication Required'}
          </Text>

          {/* PIN Dots (supports 4 to 6 digits) */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx < pinDigits.length && styles.dotFilled,
                  errorMessage ? styles.dotError : null,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Numeric Keypad */}
        <View style={[styles.keypad, isNarrowMobile && styles.keypadNarrow]}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={styles.keyBtn}
                  onPress={() => handleDigitPress(digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{digit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Bottom Keypad Row: Biometrics / Clear, 0, Backspace */}
          <View style={styles.keypadRow}>
            {isBiometricEnabled && biometricCapability.hasHardware ? (
              <TouchableOpacity
                style={[styles.keyBtn, styles.biometricKeyBtn]}
                onPress={handleBiometricAuth}
                disabled={isBiometricPrompting}
                activeOpacity={0.6}
              >
                {isBiometricPrompting ? (
                  <ActivityIndicator size="small" color="#38bdf8" />
                ) : isFace ? (
                  <Smile size={26} color="#38bdf8" />
                ) : (
                  <Fingerprint size={26} color="#38bdf8" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.keyBtn}
                onPress={handleClearPress}
                activeOpacity={0.6}
              >
                <Text style={styles.clearKeyText}>Clear</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.keyBtn}
              onPress={() => handleDigitPress('0')}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keyBtn}
              onPress={handleDeletePress}
              activeOpacity={0.6}
            >
              <Delete size={22} color={colors.slate[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Primary Biometric Quick Action Button */}
        {isBiometricEnabled && biometricCapability.hasHardware && (
          <TouchableOpacity
            style={styles.biometricBarBtn}
            onPress={handleBiometricAuth}
            disabled={isBiometricPrompting}
            activeOpacity={0.7}
          >
            {isFace ? (
              <Smile size={20} color="#38bdf8" />
            ) : (
              <Fingerprint size={20} color="#38bdf8" />
            )}
            <Text style={styles.biometricBarText}>
              Unlock with {biometricCapability.typeLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
  },
  innerContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 24,
  },
  brandingBox: {
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 2,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  secureTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 1,
  },

  // Error Banner
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f87171',
  },

  // PIN Section
  pinSection: {
    alignItems: 'center',
    gap: 14,
  },
  pinPromptText: {
    fontSize: 13,
    color: colors.slate[400],
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.slate[600],
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
    transform: [{ scale: 1.15 }],
  },
  dotError: {
    borderColor: '#ef4444',
    backgroundColor: '#ef4444',
  },

  // Numeric Keypad
  keypad: {
    width: '100%',
    maxWidth: 290,
    gap: 14,
    marginTop: 6,
  },
  keypadNarrow: {
    maxWidth: 270,
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.white,
  },
  biometricKeyBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  clearKeyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[400],
  },

  // Biometric Bar Button
  biometricBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  biometricBarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
});
