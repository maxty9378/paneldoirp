import { createClient } from '@supabase/supabase-js';

// Получаем переменные окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Простая проверка, что переменные заданы
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required. Please check your .env file.');
}

// Создаем и экспортируем ЕДИНСТВЕННЫЙ клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,    // мы сами обрабатываем токены в AuthCallback
    storage: window.localStorage, // явно указываем хранилище
    storageKey: 'sns-session-v1', // стабильный ключ для сессий
  },
});

// Экспортируем типы, если они здесь нужны
// (Лучше вынести их в отдельный файл, например, src/types/index.ts)
export * from '../types';