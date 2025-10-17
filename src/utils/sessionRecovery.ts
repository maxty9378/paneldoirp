/**
 * Механизм восстановления сессии при перезагрузке страницы
 * Обеспечивает бессрочную авторизацию как в Google
 */

import { supabase } from '../lib/supabase';

// Проверяем, есть ли сохраненная сессия в localStorage
export async function checkStoredSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error checking stored session:', error);
      return false;
    }
    
    if (session?.user) {
      console.log('✅ Stored session found:', session.user.email);
      return true;
    }
    
    console.log('ℹ️ No stored session found');
    return false;
  } catch (error) {
    console.error('❌ Exception checking stored session:', error);
    return false;
  }
}

// Восстанавливаем сессию из localStorage
export async function restoreSession(): Promise<boolean> {
  try {
    console.log('🔄 Attempting to restore session from localStorage...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error restoring session:', error);
      return false;
    }
    
    if (session?.user) {
      console.log('✅ Session restored successfully:', session.user.email);
      
      // Проверяем, не истек ли токен
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        console.log(`⏰ Session expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
        
        // Если токен истекает в течение 10 минут, обновляем его
        if (timeUntilExpiry < 10 * 60) {
          console.log('🔄 Token expiring soon, refreshing...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('❌ Error refreshing session:', refreshError);
            return false;
          }
          
          if (refreshData.session) {
            console.log('✅ Session refreshed successfully');
            return true;
          }
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Exception restoring session:', error);
    return false;
  }
}

// Проверяем и восстанавливаем сессию при загрузке страницы
export async function initializeSessionRecovery(): Promise<void> {
  console.log('🔐 Initializing session recovery...');
  
  // Проверяем, есть ли сохраненная сессия
  const hasStoredSession = await checkStoredSession();
  
  if (hasStoredSession) {
    // Восстанавливаем сессию
    await restoreSession();
  } else {
    console.log('ℹ️ No stored session to restore');
  }
}

// Сохраняем информацию о последнем входе
export function saveLastLoginInfo(email: string): void {
  try {
    const loginInfo = {
      email,
      timestamp: Date.now(),
    };
    
    localStorage.setItem('sns-last-login', JSON.stringify(loginInfo));
    console.log('💾 Last login info saved:', email);
  } catch (error) {
    console.error('❌ Error saving last login info:', error);
  }
}

// Получаем информацию о последнем входе
export function getLastLoginInfo(): { email: string; timestamp: number } | null {
  try {
    const loginInfoStr = localStorage.getItem('sns-last-login');
    if (!loginInfoStr) return null;
    
    return JSON.parse(loginInfoStr);
  } catch (error) {
    console.error('❌ Error getting last login info:', error);
    return null;
  }
}

// Сохраняем информацию о выходе для отображения
export function saveLogoutInfo(email: string): void {
  try {
    const logoutInfo = {
      email,
      timestamp: Date.now(),
    };
    
    localStorage.setItem('sns-last-logout', JSON.stringify(logoutInfo));
    console.log('💾 Logout info saved:', email);
  } catch (error) {
    console.error('❌ Error saving logout info:', error);
  }
}

// Получаем информацию о последнем выходе
export function getLastLogoutInfo(): { email: string; timestamp: number } | null {
  try {
    const logoutInfoStr = localStorage.getItem('sns-last-logout');
    if (!logoutInfoStr) return null;
    
    return JSON.parse(logoutInfoStr);
  } catch (error) {
    console.error('❌ Error getting last logout info:', error);
    return null;
  }
}

// Проверяем, нужно ли показать окно с информацией о последнем входе
export function shouldShowLastLoginInfo(): boolean {
  const logoutInfo = getLastLogoutInfo();
  if (!logoutInfo) return false;
  
  // Показываем только если выход был недавно (в течение 5 минут)
  const now = Date.now();
  const diffMs = now - logoutInfo.timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  
  return diffMins < 5;
}

