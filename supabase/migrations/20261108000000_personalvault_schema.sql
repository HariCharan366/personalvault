-- PersonalVault Complete Database Schema & Security Policies
-- Migration: 20261108000000_personalvault_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. PROFILES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    two_factor_enabled BOOLEAN DEFAULT false,
    storage_quota_bytes BIGINT DEFAULT 5368709120, -- 5GB default
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 2. VAULT SETTINGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.vault_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_vault_initialized BOOLEAN DEFAULT false NOT NULL,
    salt TEXT NOT NULL,
    pin_verifier TEXT NOT NULL,
    wrapped_recovery_key TEXT,
    recovery_phrase_hash TEXT,
    auto_lock_minutes INTEGER DEFAULT 15 NOT NULL,
    failed_pin_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 3. CATEGORIES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT DEFAULT 'Folder' NOT NULL,
    color TEXT DEFAULT '#6366f1' NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_category_name UNIQUE (user_id, name)
);

-- =====================================================================
-- 4. FOLDERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#38bdf8' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 5. DOCUMENTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    sha256_hash TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    wrapped_dek TEXT NOT NULL,
    is_favorite BOOLEAN DEFAULT false NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMPTZ,
    expiry_date DATE,
    reminder_date DATE,
    current_version INTEGER DEFAULT 1 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 6. DOCUMENT VERSIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    sha256_hash TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    wrapped_dek TEXT NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 7. DOCUMENT TAGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.document_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_document_tag UNIQUE (document_id, tag)
);

-- =====================================================================
-- 8. ACTIVITY LOGS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    entity_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 9. LOGIN HISTORY TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    status TEXT NOT NULL, -- 'Success' | 'Failed'
    ip_address TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    device_type TEXT,
    approximate_location TEXT,
    session_id TEXT,
    logout_at TIMESTAMPTZ,
    logout_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 10. ACTIVE SESSIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL,
    ip_address TEXT,
    device_name TEXT,
    browser TEXT,
    os TEXT,
    location TEXT,
    is_current BOOLEAN DEFAULT false NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- 11. NOTIFICATIONS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' NOT NULL, -- 'info' | 'warning' | 'danger' | 'success'
    is_read BOOLEAN DEFAULT false NOT NULL,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON public.documents(user_id, sha256_hash);
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON public.documents(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_favorite ON public.documents(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON public.documents(user_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_date ON public.login_history(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- =====================================================================
-- AUTOMATIC DEFAULT CATEGORIES & PROFILE TRIGGER
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    );

    -- Seed 8 Default Categories
    INSERT INTO public.categories (user_id, name, slug, icon, color, is_default)
    VALUES 
        (new.id, 'Identity Documents', 'identity-documents', 'Shield', '#6366f1', true),
        (new.id, 'Education Documents', 'education-documents', 'GraduationCap', '#38bdf8', true),
        (new.id, 'Banking Documents', 'banking-documents', 'Landmark', '#10b981', true),
        (new.id, 'Medical Documents', 'medical-documents', 'HeartPulse', '#f43f5e', true),
        (new.id, 'Employment Documents', 'employment-documents', 'Briefcase', '#f59e0b', true),
        (new.id, 'Personal Documents', 'personal-documents', 'UserCheck', '#a855f7', true),
        (new.id, 'Government Documents', 'government-documents', 'FileBadge', '#06b6d4', true),
        (new.id, 'Other Documents', 'other-documents', 'FolderArchive', '#64748b', true);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger AS $$
BEGIN
    new.updated_at = now();
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_vault_settings_modtime BEFORE UPDATE ON public.vault_settings FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_folders_modtime BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users can ONLY see, edit, and delete their own rows!
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Vault Settings RLS
CREATE POLICY "Users can view own vault settings" ON public.vault_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vault settings" ON public.vault_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vault settings" ON public.vault_settings FOR UPDATE USING (auth.uid() = user_id);

-- Categories RLS
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Folders RLS
CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Documents RLS
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Document Versions RLS
CREATE POLICY "Users can view own document versions" ON public.document_versions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own document versions" ON public.document_versions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own document versions" ON public.document_versions FOR DELETE USING (auth.uid() = user_id);

-- Document Tags RLS
CREATE POLICY "Users can view own document tags" ON public.document_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own document tags" ON public.document_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own document tags" ON public.document_tags FOR DELETE USING (auth.uid() = user_id);

-- Activity Logs RLS
CREATE POLICY "Users can view own activity logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Login History RLS
CREATE POLICY "Users can view own login history" ON public.login_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own login history" ON public.login_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own login history" ON public.login_history FOR UPDATE USING (auth.uid() = user_id);

-- Active Sessions RLS
CREATE POLICY "Users can view own active sessions" ON public.active_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own active sessions" ON public.active_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own active sessions" ON public.active_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own active sessions" ON public.active_sessions FOR DELETE USING (auth.uid() = user_id);

-- Notifications RLS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- SUPABASE STORAGE BUCKET & STORAGE POLICIES
-- =====================================================================
-- Ensure private storage bucket 'vault-documents' exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vault-documents', 
    'vault-documents', 
    false, 
    52428800, -- 50 MB per file limit
    ARRAY['application/octet-stream', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    file_size_limit = 52428800;

-- Storage object policies enforcing auth.uid() folder prefix matching: {user_id}/{filename}
CREATE POLICY "Users can view own vault documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'vault-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload own vault documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'vault-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own vault documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'vault-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own vault documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'vault-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

