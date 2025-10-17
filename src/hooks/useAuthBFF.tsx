import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { bffClient, User } from '../lib/supabase-bff';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProviderBFF({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Загрузка профиля пользователя через BFF
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch('http://51.250.94.103:3000/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Ошибка загрузки профиля:', response.status);
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error: any) {
      console.error('Ошибка загрузки профиля:', error);
      return null;
    }
  }, []);

  // Проверка текущего пользователя при инициализации
  const checkCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await bffClient.auth.getCurrentUser();
      setUser(currentUser);
      setAuthError(null);
      
      // Загружаем профиль пользователя через BFF
      if (currentUser) {
        const profile = await fetchUserProfile();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    } catch (error: any) {
      console.log('Не авторизован:', error.message);
      setUser(null);
      setUserProfile(null);
      setAuthError(null);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  // Инициализация при монтировании
  useEffect(() => {
    checkCurrentUser();
  }, [checkCurrentUser]);

  const signIn = async (email: string, password: string): Promise<{ data: any; error: any }> => {
    try {
      setLoading(true);
      setAuthError(null);

      const response = await bffClient.auth.signIn({ email, password });
      setUser(response.user);
      
      // Загружаем профиль пользователя через BFF
      if (response.user) {
        const profile = await fetchUserProfile();
        setUserProfile(profile);
      }
      
      return { data: response, error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка входа';
      setAuthError(errorMessage);
      return { data: null, error: { message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await bffClient.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setAuthError(null);
    } catch (error: any) {
      console.error('Ошибка выхода:', error);
      // Даже если выход не удался, очищаем состояние
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await bffClient.auth.getCurrentUser();
      setUser(currentUser);
      setAuthError(null);
      
      // Загружаем профиль пользователя через BFF
      if (currentUser) {
        const profile = await fetchUserProfile();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    } catch (error: any) {
      console.error('Ошибка обновления пользователя:', error);
      setUser(null);
      setUserProfile(null);
    }
  };

  const resetAuth = (): void => {
    setUser(null);
    setUserProfile(null);
    setAuthError(null);
    setLoading(false);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    authError,
    signIn,
    signOut,
    refreshUser,
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

