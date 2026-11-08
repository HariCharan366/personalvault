import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Edit3, Folder as FolderIcon, Calendar, Tag } from 'lucide-react';
import type { DocumentItem, Folder as FolderType } from '@/types';

interface DocumentActionsModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  folders: FolderType[];
  onUpdated: () => void;
}

export const DocumentActionsModal: React.FC<DocumentActionsModalProps> = ({
  document,
  isOpen,
  onClose,
  folders,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title || document.original_filename);
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

      const isRenamed = document.title !== title;
      const isMoved = document.folder_id !== (folderId || null);

      await api.updateDocument(document.id, {
        title: title.trim(),
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
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint">
            <Edit3 className="w-5 h-5" />
          </div>
          <span>Edit Document Properties</span>
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

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <FolderIcon className="w-3.5 h-3.5 text-cyan-400" /> Destination Folder
          </label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
          >
            <option value="">Root / No Folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" /> Expiry Date (Optional)
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-400" /> Tags
          </label>
          <input
            type="text"
            placeholder="Comma-separated tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
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
