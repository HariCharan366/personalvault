import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { Star, FileText, Eye, Trash2 } from 'lucide-react';
import type { DocumentItem, Category, Folder } from '@/types';

interface ContextType {
  documents: DocumentItem[];
  categories: Category[];
  folders: Folder[];
  refreshData: () => void;
}

export const Favorites: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { documents, refreshData } = useOutletContext<ContextType>();

  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const favoriteDocs = documents.filter((d) => d.is_favorite);

  const handleRemoveFavorite = async (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await api.updateDocument(doc.id, { is_favorite: false });
    await api.logActivity({
      user_id: user.id,
      action: 'favorite_removed',
      entity_type: 'document',
      entity_id: doc.id,
      entity_name: doc.title,
    });
    refreshData();
    showToast('info', 'Favorite Removed', `"${doc.title}" removed from favorites.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
          <span>Starred Favorites</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Quickly access your most critical personal records
        </p>
      </div>

      {favoriteDocs.length === 0 ? (
        <EmptyState
          icon={<Star className="w-8 h-8 text-amber-400" />}
          title="No Favorites Yet"
          description="Click the star icon next to any document to pin it to this quick-access locker."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favoriteDocs.map((doc) => (
            <Card
              key={doc.id}
              onClick={() => setPreviewDoc(doc)}
              className="p-4 hover:border-amber-500/40 hover:shadow-glow-sm transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => handleRemoveFavorite(doc, e)}
                    className="p-1.5 text-amber-400 hover:text-slate-400 transition-colors"
                    title="Remove from favorites"
                  >
                    <Star className="w-4 h-4 fill-amber-400" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-400 transition-colors">
                  {doc.title || doc.original_filename}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.original_filename}</p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-vault-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                <Badge variant="purple" size="sm">
                  {doc.category?.name || 'Unfiled'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DocumentPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
};
