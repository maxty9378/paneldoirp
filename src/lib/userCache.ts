// Create a function to get cached user profile with validation
export const getUserFromCache = () => {
  try {
    const cachedProfile = localStorage.getItem('sns-user-profile');
    if (cachedProfile) {
      const user = JSON.parse(cachedProfile);
      // Проверяем, что кэш не устарел (максимум 24 часа)
      const cacheTime = localStorage.getItem('sns-user-profile-time');
      if (cacheTime) {
        const timeDiff = Date.now() - parseInt(cacheTime);
        const maxAge = 24 * 60 * 60 * 1000; // 24 часа
        if (timeDiff > maxAge) {
          console.log('User profile cache expired, clearing');
          clearUserCache();
          return null;
        }
      }
      console.log('User profile loaded from cache:', user.id);
      return user;
    }
  } catch (e) {
    console.warn('Failed to get user profile from cache:', e);
    clearUserCache(); // Очищаем поврежденный кэш
  }
  return null;
};

// Create a function to store user profile in cache with timestamp
export const cacheUserProfile = (user: any) => {
  try {
    const userData = {
      ...user,
      _cachedAt: Date.now()
    };
    localStorage.setItem('sns-user-profile', JSON.stringify(userData));
    localStorage.setItem('sns-user-profile-time', Date.now().toString());
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
    localStorage.removeItem('sns-user-profile-time');
    console.log('User profile cache cleared');
  } catch (e) {
    console.warn('Failed to clear user profile cache:', e);
  }
};

// Create a function to check if cached user is still valid
export const isCachedUserValid = (user: any) => {
  if (!user || !user.id) return false;
  
  // Проверяем, что у пользователя есть основные поля
  const requiredFields = ['id', 'full_name', 'role', 'subdivision', 'status'];
  return requiredFields.every(field => user[field] !== undefined && user[field] !== null);
};
  