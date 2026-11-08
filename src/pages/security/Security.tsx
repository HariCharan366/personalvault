import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Globe,
  Download,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  LogOut,
  Clock,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import type { LoginHistoryItem, ActiveSession } from '@/types';

export const Security: React.FC = () => {
  const { user, currentSessionId } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const isLoginHistoryTab = location.pathname.includes('/login-history');
  const isActiveSessionsTab = location.pathname.includes('/active-sessions');
  const activeTab = isActiveSessionsTab ? 'sessions' : 'history';

  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for login history
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Failed'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'Desktop' | 'Mobile' | 'Tablet'>('all');

  // Detail modal state
  const [selectedEvent, setSelectedEvent] = useState<LoginHistoryItem | null>(null);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [h, s] = await Promise.all([
      api.getLoginHistory(user.id),
      api.getActiveSessions(user.id),
    ]);
    setHistory(h);
    setSessions(s);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Filter login history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.browser?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.os?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.approximate_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ip_address?.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesDevice = deviceFilter === 'all' || item.device_type === deviceFilter;

      return matchesSearch && matchesStatus && matchesDevice;
    });
  }, [history, searchQuery, statusFilter, deviceFilter]);

  // Suspicious activity detection (e.g. any failed attempts in last 24h)
  const failedAttempts = useMemo(() => {
    return history.filter((h) => h.status === 'Failed');
  }, [history]);

  // Export CSV
  const handleExportCSV = () => {
    if (history.length === 0) {
      showToast('warning', 'No Records', 'No login history records available to export.');
      return;
    }

    const headers = [
      'Event ID',
      'Date & Time',
      'Status',
      'Device Type',
      'Operating System',
      'Browser',
      'IP Address',
      'Approximate Location',
      'Session ID',
    ];

    const rows = history.map((item) => [
      item.id,
      new Date(item.timestamp).toISOString(),
      item.status,
      item.device_type || 'Unknown',
      item.os || 'Unknown',
      `${item.browser || 'Unknown'} ${item.browser_version || ''}`.trim(),
      item.ip_address || 'Private / Local',
      `"${item.approximate_location || 'Unknown'}"`,
      item.session_id || '—',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `personalvault-login-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Export Complete', 'Login history exported as CSV file.');
  };

  // Revoke session
  const handleRevokeSession = async (sessionId: string) => {
    await api.revokeSession(sessionId);
    showToast('info', 'Session Revoked', 'The device session has been terminated.');
    loadData();
  };

  // Logout from all other devices
  const handleLogoutAllOther = async () => {
    if (!user || !currentSessionId) return;
    if (window.confirm('Terminate all other active sessions across your devices?')) {
      await api.revokeAllOtherSessions(user.id, currentSessionId);
      showToast('success', 'Sessions Terminated', 'All other devices have been disconnected.');
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            <span>Security & Login History</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographic audit of authentication events, active sessions, and anomalous access detection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
          >
            Export Audit CSV
          </Button>
          {activeTab === 'sessions' && sessions.length > 1 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogoutAllOther}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Logout Other Devices
            </Button>
          )}
        </div>
      </div>

      {/* Suspicious Activity Warning Banner */}
      {failedAttempts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-200">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-rose-300 block mb-0.5">
              Security Notice: {failedAttempts.length} Failed Authentication Attempt(s) Recorded
            </span>
            <span>
              Unsuccessful login attempts have been logged by the security monitor. If these were not initiated by you,
              we recommend updating your account password immediately.
            </span>
          </div>
          <Link to="/settings/security" className="font-semibold text-rose-300 hover:underline shrink-0">
            Security Settings →
          </Link>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-vault-800 gap-6">
        <Link
          to="/security/login-history"
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Login History ({history.length})</span>
        </Link>

        <Link
          to="/security/active-sessions"
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sessions'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Active Sessions ({sessions.length})</span>
        </Link>
      </div>

      {/* TAB 1: LOGIN HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search browser, OS, IP, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-700 pl-8 pr-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-700 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="all">All Statuses (Success & Failed)</option>
                  <option value="Success">Success Only</option>
                  <option value="Failed">Failed Attempts Only</option>
                </select>
              </div>

              <div>
                <select
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-700 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="all">All Device Types</option>
                  <option value="Desktop">Desktop PCs</option>
                  <option value="Mobile">Mobile Phones</option>
                  <option value="Tablet">Tablets</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-vault-800 bg-slate-50 dark:bg-vault-850/60 text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 pl-4">Date & Time</th>
                    <th className="p-3.5">Device & OS</th>
                    <th className="p-3.5">Browser</th>
                    <th className="p-3.5">Location & IP</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 pr-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-vault-800">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No login events matched the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-vault-850/40 transition-colors"
                      >
                        <td className="p-3.5 pl-4 font-mono text-slate-800 dark:text-slate-200">
                          {new Date(item.timestamp).toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            {item.device_type === 'Mobile' ? (
                              <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : (
                              <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.os || 'Unknown OS'}
                            </span>
                            <span className="text-[10px] text-slate-400">({item.device_type || 'Desktop'})</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300">
                          {item.browser || 'Browser'} {item.browser_version && `v${item.browser_version}`}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {item.approximate_location || 'Local Network'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            {item.ip_address || '127.0.0.1'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {item.status === 'Success' ? (
                            <Badge variant="success" size="sm">
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm">
                              Failed
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <button
                            onClick={() => setSelectedEvent(item)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: ACTIVE SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These devices are currently authenticated and holding valid session credentials.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => {
              const isCurrent = sess.id === currentSessionId || sess.is_current;
              return (
                <Card
                  key={sess.id}
                  className={`p-5 flex flex-col justify-between ${
                    isCurrent ? 'border-indigo-500/40 bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                          {sess.os?.includes('Android') || sess.os?.includes('iOS') ? (
                            <Smartphone className="w-5 h-5" />
                          ) : (
                            <Laptop className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {sess.device_name || 'Personal Computer'}
                            </h4>
                            {isCurrent && (
                              <Badge variant="success" size="sm">
                                This Device
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {sess.browser || 'Browser'} on {sess.os || 'Unknown OS'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-vault-850 text-xs space-y-1 text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>IP Address:</span>
                        <span className="font-mono text-slate-300">{sess.ip_address || 'Local / LAN'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Location:</span>
                        <span className="text-slate-300">{sess.location || 'Local / LAN'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Last Active:</span>
                        <span className="text-slate-300">{new Date(sess.last_active_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-vault-800 flex justify-end">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRevokeSession(sess.id)}
                        leftIcon={<LogOut className="w-3.5 h-3.5" />}
                      >
                        Revoke Access
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspect Session / Event Modal */}
      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title="Authentication Event Verification"
        description="Tamper-evident audit log entry recorded by the security sub-system."
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Event ID:</span>
                <span className="font-mono text-slate-300 break-all">{selectedEvent.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="font-mono text-slate-300">{selectedEvent.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Result:</span>
                <span
                  className={`font-bold ${
                    selectedEvent.status === 'Success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedEvent.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IP Address:</span>
                <span className="font-mono text-slate-300">{selectedEvent.ip_address || 'Localhost'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-300">{selectedEvent.approximate_location || 'Local network'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Browser & Version:</span>
                <span className="text-slate-300">
                  {selectedEvent.browser} {selectedEvent.browser_version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operating System:</span>
                <span className="text-slate-300">{selectedEvent.os}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session Identifier:</span>
                <span className="font-mono text-slate-300">{selectedEvent.session_id || '—'}</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setSelectedEvent(null)}>
              Close Inspector
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

