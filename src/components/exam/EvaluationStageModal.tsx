import React, { useState, useEffect } from 'react';
import { X, FileText, Users, Trophy, ArrowRight, Loader2, User, MousePointer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CaseEvaluationModal } from './CaseEvaluationModal';
// Убираем @reactour/tour, создаем собственное решение

// Собственный компонент тултипа для мобильных устройств
const MobileTooltip: React.FC<{
  isVisible: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}> = ({ isVisible, targetRef, onClose }) => {
  const [position, setPosition] = useState({ top: 0, left: 0, arrowPosition: 'left' });

  useEffect(() => {
    if (isVisible && targetRef.current) {
      const updatePosition = () => {
        const target = targetRef.current;
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Определяем, мобильное ли устройство
        const isMobile = viewportWidth <= 768;
        
        // Размеры тултипа
        const tooltipWidth = isMobile ? 240 : 280; // Уменьшаем для мобильных
        const tooltipHeight = 80;
        const padding = 16;
        const arrowSize = 8;
        
        let top, left, arrowPosition;

        if (isMobile) {
          // Для мобильных устройств размещаем тултип справа от карточки
          left = rect.right + padding;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          arrowPosition = 'left';
          
          // Если не помещается справа, пробуем слева
          if (left + tooltipWidth > viewportWidth - padding) {
            left = rect.left - tooltipWidth - padding;
            arrowPosition = 'right';
            
            // Если не помещается слева, размещаем сверху по центру
            if (left < padding) {
              left = Math.max(padding, rect.left + rect.width / 2 - tooltipWidth / 2);
              top = rect.top - tooltipHeight - padding - arrowSize;
              arrowPosition = 'bottom';
            }
          }
        } else {
          // Для десктопа размещаем справа от карточки
          left = rect.right + padding;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          arrowPosition = 'left';

          // Проверяем, помещается ли справа
          if (left + tooltipWidth > viewportWidth - padding) {
            // Пробуем слева
            left = rect.left - tooltipWidth - padding;
            arrowPosition = 'right';
            
            // Если не помещается слева, размещаем сверху
            if (left < padding) {
              left = Math.max(padding, rect.left + rect.width / 2 - tooltipWidth / 2);
              top = rect.top - tooltipHeight - padding;
              arrowPosition = 'bottom';
            }
          }
        }

        // Проверяем вертикальные границы
        if (top < padding) {
          top = padding;
        } else if (top + tooltipHeight > viewportHeight - padding) {
          top = viewportHeight - tooltipHeight - padding;
        }

        // Проверяем горизонтальные границы
        if (left < padding) {
          left = padding;
        } else if (left + tooltipWidth > viewportWidth - padding) {
          left = viewportWidth - tooltipWidth - padding;
        }

        setPosition({ top, left, arrowPosition });
      };

      updatePosition();
      
      // Обновляем позицию при изменении размера окна
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isVisible, targetRef]);

  if (!isVisible) return null;

  return (
    <>
      {/* Затемнение фона */}
      <div 
        className="fixed inset-0 bg-black/20 z-[9998]"
        onClick={onClose}
      />
      
      {/* Тултип */}
      <div
        className="fixed z-[9999] bg-white rounded-xl shadow-2xl p-4 sm:max-w-[280px] max-w-[240px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          fontFamily: 'Mabry, sans-serif',
          width: `${tooltipWidth}px`
        }}
      >
        <div className="flex items-start gap-2">
          <MousePointer className="w-4 h-4 mt-0.5 text-emerald-600" />
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">Начните здесь</div>
            <div className="text-xs text-gray-600 mt-1">
              Нажмите «Решение кейсов», чтобы выбрать и оценить кейс.
            </div>
          </div>
        </div>
        
        {/* Стрелка */}
        <div
          className={`absolute w-0 h-0 ${
            position.arrowPosition === 'left' 
              ? 'border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-emerald-600 -left-2 top-1/2 -translate-y-1/2'
              : position.arrowPosition === 'right'
              ? 'border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-emerald-600 -right-2 top-1/2 -translate-y-1/2'
              : position.arrowPosition === 'bottom'
              ? 'border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-emerald-600 -bottom-2 left-1/2 -translate-x-1/2'
              : 'border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-emerald-600 -top-2 left-1/2 -translate-x-1/2'
          }`}
        />
      </div>
    </>
  );
};

