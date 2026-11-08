import React, { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { DocumentActionsModal } from '@/components/documents/DocumentActionsModal';
import { DocumentVersionModal } from '@/components/documents/DocumentVersionModal';
import { getFolderHierarchy } from '@/utils/folder';
import {
  Files,
  LayoutGrid,
  List,
  Search,
  FileText,
  Trash2,
  Edit,
  History,
  Eye,
  FolderOpen,
} from 'lucide-react';
import type { DocumentItem, Folder } from '@/types';

interface ContextType {
  refreshData: () => void;
  folders: Folder[];
  documents: DocumentItem[];
  searchQuery?: string;
}

export const Documents: React.FC = () => {
  const { user } = useAuth();
  const { isUnlocked } = useVault();
  const { showToast } = useToast();
  const { folders, documents, refreshData, searchQuery: globalSearch } = useOutletContext<ContextType>();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || globalSearch || '');
  const [selectedFolder, setSelectedFolder] = useState<string>(searchParams.get('folder') || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'>('date_desc');

  // Modal states
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [actionDoc, setActionDoc] = useState<DocumentItem | null>(null);
  const [versionDoc, setVersionDoc] = useState<DocumentItem | null>(null);

  // Filter & Sort
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Query filter
      const matchesSearch =
        searchQuery === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      // Folder filter
      const matchesFolder =
        selectedFolder === 'all' || doc.folder_id === selectedFolder;

      // Type filter
      let matchesType = true;
      if (selectedType === 'pdf') matchesType = doc.mime_type === 'application/pdf';
      else if (selectedType === 'image') matchesType = doc.mime_type.startsWith('image/');
      else if (selectedType === 'text') matchesType = doc.mime_type.startsWith('text/') || doc.mime_type.includes('csv');
      else if (selectedType === 'office')
        matchesType =
          doc.mime_type.includes('word') ||
          doc.mime_type.includes('excel') ||
          doc.mime_type.includes('spreadsheet') ||
          doc.mime_type.includes('document');

      return matchesSearch && matchesFolder && matchesType;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
      if (sortBy === 'size_desc') return b.file_size - a.file_size;
      if (sortBy === 'size_asc') return a.file_size - b.file_size;
      return 0;
    });
  }, [documents, searchQuery, selectedFolder, selectedType, sortBy]);

  // Move to trash
  const handleMoveToTrash = async (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await api.softDeleteDocument(doc.id);
    await api.logActivity({
      user_id: user.id,
      action: 'document_deleted',
      entity_type: 'document',
      entity_id: doc.id,
      entity_name: doc.title,
    });
    refreshData();
    showToast('warning', 'Moved to Trash', `"${doc.title}" can be restored from the Trash bin.`);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Files className="w-6 h-6 text-emerald-500 dark:text-neon-mint" />
            <span>Vault Documents</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filteredDocuments.length} files encrypted with zero-knowledge AES-256-GCM
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-200 dark:bg-obsidian-900 border border-slate-300 dark:border-white/[0.08]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-neon-mint shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-neon-mint shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-obsidian-900 border border-slate-200 dark:border-white/[0.08] pl-8 pr-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            />
          </div>

          {/* Folder filter */}
          <div>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-obsidian-900 border border-slate-200 dark:border-white/[0.08] px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            >
              <option value="all">All Folders</option>
              {getFolderHierarchy(folders).map((f) => (
                <option key={f.id} value={f.id}>
                  {'— '.repeat(f.depth)}📁 {f.path}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-obsidian-900 border border-slate-200 dark:border-white/[0.08] px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            >
              <option value="all">All File Types</option>
              <option value="pdf">PDF Documents</option>
              <option value="image">Images (PNG, JPG, WEBP)</option>
              <option value="office">Office Spreadsheets & Docs</option>
              <option value="text">Plain Text & CSV</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-xl bg-slate-50 dark:bg-obsidian-900 border border-slate-200 dark:border-white/[0.08] px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="size_desc">Size (Largest)</option>
              <option value="size_asc">Size (Smallest)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Documents Grid or List */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          title="No documents found"
          description="Try adjusting your search filters or upload a new confidential document to your personal vault."
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              className="p-4 hover:border-emerald-500/50 hover:shadow-glow-sm transition-all flex flex-col justify-between group cursor-pointer"
              onClick={() => setPreviewDoc(doc)}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionDoc(doc);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Edit Properties"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleMoveToTrash(doc, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-500 dark:group-hover:text-neon-mint transition-colors">
                  {doc.title || doc.original_filename}
                </h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{doc.original_filename}</p>

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-obsidian-800 text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{(doc.file_size / 1024).toFixed(1)} KB</span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVersionDoc(doc);
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-500 dark:hover:text-neon-mint"
                    title={`Version ${doc.current_version}`}
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-obsidian-900/60 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="p-3 pl-4">Name</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Uploaded</th>
                  <th className="p-3">Version</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className="hover:bg-slate-50 dark:hover:bg-obsidian-850/60 cursor-pointer transition-colors"
                  >
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-emerald-500 dark:text-neon-mint shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs">
                          {doc.title || doc.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{(doc.file_size / 1024).toFixed(1)} KB</td>
                    <td className="p-3 text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Badge variant="outline" size="sm">
                        v{doc.current_version}
                      </Badge>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-neon-mint"
                          title="Preview & Decrypt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setVersionDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-neon-mint"
                          title="Versions"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setActionDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-neon-mint"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleMoveToTrash(doc, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-400"
                          title="Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
      />

      <DocumentActionsModal
        document={actionDoc}
        isOpen={Boolean(actionDoc)}
        onClose={() => setActionDoc(null)}
        folders={folders}
        onUpdated={refreshData}
      />

      <DocumentVersionModal
        document={versionDoc}
        isOpen={Boolean(versionDoc)}
        onClose={() => setVersionDoc(null)}
        onVersionUpdated={refreshData}
      />
    </div>
  );
};
