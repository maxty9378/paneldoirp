interface CachedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  last_sign_in_at: string;
  avatar_url?: string;
}

const CACHED_USERS_KEY = 'cached_users';
const MAX_CACHED_USERS = 5; // Максимум 5 сохраненных пользователей

export function saveUserToCache(user: CachedUser): void {
  try {
    const cached = localStorage.getItem(CACHED_USERS_KEY);
    let users: CachedUser[] = cached ? JSON.parse(cached) : [];
    
    // Удаляем пользователя, если он уже есть
    users = users.filter(u => u.id !== user.id);
    
    // Добавляем пользователя в начало списка
    users.unshift({
      ...user,
      last_sign_in_at: new Date().toISOString()
    });
    
    // Ограничиваем количество сохраненных пользователей
    if (users.length > MAX_CACHED_USERS) {
      users = users.slice(0, MAX_CACHED_USERS);
    }
    
    localStorage.setItem(CACHED_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Ошибка сохранения пользователя в кэш:', error);
  }
}

export function getCachedUsers(): CachedUser[] {
  try {
    const cached = localStorage.getItem(CACHED_USERS_KEY);
    if (cached) {
      const users = JSON.parse(cached);
      // Сортируем по дате последнего входа (новые сверху)
      return users.sort((a: CachedUser, b: CachedUser) => 
        new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime()
      );
    }
  } catch (error) {
    console.error('Ошибка загрузки кэшированных пользователей:', error);
  }
  return [];
}

export function removeUserFromCache(userId: string): void {
  try {
    const cached = localStorage.getItem(CACHED_USERS_KEY);
    if (cached) {
      const users = JSON.parse(cached);
      const filteredUsers = users.filter((user: CachedUser) => user.id !== userId);
      localStorage.setItem(CACHED_USERS_KEY, JSON.stringify(filteredUsers));
    }
  } catch (error) {
    console.error('Ошибка удаления пользователя из кэша:', error);
  }
}

export function clearUserCache(): void {
  try {
    localStorage.removeItem(CACHED_USERS_KEY);
  } catch (error) {
    console.error('Ошибка очистки кэша пользователей:', error);
  }
}

export function hasCachedUsers(): boolean {
  const users = getCachedUsers();
  return users.length > 0;
}

// Функции для совместимости с существующим кодом
export function getUserFromCache(userId: string): CachedUser | null {
  const users = getCachedUsers();
  return users.find(user => user.id === userId) || null;
}

export function cacheUserProfile(user: any): void {
  if (user && user.id && user.email && user.full_name) {
    saveUserToCache({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role || 'employee',
      last_sign_in_at: new Date().toISOString(),
      avatar_url: user.avatar_url
    });
  }
}

export function isCachedUserValid(user: CachedUser): boolean {
  if (!user || !user.id || !user.email || !user.full_name) {
    return false;
  }
  
  // Проверяем, что пользователь был активен не более 30 дней назад
  const lastSignIn = new Date(user.last_sign_in_at);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return lastSignIn > thirtyDaysAgo;
}