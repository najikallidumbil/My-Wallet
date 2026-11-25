import {
  TransactionType,
  CreditDebtType,
  RecordStatus,
  PaymentMethod,
} from './database.types';

export * from './database.types';

export type AppMode = 'income_expense' | 'khata_book' | 'financial_overview';

export type AccountType = 'cash' | 'bank' | 'upi' | 'custom';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  accountNumber?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface AccountTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  notes?: string;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  avatarUrl?: string;
  isArchived?: boolean;
  createdAt: string;
}

export interface PersonSummary extends Person {
  totalGiven: number; // Credit lent
  totalReceivedBack: number; // Credit repaid to me
  totalBorrowed: number; // Debt borrowed
  totalRepaid: number; // Debt repaid by me
  outstandingReceivable: number; // Given - ReceivedBack
  outstandingPayable: number; // Borrowed - Repaid
  netBalance: number; // Receivable - Payable (positive = they owe me, negative = I owe them)
  recordsCount: number;
  lastTransactionDate?: string;
  nextDueDate?: string;
  paymentStatus?: 'pending' | 'settled' | 'overdue' | 'partial';
  hasOverdue?: boolean;
}

export type MessageType =
  | 'payment_reminder'
  | 'due_date_reminder'
  | 'overdue_reminder'
  | 'payment_received'
  | 'payment_made'
  | 'personal';

export type MessageChannel = 'whatsapp' | 'sms' | 'copied';

export type MessageStatus =
  | 'prepared'
  | 'opened_in_whatsapp'
  | 'opened_in_sms'
  | 'sent'
  | 'delivered'
  | 'failed';

export type MessageLanguage = 'en' | 'ml';

export interface MessageRecord {
  id: string;
  userId?: string;
  personId?: string;
  personName: string;
  recipientPhone?: string;
  messageType: MessageType;
  channel: MessageChannel;
  status: MessageStatus;
  messageContent: string;
  language: MessageLanguage;
  amount?: number;
  sentAt: string;
  createdAt: string;
}

export type KhataFilterType =
  | 'all'
  | 'credit'
  | 'debt'
  | 'pending'
  | 'settled'
  | 'overdue'
  | 'upcoming';

export type KhataSortType =
  | 'name_asc'
  | 'name_desc'
  | 'amount_desc'
  | 'amount_asc'
  | 'recent_tx'
  | 'oldest_tx'
  | 'due_date_asc'
  | 'due_date_desc';

export interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  nextDueDate: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface SubCategory {
  id: string;
  name: string;
  budget?: number;
}

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault: boolean;
  budget?: number; // Monthly budget limit for this category
  subcategories?: SubCategory[];
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  totalBudget?: number;
  categoryBudgets: Record<string, number>; // categoryId -> budget amount
  subcategoryBudgets?: Record<string, number>; // subcategoryId -> budget amount
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryBudgetProgress {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'normal' | 'warning' | 'urgent' | 'exceeded'; // <80%, 80-89%, 90-99%, >=100%
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentage: number;
  warningCount: number; // >= 80%
  exceededCount: number; // >= 100%
  categoryProgresses: CategoryBudgetProgress[];
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  dataUrl?: string; // Base64 data URL for instant offline preview & viewing
  createdAt: string;
}

export interface RepaymentRecord {
  id: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentTime: string; // HH:MM
  notes?: string;
  attachments?: Attachment[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId?: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: Category;
  subcategoryId?: string;
  subcategoryName?: string;
  accountId?: string;
  paymentMethod: PaymentMethod;
  title: string;
  description?: string;
  transactionDate: string; // YYYY-MM-DD
  transactionTime: string; // HH:MM
  isRecurring?: boolean;
  recurringId?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreditDebtRecord {
  id: string;
  userId?: string;
  personId?: string;
  type: CreditDebtType; // 'credit' = others owe me, 'debt' = I owe others
  counterpartName: string;
  counterpartPhone?: string;
  counterpartEmail?: string;
  originalAmount: number;
  settledAmount: number;
  remainingAmount: number; // computed
  status: RecordStatus;
  transactionDate: string; // YYYY-MM-DD
  transactionTime: string; // HH:MM
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  attachments?: Attachment[];
  repayments?: RepaymentRecord[]; // Complete payment history
  createdAt: string;
  updatedAt: string;
}

export interface IncomeExpenseSummary {
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  availableCashBalance: number; // openingBalance + totalIncome - totalExpense
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  savingsRate: number;
  totalBudget?: number;
  remainingBudget?: number;
}

export interface KhataSummary {
  totalReceivable: number; // Total money others owe me
  totalPayable: number; // Total money I owe others
  netKhataBalance: number; // Receivable - Payable
  overdueReceivable: number;
  overduePayable: number;
  totalGivenOriginal: number;
  totalReceivedBack: number;
  totalBorrowedOriginal: number;
  totalRepaid: number;
  totalPeopleCount: number;
  peopleOweMeCount: number;
  peopleIOweCount: number;
  monthlyLent: number;
  monthlyReceivedBack: number;
  monthlyBorrowed: number;
  monthlyRepaid: number;
  overdueCount: number;
}

export interface CombinedFinancialSummary {
  openingCash: number;
  totalIncome: number;
  totalExpense: number;
  borrowedMoneyReceived: number;
  debtRepaid: number;
  creditRepaid: number;
  creditGiven: number;
  actualCashBalance: number; // Opening + Income - Expense + Borrowed - DebtRepaid + CreditRepaid - CreditGiven
  totalReceivable: number; // Money others owe me
  totalPayable: number; // Money I owe others
  netWorth: number; // ActualCash + Receivable - Payable
  monthlyCashFlow: number; // monthly Income - monthly Expense
}

export interface FinancialSummary extends IncomeExpenseSummary {
  totalBalance: number;
  totalCreditPending: number;
  totalDebtPending: number;
  overdueCreditCount: number;
  overdueDebtCount: number;
}

export interface CategorySpendSummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export type ActiveTab =
  | 'income_expense'
  | 'khata_book'
  | 'financial_overview'
  | 'accounts'
  | 'categories'
  | 'recurring'
  | 'reports'
  | 'settings'
  // Legacy aliases for backward compatibility
  | 'dashboard'
  | 'transactions'
  | 'credit-debt'
  | 'analytics';

export interface QuickAddPayload {
  mode: 'income' | 'expense' | 'credit' | 'debt';
  title: string;
  amount: number;
  categoryId?: string;
  accountId?: string;
  personId?: string;
  paymentMethod?: PaymentMethod;
  counterpartName?: string;
  counterpartPhone?: string;
  date: string;
  time: string;
  dueDate?: string;
  description?: string;
  attachments?: Attachment[];
}

export interface ReminderPreferences {
  remindOnDueDate: boolean;
  remindDaysBefore: number;
  browserNotifications: boolean;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface UserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  phone?: string | null;
  avatarUrl: string | null;
  currency: string;
  themePreference: string;
  recoveryEmail: string | null;
  recoveryEmailVerified: boolean;
  recoveryEmailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  openingBalance: number;
  defaultCurrency: string;
  appMode: AppMode;
  reminderPrefs: ReminderPreferences;
  lastSyncedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CloudBackupData {
  version: string;
  exportedAt: string;
  userId: string;
  profile?: Partial<UserProfile>;
  openingBalance: number;
  accounts: Account[];
  accountTransfers: AccountTransfer[];
  categories: Category[];
  budgets: Budget[];
  people: Person[];
  creditDebtRecords: CreditDebtRecord[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  reminderPreferences: ReminderPreferences;
}

