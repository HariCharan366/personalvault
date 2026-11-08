import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import {
  Files,
  HardDrive,
  FolderOpen,
  Clock,
  Shield,
  UploadCloud,
  AlertTriangle,
  FileText,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import type { DocumentItem, Folder, ActivityLog } from '@/types';

interface ContextType {
  refreshData: () => void;
  folders: Folder[];
  documents: DocumentItem[];
}

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { folders, documents, refreshData } = useOutletContext<ContextType>();

  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentItem | null>(null);

  useEffect(() => {
    async function loadActivity() {
      if (!user) return;
      const logs = await api.getActivityLogs(user.id);
      setRecentActivities(logs.slice(0, 6));
    }
    loadActivity();
  }, [user]);

  const handleActivityClick = async (act: ActivityLog) => {
    if (act.entity_type === 'document' && act.entity_id) {
      const existing = documents.find((d) => d.id === act.entity_id);
      if (existing) {
        setSelectedDocForPreview(existing);
        return;
      }
      const fetched = await api.getDocumentById(act.entity_id);
      if (fetched) {
        setSelectedDocForPreview(fetched);
      }
    }
  };

  // Statistics calculation
  const totalDocuments = documents.length;
  const totalStorageBytes = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
  const quotaBytes = profile?.storage_quota_bytes || 5368709120; // 5 GB
  const availableBytes = Math.max(0, quotaBytes - totalStorageBytes);
  const usedPercentage = Math.min(100, (totalStorageBytes / quotaBytes) * 100);

  const usedMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);
  const availableGB = (availableBytes / (1024 * 1024 * 1024)).toFixed(2);
  const totalQuotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(1);

  // Recently uploaded
  const recentlyUploaded = [...documents].slice(0, 5);

  // Upcoming expirations (next 30 days)
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = documents.filter((d) => {
    if (!d.expiry_date) return false;
    const exp = new Date(d.expiry_date);
    return exp >= today && exp <= thirtyDaysLater;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 border border-white/[0.08] shadow-2xl">
        {/* Subtle decorative glow accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-neon-mint/[0.08] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-neon-cyan/[0.05] rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome, {profile?.full_name || 'Haricharan'}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/documents">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Files className="w-4 h-4" />}
              >
                Browse Documents
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Expiry Warning Alert (if any documents expiring) */}
      {expiringSoon.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-300 block mb-0.5">
              Action Required: {expiringSoon.length} Document(s) Expiring Soon!
            </span>
            <span>
              {expiringSoon.map((d) => `"${d.title || d.original_filename}" (Expires ${d.expiry_date})`).join(', ')}.
            </span>
          </div>
          <Link to="/documents" className="font-semibold text-amber-300 hover:underline shrink-0">
            View All →
          </Link>
        </div>
      )}

      {/* Top 4 Statistic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <Card className="p-5 flex items-center justify-between hover:border-neon-mint/30 hover:shadow-glow-sm transition-all group">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Documents</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-emerald-500 dark:group-hover:text-neon-mint transition-colors">
              {totalDocuments}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-neon-mint flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <Files className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Storage Used */}
        <Card className="p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all group">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Storage Used</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-neon-cyan transition-colors">
              {usedMB} <span className="text-sm font-semibold text-slate-400 font-normal">MB</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{usedPercentage.toFixed(1)}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-neon-cyan flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <HardDrive className="w-6 h-6" />
          </div>
        </Card>

        {/* Available Storage */}
        <Card className="p-5 flex items-center justify-between hover:border-emerald-500/30 transition-all group">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Available Quota</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-neon-mint transition-colors">
              {availableGB} <span className="text-sm font-semibold text-slate-400 font-normal">GB</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-neon-teal flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Folders */}
        <Card className="p-5 flex items-center justify-between hover:border-purple-500/30 transition-all group">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Folders</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-purple-400 transition-colors">
              {folders.length}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <FolderOpen className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Main Grid: Storage Status & Recently Uploaded */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Capacity & Security Specifications */}
        <Card className="p-6 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-500 dark:text-neon-mint" /> Storage Capacity
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-neon-mint">{usedPercentage.toFixed(1)}%</span>
          </div>

          {/* Glowing Gradient Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-obsidian-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 via-neon-mint to-teal-400 h-2.5 rounded-full transition-all duration-500 shadow-glow-sm"
              style={{ width: `${Math.max(usedPercentage, 3)}%` }}
            />
          </div>

          <div className="space-y-2.5 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-obsidian-850 border border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total Documents</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{totalDocuments}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Active Folders</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{folders.length}</span>
            </div>
          </div>
        </Card>

        {/* Recently Uploaded Documents */}
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-500 dark:text-neon-cyan" /> Recent Uploads
            </h3>
            <Link to="/documents" className="text-xs font-semibold text-emerald-600 dark:text-neon-mint hover:underline">
              View all ({totalDocuments}) →
            </Link>
          </div>

          {recentlyUploaded.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-obsidian-850/60 border border-dashed border-slate-200 dark:border-white/[0.08]">
              <UploadCloud className="w-8 h-8 text-emerald-500 dark:text-neon-mint mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No documents</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {recentlyUploaded.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocForPreview(doc)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-obsidian-800/60 p-2.5 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-500 dark:group-hover:text-neon-mint transition-colors">
                        {doc.title || doc.original_filename}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono">{(doc.file_size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" size="sm">
                      AES-256
                    </Badge>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-neon-mint transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" /> Recent Activity
          </h3>
          <Link to="/activity" className="text-xs font-semibold text-emerald-600 dark:text-neon-mint hover:underline">
            View all →
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No recent actions recorded.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => handleActivityClick(act)}
                className={`p-3 rounded-xl bg-slate-50 dark:bg-obsidian-850/70 border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2 hover:border-emerald-500/30 transition-colors ${
                  act.entity_type === 'document' && act.entity_id ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-obsidian-800/80' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {act.action.replace(/_/g, ' ')}
                    {act.entity_name ? ` • "${act.entity_name}"` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(act.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Badge variant="outline" size="sm">
                  {act.entity_type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedDocForPreview}
        isOpen={Boolean(selectedDocForPreview)}
        onClose={() => setSelectedDocForPreview(null)}
        onDeleted={refreshData}
      />
    </div>
  );
};
