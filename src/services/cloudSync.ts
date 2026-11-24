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
  openingBalance: number;
  accounts: Account[];
  accountTransfers: AccountTransfer[];
  categories: Category[];
  budgets: Budget[];
  people: Person[];
  creditDebtRecords: CreditDebtRecord[];
  transactions: Transaction[];
  reminderPreferences: ReminderPreferences;
}

// Fetch all user data from Supabase
export async function fetchUserDataFromCloud(userId: string): Promise<CloudFetchResult | null> {
  const client = getSupabaseClient() as any;
  if (!client) return null;

  try {
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
    ]);

    const hasData = Boolean(
      (transactionsRes.data && transactionsRes.data.length > 0) ||
      (khataRes.data && khataRes.data.length > 0) ||
      (accountsRes.data && accountsRes.data.length > 0) ||
      (peopleRes.data && peopleRes.data.length > 0)
    );

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

    return {
      hasData,
      openingBalance,
      accounts,
      accountTransfers,
      categories,
      budgets,
      people,
      creditDebtRecords,
      transactions,
      reminderPreferences,
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
    await client.from('user_settings').upsert({
      user_id: userId,
      opening_balance: payload.openingBalance,
      reminder_prefs: payload.reminderPreferences as any,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
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
      await client.from('accounts').upsert(rows, { onConflict: 'id' });
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
      await client.from('account_transfers').upsert(rows, { onConflict: 'id' });
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
      await client.from('categories').upsert(rows, { onConflict: 'id' });
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
      await client.from('khata_people').upsert(rows, { onConflict: 'id' });
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
      await client.from('khata_transactions').upsert(rows, { onConflict: 'id' });
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
      await client.from('transactions').upsert(rows, { onConflict: 'id' });
      syncedCount += rows.length;
    }

    // 8. Budgets
    if (payload.budgets.length > 0) {
      const rows = payload.budgets.map((b) => ({
        id: b.id,
        user_id: userId,
        month: b.month,
        total_budget: b.totalBudget || 0,
        category_budgets: (b.categoryBudgets || {}) as any,
        subcategory_budgets: (b.subcategoryBudgets || {}) as any,
      }));
      await client.from('budgets').upsert(rows, { onConflict: 'id' });
      syncedCount += rows.length;
    }

    return { success: true, syncedItemsCount: syncedCount };
  } catch (err: any) {
    console.warn('syncAllDataToCloud error:', err);
    return { success: false, syncedItemsCount: 0, error: err.message || 'Cloud sync failed' };
  }
}

// Single-record sync handlers
export async function syncTransactionItem(
  userId: string,
  tx: Transaction,
  action: 'upsert' | 'delete'
): Promise<void> {
  const client = getSupabaseClient() as any;
  if (!client) return;

  try {
    if (action === 'delete') {
      await client.from('transactions').delete().eq('id', tx.id).eq('user_id', userId);
    } else {
      await client.from('transactions').upsert({
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
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('syncTransactionItem error:', err);
  }
}

export async function syncKhataItem(
  userId: string,
  record: CreditDebtRecord,
  action: 'upsert' | 'delete'
): Promise<void> {
  const client = getSupabaseClient() as any;
  if (!client) return;

  try {
    if (action === 'delete') {
      await client.from('khata_transactions').delete().eq('id', record.id).eq('user_id', userId);
    } else {
      await client.from('khata_transactions').upsert({
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
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('syncKhataItem error:', err);
  }
}

export async function syncPersonItem(
  userId: string,
  person: Person,
  action: 'upsert' | 'delete'
): Promise<void> {
  const client = getSupabaseClient() as any;
  if (!client) return;

  try {
    if (action === 'delete') {
      await client.from('khata_people').delete().eq('id', person.id).eq('user_id', userId);
    } else {
      await client.from('khata_people').upsert({
        id: person.id,
        user_id: userId,
        name: person.name,
        phone: person.phone || null,
        email: person.email || null,
        notes: person.notes || null,
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('syncPersonItem error:', err);
  }
}

export async function syncAccountItem(
  userId: string,
  account: Account,
  action: 'upsert' | 'delete'
): Promise<void> {
  const client = getSupabaseClient() as any;
  if (!client) return;

  try {
    if (action === 'delete') {
      await client.from('accounts').delete().eq('id', account.id).eq('user_id', userId);
    } else {
      await client.from('accounts').upsert({
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
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('syncAccountItem error:', err);
  }
}

export async function syncTransferItem(
  userId: string,
  transfer: AccountTransfer
): Promise<void> {
  const client = getSupabaseClient() as any;
  if (!client) return;

  try {
    await client.from('account_transfers').upsert({
      id: transfer.id,
      user_id: userId,
      from_account_id: transfer.fromAccountId || null,
      to_account_id: transfer.toAccountId || null,
      amount: transfer.amount,
      transfer_date: transfer.date,
      transfer_time: transfer.time || '12:00',
      notes: transfer.notes || null,
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('syncTransferItem error:', err);
  }
}
