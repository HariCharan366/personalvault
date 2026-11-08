import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { VaultStatusBadge } from '@/components/vault/VaultStatusBadge';
import {
  Menu,
  Search,
  Upload,
  Bell,
  Sun,
  Moon,
  User,
  Shield,
  LogOut,
  ChevronDown,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import type { NotificationItem } from '@/types';

interface TopNavProps {
  onMenuToggle: () => void;
  onOpenUpload: () => void;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  onMenuToggle,
  onOpenUpload,
  onSearchChange,
  searchQuery = '',
}) => {
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Sync theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load notifications
  useEffect(() => {
    async function loadNotifs() {
      if (user) {
        const list = await api.getNotifications(user.id);
        setNotifications(list);
      }
    }
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [user]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (user) {
      await api.markAllNotificationsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('info', 'Notifications Cleared', 'All notifications marked as read.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    showToast('info', 'Signed Out', 'Your vault session has been securely closed.');
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-vault-900/80 backdrop-blur-md border-b border-slate-200 dark:border-vault-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-vault-800"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search encrypted documents, tags, categories..."
            value={searchQuery}
            onChange={(e) => {
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/documents?q=${encodeURIComponent(searchQuery)}`);
              }
            }}
            className="w-full text-xs rounded-xl bg-slate-100 dark:bg-vault-850 border border-slate-200 dark:border-vault-700/60 pl-9 pr-4 py-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Right: Quick Upload, Vault Badge, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Upload Document</span>
        </button>

        {/* Vault Status Badge */}
        <VaultStatusBadge />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-vault-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>

        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-vault-800 transition-colors relative"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-vault-900" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-vault-900 border border-slate-200 dark:border-vault-700/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-slate-200 dark:border-vault-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-indigo-500 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-vault-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition-colors ${
                        n.is_read ? 'opacity-70' : 'bg-indigo-500/5'
                      }`}
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-200 dark:border-vault-800 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifDropdown(false)}
                  className="text-xs font-semibold text-indigo-500 hover:underline"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 dark:hover:bg-vault-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-sm">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-vault-900 border border-slate-200 dark:border-vault-700/80 shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-vault-800">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {profile?.full_name || 'Primary Vault Owner'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>

              <Link
                to="/settings/profile"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-vault-800"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Profile Settings</span>
              </Link>

              <Link
                to="/settings/security"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-vault-800"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Security Settings</span>
              </Link>

              <Link
                to="/settings/storage"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-vault-800"
              >
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                <span>Storage & Supabase</span>
              </Link>

              <div className="my-1 border-t border-slate-200 dark:border-vault-800" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-500 hover:bg-rose-500/10 text-left transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
