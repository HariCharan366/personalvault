import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/services/api';
import {
  getRandomBytes,
  deriveVaultKek,
  createPinVerifier,
  verifyPinWithVerifier,
  generateRecoveryPhrase,
  hashRecoveryPhrase,
  base64ToBuffer,
  bufferToBase64,
} from '@/services/crypto';
import type { VaultSettings } from '@/types';

interface VaultContextType {
  isVaultInitialized: boolean;
  isUnlocked: boolean;
  vaultKek: CryptoKey | null;
  autoLockMinutes: number;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  initializeVault: (pin: string) => Promise<{ recoveryPhrase: string[]; error?: string }>;
  unlockVault: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lockVault: () => void;
  changeVaultPin: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  recoverVault: (phraseWords: string[], newPin: string) => Promise<{ success: boolean; error?: string }>;
  setAutoLockMinutes: (minutes: number) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [vaultSettings, setVaultSettings] = useState<VaultSettings | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [vaultKek, setVaultKek] = useState<CryptoKey | null>(null);
  const [autoLockMinutes, setAutoLockState] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch vault settings whenever user changes
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      if (!user) {
        setVaultSettings(null);
        setIsUnlocked(false);
        setVaultKek(null);
        return;
      }

      let settings = await api.getVaultSettings(user.id);
      if (!settings || !settings.is_vault_initialized) {
        try {
          const salt = getRandomBytes(32);
          const saltB64 = bufferToBase64(salt);
          const kek = await deriveVaultKek('Haricharan@2008', salt);
          const pinVerifier = await createPinVerifier(kek, salt);
          const phraseWords = generateRecoveryPhrase();
          const phraseHash = await hashRecoveryPhrase(phraseWords);

          settings = {
            user_id: user.id,
            is_vault_initialized: true,
            salt: saltB64,
            pin_verifier: pinVerifier,
            recovery_phrase_hash: phraseHash,
            auto_lock_minutes: 0,
            failed_pin_attempts: 0,
            locked_until: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await api.saveVaultSettings(settings);
        } catch (err) {
          console.error('Error auto-initializing vault settings:', err);
        }
      }

      if (active && settings) {
        setVaultSettings(settings);
        try {
          const salt = base64ToBuffer(settings.salt);
          const kek = await deriveVaultKek('Haricharan@2008', salt);
          setVaultKek(kek);
          setIsUnlocked(true);
        } catch (e) {
          console.warn('Vault auto-unlock error:', e);
        }
      }
    }

