import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { isSupabaseConfigured } from '@/integrations/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Shield, Lock, ArrowRight, ShieldCheck, KeyRound, Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react';

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
      setError('Please enter your master password.');
      return;
    }

    setIsLoading(true);
    const result = await signIn(password);
    setIsLoading(false);

    if (result.success) {
      showToast('success', 'Authentication Successful', 'Welcome to PersonalVault, Haricharan.');
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Incorrect master password. Access denied.');
    }
  };

  const handleQuickDemo = () => {
    setPassword('Haricharan@2008');
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
        <div className="text-center flex items-center justify-center gap-2">
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

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-500/10 text-neon-mint border border-emerald-500/30">
            Owner: Haricharan
          </span>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-obsidian-900/90 border border-white/[0.08] shadow-glass-card backdrop-blur-2xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-neon-mint" />
              <span>Vault Master Access</span>
            </h2>
            <p className="text-xs text-slate-400">
              Enter your master password to unlock and decrypt your documents.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="vault-password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Password
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  AES-256 Protected
                </span>
              </div>
              <div className="relative">
                <Input
                  id="vault-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
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
            </div>

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
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 font-bold"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Unlock & Access Vault
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
              <span>Auto-fill Password (Haricharan@2008)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-2">
          <p>
            Need a different vault?{' '}
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
