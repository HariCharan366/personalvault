import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { FolderOpen, Plus, Trash2, Folder as FolderIcon, ChevronRight } from 'lucide-react';
import type { Folder, DocumentItem } from '@/types';

interface ContextType {
  folders: Folder[];
  documents: DocumentItem[];
  refreshData: () => void;
}

export const Folders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { folders, documents, refreshData } = useOutletContext<ContextType>();

  const [modalOpen, setModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [color, setColor] = useState('#38bdf8');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !folderName) return;

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
        entity_name: folderName,
      });

      showToast('success', 'Folder Created', `"${folderName}" created successfully.`);
      setFolderName('');
      setParentId('');
      setModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast('error', 'Failed to create folder', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (window.confirm(`Delete folder "${folder.name}"? Files inside will be unfiled, not deleted.`)) {
      await api.deleteFolder(folder.id);
      await api.logActivity({
        user_id: user.id,
        action: 'folder_deleted',
        entity_type: 'folder',
        entity_id: folder.id,
        entity_name: folder.name,
      });
      refreshData();
      showToast('info', 'Folder Deleted', `"${folder.name}" removed.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-sky-400" />
            <span>Vault Folders</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize documents into hierarchical directories
          </p>
        </div>

        <Button variant="primary" onClick={() => setModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          New Folder
        </Button>
      </div>

      {/* Folders Grid */}
      {folders.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FolderIcon className="w-12 h-12 text-sky-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Folders Created</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Folders let you nest and group confidential files inside categories.
          </p>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Create First Folder
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {folders.map((f) => {
            const folderDocs = documents.filter((d) => d.folder_id === f.id);
            const parent = folders.find((p) => p.id === f.parent_id);

            return (
              <Card
                key={f.id}
                className="p-5 flex flex-col justify-between hover:border-sky-500/50 hover:shadow-glow-sm transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className="p-3 rounded-2xl flex items-center justify-center text-white"
                      style={{ backgroundColor: f.color }}
                    >
                      <FolderIcon className="w-5 h-5" />
                    </div>

                    <button
                      onClick={(e) => handleDelete(f, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-400 transition-colors">
                    {f.name}
                  </h3>

                  {parent && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>Inside:</span>
                      <span className="font-semibold text-slate-400">{parent.name}</span>
                    </p>
                  )}

                  <p className="text-[11px] text-slate-400 mt-1">
                    {folderDocs.length} {folderDocs.length === 1 ? 'document' : 'documents'}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-vault-800 flex items-center justify-between text-[11px]">
                  <Link
                    to={`/documents?folder=${f.id}`}
                    className="font-semibold text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>View files</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Folder Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Folder"
        description="Folders can be nested for structured document storage."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Folder Name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g. 2026 Tax Receipts"
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Parent Folder (Optional for Nesting)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">Root (No Parent)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Folder Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs font-mono text-slate-400">{color}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

