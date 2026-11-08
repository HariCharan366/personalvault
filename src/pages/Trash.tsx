import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { deleteEncryptedFile } from '@/services/storage';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Trash2, RotateCcw, AlertTriangle, FileText, ShieldAlert } from 'lucide-react';
import type { DocumentItem } from '@/types';

export const Trash: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [trashedDocs, setTrashedDocs] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrash = async () => {
    if (!user) return;
    setIsLoading(true);
    const all = await api.getDocuments(user.id, true);
    setTrashedDocs(all.filter((d) => d.is_deleted));
    setIsLoading(false);
  };

  useEffect(() => {
    loadTrash();
  }, [user]);

  const handleRestore = async (doc: DocumentItem) => {
    if (!user) return;
    await api.restoreDocument(doc.id);
    await api.logActivity({
      user_id: user.id,
      action: 'document_restored',
      entity_type: 'document',
      entity_id: doc.id,
      entity_name: doc.title,
    });
    showToast('success', 'Document Restored', `"${doc.title}" has been restored to your active vault.`);
    loadTrash();
  };

  const handlePermanentDelete = async (doc: DocumentItem) => {
    if (!user) return;
    if (
      window.confirm(
        `Permanently purge "${doc.title}"? This will irreversibly destroy the encrypted cloud object and cannot be undone.`
      )
    ) {
      // 1. Delete encrypted file from cloud storage
      const { success, error } = await deleteEncryptedFile(doc.storage_path);
      if (!success) {
        showToast('error', 'Storage Deletion Error', error || 'Failed to delete file from storage bucket.');
        return;
      }

      // 2. Delete database record
      await api.purgeDocument(doc.id);

      // 3. Log activity
      await api.logActivity({
        user_id: user.id,
        action: 'document_purged',
        entity_type: 'document',
        entity_id: doc.id,
        entity_name: doc.title,
      });

      showToast('info', 'Permanently Purged', `"${doc.title}" was completely eliminated from cloud storage.`);
      loadTrash();
    }
  };

  const handleEmptyTrash = async () => {
    if (!user || trashedDocs.length === 0) return;
    if (
      window.confirm(
        `Permanently purge ALL ${trashedDocs.length} items in the Recycle Bin? All encrypted cloud objects will be irreversibly destroyed.`
      )
    ) {
      for (const doc of trashedDocs) {
        await deleteEncryptedFile(doc.storage_path);
        await api.purgeDocument(doc.id);
        await api.logActivity({
          user_id: user.id,
          action: 'document_purged',
          entity_type: 'document',
          entity_id: doc.id,
          entity_name: doc.title,
        });
      }
      showToast('success', 'Trash Emptied', 'All deleted documents permanently purged.');
      loadTrash();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Trash2 className="w-6 h-6 text-rose-500" />
            <span>Vault Trash / Recycle Bin</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Recover deleted documents or permanently shred cloud ciphertext
          </p>
        </div>

        {trashedDocs.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleEmptyTrash}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Empty Recycle Bin ({trashedDocs.length})
          </Button>
        )}
      </div>

      {trashedDocs.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="w-8 h-8 text-slate-400" />}
          title="Recycle Bin is Empty"
          description="Documents you delete will remain here for safe recovery until you empty the trash."
        />
      ) : (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Items in the Recycle Bin will be automatically purged after your configured retention period (30 days default).
            </span>
          </div>

          <Card className="divide-y divide-slate-100 dark:divide-vault-800 overflow-hidden">
            {trashedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {doc.title || doc.original_filename}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>Deleted: {doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(doc)}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-emerald-400" />}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handlePermanentDelete(doc)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Permanently Delete
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
};

