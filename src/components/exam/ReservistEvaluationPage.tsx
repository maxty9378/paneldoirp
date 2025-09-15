import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Target, User, FileText, Presentation, Gamepad2, Save, Sparkles, MessageSquare, Award, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import MobileExamNavigation from './MobileExamNavigation';
import { ParticipantWithCases, CaseEvaluation, EVALUATION_CRITERIA, SCORE_LABELS, ScoreValue } from '../../types/evaluation';

interface ExamEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  event_id: string;
  status: 'registered' | 'confirmed' | 'completed';
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    sap_number: string;
    work_experience_days?: number;
    position?: { name: string };
    territory?: { name: string };
  };
  dossier?: {
    id: string;
    user_id: string;
    photo_url?: string;
    position?: string;
    territory?: string;
    age?: number;
    experience_in_position?: string;
  };
}

interface CaseEvaluation {
  participant_id: string;
  case_number: number;
  correctness: number | null;
  clarity: number | null;
  independence: number | null;
  comments: string;
}

interface ProjectEvaluation {
  participant_id: string;
  presentation_quality: number | null;
  project_innovation: number | null;
  technical_implementation: number | null;
  business_value: number | null;
  comments: string;
}

interface CompetencyEvaluation {
  participant_id: string;
  results_orientation: number | null;
  effective_communication: number | null;
  teamwork_skills: number | null;
  systemic_thinking: number | null;
  comments: string;
}

// Компонент карточки участника для оценки кейсов
interface ParticipantCaseCardProps {
  participant: Participant;
  index: number;
  onEvaluationChange: (caseId: string, field: keyof CaseEvaluation, value: any) => void;
}

