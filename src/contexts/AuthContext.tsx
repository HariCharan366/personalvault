import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase';
import { api } from '@/services/api';
import { detectDeviceInfo, fetchIpAndLocation } from '@/utils/device';
import type { Profile, ActiveSession } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  currentSessionId: string | null;
  signIn: (emailOrPassword: string, maybePassword?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const VAULT_MASTER_PASSWORD = 'Haricharan@2008';
export const DEFAULT_VAULT_EMAIL = 'panduhari718@gmail.com';
export const DEFAULT_VAULT_NAME = 'Haricharan';

const LOCAL_STORAGE_AUTH_KEY = 'personalvault_demo_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      let restored = false;
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user && mounted) {
            const u = {
              id: data.session.user.id,
              email: data.session.user.email || '',
              user_metadata: data.session.user.user_metadata,
            };
            setUser(u);
            const prof = await api.getProfile(u.id);
            if (prof && mounted) setProfile(prof);
            const savedSessionId = localStorage.getItem('personalvault_current_session_id');
            setCurrentSessionId(savedSessionId || data.session.access_token.slice(-16));
            restored = true;
          }
        } catch (e) {
          console.error('Supabase getSession error:', e);
        }
      }

      // Check local storage if not restored from Supabase session
      if (!restored) {
        const cached = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
        if (cached && mounted) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.user) {
              parsed.user.id = '9fb3d8c6-106c-4f12-90b3-c8675890036c';
              parsed.user.email = DEFAULT_VAULT_EMAIL;
              parsed.user.user_metadata = { ...parsed.user.user_metadata, full_name: DEFAULT_VAULT_NAME };
            }
            if (parsed.profile) {
              parsed.profile.id = '9fb3d8c6-106c-4f12-90b3-c8675890036c';
              parsed.profile.email = DEFAULT_VAULT_EMAIL;
              parsed.profile.full_name = DEFAULT_VAULT_NAME;
            }
            setUser(parsed.user);
            setProfile(parsed.profile);
            const savedSessionId = localStorage.getItem('personalvault_current_session_id');
            setCurrentSessionId(savedSessionId || parsed.sessionId || 'sess_default_active');
          } catch {
            localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
          }
        }
      }
      if (mounted) setIsLoading(false);
    }

    initAuth();

    // Supabase auth state change listener
    let subscription: any = null;
    if (isSupabaseConfigured()) {
      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const u = {
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
          };
          setUser(u);
          const prof = await api.getProfile(u.id);
          setProfile(prof);
          setCurrentSessionId(session.access_token.slice(-16));
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setCurrentSessionId(null);
        }
      });
      subscription = sub.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const p = await api.getProfile(user.id);
      setProfile(p);
    }
  };

  const signIn = async (
    emailOrPassword: string,
    maybePassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const device = detectDeviceInfo();
    const { ip, location } = await fetchIpAndLocation();
    const sessionId = crypto.randomUUID();

    let email = DEFAULT_VAULT_EMAIL;
    let password = emailOrPassword;

    if (typeof maybePassword === 'string') {
      email = emailOrPassword || DEFAULT_VAULT_EMAIL;
      password = maybePassword;
    }

    // Require master password Haricharan@2008
    if (password !== VAULT_MASTER_PASSWORD) {
      await api.recordLogin({
        user_id: '00000000-0000-0000-0000-000000000000',
        status: 'Failed',
        timestamp: new Date().toISOString(),
        ip_address: ip,
        browser: device.browser,
        browser_version: device.browserVersion,
        os: device.os,
        device_type: device.deviceType,
        approximate_location: location,
        session_id: sessionId,
      });
      return { success: false, error: 'Incorrect master password. Access denied.' };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data?.user) {
          const u: AuthUser = {
            id: data.user.id,
            email: data.user.email || email,
            user_metadata: data.user.user_metadata,
          };
          setUser(u);
          const prof = await api.getProfile(u.id);
          setProfile(prof);
          setCurrentSessionId(sessionId);

          // Record successful login
          await api.recordLogin({
            user_id: u.id,
            status: 'Success',
            timestamp: new Date().toISOString(),
            ip_address: ip,
            browser: device.browser,
            browser_version: device.browserVersion,
            os: device.os,
            device_type: device.deviceType,
            approximate_location: location,
            session_id: sessionId,
          });

          // Register active session
          const activeSession: ActiveSession = {
            id: sessionId,
            user_id: u.id,
            session_token_hash: sessionId,
            ip_address: ip,
            device_name: device.deviceName,
            browser: device.browser,
            os: device.os,
            location: location,
            is_current: true,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          await api.upsertActiveSession(activeSession);

          // Log auth activity
          await api.logActivity({
            user_id: u.id,
            action: 'login_success',
            entity_type: 'auth',
            entity_id: sessionId,
            entity_name: device.deviceName,
            ip_address: ip,
            device: device.deviceName,
          });

          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase auth fallback to local vault session:', err);
      }
    }

    // Authenticated session for Haricharan
    const localUserId = '9fb3d8c6-106c-4f12-90b3-c8675890036c';
    const mockUser: AuthUser = {
      id: localUserId,
      email: DEFAULT_VAULT_EMAIL,
      user_metadata: { full_name: DEFAULT_VAULT_NAME },
    };

    let prof = await api.getProfile(localUserId);
    if (!prof) {
      prof = {
        id: localUserId,
        email: DEFAULT_VAULT_EMAIL,
        full_name: DEFAULT_VAULT_NAME,
        avatar_url: null,
        two_factor_enabled: false,
        storage_quota_bytes: 5368709120,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await api.updateProfile(prof);
    } else if (prof.email !== DEFAULT_VAULT_EMAIL || prof.full_name !== DEFAULT_VAULT_NAME) {
      prof.email = DEFAULT_VAULT_EMAIL;
      prof.full_name = DEFAULT_VAULT_NAME;
      await api.updateProfile(prof);
    }

    setUser(mockUser);
    setProfile(prof);
    setCurrentSessionId(sessionId);
    localStorage.setItem('personalvault_current_session_id', sessionId);

    localStorage.setItem(
      LOCAL_STORAGE_AUTH_KEY,
      JSON.stringify({ user: mockUser, profile: prof, sessionId })
    );

    // Invalidate any previous session for this device
    try {
      const prev = await api.getActiveSessions(localUserId);
      for (const s of prev) {
        if (s.device_name === device.deviceName || s.ip_address === ip) {
          await api.revokeSession(s.id);
        }
      }
    } catch {
      // ignore
    }

    // Record login
    await api.recordLogin({
      user_id: mockUser.id,
      status: 'Success',
      timestamp: new Date().toISOString(),
      ip_address: ip,
      browser: device.browser,
      browser_version: device.browserVersion,
      os: device.os,
      device_type: device.deviceType,
      approximate_location: location,
      session_id: sessionId,
    });

    // Register active session
    await api.upsertActiveSession({
      id: sessionId,
      user_id: mockUser.id,
      session_token_hash: sessionId,
      ip_address: ip,
      device_name: device.deviceName,
      browser: device.browser,
      os: device.os,
      location,
      is_current: true,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    await api.logActivity({
      user_id: mockUser.id,
      action: 'login_success',
      entity_type: 'auth',
      entity_id: sessionId,
      entity_name: device.deviceName,
      ip_address: ip,
      device: device.deviceName,
    });

    return { success: true };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          return { success: true };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Local mode registration
    return await signIn(email, password);
  };

  const signOut = async () => {
    const userId = user?.id;
    const sessId = currentSessionId || localStorage.getItem('personalvault_current_session_id');
    const device = detectDeviceInfo();

    if (userId) {
      if (sessId) {
        await api.logActivity({
          user_id: userId,
          action: 'logout',
          entity_type: 'auth',
          entity_id: sessId,
          entity_name: device.deviceName,
        });
        await api.revokeSession(sessId);
      }
      try {
        const allSessions = await api.getActiveSessions(userId);
        for (const s of allSessions) {
          if (s.id === sessId || s.is_current || s.device_name === device.deviceName) {
            await api.revokeSession(s.id);
          }
        }
      } catch (e) {
        console.warn('Error cleaning up sessions on logout:', e);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Sign out error:', e);
      }
    }

    localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
    localStorage.removeItem('personalvault_current_session_id');
    setUser(null);
    setProfile(null);
    setCurrentSessionId(null);
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    // Local mode reset
    return { success: true };
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        currentSessionId,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

