import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Shield, Key, Lock, KeyRound, Smartphone, CheckCircle2 } from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  const { updatePassword, profile } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(password);
    setIsLoading(false);

    if (result.success) {
      showToast('success', 'Password Updated', 'Your account password has been changed.');
      setPassword('');
      setConfirmPassword('');
    } else {
      setError(result.error || 'Failed to update password.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" /> Change Account Password
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Update the password used to authenticate into your personal cloud account.
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Vault Master PIN Settings */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" /> Vault Master PIN & Key Hierarchy
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your vault PIN is separate from your account password and protects your zero-knowledge AES-256-GCM keys.
            </p>
          </div>
          <Link to="/vault">
            <Button variant="outline" size="sm">
              Manage Vault PIN
            </Button>
          </Link>
        </div>
      </Card>

      {/* Two-Factor Authentication (2FA) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" /> Two-Factor Authentication (TOTP)
              </h3>
              <Badge variant="outline" size="sm">
                Supported
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add an additional layer of security using an authenticator app (Google Authenticator, 1Password, or Authy).
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-vault-850 border border-slate-200 dark:border-vault-800 text-xs text-slate-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Two-factor authentication is configured in your Supabase Auth dashboard under Authentication → Providers.
          </span>
        </div>
      </Card>
    </div>
  );
};