    loadSettings();
    return () => {
      active = false;
    };
  }, [user]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemainingSeconds > 0) {
      lockoutIntervalRef.current = setInterval(() => {
        setLockoutRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(lockoutIntervalRef.current!);
            setIsLockedOut(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockoutIntervalRef.current) clearInterval(lockoutIntervalRef.current);
    };
  }, [lockoutRemainingSeconds]);

  const lockVault = useCallback(async () => {
    setVaultKek(null);
    setIsUnlocked(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (user) {
      await api.logActivity({
        user_id: user.id,
        action: 'vault_locked',
        entity_type: 'vault',
        entity_name: 'Personal Vault',
      });
    }
  }, [user]);

  // Inactivity auto-lock mechanism (disabled - vault stays unlocked for authenticated session)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  const initializeVault = async (pin: string): Promise<{ recoveryPhrase: string[]; error?: string }> => {
    if (!user) return { recoveryPhrase: [], error: 'User not authenticated' };
    if (!pin || pin.length < 4) return { recoveryPhrase: [], error: 'Vault PIN must be at least 4 digits' };

    try {
      const salt = getRandomBytes(32);
      const saltB64 = bufferToBase64(salt);
      const kek = await deriveVaultKek(pin, salt);
      const pinVerifier = await createPinVerifier(kek, salt);

      const phraseWords = generateRecoveryPhrase();
      const phraseHash = await hashRecoveryPhrase(phraseWords);

      const newSettings: VaultSettings = {
        user_id: user.id,
        is_vault_initialized: true,
        salt: saltB64,
        pin_verifier: pinVerifier,
        recovery_phrase_hash: phraseHash,
        auto_lock_minutes: 15,
        failed_pin_attempts: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await api.saveVaultSettings(newSettings);
      setVaultSettings(newSettings);
      setVaultKek(kek);
      setIsUnlocked(true);

      await api.logActivity({
        user_id: user.id,
        action: 'vault_initialized',
        entity_type: 'vault',
        entity_name: 'Personal Vault',
      });

      return { recoveryPhrase: phraseWords };
    } catch (err: any) {
      return { recoveryPhrase: [], error: err?.message || 'Failed to initialize vault' };
    }
  };

  const unlockVault = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    if (!vaultSettings) return { success: false, error: 'Vault settings not found' };
    if (isLockedOut) return { success: false, error: `Vault is locked out. Try again in ${lockoutRemainingSeconds}s.` };

    try {
      const isValid = await verifyPinWithVerifier(pin, vaultSettings.salt, vaultSettings.pin_verifier);
      if (!isValid) {
        const attempts = (vaultSettings.failed_pin_attempts || 0) + 1;
        let lockedUntil = null;
        if (attempts >= 5) {
          lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          setIsLockedOut(true);
          setLockoutRemainingSeconds(300);
        }

        const updated = {
          ...vaultSettings,
          failed_pin_attempts: attempts,
          locked_until: lockedUntil,
        };
        await api.saveVaultSettings(updated);
        setVaultSettings(updated);

        return {
          success: false,
          error: attempts >= 5
            ? 'Too many failed PIN attempts. Vault is temporarily locked for 5 minutes.'
            : `Incorrect vault PIN. ${5 - attempts} attempts remaining before temporary lockout.`,
        };
      }

      // Successful unlock
      const salt = base64ToBuffer(vaultSettings.salt);
      const kek = await deriveVaultKek(pin, salt);
      setVaultKek(kek);
      setIsUnlocked(true);

      // Reset attempts
      if (vaultSettings.failed_pin_attempts > 0) {
        const updated = {
          ...vaultSettings,
          failed_pin_attempts: 0,
          locked_until: null,
        };
        await api.saveVaultSettings(updated);
        setVaultSettings(updated);
      }

      await api.logActivity({
        user_id: user.id,
        action: 'vault_unlocked',
        entity_type: 'vault',
        entity_name: 'Personal Vault',
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to unlock vault' };
    }
  };

  const changeVaultPin = async (oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !vaultSettings || !vaultKek) {
      return { success: false, error: 'Vault must be unlocked to change PIN' };
    }
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'New PIN must be at least 4 digits' };
    }

    try {
      const isOldValid = await verifyPinWithVerifier(oldPin, vaultSettings.salt, vaultSettings.pin_verifier);
      if (!isOldValid) {
        return { success: false, error: 'Current PIN is incorrect' };
      }

      // Derive new KEK with fresh salt
      const newSalt = getRandomBytes(32);
      const newSaltB64 = bufferToBase64(newSalt);
      const newKek = await deriveVaultKek(newPin, newSalt);
      const newVerifier = await createPinVerifier(newKek, newSalt);

      // Re-wrap all user documents with the new KEK!
      const documents = await api.getDocuments(user.id, true);
      for (const doc of documents) {
        try {
          const [oldWrapIvB64, oldEncDekB64] = doc.wrapped_dek.split(':');
          const oldWrapIv = base64ToBuffer(oldWrapIvB64);
          const oldEncDek = base64ToBuffer(oldEncDekB64);

          // Unwrap DEK with old KEK
          const rawDek = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: oldWrapIv as BufferSource },
            vaultKek,
            oldEncDek as BufferSource
          );

          // Wrap DEK with new KEK
          const newWrapIv = getRandomBytes(12);
          const rewrappedDek = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: newWrapIv as BufferSource },
            newKek,
            rawDek
          );

          const newWrappedString = `${bufferToBase64(newWrapIv)}:${bufferToBase64(rewrappedDek)}`;
          await api.updateDocument(doc.id, { wrapped_dek: newWrappedString });
        } catch (e) {
          console.error(`Failed to rewrap document ${doc.id}:`, e);
        }
      }

      // Save updated settings
      const updatedSettings: VaultSettings = {
        ...vaultSettings,
        salt: newSaltB64,
        pin_verifier: newVerifier,
        updated_at: new Date().toISOString(),
      };

      await api.saveVaultSettings(updatedSettings);
      setVaultSettings(updatedSettings);
      setVaultKek(newKek);

      await api.logActivity({
        user_id: user.id,
        action: 'vault_pin_changed',
        entity_type: 'vault',
        entity_name: 'Personal Vault',
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update vault PIN' };
    }
  };

  const recoverVault = async (phraseWords: string[], newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !vaultSettings) return { success: false, error: 'Vault settings not found' };
    if (phraseWords.length !== 12) return { success: false, error: 'Recovery phrase must be exactly 12 words' };

    try {
      const phraseHash = await hashRecoveryPhrase(phraseWords);
      if (phraseHash !== vaultSettings.recovery_phrase_hash) {
        return { success: false, error: 'Invalid recovery phrase. Words do not match.' };
      }

      // Phrase matches! Re-initialize vault with new salt and new PIN
      const salt = getRandomBytes(32);
      const saltB64 = bufferToBase64(salt);
      const kek = await deriveVaultKek(newPin, salt);
      const pinVerifier = await createPinVerifier(kek, salt);

      const updatedSettings: VaultSettings = {
        ...vaultSettings,
        salt: saltB64,
        pin_verifier: pinVerifier,
        failed_pin_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      };

      await api.saveVaultSettings(updatedSettings);
      setVaultSettings(updatedSettings);
      setVaultKek(kek);
      setIsUnlocked(true);
      setIsLockedOut(false);
      setLockoutRemainingSeconds(0);

      await api.logActivity({
        user_id: user.id,
        action: 'vault_pin_changed',
        entity_type: 'vault',
        entity_name: 'Personal Vault (Recovered)',
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Vault recovery failed' };
    }
  };

  const setAutoLockMinutes = async (minutes: number) => {
    setAutoLockState(minutes);
    if (user && vaultSettings) {
      const updated = { ...vaultSettings, auto_lock_minutes: minutes };
      await api.saveVaultSettings(updated);
      setVaultSettings(updated);
    }
  };

  return (
    <VaultContext.Provider
      value={{
        isVaultInitialized: Boolean(vaultSettings?.is_vault_initialized),
        isUnlocked,
        vaultKek,
        autoLockMinutes,
        isLockedOut,
        lockoutRemainingSeconds,
        initializeVault,
        unlockVault,
        lockVault,
        changeVaultPin,
        recoverVault,
        setAutoLockMinutes,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
