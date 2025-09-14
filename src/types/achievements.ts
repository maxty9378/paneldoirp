export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'starter' | 'learning' | 'activity' | 'expertise' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  color: string;
  gradient: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
  isUnlocked: boolean;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number;
  maxProgress: number;
}

export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionRate: number;
  recentUnlocks: Achievement[];
  categories: {
    starter: { unlocked: number; total: number };
    learning: { unlocked: number; total: number };
    activity: { unlocked: number; total: number };
    expertise: { unlocked: number; total: number };
    social: { unlocked: number; total: number };
  };
}

export const ACHIEVEMENT_CATEGORIES = {
  starter: { name: 'Первые шаги', color: 'bg-blue-500', icon: '🎯' },
  learning: { name: 'Обучение', color: 'bg-green-500', icon: '📚' },
  activity: { name: 'Активность', color: 'bg-orange-500', icon: '⚡' },
  expertise: { name: 'Экспертиза', color: 'bg-purple-500', icon: '🏆' },
  social: { name: 'Социальная', color: 'bg-pink-500', icon: '🤝' },
} as const;

export const ACHIEVEMENT_RARITY = {
  common: { name: 'Обычное', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' },
  rare: { name: 'Редкое', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' },
  epic: { name: 'Эпическое', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-300' },
  legendary: { name: 'Легендарное', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300' },
} as const;
