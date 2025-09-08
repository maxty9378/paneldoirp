import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserFromCache, cacheUserProfile, clearUserCache } from '../lib/userCache';
import { Session } from '@supabase/supabase-js';

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
  const [sessionLoaded, setSessionLoaded] = useState(false);

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

  // Function to get session with timeout
  const getSessionWithTimeout = async (timeoutMs: number = 15000) => {
    console.log(`🔄 Getting session with ${timeoutMs}ms timeout`);
    
    try {
      return await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Session fetch timeout exceeded'));
        }, timeoutMs);
      })
      ]);
    } catch (error) {
      console.error('Session fetch error:', error);
      throw error;
    }
  };

  // Safe profile fetch with auto-creation
  const fetchUserProfileSafe = async (userId: string, signal?: AbortSignal) => {
    console.log(`🔍 Safe fetch for userId: ${userId}`);
    
    // 1) Пробуем прочитать профиль
    const { data, error, status } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();              // важно: не .single()

    if (!error && data) {
      console.log('✅ Profile found in database');
      return { data, error: null };
    }

    // 2) Если строки нет (406) — создаём
    if (status === 406 /* No rows */) {
      console.log('📝 No profile found, attempting auto-creation');
      
      try {
        // Получаем данные из auth для создания профиля
        const { data: authData } = await supabase.auth.getUser();
        const userMetadata = authData?.user?.user_metadata || {};
        
        const newProfile = {
          id: userId,
          email: authData?.user?.email || `user-${userId}@sns.local`,
          full_name: userMetadata.full_name || `Пользователь ${userId.slice(0, 8)}`,
          role: 'employee',
          subdivision: 'management_company',
          status: 'active',
          work_experience_days: 0,
          is_active: true,
          department: userMetadata.department || 'management_company',
          phone: userMetadata.phone || '',
          sap_number: userMetadata.sap_number || null,
          position_id: userMetadata.position_id || null,
          branch_id: userMetadata.branch_id || null,
          territory_id: userMetadata.territory_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single();

        if (insertErr) {
          console.error('❌ Error creating profile:', insertErr);
          console.log('📋 Profile creation failed, likely due to RLS policy. Creating fallback profile...');
          
          // Создаем fallback профиль немедленно
          const fallbackUser = {
            id: userId,
            email: authData?.user?.email || `user-${userId}@sns.local`,
            full_name: userMetadata.full_name || `Пользователь ${userId.slice(0, 8)}`,
            role: 'employee' as const,
            subdivision: 'management_company' as const,
            status: 'active' as const,
            work_experience_days: 0,
            is_active: true,
            department: userMetadata.department || 'management_company',
            phone: userMetadata.phone || '',
            sap_number: userMetadata.sap_number || null,
            position_id: userMetadata.position_id || null,
            branch_id: userMetadata.branch_id || null,
            territory_id: userMetadata.territory_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          return { data: fallbackUser, error: null };
        }
        
        console.log('✅ Profile created successfully');
        return { data: inserted, error: null };
      } catch (createError) {
        console.error('❌ Failed to create profile:', createError);
        throw createError;
      }
    }

    // 3) Любая другая ошибка — наружу
    console.error('❌ Profile fetch error:', error);
    throw error ?? new Error('Unknown profile fetch error');
  };

  // Fetch with timeout using AbortController
  const fetchProfileWithTimeout = async (userId: string, timeoutMs: number = 8000) => {
    console.log(`🔍 Fetching profile for userId: ${userId} with ${timeoutMs}ms timeout`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fetchUserProfileSafe(userId, controller.signal);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Handle missing profile creation
  const handleMissingProfile = async (userId: string): Promise<User> => {
    console.log('📝 Handling missing profile for user:', userId);
    
    try {
      const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
      
      if (authUserError) {
        console.error('❌ Error getting auth data:', authUserError.message);
        throw new Error(`Auth error: ${authUserError.message}`);
      }
      
      if (!authUserData?.user) {
        console.error('❌ No auth user data found');
        throw new Error('No auth user data available');
      }

      const userEmail = authUserData.user.email || '';
      const userName = authUserData.user.user_metadata?.full_name || 
                      userEmail.split('@')[0] || 'Пользователь';
      const isAdmin = userEmail === 'doirp@sns.ru';
      
      const userData = {
        id: authUserData.user.id,
        email: userEmail,
        full_name: isAdmin ? 'Администратор портала' : userName,
        role: isAdmin ? 'administrator' : 'employee',
        subdivision: 'management_company',
        status: 'active',
        work_experience_days: 0,
        is_active: true,
        department: 'management_company',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as User;

      // Try to create profile in database
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'id' })
        .select('*')
        .single();

      if (insertError) {
        console.warn('⚠️ Could not save to database, using fallback:', insertError.message);
        return userData;
      }

      console.log('✅ Successfully created/updated profile in database');
      return insertedUser as User;
      
    } catch (error) {
      console.error('❌ Error in handleMissingProfile:', error);
      // Return fallback user as last resort
      return createFallbackUser(userId, undefined, undefined, 'emergency');
    }
  };

  // Main profile fetching function
  const fetchUserProfile = async (userId: string) => {
    if (!userId) {
      console.error('❌ No userId provided to fetchUserProfile');
      setLoading(false);
      setLoadingPhase('error');
      setAuthError('Не удалось получить ID пользователя');
      return;
    }

    const startTime = Date.now();
    console.log('🔍 Starting fetchUserProfile for userId:', userId);
    setLoadingPhase('profile-fetch');
    setAuthError(null); // Clear previous errors
    
    // Try to get user from cache first
    const cachedUser = getUserFromCache();
    if (cachedUser && cachedUser.id === userId) {
      console.log('✅ Using cached user profile:', cachedUser.id);
      // Ensure position has a default value in cached user
      const userWithDefaultPosition = {
        ...cachedUser,
        position: cachedUser.position || 'Должность не указана'
      };
      setUser(userWithDefaultPosition);
      setUserProfile(userWithDefaultPosition);
      setLoadingPhase('complete');
      setLoading(false);
      setRetryCount(0);
      return;
    }
    
    try {
      // Attempt to fetch profile with timeout and auto-creation
      console.log('🔍 Starting profile fetch with auto-creation...');
      const { data: userData, error: userError } = await fetchProfileWithTimeout(userId, 3000);
      
      setLoadingPhase('profile-processing');
      
      if (userData) {
        console.log('✅ Profile loaded successfully');
        const userWithPosition = {
          ...userData,
          position: userData.position || 'Должность не указана'
        } as User;
        
        setUser(userWithPosition);
        setUserProfile(userWithPosition);
        cacheUserProfile(userWithPosition);
        
        // Reset retry count on success
        setRetryCount(0);
      } else {
        console.warn('⚠️ No profile data returned, using fallback');
        throw new Error('No profile data returned after fetch/creation attempt');
      }
      
    } catch (error: any) {
      console.error('❌ Error in fetchUserProfile:', error.message);
      
      // Определяем тип ошибки для более точного сообщения
      let errorMessage = 'Ошибка загрузки профиля';
      
      if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        errorMessage = 'Нет прав для чтения профиля. Проверьте RLS политики в Supabase.';
      } else if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
        errorMessage = 'Превышено время ожидания ответа от базы данных.';
      } else {
        errorMessage = `Ошибка загрузки профиля: ${error.message}`;
      }
      
      setAuthError(errorMessage);
      
      // Create emergency fallback user IMMEDIATELY 
      try {
        console.log('🚨 Creating emergency fallback user due to error');
        const { data: authData } = await supabase.auth.getUser();
        const fallbackUser = createFallbackUser(
          userId,
          authData?.user?.email,
          authData?.user?.user_metadata?.full_name,
          'auth-based'
        );
        
        console.log('⚠️ Using auth-based fallback user');
        setUser(fallbackUser);
        setUserProfile(fallbackUser);
        cacheUserProfile(fallbackUser);
      } catch (authError) {
        console.error('❌ Could not get auth data, using emergency profile');
        const emergencyUser = createFallbackUser(userId);
        setUser(emergencyUser);
        setUserProfile(emergencyUser);
        cacheUserProfile(emergencyUser);
      }
      
    } finally {
      console.log(`⏱️ Profile fetch completed in ${Date.now() - startTime}ms`);
      setLoadingPhase('complete');
      setLoading(false);
    }
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
      await fetchUserProfile(session.user.id);
    }
  };

  const refreshProfile = async () => {
    if (session?.user) {
      console.log('🔄 Refreshing user profile...');
      setRetryCount(0); // Reset retry count for manual refresh
      
      // Очищаем кэш перед обновлением
      clearUserCache();
      
      // Принудительно обновляем профиль
      await fetchUserProfile(session.user.id);
      
      console.log('✅ Profile refresh completed');
    }
  };

  const resetAuth = () => {
    console.log('🔄 Resetting authentication state and clearing cache');
    setLoading(false);
    setSessionLoaded(false);
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
      console.log(`🔑 Attempting to sign in with identifier: ${identifier} and password: ${password}`);
      
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
        
        console.log('📝 Sign in result:', result.error ? 
          `❌ Error: ${result.error.message}` : 
          `✅ Success: ${result.data?.session ? 'Session obtained' : 'No session'}`);
          
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
    // Clear state immediately
    setUser(null);
    setUserProfile(null);
    setSession(null);
    setSessionLoaded(false);
    setAuthError(null);
    setRetryCount(0);
    setLoadingPhase('logged-out');
    clearUserCache();
    
    // Actually sign out
    const result = await supabase.auth.signOut();
    
    return result;
  };

  // Main effect for authentication state management
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    console.log('🔐 Auth provider initialized');
    
    // Initialize authentication
    const initializeAuth = async () => {
      setLoadingPhase('session-fetch');
      console.log('📥 Starting session fetch');
      
      try {
        // Get initial session with timeout
        const sessionResult = await getSessionWithTimeout(30000);
        setSessionLoaded(true);
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
            fetchUserProfile(session.user.id).catch(console.error);
          } else {
            // No valid cached profile, fetch from server
            await fetchUserProfile(session.user.id);
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
    
    // Set a maximum timeout for initialization - safety measure
    timeoutId = setTimeout(() => {
      if (loading && !sessionLoaded && isMounted) {
        console.warn('⚠️ Auth initialization timeout reached');
        // Don't show error, just complete loading so user can try to login
        setLoadingPhase('ready');
        setLoading(false);
      }
    }, 30000);

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
        await fetchUserProfile(session.user.id);
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
          await fetchUserProfile(session.user.id);
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
      clearTimeout(timeoutId);
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  // Предохранитель от вечного loading
  useEffect(() => {
    if (!loading) return;
    
    const emergencyTimeout = setTimeout(() => {
      if (loadingPhase === 'profile-fetch') {
        console.warn('⏰ Emergency timeout — profile fetch took too long, forcing fallback');
        setAuthError('Не удалось получить профиль. Используется аварийный профиль.');
        
        // Создаём экстренный профиль
        const currentSession = session;
        if (currentSession?.user) {
          const emergencyUser = createFallbackUser(
            currentSession.user.id,
            currentSession.user.email,
            currentSession.user.user_metadata?.full_name,
            'emergency'
          );
          setUser(emergencyUser);
          setUserProfile(emergencyUser);
          cacheUserProfile(emergencyUser);
        }
        
        setLoading(false);
        setLoadingPhase('error');
      }
    }, 5000); // 5 секунд максимум
    
    return () => clearTimeout(emergencyTimeout);
  }, [loading, loadingPhase, session]);

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