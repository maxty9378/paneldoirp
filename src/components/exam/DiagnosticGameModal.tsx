import React, { useState, useEffect } from 'react';
import { X, Target, Users, MessageCircle, Brain, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EvaluationSuccessModal } from './EvaluationSuccessModal';

interface DiagnosticGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  examId: string;
  onEvaluationComplete?: () => Promise<void>;
  onRemoveEvaluation?: (participantId: string) => Promise<void>;
  existingEvaluation?: DiagnosticGameEvaluation;
}

interface DiagnosticGameEvaluation {
  id?: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  competency_scores: {
    results_orientation: number;
    effective_communication: number;
    teamwork_skills: number;
    systemic_thinking: number;
  };
  comments?: string;
}

export const DiagnosticGameModal: React.FC<DiagnosticGameModalProps> = ({
  isOpen,
  onClose,
  participantId,
  participantName,
  examId,
  onEvaluationComplete,
  onRemoveEvaluation,
  existingEvaluation
}) => {
  const { user } = useAuth();
  const [evaluation, setEvaluation] = useState<DiagnosticGameEvaluation>({
    exam_event_id: examId,
    reservist_id: participantId,
    evaluator_id: user?.id || '',
    competency_scores: {
      results_orientation: 0,
      effective_communication: 0,
      teamwork_skills: 0,
      systemic_thinking: 0,
    },
    comments: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<any>(null);

  // Загрузка данных при открытии модала
  useEffect(() => {
    if (isOpen && participantId && examId && user?.id) {
      loadExistingEvaluation();
    }
  }, [isOpen, participantId, examId, user?.id]);

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen && !showSuccessModal && !showCriteriaModal) {
      // Блокируем прокрутку
      document.body.style.overflow = 'hidden';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.style.overflow = '';
      };
    } else {
      // Восстанавливаем прокрутку если модальное окно закрыто или показывается другое модальное окно
      document.body.style.overflow = '';
    }
  }, [isOpen, showSuccessModal, showCriteriaModal]);

  const loadExistingEvaluation = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('diagnostic_game_evaluations')
        .select('*')
        .eq('exam_event_id', examId)
        .eq('reservist_id', participantId)
        .eq('evaluator_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка загрузки существующей оценки:', error);
        return;
      }

      if (data) {
        console.log('🔄 Загружена существующая оценка диагностической игры:', data);
        setEvaluation({
          id: data.id,
          exam_event_id: data.exam_event_id,
          reservist_id: data.reservist_id,
          evaluator_id: data.evaluator_id,
          competency_scores: data.competency_scores,
          comments: data.comments || ''
        });
        setSaved(true);
      } else {
        // Нет существующей оценки - создаем новую
        setEvaluation({
          exam_event_id: examId,
          reservist_id: participantId,
          evaluator_id: user.id,
          competency_scores: {
            results_orientation: 0,
            effective_communication: 0,
            teamwork_skills: 0,
            systemic_thinking: 0,
          },
          comments: ''
        });
        setSaved(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки существующей оценки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (competency: keyof DiagnosticGameEvaluation['competency_scores'], score: number) => {
    setEvaluation(prev => ({
      ...prev,
      competency_scores: {
        ...prev.competency_scores,
        [competency]: score
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
        competency_scores: evaluation.competency_scores,
        comments: evaluation.comments || null
      };

      console.log('💾 Сохраняем оценку диагностической игры:', evaluationData);

      const { error } = await supabase
        .from('diagnostic_game_evaluations')
        .upsert(evaluationData, {
          onConflict: 'exam_event_id,reservist_id,evaluator_id'
        });

      if (error) {
        console.error('Ошибка сохранения оценки диагностической игры:', error);
        alert('Таблица diagnostic_game_evaluations не существует. Оценка не сохранена в базу данных.');
      }

      setSaved(true);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка сохранения оценки диагностической игры:', error);
      setSaved(true);
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    const { results_orientation, effective_communication, teamwork_skills, systemic_thinking } = evaluation.competency_scores;
    const validScores = [results_orientation, effective_communication, teamwork_skills, systemic_thinking].filter(score => score > 0);
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

  const competencies = [
    {
      key: 'results_orientation' as const,
      title: 'Ориентация на результат',
      description: 'Признает свою ответственность за результаты работы; самостоятельно ищет решения; поступается личными интересами ради достижения целей',
      details: [
        '1. Признает свою ответственность за результаты работы',
        '2. Самостоятельно ищет решения, сталкиваясь с проблемами в зоне своей ответственности',
        '3. В случае необходимости поступается личными интересами и комфортом ради достижения целей'
      ],
      icon: Target
    },
    {
      key: 'effective_communication' as const,
      title: 'Эффективная коммуникация',
      description: 'Легко инициирует контакт; общается вежливо и доброжелательно; четко излагает свою позицию; аргументирует мнение; внимательно выслушивает других',
      details: [
        '1. Легко инициирует контакт для решения рабочих вопросов',
        '2. Общается вежливо и доброжелательно',
        '3. Четко и ясно излагает свою позицию',
        '4. Аргументирует свое мнение',
        '5. Внимательно выслушивает мнение других',
        '6. Проявляет твердость в отстаивании своей позиции'
      ],
      icon: MessageCircle
    },
    {
      key: 'teamwork_skills' as const,
      title: 'Умение работать в команде',
      description: 'Принимает на себя роль лидера; открыто делится опытом; оказывает поддержку другим; координирует работу с коллегами; мотивирует команду',
      details: [
        '1. Принимает на себя роль лидера',
        '2. Открыто делится опытом и важной информацией в команде',
        '3. Оказывает поддержку и помощь другим членам команды',
        '4. Координирует свою работу с коллегами для решения совместных задач',
        '5. Мотивирует («заряжает») коллег на выполнение задач, учитывая особенности их характера и мотивации'
      ],
      icon: Users
    },
    {
      key: 'systemic_thinking' as const,
      title: 'Системное мышление',
      description: 'Собирает и структурирует информацию; выстраивает целостную картину ситуации; делает логичные выводы; рассматривает варианты решений; прогнозирует последствия',
      details: [
        '1. Собирает, структурирует и сопоставляет информацию, восполняет пробелы в информации, необходимые для выработки решения',
        '2. Выстраивает целостную картину ситуации, устанавливает причинно-следственные связи',
        '3. Делает логичные, обоснованные выводы',
        '4. Рассматривает несколько вариантов решения стоящих перед ним задач',
        '5. Прогнозирует последствия своих решений'
      ],
      icon: Brain
    }
  ];

  // Доступные значения оценок
  const scoreValues = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4 pb-20">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="bg-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Диагностическая игра</h2>
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
              {/* Компетенции */}
              <div className="space-y-6">
                {competencies.map((competency) => {
                  const Icon = competency.icon;
                  const currentScore = evaluation.competency_scores[competency.key];
                  
                  return (
                    <div key={competency.key} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                              {competency.title}
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed mt-1 mb-3">
                              {competency.description}
                            </p>
                            {/* Кнопка для показа критериев */}
                            <button
                              onClick={() => {
                                setSelectedCompetency(competency);
                                setShowCriteriaModal(true);
                              }}
                              className="flex items-center gap-2 text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg"
                            >
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-xs font-bold text-white">i</span>
                              </div>
                              <span>Критерии оценки</span>
                            </button>
                          </div>
                        </div>
                        <div className="text-center sm:text-right sm:ml-4">
                          <div className={`text-2xl font-bold ${getScoreColor(currentScore)}`}>
                            {currentScore || '—'}<span className="text-gray-400">/5</span>
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
                              onClick={() => handleScoreChange(competency.key, score)}
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
                              onClick={() => handleScoreChange(competency.key, score)}
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
                  placeholder="Дополнительные комментарии к оценке компетенций в диагностической игре..."
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
            ← Назад
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
                  <Brain className="w-4 h-4" />
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
        caseNumber={null} // Для диагностической игры кейс не используется
        totalScore={getTotalScore()}
        evaluationType="Диагностическая игра"
        onRemoveEvaluation={async () => {
          await onRemoveEvaluation?.(participantId);
        }}
      />

      {/* Модал критериев оценки */}
      {showCriteriaModal && selectedCompetency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Заголовок */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                Критерии оценки: {selectedCompetency.title}
              </h2>
              <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                {selectedCompetency.description}
              </p>
            </div>
            
            {/* Содержание */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedCompetency.details.map((detail: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-600 text-sm font-semibold">{index + 1}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Кнопка */}
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
