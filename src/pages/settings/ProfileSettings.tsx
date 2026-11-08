import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Mail } from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || 'Haricharan');
  const [email, setEmail] = useState(profile?.email || user?.email || 'panduhari718@gmail.com');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (profile?.email || user?.email) {
      setEmail(profile?.email || user?.email || 'panduhari718@gmail.com');
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await api.updateProfile({
        id: user.id,
        full_name: fullName.trim(),
        email: email.trim(),
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
          {fullName?.charAt(0) || 'H'}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {fullName || 'Haricharan'}
          </h3>
          <p className="text-xs text-neon-mint font-mono mt-0.5">{email || 'panduhari718@gmail.com'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Input
          label="Display / Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Haricharan"
          leftIcon={<User className="w-4 h-4 text-emerald-400" />}
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="panduhari718@gmail.com"
          leftIcon={<Mail className="w-4 h-4 text-cyan-400" />}
          required
        />

        <Button type="submit" variant="primary" isLoading={isLoading}>
          Save Profile Details
        </Button>
      </form>
    </Card>
  );
};