const ParticipantCaseCard: React.FC<ParticipantCaseCardProps> = ({ participant, index, onEvaluationChange }) => {
  const corporateColor = '#06A478';
  
  // Назначенные кейсы или пустой массив для демонстрации
  // Временно используем демо данные, пока не реализована загрузка из БД
  const cases = [
    // Демо кейсы
    { 
      id: `demo-1-${participant.id}`, 
      event_participant_id: participant.id,
      exam_case_id: '1',
      assigned_at: new Date().toISOString(),
      assigned_by: null,
      exam_case: { 
        id: '1', 
        case_number: 8, 
        title: 'Кейс "Стратегическое планирование"', 
        description: 'Выход на новый рынок', 
        correct_answer: 'Вариант A: Исследование рынка и конкурентов',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } 
    },
    { 
      id: `demo-2-${participant.id}`, 
      event_participant_id: participant.id,
      exam_case_id: '2',
      assigned_at: new Date().toISOString(),
      assigned_by: null,
      exam_case: { 
        id: '2', 
        case_number: 11, 
        title: 'Кейс "Инновационное развитие"', 
        description: 'Разработка новых продуктов', 
        correct_answer: 'Вариант A: Создание инновационной лаборатории',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } 
    }
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      {/* Заголовок карточки */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-8 py-6 border-b border-gray-200">
        <div className="flex items-center gap-6">
          {/* Фото участника */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ring-4 ring-white shadow-lg">
              {participant.dossier?.photo_url ? (
                <img
                  src={participant.dossier.photo_url}
                  alt={participant.user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>
            {/* Номер участника */}
            <div 
              className="absolute -top-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg"
              style={{ backgroundColor: corporateColor }}
            >
              {index + 1}
            </div>
          </div>
          
          {/* Информация об участнике */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'SNS, sans-serif' }}>
              {participant.user.full_name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: corporateColor }}
                />
                <span className="text-gray-600 font-medium">
                  {participant.user.position?.name || 'Должность не указана'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: corporateColor }}
                />
                <span className="text-gray-600">
                  {participant.user.territory?.name || 'Филиал не указан'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Индикатор прогресса */}
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Прогресс</div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
              style={{ backgroundColor: corporateColor }}
            >
              0%
            </div>
          </div>
        </div>
      </div>

      {/* Кейсы для оценки */}
      <div className="p-8 space-y-8">
        {cases.map((assignedCase, caseIndex) => (
          <CaseEvaluationBlock
            key={assignedCase.id}
            assignedCase={assignedCase}
            caseIndex={caseIndex}
            onEvaluationChange={onEvaluationChange}
          />
        ))}
      </div>
    </div>
  );
};

// Компонент блока оценки одного кейса
interface CaseEvaluationBlockProps {
  assignedCase: any; // Типизируем позже
  caseIndex: number;
  onEvaluationChange: (caseId: string, field: keyof CaseEvaluation, value: any) => void;
}

const CaseEvaluationBlock: React.FC<CaseEvaluationBlockProps> = ({ assignedCase, caseIndex, onEvaluationChange }) => {
  const corporateColor = '#06A478';
  const examCase = assignedCase.exam_case;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 space-y-6">
      {/* Заголовок кейса */}
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg"
          style={{ backgroundColor: corporateColor }}
        >
          {examCase.case_number}
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-gray-900 mb-1">
            {examCase.title}
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>Кейс #{examCase.case_number} • {caseIndex + 1} из 2</span>
          </div>
        </div>
      </div>

      {/* Критерии оценки */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {EVALUATION_CRITERIA.map((criteria) => (
          <div key={criteria.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{criteria.icon}</span>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {criteria.name}
                </div>
                <div className="text-xs text-gray-500">
                  {criteria.description}
                </div>
              </div>
            </div>
            
            {/* Выбор оценки */}
            <div className="space-y-2">
              <select
                className="w-full appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-[#06A478] focus:ring-2 focus:ring-[#06A478]/20 transition-all duration-200"
                onChange={(e) => onEvaluationChange(assignedCase.id, criteria.id, parseInt(e.target.value) || null)}
              >
                <option value="">Выберите оценку</option>
                {Object.entries(SCORE_LABELS).map(([score, data]) => (
                  <option key={score} value={score}>
                    {data.emoji} {data.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Общий комментарий */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <label className="font-semibold text-gray-900 text-sm">
            Комментарий к кейсу
          </label>
        </div>
        <textarea
          className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#06A478] focus:ring-2 focus:ring-[#06A478]/20 transition-all duration-200 resize-none"
          rows={3}
          placeholder="Добавьте комментарий по решению кейса..."
          onChange={(e) => onEvaluationChange(assignedCase.id, 'overall_comment', e.target.value)}
        />
      </div>
    </div>
  );
};

const ReservistEvaluationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<ExamEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cases' | 'project' | 'competencies'>('cases');
  const [caseEvaluations, setCaseEvaluations] = useState<CaseEvaluation[]>([]);
  
  // Временно оставляем старые состояния для других табов
  const [projectEvaluations, setProjectEvaluations] = useState<LegacyProjectEvaluation[]>([]);
  const [competencyEvaluations, setCompetencyEvaluations] = useState<LegacyCompetencyEvaluation[]>([]);

  // Вычисляем прогресс оценки
  const evaluationProgress = useMemo(() => {
    const totalFields = participants.length * 3; // 3 этапа на каждого участника
    let completedFields = 0;
    
    participants.forEach(participant => {
      // Проверяем кейсы (2 кейса * 3 критерия)
      for (let caseNum = 1; caseNum <= 2; caseNum++) {
        const caseEval = caseEvaluations.find(e => 
          e.participant_id === participant.user.id && e.case_number === caseNum
        );
        if (caseEval?.correctness && caseEval?.clarity && caseEval?.independence) {
          completedFields += 0.33; // 1/3 от одного этапа
        }
      }
      
      // Проверяем проект
      const projectEval = projectEvaluations.find(e => e.participant_id === participant.user.id);
      if (projectEval?.presentation_quality && projectEval?.project_innovation && 
          projectEval?.technical_implementation && projectEval?.business_value) {
        completedFields += 1;
      }
      
      // Проверяем компетенции
      const competencyEval = competencyEvaluations.find(e => e.participant_id === participant.user.id);
      if (competencyEval?.results_orientation && competencyEval?.effective_communication && 
          competencyEval?.teamwork_skills && competencyEval?.systemic_thinking) {
        completedFields += 1;
      }
    });
    
    return Math.round((completedFields / totalFields) * 100);
  }, [participants, caseEvaluations, projectEvaluations, competencyEvaluations]);

  const saveEvaluations = useCallback(async () => {
    try {
      // Автосохранение логика
      console.log('Сохранение оценок...');
      // TODO: Реализовать сохранение в Supabase
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  }, [caseEvaluations, projectEvaluations, competencyEvaluations]);

  useEffect(() => {
    if (id) {
      loadEventData();
    }
  }, [id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем данные события
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Загружаем участников
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          *,
          user: users (
            id,
            full_name,
            email,
            sap_number,
            work_experience_days,
            position: positions (name),
            territory: territories (name)
          )
        `)
        .eq('event_id', id);

      if (participantsError) throw participantsError;

      // Загружаем досье для каждого участника
      const participantsWithDossiers = await Promise.all(
        (participantsData || []).map(async (participant) => {
          try {
            const { data: dossierData, error: dossierError } = await supabase
              .from('participant_dossiers')
              .select('*')
              .eq('user_id', participant.user_id)
              .eq('event_id', id)
              .single();

            if (dossierError && dossierError.code !== 'PGRST116') {
              console.warn(`Ошибка загрузки досье для ${participant.user.full_name}:`, dossierError);
            }

            return {
              ...participant,
              dossier: dossierData || null
            };
          } catch (err) {
            console.warn(`Ошибка загрузки досье для ${participant.user.full_name}:`, err);
            return { ...participant, dossier: null };
          }
        })
      );

      setParticipants(participantsWithDossiers);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные события');
    } finally {
      setLoading(false);
    }
  };

  const handleCaseEvaluationChange = (participantId: string, caseNumber: number, field: keyof Omit<CaseEvaluation, 'participant_id' | 'case_number'>, value: string | number) => {
    setCaseEvaluations(prev => {
      const existing = prev.find(e => e.participant_id === participantId && e.case_number === caseNumber);
      if (existing) {
        return prev.map(e => 
          e.participant_id === participantId && e.case_number === caseNumber 
            ? { ...e, [field]: value }
            : e
        );
      } else {
        return [...prev, {
          participant_id: participantId,
          case_number: caseNumber,
          correctness: field === 'correctness' ? value as number : null,
          clarity: field === 'clarity' ? value as number : null,
          independence: field === 'independence' ? value as number : null,
          comments: field === 'comments' ? value as string : '',
        }];
      }
    });
  };

  const handleProjectEvaluationChange = (participantId: string, field: keyof Omit<ProjectEvaluation, 'participant_id'>, value: string | number) => {
    setProjectEvaluations(prev => {
      const existing = prev.find(e => e.participant_id === participantId);
      if (existing) {
        return prev.map(e => 
          e.participant_id === participantId 
            ? { ...e, [field]: value }
            : e
        );
      } else {
        return [...prev, {
          participant_id: participantId,
          presentation_quality: field === 'presentation_quality' ? value as number : null,
          project_innovation: field === 'project_innovation' ? value as number : null,
          technical_implementation: field === 'technical_implementation' ? value as number : null,
          business_value: field === 'business_value' ? value as number : null,
          comments: field === 'comments' ? value as string : '',
        }];
      }
    });
  };

  const handleCompetencyEvaluationChange = (participantId: string, field: keyof Omit<CompetencyEvaluation, 'participant_id'>, value: string | number) => {
    setCompetencyEvaluations(prev => {
      const existing = prev.find(e => e.participant_id === participantId);
      if (existing) {
        return prev.map(e => 
          e.participant_id === participantId 
            ? { ...e, [field]: value }
            : e
        );
      } else {
        return [...prev, {
          participant_id: participantId,
          results_orientation: field === 'results_orientation' ? value as number : null,
          effective_communication: field === 'effective_communication' ? value as number : null,
          teamwork_skills: field === 'teamwork_skills' ? value as number : null,
          systemic_thinking: field === 'systemic_thinking' ? value as number : null,
          comments: field === 'comments' ? value as string : '',
        }];
      }
    });
  };

  const getEvaluationValue = (participantId: string, caseNumber: number, field: keyof Omit<CaseEvaluation, 'participant_id' | 'case_number'>) => {
    const evaluation = caseEvaluations.find(e => e.participant_id === participantId && e.case_number === caseNumber);
    return evaluation?.[field] || '';
  };

  const getProjectEvaluationValue = (participantId: string, field: keyof Omit<ProjectEvaluation, 'participant_id'>) => {
    const evaluation = projectEvaluations.find(e => e.participant_id === participantId);
    return evaluation?.[field] || '';
  };

  const getCompetencyEvaluationValue = (participantId: string, field: keyof Omit<CompetencyEvaluation, 'participant_id'>) => {
    const evaluation = competencyEvaluations.find(e => e.participant_id === participantId);
    return evaluation?.[field] || '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-600">{error || 'Событие не найдено'}</p>
          <button
            onClick={() => navigate('/exam')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Вернуться к экзаменам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Мобильная навигация */}
      <MobileExamNavigation activeTab="evaluations" onTabChange={() => {}} />

      {/* Floating Progress Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/20">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#06A478"
                  strokeWidth="2"
                  strokeDasharray={`${evaluationProgress}, 100`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700">{evaluationProgress}%</span>
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-900">Прогресс</div>
              <div className="text-gray-500">оценки</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={saveEvaluations}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-200 group"
      >
        <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Заголовок с градиентом */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/exam')}
            className="group flex items-center gap-3 text-gray-600 hover:text-gray-900 mb-6 transition-all duration-200 hover:translate-x-1"
          >
            <div className="p-2 rounded-xl bg-white/60 backdrop-blur-sm group-hover:bg-white/80 transition-all duration-200">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Назад к экзаменам</span>
          </button>
          
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-blue-50/50 rounded-3xl shadow-lg border border-white/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5"></div>
            <div className="relative p-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {event.title}
                      </h1>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-600">Экспертная оценка</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-600">Потенциал ГДФ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6 text-lg">{event.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/30">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Период</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(event.start_date)} - {formatDate(event.end_date)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/30">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Локация</div>
                        <div className="text-sm text-gray-600">{event.location}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/30">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Статус</div>
                        <div className="text-sm text-gray-600">Экспертная оценка</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Современные табы с глассморфизмом */}
        <div className="relative mb-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/30 overflow-hidden">
            <nav className="flex">
              {[
                { id: 'cases', label: 'Защита кейсов', icon: FileText, color: 'emerald' },
                { id: 'project', label: 'Защита проекта', icon: Presentation, color: 'blue' },
                { id: 'competencies', label: 'Диагностическая игра', icon: Gamepad2, color: 'purple' }
              ].map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 relative py-6 px-6 font-medium text-sm transition-all duration-300 group ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {activeTab === tab.id && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${
                      tab.color === 'emerald' ? 'from-emerald-500 to-teal-600' :
                      tab.color === 'blue' ? 'from-blue-500 to-indigo-600' :
                      'from-purple-500 to-pink-600'
                    } transition-all duration-300`} />
                  )}
                  <div className="relative flex items-center justify-center gap-3">
                    <tab.icon className={`w-5 h-5 transition-all duration-200 ${
                      activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
                    }`} />
                    <span className="hidden md:inline">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full opacity-80" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Контент в зависимости от активного таба */}
        {activeTab === 'cases' && (
          <div className="space-y-6">
            {/* Заголовок секции */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-2xl shadow-lg">
                <FileText className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Защита кейсов</h2>
                  <p className="text-emerald-100 text-sm">Оценка решения двух кейсов по 3 критериям</p>
                </div>
              </div>
            </div>

            {/* Карточки участников для оценки кейсов */}
            <div className="space-y-8">
              {participants.map((participant, index) => (
                <ParticipantCaseCard
                  key={participant.id}
                  participant={participant}
                  index={index}
                  onEvaluationChange={(caseId, field, value) => {
                    // TODO: Обновить оценку в состоянии
                    console.log('Обновление оценки:', { caseId, field, value });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Старая версия для справки - будет удалена */}
        {false && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">№ п/п</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Фото участника</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ф.И.О. резервиста, должность, филиал</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Номер выступления</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Номер кейса</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Правильность решения кейса</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Чёткость объяснения</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Степень самостоятельности</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Комментарии</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant, index) => (
                    <React.Fragment key={participant.id}>
                      {/* Первый кейс */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                            {participant.dossier?.photo_url ? (
                              <img
                                src={participant.dossier.photo_url}
                                alt={participant.user.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <User className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="font-medium">{participant.user.full_name}</div>
                          <div className="text-gray-500">{participant.user.position?.name || 'Должность не указана'}</div>
                          <div className="text-gray-500">{participant.user.territory?.name || 'Филиал не указан'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium text-center">
                          {Math.floor(Math.random() * 20) + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <select
                            value={getEvaluationValue(participant.id, 1, 'correctness')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 1, 'correctness', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5].map(score => (
                              <option key={score} value={score}>{score}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <select
                            value={getEvaluationValue(participant.id, 1, 'clarity')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 1, 'clarity', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5].map(score => (
                              <option key={score} value={score}>{score}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <select
                            value={getEvaluationValue(participant.id, 1, 'independence')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 1, 'independence', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5].map(score => (
                              <option key={score} value={score}>{score}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <textarea
                            value={getEvaluationValue(participant.id, 1, 'comments')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 1, 'comments', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            rows={2}
                            placeholder="Комментарии..."
                          />
                        </td>
                      </tr>
                      {/* Второй кейс */}
                      <tr className="hover:bg-gray-50 bg-gray-25">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium text-center">
                          {Math.floor(Math.random() * 20) + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <select
                            value={getEvaluationValue(participant.id, 2, 'correctness')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 2, 'correctness', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5].map(score => (
                              <option key={score} value={score}>{score}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <select
                            value={getEvaluationValue(participant.id, 2, 'clarity')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 2, 'clarity', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5].map(score => (
                              <option key={score} value={score}>{score}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <select
                            value={getEvaluationValue(participant.id, 2, 'independence')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 2, 'independence', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option value="">-</option>
                            {[1, 2, 3, 4, 5].map(score => (
                              <option key={score} value={score}>{score}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <textarea
                            value={getEvaluationValue(participant.id, 2, 'comments')}
                            onChange={(e) => handleCaseEvaluationChange(participant.id, 2, 'comments', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            rows={2}
                            placeholder="Комментарии..."
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'project' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-emerald-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">Оценка защиты проектов</h2>
              <p className="text-emerald-100 text-sm mt-1">Критерии оценки от 1 до 5 баллов</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">№ п/п</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Фото участника</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ф.И.О. резервиста, должность, филиал</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Качество презентации</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Инновационность проекта</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Техническая реализация</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Бизнес-ценность</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Комментарии</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant, index) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          {participant.dossier?.photo_url ? (
                            <img
                              src={participant.dossier.photo_url}
                              alt={participant.user.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="font-medium">{participant.user.full_name}</div>
                        <div className="text-gray-500">{participant.user.position?.name || 'Должность не указана'}</div>
                        <div className="text-gray-500">{participant.user.territory?.name || 'Филиал не указан'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getProjectEvaluationValue(participant.id, 'presentation_quality')}
                          onChange={(e) => handleProjectEvaluationChange(participant.id, 'presentation_quality', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getProjectEvaluationValue(participant.id, 'project_innovation')}
                          onChange={(e) => handleProjectEvaluationChange(participant.id, 'project_innovation', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getProjectEvaluationValue(participant.id, 'technical_implementation')}
                          onChange={(e) => handleProjectEvaluationChange(participant.id, 'technical_implementation', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getProjectEvaluationValue(participant.id, 'business_value')}
                          onChange={(e) => handleProjectEvaluationChange(participant.id, 'business_value', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={getProjectEvaluationValue(participant.id, 'comments')}
                          onChange={(e) => handleProjectEvaluationChange(participant.id, 'comments', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          rows={2}
                          placeholder="Комментарии..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'competencies' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-emerald-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">Бланк экспертной оценки управленческих компетенций</h2>
              <p className="text-emerald-100 text-sm mt-1">Оценка от 1 до 5 баллов по каждой компетенции</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">№ п/п</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Фото участника</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ф.И.О. резервиста, должность, филиал</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ориентация на результат</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Эффективная коммуникация</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Умение работать в команде</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Системное мышление</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Комментарии</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant, index) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          {participant.dossier?.photo_url ? (
                            <img
                              src={participant.dossier.photo_url}
                              alt={participant.user.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="font-medium">{participant.user.full_name}</div>
                        <div className="text-gray-500">{participant.user.position?.name || 'Должность не указана'}</div>
                        <div className="text-gray-500">{participant.user.territory?.name || 'Филиал не указан'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getCompetencyEvaluationValue(participant.id, 'results_orientation')}
                          onChange={(e) => handleCompetencyEvaluationChange(participant.id, 'results_orientation', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getCompetencyEvaluationValue(participant.id, 'effective_communication')}
                          onChange={(e) => handleCompetencyEvaluationChange(participant.id, 'effective_communication', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getCompetencyEvaluationValue(participant.id, 'teamwork_skills')}
                          onChange={(e) => handleCompetencyEvaluationChange(participant.id, 'teamwork_skills', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <select
                          value={getCompetencyEvaluationValue(participant.id, 'systemic_thinking')}
                          onChange={(e) => handleCompetencyEvaluationChange(participant.id, 'systemic_thinking', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-</option>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(score => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={getCompetencyEvaluationValue(participant.id, 'comments')}
                          onChange={(e) => handleCompetencyEvaluationChange(participant.id, 'comments', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          rows={2}
                          placeholder="Комментарии..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Кнопка сохранения */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              // Здесь будет логика сохранения оценок
              console.log('Сохранение оценок...', { caseEvaluations, projectEvaluations, competencyEvaluations });
            }}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            Сохранить оценки
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservistEvaluationPage;
