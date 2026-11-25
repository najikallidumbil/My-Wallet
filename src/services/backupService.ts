import { storage } from '../lib/storage';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { sha256Hex } from '../lib/crypto';
import { CloudPayload } from './cloudSync';

export interface WalletBackupRecordCounts {
  transactions: number;
  khataRecords: number;
  people: number;
  accounts: number;
  budgets: number;
  attachments: number;
}

export interface WalletBackupEntry {
  id: string;
  userId: string;
  backupName: string;
  backupType: 'manual' | 'auto';
  recordCounts: WalletBackupRecordCounts;
  data: CloudPayload;
  checksum: string;
  createdAt: string;
  isCloudSynced: boolean;
}

const LOCAL_BACKUP_HISTORY_KEY = 'my_wallet_backup_history_v1';
const LAST_BACKUP_TIME_KEY = 'my_wallet_last_backup_time_v1';
const MAX_LOCAL_BACKUPS = 10;

const getLocalBackupKey = (userId?: string) => (userId ? `${LOCAL_BACKUP_HISTORY_KEY}_${userId}` : LOCAL_BACKUP_HISTORY_KEY);
const getLastBackupTimeKey = (userId?: string) => (userId ? `${LAST_BACKUP_TIME_KEY}_${userId}` : LAST_BACKUP_TIME_KEY);

/**
 * Get the timestamp of the last successful backup
 */
export async function getLastBackupTimestamp(userId?: string): Promise<string | null> {
  return await storage.getItem(getLastBackupTimeKey(userId));
}

/**
 * Get local & cloud backup history
 */
export async function getBackupHistory(userId?: string): Promise<WalletBackupEntry[]> {
  const localList: WalletBackupEntry[] = [];
  try {
    const raw = await storage.getItem(getLocalBackupKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localList.push(...parsed);
      }
    }
  } catch (err) {
    console.warn('Error reading local backup history:', err);
  }

  // If user is connected to Supabase, query cloud backups
  const client = getSupabaseClient() as any;
  if (userId && client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('wallet_backups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && Array.isArray(data)) {
        const cloudList: WalletBackupEntry[] = data.map((b: any) => ({
          id: b.id,
          userId: b.user_id,
          backupName: b.backup_name,
          backupType: b.backup_type,
          recordCounts: b.record_counts || {},
          data: b.data,
          checksum: b.checksum,
          createdAt: b.created_at,
          isCloudSynced: true,
        }));

        // Merge local & cloud list by unique ID
        const map = new Map<string, WalletBackupEntry>();
        cloudList.forEach((item) => map.set(item.id, item));
        localList.forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item);
        });

        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn('Error querying cloud backups:', err);
    }
  }

  return localList.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Create a full wallet backup snapshot (saved locally and to Supabase Cloud)
 */
export async function createWalletBackup(
  userId: string,
  payload: CloudPayload,
  backupType: 'manual' | 'auto' = 'manual'
): Promise<{ success: boolean; backup?: WalletBackupEntry; error?: string }> {
  try {
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const dateFormatted = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const recordCounts: WalletBackupRecordCounts = {
      transactions: payload.transactions.length,
      khataRecords: payload.creditDebtRecords.length,
      people: payload.people.length,
      accounts: payload.accounts.length,
      budgets: payload.budgets.length,
      attachments: payload.transactions.reduce((acc, t) => acc + (t.attachments?.length || 0), 0),
    };

    const payloadString = JSON.stringify(payload);
    const checksum = await sha256Hex(payloadString);

    const backupName = `${backupType === 'auto' ? 'Auto Backup' : 'Manual Backup'} (${dateFormatted})`;

    const backupEntry: WalletBackupEntry = {
      id: backupId,
      userId,
      backupName,
      backupType,
      recordCounts,
      data: payload,
      checksum,
      createdAt: nowIso,
      isCloudSynced: false,
    };

    // 1. Save to Supabase Cloud if online
    const client = getSupabaseClient() as any;
    if (userId && client && isSupabaseConfigured()) {
      try {
        const { error } = await client.from('wallet_backups').insert({
          id: backupId,
          user_id: userId,
          backup_name: backupName,
          backup_type: backupType,
          record_counts: recordCounts,
          data: payload,
          checksum,
          created_at: nowIso,
        });

        if (!error) {
          backupEntry.isCloudSynced = true;
        } else {
          console.warn('Cloud backup table insert notice:', error.message);
        }
      } catch (cloudErr) {
        console.warn('Cloud backup insert failed:', cloudErr);
      }
    }

    // 2. Save into local backup history
    const history = await getBackupHistory(userId);
    const updatedHistory = [backupEntry, ...history.filter((h) => h.id !== backupId)].slice(
      0,
      MAX_LOCAL_BACKUPS
    );

    await storage.setItem(getLocalBackupKey(userId), JSON.stringify(updatedHistory));
    await storage.setItem(getLastBackupTimeKey(userId), nowIso);

    return { success: true, backup: backupEntry };
  } catch (err: any) {
    console.warn('createWalletBackup error:', err);
    return { success: false, error: err.message || 'Failed to generate backup' };
  }
}

/**
 * Check if 24 hours have passed since last backup and trigger automatic backup
 */
export async function checkAndTriggerAutoBackup(
  userId: string,
  payload: CloudPayload
): Promise<void> {
  // If user has zero data, skip auto backup
  const totalItems = payload.transactions.length + payload.creditDebtRecords.length;
  if (totalItems === 0) return;

  try {
    const lastTimeStr = await getLastBackupTimestamp(userId);
    if (!lastTimeStr) {
      // First time backup
      await createWalletBackup(userId, payload, 'auto');
      return;
    }

    const lastTime = new Date(lastTimeStr).getTime();
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (now - lastTime >= ONE_DAY_MS) {
      await createWalletBackup(userId, payload, 'auto');
    }
  } catch (e) {
    console.warn('checkAndTriggerAutoBackup error:', e);
  }
}
