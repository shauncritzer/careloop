import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AuthMode = 'pin' | 'email';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  authMode: AuthMode;
  /** PIN-based quick access — stores PIN in localStorage, signs in anonymously or with a known account */
  signInWithPin: (pin: string) => Promise<{ error: string | null }>;
  setupPin: (pin: string, caregiverName: string) => Promise<{ error: string | null }>;
  /** Email-based auth (for family members or remote access) */
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  caregiverName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PIN_STORAGE_KEY = 'careloop_pin_hash';
const CAREGIVER_NAME_KEY = 'careloop_caregiver_name';
const AUTH_MODE_KEY = 'careloop_auth_mode';

// Simple hash for PIN (not cryptographic, just for local verification)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('pin');
  const [caregiverName, setCaregiverName] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(AUTH_MODE_KEY) as AuthMode | null;
    const savedName = localStorage.getItem(CAREGIVER_NAME_KEY);
    if (savedMode) setAuthMode(savedMode);
    if (savedName) setCaregiverName(savedName);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setSession(s);
        setUser(s.user);
        setIsAuthenticated(true);
      } else {
        // Check if PIN auth was set up (local-only mode)
        const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
        if (storedPin) {
          // PIN was set up but no Supabase session — still allow local access
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s) {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // PIN-based setup: creates an anonymous Supabase session + stores PIN locally
  const setupPin = useCallback(async (pin: string, name: string) => {
    if (pin.length < 4) {
      return { error: 'PIN must be at least 4 digits' };
    }

    try {
      // Sign in anonymously to get a Supabase session for data access
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        // If anonymous sign-in is not enabled, create a deterministic email account
        const deterministicEmail = `caregiver-${simpleHash(pin)}@careloop.local`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: deterministicEmail,
          password: pin + 'CareLoop2024!',
        });
        if (signUpError) {
          // Try signing in instead (account may already exist)
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: deterministicEmail,
            password: pin + 'CareLoop2024!',
          });
          if (signInError) {
            return { error: 'Could not set up access. Please try a different PIN.' };
          }
        }
      }

      // Store PIN hash and caregiver name locally
      localStorage.setItem(PIN_STORAGE_KEY, simpleHash(pin));
      localStorage.setItem(CAREGIVER_NAME_KEY, name);
      localStorage.setItem(AUTH_MODE_KEY, 'pin');
      setCaregiverName(name);
      setAuthMode('pin');
      setIsAuthenticated(true);

      return { error: null };
    } catch (err) {
      return { error: 'Setup failed. Please try again.' };
    }
  }, []);

  // PIN-based sign in: verify PIN against stored hash
  const signInWithPin = useCallback(async (pin: string) => {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) {
      return { error: 'No PIN set up. Please set up CareLoop first.' };
    }

    if (simpleHash(pin) !== storedHash) {
      return { error: 'Incorrect PIN. Please try again.' };
    }

    // Re-establish Supabase session
    try {
      const deterministicEmail = `caregiver-${storedHash}@careloop.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: deterministicEmail,
        password: pin + 'CareLoop2024!',
      });
      if (error) {
        // Try anonymous
        await supabase.auth.signInAnonymously();
      }
    } catch {
      // Continue anyway — PIN verified locally
    }

    setIsAuthenticated(true);
    setCaregiverName(localStorage.getItem(CAREGIVER_NAME_KEY));
    return { error: null };
  }, []);

  // Email-based signup (for family/remote access)
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return { error: 'ALREADY_REGISTERED' };
      }
      return { error: error.message };
    }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      return { error: 'ALREADY_REGISTERED' };
    }

    localStorage.setItem(AUTH_MODE_KEY, 'email');
    setAuthMode('email');
    setIsAuthenticated(true);
    return { error: null };
  }, []);

  // Email-based sign in
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials')) {
        return { error: 'Invalid email or password. Please check your credentials and try again.' };
      }
      if (msg.includes('email not confirmed')) {
        return { error: 'Please check your email and click the confirmation link before signing in.' };
      }
      return { error: error.message };
    }
    localStorage.setItem(AUTH_MODE_KEY, 'email');
    setAuthMode('email');
    setIsAuthenticated(true);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setSession(null);
    // Don't clear PIN — just sign out of session
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, loading, isAuthenticated, authMode,
      signInWithPin, setupPin, signUp, signIn, signOut, caregiverName,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
