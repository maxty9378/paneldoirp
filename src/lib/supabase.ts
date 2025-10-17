import { createClient } from '@supabase/supabase-js';
import { isIOS, createFallbackStorage } from '../utils/mobileOptimization';

// Получаем переменные окружения с fallback
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oaockmesooydvausfoca.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

// Простая проверка, что переменные заданы
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required. Please check your .env file.');
}

// Создаем простой и надежный клиент Supabase с бессрочной авторизацией
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
    // Дополнительные настройки для мобильных операторов
    lock: {
      acquireTimeout: 5000, // Таймаут для получения блокировки
      retryInterval: 100, // Интервал между попытками
      retryCount: 5, // Количество попыток
    },
  },
  global: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Mobile; SNS App)',
    },
    fetch: (url, options = {}) => {
      // Добавляем таймауты для медленных соединений
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
        },
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});

// Экспортируем типы, если они здесь нужны
// (Лучше вынести их в отдельный файл, например, src/types/index.ts)
export * from '../types';