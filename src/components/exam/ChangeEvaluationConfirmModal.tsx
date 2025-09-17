import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ChangeEvaluationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  participantName: string;
  evaluationType: string;
  totalScore: number;
}

export const ChangeEvaluationConfirmModal: React.FC<ChangeEvaluationConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  participantName,
  evaluationType,
  totalScore
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Заголовок */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Изменить оценку?
              </h2>
              <p className="text-sm text-gray-500">
                Вы уже оценили этого участника
              </p>
            </div>
          </div>
        </div>

        {/* Содержимое */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Текущая оценка:
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {participantName}
                </div>
                <div className="text-sm text-gray-500">
                  {evaluationType}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">
                  {totalScore.toFixed(1)}
                </div>
                <div className="text-xs text-gray-400">
                  средний балл
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Вы уверены, что хотите изменить эту оценку? 
            Предыдущая оценка будет заменена новой.
          </p>
        </div>

        {/* Кнопки */}
        <div className="p-6 pt-0">
          <div className="flex gap-3">
            <button
              onPointerUp={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              Отмена
            </button>
            <button
              onPointerUp={onConfirm}
              className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
              style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              Да, изменить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeEvaluationConfirmModal;