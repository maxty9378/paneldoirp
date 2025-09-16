import React, { useState, useEffect } from 'react';
import { X, FileText, Users, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CaseEvaluationModal } from './CaseEvaluationModal';

interface EvaluationStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStageSelect?: (stage: string, caseNumber?: number) => void;
  participantName: string;
  examId: string;
  participantId: string;
  onCaseEvaluationOpen?: (caseNumber: number) => void;
  onCaseEvaluationComplete?: (caseNumber: number) => Promise<void>;
  onRemoveEvaluation?: (participantId: string, caseNumber: number) => Promise<void>;
  evaluations?: any[]; // Загруженные оценки для определения статуса завершенности
}

export const EvaluationStageModal: React.FC<EvaluationStageModalProps> = ({
  isOpen,
  onClose,
  onStageSelect,
  participantName,
  examId,
  participantId,
  onCaseEvaluationComplete,
  onRemoveEvaluation,
  evaluations = []
}) => {
  const [showCaseSelection, setShowCaseSelection] = useState(false);
  const [assignedCases, setAssignedCases] = useState<number[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [showCaseEvaluation, setShowCaseEvaluation] = useState(false);
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<number>(1);

  // Загрузка назначенных кейсов
  const fetchAssignedCases = async () => {
    if (!examId || !participantId) return;

    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from('case_assignments')
        .select('case_numbers')
        .eq('exam_event_id', examId)
        .eq('participant_id', participantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка загрузки назначенных кейсов:', error);
        // По умолчанию показываем стандартные кейсы если ошибка
        setAssignedCases([1, 2]);
        return;
      }

      if (data && data.case_numbers) {
        setAssignedCases(data.case_numbers);
      } else {
        // Если назначений нет, показываем стандартные кейсы
        setAssignedCases([1, 2]);
      }
    } catch (err) {
      console.error('Ошибка загрузки назначенных кейсов:', err);
      setAssignedCases([1, 2]);
    } finally {
      setLoadingCases(false);
    }
  };

  // Сброс состояний при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      setShowCaseSelection(false);
      setShowCaseEvaluation(false);
      setSelectedCaseNumber(1);
    }
  }, [isOpen]);

  // Загружаем кейсы при переключении на выбор кейсов
  useEffect(() => {
    if (showCaseSelection && isOpen) {
      fetchAssignedCases();
    }
  }, [showCaseSelection, isOpen, examId, participantId]);

  // Функция для проверки, завершена ли оценка кейса
  const isCaseEvaluationCompleted = (caseNumber: number): boolean => {
    return evaluations.some(evaluation => 
      evaluation.reservist_id === participantId && 
      evaluation.case_number === caseNumber
    );
  };

  // Функция для получения средней оценки кейса
  const getCaseAverageScore = (caseNumber: number): number | null => {
    const evaluation = evaluations.find(evaluation => 
      evaluation.reservist_id === participantId && 
      evaluation.case_number === caseNumber
    );
    
    if (!evaluation?.criteria_scores) return null;
    
    const scores = Object.values(evaluation.criteria_scores);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average * 10) / 10; // Округляем до 1 знака после запятой
  };

  if (!isOpen) return null;

  const stages = [
    {
      id: 'case-solving',
      title: 'Решение кейсов',
      description: 'Решение резервистами прикладных кейсов',
      icon: FileText,
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-100',
      iconBg: 'bg-emerald-500'
    },
    {
      id: 'project-defense',
      title: 'Защита проектов',
      description: 'Презентация и защита проектных решений',
      icon: Users,
      color: 'blue',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-100',
      iconBg: 'bg-blue-500'
    },
    {
      id: 'diagnostic-game',
      title: 'Диагностическая игра',
      description: 'Проведение диагностической игры "Командное решение"',
      icon: Trophy,
      color: 'cyan',
      bgGradient: 'from-cyan-50 to-blue-50',
      borderColor: 'border-cyan-100',
      iconBg: 'bg-cyan-500'
    }
  ];

  console.log('EvaluationStageModal render:', { 
    isOpen, 
    showCaseEvaluation, 
    showCaseSelection,
    selectedCaseNumber,
    participantId,
    participantName 
  });
  
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pb-20"
    >
      <div className={`relative max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl transform transition-all duration-500 ease-out ${
        isOpen && !showCaseEvaluation ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}>
        {/* Заголовок */}
        <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-6 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'SNS, sans-serif' }}>
                Выбор этапа оценки
              </h2>
              <p className="text-emerald-100 text-sm">
                {participantName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          {!showCaseSelection ? (
            // Выбор этапа оценки
            <div className="grid grid-cols-1 gap-4">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div
                    key={stage.id}
                    className={`
                      group cursor-pointer rounded-2xl p-6 border transition-all duration-300
                      bg-gradient-to-br ${stage.bgGradient} ${stage.borderColor}
                      hover:scale-105 hover:shadow-lg
                      transform animate-[slideUp_0.5s_ease-out] opacity-0
                    `}
                    style={{
                      animationDelay: `${index * 150}ms`,
                      animationFillMode: 'forwards'
                    }}
                    onClick={() => {
                      if (stage.id === 'case-solving') {
                        setShowCaseSelection(true);
                      } else {
                        onStageSelect?.(stage.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Иконка */}
                      <div className={`w-14 h-14 ${stage.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      
                      {/* Контент */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'SNS, sans-serif' }}>
                          {stage.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {stage.description}
                        </p>
                      </div>

                      {/* Стрелка */}
                      <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                        <svg className="w-4 h-4 text-gray-600 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Выбор номера кейса
            <div className="space-y-6">
              <div className="text-center">
                {(() => {
                  const completedCases = assignedCases.filter(caseNumber => isCaseEvaluationCompleted(caseNumber));
                  const allCompleted = completedCases.length === assignedCases.length && assignedCases.length > 0;
                  
                  if (allCompleted) {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
                          Оценки выставлены
                        </h3>
                        <p className="text-gray-600">
                          Все кейсы оценены. Вы можете изменить оценки, нажав на нужный кейс.
                        </p>
                      </>
                    );
                  } else if (completedCases.length > 0) {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
                          Выберите номер кейса
                        </h3>
                        <p className="text-gray-600">
                          Оценено {completedCases.length} из {assignedCases.length} кейсов
                        </p>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
                          Выберите номер кейса
                        </h3>
                        <p className="text-gray-600">
                          Обычно резервист решает два кейса
                        </p>
                      </>
                    );
                  }
                })()}
              </div>
              
              {loadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <span className="ml-3 text-gray-600">Загрузка назначенных кейсов...</span>
                </div>
              ) : assignedCases.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Нет назначенных кейсов</h4>
                  <p className="text-gray-600">
                    Администратор ещё не назначил кейсы для этого участника
                  </p>
                </div>
              ) : (
                <div className={`grid gap-4 ${assignedCases.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : assignedCases.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {assignedCases.map((caseNumber) => {
                    const isCompleted = isCaseEvaluationCompleted(caseNumber);
                    const averageScore = getCaseAverageScore(caseNumber);
                    return (
                      <div
                        key={caseNumber}
                        className={`group cursor-pointer rounded-2xl p-6 border transition-all duration-300 relative ${
                          isCompleted 
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:scale-105 hover:shadow-lg' 
                            : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 hover:scale-105 hover:shadow-lg'
                        }`}
                        onClick={() => {
                          console.log('Клик по кейсу:', caseNumber);
                          setSelectedCaseNumber(caseNumber);
                          setShowCaseEvaluation(true);
                          console.log('Состояние после клика:', { selectedCaseNumber: caseNumber, showCaseEvaluation: true });
                        }}
                      >
                        {/* Индикатор завершения */}
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 ${
                            isCompleted ? 'bg-green-500' : 'bg-emerald-500'
                          }`}>
                            <span className="text-2xl font-bold text-white">
                              {caseNumber}
                            </span>
                          </div>
                          <h4 className={`text-lg font-bold mb-1 ${
                            isCompleted ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            Кейс #{caseNumber}
                          </h4>
                          
                          {/* Средний балл */}
                          {isCompleted && averageScore !== null && (
                            <div className="mb-2">
                              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                                averageScore >= 4 ? 'bg-green-100 text-green-700' :
                                averageScore >= 3 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {averageScore}/5
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-sm ${
                            isCompleted ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {isCompleted ? 'Оценка выставлена' : 'Оценить решение кейса'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex justify-center">
                <button
                  onClick={() => setShowCaseSelection(false)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Назад к выбору этапа
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="sticky bottom-0 border-t border-gray-100 p-4 bg-gray-50 rounded-b-3xl">
          <div className="text-center text-sm text-gray-500">
            Выберите этап для оценки резервиста
          </div>
        </div>
      </div>

      {/* Модальное окно оценки кейса */}
      <CaseEvaluationModal
        isOpen={showCaseEvaluation}
        onClose={() => {
          setShowCaseEvaluation(false);
          setShowCaseSelection(false);
        }}
        participantId={participantId}
        participantName={participantName}
        caseNumber={selectedCaseNumber}
        examId={examId}
        onEvaluationComplete={async () => {
          await onCaseEvaluationComplete?.(selectedCaseNumber);
          setShowCaseEvaluation(false);
          setShowCaseSelection(false);
        }}
        onRemoveEvaluation={onRemoveEvaluation}
        // Передаем существующую оценку для загрузки
        existingEvaluation={evaluations.find(evaluation => 
          evaluation.reservist_id === participantId && 
          evaluation.case_number === selectedCaseNumber
        )}
      />
    </div>
  );
};
