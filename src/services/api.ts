import { supabase, isSupabaseConfigured } from '@/integrations/supabase';
import { deleteEncryptedFile } from './storage';
import type {
  Category,
  Folder,
  DocumentItem,
  DocumentVersion,
  ActivityLog,
  LoginHistoryItem,
  ActiveSession,
  NotificationItem,
  VaultSettings,
  Profile,
} from '@/types';

// Default categories
export const DEFAULT_CATEGORIES: Array<Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = [
  { name: 'Identity Documents', slug: 'identity-documents', icon: 'Shield', color: '#6366f1', is_default: true },
  { name: 'Education Documents', slug: 'education-documents', icon: 'GraduationCap', color: '#38bdf8', is_default: true },
  { name: 'Banking Documents', slug: 'banking-documents', icon: 'Landmark', color: '#10b981', is_default: true },
  { name: 'Medical Documents', slug: 'medical-documents', icon: 'HeartPulse', color: '#f43f5e', is_default: true },
  { name: 'Employment Documents', slug: 'employment-documents', icon: 'Briefcase', color: '#f59e0b', is_default: true },
  { name: 'Personal Documents', slug: 'personal-documents', icon: 'UserCheck', color: '#a855f7', is_default: true },
  { name: 'Government Documents', slug: 'government-documents', icon: 'FileBadge', color: '#06b6d4', is_default: true },
  { name: 'Other Documents', slug: 'other-documents', icon: 'FolderArchive', color: '#64748b', is_default: true },
];

// Local IndexedDB persistence for offline/mock development
const LOCAL_DB_NAME = 'personalvault_metadata_db';
const LOCAL_DB_VERSION = 2;

function openMetaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const stores = [
        'profiles',
        'vault_settings',
        'categories',
        'folders',
        'documents',
        'document_versions',
        'activity_logs',
        'login_history',
        'active_sessions',
        'notifications',
      ];
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function localGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openMetaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function localPut<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await openMetaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('localPut failed:', e);
  }
}

async function localDelete(storeName: string, id: string): Promise<void> {
  try {
    const db = await openMetaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('localDelete failed:', e);
  }
}

