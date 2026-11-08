import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Files,
  FolderOpen,
  KeyRound,
  Activity,
  ShieldCheck,
  Trash2,
  Settings,
  HardDrive,
  X,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  storageUsedBytes?: number;
  storageQuotaBytes?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  storageUsedBytes = 0,
  storageQuotaBytes = 5368709120, // 5GB default
}) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'All Documents', icon: Files },
    { to: '/folders', label: 'Folders', icon: FolderOpen },
    { to: '/activity', label: 'Activity Logs', icon: Activity },
    { to: '/security', label: 'Security & Logins', icon: ShieldCheck },
    { to: '/trash', label: 'Trash', icon: Trash2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const usedMB = (storageUsedBytes / (1024 * 1024)).toFixed(1);
  const totalGB = (storageQuotaBytes / (1024 * 1024 * 1024)).toFixed(1);
  const percentage = Math.min(100, Math.round((storageUsedBytes / storageQuotaBytes) * 100)) || 1;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-obsidian-950/80 backdrop-blur-md lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={twMerge(
          clsx(
            'fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-white dark:bg-obsidian-950/90 backdrop-blur-2xl border-r border-slate-200 dark:border-white/[0.07] text-slate-700 dark:text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-white/[0.07]">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 via-neon-mint to-teal-400 flex items-center justify-center text-obsidian-950 shadow-md shadow-emerald-500/25 group-hover:shadow-glow-brand transition-all">
              <Shield className="w-5 h-5 fill-obsidian-950/20" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block group-hover:text-neon-mint transition-colors">
                PersonalVault
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-neon-mint font-mono tracking-wider block -mt-0.5 font-bold">
                E2EE DIGITAL LOCKER
              </span>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  twMerge(
                    clsx(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 relative group',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-neon-mint border border-emerald-500/25 dark:border-neon-mint/30 shadow-sm shadow-emerald-500/10'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-obsidian-850'
                    )
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={twMerge(
                        clsx(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-emerald-500 dark:text-neon-mint' : 'text-slate-400 dark:text-slate-500'
                        )
                      )}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-neon-mint shadow-glow-sm" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Storage Usage Widget in Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-obsidian-900/60">
          <div className="flex items-center justify-between text-[11px] mb-2 font-medium">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500 dark:text-neon-mint" /> Storage
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
              {usedMB} MB / {totalGB} GB
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-obsidian-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 via-neon-mint to-teal-400 h-1.5 rounded-full transition-all duration-500 shadow-glow-sm"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-mono">
            <Sparkles className="w-2.5 h-2.5 text-emerald-500 dark:text-neon-mint" />
            <span>AES-256 Client-Side Encrypted</span>
          </div>
        </div>
      </aside>
    </>
  );
};
