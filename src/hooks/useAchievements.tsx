import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Achievement, UserAchievement, AchievementStats } from '../types/achievements';

// Предопределенные достижения
const PREDEFINED_ACHIEVEMENTS: Achievement[] = [
  // Первые шаги
  {
    id: 'welcome',
    title: 'Добро пожаловать!',
    description: 'Первый вход в систему',
    category: 'starter',
    rarity: 'common',
    icon: '👋',
    color: 'text-blue-600',
    gradient: 'from-blue-400 to-blue-600',
    isUnlocked: false,
  },
  {
    id: 'first_event',
    title: 'Первое мероприятие',
    description: 'Участие в первом мероприятии',
    category: 'starter',
    rarity: 'common',
    icon: '📅',
    color: 'text-green-600',
    gradient: 'from-green-400 to-green-600',
    isUnlocked: false,
  },
  {
    id: 'first_test',
    title: 'Первый тест',
    description: 'Прохождение первого теста',
    category: 'starter',
    rarity: 'common',
    icon: '✅',
    color: 'text-purple-600',
    gradient: 'from-purple-400 to-purple-600',
    isUnlocked: false,
  },
  {
    id: 'first_victory',
    title: 'Первая победа',
    description: 'Успешное прохождение первого теста',
    category: 'starter',
    rarity: 'rare',
    icon: '🎯',
    color: 'text-yellow-600',
    gradient: 'from-yellow-400 to-yellow-600',
    isUnlocked: false,
  },
  
  // Обучение
  {
    id: 'bookworm',
    title: 'Книжный червь',
    description: 'Прохождение 5 тестов',
    category: 'learning',
    rarity: 'common',
    icon: '📖',
    color: 'text-indigo-600',
    gradient: 'from-indigo-400 to-indigo-600',
    isUnlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'sharpshooter',
    title: 'Стрелок',
    description: '100% результат в тесте',
    category: 'learning',
    rarity: 'rare',
    icon: '🎯',
    color: 'text-red-600',
    gradient: 'from-red-400 to-red-600',
    isUnlocked: false,
  },
  {
    id: 'sprinter',
    title: 'Спринтер',
    description: 'Прохождение теста за рекордное время',
    category: 'learning',
    rarity: 'epic',
    icon: '🏃‍♂️',
    color: 'text-orange-600',
    gradient: 'from-orange-400 to-orange-600',
    isUnlocked: false,
  },
  {
    id: 'erudite',
    title: 'Эрудит',
    description: 'Прохождение 10 тестов подряд без ошибок',
    category: 'learning',
    rarity: 'legendary',
    icon: '🧠',
    color: 'text-purple-600',
    gradient: 'from-purple-400 to-purple-600',
    isUnlocked: false,
    progress: 0,
    maxProgress: 10,
  },
  
  // Активность
  {
    id: 'fire',
    title: 'Огонь',
    description: 'Вход в систему 7 дней подряд',
    category: 'activity',
    rarity: 'rare',
    icon: '🔥',
    color: 'text-red-600',
    gradient: 'from-red-400 to-red-600',
    isUnlocked: false,
    progress: 0,
    maxProgress: 7,
  },
  {
    id: 'lightning',
    title: 'Молния',
    description: 'Прохождение теста в день мероприятия',
    category: 'activity',
    rarity: 'epic',
    icon: '⚡',
    color: 'text-yellow-600',
    gradient: 'from-yellow-400 to-yellow-600',
    isUnlocked: false,
  },
  {
    id: 'accuracy',
    title: 'Точность',
    description: '90%+ результат в 5 тестах подряд',
    category: 'activity',
    rarity: 'epic',
    icon: '🎯',
    color: 'text-green-600',
    gradient: 'from-green-400 to-green-600',
    isUnlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  
  // Экспертиза
  {
    id: 'champion',
    title: 'Чемпион',
    description: 'Лучший результат в группе',
    category: 'expertise',
    rarity: 'legendary',
    icon: '🏆',
    color: 'text-yellow-600',
    gradient: 'from-yellow-400 to-yellow-600',
    isUnlocked: false,
  },
  {
    id: 'veteran',
    title: 'Ветеран',
    description: 'Стаж работы 1+ год',
    category: 'expertise',
    rarity: 'epic',
    icon: '🎖️',
    color: 'text-gray-600',
    gradient: 'from-gray-400 to-gray-600',
    isUnlocked: false,
  },
];

export function useAchievements(userId?: string) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка достижений пользователя
  const fetchUserAchievements = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Загружаем данные пользователя для проверки достижений
      const { data: userData } = await supabase
        .from('users')
        .select('work_experience_days, created_at, last_sign_in_at')
        .eq('id', userId)
        .single();

      // Загружаем попытки прохождения тестов
      const { data: testAttempts } = await supabase
        .from('user_test_attempts')
        .select('score, max_score, status, completed_at, start_time')
        .eq('user_id', userId);

      // Загружаем участие в мероприятиях
      const { data: eventParticipants } = await supabase
        .from('event_participants')
        .select('event_id, attended, created_at')
        .eq('user_id', userId);

      // Загружаем мероприятия
      const { data: events } = await supabase
        .from('events')
        .select('id, event_type_id, start_date')
        .in('id', eventParticipants?.map(ep => ep.event_id) || []);

      // Проверяем достижения
      const updatedAchievements = PREDEFINED_ACHIEVEMENTS.map(achievement => {
        let isUnlocked = false;
        let progress = 0;
        let maxProgress = achievement.maxProgress || 1;

        switch (achievement.id) {
          case 'welcome':
            isUnlocked = !!userData?.created_at;
            break;

          case 'first_event':
            isUnlocked = (eventParticipants?.length || 0) > 0;
            break;

          case 'first_test':
            isUnlocked = (testAttempts?.length || 0) > 0;
            break;

          case 'first_victory':
            isUnlocked = (testAttempts?.some(ta => ta.status === 'completed' && ta.score && ta.max_score && ta.score >= ta.max_score) || false);
            break;

          case 'bookworm':
            const completedTests = testAttempts?.filter(ta => ta.status === 'completed').length || 0;
            progress = completedTests;
            isUnlocked = completedTests >= 5;
            break;

          case 'sharpshooter':
            isUnlocked = testAttempts?.some(ta => ta.status === 'completed' && ta.score && ta.max_score && ta.score === ta.max_score) || false;
            break;

          case 'erudite':
            // Упрощенная логика - 10 тестов подряд с хорошим результатом
            const goodTests = testAttempts?.filter(ta => ta.status === 'completed' && ta.score && ta.max_score && (ta.score / ta.max_score) >= 0.8).length || 0;
            progress = goodTests;
            isUnlocked = goodTests >= 10;
            break;

          case 'veteran':
            isUnlocked = (userData?.work_experience_days || 0) >= 365;
            break;

          case 'accuracy':
            const accurateTests = testAttempts?.filter(ta => ta.status === 'completed' && ta.score && ta.max_score && (ta.score / ta.max_score) >= 0.9).length || 0;
            progress = accurateTests;
            isUnlocked = accurateTests >= 5;
            break;

          default:
            break;
        }

        return {
          ...achievement,
          isUnlocked,
          progress: isUnlocked ? maxProgress : progress,
        };
      });

      setAchievements(updatedAchievements);

      // Вычисляем статистику
      const unlockedCount = updatedAchievements.filter(a => a.isUnlocked).length;
      const totalCount = updatedAchievements.length;
      const recentUnlocks = updatedAchievements
        .filter(a => a.isUnlocked)
        .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
        .slice(0, 3);

      const categories = {
        starter: {
          unlocked: updatedAchievements.filter(a => a.category === 'starter' && a.isUnlocked).length,
          total: updatedAchievements.filter(a => a.category === 'starter').length,
        },
        learning: {
          unlocked: updatedAchievements.filter(a => a.category === 'learning' && a.isUnlocked).length,
          total: updatedAchievements.filter(a => a.category === 'learning').length,
        },
        activity: {
          unlocked: updatedAchievements.filter(a => a.category === 'activity' && a.isUnlocked).length,
          total: updatedAchievements.filter(a => a.category === 'activity').length,
        },
        expertise: {
          unlocked: updatedAchievements.filter(a => a.category === 'expertise' && a.isUnlocked).length,
          total: updatedAchievements.filter(a => a.category === 'expertise').length,
        },
        social: {
          unlocked: updatedAchievements.filter(a => a.category === 'social' && a.isUnlocked).length,
          total: updatedAchievements.filter(a => a.category === 'social').length,
        },
      };

      setStats({
        totalAchievements: totalCount,
        unlockedAchievements: unlockedCount,
        completionRate: totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0,
        recentUnlocks,
        categories,
      });

    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError('Ошибка загрузки достижений');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserAchievements();
    }
  }, [userId, fetchUserAchievements]);

  return {
    achievements,
    userAchievements,
    stats,
    loading,
    error,
    refetch: fetchUserAchievements,
  };
}