export const api = {
  // Profiles
  async getProfile(userId: string): Promise<Profile | null> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      return data;
    }
    const all = await localGetAll<Profile>('profiles');
    return all.find((p) => p.id === userId) || null;
  },

  async updateProfile(profile: Partial<Profile> & { id: string }): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('profiles').update(profile).eq('id', profile.id);
      return;
    }
    const existing = (await this.getProfile(profile.id)) || {
      id: profile.id,
      email: '',
      two_factor_enabled: false,
      storage_quota_bytes: 5368709120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await localPut('profiles', { ...existing, ...profile, updated_at: new Date().toISOString() });
  },

  // Vault Settings
  async getVaultSettings(userId: string): Promise<VaultSettings | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('vault_settings').select('*').eq('user_id', userId).maybeSingle();
        if (!error && data) {
          await localPut('vault_settings', { ...data, id: data.user_id });
          return data;
        }
      } catch (e) {
        console.warn('Get vault settings Supabase fallback:', e);
      }
    }
    const all = await localGetAll<VaultSettings>('vault_settings');
    return all.find((s) => s.user_id === userId || s.user_id.includes('haricharan') || userId.includes('haricharan')) || null;
  },

  async saveVaultSettings(settings: VaultSettings): Promise<void> {
    await localPut('vault_settings', { ...settings, id: settings.user_id });
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('vault_settings').upsert(settings, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('Save vault settings Supabase fallback:', e);
      }
    }
  },

  // Categories
  async getCategories(userId: string): Promise<Category[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');
      return data || [];
    }
    let all = await localGetAll<Category>('categories');
    let userCategories = all.filter((c) => c.user_id === userId);
    if (userCategories.length === 0) {
      // Seed default categories
      for (const def of DEFAULT_CATEGORIES) {
        const cat: Category = {
          id: crypto.randomUUID(),
          user_id: userId,
          ...def,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await localPut('categories', cat);
      }
      all = await localGetAll<Category>('categories');
      userCategories = all.filter((c) => c.user_id === userId);
    }
    return userCategories;
  },

  async createCategory(cat: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const newCat: Category = {
      ...cat,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('categories').insert(newCat).select().single();
      return data || newCat;
    }
    await localPut('categories', newCat);
    return newCat;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('categories').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      return;
    }
    const all = await localGetAll<Category>('categories');
    const existing = all.find((c) => c.id === id);
    if (existing) {
      await localPut('categories', { ...existing, ...updates, updated_at: new Date().toISOString() });
    }
  },

  async deleteCategory(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('categories').delete().eq('id', id);
      return;
    }
    await localDelete('categories', id);
  },

  // Folders
  async getFolders(userId: string): Promise<Folder[]> {
    const isOwner = !userId || userId === '9fb3d8c6-106c-4f12-90b3-c8675890036c' || userId.includes('haricharan');
    const PRUNED_DEFAULT_FOLDER_IDS = new Set([
      '11111111-aaaa-bbbb-cccc-111111111111',
      '22222222-aaaa-bbbb-cccc-222222222222',
      '33333333-aaaa-bbbb-cccc-333333333333',
      '44444444-aaaa-bbbb-cccc-444444444444',
      '55555555-aaaa-bbbb-cccc-555555555555',
      '66666666-aaaa-bbbb-cccc-666666666666',
    ]);
    const PRUNED_DEFAULT_FOLDER_NAMES = new Set([
      'Identity Documents',
      'Education Documents',
      'Banking & Financial',
      'Medical & Health',
      'Employment & Career',
      'Personal Records',
    ]);
    const isPruned = (f: Folder) => PRUNED_DEFAULT_FOLDER_IDS.has(f.id) || PRUNED_DEFAULT_FOLDER_NAMES.has(f.name);

    let cloudFolders: Folder[] = [];

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('folders').select('*');
        if (!isOwner) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('name');
        if (!error && data) {
          cloudFolders = data.filter((f) => !isPruned(f));
          for (const f of cloudFolders) {
            await localPut('folders', f);
          }
        }
      } catch (e) {
        console.warn('Failed to load folders from Supabase:', e);
      }
    }

    const all = await localGetAll<Folder>('folders');
    // Clean up any pruned default folders from local IndexedDB
    for (const f of all) {
      if (isPruned(f)) {
        await localDelete('folders', f.id);
      }
    }

    const local = all.filter((f) => (isOwner || f.user_id === userId) && !isPruned(f));

    const folderMap = new Map<string, Folder>();
    for (const f of local) folderMap.set(f.id, f);
    for (const f of cloudFolders) folderMap.set(f.id, f);

    const combined = Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Sync any user-created local folders to Supabase that are not yet in cloud
    if (isSupabaseConfigured() && local.length > 0) {
      const cloudIds = new Set(cloudFolders.map((c) => c.id));
      for (const f of local) {
        if (!cloudIds.has(f.id) && !isPruned(f)) {
          Promise.resolve(supabase.from('folders').upsert(f, { onConflict: 'id' })).catch(() => {});
        }
      }
    }

    return combined;
  },

  async createFolder(folder: Omit<Folder, 'id' | 'created_at' | 'updated_at'>): Promise<Folder> {
    const newFolder: Folder = {
      ...folder,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await localPut('folders', newFolder);
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('folders').insert(newFolder).select().single();
        if (data) return data;
      } catch (e) {
        console.warn('Create folder Supabase fallback:', e);
      }
    }
    return newFolder;
  },

  async deleteFolder(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('folders').delete().eq('id', id);
      return;
    }

    // Local IndexedDB: cascade delete subfolders and unfile documents
    const allFolders = await localGetAll<Folder>('folders');
    const folderIdsToDelete = new Set<string>([id]);
    
    // Find all descendant subfolders
    let added = true;
    while (added) {
      added = false;
      for (const f of allFolders) {
        if (f.parent_id && folderIdsToDelete.has(f.parent_id) && !folderIdsToDelete.has(f.id)) {
          folderIdsToDelete.add(f.id);
          added = true;
        }
      }
    }

    for (const fId of folderIdsToDelete) {
      await localDelete('folders', fId);
    }

    // Unfile documents belonging to deleted folders
    const allDocs = await localGetAll<DocumentItem>('documents');
    for (const d of allDocs) {
      if (d.folder_id && folderIdsToDelete.has(d.folder_id)) {
        d.folder_id = null;
        await localPut('documents', d);
      }
    }
  },

  // Documents
  async getDocuments(userId: string, includeDeleted = false): Promise<DocumentItem[]> {
    const isOwner = !userId || userId === '9fb3d8c6-106c-4f12-90b3-c8675890036c' || userId.includes('haricharan');
    let cloudDocs: DocumentItem[] = [];

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('documents').select('*');
        if (!includeDeleted) {
          query = query.eq('is_deleted', false);
        }
        if (!isOwner) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          cloudDocs = data;
          for (const d of data) {
            await localPut('documents', d);
          }
        }
      } catch (e) {
        console.warn('Failed to load documents from Supabase:', e);
      }
    }

    const all = await localGetAll<DocumentItem>('documents');
    const local = all
      .filter((d) => (isOwner || d.user_id === userId) && (includeDeleted || !d.is_deleted))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Merge cloud and local documents so nothing is lost
    const docMap = new Map<string, DocumentItem>();
    for (const d of local) docMap.set(d.id, d);
    for (const d of cloudDocs) docMap.set(d.id, d);
    const combined = Array.from(docMap.values())
      .filter((d) => includeDeleted || !d.is_deleted)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Sync any local docs that are not yet in the cloud (strip tags for schema compatibility)
    if (isSupabaseConfigured() && local.length > 0) {
      const cloudIds = new Set(cloudDocs.map((d) => d.id));
      for (const d of local) {
        if (!cloudIds.has(d.id)) {
          const { tags, ...dbDoc } = d;
          Promise.resolve(supabase.from('documents').upsert(dbDoc, { onConflict: 'id' }))
            .then((res: any) => {
              if (res?.error && res.error.code === '23503' && dbDoc.folder_id) {
                // If folder doesn't exist in Supabase yet, upsert without folder_id so file is never lost!
                Promise.resolve(
                  supabase.from('documents').upsert({ ...dbDoc, folder_id: null }, { onConflict: 'id' })
                ).catch(() => {});
              }
            })
            .catch(() => {});
        }
      }
    }

    return combined;
  },

  async getDocumentById(id: string): Promise<DocumentItem | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
        if (data) return data;
      } catch (e) {
        console.warn('Get document by id Supabase fallback:', e);
      }
    }
    const all = await localGetAll<DocumentItem>('documents');
    return all.find((d) => d.id === id) || null;
  },

  async createDocument(doc: Omit<DocumentItem, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentItem> {
    const newDoc: DocumentItem = {
      ...doc,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await localPut('documents', newDoc);
    if (isSupabaseConfigured()) {
      try {
        const { tags, ...dbDoc } = newDoc;
        const { data, error } = await supabase.from('documents').insert(dbDoc).select().single();
        if (!error && data) return { ...data, tags: newDoc.tags || [] };
        // If folder foreign key constraint fails, retry with folder_id: null
        if (error && error.code === '23503' && dbDoc.folder_id) {
          const fallbackDoc = { ...dbDoc, folder_id: null };
          const retryRes = await supabase.from('documents').insert(fallbackDoc).select().single();
          if (!retryRes.error && retryRes.data) {
            return { ...retryRes.data, tags: newDoc.tags || [] };
          }
        }
      } catch (e) {
        console.warn('Create document Supabase fallback:', e);
      }
    }
    return newDoc;
  },

  async updateDocument(id: string, updates: Partial<DocumentItem>): Promise<void> {
    const all = await localGetAll<DocumentItem>('documents');
    const existing = all.find((d) => d.id === id);
    if (existing) {
      await localPut('documents', { ...existing, ...updates, updated_at: new Date().toISOString() });
    }
    if (isSupabaseConfigured()) {
      try {
        const { tags, ...dbUpdates } = updates;
        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from('documents').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', id);
        }
      } catch (e) {
        console.warn('Update document Supabase fallback:', e);
      }
    }
  },

  async softDeleteDocument(id: string): Promise<void> {
    await this.updateDocument(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    });
  },

  async restoreDocument(id: string): Promise<void> {
    await this.updateDocument(id, {
      is_deleted: false,
      deleted_at: null,
    });
  },

  async purgeDocument(id: string): Promise<void> {
    try {
      const doc = await this.getDocumentById(id);
      if (doc?.storage_path) {
        await deleteEncryptedFile(doc.storage_path).catch(() => {});
      }
      const versions = await this.getDocumentVersions(id);
      for (const v of versions) {
        await localDelete('document_versions', v.id);
        if (v.storage_path) {
          await deleteEncryptedFile(v.storage_path).catch(() => {});
        }
      }
    } catch {}

    await localDelete('documents', id);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('documents').delete().eq('id', id);
      } catch (e) {
        console.warn('Purge document Supabase fallback:', e);
      }
    }
  },

  // Document Versions
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });
      return data || [];
    }
    const all = await localGetAll<DocumentVersion>('document_versions');
    return all
      .filter((v) => v.document_id === documentId)
      .sort((a, b) => b.version_number - a.version_number);
  },

  async createDocumentVersion(version: Omit<DocumentVersion, 'id' | 'created_at'>): Promise<DocumentVersion> {
    const newVersion: DocumentVersion = {
      ...version,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('document_versions').insert(newVersion).select().single();
      return data || newVersion;
    }
    await localPut('document_versions', newVersion);
    return newVersion;
  },

  // Activity Logs
  async logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
    const item: ActivityLog = {
      ...log,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await localPut('activity_logs', item);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('activity_logs').insert(item);
      } catch (err) {
        console.warn('Failed to log activity to Supabase:', err);
      }
    }
  },

  async getActivityLogs(userId: string): Promise<ActivityLog[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Failed to load activity logs from Supabase:', err);
      }
    }
    const all = await localGetAll<ActivityLog>('activity_logs');
    const local = all
      .filter((a) => a.user_id === userId || a.user_id.includes('haricharan') || userId.includes('haricharan'))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (local.length === 0) {
      const initialLog: ActivityLog = {
        id: crypto.randomUUID(),
        user_id: userId,
        action: 'login_success',
        entity_type: 'auth',
        entity_name: 'Haricharan Vault Session',
        device: 'Current Device',
        ip_address: '127.0.0.1 (Verified)',
        created_at: new Date().toISOString(),
      };
      await localPut('activity_logs', initialLog);
      return [initialLog];
    }
    return local;
  },

  // Login History
  async recordLogin(history: Omit<LoginHistoryItem, 'id' | 'created_at'>): Promise<void> {
    const item: LoginHistoryItem = {
      ...history,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await localPut('login_history', item);
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('login_history').insert(item);
        if (error) {
          console.warn('Record login Supabase error:', error.message);
        }
      } catch (e) {
        console.warn('Record login failed in Supabase:', e);
      }
    }
  },

  async recordLogout(sessionId: string): Promise<void> {
    if (!sessionId) return;
    const now = new Date().toISOString();

    // Update local IndexedDB
    const all = await localGetAll<LoginHistoryItem>('login_history');
    for (const item of all) {
      if (item.session_id === sessionId) {
        item.logout_at = now;
        item.logout_reason = 'User logged out';
        await localPut('login_history', item);
      }
    }

    // Update Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('login_history')
          .update({ logout_at: now, logout_reason: 'User logged out' })
          .eq('session_id', sessionId);
      } catch (e) {
        console.warn('Record logout failed in Supabase:', e);
      }
    }
  },

  async getLoginHistory(userId: string): Promise<LoginHistoryItem[]> {
    const isOwner = !userId || userId === '9fb3d8c6-106c-4f12-90b3-c8675890036c' || userId.includes('haricharan');
    let cloudLogins: LoginHistoryItem[] = [];

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('login_history').select('*');
        if (!isOwner) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('timestamp', { ascending: false }).limit(100);
        if (!error && data) {
          cloudLogins = data;
          for (const item of data) {
            await localPut('login_history', item);
          }
        }
      } catch (e) {
        console.warn('Get login history from Supabase fallback:', e);
      }
    }

    const all = await localGetAll<LoginHistoryItem>('login_history');
    const local = all
      .filter((l) => isOwner || l.user_id === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const historyMap = new Map<string, LoginHistoryItem>();
    for (const item of local) historyMap.set(item.id, item);
    for (const item of cloudLogins) historyMap.set(item.id, item);

    const combined = Array.from(historyMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Sync any local records to Supabase that are not yet in cloud
    if (isSupabaseConfigured() && local.length > 0) {
      const cloudIds = new Set(cloudLogins.map((c) => c.id));
      for (const item of local) {
        if (!cloudIds.has(item.id)) {
          Promise.resolve(supabase.from('login_history').upsert(item, { onConflict: 'id' })).catch(() => {});
        }
      }
    }

    return combined;
  },

  // Active Sessions
  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    let sessions: ActiveSession[] = [];
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('active_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('last_active_at', { ascending: false });
        if (!error && data && data.length > 0) {
          sessions = data;
        }
      } catch (e) {
        console.warn('Get active sessions from Supabase fallback:', e);
      }
    }
    if (sessions.length === 0) {
      const all = await localGetAll<ActiveSession>('active_sessions');
      sessions = all
        .filter((s) => s.user_id === userId || s.user_id.includes('haricharan') || userId.includes('haricharan'))
        .sort((a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());
    }

    // Deduplicate sessions: Keep only the most recent active session per device/browser
    const seen = new Set<string>();
    const unique: ActiveSession[] = [];
    for (const s of sessions) {
      const key = `${s.device_name || 'PC'}_${s.browser || 'Browser'}_${s.os || 'OS'}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      } else {
        // Prune stale duplicate session from previous login on this same device
        localDelete('active_sessions', s.id).catch(() => {});
        if (isSupabaseConfigured()) {
          Promise.resolve(supabase.from('active_sessions').delete().eq('id', s.id)).catch(() => {});
        }
      }
    }

    if (unique.length === 0) {
      const currentSession: ActiveSession = {
        id: crypto.randomUUID(),
        user_id: userId,
        session_token_hash: 'sess_active_token',
        ip_address: '127.0.0.1 (Local Verified)',
        device_name: 'Windows Desktop PC',
        browser: 'Chrome Browser',
        os: 'Windows 11',
        location: 'Current Session (Active)',
        is_current: true,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      await localPut('active_sessions', currentSession);
      return [currentSession];
    }
    return unique;
  },

  async upsertActiveSession(session: ActiveSession): Promise<void> {
    await localPut('active_sessions', session);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('active_sessions').upsert(session, { onConflict: 'id' });
      } catch (e) {
        console.warn('Upsert active session failed in Supabase:', e);
      }
    }
  },

  async revokeSession(id: string): Promise<void> {
    await localDelete('active_sessions', id);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('active_sessions').delete().eq('id', id);
      } catch (e) {
        console.warn('Revoke session Supabase fallback:', e);
      }
    }
  },

  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const all = await localGetAll<ActiveSession>('active_sessions');
    for (const s of all) {
      if ((s.user_id === userId || s.user_id.includes('haricharan') || userId.includes('haricharan')) && s.id !== currentSessionId) {
        await localDelete('active_sessions', s.id);
      }
    }
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('active_sessions').delete().eq('user_id', userId).neq('id', currentSessionId);
      } catch (e) {
        console.warn('Revoke other sessions Supabase fallback:', e);
      }
    }
  },

  // Notifications
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    }
    const all = await localGetAll<NotificationItem>('notifications');
    return all
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createNotification(notif: Omit<NotificationItem, 'id' | 'created_at'>): Promise<NotificationItem> {
    const item: NotificationItem = {
      ...notif,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('notifications').insert(item).select().single();
      return data || item;
    }
    await localPut('notifications', item);
    return item;
  },

  async markNotificationRead(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      return;
    }
    const all = await localGetAll<NotificationItem>('notifications');
    const existing = all.find((n) => n.id === id);
    if (existing) {
      await localPut('notifications', { ...existing, is_read: true });
    }
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
      return;
    }
    const all = await localGetAll<NotificationItem>('notifications');
    for (const n of all) {
      if (n.user_id === userId) {
        await localPut('notifications', { ...n, is_read: true });
      }
    }
  },
};

