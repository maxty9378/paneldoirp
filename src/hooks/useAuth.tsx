import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserFromCache, cacheUserProfile, clearUserCache } from '../lib/userCache';
import { Session } from '@supabase/supabase-js';

// Расширяем window для флага обработки
declare global {
  interface Window {
    authCallbackProcessing?: boolean;
  }
}

interface User {
  id: string;
  email?: string;
  sap_number?: string;
  full_name: string;
  position?: string;
  phone?: string;
  avatar_url?: string;
  role: 'employee' | 'supervisor' | 'trainer' | 'expert' | 'moderator' | 'administrator';
  subdivision: 'management_company' | 'branches';
  branch_subrole?: 'sales_representative' | 'supervisor' | 'branch_director';
  branch_id?: string;
  status: 'active' | 'inactive' | 'terminating' | 'transferring';
  work_experience_days: number;
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
  territory_id?: string;
  position_id?: string;
  is_active: boolean;
  department?: string;
  is_leaving?: boolean;
}

type LoadingPhase = 
  | 'initializing' 
  | 'session-fetch' 
  | 'profile-fetch' 
  | 'auth-change' 
  | 'profile-processing' 
  | 'complete' 
  | 'error' 
  | 'reset'
  | 'ready'
  | 'logged-out';

interface AuthContextType {
  user: User | null;
  userProfile: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  loadingPhase: LoadingPhase;
  signIn: (identifier: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<any>;
  resetAuth: () => void;
  refreshProfile: () => Promise<void>;
  retryFetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null); 
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); 
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('initializing');
  const [retryCount, setRetryCount] = useState(0);

  // single-flight
  const inFlightProfile = useRef<Promise<User | null> | null>(null);

  // безопасный sleep
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Utility function to create fallback user
  const createFallbackUser = (
    userId: string, 
    email?: string, 
    fullName?: string, 
    type: 'emergency' | 'auth-based' | 'admin' = 'emergency'
  ): User => {
    const isAdmin = email === 'doirp@sns.ru';
    
    const typeLabels = {
      emergency: 'Аварийный профиль',
      'auth-based': 'Профиль на основе auth данных',
      admin: 'Администратор портала'
    };
    
    return {
      id: userId,
      email: email || `emergency-${Date.now()}@sns.local`,
      full_name: fullName || (isAdmin ? 'Администратор портала' : `${typeLabels[type]} - Пользователь`),
      role: isAdmin ? 'administrator' : 'employee',
      subdivision: 'management_company',
      status: 'active',
      work_experience_days: 0,
      is_active: true,
      department: 'management_company',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as User;
  };

  // Function to get session with timeout (быстрый таймаут)
  const getSessionWithTimeout = async (timeoutMs: number = 10000) => {
    console.log(`🔄 Getting session with ${timeoutMs}ms timeout`);
    try {
      const res = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Session fetch timeout exceeded')), timeoutMs))
      ]);
      return res;
    } catch (error) {
      console.error('Session fetch error:', error);
      throw error;
    }
  };

  // Универсальная обёртка с ручным timeout
  async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number) {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
  }

  async function tryFetchProfileRow(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    // важный момент: если строки нет — data === null без error
    return data as User | null;
  }

  // Аккуратное авто-создание с мягким fallback
  async function ensureProfile(userId: string): Promise<User> {
    const { data: auth } = await supabase.auth.getUser();
    const meta = auth?.user?.user_metadata || {};
    const base: User = {
      id: userId,
      email: auth?.user?.email || `user-${userId}@sns.local`,
      full_name: meta.full_name || `Пользователь ${userId.slice(0, 8)}`,
      role: (auth?.user?.email === 'doirp@sns.ru') ? 'administrator' : 'employee',
      subdivision: 'management_company',
      status: 'active',
      work_experience_days: 0,
      is_active: true,
      department: meta.department || 'management_company',
      phone: meta.phone || '',
      sap_number: meta.sap_number || null,
      position_id: meta.position_id || null,
      branch_id: meta.branch_id || null,
      territory_id: meta.territory_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User;

    // пробуем сохранить; при RLS просто вернём base
    const { data: saved, error } = await supabase
      .from('users')
      .upsert(base, { onConflict: 'id' })
      .select('*')
      .maybeSingle();

    if (error) {
      console.warn('⚠️ RLS/insert blocked, using fallback profile in-memory:', error.message);
      return base;
    }
    return (saved || base) as User;
  }



  // Главная функция профиля — single-flight + backoff + длинный timeout
  const fetchUserProfile = async (userId: string, {foreground = true}: {foreground?: boolean} = {}) => {
    if (!userId) {
      setAuthError('Не удалось получить ID пользователя');
      setLoading(false);
      setLoadingPhase('error');
      return;
    }

    // если уже идёт один запрос — ждём его
    if (inFlightProfile.current) {
      console.log('⏳ Awaiting in-flight profile request');
      const u = await inFlightProfile.current;
      if (u) {
        setUser(u);
        setUserProfile(u);
        cacheUserProfile(u);
        if (foreground) {           // ← добавил условие
          setLoading(false);
          setLoadingPhase('complete');
        }
      }
      return;
    }

    const runner = (async (): Promise<User | null> => {
      try {
        if (foreground) {
          setLoadingPhase('profile-fetch');
          setLoading(true);
          setAuthError(null);
        }

        // 1) кэш - показываем сразу и не ждем
        const cached = getUserFromCache();
        let usedCache = false;
        let cachedUser: User | null = null;
        if (cached && cached.id === userId) {
          console.log('✅ Using cached user profile:', cached.id);
          usedCache = true;
          cachedUser = { ...cached, position: cached.position || 'Должность не указана' };
          // показываем кеш сразу и завершаем функцию
          setUser(cachedUser);
          setUserProfile(cachedUser);
          if (foreground) {
            setLoading(false);
            setLoadingPhase('complete');
          }
          // запускаем фоновое обновление асинхронно
          setTimeout(() => {
            console.log('🔄 Background profile refresh started');
            fetchUserProfile(userId, { foreground: false }).catch(e => 
              console.warn('Background refresh failed:', e.message)
            );
          }, 100);
          return cachedUser;
        }

        // 2) сет с ретраями (быстрые таймауты)
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const row = await withTimeout(() => tryFetchProfileRow(userId), 5000);
            if (row) {
              const u = { ...row, position: row.position || 'Должность не указана' } as User;
              setUser(u);
              setUserProfile(u);
              cacheUserProfile(u);
              if (foreground) {
                setLoading(false);
                setLoadingPhase('complete');
              }
              return u;
            }
            // строки нет — создаём
            const created = await withTimeout(() => ensureProfile(userId), 5000);
            const u = { ...created, position: created.position || 'Должность не указана' } as User;
            setUser(u);
            setUserProfile(u);
            cacheUserProfile(u);
            if (foreground) {
              setLoading(false);
              setLoadingPhase('complete');
            }
            return u;
          } catch (e: any) {
            console.warn(`🔁 Profile attempt ${attempt} failed:`, e.message || e);
            await delay(200 * attempt); // быстрый backoff
          }
        }

        // 3) окончательный мягкий фолбэк
        
        console.warn('🚨 Using auth-based fallback after retries');
        const { data: authData } = await supabase.auth.getUser();
        const isAdmin = authData?.user?.email === 'doirp@sns.ru';
        const fb = createFallbackUser(userId, authData?.user?.email, authData?.user?.user_metadata?.full_name, 'auth-based');
        setUser(fb);
        setUserProfile(fb);
        cacheUserProfile(fb);
        if (foreground) {
          setAuthError('Не удалось получить профиль из БД. Используется временный профиль.');
          setLoading(false);
          setLoadingPhase('complete'); // не 'error', чтобы UI не прилипал
        }
        return fb;
      } finally {
        inFlightProfile.current = null;
      }
    })();

    inFlightProfile.current = runner;
    await runner;
  };

  // Retry mechanism
  const retryFetchProfile = async () => {
    if (retryCount >= 3) {
      console.warn('⚠️ Maximum retry attempts reached');
      setAuthError('Превышено максимальное количество попыток. Попробуйте обновить страницу.');
      return;
    }
    
    if (session?.user?.id) {
      setRetryCount(prev => prev + 1);
      console.log(`🔄 Retrying profile fetch (attempt ${retryCount + 1}/3)`);
      await fetchUserProfile(session.user.id, { foreground: true });
    }
  };

  // Ручной refresh — без «ломания» фаз и без очистки кэша до успешного ответа
  const refreshProfile = async () => {
    if (!session?.user) return;
    console.log('🔄 Refreshing user profile...');
    try {
      await fetchUserProfile(session.user.id, { foreground: true });
      console.log('✅ Profile refresh completed');
    } catch (e) {
      console.warn('⚠️ Refresh failed:', (e as any)?.message);
    }
  };

  const resetAuth = () => {
    console.log('🔄 Resetting authentication state and clearing cache');
    setLoading(false);
    setUser(null);
    setAuthError(null);
    setUserProfile(null);
    setSession(null);
    setRetryCount(0);
    setLoadingPhase('reset');
    clearUserCache();
    
    // Очищаем весь localStorage и sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 Cleared localStorage and sessionStorage');
    } catch (error) {
      console.warn('⚠️ Could not clear storage:', error);
    }
    
    supabase.auth.signOut();
    
    // Принудительно перезагружаем страницу для полной очистки
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const signIn = async (identifier: string, password: string): Promise<{ data: any; error: any }> => {
    try {
      console.log(`🔑 Attempting to sign in with identifier: ${identifier}`);
      
      if (identifier === 'doirp@sns.ru' && password === '123456') {
        console.log('Using admin credentials - special handling');
      }
      
      setAuthError(null); // Clear any previous errors
      setLoading(true); // Set loading state

      const isEmail = identifier.includes('@');
      console.log(`🔑 Login type: ${isEmail ? 'email' : 'SAP'}`);
      
      if (isEmail) {
        const result = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        
        // Enhanced error handling for better user experience
        if (result.error) {
          let errorMessage = result.error.message;
          
          if (result.error.message.includes('Invalid login credentials')) {
            errorMessage = 'Неверные учетные данные. Проверьте email и пароль или создайте администратора.';
          } else if (result.error.message.includes('Email not confirmed')) {
            errorMessage = 'Email не подтвержден. Проверьте почту для подтверждения аккаунта.';
          } else if (result.error.message.includes('Too many requests')) {
            errorMessage = 'Слишком много попыток входа. Попробуйте позже.';
          } else if (result.error.message.includes('User not found')) {
            errorMessage = 'Пользователь не найден. Возможно, нужно создать учетную запись администратора.';
          }
          
          // Set the auth error state so the UI can react to it
          setAuthError(errorMessage);
          setLoading(false);
          console.log('📝 Sign in error:', errorMessage);
          return { data: result.data, error: { message: errorMessage } };
        }
        
        console.log('✅ Sign in success:', result.data?.session ? 'Session obtained' : 'No session');
          
        // Clear any previous errors on successful sign in
        setAuthError(null);
        return result;
      } else {
        // Handle SAP number login
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email')
            .eq('sap_number', identifier.trim())
            .maybeSingle();

          if (userError || !userData?.email) {
            const errorMsg = 'Пользователь с таким SAP номером не найден';
            setAuthError(errorMsg);
            setLoading(false);
            return { 
              data: null, 
              error: { message: errorMsg } 
            };
          }

          const result = await supabase.auth.signInWithPassword({
            email: userData.email,
            password,
          });
          
          if (result.error) {
            const errorMessage = result.error.message.includes('Invalid login credentials') 
              ? 'Неверный пароль для данного SAP номера'
              : result.error.message;
            setAuthError(errorMessage);
            setLoading(false);
            return { data: result.data, error: { message: errorMessage } };
          }
          
          // Clear any previous errors on successful sign in
          setAuthError(null);
          console.log('SignIn result for SAP user:', result);
          return result;
        } catch (error: any) {
          console.error('❌ Error finding user by SAP:', error);
          const errorMsg = `Ошибка при поиске пользователя: ${error.message || 'Неизвестная ошибка'}`;
          setAuthError(errorMsg);
          setLoading(false);
          return { 
            data: null, 
            error: { message: errorMsg } 
          };
        }
      }
    } catch (error: any) {
      console.error('❌ Error in signIn:', error);
      const errorMsg = `Ошибка авторизации: ${error.message || 'Неизвестная ошибка'}`;
      setAuthError(errorMsg);
      setLoading(false);
      return { 
        data: null, 
        error: { message: errorMsg } 
      };
    } finally {
      // Ensure loading is set to false in all cases
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out user');

    // 1) Сначала разлогиниваем на сервере
    const result = await supabase.auth.signOut();

    // 2) После успешного ответа — чистим состояние и кэш
    setUser(null);
    setUserProfile(null);
    setSession(null);
    setAuthError(null);
    setRetryCount(0);
    setLoadingPhase('logged-out');
    clearUserCache();

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('⚠️ Could not clear storage:', e);
    }
    return result;
  };

  // Main effect for authentication state management
  useEffect(() => {
    let isMounted = true;
    
    console.log('🔐 Auth provider initialized');
    
    // Initialize authentication
    const initializeAuth = async () => {
      // Проверяем, не обрабатывается ли уже авторизация в AuthCallback
      if (window.authCallbackProcessing) {
        console.log('⏳ AuthCallback is processing, skipping initialization');
        setLoadingPhase('auth-change');
        setLoading(true);
        
        // Ждем завершения обработки AuthCallback
        const checkAuthCallback = () => {
          if (!window.authCallbackProcessing) {
            console.log('✅ AuthCallback finished, retrying initialization');
            initializeAuth();
          } else {
            setTimeout(checkAuthCallback, 100);
          }
        };
        setTimeout(checkAuthCallback, 100);
        return;
      }
      
      setLoadingPhase('session-fetch');
      console.log('📥 Starting session fetch');
      
      try {
        // Get initial session with timeout
        const sessionResult = await getSessionWithTimeout(10000);
        if (!isMounted) return;
        
        if (sessionResult.error) {
          throw sessionResult.error;
        }
        
        const session = sessionResult.data.session;
        setSession(session);
        
        if (session?.user) {
          console.log('✅ Initial session found, fetching profile');
          setLoadingPhase('profile-fetch');
          
          // Look for cached profile first
          const cachedUser = getUserFromCache();
          if (cachedUser && cachedUser.id === session.user.id) {
            console.log('✅ Using cached user profile');
            setUser(cachedUser);
            setUserProfile(cachedUser);
            setLoadingPhase('complete');
            setLoading(false);
            
            // Still fetch profile in background for latest data
            fetchUserProfile(session.user.id, { foreground: false }).catch(console.error);
          } else {
            // No valid cached profile, fetch from server
            await fetchUserProfile(session.user.id, { foreground: true });
          }
        } else {
          console.log('ℹ️ No initial session found');
          setLoadingPhase('ready');
          setLoading(false);
        }
      } catch (error: any) {
        console.error('❌ Error in initializeAuth:', error);
        
        if (!isMounted) return;
        
        // Don't show error immediately on timeout, just complete loading
        // User can still try to login
        console.warn('⚠️ Auth initialization failed:', error.message);
        
        setLoadingPhase('ready');
        setLoading(false);
      }
    };
    
    // Start initialization
    initializeAuth();

    // Listen for auth changes
    const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('🔄 Auth state changed:', event, session?.user?.id?.substring(0, 8));
      setSession(session);
      
      // Специальная обработка INITIAL_SESSION
      if (event === 'INITIAL_SESSION') {
        if (!session?.user) {
          // нет сессии — сразу выходим из загрузки
          console.log('ℹ️ No initial session found');
          setUser(null);
          setUserProfile(null);
          setAuthError(null);
          setLoadingPhase('ready');
          setLoading(false);
          return;
        }
        // есть юзер в initial session — грузим профиль
        console.log('✅ Initial session found, loading profile');
        setLoadingPhase('profile-fetch');
        await fetchUserProfile(session.user.id, { foreground: true });
        return;
      }
      
      // Обработка других событий (SIGNED_IN, SIGNED_OUT, etc.)
      if (session?.user) {
        console.log('✅ New session after auth change');
        setLoadingPhase('auth-change');
        
        // Check if user is the same as current user
        if (user?.id === session.user.id) {
          console.log('✅ User ID matches existing user, keeping current profile');
          setLoadingPhase('complete');
          setLoading(false);
        } else {
          await fetchUserProfile(session.user.id, { foreground: true });
        }
      } else {
        console.log('ℹ️ No session after auth change');
        setLoadingPhase('logged-out');
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Return cleanup function
    return () => {
      isMounted = false;
      authSubscription?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  // УДАЛЕН аварийный таймер - он был причиной проблем

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    authError,
    loadingPhase,
    signIn,
    signOut,
    resetAuth,
    refreshProfile,
    retryFetchProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('❌ useAuth used outside AuthProvider - this is a critical error');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}