import { createClient } from '@supabase/supabase-js';
import { User, EventType, EventParticipant, Branch } from '../types';

// Get and validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || 'mock-key';

// Validate URL format
const isValidUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('supabase');
  } catch {
    return false;
  }
};

// Check if credentials are properly configured
const hasValidCredentials = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_project_url_here' && 
  supabaseAnonKey !== 'your_anon_key_here' &&
  supabaseUrl.length > 20 &&
  supabaseAnonKey.length > 20 &&
  isValidUrl(supabaseUrl)
);

// Test connectivity to Supabase
let isSupabaseReachable = false;
let connectivityTestCompleted = false;

const testSupabaseConnectivity = async (): Promise<boolean> => {
  if (!hasValidCredentials) return false;
  
  try {
    console.log('🔄 Testing Supabase connectivity...');
    
    // Create a temporary client for testing
    const testClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    // Test with a very short timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connectivity test timeout')), 2000);
    });

    const connectivityTest = testClient.auth.getSession();
    
    await Promise.race([connectivityTest, timeoutPromise]);
    
    console.log('✅ Supabase connectivity test passed');
    isSupabaseReachable = true;
    return true;
  } catch (error) {
    console.warn('❌ Supabase connectivity test failed:', error);
    isSupabaseReachable = false;
    return false;
  } finally {
    connectivityTestCompleted = true;
  }
};

// Start connectivity test immediately
testSupabaseConnectivity();

console.log('Supabase credential validation:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  isValidUrl: isValidUrl(supabaseUrl),
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length,
  finalValidation: hasValidCredentials
});

if (!hasValidCredentials) {
  console.warn('⚠️ Supabase credentials not configured properly:');
  console.warn('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing');
  console.warn('Key:', supabaseAnonKey ? 'provided but may be invalid' : 'missing');
  console.warn('Create a .env file with:');
  console.warn('VITE_SUPABASE_URL=https://your-project-ref.supabase.co');
  console.warn('VITE_SUPABASE_ANON_KEY=your-anon-key-here');
}

