import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { bffClient, User } from '../lib/supabase-bff';
import { supabase } from '../lib/supabase';
import { saveLastLoginInfo, saveLogoutInfo } from '../utils/sessionRecovery';

interface AuthContextType {
  user: User | null;
  userProfile: User | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProviderBFF({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const applyUserState = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    setUserProfile(nextUser);
  }, []);

  const loadCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const currentUser = await bffClient.auth.getCurrentUser();
      applyUserState(currentUser);
      setAuthError(null);
      return currentUser;
    } catch (error) {
      console.error('Failed to fetch current user via BFF:', error);
      applyUserState(null);
      return null;
    }
  }, [applyUserState]);

  const checkCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      await loadCurrentUser();
    } finally {
      setLoading(false);
    }
  }, [loadCurrentUser]);

  useEffect(() => {
    checkCurrentUser();
  }, [checkCurrentUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ data: any; error: any }> => {
      try {
        setLoading(true);
        setAuthError(null);

        const response = await bffClient.auth.signIn({ email, password });
        const enrichedUser = await loadCurrentUser();

        if (enrichedUser) {
          const lastEmail = enrichedUser.email || email;
          const lastFullName =
            (enrichedUser as any)?.full_name || enrichedUser.email || email;
          saveLastLoginInfo(lastEmail, lastFullName);
        }

        return { data: response, error: null };
      } catch (error: any) {
        const errorMessage = error?.message || 'Не удалось выполнить вход';
        setAuthError(errorMessage);
        return { data: null, error: { message: errorMessage } };
      } finally {
        setLoading(false);
      }
    },
    [loadCurrentUser],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const logoutEmail = userProfile?.email || user?.email;
      const logoutName =
        (userProfile as any)?.full_name || (user as any)?.full_name || logoutEmail || 'unknown';

      if (logoutEmail) {
        saveLogoutInfo(logoutEmail, logoutName);
      }

      await bffClient.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out via BFF:', error);
    } finally {
      try {
        await supabase.auth.signOut();
      } catch (supabaseError) {
        console.warn('Failed to clear Supabase client session:', supabaseError);
      }
      applyUserState(null);
      setAuthError(null);
      setLoading(false);
    }
  }, [applyUserState, user, userProfile]);

  const refreshUser = useCallback(async () => {
    await loadCurrentUser();
  }, [loadCurrentUser]);

  const refreshProfile = refreshUser;

  const resetAuth = useCallback(() => {
    applyUserState(null);
    setAuthError(null);
    setLoading(false);
  }, [applyUserState]);

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    authError,
    signIn,
    signOut,
    refreshUser,
    refreshProfile,
    resetAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthBFF(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthBFF must be used within AuthProviderBFF');
  }
  return context;
}
