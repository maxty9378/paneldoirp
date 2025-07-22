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
  export const cacheUserProfile = (user: any) => { // Consider using a more specific User type
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
  