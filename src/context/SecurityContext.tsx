import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { storage } from '../lib/storage';
import { sha256Hex } from '../lib/crypto';
import {
  getBiometricCapability,
  authenticateWithBiometrics,
  BiometricCapability,
} from '../services/biometricService';

export type AutoLockDuration = 'immediately' | '30s' | '1m' | '5m' | '10m';

interface SecurityContextType {
  // App Lock Master State
  isAppLockEnabled: boolean;
  isLocked: boolean;
  isBiometricEnabled: boolean;
  hasPin: boolean;
  autoLockDuration: AutoLockDuration;
  isInitialized: boolean;

  // Hardware status
  biometricCapability: BiometricCapability;

  // Actions
  unlockWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
  unlockWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lockApp: () => void;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setAutoLockDuration: (duration: AutoLockDuration) => Promise<void>;
  setAppPin: (newPin: string) => Promise<{ success: boolean; error?: string }>;
  removeAppPin: () => Promise<void>;
  verifyCurrentPin: (pin: string) => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const STORAGE_KEYS = {
  APP_LOCK_ENABLED: 'my_wallet_security_app_lock_enabled_v1',
  BIOMETRIC_ENABLED: 'my_wallet_security_biometric_enabled_v1',
  PIN_HASH: 'my_wallet_security_pin_hash_v1',
  PIN_SALT: 'my_wallet_security_pin_salt_v1',
  AUTO_LOCK_DURATION: 'my_wallet_security_auto_lock_duration_v1',
};

const getDurationMs = (duration: AutoLockDuration): number => {
  switch (duration) {
    case 'immediately':
      return 0;
    case '30s':
      return 30 * 1000;
    case '1m':
      return 60 * 1000;
    case '5m':
      return 5 * 60 * 1000;
    case '10m':
      return 10 * 60 * 1000;
    default:
      return 0;
  }
};

const generateSalt = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAppLockEnabled, setIsAppLockEnabledState] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabledState] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [autoLockDuration, setAutoLockDurationState] = useState<AutoLockDuration>('immediately');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability>({
    hasHardware: false,
    isEnrolled: false,
    supportedTypes: [],
    primaryType: 'none',
    typeLabel: 'Biometrics',
  });

  const appState = useRef<AppStateStatus>(
    (AppState.currentState as AppStateStatus) || 'active'
  );
  const backgroundTimeRef = useRef<number | null>(null);

  // Initialize security preferences on cold start
  useEffect(() => {
    async function initSecurity() {
      try {
        // 1. Detect hardware biometrics
        const capability = await getBiometricCapability();
        setBiometricCapability(capability);

        // 2. Load stored settings
        const [storedAppLock, storedBio, storedPinHash, storedDuration] = await Promise.all([
          storage.getItem(STORAGE_KEYS.APP_LOCK_ENABLED),
          storage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
          storage.getItem(STORAGE_KEYS.PIN_HASH),
          storage.getItem(STORAGE_KEYS.AUTO_LOCK_DURATION),
        ]);

        const appLockEnabled = storedAppLock === 'true';
        const bioEnabled = storedBio === 'true';
        const pinExists = Boolean(storedPinHash);
        const duration = (storedDuration as AutoLockDuration) || 'immediately';

        setIsAppLockEnabledState(appLockEnabled);
        setIsBiometricEnabledState(bioEnabled);
        setHasPin(pinExists);
        setAutoLockDurationState(duration);

        // If app lock is enabled, lock immediately on startup (cannot bypass by restarting app)
        if (appLockEnabled) {
          setIsLocked(true);
        }
      } catch (err) {
        console.warn('Failed to initialize app security:', err);
      } finally {
        setIsInitialized(true);
      }
    }

    initSecurity();
  }, []);

  // Native AppState listener for Auto Lock when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App transitioning into background
        backgroundTimeRef.current = Date.now();
        // Immediately lock if configured for immediate auto-lock to protect app switcher preview
        if (isAppLockEnabled && autoLockDuration === 'immediately') {
          setIsLocked(true);
        }
      } else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App returning to foreground
        if (isAppLockEnabled && backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          const threshold = getDurationMs(autoLockDuration);
          if (elapsed >= threshold) {
            setIsLocked(true);
          }
        }
        backgroundTimeRef.current = null;
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAppLockEnabled, autoLockDuration]);

  // Web visibilitychange listener for browser tab blur/switch
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        backgroundTimeRef.current = Date.now();
        // Immediately lock if configured for immediate auto-lock
        if (isAppLockEnabled && autoLockDuration === 'immediately') {
          setIsLocked(true);
        }
      } else {
        if (isAppLockEnabled && backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          const threshold = getDurationMs(autoLockDuration);
          if (elapsed >= threshold) {
            setIsLocked(true);
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAppLockEnabled, autoLockDuration]);

  // Manual Lock
  const lockApp = useCallback(() => {
    if (isAppLockEnabled) {
      setIsLocked(true);
    }
  }, [isAppLockEnabled]);

  // Unlock with Biometrics
  const unlockWithBiometrics = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isBiometricEnabled || !biometricCapability.hasHardware || !biometricCapability.isEnrolled) {
      return { success: false, error: 'Biometric authentication is not enabled or not available on this device.' };
    }

    const res = await authenticateWithBiometrics({
      promptMessage: 'Unlock MY WALLET',
      cancelLabel: 'Use PIN',
    });

    if (res.success) {
      setIsLocked(false);
      return { success: true };
    }

    return { success: false, error: res.error };
  }, [isBiometricEnabled, biometricCapability]);

  // Verify PIN helper
  const verifyCurrentPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const [storedHash, storedSalt] = await Promise.all([
        storage.getItem(STORAGE_KEYS.PIN_HASH),
        storage.getItem(STORAGE_KEYS.PIN_SALT),
      ]);

      if (!storedHash || !storedSalt) return false;
      const computedHash = await sha256Hex(`${pin.trim()}:${storedSalt}`);
      return computedHash === storedHash;
    } catch {
      return false;
    }
  }, []);

  // Unlock with PIN
  const unlockWithPin = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const isValid = await verifyCurrentPin(pin);
    if (isValid) {
      setIsLocked(false);
      return { success: true };
    }
    return { success: false, error: 'Incorrect PIN code. Please try again.' };
  }, [verifyCurrentPin]);

  // Set / Update App PIN
  const setAppPin = useCallback(async (newPin: string): Promise<{ success: boolean; error?: string }> => {
    const cleaned = newPin.trim();
    if (!/^\d{4,6}$/.test(cleaned)) {
      return { success: false, error: 'PIN must be between 4 and 6 digits.' };
    }

    try {
      const salt = generateSalt();
      const hash = await sha256Hex(`${cleaned}:${salt}`);
      await Promise.all([
        storage.setItem(STORAGE_KEYS.PIN_HASH, hash),
        storage.setItem(STORAGE_KEYS.PIN_SALT, salt),
      ]);
      setHasPin(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save security PIN.' };
    }
  }, []);

  // Remove App PIN
  const removeAppPin = useCallback(async (): Promise<void> => {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.PIN_HASH),
      storage.removeItem(STORAGE_KEYS.PIN_SALT),
    ]);
    setHasPin(false);
  }, []);

  // Enable / Disable App Lock
  const setAppLockEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    setIsAppLockEnabledState(enabled);
    await storage.setItem(STORAGE_KEYS.APP_LOCK_ENABLED, enabled ? 'true' : 'false');
    if (!enabled) {
      setIsLocked(false);
    }
  }, []);

  // Enable / Disable Biometric
  const setBiometricEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    setIsBiometricEnabledState(enabled);
    await storage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  }, []);

  // Set Auto Lock Duration
  const setAutoLockDuration = useCallback(async (duration: AutoLockDuration): Promise<void> => {
    setAutoLockDurationState(duration);
    await storage.setItem(STORAGE_KEYS.AUTO_LOCK_DURATION, duration);
  }, []);

  return (
    <SecurityContext.Provider
      value={{
        isAppLockEnabled,
        isLocked,
        isBiometricEnabled,
        hasPin,
        autoLockDuration,
        isInitialized,
        biometricCapability,
        unlockWithBiometrics,
        unlockWithPin,
        lockApp,
        setAppLockEnabled,
        setBiometricEnabled,
        setAutoLockDuration,
        setAppPin,
        removeAppPin,
        verifyCurrentPin,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
