import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { uploadEncryptedFile } from '@/services/storage';
import { encryptDocument, calculateSha256 } from '@/services/crypto';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getFolderHierarchy } from '@/utils/folder';
import {
  UploadCloud,
  File,
  X,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Calendar,
  Folder as FolderIcon,
} from 'lucide-react';
import type { Folder } from '@/types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId?: string;
  onUploadComplete: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number; // 0 to 100
  status: 'pending' | 'encrypting' | 'uploading' | 'complete' | 'error' | 'duplicate_warning';
  error?: string;
  sha256?: string;
  isDuplicate?: boolean;
}

const SUPPORTED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'txt',
  'csv',
  'zip',
];

const MAX_FILE_SIZE = 52428800; // 50MB

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onUploadComplete,
}) => {
  const { user } = useAuth();
  const { vaultKek } = useVault();
  const { showToast } = useToast();

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentFolderId || '');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, boolean>>(new Map());

  const handleFilesSelected = async (files: FileList | File[]) => {
    const newItems: QueuedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        showToast('error', 'Unsupported Format', `"${file.name}" is not a supported file type.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        showToast('error', 'File Too Large', `"${file.name}" exceeds 50MB limit.`);
        continue;
      }

      const id = crypto.randomUUID();
      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        progress: 0,
        status: 'pending',
      });
    }

    setQueue((prev) => [...prev, ...newItems]);

    // Check for duplicates in background
    if (user) {
      const existingDocs = await api.getDocuments(user.id);
      for (const item of newItems) {
        const buffer = await item.file.arrayBuffer();
        const hash = await calculateSha256(buffer);
        const dup = existingDocs.find((d) => d.sha256_hash === hash && !d.is_deleted);
        if (dup) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    sha256: hash,
                    isDuplicate: true,
                    status: 'duplicate_warning',
                    error: `Matches existing file "${dup.original_filename}"`,
                  }
                : q
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, sha256: hash } : q))
          );
        }
      }
    }
  };

  const removeItem = (id: string) => {
    abortControllersRef.current.set(id, true);
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const startUpload = async () => {
    if (!user || !vaultKek) {
      showToast('error', 'Encryption Error', 'Unable to access encryption key. Please refresh or re-login.');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    for (const item of queue) {
      if (item.status === 'complete') continue;
      if (abortControllersRef.current.get(item.id)) continue;

      try {
        // Step 1: Encrypting
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'encrypting', progress: 25 } : q))
        );

        const fileBytes = await item.file.arrayBuffer();
        const encryptionResult = await encryptDocument(fileBytes, vaultKek);

        if (abortControllersRef.current.get(item.id)) continue;

        // Step 2: Uploading
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 60 } : q))
        );

        const docId = crypto.randomUUID();
        const { storagePath, error: uploadErr } = await uploadEncryptedFile(
          user.id,
          docId,
          encryptionResult.encryptedData
        );

        if (uploadErr || !storagePath) {
          throw new Error(uploadErr || 'Upload failed');
        }

        // Step 3: Record metadata in DB
        await api.createDocument({
          user_id: user.id,
          title: item.name.replace(/\.[^/.]+$/, ''),
          original_filename: item.name,
          storage_path: storagePath,
          file_size: item.size,
          mime_type: item.type,
          category_id: null,
          folder_id: selectedFolderId || null,
          sha256_hash: encryptionResult.sha256Hash,
          encryption_iv: encryptionResult.iv,
          wrapped_dek: encryptionResult.wrappedDek,
          is_favorite: false,
          is_deleted: false,
          expiry_date: expiryDate || null,
          current_version: 1,
          tags,
        });

        // Log document upload activity
        await api.logActivity({
          user_id: user.id,
          action: 'document_uploaded',
          entity_type: 'document',
          entity_id: docId,
          entity_name: item.name,
          details: { size: item.size, mimeType: item.type },
        });

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'complete', progress: 100 } : q))
        );
        successCount++;
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: err?.message || 'Upload failed' } : q
          )
        );
      }
    }

    setIsProcessing(false);

    if (successCount > 0) {
      showToast('success', 'Upload Successful', `${successCount} document(s) safely encrypted and stored.`);
      onUploadComplete();
      setQueue([]);
      setTagsInput('');
      setExpiryDate('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-neon-mint">
            <UploadCloud className="w-5 h-5" />
          </div>
          <span>Upload Encrypted Documents</span>
        </div>
      }
      description="Files are encrypted on your device using AES-256-GCM before transmission to cloud storage."
    >
      <div className="space-y-4">
        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-emerald-500 dark:border-neon-mint bg-emerald-500/10'
              : 'border-slate-300 dark:border-white/[0.1] hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-obsidian-850/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
          />
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-neon-mint flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Click to browse or drag and drop your files
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            PDF, Images (JPG, PNG, WEBP), Office Docs (DOCX, XLSX), TXT, CSV, ZIP (up to 50MB)
          </p>
        </div>

        {/* Organization & Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-obsidian-900/60 border border-slate-200 dark:border-white/[0.06] shadow-inner">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <FolderIcon className="w-3.5 h-3.5 text-cyan-400" /> Destination Folder
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            >
              <option value="">Root (No Folder)</option>
              {getFolderHierarchy(folders).map((f) => (
                <option key={f.id} value={f.id}>
                  {'— '.repeat(f.depth)}📁 {f.path}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" /> Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. passport, urgent, tax"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-white/[0.08] bg-white dark:bg-obsidian-850 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:border-neon-mint transition-colors"
            />
          </div>
        </div>

        {/* Queued Files List */}
        {queue.length > 0 && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-obsidian-850/80 flex items-center justify-between gap-3 text-xs backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-neon-mint">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                      <span className="text-[10px] text-slate-500">({(item.size / 1024).toFixed(1)} KB)</span>
                    </div>

                    {item.status === 'duplicate_warning' && (
                      <p className="text-[11px] text-amber-500 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Duplicate detected. {item.error}
                      </p>
                    )}

                    {item.status === 'error' && (
                      <p className="text-[11px] text-rose-500 mt-0.5">{item.error}</p>
                    )}

                    {(item.status === 'encrypting' || item.status === 'uploading') && (
                      <div className="w-full bg-slate-200 dark:bg-obsidian-950 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-neon-mint h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {item.status === 'pending' && <Badge variant="outline">Ready</Badge>}
                  {item.status === 'encrypting' && <Badge variant="info">Encrypting</Badge>}
                  {item.status === 'uploading' && <Badge variant="success">Uploading</Badge>}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Remove from queue"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={startUpload}
            disabled={queue.length === 0 || isProcessing}
            isLoading={isProcessing}
            leftIcon={<UploadCloud className="w-4 h-4" />}
          >
            Upload ({queue.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
