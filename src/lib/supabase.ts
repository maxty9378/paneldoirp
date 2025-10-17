import { createClient } from '@supabase/supabase-js';
import { isIOS, createFallbackStorage } from '../utils/mobileOptimization';

// Получаем переменные окружения с fallback
// Используем BFF URL вместо прямого доступа к Supabase
const supabaseUrl = import.meta.env.VITE_BFF_URL || 'https://51.250.94.103:3001';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

// Простая проверка, что переменные заданы
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required. Please check your .env file.');
}

// Создаем оптимизированный клиент Supabase для мобильных сетей
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Сохраняем сессию в localStorage
    autoRefreshToken: true, // Автоматически обновляем токены
    detectSessionInUrl: false, // было true — отключаем, чтоб не дублировать с AuthCallback
    storage: isIOS ? createFallbackStorage() : window.localStorage,
    storageKey: 'sns-session-v1', // Уникальный ключ для хранения
    flowType: 'pkce',
    debug: false,
    // Бессрочная авторизация - пользователь остается авторизованным
    storageType: 'localStorage', // Используем localStorage для постоянного хранения
  },
  global: {
    // Увеличиваем таймауты для медленных мобильных сетей
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        credentials: 'include', // Отправляем cookies с каждым запросом
        // Увеличиваем таймаут до 60 секунд для мобильных сетей
        signal: AbortSignal.timeout(60000),
      });
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Экспортируем типы, если они здесь нужны
// (Лучше вынести их в отдельный файл, например, src/types/index.ts)
export * from '../types';