import {
  TransactionType,
  CreditDebtType,
  RecordStatus,
  PaymentMethod,
} from './database.types';

export * from './database.types';

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId?: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: Category;
  paymentMethod: PaymentMethod;
  title: string;
  description?: string;
  transactionDate: string; // YYYY-MM-DD
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreditDebtRecord {
  id: string;
  userId?: string;
  type: CreditDebtType; // 'credit' = others owe me, 'debt' = I owe others
  counterpartName: string;
  counterpartPhone?: string;
  counterpartEmail?: string;
  originalAmount: number;
  settledAmount: number;
  remainingAmount: number; // computed
  status: RecordStatus;
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  savingsRate: number; // percentage (0 - 100)
  totalCreditPending: number; // Money others owe me
  totalDebtPending: number;   // Money I owe others
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

export type ActiveTab = 'dashboard' | 'transactions' | 'credit-debt' | 'analytics' | 'settings';

export interface QuickAddPayload {
  mode: 'income' | 'expense' | 'credit' | 'debt';
  title: string;
  amount: number;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  counterpartName?: string;
  counterpartPhone?: string;
  date: string;
  dueDate?: string;
  description?: string;
}
