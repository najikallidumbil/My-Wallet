import { getSupabaseClient } from '../lib/supabase';
import {
  Account,
  AccountTransfer,
  Category,
  Budget,
  Person,
  CreditDebtRecord,
  Transaction,
  RecurringTransaction,
  ReminderPreferences,
  MessageRecord,
} from '../types';

export interface CloudPayload {
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

export interface CloudFetchResult {
  hasData: boolean;
  hasTransactions: boolean;
  hasKhata: boolean;
  hasAccounts: boolean;
  hasPeople: boolean;
  hasBudgets: boolean;
  openingBalance: number;
  accounts: Account[];
  accountTransfers: AccountTransfer[];
  categories: Category[];
  budgets: Budget[];
  people: Person[];
  creditDebtRecords: CreditDebtRecord[];
  transactions: Transaction[];
  reminderPreferences: ReminderPreferences;
  messageHistory: MessageRecord[];
  queryErrors: string[];
}

export interface CloudOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    table: string;
    operation: 'insert' | 'update' | 'upsert' | 'delete' | 'select';
    code?: string;
    message: string;
    details?: string;
  };
}

export function logDbOperation(
  table: string,
  operation: 'insert' | 'update' | 'upsert' | 'delete' | 'select',
  userId: string,
  success: boolean,
  error?: { code?: string; message: string; details?: string }
) {
  if (success) {
    console.log(
      `[Supabase DB Success] Operation: ${operation.toUpperCase()} | Table: ${table} | User: ${userId}`
    );
  } else {
    console.error(
      `[Supabase DB ERROR] Operation: ${operation.toUpperCase()} | Table: ${table} | User: ${userId} | Code: ${
        error?.code || 'UNKNOWN'
      } | Message: ${error?.message || 'Unknown error'}${
        error?.details ? ` | Details: ${error.details}` : ''
      }`
    );
  }
}

