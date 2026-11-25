import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricAuthType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricAuthType[];
  primaryType: BiometricAuthType;
  typeLabel: string;
}

/**
 * Detect device biometric hardware and enrollment status safely.
 * Gracefully handles Android Fingerprint, iOS Face ID / Touch ID, and Web.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled, supportedTypesRaw] = await Promise.all([
      LocalAuthentication.hasHardwareAsync().catch(() => false),
      LocalAuthentication.isEnrolledAsync().catch(() => false),
      LocalAuthentication.supportedAuthenticationTypesAsync().catch(() => []),
    ]);

    const supportedTypes: BiometricAuthType[] = [];
    let hasFingerprint = false;
    let hasFacial = false;
    let hasIris = false;

    supportedTypesRaw.forEach((type) => {
      if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) {
        supportedTypes.push('fingerprint');
        hasFingerprint = true;
      } else if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
        supportedTypes.push('facial');
        hasFacial = true;
      } else if (type === LocalAuthentication.AuthenticationType.IRIS) {
        supportedTypes.push('iris');
        hasIris = true;
      }
    });

    // Determine primary label
    let primaryType: BiometricAuthType = 'none';
    let typeLabel = 'Biometric Authentication';

    if (hasFacial && Platform.OS === 'ios') {
      primaryType = 'facial';
      typeLabel = 'Face ID';
    } else if (hasFingerprint && Platform.OS === 'ios') {
      primaryType = 'fingerprint';
      typeLabel = 'Touch ID';
    } else if (hasFingerprint) {
      primaryType = 'fingerprint';
      typeLabel = 'Fingerprint';
    } else if (hasFacial) {
      primaryType = 'facial';
      typeLabel = 'Face Authentication';
    } else if (hasIris) {
      primaryType = 'iris';
      typeLabel = 'Iris Scanner';
    } else if (hasHardware) {
      primaryType = 'fingerprint';
      typeLabel = 'Biometrics';
    }

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
      primaryType,
      typeLabel,
    };
  } catch (err) {
    console.warn('Biometric capability detection error:', err);
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      primaryType: 'none',
      typeLabel: 'Biometrics',
    };
  }
}

/**
 * Prompt device native biometric authentication.
 * Uses native Android Fingerprint / BiometricPrompt or iOS FaceID / TouchID.
 * Never stores, reads, or exposes raw biometric or face data.
 */
export async function authenticateWithBiometrics(options?: {
  promptMessage?: string;
  cancelLabel?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync().catch(() => false);
    if (!hasHardware) {
      return { success: false, error: 'Biometric hardware is not available on this device.' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
    if (!isEnrolled) {
      return {
        success: false,
        error: 'No biometric credentials are enrolled. Please set up fingerprint or face recognition in your device settings.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || 'Unlock MY WALLET',
      cancelLabel: options?.cancelLabel || 'Use PIN',
      disableDeviceFallback: true, // Prefer our in-app PIN fallback
    });

    if (result.success) {
      return { success: true };
    }

    let userFriendlyError = 'Authentication failed. Please try again.';
    if (result.error === 'user_cancel' || result.error === 'app_cancel') {
      userFriendlyError = 'Authentication cancelled.';
    } else if (result.error === 'lockout') {
      userFriendlyError = 'Too many failed biometric attempts. Please enter your App PIN.';
    } else if (result.error === 'not_enrolled') {
      userFriendlyError = 'No biometric credentials enrolled on this device.';
    }

    return { success: false, error: userFriendlyError };
  } catch (err: any) {
    return { success: false, error: err.message || 'Biometric authentication encountered an error.' };
  }
}
