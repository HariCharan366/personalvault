import React, { useState } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { VaultUnlockModal } from '@/components/vault/VaultUnlockModal';
import {
  KeyRound,
  Shield,
  Lock,
  Unlock,
  Clock,
  RotateCcw,
  Cpu,
  Sparkles,
} from 'lucide-react';

export const Vault: React.FC = () => {
  const {
    isVaultInitialized,
    isUnlocked,
    autoLockMinutes,
    lockVault,
    changeVaultPin,
    setAutoLockMinutes,
  } = useVault();
  const { showToast } = useToast();

  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Change PIN state
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);

    if (newPin.length < 4) {
      setPinChangeError('New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeError('New PIN and confirmation do not match.');
      return;
    }

    setIsChangingPin(true);
    const result = await changeVaultPin(oldPin, newPin);
    setIsChangingPin(false);

    if (result.success) {
      showToast('success', 'PIN Updated & Re-wrapped', 'All documents were re-wrapped with your new derived KEK.');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinChangeError(result.error || 'Failed to update PIN.');
    }
  };

  const handleTimeoutChange = async (minutes: number) => {
    await setAutoLockMinutes(minutes);
    showToast('info', 'Timeout Updated', `Vault will automatically lock after ${minutes} minutes of inactivity.`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <KeyRound className="w-6 h-6 text-emerald-500 dark:text-neon-mint" />
          <span>Vault Security & Cryptographic Controls</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your client-side encryption keys, master PIN, and zero-knowledge lock state
        </p>
      </div>

      {/* Vault Status Banner */}
      <Card className="p-6 border-white/[0.08] bg-gradient-to-r from-obsidian-900 via-obsidian-850 to-obsidian-900 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-mint/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-2xl ${
                isUnlocked
                  ? 'bg-neon-mint/10 text-emerald-500 dark:text-neon-mint shadow-glow-sm'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {isUnlocked ? <Unlock className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isUnlocked ? 'Vault Is Currently Unlocked' : 'Vault Is Locked'}
                </h3>
                <Badge variant={isUnlocked ? 'success' : 'danger'}>
                  {isUnlocked ? 'Active Session' : 'Protected'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                {isUnlocked
                  ? 'Your Key Encryption Key (KEK) is held in transient memory. It will be flushed upon lock or inactivity.'
                  : 'All encrypted document content and metadata keys are sealed.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 relative z-10">
            {isUnlocked ? (
              <Button
                variant="danger"
                size="md"
                onClick={lockVault}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Lock Vault Now
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowUnlockModal(true)}
                leftIcon={<Unlock className="w-4 h-4" />}
              >
                {isVaultInitialized ? 'Unlock Vault' : 'Initialize Vault'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Cryptographic Architecture Card */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-500 dark:text-neon-mint" /> Cryptographic Architecture Specifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-obsidian-850 border border-slate-200 dark:border-white/[0.06]">
            <span className="text-slate-500 font-semibold block mb-1">Key Derivation (KEK)</span>
            <p className="font-mono text-emerald-600 dark:text-neon-mint font-bold">PBKDF2-HMAC-SHA256</p>
            <p className="text-[11px] text-slate-400 mt-1">100,000 iterations + 32-byte CSPRNG salt</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-obsidian-850 border border-slate-200 dark:border-white/[0.06]">
            <span className="text-slate-500 font-semibold block mb-1">Document Encryption</span>
            <p className="font-mono text-emerald-600 dark:text-neon-mint font-bold">AES-256-GCM</p>
            <p className="text-[11px] text-slate-400 mt-1">Unique 96-bit IV per file + 128-bit integrity tag</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-obsidian-850 border border-slate-200 dark:border-white/[0.06]">
            <span className="text-slate-500 font-semibold block mb-1">Key Wrapping Hierarchy</span>
            <p className="font-mono text-emerald-600 dark:text-neon-mint font-bold">Per-File DEK Envelope</p>
            <p className="text-[11px] text-slate-400 mt-1">Ephemeral Data Encryption Keys wrapped by KEK</p>
          </div>
        </div>
      </Card>

      {/* Inactivity Auto-Lock Settings */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-500 dark:text-neon-cyan" /> Inactivity Auto-Lock Timeout
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The vault automatically purges encryption keys from browser memory when no user interaction occurs.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[5, 15, 30, 60].map((mins) => {
            const isSelected = autoLockMinutes === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => handleTimeoutChange(mins)}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500/50 dark:border-neon-mint/50 bg-emerald-500/10 text-emerald-600 dark:text-neon-mint font-bold shadow-glow-sm'
                    : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="text-lg font-black block">{mins}</span>
                <span className="text-[11px] opacity-80 font-medium">Minutes</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Change Vault PIN */}
      {isVaultInitialized && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-400" /> Change Vault Master PIN
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Updating your PIN derives a fresh Master Key and automatically re-wraps all existing document DEKs with the new key in your browser.
          </p>

          {!isUnlocked ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
              <span>Vault must be unlocked to change your PIN.</span>
              <Button size="sm" variant="outline" onClick={() => setShowUnlockModal(true)}>
                Unlock
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePinChange} className="space-y-4 max-w-md">
              <Input
                label="Current Vault PIN"
                type="password"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="Current PIN"
                required
              />

              <Input
                label="New Vault PIN"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="At least 4 digits"
                required
              />

              <Input
                label="Confirm New Vault PIN"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Re-enter new PIN"
                required
              />

              {pinChangeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {pinChangeError}
                </div>
              )}

              <Button type="submit" variant="primary" size="sm" isLoading={isChangingPin}>
                Re-encrypt Key Hierarchy & Save
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* Unlock / Init Modal */}
      <VaultUnlockModal isOpen={showUnlockModal} onClose={() => setShowUnlockModal(false)} />
    </div>
  );
};
