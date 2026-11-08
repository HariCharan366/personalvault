import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
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
    const interval = setInterval(loadNotifs, 30000);
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
    <header className="h-16 bg-white/70 dark:bg-obsidian-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.07] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-850"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search encrypted files, tags, folders..."
            value={searchQuery}
            onChange={(e) => {
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/documents?q=${encodeURIComponent(searchQuery)}`);
              }
            }}
            className="w-full text-xs rounded-xl bg-slate-100 dark:bg-obsidian-900/80 border border-slate-200 dark:border-white/[0.08] pl-9 pr-4 py-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-neon-mint transition-colors"
          />
        </div>
      </div>

      {/* Right: Quick Upload, Vault Badge, Notifications, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-400 via-neon-mint to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-obsidian-950 shadow-md shadow-emerald-500/20 hover:shadow-glow-brand transition-all active:scale-95 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Upload Document</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-850 transition-colors cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
        </button>

        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-850 transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-obsidian-950" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-white/[0.1] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-emerald-500 dark:text-neon-mint hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition-colors ${
                        n.is_read ? 'opacity-70' : 'bg-emerald-500/5'
                      }`}
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-200 dark:border-white/[0.08] text-center">
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifDropdown(false)}
                  className="text-xs font-semibold text-emerald-500 dark:text-neon-mint hover:underline"
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
            className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 dark:hover:bg-obsidian-850 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-obsidian-950 font-black text-xs flex items-center justify-center uppercase shadow-sm">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-white/[0.1] shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-white/[0.08]">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {profile?.full_name || 'Primary Vault Owner'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>

              <Link
                to="/settings/profile"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-obsidian-850"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Profile Settings</span>
              </Link>

              <Link
                to="/settings/security"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-obsidian-850"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-500 dark:text-neon-mint" />
                <span>Security Settings</span>
              </Link>

              <Link
                to="/settings/storage"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-obsidian-850"
              >
                <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                <span>Storage & Cloud</span>
              </Link>

              <div className="my-1 border-t border-slate-200 dark:border-white/[0.08]" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-500 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
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
