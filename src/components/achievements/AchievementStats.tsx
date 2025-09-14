import React from 'react';
import { AchievementStats as AchievementStatsType, ACHIEVEMENT_CATEGORIES } from '../../types/achievements';
import { Trophy, Target, TrendingUp, Users } from 'lucide-react';

interface AchievementStatsProps {
  stats: AchievementStatsType;
}

export function AchievementStatsDisplay({ stats }: AchievementStatsProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Достижения</h2>
          <p className="text-gray-600">Ваш прогресс в обучении</p>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {stats.unlockedAchievements}/{stats.totalAchievements}
          </div>
          <div className="text-sm text-gray-600">Разблокировано</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {Math.round(stats.completionRate)}%
          </div>
          <div className="text-sm text-gray-600">Завершено</div>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Общий прогресс</span>
          <span>{Math.round(stats.completionRate)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
      </div>

      {/* Статистика по категориям */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">По категориям</h3>
        {Object.entries(stats.categories).map(([category, data]) => {
          const categoryInfo = ACHIEVEMENT_CATEGORIES[category as keyof typeof ACHIEVEMENT_CATEGORIES];
          const percentage = data.total > 0 ? (data.unlocked / data.total) * 100 : 0;
          
          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryInfo.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{categoryInfo.name}</div>
                  <div className="text-sm text-gray-600">{data.unlocked}/{data.total}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{Math.round(percentage)}%</div>
                <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${categoryInfo.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Недавние разблокировки */}
      {stats.recentUnlocks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Недавние достижения</h3>
          <div className="flex gap-2">
            {stats.recentUnlocks.map((achievement) => (
              <div
                key={achievement.id}
                className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-md"
                title={achievement.title}
              >
                {achievement.icon}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
