import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { api } from '@/services/api';
import type { Category, Folder, DocumentItem } from '@/types';

export const DashboardLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [storageUsedBytes, setStorageUsedBytes] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [cats, flds, docs] = await Promise.all([
        api.getCategories(user.id),
        api.getFolders(user.id),
        api.getDocuments(user.id),
      ]);
      setCategories(cats);
      setFolders(flds);
      setDocuments(docs);

      const totalBytes = docs.reduce((acc, d) => acc + (d.file_size || 0), 0);
      setStorageUsedBytes(totalBytes);
    } catch (e) {
      console.error('Error loading vault data:', e);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-vault-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wider">INITIALIZING PERSONALVAULT...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-vault-950 flex text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        storageUsedBytes={storageUsedBytes}
        storageQuotaBytes={5368709120}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <TopNav
          onMenuToggle={() => setSidebarOpen(true)}
          onOpenUpload={() => setUploadModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet context={{ refreshData: loadData, searchQuery, categories, folders, documents }} />
        </main>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        categories={categories}
        folders={folders}
        onUploadComplete={loadData}
      />
    </div>
  );
};
