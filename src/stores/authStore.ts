import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: { full_name: string; role: string } | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  ensureProfile: (user: User, fullName?: string, role?: string) => Promise<{ full_name: string; role: string } | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  ensureProfile: async (user, fullName?, role?) => {
    // Try to fetch existing profile
    const { data: existing } = await supabase
      .from('users')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (existing) return existing;

    // Profile doesn't exist yet — create it
    // This happens after email confirmation when the session is active
    if (fullName) {
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          role: role ?? 'caregiver',
        })
        .select('full_name, role')
        .single();
      if (!error && created) return created;
    }

    return null;
  },

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const user = session?.user ?? null;

    let profile = null;
    if (user) {
      profile = await get().ensureProfile(user);
    }

    set({ session, user, profile, loading: false });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      let profile = null;
      if (user) {
        // Check for pending signup data in localStorage
        const pendingName = localStorage.getItem('careloop_pending_name');
        const pendingRole = localStorage.getItem('careloop_pending_role');
        profile = await get().ensureProfile(
          user,
          pendingName ?? undefined,
          pendingRole ?? undefined
        );
        if (profile && pendingName) {
          localStorage.removeItem('careloop_pending_name');
          localStorage.removeItem('careloop_pending_role');
        }
      }
      set({ session, user, profile });
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName, role) => {
    // Store the profile data for after email confirmation
    localStorage.setItem('careloop_pending_name', fullName);
    localStorage.setItem('careloop_pending_role', role);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    if (error) throw error;

    // If Supabase auto-confirms (no email confirmation required),
    // the session is immediately available — create profile now
    if (data.session && data.user) {
      const profile = await get().ensureProfile(data.user, fullName, role);
      if (profile) {
        localStorage.removeItem('careloop_pending_name');
        localStorage.removeItem('careloop_pending_role');
      }
      set({ session: data.session, user: data.user, profile });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