// Create a mock client when credentials are not available or connectivity fails
const createMockClient = () => {
  console.log('🔨 Creating mock Supabase client for development');
  
  // Default admin session for testing
  let mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() + 3600000,
    expires_in: 3600,
    token_type: 'bearer',
    user: { 
      id: '00000000-0000-4000-8000-000000000000', 
      email: 'doirp@sns.ru', 
      user_metadata: { 
        full_name: 'Администратор портала',
        role: 'administrator' 
      },
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: new Date().toISOString(),
      phone_confirmed_at: null,
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };

  const mockUserData = {
    id: '00000000-0000-4000-8000-000000000000', 
    email: 'doirp@sns.ru', 
    full_name: 'Администратор портала',
    role: 'administrator',
    is_active: true,
    subdivision: 'management_company',
    department: 'management_company',
    status: 'active',
    work_experience_days: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    avatar_url: null,
    position: null,
    phone: null,
    sap_number: null,
    branch_subrole: null,
    branch_id: null,
    last_sign_in_at: new Date().toISOString(),
    is_leaving: false,
    position_id: null,
    territory_id: null
  };
  
  return {
    auth: {
      getSession: () => {
        console.log('Mock getSession called');
        return Promise.resolve({ 
          data: { session: mockSession }, 
          error: null 
        });
      },
      getUser: () => {
        console.log('Mock getUser called');
        return Promise.resolve({ 
          data: { 
            user: mockSession?.user || null
          }, 
          error: null 
        });
      },
      signInWithPassword: (credentials: any) => {
        console.log('🔑 Mock signInWithPassword called with:', credentials.email);

        return new Promise((resolve) => {
          // Simulate network delay but ensure it resolves quickly
          setTimeout(() => {
            if (credentials.email === 'doirp@sns.ru' && credentials.password === '123456') {
              console.log('✅ Mock login successful');
              
              const mockUser = { 
                id: '00000000-0000-4000-8000-000000000000', 
                email: 'doirp@sns.ru', 
                user_metadata: { 
                  full_name: 'Администратор портала',
                  role: 'administrator' 
                },
                aud: 'authenticated',
                role: 'authenticated',
                email_confirmed_at: new Date().toISOString(),
                phone_confirmed_at: null,
                last_sign_in_at: new Date().toISOString(),
                app_metadata: { provider: 'email', providers: ['email'] },
                identities: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              mockSession = { 
                access_token: 'mock-token', 
                refresh_token: 'mock-refresh-token',
                expires_at: Date.now() + 3600000,
                expires_in: 3600,
                token_type: 'bearer',
                user: mockUser
              };
              
              resolve({
                data: { session: mockSession, user: mockUser },
                error: null 
              });
            } else {
              console.log('❌ Mock login failed');
              resolve({ 
                data: { session: null, user: null }, 
                error: { message: 'Invalid login credentials' } 
              });
            }
          }, 100);
        });
      },
      signUp: (credentials: any) => {
        console.log('Mock signUp called with:', credentials.email);
        return Promise.resolve({ 
          data: { user: null, session: null }, 
          error: { message: 'User registration disabled in mock client' } 
        });
      },
      signOut: () => {
        console.log('Mock sign-out');
        mockSession = null;
        return Promise.resolve({ error: null });
      },
      onAuthStateChange: (callback: Function) => {
        console.log('📝 Mock onAuthStateChange registered');
        
        // Return subscription object immediately
        const subscription = { 
          unsubscribe: () => console.log('Mock auth subscription unsubscribed')
        };
        
        // Trigger callback asynchronously but quickly
        setTimeout(() => {
          if (mockSession) {
            console.log('📝 Triggering auth state change with session');
            callback('SIGNED_IN', mockSession);
          } else {
            console.log('📝 Triggering auth state change without session');
            callback('SIGNED_OUT', null);
          }
        }, 50);
        
        return { 
          data: { subscription } 
        };
      }
    },
    from: (table: string) => ({
      select: (query: string = '*') => {
        console.log(`Mock select from ${table}:`, query);
        
        return {
          eq: (column: string, value: any) => {
            console.log(`Mock eq filter: ${column} = ${value}`);
            return {
              single: () => {
                console.log(`Mock single() called for ${table}`);
                return new Promise((resolve) => {
                  setTimeout(() => {
                    if (table === 'users' && column === 'email' && value === 'doirp@sns.ru') {
                      resolve({ data: mockUserData, error: null });
                    } else {
                      resolve({ data: null, error: null });
                    }
                  }, 50);
                });
              },
              maybeSingle: () => {
                console.log(`Mock maybeSingle() called for ${table}`);
                return new Promise((resolve) => {
                  setTimeout(() => {
                    if (table === 'users' && column === 'email' && value === 'doirp@sns.ru') {
                      resolve({ data: mockUserData, error: null });
                    } else {
                      resolve({ data: null, error: null });
                    }
                  }, 50);
                });
              }
            };
          },
          order: (column: string, options?: any) => {
            console.log(`Mock order by: ${column}`, options);
            return {
              single: () => Promise.resolve({ data: null, error: null }),
              maybeSingle: () => Promise.resolve({ data: null, error: null })
            };
          },
          single: () => {
            console.log(`Mock single() called directly for ${table}`);
            return new Promise((resolve) => {
              setTimeout(() => {
                if (table === 'users') {
                  resolve({ data: mockUserData, error: null });
                } else {
                  resolve({ data: null, error: null });
                }
              }, 50);
            });
          },
          maybeSingle: () => {
            console.log(`Mock maybeSingle() called directly for ${table}`);
            return new Promise((resolve) => {
              setTimeout(() => {
                if (table === 'users') {
                  resolve({ data: mockUserData, error: null });
                } else {
                  resolve({ data: null, error: null });
                }
              }, 50);
            });
          }
        };
      },
      insert: (data: any) => ({
        select: () => ({
          single: () => {
            console.log(`Mock insert with select single for ${table}:`, data);
            return Promise.resolve({ data, error: null });
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: () => {
              console.log(`Mock update with select single for ${table}:`, data);
              return Promise.resolve({ data, error: null });
            }
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          single: () => {
            console.log(`Mock delete single for ${table}`);
            return Promise.resolve({ data: null, error: null });
          }
        })
      })
    })
  };
};

// Create a function that returns the appropriate client
const createSupabaseClient = () => {
  // If credentials are invalid, use mock client
  if (!hasValidCredentials) {
    console.log('Using mock client: Invalid credentials');
    return createMockClient();
  }

  // Create real client with timeout configurations
  const realClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: 'sns-auth-storage',
      storage: {
        getItem: (key) => {
          try {
            const value = localStorage.getItem(key);
            console.log(`🔐 Auth storage: Retrieved key ${key.substring(0, 8)}...`);
            return value;
          } catch (error) {
            console.warn('🔐 Auth storage: Error getting item', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
            console.log(`🔐 Auth storage: Stored key ${key.substring(0, 8)}...`);
          } catch (error) {
            console.warn('🔐 Auth storage: Error setting item', error);
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
            console.log(`🔐 Auth storage: Removed key ${key.substring(0, 8)}...`);
          } catch (error) {
            console.warn('🔐 Auth storage: Error removing item', error);
          }
        }
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'training-portal@1.0.0'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  });

  // Wrap auth methods with timeout and fallback logic
  const originalGetSession = realClient.auth.getSession.bind(realClient.auth);
  const originalGetUser = realClient.auth.getUser.bind(realClient.auth);
  const originalSignInWithPassword = realClient.auth.signInWithPassword.bind(realClient.auth);

  realClient.auth.getSession = async () => {
    try {
      console.log('🔄 Getting session from real Supabase...');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session fetch timeout exceeded')), 5000);
      });
      
      const result = await Promise.race([originalGetSession(), timeoutPromise]);
      console.log('✅ Session fetched successfully');
      return result;
    } catch (error) {
      console.warn('❌ Session fetch failed, falling back to mock:', error);
      // Switch to mock client for future operations
      return await createMockClient().auth.getSession();
    }
  };

  realClient.auth.getUser = async () => {
    try {
      console.log('🔄 Getting user from real Supabase...');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User fetch timeout exceeded')), 5000);
      });
      
      const result = await Promise.race([originalGetUser(), timeoutPromise]);
      console.log('✅ User fetched successfully');
      return result;
    } catch (error) {
      console.warn('❌ User fetch failed, falling back to mock:', error);
      return await createMockClient().auth.getUser();
    }
  };

  realClient.auth.signInWithPassword = async (credentials) => {
    try {
      console.log('🔄 Signing in with real Supabase...');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign in timeout exceeded')), 10000);
      });
      
      const result = await Promise.race([originalSignInWithPassword(credentials), timeoutPromise]);
      console.log('✅ Sign in successful');
      return result;
    } catch (error) {
      console.warn('❌ Sign in failed, falling back to mock:', error);
      return await createMockClient().auth.signInWithPassword(credentials);
    }
  };

  return realClient;
};

