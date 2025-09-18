// Простой тест авторизации для диагностики
import { supabase } from '../lib/supabase';

export const testAuth = async () => {
  console.log('🔍 Testing Supabase connection...');
  
  // Проверяем переменные окружения
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', anonKey ? '✅ Set' : '❌ Missing');
  
  if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing environment variables!');
    return;
  }
  
  // Тестируем простой запрос
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Session check:', { data: !!data, error: error?.message });
  } catch (e) {
    console.error('Session check failed:', e);
  }
  
  // Тестируем авторизацию с тестовыми данными
  try {
    console.log('🔑 Testing auth with doirp@sns.ru...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'doirp@sns.ru',
      password: 'test123'
    });
    
    console.log('Auth result:', { 
      user: !!data.user, 
      session: !!data.session, 
      error: error?.message 
    });
    
    if (error) {
      console.error('Auth error details:', error);
    }
  } catch (e) {
    console.error('Auth test failed:', e);
  }
};




