import React, { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { getFolderAncestors, getFolderHierarchy } from '@/utils/folder';
import {
  FolderOpen,
  Plus,
  Trash2,
  Folder as FolderIcon,
  ChevronRight,
  ArrowLeft,
  FileText,
  CornerDownRight,
  FolderPlus,
  Eye,
  Layers,
  UploadCloud,
} from 'lucide-react';
import type { Folder, DocumentItem } from '@/types';

interface ContextType {
  folders: Folder[];
  documents: DocumentItem[];
  refreshData: () => void;
  onOpenUpload?: () => void;
}

const PRESET_COLORS = [
  '#00F5A0', // Neon Mint
  '#00D9F5', // Neon Cyan
  '#38bdf8', // Sky Blue
  '#10b981', // Emerald
  '#a855f7', // Violet
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#64748b', // Slate
];

export const Folders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { folders, documents, refreshData, onOpenUpload } = useOutletContext<ContextType>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active folder ID from URL or null (Root)
  const currentFolderId = searchParams.get('id') || null;

  // Active folder entity
  const currentFolder = useMemo(() => {
    return currentFolderId ? folders.find((f) => f.id === currentFolderId) || null : null;
  }, [currentFolderId, folders]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) return [];
    return getFolderAncestors(currentFolderId, folders);
  }, [currentFolderId, folders]);

  // Subfolders in the current folder (folder-in-folder)
  const currentSubfolders = useMemo(() => {
    return folders.filter((f) => {
      if (!currentFolderId) {
        return !f.parent_id; // Root folders
      }
      return f.parent_id === currentFolderId;
    });
  }, [folders, currentFolderId]);

  // Documents in the current folder
  const currentDocuments = useMemo(() => {
    return documents.filter((d) => {
      if (!currentFolderId) {
        return !d.folder_id; // Root documents
      }
      return d.folder_id === currentFolderId;
    });
  }, [documents, currentFolderId]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [color, setColor] = useState('#00F5A0');
  const [isLoading, setIsLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const openCreateModal = (parent?: string | null) => {
    setFolderName('');
    setParentId(parent !== undefined ? parent || '' : currentFolderId || '');
    setColor('#00F5A0');
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !folderName.trim()) return;

    setIsLoading(true);
    try {
      await api.createFolder({
        user_id: user.id,
        name: folderName.trim(),
        parent_id: parentId || null,
        color,
      });

      await api.logActivity({
        user_id: user.id,
        action: 'folder_created',
        entity_type: 'folder',
        entity_name: folderName.trim(),
      });

      showToast('success', 'Folder Created', `"${folderName.trim()}" created successfully.`);
      setModalOpen(false);
      refreshData();
      // If created inside current folder or root, keep focus
      if (parentId) {
        setSearchParams({ id: parentId });
      }
    } catch (err: any) {
      showToast('error', 'Failed to create folder', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (
      window.confirm(
        `Delete "${folder.name}" and all subfolders inside it? Files will remain safely stored but unfiled.`
      )
    ) {
      await api.deleteFolder(folder.id);
      await api.logActivity({
        user_id: user.id,
        action: 'folder_deleted',
        entity_type: 'folder',
        entity_id: folder.id,
        entity_name: folder.name,
      });
      refreshData();
      if (currentFolderId === folder.id) {
        // Go up to parent or root
        if (folder.parent_id) {
          setSearchParams({ id: folder.parent_id });
        } else {
          setSearchParams({});
        }
      }
      showToast('info', 'Folder Deleted', `"${folder.name}" and subfolders removed.`);
    }
  };

  const navigateToFolder = (fId: string | null) => {
    if (fId) {
      setSearchParams({ id: fId });
    } else {
      setSearchParams({});
    }
  };

  // Folders available for parent dropdown (excluding descendants to prevent cycles)
  const availableParents = useMemo(() => {
    return getFolderHierarchy(folders);
  }, [folders]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-emerald-500 dark:text-neon-mint" />
            <span>Folders</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {currentFolder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToFolder(currentFolder.parent_id || null)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Up One Level
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => openCreateModal(currentFolderId)}
            leftIcon={<FolderPlus className="w-4 h-4" />}
          >
            {currentFolder ? 'New Subfolder' : 'New Root Folder'}
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center flex-wrap gap-1.5 p-3 rounded-2xl bg-white dark:bg-obsidian-900/80 border border-slate-200 dark:border-white/[0.08] text-xs shadow-sm backdrop-blur-md">
        <button
          onClick={() => navigateToFolder(null)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
            !currentFolderId
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-neon-mint'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-850'
          }`}
        >
          <FolderIcon className="w-3.5 h-3.5" />
          <span>All Folders (Root)</span>
        </button>

        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                onClick={() => navigateToFolder(crumb.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  isLast
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-neon-mint border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-850'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block mr-1"
                  style={{ backgroundColor: crumb.color || '#00F5A0' }}
                />
                <span>{crumb.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Subfolders Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-500 dark:text-neon-mint" />
            <span>
              {currentFolder ? `Subfolders inside "${currentFolder.name}"` : 'Top-Level Folders'} ({currentSubfolders.length})
            </span>
          </h2>
        </div>

        {currentSubfolders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.08] bg-slate-50/50 dark:bg-obsidian-900/30">
            <FolderIcon className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {currentFolder ? 'No subfolders inside this folder yet' : 'No top-level folders created yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
              Create subfolders to organize documents into nested categories.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCreateModal(currentFolderId)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {currentFolder ? 'Create Subfolder Here' : 'Create Folder'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentSubfolders.map((f) => {
              // Direct subfolders of f
              const childSubfolders = folders.filter((child) => child.parent_id === f.id);
              // Direct documents of f
              const folderDocs = documents.filter((d) => d.folder_id === f.id);

              return (
                <Card
                  key={f.id}
                  onClick={() => navigateToFolder(f.id)}
                  className="p-5 flex flex-col justify-between hover:border-emerald-500/50 dark:hover:border-neon-mint/50 hover:shadow-glow-sm transition-all group cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className="p-3 rounded-2xl flex items-center justify-center text-obsidian-950 font-bold shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: f.color || '#00F5A0' }}
                      >
                        <FolderIcon className="w-5 h-5 fill-obsidian-950/20" />
                      </div>

                      <button
                        onClick={(e) => handleDelete(f, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete folder"
                        aria-label="Delete folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 dark:group-hover:text-neon-mint transition-colors truncate">
                      {f.name}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 font-mono">
                      <span>{childSubfolders.length} {childSubfolders.length === 1 ? 'subfolder' : 'subfolders'}</span>
                      <span>•</span>
                      <span>{folderDocs.length} {folderDocs.length === 1 ? 'file' : 'files'}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-600 dark:text-neon-mint flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Open folder</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(f.id);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-500 dark:hover:text-neon-mint transition-colors"
                      title="Add subfolder directly inside"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Documents in Current Folder Section */}
      {currentFolder && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Files inside "{currentFolder.name}" ({currentDocuments.length})</span>
            </h2>
            {onOpenUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenUpload}
                leftIcon={<UploadCloud className="w-3.5 h-3.5 text-emerald-500 dark:text-neon-mint" />}
              >
                Upload File Here
              </Button>
            )}
          </div>

          {currentDocuments.length === 0 ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] my-2">
              <p className="text-xs text-slate-500 italic">
                No files uploaded directly in this folder yet.
              </p>
              {onOpenUpload && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenUpload}
                  leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                >
                  Upload File Here
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setPreviewDoc(doc)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-obsidian-900/60 hover:border-emerald-500/40 cursor-pointer flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-neon-mint shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {doc.title || doc.original_filename}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {(doc.file_size / 1024).toFixed(1)} KB • v{doc.current_version}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDoc(doc);
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-neon-mint transition-colors shrink-0"
                    title="Decrypt & Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Nest Folder Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint">
              <FolderPlus className="w-5 h-5" />
            </div>
            <span>{parentId ? 'Create Subfolder' : 'Create New Folder'}</span>
          </div>
        }
        description="Folders can be nested inside any folder without limit."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Folder Name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g. 2026 Tax Receipts, Contracts, Medical"
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <CornerDownRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>Parent Folder (Place inside)</span>
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-3 py-2.5 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            >
              <option value="">Root (Top Level / No Parent)</option>
              {availableParents.map((item) => (
                <option key={item.id} value={item.id}>
                  {'— '.repeat(item.depth)}📁 {item.path}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Folder Color Accent
            </label>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                    color === c ? 'scale-110 ring-2 ring-white shadow-glow-sm' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create & Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Document Decryption Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        onDeleted={refreshData}
      />
    </div>
  );
};
