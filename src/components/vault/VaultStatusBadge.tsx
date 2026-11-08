import React, { useState } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';
import { VaultUnlockModal } from './VaultUnlockModal';

export const VaultStatusBadge: React.FC = () => {
  const { isVaultInitialized, isUnlocked, lockVault } = useVault();
  const [showModal, setShowModal] = useState(false);

  if (!isVaultInitialized) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Setup Vault</span>
        </button>
        <VaultUnlockModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  if (isUnlocked) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 dark:bg-neon-mint/10 border border-emerald-500/25 dark:border-neon-mint/30 text-emerald-600 dark:text-neon-mint shadow-sm shadow-emerald-500/10">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-neon-mint animate-pulse shadow-glow-sm" />
          <Unlock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-mono">UNLOCKED</span>
        </div>
        <button
          onClick={lockVault}
          title="Lock Vault Immediately"
          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          aria-label="Lock Vault"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-obsidian-850 border border-slate-300 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-500 dark:hover:text-neon-mint transition-all shadow-sm cursor-pointer"
      >
        <Lock className="w-3.5 h-3.5 text-rose-400" />
        <span className="font-mono">LOCKED</span>
      </button>
      <VaultUnlockModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
