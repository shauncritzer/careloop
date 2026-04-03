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

export const useAuthStore = create<AuthState>((set) => ({
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
      const { data: p } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', user.id)
        .single();
      profile = p;
    }

    set({ session, user, profile, loading: false });

    supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      let profile = null;

      if (user) {
        const { data: p } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        profile = p;

        // If profile doesn't exist yet (just signed up), create it
        if (!p) {
          const pendingName = localStorage.getItem('careloop_pending_name');
          const pendingRole = localStorage.getItem('careloop_pending_role');
          if (pendingName) {
            const { data: created } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email!,
                full_name: pendingName,
                role: pendingRole ?? 'caregiver',
              })
              .select('full_name, role')
              .single();
            if (created) {
              profile = created;
              localStorage.removeItem('careloop_pending_name');
              localStorage.removeItem('careloop_pending_role');
            }
          }
        }
      }

      set({ session, user, profile });

      // On sign out, clear everything
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName, role) => {
    localStorage.setItem('careloop_pending_name', fullName);
    localStorage.setItem('careloop_pending_role', role);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) throw error;

    // Auto-confirmed: session available immediately
    if (data.session && data.user) {
      const { data: profile } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          role,
        }, { onConflict: 'id' })
        .select('full_name, role')
        .single();

      localStorage.removeItem('careloop_pending_name');
      localStorage.removeItem('careloop_pending_role');
      set({ session: data.session, user: data.user, profile });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
    // Also clear patient store
    const { usePatientStore } = await import('./patientStore');
    usePatientStore.setState({ patient: null, recentLogs: [], todayLog: null, isReadOnly: false, familyMembers: [] });
  },
}));
