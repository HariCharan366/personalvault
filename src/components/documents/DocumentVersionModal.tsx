import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { uploadEncryptedFile } from '@/services/storage';
import { encryptDocument } from '@/services/crypto';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { History, UploadCloud, RotateCcw, Calendar, HardDrive, CheckCircle2 } from 'lucide-react';
import type { DocumentItem, DocumentVersion } from '@/types';

interface DocumentVersionModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onVersionUpdated: () => void;
}

export const DocumentVersionModal: React.FC<DocumentVersionModalProps> = ({
  document,
  isOpen,
  onClose,
  onVersionUpdated,
}) => {
  const { user } = useAuth();
  const { vaultKek, isUnlocked } = useVault();
  const { showToast } = useToast();

  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);

  useEffect(() => {
    async function loadVersions() {
      if (!isOpen || !document) return;
      setIsLoading(true);
      const v = await api.getDocumentVersions(document.id);
      setVersions(v);
      setIsLoading(false);
    }
    loadVersions();
  }, [isOpen, document]);

  if (!document) return null;

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !vaultKek || !isUnlocked || !newFile) {
      showToast('error', 'Error', 'Vault must be unlocked and a file chosen.');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Archive current version to document_versions
      await api.createDocumentVersion({
        document_id: document.id,
        user_id: user.id,
        version_number: document.current_version,
        storage_path: document.storage_path,
        file_size: document.file_size,
        sha256_hash: document.sha256_hash,
        encryption_iv: document.encryption_iv,
        wrapped_dek: document.wrapped_dek,
        change_summary: changeSummary || `Archived prior to version ${document.current_version + 1}`,
      });

      // 2. Encrypt new file
      const fileBytes = await newFile.arrayBuffer();
      const encResult = await encryptDocument(fileBytes, vaultKek);

      // 3. Upload new encrypted file
      const docVersionId = crypto.randomUUID();
      const { storagePath, error: upErr } = await uploadEncryptedFile(
        user.id,
        docVersionId,
        encResult.encryptedData
      );

      if (upErr || !storagePath) throw new Error(upErr || 'Upload failed');

      // 4. Update document record
      const newVersionNum = document.current_version + 1;
      await api.updateDocument(document.id, {
        storage_path: storagePath,
        file_size: newFile.size,
        mime_type: newFile.type || document.mime_type,
        sha256_hash: encResult.sha256Hash,
        encryption_iv: encResult.iv,
        wrapped_dek: encResult.wrappedDek,
        current_version: newVersionNum,
      });

      // Log version created
      await api.logActivity({
        user_id: user.id,
        action: 'version_created',
        entity_type: 'document',
        entity_id: document.id,
        entity_name: document.original_filename,
        details: { version: newVersionNum },
      });

      showToast('success', 'Version Updated', `Version ${newVersionNum} uploaded successfully.`);
      setNewFile(null);
      setChangeSummary('');
      onVersionUpdated();
      onClose();
    } catch (err: any) {
      showToast('error', 'Version Upload Failed', err?.message || 'Error uploading version');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRestoreVersion = async (v: DocumentVersion) => {
    if (!user) return;
    try {
      // Archive current version
      await api.createDocumentVersion({
        document_id: document.id,
        user_id: user.id,
        version_number: document.current_version,
        storage_path: document.storage_path,
        file_size: document.file_size,
        sha256_hash: document.sha256_hash,
        encryption_iv: document.encryption_iv,
        wrapped_dek: document.wrapped_dek,
        change_summary: `Archived before rollback to v${v.version_number}`,
      });

      // Restore
      await api.updateDocument(document.id, {
        storage_path: v.storage_path,
        file_size: v.file_size,
        sha256_hash: v.sha256_hash,
        encryption_iv: v.encryption_iv,
        wrapped_dek: v.wrapped_dek,
        current_version: document.current_version + 1,
      });

      await api.logActivity({
        user_id: user.id,
        action: 'version_restored',
        entity_type: 'document',
        entity_id: document.id,
        entity_name: document.original_filename,
        details: { restoredFromVersion: v.version_number },
      });

      showToast('success', 'Version Restored', `Restored content from v${v.version_number}.`);
      onVersionUpdated();
      onClose();
    } catch (err: any) {
      showToast('error', 'Restore Failed', err?.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint">
            <History className="w-5 h-5" />
          </div>
          <span>Version History & Rollback</span>
        </div>
      }
      description={`Manage and restore versions for "${document.original_filename}"`}
    >
      <div className="space-y-6">
        {/* Upload New Version Section */}
        <form onSubmit={handleUploadNewVersion} className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-obsidian-900/60 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-emerald-500 dark:text-neon-mint" /> Upload New Version (v{document.current_version + 1})
          </h4>

          <div>
            <input
              type="file"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r file:from-emerald-400 file:to-neon-mint file:text-obsidian-950 file:font-bold hover:opacity-90 cursor-pointer"
            />
          </div>

          <input
            type="text"
            placeholder="Change summary / notes (optional)"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
          />

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!newFile || isUploading}
            isLoading={isUploading}
          >
            Encrypt & Commit v{document.current_version + 1}
          </Button>
        </form>

        {/* Existing Versions List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Historical Versions
          </h4>

          {/* Current Active Version */}
          <div className="p-3 mb-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="success">Current (v{document.current_version})</Badge>
              <span className="text-slate-500">{(document.file_size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span className="text-slate-500">{new Date(document.updated_at).toLocaleString()}</span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-neon-mint" />
          </div>

          {versions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No previous versions yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-obsidian-850/80 flex items-center justify-between text-xs gap-3 backdrop-blur-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Version {v.version_number}</span>
                      <span className="text-slate-500">({(v.file_size / 1024).toFixed(1)} KB)</span>
                    </div>
                    {v.change_summary && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{v.change_summary}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(v.created_at).toLocaleString()}</p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestoreVersion(v)}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

