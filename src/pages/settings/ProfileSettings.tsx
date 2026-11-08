import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Mail, Shield } from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await api.updateProfile({
        id: user.id,
        full_name: fullName.trim(),
      });
      await refreshProfile();
      showToast('success', 'Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-white/[0.08]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-neon-mint text-obsidian-950 font-extrabold text-xl flex items-center justify-center uppercase shadow-glow-sm">
          {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {profile?.full_name || 'Primary Vault Owner'}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Input
          label="Display / Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Alex Morgan"
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        <Input
          label="Email Address"
          value={user?.email || ''}
          disabled
          helperText="Email is managed via Supabase Authentication identity provider."
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <Button type="submit" variant="primary" isLoading={isLoading}>
          Save Profile Details
        </Button>
      </form>
    </Card>
  );
};

