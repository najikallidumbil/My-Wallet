import { getSupabaseClient } from '../lib/supabase';
import { Attachment } from '../types';

const BUCKET_NAME = 'wallet-attachments';

function decodeBase64ToUint8(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bufferLength = Math.floor(base64.length * 0.75);
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== -1) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== -1) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes.subarray(0, p);
}

/**
 * Upload an attachment file/base64 to Supabase Storage under user-specific path:
 * `${userId}/${attachmentId}/${cleanFileName}`
 */
export async function uploadAttachmentToCloud(
  userId: string,
  attachment: Attachment
): Promise<{ storagePath?: string; publicUrl?: string; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase client is not available' };
  }

  try {
    const cleanFileName = attachment.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${attachment.id}/${cleanFileName}`;

    let bodyData: ArrayBuffer;

    if (attachment.dataUrl && attachment.dataUrl.includes(',')) {
      const base64Data = attachment.dataUrl.split(',')[1];
      const uint8 = decodeBase64ToUint8(base64Data);
      bodyData = uint8.buffer as ArrayBuffer;
    } else {
      return { error: 'No data URL found on attachment' };
    }

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, bodyData, {
        contentType: attachment.fileType || 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload error:', error.message);
      return { error: error.message };
    }

    // Generate signed URL (expires in 1 year) or fallback to public URL
    const { data: signedData } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    const publicUrl = signedData?.signedUrl || filePath;

    return { storagePath: filePath, publicUrl };
  } catch (err: any) {
    console.warn('uploadAttachmentToCloud failed:', err);
    return { error: err.message || 'Upload failed' };
  }
}

/**
 * Delete attachment from Supabase Storage
 */
export async function deleteAttachmentFromCloud(
  _userId: string,
  filePath: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.storage.from(BUCKET_NAME).remove([filePath]);
    if (error) {
      console.warn('Storage delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('deleteAttachmentFromCloud failed:', err);
    return false;
  }
}
