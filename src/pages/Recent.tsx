import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { Clock, FileText, ArrowUpRight } from 'lucide-react';
import type { DocumentItem } from '@/types';

interface ContextType {
  documents: DocumentItem[];
}

export const Recent: React.FC = () => {
  const { documents } = useOutletContext<ContextType>();
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const sortedRecent = [...documents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Clock className="w-6 h-6 text-sky-400" />
          <span>Recently Added Documents</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Chronological record of recently uploaded documents
        </p>
      </div>

      {sortedRecent.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8 text-sky-400" />}
          title="No Recent Documents"
          description="Uploaded documents will appear here in chronological order."
        />
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-vault-800 overflow-hidden">
          {sortedRecent.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-vault-850/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                    {doc.title || doc.original_filename}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{doc.category?.name || 'Uncategorized'}</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" size="sm">
                  v{doc.current_version}
                </Badge>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
          ))}
        </Card>
      )}

      <DocumentPreviewModal
        document={selectedDoc}
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  );
};
