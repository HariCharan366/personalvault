import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import {
  Files,
  HardDrive,
  Layers,
  Star,
  Clock,
  Shield,
  UploadCloud,
  ChevronRight,
  AlertTriangle,
  FileText,
  Activity,
  ArrowUpRight,
  Unlock,
} from 'lucide-react';
import type { DocumentItem, Category, ActivityLog } from '@/types';

interface ContextType {
  refreshData: () => void;
  categories: Category[];
  documents: DocumentItem[];
}

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { isVaultInitialized, isUnlocked } = useVault();
  const { categories, documents, refreshData } = useOutletContext<ContextType>();

  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentItem | null>(null);

  useEffect(() => {
    async function loadActivity() {
      if (user) {
        const logs = await api.getActivityLogs(user.id);
        setRecentActivities(logs.slice(0, 6));
      }
    }
    loadActivity();
  }, [user]);

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

  // Favorites
  const favorites = documents.filter((d) => d.is_favorite).slice(0, 5);

  // Upcoming expirations (next 30 days)
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = documents.filter((d) => {
    if (!d.expiry_date) return false;
    const exp = new Date(d.expiry_date);
    return exp >= today && exp <= thirtyDaysLater;
  });

  // Category storage distribution
  const categoryStats = categories.map((cat) => {
    const docs = documents.filter((d) => d.category_id === cat.id);
    const bytes = docs.reduce((sum, d) => sum + (d.file_size || 0), 0);
    return {
      id: cat.id,
      name: cat.name,
      color: cat.color || '#6366f1',
      count: docs.length,
      bytes,
      percentage: totalStorageBytes > 0 ? (bytes / totalStorageBytes) * 100 : 0,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Banner & Vault Security Alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-vault-900 to-indigo-950/80 border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
              Digital Locker Overview
            </span>
            {isUnlocked ? (
              <Badge variant="success" size="sm">
                Vault Unlocked
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Vault Locked
              </Badge>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Welcome back, {profile?.full_name || 'Vault Owner'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            All files are protected with zero-knowledge AES-256-GCM encryption. Documents cannot be decrypted on the server.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <Link to="/vault">
            <Button
              variant={isUnlocked ? 'secondary' : 'primary'}
              size="sm"
              leftIcon={isUnlocked ? <Unlock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            >
              {isUnlocked ? 'Vault Controls' : 'Unlock Documents'}
            </Button>
          </Link>
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
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Documents</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {totalDocuments}
            </h3>
            <p className="text-[11px] text-emerald-500 font-medium mt-1">Encrypted in cloud</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
            <Files className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Storage Used */}
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Storage Used</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {usedMB} <span className="text-sm font-semibold text-slate-400">MB</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">{usedPercentage.toFixed(1)}% of {totalQuotaGB} GB</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 dark:text-sky-400 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </Card>

        {/* Available Storage */}
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Available Storage</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {availableGB} <span className="text-sm font-semibold text-slate-400">GB</span>
            </h3>
            <p className="text-[11px] text-emerald-500 font-medium mt-1">Sufficient quota</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </Card>

        {/* Total Categories */}
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Categories</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {categories.length}
            </h3>
            <p className="text-[11px] text-purple-400 font-medium mt-1">Organized lockers</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Main Grid: Storage Distribution & Recently Uploaded */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Distribution Chart & Breakdown */}
        <Card className="p-6 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" /> Storage Breakdown
            </h3>
            <span className="text-xs font-mono text-slate-400">{usedPercentage.toFixed(1)}% Used</span>
          </div>

          {/* Visual Bar */}
          <div className="w-full bg-slate-100 dark:bg-vault-800 rounded-full h-3 overflow-hidden flex">
            {categoryStats.map(
              (cat) =>
                cat.percentage > 0 && (
                  <div
                    key={cat.id}
                    title={`${cat.name}: ${(cat.bytes / 1024).toFixed(1)} KB (${cat.percentage.toFixed(1)}%)`}
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    className="h-full transition-all duration-300"
                  />
                )
            )}
            {totalStorageBytes === 0 && <div className="w-full h-full bg-slate-700/30" />}
          </div>

          {/* Category-wise breakdown list */}
          <div className="space-y-2 pt-2 divide-y divide-slate-100 dark:divide-vault-800 text-xs">
            {categoryStats.slice(0, 6).map((cat) => (
              <div key={cat.id} className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{cat.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {(cat.bytes / 1024).toFixed(0)} KB
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({cat.count} files)</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-vault-800">
            <Link to="/settings/storage" className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1">
              <span>View storage settings & Supabase cloud</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Recently Uploaded Documents */}
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" /> Recently Uploaded
            </h3>
            <Link to="/documents" className="text-xs font-semibold text-indigo-500 hover:underline">
              View all ({totalDocuments}) →
            </Link>
          </div>

          {recentlyUploaded.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-vault-850/50 border border-dashed border-slate-200 dark:border-vault-800">
              <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Your vault is clean</p>
              <p className="text-[11px] text-slate-400 mt-1">Upload your first confidential file to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-vault-800">
              {recentlyUploaded.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocForPreview(doc)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-vault-850/60 p-2 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-400 transition-colors">
                        {doc.title || doc.original_filename}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{doc.category?.name || 'Uncategorized'}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.is_favorite && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                    <Badge variant="outline" size="sm">
                      AES-256
                    </Badge>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid: Favorites & Recent Security Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Starred Favorites */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Starred Favorites
            </h3>
            <Link to="/favorites" className="text-xs font-semibold text-indigo-500 hover:underline">
              View all →
            </Link>
          </div>

          {favorites.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No favorites marked. Click the star icon on any document to pin it here.
            </p>
          ) : (
            <div className="space-y-2">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  onClick={() => setSelectedDocForPreview(fav)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-vault-800 hover:border-amber-500/40 bg-white dark:bg-vault-900 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {fav.title || fav.original_filename}
                      </p>
                      <p className="text-[10px] text-slate-400">{(fav.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Badge variant="purple" size="sm">
                    Favorite
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Audit & Security Activity */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Recent Activity Log
            </h3>
            <Link to="/activity" className="text-xs font-semibold text-indigo-500 hover:underline">
              Audit trail →
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No recent actions recorded.</p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-vault-850/60 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {act.action.replace(/_/g, ' ')}
                      {act.entity_name ? ` • "${act.entity_name}"` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400">
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
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedDocForPreview}
        isOpen={Boolean(selectedDocForPreview)}
        onClose={() => setSelectedDocForPreview(null)}
      />
    </div>
  );
};
