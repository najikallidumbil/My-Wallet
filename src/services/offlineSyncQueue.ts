import { storage } from '../lib/storage';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  syncTransactionItem,
  syncKhataItem,
  syncPersonItem,
  syncAccountItem,
  syncTransferItem,
  syncBudgetItem,
  syncMessageItem,
} from './cloudSync';

export type SyncEntityType =
  | 'transaction'
  | 'khata'
  | 'person'
  | 'account'
  | 'transfer'
  | 'budget'
  | 'message'
  | 'settings';

export interface QueuedSyncItem {
  id: string; // Queue entry ID
  userId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: 'upsert' | 'delete';
  payload: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'my_wallet_offline_sync_queue_v1';
const MAX_RETRIES = 5;

// In-memory queue cache
let inMemoryQueue: QueuedSyncItem[] | null = null;
let isProcessingQueue = false;

// Queue change listeners
type QueueListener = (pendingCount: number, isSyncing: boolean) => void;
const listeners = new Set<QueueListener>();

function notifyListeners(pendingCount: number, isSyncing: boolean) {
  listeners.forEach((cb) => {
    try {
      cb(pendingCount, isSyncing);
    } catch (e) {
      console.warn('Queue listener error:', e);
    }
  });
}

export function subscribeToSyncQueue(callback: QueueListener): () => void {
  listeners.add(callback);
  callback(inMemoryQueue ? inMemoryQueue.length : 0, isProcessingQueue);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Load sync queue from persistent storage
 */
export async function getSyncQueue(): Promise<QueuedSyncItem[]> {
  if (inMemoryQueue !== null) {
    return inMemoryQueue;
  }
  try {
    const raw = await storage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryQueue = parsed;
        return inMemoryQueue;
      }
    }
  } catch (err) {
    console.warn('Error reading sync queue from storage:', err);
  }
  inMemoryQueue = [];
  return inMemoryQueue;
}

/**
 * Save sync queue to persistent storage
 */
async function saveSyncQueue(queue: QueuedSyncItem[]): Promise<void> {
  inMemoryQueue = queue;
  try {
    await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Error saving sync queue to storage:', err);
  }
  notifyListeners(queue.length, isProcessingQueue);
}

/**
 * Enqueue a sync operation for immediate or deferred execution
 */
export async function enqueueSyncItem(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  action: 'upsert' | 'delete',
  payload: any
): Promise<void> {
  if (!userId) return;

  const queue = await getSyncQueue();

  // Deduplicate: if an entry for this entityId already exists in queue, update it
  const existingIndex = queue.findIndex(
    (item) => item.entityType === entityType && item.entityId === entityId
  );

  const entry: QueuedSyncItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    entityType,
    entityId,
    action,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (existingIndex >= 0) {
    // If the new action is delete, replace previous upsert with delete
    queue[existingIndex] = entry;
  } else {
    queue.push(entry);
  }

  await saveSyncQueue(queue);

  // Attempt to trigger queue processing in background
  processSyncQueue().catch(() => {});
}

/**
 * Process a single queued item against Supabase Cloud
 */
async function executeSyncItem(item: QueuedSyncItem): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient() as any;
  if (!client || !isSupabaseConfigured()) {
    return { success: false, error: 'Supabase client is offline or not configured' };
  }

  try {
    switch (item.entityType) {
      case 'transaction':
        await syncTransactionItem(item.userId, item.payload, item.action);
        return { success: true };

      case 'khata':
        await syncKhataItem(item.userId, item.payload, item.action);
        return { success: true };

      case 'person':
        await syncPersonItem(item.userId, item.payload, item.action);
        return { success: true };

      case 'account':
        await syncAccountItem(item.userId, item.payload, item.action);
        return { success: true };

      case 'transfer':
        await syncTransferItem(item.userId, item.payload);
        return { success: true };

      case 'budget':
        await syncBudgetItem(item.userId, item.payload);
        return { success: true };

      case 'message':
        await syncMessageItem(item.userId, item.payload, item.action);
        return { success: true };

      case 'settings':
        await client.from('user_settings').upsert({
          user_id: item.userId,
          opening_balance: item.payload.openingBalance,
          reminder_prefs: item.payload.reminderPreferences,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        return { success: true };

      default:
        return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Operation failed' };
  }
}

/**
 * Drain the sync queue in FIFO order with retries
 */
export async function processSyncQueue(targetUserId?: string): Promise<{
  processedCount: number;
  remainingCount: number;
  errors: string[];
}> {
  if (isProcessingQueue) {
    const queue = await getSyncQueue();
    return { processedCount: 0, remainingCount: queue.length, errors: [] };
  }

  if (!isSupabaseConfigured()) {
    const queue = await getSyncQueue();
    return { processedCount: 0, remainingCount: queue.length, errors: ['Supabase is not configured'] };
  }

  isProcessingQueue = true;
  const queue = await getSyncQueue();
  notifyListeners(queue.length, true);

  let processedCount = 0;
  const errors: string[] = [];
  const remainingQueue: QueuedSyncItem[] = [];

  for (const item of queue) {
    if (targetUserId && item.userId !== targetUserId) {
      // Belongs to another user session; keep in queue for when that user logs in
      remainingQueue.push(item);
      continue;
    }

    const result = await executeSyncItem(item);
    if (result.success) {
      processedCount++;
    } else {
      item.retryCount += 1;
      item.lastError = result.error;
      errors.push(`${item.entityType} ${item.entityId}: ${result.error}`);

      if (item.retryCount <= MAX_RETRIES) {
        remainingQueue.push(item);
      } else {
        // Drop after exceeding max retries, but keep logged
        console.warn(`Item ${item.id} (${item.entityType}:${item.entityId}) dropped after ${MAX_RETRIES} attempts.`);
      }
    }
  }

  await saveSyncQueue(remainingQueue);
  isProcessingQueue = false;
  notifyListeners(remainingQueue.length, false);

  return {
    processedCount,
    remainingCount: remainingQueue.length,
    errors,
  };
}

/**
 * Get count of pending sync items
 */
export async function getPendingSyncCount(forUserId?: string): Promise<number> {
  const queue = await getSyncQueue();
  if (forUserId) {
    return queue.filter((i) => i.userId === forUserId).length;
  }
  return queue.length;
}

/**
 * Clear the entire sync queue (e.g. on user reset)
 */
export async function clearSyncQueue(): Promise<void> {
  await saveSyncQueue([]);
}
