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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-xl shadow-indigo-600/30 mb-2">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            PersonalVault
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Advanced Secure Personal Cloud Document Storage
          </p>
        </div>

        {/* Status Mode Badge */}
        <div className="text-center">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border ${
              isSupabaseConfigured()
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isSupabaseConfigured()
              ? 'Supabase Cloud Connected'
              : 'Local Sandbox Mode (Zero Setup Needed)'}
          </span>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-5">
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
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                />
                Remember this device
              </label>

              <Link
                to="/forgot-password"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
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
          <div className="pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-300 bg-slate-700/40 hover:bg-slate-700/70 border border-slate-600/50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Auto-fill Demo Credentials
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-2">
          <p>
            Don't have an account yet?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <KeyRound className="w-3 h-3" />
            <span>End-to-End Encrypted Personal Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};

