/**
 * AuthContext — simplified, no PIN required.
 * The app is always "authenticated". This context exists only to provide
 * the caregiverName (loaded from patient profile) and a no-op signOut.
 */
import { createContext, useContext, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  caregiverName: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: true,
  loading: false,
  caregiverName: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ isAuthenticated: true, loading: false, caregiverName: null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
