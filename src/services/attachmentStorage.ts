import { Attachment } from '../types';

const DB_NAME = 'my_wallet_attachments_db';
const DB_VERSION = 1;
const STORE_NAME = 'attachments_store';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

/**
 * Format bytes into readable string (e.g. 2.4 MB, 450 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Open or initialize the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store attachment dataUrl in IndexedDB
 */
export async function storeAttachmentData(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, dataUrl, savedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to memory/session', err);
  }
}

/**
 * Retrieve attachment dataUrl from IndexedDB
 */
export async function getAttachmentData(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve(req.result ? req.result.dataUrl : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB retrieve failed', err);
    return null;
  }
}

/**
 * Remove attachment from IndexedDB
 */
export async function removeAttachmentData(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed', err);
  }
}

/**
 * Validate a file's mime type and size
 */
export function validateAttachmentFile(file: File): { valid: boolean; error?: string } {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  const hasValidExt = SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const hasValidMime = SUPPORTED_MIME_TYPES.includes(mimeType) || hasValidExt;

  if (!hasValidMime) {
    return {
      valid: false,
      error: `Unsupported file format "${file.name}". Please attach JPG, JPEG, PNG, WEBP, or PDF files.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the 10 MB limit (${formatFileSize(file.size)}).`,
    };
  }

  return { valid: true };
}

/**
 * Read File object to base64 Data URL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a File into an Attachment object and persists it to IndexedDB
 */
export async function processFileToAttachment(file: File): Promise<Attachment> {
  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const dataUrl = await readFileAsDataUrl(file);

  // Persist to IndexedDB
  await storeAttachmentData(id, dataUrl);

  const attachment: Attachment = {
    id,
    fileName: file.name,
    fileType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    fileSize: file.size,
    storagePath: `attachments/${id}/${file.name}`,
    dataUrl, // Included for offline instant preview & view
    createdAt: new Date().toISOString(),
  };

  return attachment;
}
