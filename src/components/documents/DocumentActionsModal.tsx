import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Edit3, Folder, Layers, Calendar, Tag } from 'lucide-react';
import type { DocumentItem, Category, Folder as FolderType } from '@/types';

interface DocumentActionsModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  folders: FolderType[];
  onUpdated: () => void;
}

export const DocumentActionsModal: React.FC<DocumentActionsModalProps> = ({
  document,
  isOpen,
  onClose,
  categories,
  folders,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title || document.original_filename);
      setCategoryId(document.category_id || '');
      setFolderId(document.folder_id || '');
      setExpiryDate(document.expiry_date || '');
      setTagsInput(document.tags?.join(', ') || '');
    }
  }, [document]);

  if (!document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const oldCategory = document.category_id;
      const isMoved = oldCategory !== (categoryId || null);
      const isRenamed = document.title !== title;

      await api.updateDocument(document.id, {
        title: title.trim(),
        category_id: categoryId || null,
        folder_id: folderId || null,
        expiry_date: expiryDate || null,
        tags,
      });

      if (isRenamed) {
        await api.logActivity({
          user_id: user.id,
          action: 'document_renamed',
          entity_type: 'document',
          entity_id: document.id,
          entity_name: title,
        });
      }

      if (isMoved) {
        await api.logActivity({
          user_id: user.id,
          action: 'document_moved',
          entity_type: 'document',
          entity_id: document.id,
          entity_name: title,
        });
      }

      showToast('success', 'Document Updated', 'Changes saved successfully.');
      onUpdated();
      onClose();
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Edit3 className="w-5 h-5" />
          </div>
          <span>Edit Document & Properties</span>
        </div>
      }
      description={`Update metadata and organization for "${document.original_filename}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Display title"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-sky-400" /> Folder
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="">Root / No Folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Expiry Date (Optional)
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-purple-400" /> Tags
          </label>
          <input
            type="text"
            placeholder="Comma-separated tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
