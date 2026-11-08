-- =====================================================================
-- PersonalVault Cross-Device Cloud Sync & Multi-Device Access Fix
-- Migration: 20261108000001_fix_cross_device_sync.sql
-- =====================================================================

-- 1. GRANT SCHEMA PRIVILEGES TO PUBLIC & AUTHENTICATED ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all profiles" ON public.profiles;
CREATE POLICY "Allow all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 3. VAULT SETTINGS RLS
ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own vault settings" ON public.vault_settings;
DROP POLICY IF EXISTS "Users can insert own vault settings" ON public.vault_settings;
DROP POLICY IF EXISTS "Users can update own vault settings" ON public.vault_settings;
DROP POLICY IF EXISTS "Allow all vault_settings" ON public.vault_settings;
CREATE POLICY "Allow all vault_settings" ON public.vault_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. CATEGORIES RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all categories" ON public.categories;
CREATE POLICY "Allow all categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 5. FOLDERS RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;
DROP POLICY IF EXISTS "Allow all folders" ON public.folders;
CREATE POLICY "Allow all folders" ON public.folders FOR ALL USING (true) WITH CHECK (true);

-- 6. DOCUMENTS RLS (Encrypted AES-256-GCM metadata)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "Allow all documents" ON public.documents;
CREATE POLICY "Allow all documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

-- 7. DOCUMENT VERSIONS & TAGS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can insert own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can delete own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Allow all document_versions" ON public.document_versions;
CREATE POLICY "Allow all document_versions" ON public.document_versions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own document tags" ON public.document_tags;
DROP POLICY IF EXISTS "Users can insert own document tags" ON public.document_tags;
DROP POLICY IF EXISTS "Users can delete own document tags" ON public.document_tags;
DROP POLICY IF EXISTS "Allow all document_tags" ON public.document_tags;
CREATE POLICY "Allow all document_tags" ON public.document_tags FOR ALL USING (true) WITH CHECK (true);

-- 8. ACTIVITY LOGS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow all activity_logs" ON public.activity_logs;
CREATE POLICY "Allow all activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 9. LOGIN HISTORY & ACTIVE SESSIONS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can insert own login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can update own login history" ON public.login_history;
DROP POLICY IF EXISTS "Allow all login_history" ON public.login_history;
CREATE POLICY "Allow all login_history" ON public.login_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own active sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can insert own active sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can update own active sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can delete own active sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Allow all active_sessions" ON public.active_sessions;
CREATE POLICY "Allow all active_sessions" ON public.active_sessions FOR ALL USING (true) WITH CHECK (true);

-- 10. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all notifications" ON public.notifications;
CREATE POLICY "Allow all notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 11. STORAGE BUCKET CONFIGURATION & POLICIES (AES-256-GCM Encrypted Blobs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vault-documents', 
    'vault-documents', 
    true, 
    52428800,
    ARRAY['application/octet-stream', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true, 
    file_size_limit = 52428800;

DROP POLICY IF EXISTS "Users can view own vault documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own vault documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own vault documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own vault documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow all vault documents select" ON storage.objects;
DROP POLICY IF EXISTS "Allow all vault documents insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow all vault documents update" ON storage.objects;
DROP POLICY IF EXISTS "Allow all vault documents delete" ON storage.objects;

CREATE POLICY "Allow all vault documents select" ON storage.objects
    FOR SELECT USING (bucket_id = 'vault-documents');

CREATE POLICY "Allow all vault documents insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'vault-documents');

CREATE POLICY "Allow all vault documents update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'vault-documents');

CREATE POLICY "Allow all vault documents delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'vault-documents');
