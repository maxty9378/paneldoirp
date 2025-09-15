import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Target, User, Star, Award, FileText, Presentation, Gamepad2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import MobileExamNavigation from './MobileExamNavigation';

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
  const [projectEvaluations, setProjectEvaluations] = useState<ProjectEvaluation[]>([]);
  const [competencyEvaluations, setCompetencyEvaluations] = useState<CompetencyEvaluation[]>([]);

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
        .from('exam_events')
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
    <div className="min-h-screen bg-gray-50">
      {/* Мобильная навигация */}
      <MobileExamNavigation />

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Заголовок */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/exam')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад к экзаменам</span>
          </button>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
                <p className="text-gray-600 mb-4">{event.description}</p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{participants.length} участников</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Табы для этапов оценки */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('cases')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'cases'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Защита кейсов
                </div>
              </button>
              <button
                onClick={() => setActiveTab('project')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'project'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Presentation className="w-5 h-5" />
                  Защита проекта
                </div>
              </button>
              <button
                onClick={() => setActiveTab('competencies')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'competencies'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Диагностическая игра
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Контент в зависимости от активного таба */}
        {activeTab === 'cases' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-emerald-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">Итоговые результаты решения кейсов для экспертов</h2>
              <p className="text-emerald-100 text-sm mt-1">Критерии оценки от 1 до 5 баллов</p>
            </div>
            
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
