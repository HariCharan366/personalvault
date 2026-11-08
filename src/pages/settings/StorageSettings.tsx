import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { isSupabaseConfigured, testSupabaseConnection, STORAGE_BUCKET } from '@/integrations/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  FileCode,
  Shield,
} from 'lucide-react';

export const StorageSettings: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isConfigured = isSupabaseConfigured();
  const quotaBytes = profile?.storage_quota_bytes || 5368709120;
  const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(1);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      showToast('success', 'Connection Verified', res.message);
    } else {
      showToast('warning', 'Connection Check', res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cloud Storage Status */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl ${
                isConfigured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
              }`}
            >
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isConfigured ? 'Supabase Cloud Connected' : 'Local Sandbox Development Mode'}
                </h3>
                <Badge variant={isConfigured ? 'success' : 'info'}>
                  {isConfigured ? 'Live Cloud' : 'Local Mode'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isConfigured
                  ? `Encrypted documents are stored in private Supabase Storage bucket "${STORAGE_BUCKET}".`
                  : 'Operating in self-contained local mode with full AES-256-GCM encryption.'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            isLoading={isTesting}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Test Connection
          </Button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <p className="font-semibold mb-1">
              {testResult.success ? '✓ Verification Successful' : '⚠️ Connection Diagnostic'}
            </p>
            <p>{testResult.message}</p>
          </div>
        )}
      </Card>

      {/* Storage Quota Information */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-sky-400" /> Storage Capacity & Quota
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 block mb-1">Account Tier</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">Personal Vault Pro</p>
            <p className="text-[11px] text-slate-400 mt-1">Unlimited encrypted document uploads up to quota</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800">
            <span className="text-slate-500 block mb-1">Total Dedicated Quota</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">{quotaGB} GB</p>
            <p className="text-[11px] text-slate-400 mt-1">Managed via PostgreSQL profiles table</p>
          </div>
        </div>
      </Card>

      {/* Supabase Connection Setup Instructions */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400" /> Connecting Supabase Cloud (Optional / Production)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          To link your own Supabase project, follow these two quick steps:
        </p>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60 font-mono space-y-1.5">
            <p className="text-indigo-400 font-bold">1. Apply Database Migrations:</p>
            <p className="text-slate-400 text-[11px]">
              Open your Supabase Dashboard → SQL Editor, and execute the SQL file located in:
            </p>
            <code className="text-amber-300 block text-[11px]">
              supabase/migrations/20261108000000_personalvault_schema.sql
            </code>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60 font-mono space-y-1.5">
            <p className="text-indigo-400 font-bold">2. Set Environment Variables in .env:</p>
            <p className="text-slate-400 text-[11px]">Add your project URL and public anon key:</p>
            <div className="text-[11px] text-emerald-400 space-y-0.5">
              <p>VITE_SUPABASE_URL=https://your-project-id.supabase.co</p>
              <p>VITE_SUPABASE_ANON_KEY=eyJhbGciOi...</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

