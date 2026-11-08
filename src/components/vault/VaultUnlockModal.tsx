import React, { useState } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/contexts/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, Unlock, Key, ShieldCheck, Copy, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VaultUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const VaultUnlockModal: React.FC<VaultUnlockModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    isVaultInitialized,
    isUnlocked,
    isLockedOut,
    lockoutRemainingSeconds,
    unlockVault,
    initializeVault,
    recoverVault,
  } = useVault();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'unlock' | 'init' | 'recover'>('unlock');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recovery phrase state
  const [generatedPhrase, setGeneratedPhrase] = useState<string[] | null>(null);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');

  // Handle Unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin) {
      setError('Please enter your vault PIN');
      return;
    }

    setIsLoading(true);
    const result = await unlockVault(pin);
    setIsLoading(false);

    if (result.success) {
      showToast('success', 'Vault Unlocked', 'Zero-knowledge encryption keys loaded in-memory.');
      setPin('');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(result.error || 'Failed to unlock vault');
    }
  };

  // Handle Initialize Vault
  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length < 4) {
      setError('Vault PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsLoading(true);
    const result = await initializeVault(pin);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setGeneratedPhrase(result.recoveryPhrase);
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch {}
      showToast('success', 'Vault Initialized', 'Your zero-knowledge vault is ready.');
    }
  };

  // Handle Recover Vault
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const words = recoveryInput
      .trim()
      .split(/\s+/)
      .map((w) => w.toLowerCase());
    if (words.length !== 12) {
      setError(`Please enter all 12 words (currently entered: ${words.length})`);
      return;
    }
    if (pin.length < 4) {
      setError('New PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setIsLoading(true);
    const result = await recoverVault(words, pin);
    setIsLoading(false);

    if (result.success) {
      showToast('success', 'Vault Recovered', 'New PIN set and vault unlocked successfully.');
      setMode('unlock');
      setPin('');
      setConfirmPin('');
      setRecoveryInput('');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(result.error || 'Failed to recover vault');
    }
  };

  const copyPhraseToClipboard = () => {
    if (generatedPhrase) {
      navigator.clipboard.writeText(generatedPhrase.join(' '));
      setCopiedPhrase(true);
      setTimeout(() => setCopiedPhrase(false), 2000);
      showToast('info', 'Copied to Clipboard', 'Keep your recovery words safe and offline.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-neon-mint">
            {isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <span>
            {!isVaultInitialized
              ? 'Initialize Personal Vault'
              : mode === 'recover'
              ? 'Recover Vault'
              : 'Unlock Personal Vault'}
          </span>
        </div>
      }
      description={
        !isVaultInitialized
          ? 'Set a master security PIN to encrypt and seal your personal document storage.'
          : mode === 'recover'
          ? 'Enter your 12-word recovery phrase to regain access and reset your PIN.'
          : 'Enter your vault PIN to decrypt and access your confidential files.'
      }
    >
      {/* 1. INITIALIZE VAULT MODE */}
      {!isVaultInitialized && !generatedPhrase && (
        <form onSubmit={handleInitialize} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-neon-mint">
            <strong>Client-Side Zero-Knowledge:</strong> Your documents are encrypted using AES-256-GCM in your browser.
            Your PIN is never sent to the server.
          </div>
          <Input
            label="Create Vault PIN"
            type="password"
            maxLength={12}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter at least 4 digits or passphrase"
            autoFocus
          />
          <Input
            label="Confirm Vault PIN"
            type="password"
            maxLength={12}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Confirm PIN"
          />

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Set PIN & Generate Recovery Key
          </Button>
        </form>
      )}

      {/* 1b. INITIALIZED SUCCESS - SHOW RECOVERY PHRASE */}
      {!isVaultInitialized && generatedPhrase && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong>Crucial Recovery Step:</strong> Save these 12 words in a secure place. If you ever forget your
              vault PIN, this is the only way to recover your encrypted documents.
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-900/80 border border-white/[0.08] font-mono text-xs">
            {generatedPhrase.map((word, idx) => (
              <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-obsidian-850 border border-white/[0.08] text-slate-200">
                <span className="text-slate-500 text-[10px] w-4">{idx + 1}.</span>
                <span className="font-semibold text-emerald-500 dark:text-neon-mint">{word}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={copyPhraseToClipboard}
              leftIcon={copiedPhrase ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            >
              {copiedPhrase ? 'Copied!' : 'Copy Phrase'}
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              onClick={() => {
                onClose();
                if (onSuccess) onSuccess();
              }}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              I Have Saved It
            </Button>
          </div>
        </div>
      )}

      {/* 2. UNLOCK VAULT MODE */}
      {isVaultInitialized && mode === 'unlock' && (
        <form onSubmit={handleUnlock} className="space-y-4">
          {isLockedOut ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm font-semibold">Vault Temporarily Locked</p>
              <p className="text-xs">
                Too many failed attempts. Try again in <strong>{lockoutRemainingSeconds}s</strong> or use your recovery phrase.
              </p>
            </div>
          ) : (
            <Input
              label="Enter Vault PIN"
              type="password"
              maxLength={12}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              autoFocus
              leftIcon={<Key className="w-4 h-4" />}
            />
          )}

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={isLockedOut}
            leftIcon={<Unlock className="w-4 h-4" />}
          >
            Unlock Vault
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('recover');
              }}
              className="text-xs text-emerald-600 dark:text-neon-mint hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Forgot PIN? Recover using 12-word phrase
            </button>
          </div>
        </form>
      )}

      {/* 3. RECOVER VAULT MODE */}
      {isVaultInitialized && mode === 'recover' && (
        <form onSubmit={handleRecover} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 mb-1.5">
              12-Word Recovery Phrase
            </label>
            <textarea
              className="w-full rounded-xl border bg-white dark:bg-vault-900 border-slate-300 dark:border-vault-700 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none h-20"
              placeholder="alpha beacon cipher delta enigma falcon galaxy harbor iron jupiter kinetic lunar"
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
            />
          </div>

          <Input
            label="New Vault PIN"
            type="password"
            maxLength={12}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter new 4+ digit PIN"
          />
          <Input
            label="Confirm New Vault PIN"
            type="password"
            maxLength={12}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Confirm new PIN"
          />

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setError(null);
                setMode('unlock');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
              Reset PIN & Unlock
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

