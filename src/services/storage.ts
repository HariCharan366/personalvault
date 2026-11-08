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
  const storagePath = `${userId}/${documentId}.enc`;

  // Always write to local encrypted object store for offline resilience and fast caching
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
  } catch (err) {
    console.warn('Local cache write failed:', err);
  }

  if (isSupabaseConfigured()) {
    try {
      const payload = encryptedData instanceof Blob
        ? encryptedData
        : (encryptedData instanceof Uint8Array ? encryptedData : new Uint8Array(encryptedData));

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, payload, {
          contentType: 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        console.warn('Supabase storage upload error, relying on local copy:', error);
        return { storagePath };
      }

      return { storagePath };
    } catch (err: any) {
      console.warn('Supabase upload exception, relying on local copy:', err);
      return { storagePath };
    }
  }

  return { storagePath };
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

      if (!error && data) {
        const buffer = await data.arrayBuffer();
        // Cache to local IndexedDB for future instant offline access
        try {
          const db = await openLocalDb();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(new Uint8Array(buffer), storagePath);
        } catch {}
        return { data: buffer };
      }
    } catch (err: any) {
      console.warn('Supabase download error, checking local store:', err);
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
 * Syncs any locally stored encrypted ciphertext blobs up to Supabase Storage.
 */
export async function syncLocalFilesToCloud(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const db = await openLocalDb();
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    for (const key of keys) {
      const storagePath = String(key);
      const rawData = await new Promise<any>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(storagePath);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (rawData) {
        let payload: Uint8Array | Blob;
        if (rawData instanceof Uint8Array) {
          payload = rawData;
        } else if (rawData instanceof ArrayBuffer) {
          payload = new Uint8Array(rawData);
        } else if (typeof Blob !== 'undefined' && rawData instanceof Blob) {
          payload = rawData;
        } else {
          payload = new Uint8Array(rawData);
        }

        await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, payload, {
          contentType: 'application/octet-stream',
          upsert: true,
        });
      }
    }
  } catch (e) {
    console.warn('Sync local files to cloud fallback:', e);
  }
}

/**
 * Permanently deletes an encrypted file from cloud storage.
 */
export async function deleteEncryptedFile(storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await openLocalDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(storagePath);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Local storage delete error:', err);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    } catch (err: any) {
      console.warn('Supabase storage delete error:', err);
    }
  }

  return { success: true };
}
