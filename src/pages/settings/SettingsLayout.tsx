import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { User, Shield, HardDrive } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const SettingsLayout: React.FC = () => {
  const tabs = [
    { to: '/settings/profile', label: 'Profile', icon: User },
    { to: '/settings/security', label: 'Security & Auth', icon: Shield },
    { to: '/settings/storage', label: 'Storage & Supabase', icon: HardDrive },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Account & Vault Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure personal credentials, security keys, and cloud storage providers
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-vault-800 gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                twMerge(
                  clsx(
                    'pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors',
                    isActive
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )
                )
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
};

