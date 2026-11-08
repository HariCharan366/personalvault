import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { uploadEncryptedFile } from '@/services/storage';
import { encryptDocument, calculateSha256 } from '@/services/crypto';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  UploadCloud,
  File,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Tag,
  Calendar,
  Layers,
} from 'lucide-react';
import type { Category, Folder } from '@/types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  folders: Folder[];
  currentCategoryId?: string;
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
  categories,
  folders,
  currentCategoryId,
  currentFolderId,
  onUploadComplete,
}) => {
  const { user } = useAuth();
  const { isUnlocked, vaultKek } = useVault();
  const { showToast } = useToast();

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(currentCategoryId || '');
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
    if (!user || !vaultKek || !isUnlocked) {
      showToast('error', 'Vault Locked', 'Please unlock your vault with your PIN before uploading files.');
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
          category_id: selectedCategoryId || null,
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
      // Remove completed items
      setQueue((prev) => prev.filter((q) => q.status !== 'complete'));
      if (queue.every((q) => q.status === 'complete')) {
        onClose();
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
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
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-300 dark:border-vault-700 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-vault-850/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
          />
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Click to browse or drag and drop your files
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            PDF, Images (JPG, PNG, WEBP), Office Docs (DOCX, XLSX), TXT, CSV, ZIP (up to 50MB)
          </p>
        </div>

        {/* Categorization & Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none"
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
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. passport, urgent, tax"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-vault-700 bg-white dark:bg-vault-900 px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>
        </div>

        {/* Queued Files List */}
        {queue.length > 0 && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-vault-800 bg-white dark:bg-vault-900 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
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
                      <div className="w-full bg-slate-200 dark:bg-vault-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
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
                  {item.status === 'uploading' && <Badge variant="purple">Uploading</Badge>}
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
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Encrypted with AES-256-GCM + unique IV</span>
          </div>

          <div className="flex items-center gap-2">
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
              Upload & Seal ({queue.length})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
