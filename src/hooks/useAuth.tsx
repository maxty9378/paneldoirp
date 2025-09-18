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

  // Хелпер для проверки авторизационного флоу
  const isAuthFlowPath = () => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname || '';
    return p.startsWith('/auth/');
  };

  // single-flight
  const inFlightProfile = useRef<Promise<User | null> | null>(null);
  
  // ref для актуального пользователя в onAuthStateChange
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  // Резюмирование после коллбэка - дотянуть профиль после /auth/*
  useEffect(() => {
    if (!isAuthFlowPath() && session?.user && !userProfile) {
      console.log('🔄 Post-auth: fetching profile after callback');
      fetchUserProfile(session.user.id, { foreground: false })
        .catch(e => console.warn('post-auth bg fetch failed', e));
    }
  }, [session?.user, userProfile]);

  // Оптимизированный delay с проверкой прерывания
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

  // Проверка валидности сессии
  const isSessionValid = (session: any) => {
    if (!session?.user) return false;
    
    // Проверяем, что токен не истек (с запасом в 30 минут для более мягкой проверки)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    if (expiresAt && now >= expiresAt - 1800) {
      console.log('⚠️ Session token expires soon, will refresh');
      return false;
    }
    
    return true;
  };

  // Оптимизированный getSession с увеличенным таймаутом
  const getSessionSoft = async (timeoutMs = 30000) => {
    try {
      const res = await withTimeout(() => supabase.auth.getSession(), timeoutMs);
      return res;
    } catch (e) {
      console.warn('[Auth] getSession error/timeout:', (e as any)?.message || e);
      return { data: { session: null }, error: e as any };
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

    // Страховка: не загружаем профиль во время авторизации
    if (isAuthFlowPath() || window.authCallbackProcessing) {
      console.log('⏭ Bypass fetchUserProfile during auth flow');
      return;
    }

    // Дополнительно: проверяем сессию
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('⏳ No session, skipping profile fetch');
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
        if (foreground) {
          setLoading(false);
          setLoadingPhase('complete');
        }
      } else if (foreground) {
        setLoading(false);
        setLoadingPhase('complete');
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
        if (cached && cached.id === userId) {
          console.log('✅ Using cached user profile:', cached.id);
          const cachedUser = { ...cached, position: cached.position || 'Должность не указана' };
          setUser(cachedUser);
          setUserProfile(cachedUser);

          if (foreground) {
            // Показали кэш и ОДИН раз обновим из сети без рекурсии
            setLoading(false);
            setLoadingPhase('complete');

              // Фоновое обновление профиля
              (async () => {
                try {
                  console.log('🔄 Background profile refresh');
                  const row = await withTimeout(() => tryFetchProfileRow(userId), 8000);
                  if (row) {
                    const fresh = { ...row, position: row.position || 'Должность не указана' } as User;
                    setUser(fresh);
                    setUserProfile(fresh);
                    cacheUserProfile(fresh);
                  }
                } catch (e: any) {
                  console.warn('Background refresh failed:', e.message || e);
                }
              })();

            return cachedUser;
          }

          // Если это background-вызов — НЕ выходим здесь.
          // Продолжим ниже и попробуем сетевой запрос (без нового таймера).
        }

        // 2) Сетевой запрос с оптимизированным таймаутом
        try {
          const row = await withTimeout(() => tryFetchProfileRow(userId), 10000);
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
          const created = await withTimeout(() => ensureProfile(userId), 10000);
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
          console.warn('🔁 Profile fetch failed:', e.message || e);
        }

        // 3) окончательный мягкий фолбэк
        
        console.warn('🚨 Using auth-based fallback after retries');
        const { data: authData } = await supabase.auth.getUser();
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
    
    // Убираем перезагрузку страницы - просто сбрасываем состояние
    // Пользователь останется на той же странице, но разлогинится
  };

  const signIn = async (identifier: string, password: string): Promise<{ data: any; error: any }> => {
    console.log(`🔑 Attempting to sign in with identifier: ${identifier}`);
    
    setAuthError(null);
    setLoading(true);
    setLoadingPhase('auth-change');

    try {
      const isEmail = identifier.includes('@');
      console.log(`🔑 Login type: ${isEmail ? 'email' : 'SAP'}`);
      
      if (isEmail) {
        // Email авторизация
        const result = await withTimeout(
          () => supabase.auth.signInWithPassword({ email: identifier, password }),
          10000
        );
        
        if (result.error) {
          const errorMessage = getAuthErrorMessage(result.error.message);
          setAuthError(errorMessage);
          setLoading(false);
          setLoadingPhase('error');
          console.log('📝 Sign in error:', errorMessage);
          return { data: result.data, error: { message: errorMessage } };
        }
        
        console.log('✅ Email sign in success');
        setAuthError(null);
        return result;
      } else {
        // SAP авторизация
        const { data: userData, error: userError } = await withTimeout(
          () => supabase
            .from('users')
            .select('email')
            .eq('sap_number', identifier.trim())
            .maybeSingle(),
          8000
        );

        if (userError || !userData?.email) {
          const errorMsg = 'Пользователь с таким SAP номером не найден';
          setAuthError(errorMsg);
          setLoading(false);
          setLoadingPhase('error');
          return { data: null, error: { message: errorMsg } };
        }

        const result = await withTimeout(
          () => supabase.auth.signInWithPassword({ email: userData.email, password }),
          10000
        );
        
        if (result.error) {
          const errorMessage = result.error.message.includes('Invalid login credentials') 
            ? 'Неверный пароль для данного SAP номера'
            : getAuthErrorMessage(result.error.message);
          setAuthError(errorMessage);
          setLoading(false);
          setLoadingPhase('error');
          return { data: result.data, error: { message: errorMessage } };
        }
        
        console.log('✅ SAP sign in success');
        setAuthError(null);
        return result;
      }
    } catch (error: any) {
      console.error('❌ Error in signIn:', error);
      const errorMsg = error.message === 'timeout' 
        ? 'Время ожидания истекло. Проверьте подключение к интернету.'
        : `Ошибка авторизации: ${error.message || 'Неизвестная ошибка'}`;
      setAuthError(errorMsg);
      setLoading(false);
      setLoadingPhase('error');
      return { data: null, error: { message: errorMsg } };
    }
  };

  // Функция для обработки сообщений об ошибках
  const getAuthErrorMessage = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Неверные учетные данные. Проверьте логин и пароль.';
    } else if (errorMessage.includes('Email not confirmed')) {
      return 'Email не подтвержден. Проверьте почту для подтверждения аккаунта.';
    } else if (errorMessage.includes('Too many requests')) {
      return 'Слишком много попыток входа. Попробуйте позже.';
    } else if (errorMessage.includes('User not found')) {
      return 'Пользователь не найден. Возможно, нужно создать учетную запись администратора.';
    }
    return errorMessage;
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
    let refreshInterval: NodeJS.Timeout | null = null;
    let lastRefreshTime = 0;
    let isRefreshing = false;
    
    console.log('🔐 Auth provider initialized');
    
    // Initialize authentication
    const initializeAuth = async () => {
      // Проверяем, не обрабатывается ли уже авторизация в AuthCallback
      if (window.authCallbackProcessing) {
        console.log('⏳ AuthCallback is processing, skipping initialization');
        setLoadingPhase('auth-change');
        setLoading(true);
        return;
      }
      
      setLoadingPhase('session-fetch');
      console.log('📥 Starting session fetch');
      
      try {
        // Получаем сессию с увеличенным таймаутом
        const sessionResult = await getSessionSoft(30000);
        if (!isMounted) return;
        
        const session = sessionResult.data.session;
        setSession(session);
        
        if (session?.user) {
          console.log('✅ Initial session found');
          
          if (isAuthFlowPath() || window.authCallbackProcessing) {
            console.log('⏸ Skip initial profile fetch during auth flow');
            setLoadingPhase('ready');
            setLoading(false);
          } else {
            // Проверяем кэш профиля
            const cachedUser = getUserFromCache();
            if (cachedUser && cachedUser.id === session.user.id) {
              console.log('✅ Using cached user profile');
              setUser(cachedUser);
              setUserProfile(cachedUser);
              setLoadingPhase('complete');
              setLoading(false);
              
              // Тихо обновляем профиль в фоне
              fetchUserProfile(session.user.id, { foreground: false })
                .catch(e => console.warn('bg profile update failed', e));
            } else {
              // Загружаем профиль
              setLoadingPhase('profile-fetch');
              fetchUserProfile(session.user.id, { foreground: true })
                .catch(e => {
                  console.warn('initial profile fetch failed', e);
                  setLoadingPhase('complete');
                  setLoading(false);
                });
            }
          }
        } else {
          console.log('ℹ️ No initial session found');
          setLoadingPhase('ready');
          setLoading(false);
        }
      } catch (error: any) {
        console.error('❌ Error in initializeAuth:', error);
        
        if (!isMounted) return;
        
        console.warn('⚠️ Auth initialization failed:', error.message);
        setLoadingPhase('ready');
        setLoading(false);
      }
    };

    // Start initialization
    initializeAuth();

    // Периодическое обновление токенов (каждые 4 часа)
    const startTokenRefresh = () => {
      if (refreshInterval) clearInterval(refreshInterval);
      
      refreshInterval = setInterval(async () => {
        if (!isMounted || isRefreshing) return;
        
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.user && !isSessionValid(currentSession)) {
            // Проверяем, что прошло достаточно времени с последнего обновления
            const now = Date.now();
            if (now - lastRefreshTime < 10 * 60 * 1000) { // минимум 10 минут между обновлениями
              console.log('⏳ Skipping refresh - too soon since last refresh');
              return;
            }
            
            console.log('🔄 Periodic token refresh triggered');
            isRefreshing = true;
            lastRefreshTime = now;
            
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.warn('Periodic refresh failed:', error);
            } else if (data.session) {
              console.log('✅ Periodic refresh successful');
              setSession(data.session);
            }
          }
        } catch (e) {
          console.warn('Periodic refresh error:', e);
        } finally {
          isRefreshing = false;
        }
      }, 4 * 60 * 60 * 1000); // 4 часа
    };

    // Listen for auth changes
    const authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('🔄 Auth state changed:', event, session?.user?.id?.substring(0, 8));
      setSession(session);
      
      // Запускаем или останавливаем периодическое обновление
      if (session?.user) {
        startTokenRefresh();
      } else {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
      }
      
      // INITIAL_SESSION обрабатывается в initializeAuth, пропускаем
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      // TOKEN_REFRESHED - токен уже обновлен, не нужно ничего делать
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed by Supabase');
        isRefreshing = false;
        lastRefreshTime = Date.now();
        return;
      }

      // не дёргаем профиль, пока коллбэк ещё жуёт токены или мы на /auth/*
      if (window.authCallbackProcessing || isAuthFlowPath()) {
        console.log('⏸ Skip profile fetch during auth flow');
        setLoadingPhase('ready');
        setLoading(false);
        return;
      }
      
      // Обработка других событий (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
      if (session?.user && isSessionValid(session)) {
        console.log('✅ Valid session found after auth change');
        
        // Check if user is the same as current user
        if (userRef.current?.id === session.user.id) {
          console.log('✅ User ID matches existing user, keeping current profile');
          setLoadingPhase('complete');
          setLoading(false);
          return;
        }
        
        // Different user or no current user, fetch profile
        console.log('🔄 Fetching profile for user:', session.user.id);
        setLoadingPhase('complete');
        setLoading(false);
        // фоново, без блокировки интерфейса
        fetchUserProfile(session.user.id, { foreground: false })
          .catch(e => console.warn('bg profile fetch failed', e));
      } else {
        // Только если это явный SIGNED_OUT, сбрасываем состояние
        if (event === 'SIGNED_OUT') {
          console.log('ℹ️ User signed out, clearing state');
          setLoadingPhase('logged-out');
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        } else if (session?.user && !isSessionValid(session)) {
          // Проверяем, что не обновляемся слишком часто
          const now = Date.now();
          if (isRefreshing || (now - lastRefreshTime < 2 * 60 * 1000)) { // минимум 2 минуты между обновлениями
            console.log('⏳ Skipping refresh - too soon or already refreshing');
            return;
          }
          
          console.log('⚠️ Session invalid, attempting refresh');
          isRefreshing = true;
          lastRefreshTime = now;
          
          // Попробуем обновить токен с повторными попытками
          const refreshSession = async (attempts = 0) => {
            try {
              const { data, error } = await supabase.auth.refreshSession();
              if (error) throw error;
              
              if (data.session) {
                console.log('✅ Session refreshed successfully');
                setSession(data.session);
                isRefreshing = false;
                return;
              }
            } catch (e) {
              console.warn(`Failed to refresh session (attempt ${attempts + 1}):`, e);
              if (attempts < 1) { // Уменьшаем количество попыток
                // Повторяем попытку через 5 секунд
                setTimeout(() => refreshSession(attempts + 1), 5000);
              } else {
                console.warn('All refresh attempts failed, signing out');
                isRefreshing = false;
                setLoadingPhase('logged-out');
                setUser(null);
                setUserProfile(null);
                setLoading(false);
              }
            }
          };
          
          refreshSession();
        } else {
          console.log('ℹ️ No session but not signed out, keeping current state');
          // Не сбрасываем состояние при других событиях (например, TOKEN_REFRESHED)
        }
      }
    });

    // Return cleanup function
    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
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