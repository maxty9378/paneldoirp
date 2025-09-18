import React from 'react';
import { CheckCircle, Star, RotateCcw } from 'lucide-react';

interface EvaluationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  participantName: string;
  caseNumber?: number | null;
  totalScore: number;
  evaluationType?: string;
  onRemoveEvaluation?: () => Promise<void>;
}

export const EvaluationSuccessModal: React.FC<EvaluationSuccessModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  participantName,
  caseNumber,
  totalScore,
  evaluationType = 'Решение кейса',
  onRemoveEvaluation
}) => {
  if (!isOpen) return null;

  console.log('🎉 EvaluationSuccessModal received totalScore:', totalScore);

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Отлично';
    if (score >= 4) return 'Хорошо';
    if (score >= 3) return 'Удовлетворительно';
    return 'Неудовлетворительно';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10003] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {/* Иконка успеха */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Заголовок */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Оценка успешно отправлена
          </h2>
          <p className="text-gray-600">
            {caseNumber 
              ? `Решение кейса #${caseNumber} от` 
              : `${evaluationType} от`
            } <span className="font-semibold">{participantName}</span>
          </p>
        </div>

        {/* Итоговая оценка */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-medium text-gray-600">Итоговая оценка</span>
            </div>
            <div className={`text-4xl font-bold ${getScoreColor(totalScore)} mb-1`}>
              {totalScore}
            </div>
            <div className="text-sm text-gray-500 mb-2">из 5 баллов</div>
            <div className={`text-lg font-semibold ${getScoreColor(totalScore)}`}>
              {getScoreLabel(totalScore)}
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Изменить оценку
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold"
          >
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
};
