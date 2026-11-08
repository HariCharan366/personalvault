import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Calendar,
} from 'lucide-react';
import type { NotificationItem } from '@/types';

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifs = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await api.getNotifications(user.id);
    setNotifications(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotifs();
  }, [user]);

  const filteredNotifs = notifications.filter((n) => filter === 'all' || !n.is_read);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await api.markAllNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    showToast('success', 'All Read', 'All notifications marked as read.');
  };

  const getIcon = (type: string) => {
    if (type === 'danger') return <AlertCircle className="w-5 h-5 text-rose-400" />;
    if (type === 'warning') return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    if (type === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    return <Info className="w-5 h-5 text-indigo-400" />;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-500" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            System alerts, expiry reminders, upload summaries, and security notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={notifications.filter((n) => !n.is_read).length === 0}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-vault-800 text-slate-500 hover:text-slate-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-vault-800 text-slate-500 hover:text-slate-200'
          }`}
        >
          Unread ({notifications.filter((n) => !n.is_read).length})
        </button>
      </div>

      {filteredNotifs.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-indigo-400" />}
          title="No Notifications"
          description="You are fully caught up! New alerts and document expiration reminders will be delivered here."
        />
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-vault-800 overflow-hidden">
          {filteredNotifs.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                n.is_read ? 'opacity-70' : 'bg-indigo-500/5'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-vault-850 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-indigo-400 hover:underline shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};
