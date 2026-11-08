import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { DocumentActionsModal } from '@/components/documents/DocumentActionsModal';
import { DocumentVersionModal } from '@/components/documents/DocumentVersionModal';
import {
  FileText,
  ArrowLeft,
  Eye,
  Trash2,
  Edit,
  History,
  Lock,
  Calendar,
  HardDrive,
  Hash,
  FolderOpen,
} from 'lucide-react';
import type { DocumentItem, Folder } from '@/types';

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showPreview, setShowPreview] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const loadDoc = async () => {
    if (!id || !user) return;
    setIsLoading(true);
    const [doc, flds] = await Promise.all([
      api.getDocumentById(id),
      api.getFolders(user.id),
    ]);
    setDocument(doc);
    setFolders(flds);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDoc();
  }, [id, user]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Loading document record...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Document not found</p>
        <Link to="/documents">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Documents
          </Button>
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!user) return;
    await api.softDeleteDocument(document.id);
    showToast('warning', 'Moved to Trash', `"${document.title}" moved to trash.`);
    navigate('/documents');
  };

  const assignedFolder = folders.find((f) => f.id === document.folder_id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top breadcrumb navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Documents</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowActions(true)}
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Trash
          </Button>
        </div>
      </div>

      {/* Main Document Details Card */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-vault-800 pb-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {document.title || document.original_filename}
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{document.original_filename}</p>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="success">AES-256-GCM Encrypted</Badge>
                <Badge variant="outline">Version {document.current_version}</Badge>
                {assignedFolder && (
                  <Badge variant="info">Folder: {assignedFolder.name}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPreview(true)}
              leftIcon={<Eye className="w-4 h-4" />}
            >
              Decrypt & Preview
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowVersions(true)}
              leftIcon={<History className="w-4 h-4" />}
            >
              Versions
            </Button>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 flex items-center gap-1.5 mb-1">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> File Size
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {(document.file_size / 1024).toFixed(1)} KB ({document.file_size.toLocaleString()} bytes)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Upload Date
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(document.created_at).toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-purple-400" /> Last Modified
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(document.updated_at).toLocaleString()}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 flex items-center gap-1.5 mb-1">
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" /> Folder
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {assignedFolder ? assignedFolder.name : 'Root (No Folder)'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Expiry Date
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {document.expiry_date || 'No Expiration'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 flex items-center gap-1.5 mb-1">
              <Lock className="w-3.5 h-3.5 text-indigo-400" /> MIME Type
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
              {document.mime_type}
            </p>
          </div>
        </div>

        {/* Cryptographic Signature & Hash */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <Hash className="w-4 h-4" />
            <span>Cryptographic Fingerprint (SHA-256 Plaintext Hash):</span>
          </div>
          <p className="text-[11px] text-slate-300 break-all bg-vault-950 p-2 rounded-lg border border-vault-800">
            {document.sha256_hash}
          </p>
        </div>
      </Card>

      {/* Modals */}
      <DocumentPreviewModal
        document={document}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />

      <DocumentActionsModal
        document={document}
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        folders={folders}
        onUpdated={loadDoc}
      />

      <DocumentVersionModal
        document={document}
        isOpen={showVersions}
        onClose={() => setShowVersions(false)}
        onVersionUpdated={loadDoc}
      />
    </div>
  );
};
