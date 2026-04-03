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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const user = session?.user ?? null;

    let profile = null;
    if (user) {
      const { data: profileData } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', user.id)
        .single();
      profile = profileData;
    }

    set({ session, user, profile, loading: false });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      let profile = null;
      if (user) {
        const { data: profileData } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        profile = profileData;
      }
      set({ session, user, profile });
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName, role) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      });
      if (profileError) throw profileError;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
