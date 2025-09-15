import React from 'react';
import { Achievement, ACHIEVEMENT_RARITY } from '../../types/achievements';
import { CheckCircle, Lock } from 'lucide-react';

interface AchievementCardProps {
  achievement: Achievement;
  onClick?: () => void;
}

export function AchievementCard({ achievement, onClick }: AchievementCardProps) {
  const rarity = ACHIEVEMENT_RARITY[achievement.rarity];
  const progress = achievement.progress || 0;
  const maxProgress = achievement.maxProgress || 1;
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-105 cursor-pointer ${
        achievement.isUnlocked
          ? `${rarity.bgColor} ${rarity.borderColor} shadow-lg hover:shadow-xl`
          : 'bg-gray-100 border-gray-200 opacity-60'
      }`}
      onClick={onClick}
    >
      {/* Градиентный фон для разблокированных */}
      {achievement.isUnlocked && (
        <div className={`absolute inset-0 bg-gradient-to-br ${achievement.gradient} opacity-10`} />
      )}

      {/* Иконка статуса */}
      <div className="absolute top-3 right-3 z-10">
        {achievement.isUnlocked ? (
          <CheckCircle className="h-6 w-6 text-green-500" />
        ) : (
          <Lock className="h-6 w-6 text-gray-400" />
        )}
      </div>

      <div className="p-6">
        {/* Иконка достижения */}
        <div className="text-6xl mb-4 text-center">
          {achievement.isUnlocked ? achievement.icon : '🔒'}
        </div>

        {/* Название и редкость */}
        <div className="text-center mb-3">
          <h3 className={`text-lg font-bold ${achievement.isUnlocked ? achievement.color : 'text-gray-500'}`}>
            {achievement.title}
          </h3>
          <span className={`text-xs font-medium ${rarity.color}`}>
            {rarity.name}
          </span>
        </div>

        {/* Описание */}
        <p className={`text-sm text-center mb-4 ${achievement.isUnlocked ? 'text-gray-700' : 'text-gray-500'}`}>
          {achievement.description}
        </p>

        {/* Прогресс-бар для незавершенных */}
        {!achievement.isUnlocked && maxProgress > 1 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Прогресс</span>
              <span>{progress}/{maxProgress}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Дата разблокировки */}
        {achievement.isUnlocked && achievement.unlockedAt && (
          <div className="text-xs text-center text-gray-500 mt-2">
            Разблокировано {achievement.unlockedAt.toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
    </div>
  );
}

