import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, CheckCircle } from 'lucide-react';
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
  onModalStateChange?: (isOpen: boolean) => void; // Новый пропс для уведомления о состоянии модальных окон
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
}

export const DiagnosticGameModal: React.FC<DiagnosticGameModalProps> = ({
  isOpen,
  onClose,
  participantId,
  participantName,
  examId,
  onEvaluationComplete,
  onRemoveEvaluation,
  existingEvaluation,
  onModalStateChange
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
    }
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
      const y = window.scrollY;
      document.body.classList.add('modal-open');
      document.body.style.position = 'fixed';
      document.body.style.top = `-${y}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.classList.remove('modal-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, y);
      };
    } else {
      // Восстанавливаем прокрутку если модальное окно закрыто или показывается другое модальное окно
      document.body.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    }
  }, [isOpen, showSuccessModal, showCriteriaModal]);
  
  // Уведомляем родительский компонент о состоянии модального окна
  useEffect(() => {
    onModalStateChange?.(isOpen);
  }, [isOpen, onModalStateChange]);

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
          competency_scores: data.competency_scores
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
          }
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


  const saveEvaluation = async () => {
    setSaving(true);
    try {
      const evaluationData = {
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user?.id,
        competency_scores: evaluation.competency_scores
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
      icon: null
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
      icon: null
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
      icon: null
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
      icon: null
    }
  ];

  // Константы для слайдера (как в CaseEvaluationModal)
  const STEPS: number[] = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5); // [1..5] шаг 0.5

  // Функции для работы со слайдером (как в CaseEvaluationModal)
  const colorFor = (score: number) => {
    if (score >= 4) return '#059669'; // green-600
    if (score >= 3) return '#d97706'; // amber-600
    return '#dc2626'; // red-600
  };

  const totalScore = useMemo(() => {
    const scores = Object.values(evaluation.competency_scores) as number[];
    const validScores = scores.filter(s => s > 0);
    if (validScores.length === 0) return 0;
    const avg = validScores.reduce((s, x) => s + x, 0) / validScores.length;
    return Math.round(avg * 10) / 10;
  }, [evaluation.competency_scores]);

  const canSave = totalScore > 0 && !saving;

  // Стили для слайдера (как в CaseEvaluationModal)
  const sliderStyles = `
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      width: 100%;
    }

    input[type="range"]::-webkit-slider-track {
      background: transparent;
      height: 20px;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      background: #10b981;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    input[type="range"]::-moz-range-track {
      background: transparent;
      height: 20px;
    }

    input[type="range"]::-moz-range-thumb {
      background: #10b981;
      height: 20px;
      width: 20px;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    /* Принудительное убирание всех отступов для модального окна */
    .case-evaluation-modal {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      padding-top: env(safe-area-inset-top, 0px) !important;
      z-index: 10002 !important;
      background: white !important;
    }
    
    /* Убираем отступы у body когда открыто модальное окно */
    body.modal-open {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
  `;

  // Компонент слайдера (как в CaseEvaluationModal)
  const SliderComponent = ({ 
    value, 
    onChange 
  }: { 
    value: number; 
    onChange: (value: number) => void; 
  }) => {
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const i = parseInt(e.target.value);
      onChange(STEPS[i]);
    };

    return (
      <div className="mt-2">
        {/* Чипы для быстрого выбора значений */}
        <div className="mb-2 grid grid-cols-9 gap-1">
          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(n => {
            const active = value === n;
            return (
              <button
                key={n}
                className={
                  'h-7 w-full rounded-full text-[10px] font-semibold border transition ' +
                  (active
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50')
                }
                onClick={() => onChange(n)}
                aria-label={`Выбрать ${n}`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Трек с рисками */}
        <div className="relative pt-3">
          {/* линия */}
          <div className="absolute left-1 right-1 top-[9px] h-[2px] bg-gray-200 rounded-full" />
          {/* риски */}
          <div className="absolute left-1 right-1 top-0 h-5 pointer-events-none">
            {STEPS.map((s, i) => {
              const left = `${(i / (STEPS.length - 1)) * 100}%`;
              const isInteger = Number.isInteger(s);
              return (
                <div
                  key={s}
                  className="absolute"
                  style={{ left, transform: 'translateX(-50%)' }}
                >
                  <div className={isInteger ? 'w-[2px] h-5 bg-gray-300' : 'w-[1px] h-3 bg-gray-300'} />
                  {isInteger && (
                    <div className="text-[10px] text-gray-500 text-center mt-1 translate-x-[-50%]">
                      {s}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* сам слайдер поверх трека */}
          <input
            type="range"
            min={0}
            max={STEPS.length - 1}
            value={STEPS.findIndex(s => s === value)}
            onChange={handleSliderChange}
            className="w-full h-5 relative z-10"
          />
        </div>
      </div>
    );
  };

  // Доступные значения оценок
  const scoreValues = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <style>{sliderStyles}</style>

      {/* Фуллскрин слой */}
      <div className="case-evaluation-modal fixed inset-0 z-[10002] flex flex-col bg-white" style={{ 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
        WebkitTransform: 'translate3d(0, 0, 0)',
        WebkitBackfaceVisibility: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* Шапка (sticky top) */}
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Диагностическая игра</div>
                <div className="text-base font-semibold truncate">{participantName}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div
                  className="text-2xl font-bold"
                  style={{ color: colorFor(totalScore) }}
                >
                  {totalScore.toFixed(1)}
                </div>
                <div className="text-[11px] text-gray-400">средний балл</div>
              </div>
              <button
                onClick={onClose}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
                aria-label="Закрыть"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  zIndex: 1000,
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
              >
                <X className="w-6 h-6 text-gray-700 pointer-events-none" />
              </button>
            </div>
          </div>
        </header>


        {/* Контент (скролл) */}
        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
          <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {/* Компетенции */}
                {competencies.map(c => {
                  const val = evaluation.competency_scores[c.key];
                  const col = colorFor(val);
                  return (
                    <div key={c.key} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm font-medium text-gray-900">{c.title}</div>
                            <button
                              onClick={() => {
                                setSelectedCompetency(c);
                                setShowCriteriaModal(true);
                              }}
                              className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm hover:bg-emerald-600 transition-colors"
                              aria-label="Показать критерии оценки"
                            >
                              <span className="text-[10px] font-bold text-white">i</span>
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">{c.description}</div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="text-lg font-bold" style={{ color: col }}>
                            {val.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <SliderComponent
                        value={val}
                        onChange={(score) => handleScoreChange(c.key, score)}
                      />
                    </div>
                  );
                })}

            </>
          )}
        </div>
        </main>

        {/* Футер (sticky bottom) */}
        <footer className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-3 pb-safe-bottom">
          <div className="flex gap-2">
          <button
            onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            ← Назад
          </button>
            <button
              onClick={saveEvaluation}
              disabled={!canSave}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                !canSave
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {saving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Сохранение...
                </div>
              ) : saved ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Сохранено
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Brain className="w-4 h-4" />
                  Отправить
                </div>
              )}
            </button>
          </div>
        </footer>
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
    </>
  );
};
