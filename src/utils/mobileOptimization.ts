// Утилиты для оптимизации работы на мобильных устройствах

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
export const isAndroid = /Android/i.test(navigator.userAgent);

// Создаем fallback storage для iOS Safari
export const createFallbackStorage = () => {
  const memoryStorage: { [key: string]: string } = {};
  
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key) || memoryStorage[key] || null;
      } catch {
        return memoryStorage[key] || null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
        memoryStorage[key] = value;
      } catch {
        memoryStorage[key] = value;
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
        delete memoryStorage[key];
      } catch {
        delete memoryStorage[key];
      }
    }
  };
};

// Оптимизированные таймауты для разных устройств
export const getOptimizedTimeouts = () => {
  if (isIOS) {
    return {
      fetchTimeout: 30000,      // 30 секунд для iOS
      authTimeout: 25000,       // 25 секунд для авторизации
      redirectDelay: 1000,      // 1 секунда для редиректа
      sessionDelay: 200,        // 200мс для установки сессии
    };
  } else if (isAndroid) {
    return {
      fetchTimeout: 20000,      // 20 секунд для Android
      authTimeout: 20000,       // 20 секунд для авторизации
      redirectDelay: 800,       // 800мс для редиректа
      sessionDelay: 150,        // 150мс для установки сессии
    };
  } else {
    return {
      fetchTimeout: 15000,      // 15 секунд для десктопа
      authTimeout: 15000,       // 15 секунд для авторизации
      redirectDelay: 600,       // 600мс для редиректа
      sessionDelay: 100,        // 100мс для установки сессии
    };
  }
};

// Заголовки для оптимизации запросов на мобильных устройствах
export const getMobileHeaders = () => {
  const baseHeaders = {
    'Content-Type': 'application/json',
  };

  if (isIOS) {
    return {
      ...baseHeaders,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
    };
  } else if (isAndroid) {
    return {
      ...baseHeaders,
      'Cache-Control': 'no-cache',
    };
  }

  return baseHeaders;
};

// Проверка доступности localStorage
export const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

// Безопасная работа с localStorage
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isLocalStorageAvailable()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): boolean => {
    if (!isLocalStorageAvailable()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem: (key: string): boolean => {
    if (!isLocalStorageAvailable()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  clear: (): boolean => {
    if (!isLocalStorageAvailable()) return false;
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

// Оптимизированная задержка для разных устройств
export const optimizedDelay = (ms: number) => {
  const multiplier = isIOS ? 1.2 : isAndroid ? 1.1 : 1;
  return new Promise(resolve => setTimeout(resolve, ms * multiplier));
};

// Проверка качества соединения
export const getConnectionQuality = (): 'slow' | 'medium' | 'fast' => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
    if (effectiveType === '3g') return 'medium';
    return 'fast';
  }
  
  // Fallback: определяем по user agent
  if (isMobile) return 'medium';
  return 'fast';
};

// Адаптивные настройки на основе качества соединения
export const getAdaptiveSettings = () => {
  const connectionQuality = getConnectionQuality();
  const timeouts = getOptimizedTimeouts();
  
  if (connectionQuality === 'slow') {
    return {
      ...timeouts,
      fetchTimeout: timeouts.fetchTimeout * 1.5,
      authTimeout: timeouts.authTimeout * 1.5,
      redirectDelay: timeouts.redirectDelay * 1.3,
    };
  }
  
  return timeouts;
};
