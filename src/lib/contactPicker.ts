import { Person } from '../types';

export interface PickedContact {
  name: string;
  phone: string;
}

export interface PickContactResult {
  success: boolean;
  contact?: PickedContact;
  cancelled?: boolean;
  error?: string;
}

/**
 * Checks if the Web Contacts API is supported in the current environment
 * (Supported on Android Chrome 80+, Samsung Internet, Opera Mobile).
 */
export const isContactPickerSupported = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return 'contacts' in navigator && 'ContactsManager' in window;
};

/**
 * Cleans phone number by removing spaces, dashes, brackets, and leading 0 if needed.
 */
export const normalizePhoneNumber = (rawPhone: string): string => {
  if (!rawPhone) return '';
  return rawPhone.replace(/[\s\-\(\)]/g, '').trim();
};

/**
 * Launches the native device contact picker (supported on Android Chrome).
 * Requests contact permission only when the user triggers this action.
 */
export const pickContactFromDevice = async (): Promise<PickContactResult> => {
  if (!isContactPickerSupported()) {
    return {
      success: false,
      error: 'Device contact picker is supported on mobile browsers (such as Chrome on Android). On other devices, please enter the name and phone number directly.',
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
    const rawTel = contact.tel && contact.tel.length > 0 ? contact.tel[0] : '';
    const phone = normalizePhoneNumber(rawTel);

    if (!name && !phone) {
      return { success: false, cancelled: true };
    }

    return {
      success: true,
      contact: {
        name: name || phone,
        phone,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // User cancelled the native picker
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
    if (normPhone && pPhone && (normPhone === pPhone || normPhone.endsWith(pPhone) || pPhone.endsWith(normPhone))) {
      return true;
    }
    return false;
  });
};
