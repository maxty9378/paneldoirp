import React from 'react';
import { CheckCircle, Star } from 'lucide-react';

interface EvaluationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  caseNumber?: number | null;
  totalScore: number;
  evaluationType?: string;
  detailedScores?: Record<string, number>; // Детальные оценки по критериям
  onRemoveEvaluation?: () => Promise<void>;
}

export const EvaluationSuccessModal: React.FC<EvaluationSuccessModalProps> = ({
  isOpen,
  onClose,
  participantName,
  caseNumber,
  totalScore,
  evaluationType = 'Решение кейса',
  detailedScores = {},
  onRemoveEvaluation
}) => {
  if (!isOpen) return null;

  console.log('🎉 EvaluationSuccessModal received totalScore:', totalScore);

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };


  // Функция для получения названий критериев
  const getCriteriaNames = () => {
    if (evaluationType === 'Решение кейса') {
      return {
        correctness: 'Правильность решения кейса',
        clarity: 'Чёткость объяснения выбранного варианта решения',
        independence: 'Степень самостоятельности в решении кейса'
      };
    } else if (evaluationType === 'Защита проекта') {
      return {
        goal_achievement: 'Достижение цели',
        topic_development: 'Раскрытие темы',
        presentation_quality: 'Качество презентации'
      };
    } else if (evaluationType === 'Диагностическая игра') {
      return {
        results_orientation: 'Компетенция «Ориентация на результат»',
        effective_communication: 'Компетенция «Эффективная коммуникация»',
        teamwork_skills: 'Компетенция «Умение работать в команде»',
        systemic_thinking: 'Компетенция «Системное мышление»'
      };
    }
    return {};
  };

  const criteriaNames = getCriteriaNames();
  const hasDetailedScores = Object.keys(detailedScores).length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10003] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6">
        {/* Иконка успеха */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
          </div>
        </div>

        {/* Заголовок */}
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Оценка успешно отправлена
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {caseNumber 
              ? `Решение кейса #${caseNumber} от` 
              : `${evaluationType} от`
            } <span className="font-semibold">{participantName}</span>
          </p>
        </div>

        {/* Детальные оценки */}
        {hasDetailedScores && (
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Оценки по критериям</h3>
            <div className="space-y-2">
              {Object.entries(detailedScores).map(([key, score]) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-sm text-gray-700 flex-1">
                    {criteriaNames[key as keyof typeof criteriaNames] || key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold ${getScoreColor(score)}`}>
                      {score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">/ 5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Итоговая оценка - менее акцентная */}
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Итоговая оценка</span>
            </div>
            <div className={`text-xl sm:text-2xl font-semibold ${getScoreColor(totalScore)}`}>
              {totalScore % 1 === 0 ? totalScore.toFixed(0) : totalScore.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Кнопка */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-base touch-manipulation"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
};
