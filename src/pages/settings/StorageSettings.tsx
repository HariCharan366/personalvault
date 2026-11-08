import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { isSupabaseConfigured, testSupabaseConnection } from '@/integrations/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  HardDrive,
  Cloud,
  RefreshCw,
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
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isConfigured ? 'Cloud Storage' : 'Local Storage'}
                </h3>
                <Badge variant={isConfigured ? 'success' : 'info'}>
                  {isConfigured ? 'Connected' : 'Active'}
                </Badge>
              </div>
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
              {testResult.success ? '✓ Connected' : '⚠️ Diagnostic'}
            </p>
            <p>{testResult.message}</p>
          </div>
        )}
      </Card>

      {/* Storage Quota Information */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" /> Storage Quota
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-obsidian-900/60 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-slate-500 block mb-1">Plan</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">Personal Vault Pro</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-obsidian-900/60 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-slate-500 block mb-1">Quota</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">{quotaGB} GB</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

