import { supabase, isSupabaseConfigured } from '@/integrations/supabase';
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
      const { data } = await supabase.from('vault_settings').select('*').eq('user_id', userId).maybeSingle();
      return data;
    }
    const all = await localGetAll<VaultSettings>('vault_settings');
    return all.find((s) => s.user_id === userId) || null;
  },

  async saveVaultSettings(settings: VaultSettings): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('vault_settings').upsert(settings, { onConflict: 'user_id' });
      return;
    }
    await localPut('vault_settings', { ...settings, id: settings.user_id });
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
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('folders').select('*').eq('user_id', userId).order('name');
      return data || [];
    }
    const all = await localGetAll<Folder>('folders');
    return all.filter((f) => f.user_id === userId);
  },

  async createFolder(folder: Omit<Folder, 'id' | 'created_at' | 'updated_at'>): Promise<Folder> {
    const newFolder: Folder = {
      ...folder,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('folders').insert(newFolder).select().single();
      return data || newFolder;
    }
    await localPut('folders', newFolder);
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
    if (isSupabaseConfigured()) {
      let query = supabase.from('documents').select('*, category:categories(*)').eq('user_id', userId);
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    }

    const all = await localGetAll<DocumentItem>('documents');
    const categories = await this.getCategories(userId);
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return all
      .filter((d) => d.user_id === userId && (includeDeleted || !d.is_deleted))
      .map((d) => ({
        ...d,
        category: d.category_id ? catMap.get(d.category_id) : undefined,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getDocumentById(id: string): Promise<DocumentItem | null> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('documents').select('*, category:categories(*)').eq('id', id).maybeSingle();
      return data;
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
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('documents').insert(newDoc).select().single();
      if (error) throw error;
      return data || newDoc;
    }
    await localPut('documents', newDoc);
    return newDoc;
  },

  async updateDocument(id: string, updates: Partial<DocumentItem>): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('documents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      return;
    }
    const all = await localGetAll<DocumentItem>('documents');
    const existing = all.find((d) => d.id === id);
    if (existing) {
      await localPut('documents', { ...existing, ...updates, updated_at: new Date().toISOString() });
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
    if (isSupabaseConfigured()) {
      await supabase.from('documents').delete().eq('id', id);
      return;
    }
    await localDelete('documents', id);
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('activity_logs').insert(item);
      } catch (err) {
        console.error('Failed to log activity to Supabase:', err);
      }
      return;
    }
    await localPut('activity_logs', item);
  },

  async getActivityLogs(userId: string): Promise<ActivityLog[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    }
    const all = await localGetAll<ActivityLog>('activity_logs');
    return all
      .filter((a) => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Login History
  async recordLogin(history: Omit<LoginHistoryItem, 'id' | 'created_at'>): Promise<void> {
    const item: LoginHistoryItem = {
      ...history,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('login_history').insert(item);
      } catch (e) {
        console.error('Record login failed in Supabase:', e);
      }
      return;
    }
    await localPut('login_history', item);
  },

  async getLoginHistory(userId: string): Promise<LoginHistoryItem[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);
      return data || [];
    }
    const all = await localGetAll<LoginHistoryItem>('login_history');
    return all
      .filter((l) => l.user_id === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // Active Sessions
  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_active_at', { ascending: false });
      return data || [];
    }
    const all = await localGetAll<ActiveSession>('active_sessions');
    return all
      .filter((s) => s.user_id === userId)
      .sort((a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());
  },

  async upsertActiveSession(session: ActiveSession): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('active_sessions').upsert(session, { onConflict: 'id' });
      return;
    }
    await localPut('active_sessions', session);
  },

  async revokeSession(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('active_sessions').delete().eq('id', id);
      return;
    }
    await localDelete('active_sessions', id);
  },

  async revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.from('active_sessions').delete().eq('user_id', userId).neq('id', currentSessionId);
      return;
    }
    const all = await localGetAll<ActiveSession>('active_sessions');
    for (const s of all) {
      if (s.user_id === userId && s.id !== currentSessionId) {
        await localDelete('active_sessions', s.id);
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

