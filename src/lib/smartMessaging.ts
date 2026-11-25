import { MessageType, MessageLanguage } from '../types';
import { formatRupees } from './currency';
import { formatDate } from './date';

export interface GenerateMessageParams {
  personName: string;
  type: MessageType;
  language: MessageLanguage;
  netBalance?: number;
  originalAmount?: number;
  alreadyPaid?: number;
  remainingBalance?: number;
  dueDate?: string;
  description?: string;
  customNote?: string;
}

/**
 * Normalizes a phone number to standard international dial format without spaces or symbols.
 * Defaults 10-digit Indian mobile numbers to 91XXXXXXXXXX.
 */
export const normalizePhoneForWhatsApp = (rawPhone: string): string => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

/**
 * Normalizes phone number for native SMS app
 */
export const normalizePhoneForSMS = (rawPhone: string): string => {
  if (!rawPhone) return '';
  return rawPhone.replace(/[\s\-\(\)]/g, '').trim();
};

/**
 * Generates dynamic, professional Khata messages in English or Malayalam.
 * Uses real transaction and person values.
 */
export const generateKhataMessage = (params: GenerateMessageParams): string => {
  const {
    personName,
    type,
    language,
    netBalance = 0,
    originalAmount,
    alreadyPaid,
    remainingBalance,
    dueDate,
    description,
    customNote,
  } = params;

  const remAmount =
    remainingBalance !== undefined
      ? remainingBalance
      : Math.abs(netBalance);
  const origAmount =
    originalAmount !== undefined ? originalAmount : remAmount + (alreadyPaid || 0);
  const paidAmount = alreadyPaid !== undefined ? alreadyPaid : Math.max(0, origAmount - remAmount);

  const formattedRem = formatRupees(remAmount);
  const formattedOrig = formatRupees(origAmount);
  const formattedPaid = formatRupees(paidAmount);
  const formattedDue = dueDate ? formatDate(dueDate) : 'Soon';

  const noteSuffixEn = customNote?.trim() ? `\n\nNote: ${customNote.trim()}` : '';
  const noteSuffixMl = customNote?.trim() ? `\n\nകുറിപ്പ്: ${customNote.trim()}` : '';

  if (language === 'ml') {
    // Malayalam Templates (മലയാളം)
    switch (type) {
      case 'payment_reminder':
        return (
          `പ്രിയ ${personName},\n\n` +
          `സുഖമാണെന്ന് കരുതുന്നു. മൈ വാലറ്റ് (My Wallet) ലെ കുടിശ്ശിക തുകയെക്കുറിച്ചുള്ള ഓർമ്മപ്പെടുത്തലാണിത്.\n\n` +
          `• യഥാർത്ഥ തുക: ${formattedOrig}\n` +
          `• ഇതുവരെ അടച്ചത്: ${formattedPaid}\n` +
          `• ബാക്കി തുക: ${formattedRem}\n` +
          (dueDate ? `• അടയ്ക്കേണ്ട തീയതി: ${formattedDue}\n` : '') +
          (description ? `• വിവരം: ${description}\n` : '') +
          noteSuffixMl +
          `\n\nസൗകര്യപ്രദമായ സമയത്ത് തുക നൽകുമല്ലോ. നന്ദി!`
        );

      case 'due_date_reminder':
        return (
          `പ്രിയ ${personName},\n\n` +
          `കുടിശ്ശിക തുകയായ ${formattedRem} അടയ്ക്കാനുള്ള തീയതി ${formattedDue} ആണ്.\n\n` +
          `• അടയ്ക്കേണ്ട തുക: ${formattedRem}\n` +
          `• അവസാന തീയതി: ${formattedDue}\n` +
          noteSuffixMl +
          `\n\nതീയതിക്ക് മുമ്പായി തുക തീർക്കാൻ അഭ്യർത്ഥിക്കുന്നു. നന്ദി!`
        );

      case 'overdue_reminder':
        return (
          `ശ്രദ്ധിക്കുക ${personName},\n\n` +
          `താങ്കളുടെ അക്കൗണ്ടിലുള്ള ${formattedRem} ന്റെ അടവ് തീയതി (${formattedDue}) കഴിഞ്ഞിരിക്കുന്നു.\n\n` +
          `• കുടിശ്ശിക തുക: ${formattedRem}\n` +
          `• കാലാവധി കഴിഞ്ഞ തീയതി: ${formattedDue}\n` +
          noteSuffixMl +
          `\n\nദയവായി ഉടൻ തന്നെ തുക നൽകി അക്കൗണ്ട് ക്രമീകരിക്കാൻ താത്പര്യപ്പെടുന്നു. നന്ദി!`
        );

      case 'payment_received':
        return (
          `നന്ദി ${personName},\n\n` +
          `താങ്കൾ നൽകിയ ${formattedPaid} ലഭിച്ചതായി സ്ഥിരീകരിക്കുന്നു.\n\n` +
          (remAmount > 0
            ? `• അടച്ച തുക: ${formattedPaid}\n• നിലവിലെ ബാക്കി തുക: ${formattedRem}\n`
            : `• അടച്ച തുക: ${formattedPaid}\n• ബാക്കി തുക: ₹0 (പൂർണ്ണമായി തീർപ്പാക്കി)\n`) +
          noteSuffixMl +
          `\n\nകൃത്യസമയത്തുള്ള അടവിന് നന്ദി അറിയിക്കുന്നു!`
        );

      case 'payment_made':
        return (
          `പ്രിയ ${personName},\n\n` +
          `ഞാൻ താങ്കൾക്ക് നൽകേണ്ട തുകയിൽ നിന്ന് ${formattedPaid} നൽകിയിട്ടുണ്ട്.\n\n` +
          `• നൽകിയ തുക: ${formattedPaid}\n` +
          `• ബാക്കി തുക: ${formattedRem}\n` +
          noteSuffixMl +
          `\n\nദയവായി തുക ലഭിച്ചത് പരിശോധിച്ച് ഉറപ്പുവരുത്തുക. നന്ദി!`
        );

      case 'personal':
      default:
        return (
          `പ്രിയ ${personName},\n\n` +
          `മൈ വാലറ്റ് അക്കൗണ്ട് പ്രകാരം നിലവിലെ ബാക്കി തുക: ${formattedRem}.\n` +
          (dueDate ? `അടയ്ക്കേണ്ട തീയതി: ${formattedDue}.\n` : '') +
          noteSuffixMl +
          `\n\nനന്ദി!`
        );
    }
  }

  // English Templates (Default)
  switch (type) {
    case 'payment_reminder':
      return (
        `Hello ${personName},\n\n` +
        `This is a friendly reminder from My Wallet regarding your pending balance.\n\n` +
        `• Original Amount: ${formattedOrig}\n` +
        `• Already Paid: ${formattedPaid}\n` +
        `• Remaining Balance: ${formattedRem}\n` +
        (dueDate ? `• Due Date: ${formattedDue}\n` : '') +
        (description ? `• Purpose: ${description}\n` : '') +
        noteSuffixEn +
        `\n\nKindly let me know when you can complete the payment. Thank you!`
      );

    case 'due_date_reminder':
      return (
        `Hello ${personName},\n\n` +
        `This is a reminder that the payment of ${formattedRem} is due on ${formattedDue}.\n\n` +
        `• Outstanding Balance: ${formattedRem}\n` +
        `• Due Date: ${formattedDue}\n` +
        noteSuffixEn +
        `\n\nPlease arrange for the payment on or before the due date. Thank you!`
      );

    case 'overdue_reminder':
      return (
        `Attention ${personName},\n\n` +
        `Your payment of ${formattedRem} is past its scheduled due date of ${formattedDue}.\n\n` +
        `• Overdue Amount: ${formattedRem}\n` +
        `• Original Due Date: ${formattedDue}\n` +
        noteSuffixEn +
        `\n\nPlease clear this pending amount at your earliest convenience. Thank you!`
      );

    case 'payment_received':
      return (
        `Hello ${personName},\n\n` +
        `We have received your payment of ${formattedPaid} successfully.\n\n` +
        (remAmount > 0
          ? `• Amount Received: ${formattedPaid}\n• Remaining Balance: ${formattedRem}\n`
          : `• Amount Received: ${formattedPaid}\n• Remaining Balance: ₹0 (Fully Settled)\n`) +
        noteSuffixEn +
        `\n\nThank you for the prompt settlement!`
      );

    case 'payment_made':
      return (
        `Hello ${personName},\n\n` +
        `I have made a payment of ${formattedPaid} towards the pending balance.\n\n` +
        `• Payment Made: ${formattedPaid}\n` +
        `• Remaining Payable: ${formattedRem}\n` +
        noteSuffixEn +
        `\n\nPlease check and confirm once received. Thank you!`
      );

    case 'personal':
    default:
      return (
        `Hello ${personName},\n\n` +
        `According to My Wallet records, the current balance is ${formattedRem}.\n` +
        (dueDate ? `Expected due date: ${formattedDue}.\n` : '') +
        noteSuffixEn +
        `\n\nThank you.`
      );
  }
};

/**
 * Creates a native WhatsApp URL with prefilled recipient and text.
 */
export const getWhatsAppUrl = (rawPhone: string, message: string): string => {
  const phone = normalizePhoneForWhatsApp(rawPhone);
  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
};

/**
 * Creates a web fallback WhatsApp URL (e.g. for desktop or webview).
 */
export const getWhatsAppWebUrl = (rawPhone: string, message: string): string => {
  const phone = normalizePhoneForWhatsApp(rawPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

/**
 * Creates an SMS URL that opens the native SMS composer with recipient and message prefilled.
 */
export const getSMSUrl = (rawPhone: string, message: string): string => {
  const phone = normalizePhoneForSMS(rawPhone);
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
};
