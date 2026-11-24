import { formatRupees } from './currency';
import { formatDate } from './date';

export type ReminderTemplateKey = 'gentle' | 'due_today' | 'overdue' | 'formal' | 'custom';

export interface ReminderParams {
  name: string;
  phone?: string;
  amount: number;
  remainingAmount?: number;
  dueDate?: string;
  type?: 'credit' | 'debt';
}

export const REMINDER_TEMPLATES: Record<
  ReminderTemplateKey,
  { label: string; text: (params: ReminderParams) => string }
> = {
  gentle: {
    label: 'Gentle Reminder',
    text: ({ name, amount, dueDate }) => {
      const formattedAmount = formatRupees(amount);
      const dueText = dueDate ? `due on ${formatDate(dueDate)}` : 'recorded in our wallet khata';
      return `Hi ${name}, just a gentle reminder regarding the pending amount of ${formattedAmount} (${dueText}). Please let me know when convenient. Thanks!`;
    },
  },
  due_today: {
    label: 'Due Today',
    text: ({ name, amount, dueDate }) => {
      const formattedAmount = formatRupees(amount);
      const dueText = dueDate ? formatDate(dueDate) : 'today';
      return `Hi ${name}, hope you are doing well! The pending payment of ${formattedAmount} is due today (${dueText}). Please arrange to settle it at your convenience.`;
    },
  },
  overdue: {
    label: 'Overdue Follow-up',
    text: ({ name, amount, dueDate }) => {
      const formattedAmount = formatRupees(amount);
      const dueText = dueDate ? formatDate(dueDate) : 'recently';
      return `Hi ${name}, this is a follow-up regarding the amount of ${formattedAmount} which was due on ${dueText} and is currently overdue. Kindly process the payment as soon as possible. Thank you.`;
    },
  },
  formal: {
    label: 'Formal Statement',
    text: ({ name, amount, dueDate }) => {
      const formattedAmount = formatRupees(amount);
      const dueText = dueDate ? `Due Date: ${formatDate(dueDate)}` : 'Pending Settlement';
      return `Dear ${name}, this is an account statement update. Balance Amount: ${formattedAmount}. ${dueText}. Please confirm once processed.`;
    },
  },
  custom: {
    label: 'Custom Message',
    text: ({ name, amount }) => `Hi ${name}, regarding the wallet amount of ${formatRupees(amount)}...`,
  },
};

/**
 * Format mobile phone number into clean digits with country code for WhatsApp
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  // If 10 digits (standard Indian mobile without country code), prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Generate a WhatsApp Click-to-Chat URL
 */
export function createWhatsAppUrl(phone: string | undefined, message: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generate an SMS URL with prefilled recipient and body
 */
export function createSmsUrl(phone: string | undefined, message: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedBody = encodeURIComponent(message);
  return `sms:${cleanPhone}?body=${encodedBody}`;
}

export const generateWhatsAppUrl = createWhatsAppUrl;
export const generateSmsUrl = createSmsUrl;

