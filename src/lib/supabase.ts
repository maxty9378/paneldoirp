import { createClient } from '@supabase/supabase-js';
import { isIOS, createFallbackStorage } from '../utils/mobileOptimization';

// Получаем переменные окружения с fallback
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oaockmesooydvausfoca.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4NzMsImV4cCI6MjA1MjU1MDg3M30.GhDbwgQ1cqFc4oUuPo-GaQpDY2zFACbLVniNY_OSCpTJKML3KR5D2hfWaquL2AOhG0BmCR1EYiW5d_Y4ZB2F2Q';

// Простая проверка, что переменные заданы
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required. Please check your .env file.');
}

// Создаем простой и надежный клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: isIOS ? createFallbackStorage() : window.localStorage,
    storageKey: 'sns-session-v1',
    flowType: 'pkce',
    debug: false,
  },
});

// Экспортируем типы, если они здесь нужны
// (Лучше вынести их в отдельный файл, например, src/types/index.ts)
export * from '../types';