// Fetch all user data from Supabase with safe error isolation
export async function fetchUserDataFromCloud(userId: string): Promise<CloudFetchResult | null> {
  const client = getSupabaseClient() as any;
  if (!client) return null;

  try {
    const queryErrors: string[] = [];

    const [
      settingsRes,
      accountsRes,
      transfersRes,
      categoriesRes,
      subcategoriesRes,
      budgetsRes,
      peopleRes,
      khataRes,
      transactionsRes,
      messagesRes,
    ] = await Promise.all([
      client.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      client.from('accounts').select('*').eq('user_id', userId),
      client.from('account_transfers').select('*').eq('user_id', userId),
      client.from('categories').select('*').or(`user_id.eq.${userId},user_id.is.null`),
      client.from('subcategories').select('*').eq('user_id', userId),
      client.from('budgets').select('*').eq('user_id', userId),
      client.from('khata_people').select('*').eq('user_id', userId),
      client.from('khata_transactions').select('*').eq('user_id', userId),
      client.from('transactions').select('*').eq('user_id', userId),
      client.from('message_history').select('*').eq('user_id', userId).catch(() => ({ data: [] })),
    ]);

    if (transactionsRes.error) {
      logDbOperation('transactions', 'select', userId, false, transactionsRes.error);
      queryErrors.push(`transactions: [${transactionsRes.error.code}] ${transactionsRes.error.message}`);
    } else {
      logDbOperation('transactions', 'select', userId, true);
    }

    if (khataRes.error) {
      logDbOperation('khata_transactions', 'select', userId, false, khataRes.error);
      queryErrors.push(`khata_transactions: [${khataRes.error.code}] ${khataRes.error.message}`);
    } else {
      logDbOperation('khata_transactions', 'select', userId, true);
    }

    if (peopleRes.error) {
      logDbOperation('khata_people', 'select', userId, false, peopleRes.error);
      queryErrors.push(`khata_people: [${peopleRes.error.code}] ${peopleRes.error.message}`);
    } else {
      logDbOperation('khata_people', 'select', userId, true);
    }

    if (accountsRes.error) {
      logDbOperation('accounts', 'select', userId, false, accountsRes.error);
      queryErrors.push(`accounts: [${accountsRes.error.code}] ${accountsRes.error.message}`);
    } else {
      logDbOperation('accounts', 'select', userId, true);
    }

    if (budgetsRes.error) {
      logDbOperation('budgets', 'select', userId, false, budgetsRes.error);
      queryErrors.push(`budgets: [${budgetsRes.error.code}] ${budgetsRes.error.message}`);
    } else {
      logDbOperation('budgets', 'select', userId, true);
    }

    if (transfersRes.error) {
      logDbOperation('account_transfers', 'select', userId, false, transfersRes.error);
      queryErrors.push(`account_transfers: [${transfersRes.error.code}] ${transfersRes.error.message}`);
    }

    if (categoriesRes.error) {
      logDbOperation('categories', 'select', userId, false, categoriesRes.error);
      queryErrors.push(`categories: [${categoriesRes.error.code}] ${categoriesRes.error.message}`);
    }

    const hasTransactions = Boolean(transactionsRes.data && transactionsRes.data.length > 0);
    const hasKhata = Boolean(khataRes.data && khataRes.data.length > 0);
    const hasPeople = Boolean(peopleRes.data && peopleRes.data.length > 0);
    const hasAccounts = Boolean(accountsRes.data && accountsRes.data.length > 0);
    const hasBudgets = Boolean(budgetsRes.data && budgetsRes.data.length > 0);

    // Only consider cloud as having real user data if actual financial records exist
    const hasData = hasTransactions || hasKhata || hasPeople || (hasBudgets && budgetsRes.data.length > 0);

    // Map subcategories by categoryId
    const subcatsByCategory: Record<string, any[]> = {};
    (subcategoriesRes.data || []).forEach((sc: any) => {
      if (!subcatsByCategory[sc.category_id]) {
        subcatsByCategory[sc.category_id] = [];
      }
      subcatsByCategory[sc.category_id].push({
        id: sc.id,
        name: sc.name,
        budget: Number(sc.budget) || 0,
      });
    });

    // Map categories
    const categories: Category[] = (categoriesRes.data || []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      type: c.type,
      icon: c.icon || 'Tag',
      color: c.color || '#6366f1',
      isDefault: c.is_default || false,
      budget: Number(c.budget) || 0,
      subcategories: subcatsByCategory[c.id] || [],
    }));

    // Map accounts
    const accounts: Account[] = (accountsRes.data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: Number(a.opening_balance) || 0,
      currentBalance: Number(a.current_balance) || 0,
      accountNumber: a.account_number || undefined,
      color: a.color || '#10b981',
      icon: a.icon || 'Building2',
      isDefault: a.is_default || false,
      createdAt: a.created_at,
    }));

    // Map transfers
    const accountTransfers: AccountTransfer[] = (transfersRes.data || []).map((t: any) => ({
      id: t.id,
      fromAccountId: t.from_account_id || '',
      toAccountId: t.to_account_id || '',
      amount: Number(t.amount) || 0,
      date: t.transfer_date,
      time: t.transfer_time || '12:00',
      notes: t.notes || undefined,
      createdAt: t.created_at,
    }));

    // Map people
    const people: Person[] = (peopleRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      phone: p.phone || undefined,
      email: p.email || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
    }));

    // Map khata transactions
    const creditDebtRecords: CreditDebtRecord[] = (khataRes.data || []).map((k: any) => ({
      id: k.id,
      userId: k.user_id,
      personId: k.person_id || undefined,
      type: k.type,
      counterpartName: k.counterpart_name,
      counterpartPhone: k.counterpart_phone || undefined,
      counterpartEmail: k.counterpart_email || undefined,
      originalAmount: Number(k.original_amount) || 0,
      settledAmount: Number(k.settled_amount) || 0,
      remainingAmount: Math.max(0, (Number(k.original_amount) || 0) - (Number(k.settled_amount) || 0)),
      status: k.status,
      transactionDate: k.transaction_date,
      transactionTime: k.transaction_time || '12:00',
      dueDate: k.due_date || undefined,
      notes: k.notes || undefined,
      repayments: Array.isArray(k.repayments) ? (k.repayments as any) : [],
      createdAt: k.created_at,
      updatedAt: k.updated_at,
    }));

    // Map transactions
    const transactions: Transaction[] = (transactionsRes.data || []).map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      amount: Number(t.amount) || 0,
      type: t.type,
      categoryId: t.category_id || '',
      subcategoryId: t.subcategory_id || undefined,
      subcategoryName: t.subcategory_name || undefined,
      accountId: t.account_id || undefined,
      paymentMethod: t.payment_method,
      title: t.title,
      description: t.description || undefined,
      transactionDate: t.transaction_date,
      transactionTime: t.transaction_time || '12:00',
      isRecurring: t.is_recurring || false,
      recurringId: t.recurring_id || undefined,
      attachments: Array.isArray(t.attachments) ? (t.attachments as any) : [],
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    // Map budgets
    const budgets: Budget[] = (budgetsRes.data || []).map((b: any) => ({
      id: b.id,
      month: b.month,
      totalBudget: Number(b.total_budget) || 0,
      categoryBudgets: (b.category_budgets as Record<string, number>) || {},
      subcategoryBudgets: (b.subcategory_budgets as Record<string, number>) || {},
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    const openingBalance = settingsRes.data ? Number(settingsRes.data.opening_balance) || 0 : 0;
    const reminderPreferences = (settingsRes.data?.reminder_prefs as any) || {
      remindOnDueDate: true,
      remindDaysBefore: 1,
      browserNotifications: false,
    };

    // Map messages
    const messageHistory: MessageRecord[] = (messagesRes?.data || []).map((m: any) => ({
      id: m.id,
      personId: m.person_id || undefined,
      personName: m.person_name,
      recipientPhone: m.recipient_phone || undefined,
      messageContent: m.message_content,
      messageType: m.message_type,
      channel: m.channel,
      status: m.status,
      language: m.language || 'en',
      sentAt: m.sent_at,
      createdAt: m.created_at,
    }));

    return {
      hasData,
      hasTransactions,
      hasKhata,
      hasAccounts,
      hasPeople,
      hasBudgets,
      openingBalance,
      accounts,
      accountTransfers,
      categories,
      budgets,
      people,
      creditDebtRecords,
      transactions,
      reminderPreferences,
      messageHistory,
      queryErrors,
    };
  } catch (err) {
    console.warn('fetchUserDataFromCloud error:', err);
    return null;
  }
}

// Upload all local user data to Supabase (Full Sync / Migration)
export async function syncAllDataToCloud(
  userId: string,
  payload: CloudPayload
): Promise<{ success: boolean; syncedItemsCount: number; error?: string }> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return { success: false, syncedItemsCount: 0, error: 'Supabase client unavailable' };
  }

  try {
    let syncedCount = 0;

    // 1. User Settings
    const { error: settingsErr } = await client.from('user_settings').upsert({
      user_id: userId,
      opening_balance: payload.openingBalance,
      reminder_prefs: payload.reminderPreferences as any,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (settingsErr) {
      logDbOperation('user_settings', 'upsert', userId, false, settingsErr);
      throw new Error(`user_settings: [${settingsErr.code}] ${settingsErr.message}`);
    }
    logDbOperation('user_settings', 'upsert', userId, true);
    syncedCount++;

    // 2. Accounts
    if (payload.accounts.length > 0) {
      const rows = payload.accounts.map((a) => ({
        id: a.id,
        user_id: userId,
        name: a.name,
        type: a.type,
        opening_balance: a.openingBalance,
        current_balance: a.currentBalance,
        account_number: a.accountNumber || null,
        color: a.color || null,
        icon: a.icon || null,
        is_default: a.isDefault || false,
      }));
      const { error: accErr } = await client.from('accounts').upsert(rows, { onConflict: 'id' });
      if (accErr) {
        logDbOperation('accounts', 'upsert', userId, false, accErr);
        throw new Error(`accounts: [${accErr.code}] ${accErr.message}`);
      }
      logDbOperation('accounts', 'upsert', userId, true);
      syncedCount += rows.length;
    }

    // 3. Account Transfers
    if (payload.accountTransfers.length > 0) {
      const rows = payload.accountTransfers.map((t) => ({
        id: t.id,
        user_id: userId,
        from_account_id: t.fromAccountId || null,
        to_account_id: t.toAccountId || null,
        amount: t.amount,
        transfer_date: t.date,
        transfer_time: t.time || '12:00',
        notes: t.notes || null,
      }));
      const { error: trErr } = await client.from('account_transfers').upsert(rows, { onConflict: 'id' });
      if (trErr) {
        logDbOperation('account_transfers', 'upsert', userId, false, trErr);
        throw new Error(`account_transfers: [${trErr.code}] ${trErr.message}`);
      }
      logDbOperation('account_transfers', 'upsert', userId, true);
      syncedCount += rows.length;
    }

    // 4. Custom Categories
    const customCategories = payload.categories.filter((c) => !c.isDefault);
    if (customCategories.length > 0) {
      const rows = customCategories.map((c) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        type: c.type,
        icon: c.icon || 'Tag',
        color: c.color || '#6366f1',
        is_default: false,
        budget: c.budget || 0,
      }));
      const { error: catErr } = await client.from('categories').upsert(rows, { onConflict: 'id' });
      if (catErr) {
        logDbOperation('categories', 'upsert', userId, false, catErr);
        throw new Error(`categories: [${catErr.code}] ${catErr.message}`);
      }
      logDbOperation('categories', 'upsert', userId, true);
      syncedCount += rows.length;
    }

    // 5. Khata People
    if (payload.people.length > 0) {
      const rows = payload.people.map((p) => ({
        id: p.id,
        user_id: userId,
        name: p.name,
        phone: p.phone || null,
        email: p.email || null,
        notes: p.notes || null,
      }));
      const { error: pErr } = await client.from('khata_people').upsert(rows, { onConflict: 'id' });
      if (pErr) {
        logDbOperation('khata_people', 'upsert', userId, false, pErr);
        throw new Error(`khata_people: [${pErr.code}] ${pErr.message}`);
      }
      logDbOperation('khata_people', 'upsert', userId, true);
      syncedCount += rows.length;
    }

    // 6. Khata Transactions
    if (payload.creditDebtRecords.length > 0) {
      const rows = payload.creditDebtRecords.map((k) => ({
        id: k.id,
        user_id: userId,
        person_id: k.personId || null,
        type: k.type,
        counterpart_name: k.counterpartName,
        counterpart_phone: k.counterpartPhone || null,
        counterpart_email: k.counterpartEmail || null,
        original_amount: k.originalAmount,
        settled_amount: k.settledAmount,
        status: k.status,
        transaction_date: k.transactionDate,
        transaction_time: k.transactionTime || '12:00',
        due_date: k.dueDate || null,
        notes: k.notes || null,
        repayments: (k.repayments || []) as any,
      }));
      const { error: kErr } = await client.from('khata_transactions').upsert(rows, { onConflict: 'id' });
      if (kErr) {
        logDbOperation('khata_transactions', 'upsert', userId, false, kErr);
        throw new Error(`khata_transactions: [${kErr.code}] ${kErr.message}`);
      }
      logDbOperation('khata_transactions', 'upsert', userId, true);
      syncedCount += rows.length;
    }

    // 7. Income & Expense Transactions
    if (payload.transactions.length > 0) {
      const rows = payload.transactions.map((t) => ({
        id: t.id,
        user_id: userId,
        category_id: t.categoryId || null,
        subcategory_id: t.subcategoryId || null,
        subcategory_name: t.subcategoryName || null,
        account_id: t.accountId || null,
        amount: t.amount,
        type: t.type,
        payment_method: t.paymentMethod,
        title: t.title,
        description: t.description || null,
        transaction_date: t.transactionDate,
        transaction_time: t.transactionTime || '12:00',
        is_recurring: t.isRecurring || false,
        recurring_id: t.recurringId || null,
        attachments: (t.attachments || []) as any,
      }));
      const { error: txErr } = await client.from('transactions').upsert(rows, { onConflict: 'id' });
      if (txErr) {
        logDbOperation('transactions', 'upsert', userId, false, txErr);
        throw new Error(`transactions: [${txErr.code}] ${txErr.message}`);
      }
      logDbOperation('transactions', 'upsert', userId, true);
      syncedCount += rows.length;
    }

    // 8. Budgets
    if (payload.budgets.length > 0) {
      const rows = payload.budgets.map((b) => ({
        id: b.id.includes(userId) ? b.id : `budget-${userId}-${b.month}`,
        user_id: userId,
        month: b.month,
        total_budget: b.totalBudget || 0,
        category_budgets: (b.categoryBudgets || {}) as any,
        subcategory_budgets: (b.subcategoryBudgets || {}) as any,
      }));
      const { error: bErr } = await client.from('budgets').upsert(rows, { onConflict: 'user_id,month' });
      if (bErr) {
        logDbOperation('budgets', 'upsert', userId, false, bErr);
        throw new Error(`budgets: [${bErr.code}] ${bErr.message}`);
      }
      logDbOperation('budgets', 'upsert', userId, true);
      syncedCount += rows.length;
    }

    return { success: true, syncedItemsCount: syncedCount };
  } catch (err: any) {
    console.error('syncAllDataToCloud error:', err);
    return { success: false, syncedItemsCount: 0, error: err.message || 'Cloud sync failed' };
  }
}

