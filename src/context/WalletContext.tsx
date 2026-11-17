import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  CreditDebtRecord,
  Category,
  FinancialSummary,
  CategorySpendSummary,
  ActiveTab,
  QuickAddPayload,
  Attachment,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_CREDIT_DEBT,
} from '../data/defaultData';
import { isSupabaseConfigured } from '../lib/supabase';
import { getDueStatus } from '../lib/date';

interface WalletContextType {
  // State
  transactions: Transaction[];
  creditDebtRecords: CreditDebtRecord[];
  categories: Category[];
  financialSummary: FinancialSummary;
  categorySpending: CategorySpendSummary[];
  activeTab: ActiveTab;
  isQuickAddOpen: boolean;
  quickAddInitialMode: 'income' | 'expense' | 'credit' | 'debt';
  isSupabaseMode: boolean;
  selectedRecord: (Transaction | CreditDebtRecord) | null;
  selectedRecordKind: 'transaction' | 'credit-debt';

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  openQuickAdd: (mode?: 'income' | 'expense' | 'credit' | 'debt') => void;
  closeQuickAdd: () => void;
  openRecordDetails: (record: Transaction | CreditDebtRecord, kind: 'transaction' | 'credit-debt') => void;
  closeRecordDetails: () => void;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransactionAttachments: (id: string, attachments: Attachment[]) => void;
  addCreditDebt: (data: Omit<CreditDebtRecord, 'id' | 'remainingAmount' | 'createdAt' | 'updatedAt'>) => void;
  settleCreditDebt: (id: string, amount: number, attachments?: Attachment[]) => void;
  updateCreditDebtAttachments: (id: string, attachments: Attachment[]) => void;
  deleteCreditDebt: (id: string) => void;
  quickAdd: (payload: QuickAddPayload) => void;
  resetToDefaults: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TRANSACTIONS: 'my_wallet_transactions_v1',
  CREDIT_DEBT: 'my_wallet_credit_debt_v1',
  CATEGORIES: 'my_wallet_categories_v1',
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse categories from storage', e);
      }
    }
    return INITIAL_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse transactions from storage', e);
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [creditDebtRecords, setCreditDebtRecords] = useState<CreditDebtRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CREDIT_DEBT);
    if (saved) {
      try {
        const parsed: CreditDebtRecord[] = JSON.parse(saved);
        // Refresh statuses dynamically based on current date
        return parsed.map((item) => {
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
        });
      } catch (e) {
        console.error('Failed to parse credit debt records from storage', e);
      }
    }
    return INITIAL_CREDIT_DEBT;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddInitialMode, setQuickAddInitialMode] = useState<'income' | 'expense' | 'credit' | 'debt'>('expense');
  const [selectedRecord, setSelectedRecord] = useState<(Transaction | CreditDebtRecord) | null>(null);
  const [selectedRecordKind, setSelectedRecordKind] = useState<'transaction' | 'credit-debt'>('transaction');

  const isSupabaseMode = isSupabaseConfigured();

  // Persist state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CREDIT_DEBT, JSON.stringify(creditDebtRecords));
  }, [creditDebtRecords]);

  // Compute Financial Summary
  const financialSummary = useMemo<FinancialSummary>(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    transactions.forEach((tx) => {
      const isCurrentMonth = tx.transactionDate.startsWith(currentMonth);
      if (tx.type === 'income') {
        totalIncome += tx.amount;
        if (isCurrentMonth) monthlyIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        if (isCurrentMonth) monthlyExpense += tx.amount;
      }
    });

    const netSavings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / monthlyIncome) * 100))) : 0;

    let totalCreditPending = 0;
    let totalDebtPending = 0;
    let overdueCreditCount = 0;
    let overdueDebtCount = 0;

    creditDebtRecords.forEach((record) => {
      const remaining = Math.max(0, record.originalAmount - (record.settledAmount || 0));
      if (remaining > 0) {
        if (record.type === 'credit') {
          totalCreditPending += remaining;
          if (record.status === 'overdue') overdueCreditCount += 1;
        } else {
          totalDebtPending += remaining;
          if (record.status === 'overdue') overdueDebtCount += 1;
        }
      }
    });

    return {
      totalBalance: totalIncome - totalExpense,
      monthlyIncome,
      monthlyExpense,
      netSavings,
      savingsRate,
      totalCreditPending,
      totalDebtPending,
      overdueCreditCount,
      overdueDebtCount,
    };
  }, [transactions, creditDebtRecords]);

  // Compute Spending by Category
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

  const addTransaction = useCallback((data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTx: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  const addCreditDebt = useCallback((data: Omit<CreditDebtRecord, 'id' | 'remainingAmount' | 'createdAt' | 'updatedAt'>) => {
    const dueStatus = getDueStatus(data.dueDate);
    const settled = data.settledAmount || 0;
    const remaining = Math.max(0, data.originalAmount - settled);

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

    const newRecord: CreditDebtRecord = {
      ...data,
      id: `cd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      settledAmount: settled,
      remainingAmount: remaining,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCreditDebtRecords((prev) => [newRecord, ...prev]);
  }, []);

  const openRecordDetails = useCallback((record: Transaction | CreditDebtRecord, kind: 'transaction' | 'credit-debt') => {
    setSelectedRecord(record);
    setSelectedRecordKind(kind);
  }, []);

  const closeRecordDetails = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  const updateTransactionAttachments = useCallback((id: string, newAttachments: Attachment[]) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, attachments: newAttachments, updatedAt: new Date().toISOString() } : tx))
    );
    setSelectedRecord((prev) => (prev && prev.id === id ? { ...prev, attachments: newAttachments } : prev));
  }, []);

  const updateCreditDebtAttachments = useCallback((id: string, newAttachments: Attachment[]) => {
    setCreditDebtRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, attachments: newAttachments, updatedAt: new Date().toISOString() } : rec))
    );
    setSelectedRecord((prev) => (prev && prev.id === id ? { ...prev, attachments: newAttachments } : prev));
  }, []);

  const settleCreditDebt = useCallback((id: string, amount: number, settlementAttachments?: Attachment[]) => {
    setCreditDebtRecords((prev) =>
      prev.map((record) => {
        if (record.id !== id) return record;

        const newSettled = Math.min(record.originalAmount, record.settledAmount + amount);
        const remaining = Math.max(0, record.originalAmount - newSettled);
        const dueStatus = getDueStatus(record.dueDate);

        let newStatus = record.status;
        if (remaining <= 0) {
          newStatus = 'settled';
        } else if (dueStatus.isOverdue) {
          newStatus = 'overdue';
        } else {
          newStatus = 'partial';
        }

        const combinedAttachments = settlementAttachments && settlementAttachments.length > 0
          ? [...(record.attachments || []), ...settlementAttachments]
          : record.attachments;

        return {
          ...record,
          settledAmount: newSettled,
          remainingAmount: remaining,
          status: newStatus,
          attachments: combinedAttachments,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const deleteCreditDebt = useCallback((id: string) => {
    setCreditDebtRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord(null);
    }
  }, [selectedRecord]);

  const quickAdd = useCallback((payload: QuickAddPayload) => {
    if (payload.mode === 'income' || payload.mode === 'expense') {
      addTransaction({
        amount: payload.amount,
        type: payload.mode,
        categoryId: payload.categoryId || (payload.mode === 'income' ? 'cat-inc-5' : 'cat-exp-9'),
        paymentMethod: payload.paymentMethod || 'upi',
        title: payload.title,
        description: payload.description,
        transactionDate: payload.date,
        attachments: payload.attachments,
      });
    } else {
      addCreditDebt({
        type: payload.mode, // 'credit' | 'debt'
        counterpartName: payload.counterpartName || payload.title,
        counterpartPhone: payload.counterpartPhone,
        originalAmount: payload.amount,
        settledAmount: 0,
        status: 'pending',
        dueDate: payload.dueDate,
        notes: payload.description,
        attachments: payload.attachments,
      });
    }
    setIsQuickAddOpen(false);
  }, [addTransaction, addCreditDebt]);

  const resetToDefaults = useCallback(() => {
    setTransactions(INITIAL_TRANSACTIONS);
    setCreditDebtRecords(INITIAL_CREDIT_DEBT);
    setSelectedRecord(null);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CREDIT_DEBT);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        transactions,
        creditDebtRecords,
        categories,
        financialSummary,
        categorySpending,
        activeTab,
        isQuickAddOpen,
        quickAddInitialMode,
        isSupabaseMode,
        selectedRecord,
        selectedRecordKind,
        setActiveTab,
        openQuickAdd,
        closeQuickAdd,
        openRecordDetails,
        closeRecordDetails,
        addTransaction,
        deleteTransaction,
        updateTransactionAttachments,
        addCreditDebt,
        settleCreditDebt,
        updateCreditDebtAttachments,
        deleteCreditDebt,
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
