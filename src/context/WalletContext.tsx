import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppMode,
  Transaction,
  CreditDebtRecord,
  Category,
  SubCategory,
  Account,
  AccountTransfer,
  Person,
  PersonSummary,
  RecurringTransaction,
  FinancialSummary,
  IncomeExpenseSummary,
  KhataSummary,
  CombinedFinancialSummary,
  CategorySpendSummary,
  ActiveTab,
  QuickAddPayload,
  Attachment,
  ReminderPreferences,
  RepaymentRecord,
  Budget,
  BudgetSummary,
  SyncState,
  CloudBackupData,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_CREDIT_DEBT,
  INITIAL_ACCOUNTS,
  INITIAL_PEOPLE,
  INITIAL_RECURRING,
  INITIAL_BUDGETS,
} from '../data/defaultData';
import { isSupabaseConfigured } from '../lib/supabase';
import { getDueStatus } from '../lib/date';
import { storage } from '../lib/storage';
import { useAuth } from './AuthContext';
import {
  fetchUserDataFromCloud,
  syncAllDataToCloud,
  syncTransactionItem,
  syncKhataItem,
  syncPersonItem,
  syncAccountItem,
  syncTransferItem,
} from '../services/cloudSync';
import {
  calculateIncomeExpenseSummary,
  calculateKhataSummary,
  aggregatePersonSummaries,
  calculateCombinedFinancialOverview,
  calculateAccountBalances,
  calculateBudgetProgress,
} from '../lib/financialEngine';

interface WalletContextType {
  // Hydration state
  isHydrated: boolean;

  // Cloud Sync & Data Migration
  syncState: SyncState;
  lastSyncedAt: string | null;
  hasUnmigratedLocalData: boolean;
  triggerManualSync: () => Promise<{ success: boolean; error?: string }>;
  migrateLocalDataToCloud: () => Promise<{ success: boolean; migratedCount: number; error?: string }>;
  exportAllDataJson: () => string;
  exportTransactionsCsv: () => string;
  restoreFromJsonBackup: (jsonString: string) => Promise<{ success: boolean; restoredCount: number; error?: string }>;

  // Modes & Navigation
  currentMode: AppMode;
  setCurrentMode: (mode: AppMode) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Primary Data
  transactions: Transaction[];
  creditDebtRecords: CreditDebtRecord[];
  categories: Category[];
  budgets: Budget[];
  accounts: Account[];
  accountTransfers: AccountTransfer[];
  people: Person[];
  recurringTransactions: RecurringTransaction[];
  openingBalance: number;

  // Computed Summaries
  incomeExpenseSummary: IncomeExpenseSummary;
  budgetSummary: BudgetSummary;
  khataSummary: KhataSummary;
  personSummaries: PersonSummary[];
  combinedFinancialSummary: CombinedFinancialSummary;
  financialSummary: FinancialSummary;
  categorySpending: CategorySpendSummary[];

  // Modals & UI State
  isQuickAddOpen: boolean;
  quickAddInitialMode: 'income' | 'expense' | 'credit' | 'debt';
  isSupabaseMode: boolean;
  selectedRecord: (Transaction | CreditDebtRecord) | null;
  selectedRecordKind: 'transaction' | 'credit-debt';
  reminderModalRecord: CreditDebtRecord | null;
  reminderPreferences: ReminderPreferences;
  selectedPersonId: string | null;
  setSelectedPersonId: (id: string | null) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;

  // Actions
  setOpeningBalance: (val: number) => void;
  openQuickAdd: (mode?: 'income' | 'expense' | 'credit' | 'debt') => void;
  closeQuickAdd: () => void;
  openRecordDetails: (record: Transaction | CreditDebtRecord, kind: 'transaction' | 'credit-debt') => void;
  closeRecordDetails: () => void;
  openReminderModal: (record: CreditDebtRecord) => void;
  closeReminderModal: () => void;
  setReminderPreferences: React.Dispatch<React.SetStateAction<ReminderPreferences>>;

  // Budget Actions
  setCategoryBudget: (categoryId: string, amount: number, month?: string) => void;
  setOverallMonthlyBudget: (amount: number, month?: string) => void;
  deleteBudget: (categoryId: string, month?: string) => void;
  addSubcategory: (categoryId: string, name: string, budget?: number) => void;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => void;

  // Transaction Actions
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Transaction;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  updateTransactionAttachments: (id: string, attachments: Attachment[]) => void;

  // Khata Actions
  addCreditDebt: (data: Omit<CreditDebtRecord, 'id' | 'remainingAmount' | 'createdAt' | 'updatedAt'>) => CreditDebtRecord;
  updateCreditDebt: (id: string, updates: Partial<CreditDebtRecord>) => void;
  settleCreditDebt: (
    id: string,
    amount: number,
    attachments?: Attachment[],
    notes?: string,
    paymentDate?: string,
    paymentTime?: string
  ) => void;
  updateCreditDebtAttachments: (id: string, attachments: Attachment[]) => void;
  deleteCreditDebt: (id: string) => void;

