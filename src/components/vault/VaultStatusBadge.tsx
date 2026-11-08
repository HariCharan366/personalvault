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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <Unlock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vault Unlocked</span>
        </div>
        <button
          onClick={lockVault}
          title="Lock Vault Immediately"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all shadow-sm"
      >
        <Lock className="w-3.5 h-3.5 text-indigo-400" />
        <span>Unlock Vault</span>
      </button>
      <VaultUnlockModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
