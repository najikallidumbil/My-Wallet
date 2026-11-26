import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  MessageRecord,
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
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
import { getDueStatus } from '../lib/date';
import { storage } from '../lib/storage';
import { useAuth } from './AuthContext';
import {
  fetchUserDataFromCloud,
  syncAllDataToCloud,
  CloudPayload,
  cloudSavePerson,
  cloudDeletePerson,
  cloudSaveKhataRecord,
  cloudDeleteKhataRecord,
  cloudSaveTransaction,
  cloudDeleteTransaction,
  cloudSaveAccount,
  cloudDeleteAccount,
  cloudSaveCategory,
  cloudDeleteCategory,
  cloudSaveSubcategory,
  cloudDeleteSubcategory,
  cloudSaveTransfer,
  cloudSaveBudget,
  cloudSaveUserSettings,
  cloudSaveMessage,
  cloudDeleteMessage,
  logDbOperation,
} from '../services/cloudSync';
import {
  processSyncQueue,
  subscribeToSyncQueue,
  clearSyncQueue,
} from '../services/offlineSyncQueue';
import {
  createWalletBackup,
  getBackupHistory,
  getLastBackupTimestamp,
  checkAndTriggerAutoBackup,
  WalletBackupEntry,
} from '../services/backupService';
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
  pendingSyncCount: number;
  hasUnmigratedLocalData: boolean;
  triggerManualSync: () => Promise<{ success: boolean; error?: string }>;
  migrateLocalDataToCloud: () => Promise<{ success: boolean; migratedCount: number; error?: string }>;
  exportAllDataJson: () => string;
  exportTransactionsCsv: () => string;
  restoreFromJsonBackup: (jsonString: string) => Promise<{ success: boolean; restoredCount: number; error?: string }>;

  // Backups & Snapshots
  triggerBackupNow: () => Promise<{ success: boolean; backup?: WalletBackupEntry; error?: string }>;
  backupHistory: WalletBackupEntry[];
  lastBackupTime: string | null;
  refreshBackupHistory: () => Promise<void>;
  restoreFromBackupEntry: (backup: WalletBackupEntry) => Promise<{ success: boolean; restoredCount: number; error?: string }>;

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
  selectedBudgetMonth: string;
  setSelectedBudgetMonth: (month: string) => void;
  getBudgetForMonth: (month: string) => BudgetSummary;
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

  // Transaction Actions
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction | undefined>;
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateTransactionAttachments: (id: string, attachments: Attachment[]) => Promise<void>;

  // Khata Actions
  addCreditDebt: (data: Omit<CreditDebtRecord, 'id' | 'remainingAmount' | 'createdAt' | 'updatedAt'>) => Promise<CreditDebtRecord>;
  updateCreditDebt: (id: string, updates: Partial<CreditDebtRecord>) => Promise<CreditDebtRecord | undefined>;
  settleCreditDebt: (
    id: string,
    amount: number,
    attachments?: Attachment[],
    notes?: string,
    paymentDate?: string,
    paymentTime?: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateCreditDebtAttachments: (id: string, attachments: Attachment[]) => Promise<void>;
  deleteCreditDebt: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Multi-Account Actions
  addAccount: (data: Omit<Account, 'id' | 'currentBalance' | 'createdAt'>) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
  transferBetweenAccounts: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date?: string,
    time?: string,
    notes?: string
  ) => Promise<AccountTransfer>;

  // Person Actions
  addPerson: (data: Omit<Person, 'id' | 'createdAt'>) => Promise<Person>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<{ success: boolean; error?: string }>;
  archivePerson: (id: string) => Promise<void>;
  unarchivePerson: (id: string) => Promise<void>;

  // Smart Messaging & Reminders
  messageHistory: MessageRecord[];
  logMessage: (record: Omit<MessageRecord, 'id' | 'createdAt'>) => Promise<MessageRecord>;
  deleteMessageRecord: (id: string) => void;
  clearMessageHistory: () => void;

  // Category & Subcategory Actions
  addCategory: (data: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: string, reassignCategoryId?: string) => Promise<void>;
  addSubcategory: (categoryId: string, name: string, budget?: number) => Promise<SubCategory>;
  updateSubcategory: (categoryId: string, subcategoryId: string, updates: Partial<SubCategory>) => Promise<SubCategory>;
  deleteSubcategory: (categoryId: string, subcategoryId: string, reassignSubcategoryId?: string, reassignSubcategoryName?: string) => Promise<void>;

  // Recurring Actions
  addRecurringTransaction: (data: Omit<RecurringTransaction, 'id' | 'createdAt'>) => RecurringTransaction;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  processDueRecurringTransactions: () => number;

  // Unified Quick Add
  quickAdd: (payload: QuickAddPayload) => Promise<{ success: boolean; error?: string }>;

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
  MESSAGE_HISTORY: 'my_wallet_message_history_v3',
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

  // Message History
  const [messageHistory, setMessageHistory] = useState<MessageRecord[]>([]);

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
  const activeUserIdRef = useRef<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [hasUnmigratedLocalData, setHasUnmigratedLocalData] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Backup System State
  const [backupHistory, setBackupHistoryState] = useState<WalletBackupEntry[]>([]);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Subscribe to offline sync queue
  useEffect(() => {
    const unsub = subscribeToSyncQueue((count, isSyncing) => {
      setPendingSyncCount(count);
      if (isSyncing) {
        setSyncState('syncing');
      } else if (count === 0) {
        setSyncState('synced');
      } else {
        setSyncState('offline');
      }
    });
    return unsub;
  }, []);

  // Refresh backup history
  const refreshBackupHistory = useCallback(async () => {
    const history = await getBackupHistory(user?.id);
    const lastTime = await getLastBackupTimestamp(user?.id);
    setBackupHistoryState(history);
    setLastBackupTime(lastTime);
  }, [user]);

  useEffect(() => {
    refreshBackupHistory();
  }, [refreshBackupHistory]);

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
    if (user?.id) {
      cloudSaveUserSettings(user.id, { openingBalance: val }).catch(console.warn);
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
  }, [user]);

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

        // 12. Message History
        const mhStr = dataMap[STORAGE_KEYS.MESSAGE_HISTORY];
        if (mhStr) {
          try {
            const parsed = JSON.parse(mhStr);
            if (Array.isArray(parsed)) setMessageHistory(parsed);
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

  // Cloud Sync on User Auth Change (Login, Logout, Account Switch)
  useEffect(() => {
    if (!isHydrated) return;
    const currentUserId = user?.id || null;
    let active = true;

    // 1. Handle Logout: Immediately clear in-memory state so user records are not leaked
    if (!currentUserId) {
      if (activeUserIdRef.current !== null) {
        activeUserIdRef.current = null;
        setTransactions([]);
        setCreditDebtRecords([]);
        setPeople([]);
        setAccounts(INITIAL_ACCOUNTS);
        setBudgets([]);
        setAccountTransfers([]);
        setMessageHistory([]);
        setOpeningBalanceState(0);
        setSyncState('synced');
        setLastSyncedAt(null);
      }
      return;
    }

    // 2. Handle Login / User Switch: Load from Cloud as Ground Truth
    async function syncOnLogin() {
      if (!currentUserId) return;

      activeUserIdRef.current = currentUserId;
      setSyncState('syncing');

      // Step A: Immediately load from user's isolated offline cache so UI never flashes ₹0 or empty
      try {
        const cachedRaw = await storage.getItem(`my_wallet_offline_cache_${currentUserId}`);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && active) {
            if (Array.isArray(cached.transactions) && cached.transactions.length > 0) setTransactions(cached.transactions);
            if (Array.isArray(cached.creditDebtRecords) && cached.creditDebtRecords.length > 0) setCreditDebtRecords(cached.creditDebtRecords);
            if (Array.isArray(cached.people) && cached.people.length > 0) setPeople(cached.people);
            if (Array.isArray(cached.accounts) && cached.accounts.length > 0) setAccounts(cached.accounts);
            if (Array.isArray(cached.budgets) && cached.budgets.length > 0) setBudgets(cached.budgets);
            if (Array.isArray(cached.accountTransfers) && cached.accountTransfers.length > 0) setAccountTransfers(cached.accountTransfers);
            if (Array.isArray(cached.categories) && cached.categories.length > 0) setCategories(cached.categories);
            if (Array.isArray(cached.messageHistory) && cached.messageHistory.length > 0) setMessageHistory(cached.messageHistory);
            if (typeof cached.openingBalance === 'number' && cached.openingBalance > 0) setOpeningBalanceState(cached.openingBalance);
            console.log(`[Offline Cache Hydrated] Preloaded user ${currentUserId} data successfully from disk.`);
          }
        }
      } catch (cacheErr) {
        console.warn('[Offline Cache Preload Notice]', cacheErr);
      }

      // Step B: Query Supabase Cloud Ground Truth
      try {
        const cloudData = await fetchUserDataFromCloud(currentUserId);
        if (!active) return;

        if (!cloudData) {
          // Cloud unreachable or offline: user data remains safe in cache
          console.warn('[Supabase Cloud Offline] Operating in offline mode with cached data.');
          setSyncState('offline');
          return;
        }

        // If there are permission errors (e.g., 42501) or table query errors:
        if (cloudData.queryErrors && cloudData.queryErrors.length > 0) {
          console.error(
            `[Supabase Cloud Database Diagnostics] Query errors reported for user ${currentUserId}:\n` +
            cloudData.queryErrors.join('\n')
          );
          setSyncState('error');
          // IMPORTANT: NEVER wipe local state or reset to ₹0 when cloud queries fail!
          return;
        }

        // Step C: Supabase is the PRIMARY DATABASE: Clean cloud response received!
        // Populate state directly from Cloud Ground Truth
        setTransactions(cloudData.transactions || []);
        setCreditDebtRecords(cloudData.creditDebtRecords || []);
        setPeople(cloudData.people || []);
        setAccounts(cloudData.accounts && cloudData.accounts.length > 0 ? cloudData.accounts : INITIAL_ACCOUNTS);
        setBudgets(cloudData.budgets || []);
        setAccountTransfers(cloudData.accountTransfers || []);
        if (cloudData.categories && cloudData.categories.length > 0) {
          setCategories(cloudData.categories);
        }
        if (cloudData.messageHistory) {
          setMessageHistory(cloudData.messageHistory);
        }
        if (typeof cloudData.openingBalance === 'number') {
          setOpeningBalanceState(cloudData.openingBalance);
        }

        // Save fresh ground truth to user-specific offline cache
        await storage.setItem(
          `my_wallet_offline_cache_${currentUserId}`,
          JSON.stringify({
            transactions: cloudData.transactions,
            creditDebtRecords: cloudData.creditDebtRecords,
            people: cloudData.people,
            accounts: cloudData.accounts.length > 0 ? cloudData.accounts : INITIAL_ACCOUNTS,
            budgets: cloudData.budgets,
            accountTransfers: cloudData.accountTransfers,
            categories: cloudData.categories,
            messageHistory: cloudData.messageHistory,
            openingBalance: cloudData.openingBalance,
          })
        );

        // Drain offline sync queue specifically for this user
        processSyncQueue(currentUserId).catch(() => {});

        // Check & trigger automatic daily backup
        checkAndTriggerAutoBackup(currentUserId, {
          openingBalance: cloudData.openingBalance || openingBalance,
          accounts: cloudData.accounts.length > 0 ? cloudData.accounts : INITIAL_ACCOUNTS,
          accountTransfers: cloudData.accountTransfers,
          categories: cloudData.categories.length > 0 ? cloudData.categories : categories,
          budgets: cloudData.budgets,
          people: cloudData.people,
          creditDebtRecords: cloudData.creditDebtRecords,
          transactions: cloudData.transactions,
          recurringTransactions,
          reminderPreferences,
        }).catch(() => {});

        setSyncState('synced');
        setLastSyncedAt(new Date().toLocaleTimeString());
        setHasUnmigratedLocalData(false);
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

  // Persist State to Storage (Debounced to keep the UI smooth & prevent disk I/O stutter)
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [transactions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.CREDIT_DEBT, JSON.stringify(creditDebtRecords)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [creditDebtRecords, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [categories, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [budgets, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [accounts, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(accountTransfers)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [accountTransfers, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(people)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [people, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(recurringTransactions)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [recurringTransactions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      storage.setItem(STORAGE_KEYS.REMINDER_PREFS, JSON.stringify(reminderPreferences)).catch(console.warn);
    }, 150);
    return () => clearTimeout(timer);
  }, [reminderPreferences, isHydrated]);

  // Persist Authenticated User Offline Cache (Debounced 250ms)
  useEffect(() => {
    if (!isHydrated || !user?.id) return;
    const cacheKey = `my_wallet_offline_cache_${user.id}`;
    const timer = setTimeout(() => {
      storage.setItem(
        cacheKey,
        JSON.stringify({
          transactions,
          creditDebtRecords,
          people,
          accounts,
          budgets,
          accountTransfers,
          categories,
          messageHistory,
          openingBalance,
        })
      ).catch(console.warn);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    isHydrated,
    user?.id,
    transactions,
    creditDebtRecords,
    people,
    accounts,
    budgets,
    accountTransfers,
    categories,
    messageHistory,
    openingBalance,
  ]);

  // Selected Month for Budget View & Target
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );

  // Budget Summary for Selected Month
  const budgetSummary = useMemo<BudgetSummary>(() => {
    return calculateBudgetProgress(categories, transactions, budgets, selectedBudgetMonth);
  }, [categories, transactions, budgets, selectedBudgetMonth]);

  const getBudgetForMonth = useCallback(
    (monthStr: string) => {
      return calculateBudgetProgress(categories, transactions, budgets, monthStr);
    },
    [categories, transactions, budgets]
  );

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
  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    const numAmount = Number(data.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Please enter a valid amount greater than ₹0.');
    }
    const cleanTitle = (data.title || '').trim();
    if (!cleanTitle) {
      throw new Error('Please enter a transaction title.');
    }

    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newTx: Transaction = {
      ...data,
      amount: numAmount,
      title: cleanTitle,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      transactionDate: data.transactionDate || now.toISOString().split('T')[0],
      transactionTime: data.transactionTime || defaultTime,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    if (user?.id) {
      const res = await cloudSaveTransaction(user.id, newTx);
      if (!res.success) {
        logDbOperation('transactions', 'upsert', user.id, false, res.error);
        if (res.error?.code === '42501') {
          throw new Error(`Database Error [42501]: Permission denied on table 'transactions'. Run the SQL setup script in Supabase.`);
        }
        throw new Error(res.error?.message || 'Failed to save transaction to database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    setTransactions((prev) => [newTx, ...prev]);
    return newTx;
  }, [user]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> => {
    let updatedTx: Transaction | undefined;
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        updatedTx = { ...tx, ...updates, updatedAt: new Date().toISOString() };
        return updatedTx;
      })
    );

    if (updatedTx && user?.id) {
      const res = await cloudSaveTransaction(user.id, updatedTx);
      if (!res.success) {
        logDbOperation('transactions', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to update transaction in database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, ...updates } as Transaction) : prev));
    return updatedTx;
  }, [user]);

  const deleteTransaction = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.id) {
      const res = await cloudDeleteTransaction(user.id, id);
      if (!res.success) {
        logDbOperation('transactions', 'delete', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to delete transaction from database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    return { success: true };
  }, [user]);

  const updateTransactionAttachments = useCallback(async (id: string, newAttachments: Attachment[]): Promise<void> => {
    let updatedTx: Transaction | undefined;
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        updatedTx = { ...tx, attachments: newAttachments, updatedAt: new Date().toISOString() };
        return updatedTx;
      })
    );

    if (updatedTx && user?.id) {
      const res = await cloudSaveTransaction(user.id, updatedTx);
      if (!res.success) {
        logDbOperation('transactions', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to update attachments in database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, attachments: newAttachments } as Transaction) : prev));
  }, [user]);

  // Credit & Debt Actions
  const addCreditDebt = useCallback(async (data: Omit<CreditDebtRecord, 'id' | 'remainingAmount' | 'createdAt' | 'updatedAt'>): Promise<CreditDebtRecord> => {
    const numAmount = Number(data.originalAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Please enter a valid amount greater than ₹0.');
    }
    const counterpart = (data.counterpartName || '').trim();
    if (!counterpart) {
      throw new Error('Please enter the customer / counterpart name.');
    }

    const dueStatus = getDueStatus(data.dueDate);
    const settled = Number(data.settledAmount) || 0;
    const remaining = Math.max(0, numAmount - settled);
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

    let resolvedPersonId = data.personId;
    if (!resolvedPersonId) {
      const existing = people.find((p) => p.name.trim().toLowerCase() === counterpart.toLowerCase());
      if (existing) {
        resolvedPersonId = existing.id;
      }
    }

    // If authenticated, persist person first if needed, then save Khata record
    if (user?.id) {
      if (!resolvedPersonId || !people.some((p) => p.id === resolvedPersonId)) {
        const newPersonId = resolvedPersonId || `person-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const pRecord: Person = {
          id: newPersonId,
          name: counterpart,
          phone: data.counterpartPhone,
          email: data.counterpartEmail,
          createdAt: now.toISOString(),
        };
        const pRes = await cloudSavePerson(user.id, pRecord);
        if (pRes.success) {
          resolvedPersonId = newPersonId;
          setPeople((prev) => prev.some((p) => p.id === newPersonId) ? prev : [...prev, pRecord]);
        }
      }
    }

    const newRecord: CreditDebtRecord = {
      ...data,
      originalAmount: numAmount,
      counterpartName: counterpart,
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

    if (user?.id) {
      const res = await cloudSaveKhataRecord(user.id, newRecord);
      if (!res.success) {
        logDbOperation('khata_transactions', 'upsert', user.id, false, res.error);
        if (res.error?.code === '42501') {
          throw new Error(`Database Error [42501]: Permission denied on table 'khata_transactions'. Run the SQL setup script in Supabase.`);
        }
        throw new Error(res.error?.message || 'Failed to save Khata record to database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    setCreditDebtRecords((prev) => [newRecord, ...prev]);

    // Also auto-ensure person is tracked locally
    if (counterpart) {
      setPeople((prev) => {
        const cleanName = counterpart.toLowerCase();
        const exists = prev.some((p) => p.name.trim().toLowerCase() === cleanName);
        if (!exists) {
          const newP: Person = {
            id: resolvedPersonId || `person-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: counterpart,
            phone: data.counterpartPhone,
            email: data.counterpartEmail,
            createdAt: now.toISOString(),
          };
          return [...prev, newP];
        }
        return prev;
      });
    }

    return newRecord;
  }, [user, people]);

  const updateCreditDebt = useCallback(async (id: string, updates: Partial<CreditDebtRecord>): Promise<CreditDebtRecord | undefined> => {
    let finalRec: CreditDebtRecord | undefined;
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
        finalRec = { ...updated, remainingAmount: remaining, status };
        return finalRec;
      })
    );

    if (finalRec && user?.id) {
      const res = await cloudSaveKhataRecord(user.id, finalRec);
      if (!res.success) {
        logDbOperation('khata_transactions', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to update Khata record in database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, ...updates } as CreditDebtRecord) : prev));
    return finalRec;
  }, [user]);

  const settleCreditDebt = useCallback(async (
    id: string,
    amount: number,
    settlementAttachments?: Attachment[],
    notes?: string,
    paymentDate?: string,
    paymentTime?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetRecord = creditDebtRecords.find((r) => r.id === id);
    if (!targetRecord) {
      throw new Error(`Record with id ${id} not found.`);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Settlement amount must be greater than ₹0.');
    }

    const now = new Date();
    const resolvedDate = paymentDate || now.toISOString().split('T')[0];
    const resolvedTime = paymentTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRepayment: RepaymentRecord = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      amount: numAmount,
      paymentDate: resolvedDate,
      paymentTime: resolvedTime,
      notes,
      attachments: settlementAttachments,
      createdAt: now.toISOString(),
    };

    const newSettled = Math.min(targetRecord.originalAmount, targetRecord.settledAmount + numAmount);
    const remaining = Math.max(0, targetRecord.originalAmount - newSettled);
    const dueStatus = getDueStatus(targetRecord.dueDate);

    let status = targetRecord.status;
    if (remaining <= 0) {
      status = 'settled';
    } else if (dueStatus.isOverdue) {
      status = 'overdue';
    } else {
      status = 'partial';
    }

    const existingRepayments = targetRecord.repayments || [];
    const finalRec: CreditDebtRecord = {
      ...targetRecord,
      settledAmount: newSettled,
      remainingAmount: remaining,
      status,
      repayments: [newRepayment, ...existingRepayments],
      updatedAt: now.toISOString(),
    };

    if (user?.id) {
      const res = await cloudSaveKhataRecord(user.id, finalRec);
      if (!res.success) {
        logDbOperation('khata_transactions', 'upsert', user.id, false, res.error);
        if (res.error?.code === '42501') {
          throw new Error(`Database Error [42501]: Permission denied on table 'khata_transactions'. Run the SQL setup script in Supabase.`);
        }
        throw new Error(res.error?.message || 'Failed to save payment settlement to database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    setCreditDebtRecords((prev) => prev.map((r) => (r.id === id ? finalRec : r)));
    return { success: true };
  }, [user, creditDebtRecords]);

  const updateCreditDebtAttachments = useCallback(async (id: string, newAttachments: Attachment[]): Promise<void> => {
    let updatedRec: CreditDebtRecord | undefined;
    setCreditDebtRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;
        updatedRec = { ...rec, attachments: newAttachments, updatedAt: new Date().toISOString() };
        return updatedRec;
      })
    );

    if (updatedRec && user?.id) {
      const res = await cloudSaveKhataRecord(user.id, updatedRec);
      if (!res.success) {
        logDbOperation('khata_transactions', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to update attachments in database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    setSelectedRecord((prev) => (prev && prev.id === id ? ({ ...prev, attachments: newAttachments } as CreditDebtRecord) : prev));
  }, [user]);

  const deleteCreditDebt = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.id) {
      const res = await cloudDeleteKhataRecord(user.id, id);
      if (!res.success) {
        logDbOperation('khata_transactions', 'delete', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to delete Khata record from database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    setCreditDebtRecords((prev) => prev.filter((rec) => rec.id !== id));
    return { success: true };
  }, [user]);

  // Multi-Account Actions
  const addAccount = useCallback(async (data: Omit<Account, 'id' | 'currentBalance' | 'createdAt'>): Promise<Account> => {
    const newAcc: Account = {
      ...data,
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      currentBalance: data.openingBalance || 0,
      createdAt: new Date().toISOString(),
    };
    if (user?.id) {
      const res = await cloudSaveAccount(user.id, newAcc);
      if (!res.success) {
        logDbOperation('accounts', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to save account to database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    setAccounts((prev) => [...prev, newAcc]);
    return newAcc;
  }, [user]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>): Promise<void> => {
    let updatedAcc: Account | undefined;
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        updatedAcc = { ...a, ...updates };
        return updatedAcc;
      })
    );

    if (updatedAcc && user?.id) {
      const res = await cloudSaveAccount(user.id, updatedAcc);
      if (!res.success) {
        logDbOperation('accounts', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to update account in database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
  }, [user]);

  const deleteAccount = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.id) {
      const res = await cloudDeleteAccount(user.id, id);
      if (!res.success) {
        logDbOperation('accounts', 'delete', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to delete account from database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    return { success: true };
  }, [user]);

  const transferBetweenAccounts = useCallback(async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date?: string,
    time?: string,
    notes?: string
  ): Promise<AccountTransfer> => {
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

    if (user?.id) {
      const res = await cloudSaveTransfer(user.id, newTransfer);
      if (!res.success) {
        logDbOperation('account_transfers', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to save account transfer to database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    setAccountTransfers((prev) => [newTransfer, ...prev]);
    return newTransfer;
  }, [user]);

  // Person Actions
  const updatePerson = useCallback(async (id: string, updates: Partial<Person>): Promise<void> => {
    let updatedPerson: Person | undefined;
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        updatedPerson = { ...p, ...updates };
        return updatedPerson;
      })
    );

    if (updatedPerson && user?.id) {
      const res = await cloudSavePerson(user.id, updatedPerson);
      if (!res.success) {
        logDbOperation('khata_people', 'upsert', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to update person in database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
  }, [user]);

  const addPerson = useCallback(async (data: Omit<Person, 'id' | 'createdAt'>): Promise<Person> => {
    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new Error('Please enter a name for the person or customer.');
    }
    const existing = people.find((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (data.phone && !existing.phone) {
        await updatePerson(existing.id, { phone: data.phone });
      }
      return existing;
    }

    const newPerson: Person = {
      ...data,
      name: cleanName,
      id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };

    if (user?.id) {
      const res = await cloudSavePerson(user.id, newPerson);
      if (!res.success) {
        logDbOperation('khata_people', 'upsert', user.id, false, res.error);
        if (res.error?.code === '42501') {
          throw new Error(`Database Error [42501]: Permission denied on table 'khata_people'. Run the SQL setup script in Supabase.`);
        }
        throw new Error(res.error?.message || 'Failed to save customer to database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }

    setPeople((prev) => [...prev, newPerson]);
    return newPerson;
  }, [people, user, updatePerson]);

  const deletePerson = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.id) {
      const res = await cloudDeletePerson(user.id, id);
      if (!res.success) {
        logDbOperation('khata_people', 'delete', user.id, false, res.error);
        throw new Error(res.error?.message || 'Failed to delete customer from database');
      }
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
    setPeople((prev) => prev.filter((p) => p.id !== id));
    return { success: true };
  }, [user]);

  const archivePerson = useCallback(async (id: string): Promise<void> => {
    await updatePerson(id, { isArchived: true });
  }, [updatePerson]);

  const unarchivePerson = useCallback(async (id: string): Promise<void> => {
    await updatePerson(id, { isArchived: false });
  }, [updatePerson]);

  // Smart Messaging & Reminder Log Actions
  const logMessage = useCallback(
    async (data: Omit<MessageRecord, 'id' | 'createdAt'>): Promise<MessageRecord> => {
      const newRecord: MessageRecord = {
        ...data,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
      };

      setMessageHistory((prev) => {
        const updated = [newRecord, ...prev];
        storage.setItem(STORAGE_KEYS.MESSAGE_HISTORY, JSON.stringify(updated));
        return updated;
      });

      if (user?.id) {
        cloudSaveMessage(user.id, newRecord).catch(console.warn);
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      return newRecord;
    },
    [user]
  );

  const deleteMessageRecord = useCallback(
    (id: string) => {
      setMessageHistory((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        storage.setItem(STORAGE_KEYS.MESSAGE_HISTORY, JSON.stringify(updated));
        return updated;
      });
      if (user?.id) {
        cloudDeleteMessage(user.id, id).catch(console.warn);
        setLastSyncedAt(new Date().toLocaleTimeString());
      }
    },
    [user]
  );

  const clearMessageHistory = useCallback(() => {
    setMessageHistory([]);
    storage.removeItem(STORAGE_KEYS.MESSAGE_HISTORY);
  }, []);

  // Category Actions
  const addCategory = useCallback(
    async (data: Omit<Category, 'id'>): Promise<Category> => {
      const cleanName = data.name.trim();
      if (!cleanName) {
        throw new Error('Please enter a category name.');
      }

      // Check duplicate name for same type
      const duplicate = categories.find(
        (c) => c.type === data.type && c.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`A category named "${cleanName}" already exists for ${data.type}.`);
      }

      const newCat: Category = {
        ...data,
        name: cleanName,
        id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        userId: user?.id || null,
        subcategories: data.subcategories || [],
      };

      if (user?.id) {
        const res = await cloudSaveCategory(user.id, newCat);
        if (!res.success) {
          logDbOperation('categories', 'upsert', user.id, false, res.error);
          throw new Error(res.error?.message || 'Failed to save category to database.');
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      setCategories((prev) => [...prev, newCat]);
      return newCat;
    },
    [categories, user]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>): Promise<Category> => {
      let updatedCat: Category | undefined;

      const existing = categories.find((c) => c.id === id);
      if (!existing) {
        throw new Error('Category not found.');
      }

      if (updates.name && updates.name.trim()) {
        const cleanName = updates.name.trim();
        const duplicate = categories.find(
          (c) =>
            c.id !== id &&
            c.type === (updates.type || existing.type) &&
            c.name.toLowerCase() === cleanName.toLowerCase()
        );
        if (duplicate) {
          throw new Error(`A category named "${cleanName}" already exists.`);
        }
      }

      updatedCat = {
        ...existing,
        ...updates,
        name: updates.name ? updates.name.trim() : existing.name,
      };

      if (user?.id) {
        const res = await cloudSaveCategory(user.id, updatedCat);
        if (!res.success) {
          logDbOperation('categories', 'upsert', user.id, false, res.error);
          throw new Error(res.error?.message || 'Failed to update category in database.');
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      setCategories((prev) => prev.map((c) => (c.id === id ? updatedCat! : c)));
      return updatedCat;
    },
    [categories, user]
  );

  const deleteCategory = useCallback(
    async (id: string, reassignCategoryId?: string): Promise<void> => {
      if (reassignCategoryId) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.categoryId === id
              ? { ...t, categoryId: reassignCategoryId, subcategoryId: undefined, subcategoryName: undefined }
              : t
          )
        );
      } else {
        setTransactions((prev) =>
          prev.map((t) =>
            t.categoryId === id
              ? { ...t, categoryId: '', subcategoryId: undefined, subcategoryName: undefined }
              : t
          )
        );
      }

      if (user?.id) {
        const res = await cloudDeleteCategory(user.id, id, reassignCategoryId);
        if (!res.success) {
          logDbOperation('categories', 'delete', user.id, false, res.error);
          throw new Error(res.error?.message || 'Failed to delete category from database.');
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      setCategories((prev) => prev.filter((c) => c.id !== id));
    },
    [user]
  );

  // Subcategory Actions
  const addSubcategory = useCallback(
    async (categoryId: string, name: string, budget?: number): Promise<SubCategory> => {
      const cleanName = name.trim();
      if (!cleanName) {
        throw new Error('Please enter a subcategory name.');
      }

      const targetCat = categories.find((c) => c.id === categoryId);
      if (!targetCat) {
        throw new Error('Parent category not found.');
      }

      const subs = targetCat.subcategories || [];
      const duplicate = subs.find((s) => s.name.toLowerCase() === cleanName.toLowerCase());
      if (duplicate) {
        throw new Error(`Subcategory "${cleanName}" already exists in ${targetCat.name}.`);
      }

      const newSub: SubCategory = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: cleanName,
        budget: budget || undefined,
      };

      if (user?.id) {
        const res = await cloudSaveSubcategory(user.id, categoryId, newSub);
        if (!res.success) {
          logDbOperation('subcategories', 'upsert', user.id, false, res.error);
          throw new Error(res.error?.message || 'Failed to save subcategory to database.');
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== categoryId) return c;
          const currentSubs = c.subcategories || [];
          return { ...c, subcategories: [...currentSubs, newSub] };
        })
      );

      return newSub;
    },
    [categories, user]
  );

  const updateSubcategory = useCallback(
    async (categoryId: string, subcategoryId: string, updates: Partial<SubCategory>): Promise<SubCategory> => {
      const targetCat = categories.find((c) => c.id === categoryId);
      if (!targetCat) throw new Error('Parent category not found.');

      const subs = targetCat.subcategories || [];
      const existing = subs.find((s) => s.id === subcategoryId);
      if (!existing) throw new Error('Subcategory not found.');

      if (updates.name && updates.name.trim()) {
        const cleanName = updates.name.trim();
        const duplicate = subs.find(
          (s) => s.id !== subcategoryId && s.name.toLowerCase() === cleanName.toLowerCase()
        );
        if (duplicate) {
          throw new Error(`Subcategory "${cleanName}" already exists in ${targetCat.name}.`);
        }
      }

      const updatedSub: SubCategory = {
        ...existing,
        ...updates,
        name: updates.name ? updates.name.trim() : existing.name,
      };

      if (user?.id) {
        const res = await cloudSaveSubcategory(user.id, categoryId, updatedSub);
        if (!res.success) {
          logDbOperation('subcategories', 'upsert', user.id, false, res.error);
          throw new Error(res.error?.message || 'Failed to update subcategory in database.');
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      // Update in categories state
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== categoryId) return c;
          return {
            ...c,
            subcategories: (c.subcategories || []).map((s) => (s.id === subcategoryId ? updatedSub : s)),
          };
        })
      );

      // If name was updated, update transaction subcategoryName for consistency
      if (updates.name && updates.name.trim()) {
        const newName = updates.name.trim();
        setTransactions((prev) =>
          prev.map((t) => (t.subcategoryId === subcategoryId ? { ...t, subcategoryName: newName } : t))
        );
      }

      return updatedSub;
    },
    [categories, user]
  );

  const deleteSubcategory = useCallback(
    async (
      categoryId: string,
      subcategoryId: string,
      reassignSubcategoryId?: string,
      reassignSubcategoryName?: string
    ): Promise<void> => {
      if (reassignSubcategoryId) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.subcategoryId === subcategoryId
              ? { ...t, subcategoryId: reassignSubcategoryId, subcategoryName: reassignSubcategoryName }
              : t
          )
        );
      } else {
        setTransactions((prev) =>
          prev.map((t) =>
            t.subcategoryId === subcategoryId
              ? { ...t, subcategoryId: undefined, subcategoryName: undefined }
              : t
          )
        );
      }

      if (user?.id) {
        const res = await cloudDeleteSubcategory(
          user.id,
          subcategoryId,
          reassignSubcategoryId,
          reassignSubcategoryName
        );
        if (!res.success) {
          logDbOperation('subcategories', 'delete', user.id, false, res.error);
          throw new Error(res.error?.message || 'Failed to delete subcategory from database.');
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== categoryId) return c;
          return {
            ...c,
            subcategories: (c.subcategories || []).filter((s) => s.id !== subcategoryId),
          };
        })
      );
    },
    [user]
  );

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

    if (user?.id) {
      const existing = budgets.find((b) => b.month === month);
      const updated: Budget = existing
        ? {
            ...existing,
            categoryBudgets: { ...existing.categoryBudgets, [categoryId]: amount },
            updatedAt: new Date().toISOString(),
          }
        : {
            id: `budget-${month}`,
            month,
            totalBudget: 0,
            categoryBudgets: { [categoryId]: amount },
            createdAt: new Date().toISOString(),
          };
      cloudSaveBudget(user.id, updated).catch(console.warn);
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
  }, [user, budgets]);

  const setOverallMonthlyBudget = useCallback((amount: number, monthStr?: string) => {
    const month = monthStr || new Date().toISOString().slice(0, 7);
    setBudgets((prev) => {
      const existing = prev.find((b) => b.month === month);
      const updated: Budget = existing
        ? { ...existing, totalBudget: amount, updatedAt: new Date().toISOString() }
        : {
            id: `budget-${month}`,
            month,
            totalBudget: amount,
            categoryBudgets: {},
            createdAt: new Date().toISOString(),
          };

      if (user?.id) {
        cloudSaveBudget(user.id, updated).catch(console.warn);
        setLastSyncedAt(new Date().toLocaleTimeString());
      }

      if (existing) {
        return prev.map((b) => (b.month === month ? updated : b));
      }
      return [...prev, updated];
    });
  }, [user]);

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
  const quickAdd = useCallback(async (payload: QuickAddPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      if (payload.mode === 'income' || payload.mode === 'expense') {
        await addTransaction({
          title: payload.title,
          amount: payload.amount,
          type: payload.mode,
          categoryId: payload.categoryId || (payload.mode === 'income' ? 'cat-inc-1' : 'cat-exp-1'),
          subcategoryId: payload.subcategoryId,
          subcategoryName: payload.subcategoryName,
          accountId: payload.accountId,
          paymentMethod: payload.paymentMethod || 'upi',
          transactionDate: payload.date,
          transactionTime: payload.time,
          description: payload.description,
          attachments: payload.attachments,
        });
        return { success: true };
      } else if (payload.mode === 'credit' || payload.mode === 'debt') {
        const createdRecord = await addCreditDebt({
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
        return { success: true };
      }
      return { success: true };
    } catch (err: any) {
      console.error('[quickAdd Error]', err);
      return { success: false, error: err.message || 'Operation failed' };
    }
  }, [addTransaction, addCreditDebt, openReminderModal]);

  // Reset / Clear Data (Deletes local and cloud data for authenticated user)
  const resetToDefaults = useCallback(async () => {
    try {
      await storage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (_) {}

    if (user?.id) {
      const client = getSupabaseClient() as any;
      if (client) {
        try {
          await Promise.allSettled([
            client.from('transactions').delete().eq('user_id', user.id),
            client.from('khata_transactions').delete().eq('user_id', user.id),
            client.from('khata_people').delete().eq('user_id', user.id),
            client.from('account_transfers').delete().eq('user_id', user.id),
            client.from('budgets').delete().eq('user_id', user.id),
            client.from('message_history').delete().eq('user_id', user.id),
            client.from('attachments').delete().eq('user_id', user.id),
          ]);
        } catch (e) {
          console.warn('Error clearing cloud tables for user:', e);
        }
      }
      try {
        await storage.removeItem(`my_wallet_offline_cache_${user.id}`);
        await clearSyncQueue();
      } catch (_) {}
    }

    setTransactions([]);
    setCreditDebtRecords([]);
    setCategories(INITIAL_CATEGORIES);
    setBudgets(INITIAL_BUDGETS);
    setAccounts(INITIAL_ACCOUNTS);
    setAccountTransfers([]);
    setPeople([]);
    setRecurringTransactions([]);
    setMessageHistory([]);
    setOpeningBalance(0);
    setCurrentMode('income_expense');
  }, [user, setOpeningBalance, setCurrentMode]);

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

  // Manual Backup Now Action
  const triggerBackupNow = useCallback(async () => {
    const payload: CloudPayload = {
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
    const res = await createWalletBackup(user?.id || 'local-vault', payload, 'manual');
    if (res.success && res.backup) {
      setBackupHistoryState((prev) => [res.backup!, ...prev.filter((b) => b.id !== res.backup!.id)]);
      setLastBackupTime(res.backup.createdAt);
    }
    return res;
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

  // Restore from a structured backup entry
  const restoreFromBackupEntry = useCallback(
    async (entry: WalletBackupEntry) => {
      try {
        const data = entry.data;
        if (!data) return { success: false, restoredCount: 0, error: 'Backup data is empty.' };

        let count = 0;
        if (Array.isArray(data.transactions) && data.transactions.length > 0) {
          setTransactions((prev) => {
            const map = new Map<string, Transaction>();
            prev.forEach((t) => map.set(t.id, t));
            data.transactions.forEach((t) => {
              if (!map.has(t.id)) count++;
              map.set(t.id, t);
            });
            return Array.from(map.values());
          });
        }

        if (Array.isArray(data.creditDebtRecords) && data.creditDebtRecords.length > 0) {
          setCreditDebtRecords((prev) => {
            const map = new Map<string, CreditDebtRecord>();
            prev.forEach((k) => map.set(k.id, k));
            data.creditDebtRecords.forEach((k) => {
              if (!map.has(k.id)) count++;
              map.set(k.id, k);
            });
            return Array.from(map.values());
          });
        }

        if (Array.isArray(data.people) && data.people.length > 0) {
          setPeople((prev) => {
            const map = new Map<string, Person>();
            prev.forEach((p) => map.set(p.id, p));
            data.people.forEach((p) => map.set(p.id, p));
            return Array.from(map.values());
          });
        }

        if (Array.isArray(data.accounts) && data.accounts.length > 0) {
          setAccounts(data.accounts);
        }

        if (Array.isArray(data.budgets) && data.budgets.length > 0) {
          setBudgets(data.budgets);
        }

        if (typeof data.openingBalance === 'number') {
          setOpeningBalanceState(data.openingBalance);
        }

        if (user) {
          triggerManualSync().catch(console.warn);
        }

        return { success: true, restoredCount: count };
      } catch (err: any) {
        return { success: false, restoredCount: 0, error: err.message || 'Restore failed' };
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
        pendingSyncCount,
        hasUnmigratedLocalData,
        triggerManualSync,
        migrateLocalDataToCloud,
        exportAllDataJson,
        exportTransactionsCsv,
        restoreFromJsonBackup,
        triggerBackupNow,
        backupHistory,
        lastBackupTime,
        refreshBackupHistory,
        restoreFromBackupEntry,
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
        selectedBudgetMonth,
        setSelectedBudgetMonth,
        getBudgetForMonth,
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
        archivePerson,
        unarchivePerson,
        messageHistory,
        logMessage,
        deleteMessageRecord,
        clearMessageHistory,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
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