  // Multi-Account Actions
  addAccount: (data: Omit<Account, 'id' | 'currentBalance' | 'createdAt'>) => Account;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  transferBetweenAccounts: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date?: string,
    time?: string,
    notes?: string
  ) => AccountTransfer;

  // Person Actions
  addPerson: (data: Omit<Person, 'id' | 'createdAt'>) => Person;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;

  // Category Actions
  addCategory: (data: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Recurring Actions
  addRecurringTransaction: (data: Omit<RecurringTransaction, 'id' | 'createdAt'>) => RecurringTransaction;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  processDueRecurringTransactions: () => number;

  // Unified Quick Add
  quickAdd: (payload: QuickAddPayload) => void;

  // System
  resetToDefaults: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
  APP_MODE: 'my_wallet_app_mode_v3',
  OPENING_BALANCE: 'my_wallet_opening_balance_v3',
  TRANSACTIONS: 'my_wallet_transactions_v3',
  CREDIT_DEBT: 'my_wallet_credit_debt_v3',
  CATEGORIES: 'my_wallet_categories_v3',
  BUDGETS: 'my_wallet_budgets_v3',
  ACCOUNTS: 'my_wallet_accounts_v3',
  TRANSFERS: 'my_wallet_transfers_v3',
  PEOPLE: 'my_wallet_people_v3',
  RECURRING: 'my_wallet_recurring_v3',
  REMINDER_PREFS: 'my_wallet_reminder_prefs_v3',
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);

  // App Mode State
  const [currentMode, setCurrentModeState] = useState<AppMode>('income_expense');
  const [activeTab, setActiveTabState] = useState<ActiveTab>('income_expense');

  // Opening Balance
  const [openingBalance, setOpeningBalanceState] = useState<number>(0);

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);

  // Account Transfers
  const [accountTransfers, setAccountTransfers] = useState<AccountTransfer[]>([]);

  // People
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);

  // Recurring
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(INITIAL_RECURRING);

  // Categories
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  // Budgets
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);

  // Selection states for dedicated modals / pages
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Credit & Debt
  const [creditDebtRecords, setCreditDebtRecords] = useState<CreditDebtRecord[]>(INITIAL_CREDIT_DEBT);

  // UI Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddInitialMode, setQuickAddInitialMode] = useState<'income' | 'expense' | 'credit' | 'debt'>('expense');
  const [selectedRecord, setSelectedRecord] = useState<(Transaction | CreditDebtRecord) | null>(null);
  const [selectedRecordKind, setSelectedRecordKind] = useState<'transaction' | 'credit-debt'>('transaction');
  const [reminderModalRecord, setReminderModalRecord] = useState<CreditDebtRecord | null>(null);
  const [reminderPreferences, setReminderPreferences] = useState<ReminderPreferences>({
    remindOnDueDate: true,
    remindDaysBefore: 1,
    browserNotifications: false,
  });

  // Auth & Cloud Sync Integration
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [hasUnmigratedLocalData, setHasUnmigratedLocalData] = useState<boolean>(false);

  const isSupabaseMode = isSupabaseConfigured();

  // Mode Setter
  const setCurrentMode = useCallback((mode: AppMode) => {
    setCurrentModeState(mode);
    setActiveTabState(mode);
    storage.setItem(STORAGE_KEYS.APP_MODE, mode);
  }, []);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    // Sync mode if tab is one of the three main modes
    if (tab === 'income_expense' || tab === 'khata_book' || tab === 'financial_overview') {
      setCurrentModeState(tab);
      storage.setItem(STORAGE_KEYS.APP_MODE, tab);
    } else if (tab === 'dashboard') {
      setCurrentModeState('financial_overview');
    } else if (tab === 'transactions') {
      setCurrentModeState('income_expense');
    } else if (tab === 'credit-debt') {
      setCurrentModeState('khata_book');
    }
  }, []);

  const setOpeningBalance = useCallback((val: number) => {
    setOpeningBalanceState(val);
    storage.setItem(STORAGE_KEYS.OPENING_BALANCE, val.toString());
  }, []);

  // Hydrate Data from Universal Storage on Mount
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      try {
        const keys = Object.values(STORAGE_KEYS);
        const pairs = await storage.multiGet(keys);
        const dataMap: Record<string, string | null> = {};
        pairs.forEach(([k, v]) => {
          dataMap[k] = v;
        });

        if (!isMounted) return;

        // 1. App Mode
        const mode = dataMap[STORAGE_KEYS.APP_MODE];
        if (mode === 'income_expense' || mode === 'khata_book' || mode === 'financial_overview') {
          setCurrentModeState(mode as AppMode);
          setActiveTabState(mode as ActiveTab);
        }

        // 2. Opening Balance
        const ob = dataMap[STORAGE_KEYS.OPENING_BALANCE];
        if (ob !== null && ob !== undefined) {
          const val = parseFloat(ob);
          if (!isNaN(val) && val !== 25000) {
            setOpeningBalanceState(val);
          }
        }

        // 3. Accounts
        const accStr = dataMap[STORAGE_KEYS.ACCOUNTS];
        if (accStr) {
          try {
            const parsed = JSON.parse(accStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const hasOld = parsed.some((a: any) => ['acc-1', 'acc-2', 'acc-3', 'acc-4'].includes(a.id));
              if (!hasOld) setAccounts(parsed);
            }
          } catch (_) {}
        }

        // 4. Account Transfers
        const trStr = dataMap[STORAGE_KEYS.TRANSFERS];
        if (trStr) {
          try {
            const parsed = JSON.parse(trStr);
            if (Array.isArray(parsed)) setAccountTransfers(parsed);
          } catch (_) {}
        }

        // 5. People
        const pStr = dataMap[STORAGE_KEYS.PEOPLE];
        if (pStr) {
          try {
            const parsed = JSON.parse(pStr);
            if (Array.isArray(parsed)) {
              setPeople(parsed.filter((p: any) => !['p-1', 'p-2', 'p-3', 'p-4'].includes(p.id)));
            }
          } catch (_) {}
        }

        // 6. Recurring Transactions
        const rStr = dataMap[STORAGE_KEYS.RECURRING];
        if (rStr) {
          try {
            const parsed = JSON.parse(rStr);
            if (Array.isArray(parsed)) {
              setRecurringTransactions(parsed.filter((r: any) => !['rec-1', 'rec-2', 'rec-3'].includes(r.id)));
            }
          } catch (_) {}
        }

        // 7. Categories
        const catStr = dataMap[STORAGE_KEYS.CATEGORIES];
        if (catStr) {
          try {
            const parsed = JSON.parse(catStr);
            if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
          } catch (_) {}
        }

        // 8. Budgets
        const bStr = dataMap[STORAGE_KEYS.BUDGETS];
        if (bStr) {
          try {
            const parsed = JSON.parse(bStr);
            if (Array.isArray(parsed) && parsed.length > 0) setBudgets(parsed);
          } catch (_) {}
        }

        // 9. Transactions
        const txStr = dataMap[STORAGE_KEYS.TRANSACTIONS];
        if (txStr) {
          try {
            const parsed = JSON.parse(txStr);
            if (Array.isArray(parsed)) {
              setTransactions(
                parsed.filter(
                  (t: any) =>
                    !['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5', 'tx-6', 'tx-7', 'tx-8'].includes(t.id)
                )
              );
            }
          } catch (_) {}
        }

        // 10. Credit Debt Records
        const cdStr = dataMap[STORAGE_KEYS.CREDIT_DEBT];
        if (cdStr) {
          try {
            const parsed: CreditDebtRecord[] = JSON.parse(cdStr);
            if (Array.isArray(parsed)) {
              setCreditDebtRecords(
                parsed
                  .filter((item) => !['cd-1', 'cd-2', 'cd-3', 'cd-4'].includes(item.id))
                  .map((item) => {
                    const dueStatus = getDueStatus(item.dueDate);
                    const remaining = Math.max(0, item.originalAmount - (item.settledAmount || 0));
                    let status = item.status;
                    if (remaining <= 0) {
                      status = 'settled';
                    } else if (dueStatus.isOverdue) {
                      status = 'overdue';
                    } else if (item.settledAmount > 0) {
                      status = 'partial';
                    } else {
                      status = 'pending';
                    }
                    return {
                      ...item,
                      remainingAmount: remaining,
                      status,
                    };
                  })
              );
            }
          } catch (_) {}
        }

        // 11. Reminder Preferences
        const rpStr = dataMap[STORAGE_KEYS.REMINDER_PREFS];
        if (rpStr) {
          try {
            const parsed = JSON.parse(rpStr);
            if (parsed && typeof parsed === 'object') setReminderPreferences(parsed);
          } catch (_) {}
        }

        // Clean legacy v1/v2 keys
        await storage.multiRemove([
          'my_wallet_transactions_v2',
          'my_wallet_credit_debt_v2',
          'my_wallet_people_v2',
          'my_wallet_recurring_v2',
          'my_wallet_accounts_v2',
          'my_wallet_opening_balance_v2',
          'my_wallet_transactions_v1',
          'my_wallet_credit_debt_v1',
          'my_wallet_people_v1',
        ]);
      } catch (err) {
        console.warn('Hydration error:', err);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cloud Sync on User Auth Change
  useEffect(() => {
    const currentUserId = user?.id;
    if (!isHydrated || !currentUserId) return;
    let active = true;

    async function syncOnLogin() {
      if (!currentUserId) return;
      setSyncState('syncing');
      try {
        const cloudData = await fetchUserDataFromCloud(currentUserId);
        if (!active) return;

        if (cloudData && cloudData.hasData) {
          setOpeningBalanceState(cloudData.openingBalance);
          setAccounts(cloudData.accounts);
          setAccountTransfers(cloudData.accountTransfers);
          if (cloudData.categories.length > 0) setCategories(cloudData.categories);
          if (cloudData.budgets.length > 0) setBudgets(cloudData.budgets);
          setPeople(cloudData.people);
          setCreditDebtRecords(cloudData.creditDebtRecords);
          setTransactions(cloudData.transactions);
          setReminderPreferences(cloudData.reminderPreferences);
          setSyncState('synced');
          setLastSyncedAt(new Date().toLocaleTimeString());
          setHasUnmigratedLocalData(false);
        } else {
          const localCount = transactions.length + creditDebtRecords.length;
          if (localCount > 0) {
            setHasUnmigratedLocalData(true);
            const syncRes = await syncAllDataToCloud(currentUserId, {
              openingBalance,
              accounts,
              accountTransfers,
              categories,
              budgets,
              people,
              creditDebtRecords,
              transactions,
              recurringTransactions,
              reminderPreferences,
            });
            if (syncRes.success) {
              setSyncState('synced');
              setLastSyncedAt(new Date().toLocaleTimeString());
              setHasUnmigratedLocalData(false);
            } else {
              setSyncState('error');
            }
          } else {
            setSyncState('synced');
            setLastSyncedAt(new Date().toLocaleTimeString());
            setHasUnmigratedLocalData(false);
          }
        }
      } catch (err) {
        console.warn('Sync on login failed:', err);
        setSyncState('error');
      }
    }

    syncOnLogin();

    return () => {
      active = false;
    };
  }, [user, isHydrated]);

  // Persist State to Storage (Only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.CREDIT_DEBT, JSON.stringify(creditDebtRecords));
  }, [creditDebtRecords, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }, [budgets, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }, [accounts, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(accountTransfers));
  }, [accountTransfers, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(people));
  }, [people, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(recurringTransactions));
  }, [recurringTransactions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.setItem(STORAGE_KEYS.REMINDER_PREFS, JSON.stringify(reminderPreferences));
  }, [reminderPreferences, isHydrated]);

  // Budget Summary
  const budgetSummary = useMemo<BudgetSummary>(() => {
    return calculateBudgetProgress(categories, transactions, budgets);
  }, [categories, transactions, budgets]);

  // Financial Calculations via Financial Engine
  const incomeExpenseSummary = useMemo<IncomeExpenseSummary>(() => {
    const base = calculateIncomeExpenseSummary(transactions, openingBalance);
    return {
      ...base,
      totalBudget: budgetSummary.totalBudget,
      remainingBudget: budgetSummary.remainingBudget,
    };
  }, [transactions, openingBalance, budgetSummary]);

  const khataSummary = useMemo<KhataSummary>(() => {
    return calculateKhataSummary(creditDebtRecords);
  }, [creditDebtRecords]);

  const personSummaries = useMemo<PersonSummary[]>(() => {
    return aggregatePersonSummaries(creditDebtRecords, people);
  }, [creditDebtRecords, people]);

  const combinedFinancialSummary = useMemo<CombinedFinancialSummary>(() => {
    return calculateCombinedFinancialOverview(transactions, creditDebtRecords, openingBalance);
  }, [transactions, creditDebtRecords, openingBalance]);

  // Backward compatibility object
  const financialSummary = useMemo<FinancialSummary>(() => {
    return {
      ...incomeExpenseSummary,
      totalBalance: combinedFinancialSummary.actualCashBalance,
      totalCreditPending: khataSummary.totalReceivable,
      totalDebtPending: khataSummary.totalPayable,
      overdueCreditCount: creditDebtRecords.filter((r) => r.type === 'credit' && r.status === 'overdue').length,
      overdueDebtCount: creditDebtRecords.filter((r) => r.type === 'debt' && r.status === 'overdue').length,
    };
  }, [incomeExpenseSummary, combinedFinancialSummary, khataSummary, creditDebtRecords]);

  // Dynamic Account Balances
  const computedAccounts = useMemo<Account[]>(() => {
    return calculateAccountBalances(accounts, transactions, accountTransfers);
  }, [accounts, transactions, accountTransfers]);

  // Category Spending Breakdown
  const categorySpending = useMemo<CategorySpendSummary[]>(() => {
    const expenses = transactions.filter((tx) => tx.type === 'expense');
    const totalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0);

    const map = new Map<string, { totalAmount: number; count: number }>();

    expenses.forEach((tx) => {
      const prev = map.get(tx.categoryId) || { totalAmount: 0, count: 0 };
      map.set(tx.categoryId, {
        totalAmount: prev.totalAmount + tx.amount,
        count: prev.count + 1,
      });
    });

    const summaries: CategorySpendSummary[] = [];

    map.forEach((value, catId) => {
      const cat = categories.find((c) => c.id === catId);
      summaries.push({
        categoryId: catId,
        categoryName: cat?.name || 'Uncategorized',
        categoryIcon: cat?.icon || 'Tag',
        categoryColor: cat?.color || '#94a3b8',
        totalAmount: value.totalAmount,
        percentage: totalExpense > 0 ? Math.round((value.totalAmount / totalExpense) * 100) : 0,
        transactionCount: value.count,
      });
    });

    return summaries.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions, categories]);

  // Actions
  const openQuickAdd = useCallback((mode: 'income' | 'expense' | 'credit' | 'debt' = 'expense') => {
    setQuickAddInitialMode(mode);
    setIsQuickAddOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setIsQuickAddOpen(false);
  }, []);

  const openRecordDetails = useCallback((record: Transaction | CreditDebtRecord, kind: 'transaction' | 'credit-debt') => {
    setSelectedRecord(record);
    setSelectedRecordKind(kind);
  }, []);

  const closeRecordDetails = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  const openReminderModal = useCallback((record: CreditDebtRecord) => {
    setReminderModalRecord(record);
  }, []);

  const closeReminderModal = useCallback(() => {
    setReminderModalRecord(null);
  }, []);

  // Transactions Actions
  const addTransaction = useCallback((data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newTx: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      transactionDate: data.transactionDate || now.toISOString().split('T')[0],
      transactionTime: data.transactionTime || defaultTime,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    if (user) {
      syncTransactionItem(user.id, newTx, 'upsert');
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    return newTx;
  }, [user]);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates, updatedAt: new Date().toISOString() } : tx))
    );
    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, ...updates } as Transaction) : prev));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    if (user) {
      syncTransactionItem(user.id, { id } as any, 'delete');
    }
  }, [user]);

  const updateTransactionAttachments = useCallback((id: string, newAttachments: Attachment[]) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, attachments: newAttachments, updatedAt: new Date().toISOString() } : tx))
    );
    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, attachments: newAttachments } as Transaction) : prev));
  }, []);

  // Credit & Debt Actions
  const addCreditDebt = useCallback((data: Omit<CreditDebtRecord, 'id' | 'remainingAmount' | 'createdAt' | 'updatedAt'>) => {
    const dueStatus = getDueStatus(data.dueDate);
    const settled = data.settledAmount || 0;
    const remaining = Math.max(0, data.originalAmount - settled);
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let status = data.status;
    if (remaining <= 0) {
      status = 'settled';
    } else if (dueStatus.isOverdue) {
      status = 'overdue';
    } else if (settled > 0) {
      status = 'partial';
    } else {
      status = 'pending';
    }

    const counterpart = data.counterpartName ? data.counterpartName.trim() : '';
    let resolvedPersonId = data.personId;
    if (counterpart && !resolvedPersonId) {
      const existing = people.find((p) => p.name.trim().toLowerCase() === counterpart.toLowerCase());
      if (existing) {
        resolvedPersonId = existing.id;
      }
    }

    const newRecord: CreditDebtRecord = {
      ...data,
      counterpartName: counterpart || data.counterpartName,
      personId: resolvedPersonId,
      transactionDate: data.transactionDate || now.toISOString().split('T')[0],
      transactionTime: data.transactionTime || defaultTime,
      repayments: data.repayments || [],
      id: `cd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      settledAmount: settled,
      remainingAmount: remaining,
      status,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setCreditDebtRecords((prev) => [newRecord, ...prev]);
    if (user) {
      syncKhataItem(user.id, newRecord, 'upsert');
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    // Also auto-ensure person is tracked in people list
    if (data.counterpartName) {
      setPeople((prev) => {
        const cleanName = data.counterpartName.trim().toLowerCase();
        const exists = prev.some((p) => p.name.trim().toLowerCase() === cleanName);
        if (!exists) {
          const newP: Person = {
            id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: data.counterpartName.trim(),
            phone: data.counterpartPhone,
            email: data.counterpartEmail,
            createdAt: now.toISOString(),
          };
          if (user) {
            syncPersonItem(user.id, newP, 'upsert');
          }
          return [...prev, newP];
        }
        return prev;
      });
    }

    return newRecord;
  }, [user, people]);

  const updateCreditDebt = useCallback((id: string, updates: Partial<CreditDebtRecord>) => {
    setCreditDebtRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        const updated = { ...rec, ...updates, updatedAt: new Date().toISOString() };
        const settled = updated.settledAmount || 0;
        const remaining = Math.max(0, updated.originalAmount - settled);
        const dueStatus = getDueStatus(updated.dueDate);
        let status = updated.status;
        if (remaining <= 0) status = 'settled';
        else if (dueStatus.isOverdue) status = 'overdue';
        else if (settled > 0) status = 'partial';
        else status = 'pending';
        return { ...updated, remainingAmount: remaining, status };
      })
    );
    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, ...updates } as CreditDebtRecord) : prev));
  }, []);

  const settleCreditDebt = useCallback((
    id: string,
    amount: number,
    settlementAttachments?: Attachment[],
    notes?: string,
    paymentDate?: string,
    paymentTime?: string
  ) => {
    const now = new Date();
    const resolvedDate = paymentDate || now.toISOString().split('T')[0];
    const resolvedTime = paymentTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRepayment: RepaymentRecord = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      amount,
      paymentDate: resolvedDate,
      paymentTime: resolvedTime,
      notes,
      attachments: settlementAttachments,
      createdAt: now.toISOString(),
    };

    setCreditDebtRecords((prev) =>
      prev.map((record) => {
        if (record.id !== id) return record;

        const newSettled = Math.min(record.originalAmount, record.settledAmount + amount);
        const remaining = Math.max(0, record.originalAmount - newSettled);
        const dueStatus = getDueStatus(record.dueDate);

        let status = record.status;
        if (remaining <= 0) {
          status = 'settled';
        } else if (dueStatus.isOverdue) {
          status = 'overdue';
        } else {
          status = 'partial';
        }

        const existingRepayments = record.repayments || [];

        return {
          ...record,
          settledAmount: newSettled,
          remainingAmount: remaining,
          status,
          repayments: [newRepayment, ...existingRepayments],
          updatedAt: now.toISOString(),
        };
      })
    );
  }, []);

  const updateCreditDebtAttachments = useCallback((id: string, newAttachments: Attachment[]) => {
    setCreditDebtRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, attachments: newAttachments, updatedAt: new Date().toISOString() } : rec))
    );
    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, attachments: newAttachments } as CreditDebtRecord) : prev));
  }, []);

  const deleteCreditDebt = useCallback((id: string) => {
    setCreditDebtRecords((prev) => prev.filter((rec) => rec.id !== id));
    if (user) {
      syncKhataItem(user.id, { id } as any, 'delete');
    }
  }, [user]);

  // Multi-Account Actions
  const addAccount = useCallback((data: Omit<Account, 'id' | 'currentBalance' | 'createdAt'>) => {
    const newAcc: Account = {
      ...data,
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      currentBalance: data.openingBalance || 0,
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAcc]);
    if (user) {
      syncAccountItem(user.id, newAcc, 'upsert');
    }
    return newAcc;
  }, [user]);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (user) {
      syncAccountItem(user.id, { id } as any, 'delete');
    }
  }, [user]);

  const transferBetweenAccounts = useCallback((
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date?: string,
    time?: string,
    notes?: string
  ) => {
    const now = new Date();
    const newTransfer: AccountTransfer = {
      id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      fromAccountId,
      toAccountId,
      amount,
      date: date || now.toISOString().split('T')[0],
      time: time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      notes,
      createdAt: now.toISOString(),
    };

    setAccountTransfers((prev) => [newTransfer, ...prev]);
    if (user) {
      syncTransferItem(user.id, newTransfer);
    }
    return newTransfer;
  }, [user]);

  // Person Actions
  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    if (user) {
      syncPersonItem(user.id, { id, ...updates } as any, 'upsert');
    }
  }, [user]);

  const addPerson = useCallback((data: Omit<Person, 'id' | 'createdAt'>) => {
    const cleanName = data.name.trim();
    const existing = people.find((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (data.phone && !existing.phone) {
        updatePerson(existing.id, { phone: data.phone });
      }
      return existing;
    }

    const newPerson: Person = {
      ...data,
      name: cleanName,
      id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setPeople((prev) => [...prev, newPerson]);
    if (user) {
      syncPersonItem(user.id, newPerson, 'upsert');
    }
    return newPerson;
  }, [people, user, updatePerson]);

  const deletePerson = useCallback((id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    if (user) {
      syncPersonItem(user.id, { id } as any, 'delete');
    }
  }, [user]);

  // Category Actions
  const addCategory = useCallback((data: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...data,
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setCategories((prev) => [...prev, newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Budget Actions
  const setCategoryBudget = useCallback((categoryId: string, amount: number, monthStr?: string) => {
    const month = monthStr || new Date().toISOString().slice(0, 7);
    setBudgets((prev) => {
      const existing = prev.find((b) => b.month === month);
      if (existing) {
        return prev.map((b) =>
          b.month === month
            ? {
                ...b,
                categoryBudgets: { ...b.categoryBudgets, [categoryId]: amount },
                updatedAt: new Date().toISOString(),
              }
            : b
        );
      }
      return [
        ...prev,
        {
          id: `budget-${month}`,
          month,
          categoryBudgets: { [categoryId]: amount },
          createdAt: new Date().toISOString(),
        },
      ];
    });

    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, budget: amount } : c))
    );
  }, []);

  const setOverallMonthlyBudget = useCallback((amount: number, monthStr?: string) => {
    const month = monthStr || new Date().toISOString().slice(0, 7);
    setBudgets((prev) => {
      const existing = prev.find((b) => b.month === month);
      if (existing) {
        return prev.map((b) =>
          b.month === month
            ? { ...b, totalBudget: amount, updatedAt: new Date().toISOString() }
            : b
        );
      }
      return [
        ...prev,
        {
          id: `budget-${month}`,
          month,
          totalBudget: amount,
          categoryBudgets: {},
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const deleteBudget = useCallback((categoryId: string, monthStr?: string) => {
    const month = monthStr || new Date().toISOString().slice(0, 7);
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.month !== month) return b;
        const copy = { ...b.categoryBudgets };
        delete copy[categoryId];
        return { ...b, categoryBudgets: copy };
      })
    );
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, budget: undefined } : c))
    );
  }, []);

  const addSubcategory = useCallback((categoryId: string, name: string, budget?: number) => {
    const newSub: SubCategory = {
      id: `sub-${Date.now()}`,
      name: name.trim(),
      budget,
    };
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        const subs = c.subcategories || [];
        return { ...c, subcategories: [...subs, newSub] };
      })
    );
  }, []);

  const deleteSubcategory = useCallback((categoryId: string, subcategoryId: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        return {
          ...c,
          subcategories: (c.subcategories || []).filter((s) => s.id !== subcategoryId),
        };
      })
    );
  }, []);

  // Recurring Actions
  const addRecurringTransaction = useCallback((data: Omit<RecurringTransaction, 'id' | 'createdAt'>) => {
    const newRec: RecurringTransaction = {
      ...data,
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setRecurringTransactions((prev) => [...prev, newRec]);
    return newRec;
  }, []);

  const updateRecurringTransaction = useCallback((id: string, updates: Partial<RecurringTransaction>) => {
    setRecurringTransactions((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const deleteRecurringTransaction = useCallback((id: string) => {
    setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const processDueRecurringTransactions = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let createdCount = 0;

    recurringTransactions.forEach((rec) => {
      if (!rec.isActive) return;
      if (rec.nextDueDate <= todayStr) {
        // Create actual transaction
        addTransaction({
          title: rec.title,
          amount: rec.amount,
          type: rec.type,
          categoryId: rec.categoryId,
          accountId: rec.accountId,
          paymentMethod: 'bank_transfer',
          transactionDate: rec.nextDueDate,
          transactionTime: '09:00',
          isRecurring: true,
          recurringId: rec.id,
          description: rec.notes || `Recurring ${rec.interval} transaction`,
        });

        // Compute next due date
        const d = new Date(rec.nextDueDate);
        if (rec.interval === 'daily') d.setDate(d.getDate() + 1);
        else if (rec.interval === 'weekly') d.setDate(d.getDate() + 7);
        else if (rec.interval === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (rec.interval === 'yearly') d.setFullYear(d.getFullYear() + 1);

        updateRecurringTransaction(rec.id, {
          nextDueDate: d.toISOString().split('T')[0],
        });

        createdCount++;
      }
    });

    return createdCount;
  }, [recurringTransactions, addTransaction, updateRecurringTransaction]);

  // Unified Quick Add
  const quickAdd = useCallback((payload: QuickAddPayload) => {
    if (payload.mode === 'income' || payload.mode === 'expense') {
      addTransaction({
        title: payload.title,
        amount: payload.amount,
        type: payload.mode,
        categoryId: payload.categoryId || (payload.mode === 'income' ? 'cat-inc-1' : 'cat-exp-1'),
        accountId: payload.accountId,
        paymentMethod: payload.paymentMethod || 'upi',
        transactionDate: payload.date,
        transactionTime: payload.time,
        description: payload.description,
        attachments: payload.attachments,
      });
    } else if (payload.mode === 'credit' || payload.mode === 'debt') {
      const createdRecord = addCreditDebt({
        type: payload.mode,
        counterpartName: payload.counterpartName || payload.title,
        counterpartPhone: payload.counterpartPhone,
        personId: payload.personId,
        originalAmount: payload.amount,
        settledAmount: 0,
        status: 'pending',
        transactionDate: payload.date,
        transactionTime: payload.time,
        dueDate: payload.dueDate,
        notes: payload.description,
        attachments: payload.attachments,
        repayments: [],
      });

      // Automatically open reminder modal so user can immediately send WhatsApp/SMS
      setTimeout(() => {
        openReminderModal(createdRecord);
      }, 250);
    }
  }, [addTransaction, addCreditDebt, openReminderModal]);

  // Reset / Clear Data
  const resetToDefaults = useCallback(async () => {
    try {
      await storage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (_) {}

    setTransactions([]);
    setCreditDebtRecords([]);
    setCategories(INITIAL_CATEGORIES);
    setBudgets(INITIAL_BUDGETS);
    setAccounts(INITIAL_ACCOUNTS);
    setAccountTransfers([]);
    setPeople([]);
    setRecurringTransactions([]);
    setOpeningBalance(0);
    setCurrentMode('income_expense');
  }, [setOpeningBalance, setCurrentMode]);

  // Cloud Manual Sync
  const triggerManualSync = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'Sign in with your email to sync data to the cloud.' };
    }
    setSyncState('syncing');
    try {
      const res = await syncAllDataToCloud(user.id, {
        openingBalance,
        accounts,
        accountTransfers,
        categories,
        budgets,
        people,
        creditDebtRecords,
        transactions,
        recurringTransactions,
        reminderPreferences,
      });

      if (res.success) {
        setSyncState('synced');
        setLastSyncedAt(new Date().toLocaleTimeString());
        setHasUnmigratedLocalData(false);
        return { success: true };
      } else {
        setSyncState('error');
        return { success: false, error: res.error || 'Cloud sync failed.' };
      }
    } catch (err: any) {
      setSyncState('error');
      return { success: false, error: err.message || 'Sync failed.' };
    }
  }, [
    user,
    openingBalance,
    accounts,
    accountTransfers,
    categories,
    budgets,
    people,
    creditDebtRecords,
    transactions,
    recurringTransactions,
    reminderPreferences,
  ]);

  // Migrate local data into cloud account
  const migrateLocalDataToCloud = useCallback(async () => {
    if (!user) {
      return { success: false, migratedCount: 0, error: 'Sign in to migrate data.' };
    }
    setSyncState('syncing');
    const res = await syncAllDataToCloud(user.id, {
      openingBalance,
      accounts,
      accountTransfers,
      categories,
      budgets,
      people,
      creditDebtRecords,
      transactions,
      recurringTransactions,
      reminderPreferences,
    });
    if (res.success) {
      setSyncState('synced');
      setLastSyncedAt(new Date().toLocaleTimeString());
      setHasUnmigratedLocalData(false);
      return { success: true, migratedCount: res.syncedItemsCount };
    }
    setSyncState('error');
    return { success: false, migratedCount: 0, error: res.error };
  }, [
    user,
    openingBalance,
    accounts,
    accountTransfers,
    categories,
    budgets,
    people,
    creditDebtRecords,
    transactions,
    recurringTransactions,
    reminderPreferences,
  ]);

  // Export full backup as JSON
  const exportAllDataJson = useCallback(() => {
    const backup: CloudBackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId: user?.id || 'local-vault',
      openingBalance,
      accounts,
      accountTransfers,
      categories,
      budgets,
      people,
      creditDebtRecords,
      transactions,
      recurringTransactions,
      reminderPreferences,
    };
    return JSON.stringify(backup, null, 2);
  }, [
    user,
    openingBalance,
    accounts,
    accountTransfers,
    categories,
    budgets,
    people,
    creditDebtRecords,
    transactions,
    recurringTransactions,
    reminderPreferences,
  ]);

  // Export transactions as CSV
  const exportTransactionsCsv = useCallback(() => {
    const headers = 'ID,Date,Time,Type,Title,Amount,Category,PaymentMethod,Description\n';
    const rows = transactions
      .map((t) => {
        const cat = categories.find((c) => c.id === t.categoryId)?.name || t.categoryId;
        const cleanTitle = (t.title || '').replace(/"/g, '""');
        const cleanDesc = (t.description || '').replace(/"/g, '""');
        return `"${t.id}","${t.transactionDate}","${t.transactionTime}","${t.type}","${cleanTitle}",${t.amount},"${cat}","${t.paymentMethod}","${cleanDesc}"`;
      })
      .join('\n');
    return headers + rows;
  }, [transactions, categories]);

  // Restore from JSON backup file
  const restoreFromJsonBackup = useCallback(
    async (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object') {
          return { success: false, restoredCount: 0, error: 'Invalid backup file format.' };
        }

        let count = 0;
        if (Array.isArray(parsed.transactions)) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newOnes = parsed.transactions.filter((t: any) => !existingIds.has(t.id));
            count += newOnes.length;
            return [...newOnes, ...prev];
          });
        }

        if (Array.isArray(parsed.creditDebtRecords)) {
          setCreditDebtRecords((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newOnes = parsed.creditDebtRecords.filter((r: any) => !existingIds.has(r.id));
            count += newOnes.length;
            return [...newOnes, ...prev];
          });
        }

        if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
          setAccounts(parsed.accounts);
        }

        if (Array.isArray(parsed.people) && parsed.people.length > 0) {
          setPeople(parsed.people);
        }

        if (typeof parsed.openingBalance === 'number') {
          setOpeningBalanceState(parsed.openingBalance);
        }

        if (user) {
          triggerManualSync().catch(console.warn);
        }

        return { success: true, restoredCount: count };
      } catch (err: any) {
        return { success: false, restoredCount: 0, error: err.message || 'Failed to parse JSON backup.' };
      }
    },
    [user, triggerManualSync]
  );

  return (
    <WalletContext.Provider
      value={{
        isHydrated,
        syncState,
        lastSyncedAt,
        hasUnmigratedLocalData,
        triggerManualSync,
        migrateLocalDataToCloud,
        exportAllDataJson,
        exportTransactionsCsv,
        restoreFromJsonBackup,
        currentMode,
        setCurrentMode,
        activeTab,
        setActiveTab,
        transactions,
        creditDebtRecords,
        categories,
        budgets,
        accounts: computedAccounts,
        accountTransfers,
        people,
        recurringTransactions,
        openingBalance,
        incomeExpenseSummary,
        budgetSummary,
        khataSummary,
        personSummaries,
        combinedFinancialSummary,
        financialSummary,
        categorySpending,
        isQuickAddOpen,
        quickAddInitialMode,
        isSupabaseMode,
        selectedRecord,
        selectedRecordKind,
        reminderModalRecord,
        reminderPreferences,
        selectedPersonId,
        setSelectedPersonId,
        selectedCategoryId,
        setSelectedCategoryId,
        selectedAccountId,
        setSelectedAccountId,
        setOpeningBalance,
        openQuickAdd,
        closeQuickAdd,
        openRecordDetails,
        closeRecordDetails,
        openReminderModal,
        closeReminderModal,
        setReminderPreferences,
        setCategoryBudget,
        setOverallMonthlyBudget,
        deleteBudget,
        addSubcategory,
        deleteSubcategory,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        updateTransactionAttachments,
        addCreditDebt,
        updateCreditDebt,
        settleCreditDebt,
        updateCreditDebtAttachments,
        deleteCreditDebt,
        addAccount,
        updateAccount,
        deleteAccount,
        transferBetweenAccounts,
        addPerson,
        updatePerson,
        deletePerson,
        addCategory,
        updateCategory,
        deleteCategory,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        processDueRecurringTransactions,
        quickAdd,
        resetToDefaults,
      }}
    >
      {children}
    </WalletContext.Provider>
  );

};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
