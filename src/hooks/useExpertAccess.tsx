import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface ExpertAccessCache {
  [key: string]: {
    hasAccess: boolean;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
const accessCache: ExpertAccessCache = {};

export const useExpertAccess = (examId: string | undefined) => {
  const { userProfile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!examId || !userProfile?.email) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // Проверяем кэш
    const cacheKey = `${examId}_${userProfile.email}`;
    const cached = accessCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setHasAccess(cached.hasAccess);
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        // Отменяем предыдущий запрос
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();

        // Для администраторов доступ всегда разрешен
        if (userProfile?.role === 'administrator') {
          const result = true;
          accessCache[cacheKey] = { hasAccess: result, timestamp: Date.now() };
          setHasAccess(result);
          setLoading(false);
          return;
        }

        // Для экспертов проверяем доступ к конкретному мероприятию
        if (userProfile?.role === 'expert') {
          const { data, error: accessError } = await supabase
            .from('events')
            .select('expert_emails, event_types(name)')
            .eq('id', examId)
            .single()
            .abortSignal(abortControllerRef.current.signal);

          if (accessError) {
            throw new Error('Ошибка при проверке доступа к мероприятию');
          }

          if (!data) {
            throw new Error('Мероприятие не найдено');
          }

          // Проверяем тип мероприятия и доступ эксперта
          const isExamTalentReserve = data.event_types?.name === 'exam_talent_reserve';
          const expertHasAccess = data.expert_emails?.includes(userProfile.email) || false;
          const result = isExamTalentReserve && expertHasAccess;

          // Кэшируем результат
          accessCache[cacheKey] = { hasAccess: result, timestamp: Date.now() };
          setHasAccess(result);
        } else {
          setHasAccess(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Ошибка проверки доступа:', err);
          setError(err.message || 'Ошибка при проверке доступа');
          setHasAccess(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAccess();

    // Очистка при размонтировании
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [examId, userProfile?.email, userProfile?.role]);

  // Функция для принудительного обновления кэша
  const refreshAccess = () => {
    if (!examId || !userProfile?.email) return;
    
    const cacheKey = `${examId}_${userProfile.email}`;
    delete accessCache[cacheKey];
    
    // Повторный запуск проверки
    setLoading(true);
    setHasAccess(null);
  };

  // Функция для очистки всего кэша
  const clearCache = () => {
    Object.keys(accessCache).forEach(key => {
      delete accessCache[key];
    });
  };

  return {
    hasAccess,
    loading,
    error,
    refreshAccess,
    clearCache
  };
};
