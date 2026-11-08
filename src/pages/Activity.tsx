import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Activity as ActivityIcon,
  Search,
  Filter,
  Calendar,
  Laptop,
  FileText,
  Lock,
  Layers,
  Star,
  Trash2,
} from 'lucide-react';
import type { ActivityLog } from '@/types';

export const Activity: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [activityType, setActivityType] = useState<string>('all');

  useEffect(() => {
    async function loadLogs() {
      if (!user) return;
      setIsLoading(true);
      const data = await api.getActivityLogs(user.id);
      setLogs(data);
      setIsLoading(false);
    }
    loadLogs();
  }, [user]);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      // Search
      const matchesSearch =
        searchQuery === '' ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.device?.toLowerCase().includes(searchQuery.toLowerCase());

      // Date
      const logTime = new Date(log.created_at).getTime();
      let matchesDate = true;
      if (dateRange === 'today') matchesDate = logTime >= todayStart;
      else if (dateRange === '7days') matchesDate = logTime >= sevenDaysAgo;
      else if (dateRange === '30days') matchesDate = logTime >= thirtyDaysAgo;

      // Type
      let matchesType = true;
      if (activityType !== 'all') {
        matchesType = log.entity_type === activityType;
      }

      return matchesSearch && matchesDate && matchesType;
    });
  }, [logs, searchQuery, dateRange, activityType]);

  const getActionIcon = (action: string) => {
    if (action.includes('document')) return <FileText className="w-4 h-4 text-indigo-400" />;
    if (action.includes('vault')) return <Lock className="w-4 h-4 text-amber-400" />;
    if (action.includes('category') || action.includes('folder'))
      return <Layers className="w-4 h-4 text-sky-400" />;
    if (action.includes('favorite')) return <Star className="w-4 h-4 text-purple-400" />;
    return <ActivityIcon className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <ActivityIcon className="w-6 h-6 text-indigo-500" />
          <span>Activity Audit Trail</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Comprehensive tamper-resistant logging of all document operations and vault state changes
        </p>
      </div>

      {/* Filter and Search controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search activity, entity name, device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-700 pl-8 pr-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-700 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          <div>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-700 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="all">All Activity Types</option>
              <option value="document">Documents</option>
              <option value="vault">Vault Security</option>
              <option value="category">Categories</option>
              <option value="folder">Folders</option>
              <option value="auth">Authentication</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="w-8 h-8 text-indigo-400" />}
          title="No Activity Found"
          description="Actions performed in your vault will be recorded in this audit timeline."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-vault-800 bg-slate-50 dark:bg-vault-850/60 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-4">Action</th>
                  <th className="p-3.5">Target Entity</th>
                  <th className="p-3.5">Device / Client</th>
                  <th className="p-3.5 pr-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-vault-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-vault-850/40 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-vault-800 shrink-0">
                          {getActionIcon(log.action)}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
                          {log.entity_name || '—'}
                        </span>
                        <Badge variant="outline" size="sm">
                          {log.entity_type}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      <span className="flex items-center gap-1.5 truncate max-w-xs">
                        <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {log.device || 'Web Browser'}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

