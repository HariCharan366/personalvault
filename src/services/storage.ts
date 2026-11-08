import { supabase, isSupabaseConfigured, STORAGE_BUCKET } from '@/integrations/supabase';

// Local IndexedDB cache/storage for mock/offline fallback
const DB_NAME = 'personalvault_local_storage';
const STORE_NAME = 'encrypted_files';

function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Uploads an encrypted file (Blob/ArrayBuffer) to Supabase Storage or local secure blobstore.
 * Storage path format: {userId}/{documentId}.enc
 */
export async function uploadEncryptedFile(
  userId: string,
  documentId: string,
  encryptedData: ArrayBuffer | Blob
): Promise<{ storagePath: string; error?: string }> {
  const blob = encryptedData instanceof Blob ? encryptedData : new Blob([encryptedData], { type: 'application/octet-stream' });
  const storagePath = `${userId}/${documentId}.enc`;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, {
          contentType: 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        return { storagePath: '', error: error.message };
      }

      return { storagePath };
    } catch (err: any) {
      return { storagePath: '', error: err?.message || 'Storage upload failed' };
    }
  }

  // Fallback to local encrypted object store
  try {
    const rawBytes = encryptedData instanceof Blob
      ? new Uint8Array(await encryptedData.arrayBuffer())
      : new Uint8Array(encryptedData);

    const db = await openLocalDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(rawBytes, storagePath);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    return { storagePath };
  } catch (err: any) {
    return { storagePath: '', error: err?.message || 'Local storage write failed' };
  }
}

/**
 * Downloads the encrypted file ciphertext as an ArrayBuffer from Supabase Storage or local blobstore.
 */
export async function downloadEncryptedFile(storagePath: string): Promise<{ data: ArrayBuffer | null; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);

      if (error || !data) {
        return { data: null, error: error?.message || 'Failed to download encrypted file' };
      }

      const buffer = await data.arrayBuffer();
      return { data: buffer };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Download error' };
    }
  }

  // Fallback to local encrypted object store
  try {
    const db = await openLocalDb();
    const data = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(storagePath);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!data) {
      return { data: null, error: 'Encrypted object not found in storage' };
    }

    let buffer: ArrayBuffer;
    if (data instanceof Uint8Array || (data && (data as any).buffer instanceof ArrayBuffer)) {
      const u = data as unknown as Uint8Array;
      buffer = (u.buffer as ArrayBuffer).slice(u.byteOffset, u.byteOffset + u.byteLength);
    } else if (data instanceof ArrayBuffer) {
      buffer = data;
    } else if (data && typeof (data as any).arrayBuffer === 'function') {
      buffer = await (data as Blob).arrayBuffer();
    } else if (data && (data as any).length !== undefined) {
      buffer = new Uint8Array(data as any).buffer as ArrayBuffer;
    } else {
      buffer = new ArrayBuffer(0);
    }
    return { data: buffer };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Local storage read failed' };
  }
}

/**
 * Permanently deletes an encrypted file from cloud storage.
 */
export async function deleteEncryptedFile(storagePath: string): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  try {
    const db = await openLocalDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(storagePath);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
