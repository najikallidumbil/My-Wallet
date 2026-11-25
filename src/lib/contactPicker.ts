import { Platform, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as LegacyContacts from 'expo-contacts/legacy';
import { Person } from '../types';

export interface ContactPhoneNumber {
  number: string;
  rawNumber: string;
  label: string;
}

export interface PickedContact {
  name: string;
  phone: string;
  phones: ContactPhoneNumber[];
  hasNoPhone?: boolean;
}

export interface PickContactResult {
  success: boolean;
  contact?: PickedContact;
  cancelled?: boolean;
  error?: string;
  permissionDenied?: boolean;
  canOpenSettings?: boolean;
}

/**
 * Checks if the contact picker is supported in the current environment.
 * On native mobile (Android / iOS APK), expo-contacts is always supported.
 * On web, checks for the Web Contacts API.
 */
export const isContactPickerSupported = (): boolean => {
  if (Platform.OS !== 'web') {
    return true;
  }
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return 'contacts' in navigator && 'ContactsManager' in window;
};

/**
 * Opens device settings so user can grant permission if permanently denied.
 */
export const openDeviceSettings = async (): Promise<void> => {
  try {
    if (Linking.openSettings) {
      await Linking.openSettings();
    }
  } catch (err) {
    console.warn('Failed to open device settings:', err);
  }
};

/**
 * Cleans phone number by:
 * - Retaining valid country codes like +91, +1, etc.
 * - Removing spaces, dashes, parentheses, dots and other non-digit characters.
 */
export const normalizePhoneNumber = (rawPhone: string): string => {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
};

/**
 * Formats phone label for display: e.g. 'mobile' -> 'Mobile', 'work' -> 'Work'
 */
const formatPhoneLabel = (rawLabel?: string): string => {
  if (!rawLabel) return 'Mobile';
  const clean = rawLabel.trim().toLowerCase();
  if (clean === 'cell' || clean === 'mobile') return 'Mobile';
  if (clean === 'home') return 'Home';
  if (clean === 'work') return 'Work';
  if (clean === 'main') return 'Main';
  if (clean === 'other') return 'Other';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

/**
 * Requests and verifies Contacts permissions on native device.
 */
export const requestContactPermissions = async (): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}> => {
  if (Platform.OS === 'web') {
    return { granted: true, canAskAgain: true, status: 'granted' };
  }

  try {
    let perm = await Contacts.getPermissionsAsync();
    if (perm.status !== 'granted') {
      perm = await Contacts.requestPermissionsAsync();
    }
    return {
      granted: perm.status === 'granted',
      canAskAgain: perm.canAskAgain,
      status: perm.status,
    };
  } catch (err) {
    console.warn('Permission request error:', err);
    return { granted: false, canAskAgain: false, status: 'denied' };
  }
};

/**
 * Launches the native device contact picker (via expo-contacts on Android / iOS)
 * or falls back to Web Contacts API if running in a supported web browser.
 */
export const pickContactFromDevice = async (): Promise<PickContactResult> => {
  // 1. Native Android / iOS implementation
  if (Platform.OS !== 'web') {
    try {
      const perm = await requestContactPermissions();
      if (!perm.granted) {
        return {
          success: false,
          permissionDenied: true,
          canOpenSettings: !perm.canAskAgain || perm.status === 'denied',
          error:
            'Contacts permission is required to import contacts from your phone. Please grant permission in device settings.',
        };
      }

      // Try modern Expo Contacts API (Contact.presentPicker) first, fallback to legacy
      let rawContact: any = null;
      let contactName = '';
      let rawPhones: Array<{ number?: string; label?: string }> = [];

      try {
        if (Contacts.Contact && typeof Contacts.Contact.presentPicker === 'function') {
          rawContact = await Contacts.Contact.presentPicker();
        }
      } catch (modernErr) {
        console.warn('Contacts.Contact.presentPicker unavailable, trying legacy picker:', modernErr);
      }

      if (!rawContact && LegacyContacts && typeof LegacyContacts.presentContactPickerAsync === 'function') {
        try {
          rawContact = await LegacyContacts.presentContactPickerAsync();
        } catch (legacyErr) {
          console.warn('Legacy presentContactPickerAsync failed:', legacyErr);
        }
      }

      // If user cancelled the picker
      if (!rawContact) {
        return { success: false, cancelled: true };
      }

      // Extract Name
      if (typeof rawContact.getFullName === 'function') {
        contactName = (await rawContact.getFullName()) || '';
      }
      if (!contactName && typeof rawContact.getGivenName === 'function') {
        const given = (await rawContact.getGivenName()) || '';
        const family = typeof rawContact.getFamilyName === 'function' ? (await rawContact.getFamilyName()) || '' : '';
        contactName = `${given} ${family}`.trim();
      }
      if (!contactName) {
        contactName = rawContact.name || `${rawContact.firstName || ''} ${rawContact.lastName || ''}`.trim();
      }

      // Extract Phones
      if (typeof rawContact.getPhones === 'function') {
        const p = await rawContact.getPhones();
        if (Array.isArray(p)) rawPhones = p;
      }
      if (rawPhones.length === 0 && Array.isArray(rawContact.phoneNumbers)) {
        rawPhones = rawContact.phoneNumbers;
      }

      // Clean and normalize phones
      const phones: ContactPhoneNumber[] = [];
      for (const p of rawPhones) {
        const rawNum = p?.number || '';
        const cleanNum = normalizePhoneNumber(rawNum);
        if (cleanNum && !phones.some((existing) => existing.number === cleanNum)) {
          phones.push({
            number: cleanNum,
            rawNumber: rawNum,
            label: formatPhoneLabel(p?.label),
          });
        }
      }

      const primaryPhone = phones.length > 0 ? phones[0].number : '';
      const finalName = contactName || primaryPhone || 'Unknown Contact';

      return {
        success: true,
        contact: {
          name: finalName,
          phone: primaryPhone,
          phones,
          hasNoPhone: phones.length === 0,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('cancel') || errorMsg.includes('AbortError')) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: errorMsg || 'Unable to access phone contacts.',
      };
    }
  }

  // 2. Web browser fallback (Chrome on Android)
  if (!isContactPickerSupported()) {
    return {
      success: false,
      error: 'Contact picker is not supported on this browser. Please enter name and phone number manually.',
    };
  }

  try {
    const nav = navigator as unknown as {
      contacts: {
        select: (
          props: ('name' | 'tel' | 'email')[],
          options?: { multiple?: boolean }
        ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
      };
    };

    const contacts = await nav.contacts.select(['name', 'tel'], { multiple: false });

    if (!contacts || contacts.length === 0) {
      return { success: false, cancelled: true };
    }

    const contact = contacts[0];
    const name = contact.name && contact.name.length > 0 ? contact.name[0].trim() : '';
    const rawTelList = contact.tel && contact.tel.length > 0 ? contact.tel : [];

    const phones: ContactPhoneNumber[] = [];
    for (const rawNum of rawTelList) {
      const cleanNum = normalizePhoneNumber(rawNum);
      if (cleanNum && !phones.some((existing) => existing.number === cleanNum)) {
        phones.push({
          number: cleanNum,
          rawNumber: rawNum,
          label: 'Mobile',
        });
      }
    }

    const primaryPhone = phones.length > 0 ? phones[0].number : '';
    const finalName = name || primaryPhone || 'Unknown Contact';

    return {
      success: true,
      contact: {
        name: finalName,
        phone: primaryPhone,
        phones,
        hasNoPhone: phones.length === 0,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('cancel') || errorMsg.includes('AbortError')) {
      return { success: false, cancelled: true };
    }
    return {
      success: false,
      error: errorMsg || 'Unable to access contacts from device.',
    };
  }
};

/**
 * Checks for duplicate person by comparing normalized name or phone against existing Khata contacts.
 */
export const findDuplicatePerson = (
  name: string,
  phone: string | undefined,
  existingPeople: Person[]
): Person | undefined => {
  const normName = name.trim().toLowerCase();
  const normPhone = phone ? normalizePhoneNumber(phone) : '';

  return existingPeople.find((p) => {
    const pName = p.name.trim().toLowerCase();
    const pPhone = p.phone ? normalizePhoneNumber(p.phone) : '';

    if (normName && pName === normName) {
      return true;
    }
    if (normPhone && pPhone) {
      const minLen = Math.min(normPhone.length, pPhone.length);
      if (normPhone === pPhone || (minLen >= 7 && (normPhone.endsWith(pPhone) || pPhone.endsWith(normPhone)))) {
        return true;
      }
    }
    return false;
  });
};
