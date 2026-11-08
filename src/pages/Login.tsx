import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Shield, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const result = await signIn(password);
    setIsLoading(false);

    if (result.success) {
      showToast('success', 'Unlocked', 'Welcome to Personal Vault.');
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Incorrect password.');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle ambient glows */}
      <div className="absolute top-1/4 -left-24 w-[400px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-[400px] h-[400px] bg-neon-cyan/[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 z-10">
        {/* Minimal Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 via-neon-mint to-teal-400 text-obsidian-950 shadow-glow-brand hover:scale-105 transition-transform">
            <Shield className="w-7 h-7 fill-obsidian-950/20" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Personal Vault
          </h1>
        </div>

        {/* Minimal Password Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-obsidian-900/90 border border-white/[0.08] shadow-glass-card backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                id="vault-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                leftIcon={<Lock className="w-4 h-4 text-emerald-400" />}
                autoComplete="current-password"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 font-bold"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Unlock
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