// ==============================================================================
// DIRECT CLOUD CRUD FUNCTIONS WITH STRICT DATABASE AWAIT & ERROR HANDLING
// ==============================================================================

export async function cloudSavePerson(
  userId: string,
  person: Person
): Promise<CloudOperationResult<Person>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'khata_people', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const row = {
      id: person.id,
      user_id: userId,
      name: person.name.trim(),
      phone: person.phone || null,
      email: person.email || null,
      notes: person.notes || null,
    };

    const { error } = await client.from('khata_people').upsert(row, { onConflict: 'id' });
    if (error) {
      logDbOperation('khata_people', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'khata_people', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('khata_people', 'upsert', userId, true);
    return { success: true, data: person };
  } catch (err: any) {
    logDbOperation('khata_people', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'khata_people', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudDeletePerson(
  userId: string,
  personId: string
): Promise<CloudOperationResult<null>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'khata_people', operation: 'delete', message: 'Supabase client unavailable' },
    };
  }

  try {
    const { error } = await client.from('khata_people').delete().eq('id', personId).eq('user_id', userId);
    if (error) {
      logDbOperation('khata_people', 'delete', userId, false, error);
      return {
        success: false,
        error: { table: 'khata_people', operation: 'delete', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('khata_people', 'delete', userId, true);
    return { success: true, data: null };
  } catch (err: any) {
    logDbOperation('khata_people', 'delete', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'khata_people', operation: 'delete', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudSaveKhataRecord(
  userId: string,
  record: CreditDebtRecord
): Promise<CloudOperationResult<CreditDebtRecord>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'khata_transactions', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const row = {
      id: record.id,
      user_id: userId,
      person_id: record.personId || null,
      type: record.type,
      counterpart_name: record.counterpartName,
      counterpart_phone: record.counterpartPhone || null,
      counterpart_email: record.counterpartEmail || null,
      original_amount: record.originalAmount,
      settled_amount: record.settledAmount,
      status: record.status,
      transaction_date: record.transactionDate,
      transaction_time: record.transactionTime || '12:00',
      due_date: record.dueDate || null,
      notes: record.notes || null,
      repayments: (record.repayments || []) as any,
    };

    const { error } = await client.from('khata_transactions').upsert(row, { onConflict: 'id' });
    if (error) {
      logDbOperation('khata_transactions', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'khata_transactions', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('khata_transactions', 'upsert', userId, true);
    return { success: true, data: record };
  } catch (err: any) {
    logDbOperation('khata_transactions', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'khata_transactions', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudDeleteKhataRecord(
  userId: string,
  recordId: string
): Promise<CloudOperationResult<null>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'khata_transactions', operation: 'delete', message: 'Supabase client unavailable' },
    };
  }

  try {
    const { error } = await client.from('khata_transactions').delete().eq('id', recordId).eq('user_id', userId);
    if (error) {
      logDbOperation('khata_transactions', 'delete', userId, false, error);
      return {
        success: false,
        error: { table: 'khata_transactions', operation: 'delete', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('khata_transactions', 'delete', userId, true);
    return { success: true, data: null };
  } catch (err: any) {
    logDbOperation('khata_transactions', 'delete', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'khata_transactions', operation: 'delete', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudSaveTransaction(
  userId: string,
  tx: Transaction
): Promise<CloudOperationResult<Transaction>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'transactions', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const row = {
      id: tx.id,
      user_id: userId,
      category_id: tx.categoryId || null,
      subcategory_id: tx.subcategoryId || null,
      subcategory_name: tx.subcategoryName || null,
      account_id: tx.accountId || null,
      amount: tx.amount,
      type: tx.type,
      payment_method: tx.paymentMethod,
      title: tx.title,
      description: tx.description || null,
      transaction_date: tx.transactionDate,
      transaction_time: tx.transactionTime || '12:00',
      is_recurring: tx.isRecurring || false,
      recurring_id: tx.recurringId || null,
      attachments: (tx.attachments || []) as any,
    };

    const { error } = await client.from('transactions').upsert(row, { onConflict: 'id' });
    if (error) {
      logDbOperation('transactions', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'transactions', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('transactions', 'upsert', userId, true);
    return { success: true, data: tx };
  } catch (err: any) {
    logDbOperation('transactions', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'transactions', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudDeleteTransaction(
  userId: string,
  txId: string
): Promise<CloudOperationResult<null>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'transactions', operation: 'delete', message: 'Supabase client unavailable' },
    };
  }

  try {
    const { error } = await client.from('transactions').delete().eq('id', txId).eq('user_id', userId);
    if (error) {
      logDbOperation('transactions', 'delete', userId, false, error);
      return {
        success: false,
        error: { table: 'transactions', operation: 'delete', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('transactions', 'delete', userId, true);
    return { success: true, data: null };
  } catch (err: any) {
    logDbOperation('transactions', 'delete', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'transactions', operation: 'delete', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudSaveAccount(
  userId: string,
  account: Account
): Promise<CloudOperationResult<Account>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'accounts', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const row = {
      id: account.id,
      user_id: userId,
      name: account.name,
      type: account.type,
      opening_balance: account.openingBalance,
      current_balance: account.currentBalance,
      account_number: account.accountNumber || null,
      color: account.color || null,
      icon: account.icon || null,
      is_default: account.isDefault || false,
    };

    const { error } = await client.from('accounts').upsert(row, { onConflict: 'id' });
    if (error) {
      logDbOperation('accounts', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'accounts', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('accounts', 'upsert', userId, true);
    return { success: true, data: account };
  } catch (err: any) {
    logDbOperation('accounts', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'accounts', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudDeleteAccount(
  userId: string,
  accountId: string
): Promise<CloudOperationResult<null>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'accounts', operation: 'delete', message: 'Supabase client unavailable' },
    };
  }

  try {
    const { error } = await client.from('accounts').delete().eq('id', accountId).eq('user_id', userId);
    if (error) {
      logDbOperation('accounts', 'delete', userId, false, error);
      return {
        success: false,
        error: { table: 'accounts', operation: 'delete', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('accounts', 'delete', userId, true);
    return { success: true, data: null };
  } catch (err: any) {
    logDbOperation('accounts', 'delete', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'accounts', operation: 'delete', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudSaveTransfer(
  userId: string,
  transfer: AccountTransfer
): Promise<CloudOperationResult<AccountTransfer>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'account_transfers', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const row = {
      id: transfer.id,
      user_id: userId,
      from_account_id: transfer.fromAccountId || null,
      to_account_id: transfer.toAccountId || null,
      amount: transfer.amount,
      transfer_date: transfer.date,
      transfer_time: transfer.time || '12:00',
      notes: transfer.notes || null,
    };

    const { error } = await client.from('account_transfers').upsert(row, { onConflict: 'id' });
    if (error) {
      logDbOperation('account_transfers', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'account_transfers', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('account_transfers', 'upsert', userId, true);
    return { success: true, data: transfer };
  } catch (err: any) {
    logDbOperation('account_transfers', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'account_transfers', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudSaveBudget(
  userId: string,
  budget: Budget
): Promise<CloudOperationResult<Budget>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'budgets', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const budgetId = budget.id.includes(userId) ? budget.id : `budget-${userId}-${budget.month}`;
    const row = {
      id: budgetId,
      user_id: userId,
      month: budget.month,
      total_budget: budget.totalBudget || 0,
      category_budgets: (budget.categoryBudgets || {}) as any,
      subcategory_budgets: (budget.subcategoryBudgets || {}) as any,
    };

    const { error } = await client.from('budgets').upsert(row, { onConflict: 'user_id,month' });
    if (error) {
      logDbOperation('budgets', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'budgets', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('budgets', 'upsert', userId, true);
    return { success: true, data: budget };
  } catch (err: any) {
    logDbOperation('budgets', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'budgets', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudSaveUserSettings(
  userId: string,
  settings: { openingBalance?: number; reminderPreferences?: ReminderPreferences }
): Promise<CloudOperationResult<null>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'user_settings', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const updateObj: any = {
      user_id: userId,
      last_synced_at: new Date().toISOString(),
    };
    if (typeof settings.openingBalance === 'number') {
      updateObj.opening_balance = settings.openingBalance;
    }
    if (settings.reminderPreferences) {
      updateObj.reminder_prefs = settings.reminderPreferences;
    }

    const { error } = await client.from('user_settings').upsert(updateObj, { onConflict: 'user_id' });
    if (error) {
      logDbOperation('user_settings', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'user_settings', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('user_settings', 'upsert', userId, true);
    return { success: true, data: null };
  } catch (err: any) {
    logDbOperation('user_settings', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'user_settings', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudSaveMessage(
  userId: string,
  record: MessageRecord
): Promise<CloudOperationResult<MessageRecord>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'message_history', operation: 'upsert', message: 'Supabase client unavailable' },
    };
  }

  try {
    const row = {
      id: record.id,
      user_id: userId,
      person_id: record.personId || null,
      person_name: record.personName,
      recipient_phone: record.recipientPhone || null,
      message_content: record.messageContent,
      message_type: record.messageType,
      channel: record.channel,
      status: record.status,
      language: record.language || 'en',
      sent_at: record.sentAt,
    };

    const { error } = await client.from('message_history').upsert(row, { onConflict: 'id' });
    if (error) {
      logDbOperation('message_history', 'upsert', userId, false, error);
      return {
        success: false,
        error: { table: 'message_history', operation: 'upsert', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('message_history', 'upsert', userId, true);
    return { success: true, data: record };
  } catch (err: any) {
    logDbOperation('message_history', 'upsert', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'message_history', operation: 'upsert', message: err.message || 'Unknown network error' },
    };
  }
}

export async function cloudDeleteMessage(
  userId: string,
  messageId: string
): Promise<CloudOperationResult<null>> {
  const client = getSupabaseClient() as any;
  if (!client) {
    return {
      success: false,
      error: { table: 'message_history', operation: 'delete', message: 'Supabase client unavailable' },
    };
  }

  try {
    const { error } = await client.from('message_history').delete().eq('id', messageId).eq('user_id', userId);
    if (error) {
      logDbOperation('message_history', 'delete', userId, false, error);
      return {
        success: false,
        error: { table: 'message_history', operation: 'delete', code: error.code, message: error.message, details: error.details },
      };
    }

    logDbOperation('message_history', 'delete', userId, true);
    return { success: true, data: null };
  } catch (err: any) {
    logDbOperation('message_history', 'delete', userId, false, { message: err.message });
    return {
      success: false,
      error: { table: 'message_history', operation: 'delete', message: err.message || 'Unknown network error' },
    };
  }
}

// Single-record sync handlers (used by offlineSyncQueue)
export async function syncTransactionItem(
  userId: string,
  tx: Transaction,
  action: 'upsert' | 'delete'
): Promise<void> {
  if (action === 'delete') {
    const res = await cloudDeleteTransaction(userId, tx.id);
    if (!res.success) {
      throw new Error(`[transactions delete] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  } else {
    const res = await cloudSaveTransaction(userId, tx);
    if (!res.success) {
      throw new Error(`[transactions upsert] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  }
}

export async function syncKhataItem(
  userId: string,
  record: CreditDebtRecord,
  action: 'upsert' | 'delete'
): Promise<void> {
  if (action === 'delete') {
    const res = await cloudDeleteKhataRecord(userId, record.id);
    if (!res.success) {
      throw new Error(`[khata_transactions delete] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  } else {
    const res = await cloudSaveKhataRecord(userId, record);
    if (!res.success) {
      throw new Error(`[khata_transactions upsert] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  }
}

export async function syncPersonItem(
  userId: string,
  person: Person,
  action: 'upsert' | 'delete'
): Promise<void> {
  if (action === 'delete') {
    const res = await cloudDeletePerson(userId, person.id);
    if (!res.success) {
      throw new Error(`[khata_people delete] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  } else {
    const res = await cloudSavePerson(userId, person);
    if (!res.success) {
      throw new Error(`[khata_people upsert] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  }
}

export async function syncAccountItem(
  userId: string,
  account: Account,
  action: 'upsert' | 'delete'
): Promise<void> {
  if (action === 'delete') {
    const res = await cloudDeleteAccount(userId, account.id);
    if (!res.success) {
      throw new Error(`[accounts delete] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  } else {
    const res = await cloudSaveAccount(userId, account);
    if (!res.success) {
      throw new Error(`[accounts upsert] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  }
}

export async function syncTransferItem(
  userId: string,
  transfer: AccountTransfer
): Promise<void> {
  const res = await cloudSaveTransfer(userId, transfer);
  if (!res.success) {
    throw new Error(`[account_transfers upsert] ${res.error?.message} (${res.error?.code || 'ERR'})`);
  }
}

export async function syncBudgetItem(
  userId: string,
  budget: Budget
): Promise<void> {
  const res = await cloudSaveBudget(userId, budget);
  if (!res.success) {
    throw new Error(`[budgets upsert] ${res.error?.message} (${res.error?.code || 'ERR'})`);
  }
}

export async function syncMessageItem(
  userId: string,
  record: MessageRecord,
  action: 'upsert' | 'delete'
): Promise<void> {
  if (action === 'delete') {
    const res = await cloudDeleteMessage(userId, record.id);
    if (!res.success) {
      throw new Error(`[message_history delete] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  } else {
    const res = await cloudSaveMessage(userId, record);
    if (!res.success) {
      throw new Error(`[message_history upsert] ${res.error?.message} (${res.error?.code || 'ERR'})`);
    }
  }
}
