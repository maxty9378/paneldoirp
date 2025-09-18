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
    flowType: 'pkce',            // используем PKCE для лучшей безопасности
    debug: false,                 // отключаем отладку в продакшене
    // Увеличиваем время жизни токенов
    jwtExpiry: 86400,            // 24 часа (в секундах)
    refreshTokenReuseInterval: 10, // 10 секунд для повторного использования refresh token
    // Дополнительные настройки для мобильных устройств
    storageOptions: {
      // Настройки для localStorage
      persist: true,
      // Увеличиваем время жизни refresh token
      refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 дней
    },
  },
});

// Экспортируем типы, если они здесь нужны
// (Лучше вынести их в отдельный файл, например, src/types/index.ts)
export * from '../types';