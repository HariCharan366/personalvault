export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  two_factor_enabled: boolean;
  storage_quota_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface VaultSettings {
  user_id: string;
  is_vault_initialized: boolean;
  salt: string; // Base64 salt for PBKDF2
  pin_verifier: string; // Verifier hash
  wrapped_recovery_key?: string | null;
  recovery_phrase_hash?: string | null;
  auto_lock_minutes: number;
  failed_pin_attempts: number;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  document_count?: number;
  total_size_bytes?: number;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  category_id?: string | null;
  category?: Category;
  folder_id?: string | null;
  sha256_hash: string;
  encryption_iv: string; // Base64
  wrapped_dek: string; // Base64 wrapped Data Encryption Key
  is_favorite: boolean;
  is_deleted: boolean;
  deleted_at?: string | null;
  expiry_date?: string | null;
  reminder_date?: string | null;
  current_version: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  user_id: string;
  version_number: number;
  storage_path: string;
  file_size: number;
  sha256_hash: string;
  encryption_iv: string;
  wrapped_dek: string;
  change_summary?: string | null;
  created_at: string;
}

export interface DocumentTag {
  id: string;
  document_id: string;
  user_id: string;
  tag: string;
  created_at: string;
}

export type ActivityAction =
  | 'document_uploaded'
  | 'document_downloaded'
  | 'document_viewed'
  | 'document_renamed'
  | 'document_moved'
  | 'document_deleted'
  | 'document_restored'
  | 'document_purged'
  | 'category_created'
  | 'category_deleted'
  | 'category_updated'
  | 'folder_created'
  | 'folder_deleted'
  | 'favorite_added'
  | 'favorite_removed'
  | 'vault_initialized'
  | 'vault_unlocked'
  | 'vault_locked'
  | 'vault_pin_changed'
  | 'version_created'
  | 'version_restored'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'session_revoked';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: 'document' | 'folder' | 'category' | 'vault' | 'session' | 'auth';
  entity_id?: string | null;
  entity_name?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  device?: string | null;
  created_at: string;
}

export interface LoginHistoryItem {
  id: string;
  user_id: string;
  timestamp: string;
  status: 'Success' | 'Failed';
  ip_address?: string | null;
  browser?: string | null;
  browser_version?: string | null;
  os?: string | null;
  device_type?: string | null;
  approximate_location?: string | null;
  session_id?: string | null;
  logout_at?: string | null;
  logout_reason?: string | null;
  created_at: string;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  session_token_hash: string;
  ip_address?: string | null;
  device_name?: string | null;
  browser?: string | null;
  os?: string | null;
  location?: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface StorageStats {
  usedBytes: number;
  totalQuotaBytes: number;
  usedPercentage: number;
  documentCount: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    color: string;
    bytes: number;
    count: number;
    percentage: number;
  }[];
}

export interface EncryptionResult {
  encryptedBlob: Blob;
  iv: string; // Base64
  wrappedDek: string; // Base64 wrapped key
  sha256Hash: string; // hex
  plainSize: number;
}
