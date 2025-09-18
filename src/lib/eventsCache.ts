// Утилита для кэширования мероприятий
interface CachedEvents {
  data: any[];
  timestamp: number;
  userId: string;
  userRole: string;
}

const CACHE_KEY = 'cached_events';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export function getCachedEvents(userId: string, userRole: string): any[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedEvents = JSON.parse(cached);
    
    // Проверяем, что кэш актуален и для того же пользователя
    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
    const isSameUser = parsed.userId === userId && parsed.userRole === userRole;
    
    if (isExpired || !isSameUser) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    console.log('📦 Загружены мероприятия из кэша:', parsed.data.length);
    return parsed.data;
  } catch (error) {
    console.error('Ошибка загрузки кэша мероприятий:', error);
    return null;
  }
}

export function setCachedEvents(events: any[], userId: string, userRole: string): void {
  try {
    const cached: CachedEvents = {
      data: events,
      timestamp: Date.now(),
      userId,
      userRole
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    console.log('💾 Сохранены мероприятия в кэш:', events.length);
  } catch (error) {
    console.error('Ошибка сохранения кэша мероприятий:', error);
  }
}

export function clearEventsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🧹 Очищен кэш мероприятий');
  } catch (error) {
    console.error('Ошибка очистки кэша мероприятий:', error);
  }
}
