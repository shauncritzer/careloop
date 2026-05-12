import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  caregiverName: string | null;
  isSetUp: boolean;
  signInWithPin: (pin: string) => Promise<{ error: string | null }>;
  setupPin: (pin: string, caregiverName: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Secure hash function for PIN
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'careloop-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caregiverName, setCaregiverName] = useState<string | null>(null);
  const [isSetUp, setIsSetUp] = useState(false);

  const setupStatus = trpc.careloop.getSetupStatus.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });
  const verifyPinMutation = trpc.careloop.verifyPin.useMutation();
  const setupPinMutation = trpc.careloop.setupPin.useMutation();

  // Check if already authenticated from localStorage + server setup status
  useEffect(() => {
    if (setupStatus.isLoading) return;
    
    if (setupStatus.data) {
      setIsSetUp(setupStatus.data.isSetUp);
    }

    const stored = localStorage.getItem('careloop_authenticated');
    const storedName = localStorage.getItem('careloop_caregiver_name');
    if (stored === 'true') {
      setIsAuthenticated(true);
      setCaregiverName(storedName);
    }
    setLoading(false);
  }, [setupStatus.isLoading, setupStatus.data]);

  const signInWithPin = useCallback(async (pin: string) => {
    try {
      const pinHash = await hashPin(pin);
      const result = await verifyPinMutation.mutateAsync({ pinHash });
      if (result.valid) {
        setIsAuthenticated(true);
        setCaregiverName(result.caregiverName || null);
        localStorage.setItem('careloop_authenticated', 'true');
        localStorage.setItem('careloop_caregiver_name', result.caregiverName || '');
        return { error: null };
      }
      return { error: result.error || 'Incorrect PIN' };
    } catch (e: any) {
      return { error: e.message || 'Failed to verify PIN' };
    }
  }, [verifyPinMutation]);

  const setupPin = useCallback(async (pin: string, name: string) => {
    try {
      const pinHash = await hashPin(pin);
      await setupPinMutation.mutateAsync({ pinHash, caregiverName: name });
      setIsAuthenticated(true);
      setIsSetUp(true);
      setCaregiverName(name);
      localStorage.setItem('careloop_authenticated', 'true');
      localStorage.setItem('careloop_caregiver_name', name);
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Failed to set up PIN' };
    }
  }, [setupPinMutation]);

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
    setCaregiverName(null);
    localStorage.removeItem('careloop_authenticated');
    localStorage.removeItem('careloop_caregiver_name');
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      loading,
      caregiverName,
      isSetUp,
      signInWithPin,
      setupPin,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
