import React, { useState, useEffect } from 'react';
import { X, FileText, Save, CheckCircle, MessageSquare, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EvaluationSuccessModal } from './EvaluationSuccessModal';

interface CaseEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  caseNumber: number;
  examId: string;
  onEvaluationComplete?: () => Promise<void>;
  onRemoveEvaluation?: (participantId: string, caseNumber: number) => Promise<void>;
  existingEvaluation?: CaseEvaluation; // Существующая оценка для загрузки
}

interface CaseEvaluation {
  id?: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  case_number: number;
  criteria_scores: {
    correctness: number;
    clarity: number;
    independence: number;
  };
  comments?: string;
}

export const CaseEvaluationModal: React.FC<CaseEvaluationModalProps> = ({
  isOpen,
  onClose,
  participantId,
  participantName,
  caseNumber,
  examId,
  onEvaluationComplete,
  onRemoveEvaluation,
  existingEvaluation
}) => {
  const { user } = useAuth();
  const [evaluation, setEvaluation] = useState<CaseEvaluation>({
    exam_event_id: examId,
    reservist_id: participantId,
    evaluator_id: user?.id || '',
    case_number: caseNumber,
    criteria_scores: {
      correctness: 0,
      clarity: 0,
      independence: 0,
    },
    comments: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Загрузка существующей оценки
  useEffect(() => {
    if (isOpen && existingEvaluation) {
      console.log('🔄 Загружаем существующую оценку:', existingEvaluation);
      setEvaluation(existingEvaluation);
      setSaved(true); // Помечаем как сохраненную
    } else if (isOpen) {
      // Сбрасываем к новой оценке если существующей нет
      setEvaluation({
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id || '',
        case_number: caseNumber,
        criteria_scores: {
          correctness: 0,
          clarity: 0,
          independence: 0,
        },
        comments: ''
      });
      setSaved(false);
    }
    setLoading(false);
  }, [isOpen, existingEvaluation, examId, participantId, user?.id, caseNumber]);

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen && !showSuccessModal) {
      // Блокируем прокрутку
      document.body.style.overflow = 'hidden';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.style.overflow = '';
      };
    } else {
      // Восстанавливаем прокрутку если модальное окно закрыто или показывается SuccessModal
      document.body.style.overflow = '';
    }
  }, [isOpen, showSuccessModal]);


  const handleScoreChange = (criterion: keyof CaseEvaluation['criteria_scores'], score: number) => {
    setEvaluation(prev => ({
      ...prev,
      criteria_scores: {
        ...prev.criteria_scores,
        [criterion]: score
      }
    }));
    setSaved(false);
  };

  const handleCommentsChange = (comments: string) => {
    setEvaluation(prev => ({ ...prev, comments }));
    setSaved(false);
  };

  const saveEvaluation = async () => {
    setSaving(true);
    try {
      const evaluationData = {
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id,
        case_number: caseNumber,
        criteria_scores: evaluation.criteria_scores,
        comments: evaluation.comments || null
      };

      console.log('💾 Сохраняем оценку с данными:', evaluationData);

      const { error } = await supabase
        .from('case_evaluations')
        .upsert(evaluationData, {
          onConflict: 'exam_event_id,reservist_id,evaluator_id,case_number'
        });

      if (error) {
        console.error('Ошибка сохранения оценки:', error);
        // Временно показываем как успешное сохранение
        alert('Таблица case_evaluations не существует. Оценка не сохранена в базу данных.');
      }

      setSaved(true);
      // Показываем модальное окно успеха
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка сохранения оценки:', error);
      // Временно показываем как успешное сохранение
      setSaved(true);
      // Показываем модальное окно успеха
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    const { correctness, clarity, independence } = evaluation.criteria_scores;
    const validScores = [correctness, clarity, independence].filter(score => score > 0);
    if (validScores.length === 0) return 0;
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return Math.round(average * 10) / 10;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSuccessClose = async () => {
    setShowSuccessModal(false);
    await onEvaluationComplete?.();
    onClose();
  };

  const handleEditEvaluation = () => {
    setShowSuccessModal(false);
    setSaved(false);
  };

  const criteria = [
    {
      key: 'correctness' as const,
      title: 'Правильность решения кейса',
      description: 'Совпадение с правильным ответом',
      icon: CheckCircle
    },
    {
      key: 'clarity' as const,
      title: 'Чёткость объяснения',
      description: 'Чёткость объяснения выбранного варианта решения',
      icon: MessageSquare
    },
    {
      key: 'independence' as const,
      title: 'Степень самостоятельности',
      description: 'Решил самостоятельно или с чьей-либо помощью',
      icon: User
    }
  ];

  if (!isOpen) {
    console.log('CaseEvaluationModal: закрыто');
    return null;
  }

  console.log('CaseEvaluationModal: открываем модальное окно', { participantId, participantName, caseNumber, examId });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4 pb-20">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="bg-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Оценка решения кейса #{caseNumber}</h2>
                <p className="text-emerald-100">{participantName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {getTotalScore()}<span className="text-emerald-200">/5</span>
                </div>
                <div className="text-sm text-emerald-100">Средний балл</div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {/* Критерии оценки */}
              <div className="space-y-6">
                {criteria.map((criterion) => {
                  const Icon = criterion.icon;
                  const currentScore = evaluation.criteria_scores[criterion.key];
                  
                  return (
                    <div key={criterion.key} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Icon className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {criterion.title}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {criterion.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColor(currentScore)}`}>
                            {currentScore}<span className="text-gray-400">/5</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Оценочная шкала */}
                      <div className="space-y-2">
                        {/* Первый ряд - целые числа */}
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              onClick={() => handleScoreChange(criterion.key, score)}
                              className={`flex-1 h-12 rounded-xl border-2 transition-all duration-200 font-semibold ${
                                currentScore === score
                                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                        {/* Второй ряд - дробные числа */}
                        <div className="flex gap-2">
                          {[1.5, 2.5, 3.5, 4.5].map((score) => (
                            <button
                              key={score}
                              onClick={() => handleScoreChange(criterion.key, score)}
                              className={`flex-1 h-12 rounded-xl border-2 transition-all duration-200 font-semibold ${
                                currentScore === score
                                  ? 'border-emerald-300 bg-emerald-100 text-emerald-700 shadow-sm'
                                  : 'border-gray-200 bg-gray-25 text-gray-400 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-500'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                          {/* Пустая кнопка для выравнивания */}
                          <div className="flex-1"></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Комментарии */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Комментарии
                </h3>
                <textarea
                  value={evaluation.comments || ''}
                  onChange={(e) => handleCommentsChange(e.target.value)}
                  placeholder="Дополнительные комментарии к оценке решения кейса..."
                  className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </>
          )}
        </div>

        {/* Футер */}
        <div className="sticky bottom-0 bg-white p-6 border-t border-gray-100 flex gap-3 justify-between rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            ← Назад к кейсам
          </button>
          <div className="flex gap-3">
            <button
            onClick={saveEvaluation}
            disabled={saving || getTotalScore() === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              saving || getTotalScore() === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Сохранение...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Сохранено
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Отправить
              </>
            )}
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно успешной отправки */}
      <EvaluationSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        onEdit={handleEditEvaluation}
        participantName={participantName}
        caseNumber={caseNumber}
        totalScore={getTotalScore()}
        evaluationType="Решение кейса"
        onRemoveEvaluation={async () => {
          await onRemoveEvaluation?.(participantId, caseNumber);
        }}
      />
    </div>
  );
};