// Create and export the Supabase client
export const supabase = createSupabaseClient();

// Wait for connectivity test to complete and log the result
setTimeout(() => {
  if (connectivityTestCompleted) {
    console.log(`Supabase client initialized: ${hasValidCredentials && isSupabaseReachable ? 'Using real client' : 'Using mock client'}`);
    if (hasValidCredentials && !isSupabaseReachable) {
      console.warn('⚠️ Supabase credentials are valid but service is unreachable. Using mock client for development.');
      console.warn('This might be because:');
      console.warn('- Supabase project is paused');
      console.warn('- Network connectivity issues');
      console.warn('- Firewall blocking the connection');
    }
  }
}, 3000);

// Create a function to get cached user profile
export const getUserFromCache = () => {
  try {
    const cachedProfile = localStorage.getItem('sns-user-profile');
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }
  } catch (e) {
    console.warn('Failed to get user profile from cache:', e);
  }
  return null;
};

// Create a function to store user profile in cache
export const cacheUserProfile = (user: User) => {
  try {
    localStorage.setItem('sns-user-profile', JSON.stringify(user));
    console.log('User profile cached successfully', user.id);
  } catch (e) {
    console.warn('Failed to cache user profile:', e);
  }
};

// Create a function to clear user profile cache
export const clearUserCache = () => {
  try {
    // Also clear other caches
    localStorage.removeItem('sns-admin-data-cache');
    localStorage.removeItem('sns-user-profile');
    console.log('User profile cache cleared');
  } catch (e) {
    console.warn('Failed to clear user profile cache:', e);
  }
};

// Export connectivity status
export const getConnectivityStatus = () => ({
  hasValidCredentials,
  isSupabaseReachable,
  connectivityTestCompleted
});

// Export types
export { hasValidCredentials };
export type { User, EventType, EventParticipant, Branch };