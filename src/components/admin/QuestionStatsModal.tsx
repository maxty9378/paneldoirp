import React from 'react';
import { X, BarChart3 } from 'lucide-react';

interface QuestionStat {
  question_id: string;
  question_text: string;
  test_title: string;
  total_answers: number;
  correct_answers: number;
  correct_percentage: number;
}

interface QuestionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionStats: QuestionStat[];
  loading: boolean;
}

export function QuestionStatsModal({ isOpen, onClose, questionStats, loading }: QuestionStatsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Статистика по вопросам
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <p className="text-sm text-gray-600 mb-6">
            Средняя оценка по каждому открытому вопросу среди всех участников мероприятия
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Загрузка статистики...</span>
            </div>
          ) : questionStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>Нет данных для отображения</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questionStats.map((stat, index) => (
                <div key={stat.question_id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">
                          Вопрос {index + 1}
                        </h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {stat.test_title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {stat.question_text}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {stat.correct_percentage}%
                      </div>
                      <div className="text-sm text-gray-600">
                        {stat.correct_answers} из {stat.total_answers} участников
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Средняя оценка
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        stat.correct_percentage >= 80 
                          ? 'bg-green-500' 
                          : stat.correct_percentage >= 60 
                          ? 'bg-yellow-500' 
                          : stat.correct_percentage >= 40
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${stat.correct_percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0%</span>
                    <span className="font-medium">{stat.correct_percentage}%</span>
                    <span>100%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
