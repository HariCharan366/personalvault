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
    { to: '/vault', label: 'Vault Security', icon: KeyRound },
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
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={twMerge(
          clsx(
            'fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-slate-900 border-r border-vault-800 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-vault-800">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">PersonalVault</span>
              <span className="text-[10px] text-indigo-400 font-mono tracking-wider block -mt-0.5">
                ENCRYPTED STORAGE
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
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-vault-850'
                    )
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Storage Usage Widget in Footer */}
        <div className="p-4 border-t border-vault-800 bg-vault-950/50">
          <div className="flex items-center justify-between text-[11px] mb-2 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Storage
            </span>
            <span className="text-slate-400 font-mono">
              {usedMB} MB / {totalGB} GB
            </span>
          </div>

          <div className="w-full bg-vault-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-sky-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-500 mt-2 text-center">AES-256 Client-Side Encrypted</p>
        </div>
      </aside>
    </>
  );
};
