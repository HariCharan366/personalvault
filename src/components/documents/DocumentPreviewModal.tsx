import React, { useState, useEffect } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/contexts/ToastContext';
import { downloadEncryptedFile } from '@/services/storage';
import { decryptDocument } from '@/services/crypto';
import { api } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  FileText,
  Download,
  ShieldAlert,
  Loader2,
  Lock,
  Info,
  Calendar,
  HardDrive,
} from 'lucide-react';
import type { DocumentItem } from '@/types';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ document, isOpen, onClose }) => {
  const { isUnlocked, vaultKek } = useVault();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [decryptedBlobUrl, setDecryptedBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;

    async function loadAndDecrypt() {
      if (!isOpen || !document) return;

      if (!vaultKek) {
        setError('Unable to access encryption key. Please refresh.');
        return;
      }

      setIsLoading(true);
      setError(null);
      setTextContent(null);

      try {
        // Download encrypted ciphertext from storage
        const { data, error: dlErr } = await downloadEncryptedFile(document.storage_path);
        if (dlErr || !data) {
          throw new Error(dlErr || 'Failed to download encrypted file from cloud storage.');
        }

        // Decrypt with client KEK + unwrapped DEK
        const decryptedBytes = await decryptDocument(
          data,
          document.encryption_iv,
          document.wrapped_dek,
          vaultKek
        );

        if (!active) return;

        // Log document viewed
        await api.logActivity({
          user_id: document.user_id,
          action: 'document_viewed',
          entity_type: 'document',
          entity_id: document.id,
          entity_name: document.original_filename,
        });

        const mime = document.mime_type || 'application/octet-stream';
        const blob = new Blob([decryptedBytes], { type: mime });
        currentUrl = URL.createObjectURL(blob);
        setDecryptedBlobUrl(currentUrl);

        // If text/csv/json, read string for preview
        if (mime.startsWith('text/') || mime.includes('csv') || mime.includes('json')) {
          const text = new TextDecoder().decode(decryptedBytes);
          setTextContent(text);
        }
      } catch (err: any) {
        console.error('Decryption error:', err);
        if (active) {
          setError(
            err?.message?.includes('operation failed')
              ? 'Decryption failed: Integrity tag mismatch. The file may have been tampered with or corrupted.'
              : err?.message || 'Failed to decrypt document'
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadAndDecrypt();

    return () => {
      active = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      setDecryptedBlobUrl(null);
    };
  }, [isOpen, document, isUnlocked, vaultKek]);

  if (!document) return null;

  const handleDownload = async () => {
    if (!decryptedBlobUrl) {
      showToast('error', 'Download Failed', 'File is not yet decrypted.');
      return;
    }

    const a = window.document.createElement('a');
    a.href = decryptedBlobUrl;
    a.download = document.original_filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);

    await api.logActivity({
      user_id: document.user_id,
      action: 'document_downloaded',
      entity_type: 'document',
      entity_id: document.id,
      entity_name: document.original_filename,
    });

    showToast('success', 'Download Started', `Decrypted "${document.original_filename}" saved to your device.`);
  };

  const isImage = document.mime_type.startsWith('image/');
  const isPdf = document.mime_type === 'application/pdf';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <span className="truncate">{document.original_filename}</span>
        </div>
      }
      description={
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="success">AES-256-GCM Verified</Badge>
          <span>{(document.file_size / 1024).toFixed(1)} KB</span>
          <span>•</span>
          <span>Version {document.current_version}</span>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[450px]">
        {/* Preview Viewer Canvas */}
        <div className="flex-1 bg-slate-100 dark:bg-obsidian-950/80 rounded-2xl border border-slate-200 dark:border-white/[0.08] flex items-center justify-center p-4 relative overflow-hidden min-h-[300px]">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 dark:text-neon-mint" />
              <p className="text-xs font-semibold">Decrypting file with your Vault KEK...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center gap-3 text-rose-500 p-6 text-center max-w-md">
              <ShieldAlert className="w-10 h-10 text-rose-400" />
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs text-slate-400">
                PersonalVault verifies cryptographic integrity before displaying any file.
              </p>
            </div>
          )}

          {!isLoading && !error && decryptedBlobUrl && (
            <>
              {isImage && (
                <img
                  src={decryptedBlobUrl}
                  alt={document.original_filename}
                  className="max-h-[500px] w-auto max-w-full object-contain rounded-xl shadow-lg"
                />
              )}

              {isPdf && (
                <iframe
                  src={decryptedBlobUrl}
                  title={document.original_filename}
                  className="w-full h-[500px] rounded-xl border border-slate-200 dark:border-white/[0.08]"
                />
              )}

              {textContent !== null && (
                <pre className="w-full h-[450px] p-4 text-xs font-mono bg-white dark:bg-obsidian-900 rounded-xl overflow-auto border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {textContent}
                </pre>
              )}

              {!isImage && !isPdf && textContent === null && (
                <div className="flex flex-col items-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Decrypted and Ready for Download
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Direct in-browser viewer not supported for {document.mime_type}.
                    </p>
                  </div>
                  <Button variant="primary" onClick={handleDownload} leftIcon={<Download className="w-4 h-4" />}>
                    Download Decrypted File
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Document Details & Cryptographic Inspector */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-obsidian-900/60 backdrop-blur-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-500 dark:text-neon-mint" /> Document Details
            </h4>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Filename</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">
                  {document.original_filename}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">File Size</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  {(document.file_size / 1024).toFixed(1)} KB ({document.file_size.toLocaleString()} bytes)
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Uploaded At</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(document.created_at).toLocaleString()}
                </span>
              </div>

              {document.expiry_date && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Expiry Date</span>
                  <span className="font-semibold text-amber-400">{document.expiry_date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cryptographic Proof */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-obsidian-900/60 backdrop-blur-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-500 dark:text-neon-mint" /> Security & Integrity
            </h4>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Cipher Algorithm</span>
                <span className="font-mono text-[11px] text-emerald-500 dark:text-neon-mint font-semibold">AES-256-GCM (W3C WebCrypto)</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">SHA-256 Fingerprint</span>
                <span className="font-mono text-[10px] text-slate-400 break-all block p-2 rounded-lg bg-slate-200 dark:bg-obsidian-950 border border-slate-300 dark:border-white/[0.06]">
                  {document.sha256_hash}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Storage Object Path</span>
                <span className="font-mono text-[10px] text-slate-400 break-all block">
                  {document.storage_path}
                </span>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleDownload}
            disabled={!decryptedBlobUrl || isLoading}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download Decrypted File
          </Button>
        </div>
      </div>
    </Modal>
  );
};