interface EvaluationStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStageSelect?: (stage: string, caseNumber?: number) => void;
  participantName: string;
  participantPhoto?: string;
  examId: string;
  participantId: string;
  onCaseEvaluationOpen?: (caseNumber: number) => void;
  onCaseEvaluationComplete?: (caseNumber: number) => Promise<void>;
  onRemoveEvaluation?: (participantId: string, caseNumber: number) => Promise<void>;
  evaluations?: any[]; // Загруженные оценки для определения статуса завершенности
}

// Внутренний компонент, который использует хук useTour
const EvaluationStageModalContent: React.FC<EvaluationStageModalProps> = ({
  isOpen,
  onClose,
  onStageSelect,
  participantName,
  participantPhoto,
  examId,
  participantId,
  onCaseEvaluationComplete,
  onRemoveEvaluation,
  evaluations = []
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const targetRef = React.useRef<HTMLElement>(null);
  const [showCaseSelection, setShowCaseSelection] = useState(false);
  const [assignedCases, setAssignedCases] = useState<number[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [showCaseEvaluation, setShowCaseEvaluation] = useState(false);
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<number>(1);
  const [highlightFirstButton, setHighlightFirstButton] = useState(false);


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

  // Запуск тура при открытии модалки
  useEffect(() => {
    if (isOpen) {
      setShowCaseSelection(false);
      setShowCaseEvaluation(false);
      setSelectedCaseNumber(1);

      // Сначала выравниваем модалку, затем показываем подсказку
      const isMobile = window.innerWidth <= 768;
      const initialDelay = isMobile ? 2000 : 1000; // Больше времени для мобильных
      const tourDelay = isMobile ? 1000 : 500; // Больше времени для позиционирования на мобильных
      
      const t1 = setTimeout(() => {
        setHighlightFirstButton(true);
        // Даем время модалке выровняться перед показом тултипа
        setTimeout(() => {
          // Проверяем, что элемент существует и видим
          if (targetRef.current) {
            // Принудительно прокручиваем к элементу
            targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Небольшая задержка для завершения прокрутки
            setTimeout(() => {
              setShowTooltip(true);
            }, isMobile ? 500 : 300);
          }
        }, tourDelay);
      }, initialDelay);

      // Убрать подсветку спустя время, но тур сам закроется по действию пользователя
      const t2 = setTimeout(() => setHighlightFirstButton(false), 6000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setShowTooltip(false);
      setHighlightFirstButton(false);
    }
  }, [isOpen]);

  // Обработчик закрытия тултипа
  const handleTooltipClose = () => {
    setShowTooltip(false);
    setHighlightFirstButton(false);
  };

  // Обработчик клика по любой карточке - закрываем тултип
  const handleStageClick = (stageId: string) => {
    setShowTooltip(false); // Закрываем тултип
    setHighlightFirstButton(false); // Убираем подсветку
    
    if (stageId === 'case-solving') {
      setShowCaseSelection(true);
    } else {
      onStageSelect?.(stageId);
    }
  };

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      // Блокируем прокрутку
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      return () => {
        // Восстанавливаем прокрутку при закрытии
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      };
    } else {
      // Восстанавливаем прокрутку если модальное окно закрыто
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
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
    
    const scores = Object.values(evaluation.criteria_scores) as number[];
    const average = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
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
    <>
      <style>
        {`
          @keyframes glowBorder {
            0% { box-shadow: 0 0 0 0 rgba(6,164,120,0.28); }
            50% { box-shadow: 0 0 0 8px rgba(6,164,120,0.12); }
            100% { box-shadow: 0 0 0 0 rgba(6,164,120,0.28); }
          }
          .highlight-glow {
            animation: glowBorder 2s ease-in-out infinite;
            border-color: rgba(6,164,120,0.5) !important;
            background: linear-gradient(135deg, rgba(6,164,120,0.02), rgba(6,164,120,0.05)) !important;
          }
          
          /* Адаптивные стили для мобильных устройств */
          @media (max-width: 768px) {
            [data-tour="case-solving-card"] {
              position: relative !important;
              z-index: 1000 !important;
              transform: translateZ(0) !important; /* Принудительное создание слоя для GPU */
              will-change: transform !important;
            }
            
            /* Дополнительная стабилизация для тултипа на мобильных */
            .reactour__popover {
              position: fixed !important;
              transform: translateZ(0) !important;
              backface-visibility: hidden !important;
            }
          }
          
          /* Стили для Joyride */
          .react-joyride__tooltip {
            font-family: 'Mabry', sans-serif !important;
          }
          .react-joyride__tooltip h4 {
            font-family: 'Mabry', sans-serif !important;
          }
          .react-joyride__tooltip p {
            font-family: 'Mabry', sans-serif !important;
          }
          .react-joyride__tooltip button {
            font-family: 'Mabry', sans-serif !important;
          }
        `}
      </style>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 xs:p-4">
      <div className={`relative max-w-lg w-full max-h-[70vh] overflow-hidden rounded-2xl bg-white shadow-2xl transform transition-all duration-500 ease-out ${
        isOpen && !showCaseEvaluation ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}>
        {/* Заголовок */}
        <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-3 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 pr-2">
              {/* Круглое фото */}
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden flex-shrink-0">
                {participantPhoto ? (
                  <img
                    src={participantPhoto}
                    alt={participantName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
                    <User className="w-6 h-6 text-white/80" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold mb-1 leading-tight" style={{ fontFamily: 'SNS, sans-serif' }}>
                  Выбор этапа оценки
                </h2>
                <p className="text-emerald-100 text-xs truncate">
                  {participantName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-200 touch-target"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Основной контент с прокруткой */}
        <div className="p-3 overflow-y-auto max-h-[calc(70vh-120px)]">
          {!showCaseSelection ? (
            // Выбор этапа оценки
            <div className="grid grid-cols-1 gap-3 relative">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const isFirst = stage.id === 'case-solving';
                return (
                  <div
                    key={stage.id}
                    ref={isFirst ? (targetRef as React.RefObject<HTMLDivElement>) : undefined}
                    className={`
                      group cursor-pointer rounded-xl p-3 border transition-all duration-300
                      bg-gradient-to-br ${stage.bgGradient} ${stage.borderColor}
                      hover:scale-[1.02] hover:shadow-lg
                      ${isFirst && highlightFirstButton ? 'highlight-glow' : ''}
                    `}
                    onClick={() => handleStageClick(stage.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Иконка */}
                      <div className={`w-10 h-10 ${stage.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      
                      {/* Контент */}
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'SNS, sans-serif' }}>
                          {stage.title}
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {stage.description}
                        </p>
                      </div>

                      {/* Стрелка */}
                      <div className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all duration-300">
                        <svg className="w-3 h-3 text-gray-600 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className={`grid gap-3 ${assignedCases.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : assignedCases.length === 2 ? 'grid-cols-1 xs:grid-cols-2' : 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3'}`}>
                  {assignedCases.map((caseNumber) => {
                    const isCompleted = isCaseEvaluationCompleted(caseNumber);
                    const averageScore = getCaseAverageScore(caseNumber);
                    return (
                      <div
                        key={caseNumber}
                        className={`group cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative ${
                          isCompleted 
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:scale-[1.02] hover:shadow-lg' 
                            : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 hover:scale-[1.02] hover:shadow-lg'
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
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 ${
                            isCompleted ? 'bg-green-500' : 'bg-emerald-500'
                          }`}>
                            <span className="text-xl font-bold text-white">
                              {caseNumber}
                            </span>
                          </div>
                          <h4 className={`text-base font-bold mb-1 ${
                            isCompleted ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            Кейс #{caseNumber}
                          </h4>
                          
                          {/* Средний балл */}
                          {isCompleted && averageScore !== null && (
                            <div className="mb-2">
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                averageScore >= 4 ? 'bg-green-100 text-green-700' :
                                averageScore >= 3 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {averageScore}/5
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-xs ${
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
              
              <div className="flex justify-center pt-4">
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
        <div className="border-t border-gray-100 p-2 bg-gray-50 rounded-b-2xl">
          <div className="text-center text-xs text-gray-500">
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
      
      {/* Наш собственный тултип */}
      <MobileTooltip 
        isVisible={showTooltip}
        targetRef={targetRef}
        onClose={handleTooltipClose}
      />
    </div>
    </>
  );
};

// Основной компонент - просто экспортируем наш компонент
export const EvaluationStageModal: React.FC<EvaluationStageModalProps> = (props) => {
  return <EvaluationStageModalContent {...props} />;
};

