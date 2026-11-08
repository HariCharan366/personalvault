import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { isSupabaseConfigured } from '@/integrations/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Shield, Lock, Mail, ArrowRight, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    const result = await signIn(email, password);
    setIsLoading(false);

    if (result.success) {
      showToast('success', 'Authentication Successful', 'Welcome to your secure PersonalVault.');
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Invalid email or password.');
    }
  };

  const handleQuickDemo = () => {
    setEmail('owner@personalvault.local');
    setPassword('vaultPass2026!');
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background radial glow accents */}
      <div className="absolute top-1/4 -left-24 w-[500px] h-[500px] bg-emerald-500/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-[500px] h-[500px] bg-neon-cyan/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-radial from-neon-mint/[0.03] to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-400 via-neon-mint to-teal-400 text-obsidian-950 shadow-xl shadow-emerald-500/25 mb-2 hover:scale-105 transition-transform duration-300">
            <Shield className="w-8 h-8 fill-obsidian-950/20" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            PersonalVault
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Zero-knowledge encrypted cloud locker. Private & client-side sealed.
          </p>
        </div>

        {/* Status Mode Badge */}
        <div className="text-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
              isSupabaseConfigured()
                ? 'bg-emerald-500/10 text-neon-mint border-emerald-500/30'
                : 'bg-cyan-500/10 text-neon-cyan border-cyan-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <ShieldCheck className="w-3.5 h-3.5" />
            {isSupabaseConfigured()
              ? 'Supabase Cloud Connected'
              : 'Local Sandbox Mode (Zero Setup Needed)'}
          </span>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-obsidian-900/90 border border-white/[0.08] shadow-glass-card backdrop-blur-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-white/[0.1] bg-obsidian-850 text-emerald-500 focus:ring-0"
                />
                Remember this device
              </label>

              <Link
                to="/forgot-password"
                className="text-emerald-400 hover:text-neon-mint transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Vault
            </Button>
          </form>

          {/* Quick Demo Autofill */}
          <div className="pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 bg-obsidian-850 hover:bg-obsidian-800 border border-white/[0.06] hover:border-neon-mint/30 transition-all cursor-pointer group"
            >
              <Sparkles className="w-3.5 h-3.5 text-neon-mint group-hover:rotate-12 transition-transform" />
              <span>Auto-fill Demo Credentials</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-2">
          <p>
            Don't have an account yet?{' '}
            <Link to="/register" className="text-neon-mint font-semibold hover:underline">
              Create an account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
            <KeyRound className="w-3 h-3 text-neon-mint" />
            <span>End-to-End Client Encrypted Personal Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
