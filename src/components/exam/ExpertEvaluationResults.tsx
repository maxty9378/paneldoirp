import React, { useState, useEffect } from 'react';
import { Star, Users, Target, Award, TrendingUp, MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Participant {
  id: string;
  full_name: string;
  email: string;
  sap_number: string;
  position?: { name: string };
  territory?: { name: string };
}

interface Evaluator {
  id: string;
  full_name: string;
  email: string;
}


interface CaseEvaluation {
  id: string;
  reservist_id: string;
  evaluator_id: string;
  case_number: number;
  criteria_scores: {
    correctness: number;
    clarity: number;
    independence: number;
  };
  comments?: string;
  created_at: string;
}

interface DiagnosticGameEvaluation {
  id: string;
  reservist_id: string;
  evaluator_id: string;
  competency_scores: {
    results_orientation: number;
    effective_communication: number;
    teamwork_skills: number;
    systemic_thinking: number;
  };
  comments?: string;
  created_at: string;
}

interface ProjectDefenseEvaluation {
  id: string;
  reservist_id: string;
  evaluator_id: string;
  presentation_number: number;
  criteria_scores: {
    goal_achievement: number;
    topic_development: number;
    document_quality: number;
  };
  comments?: string;
  created_at: string;
}

interface ExpertEvaluationResultsProps {
  examEventId: string;
}

const ExpertEvaluationResults: React.FC<ExpertEvaluationResultsProps> = ({ examEventId }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [caseEvaluations, setCaseEvaluations] = useState<CaseEvaluation[]>([]);
  const [diagnosticGameEvaluations, setDiagnosticGameEvaluations] = useState<DiagnosticGameEvaluation[]>([]);
  const [projectDefenseEvaluations, setProjectDefenseEvaluations] = useState<ProjectDefenseEvaluation[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvaluationData();
  }, [examEventId]);

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем участников экзамена
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          user_id,
          user:users(
            id,
            full_name,
            email,
            sap_number,
            position:positions(name),
            territory:territories(name)
          )
        `)
        .eq('event_id', examEventId);

      if (participantsError) throw participantsError;

      const participantsList = participantsData?.map(p => ({
        id: p.user.id,
        full_name: p.user.full_name,
        email: p.user.email,
        sap_number: p.user.sap_number,
        position: p.user.position,
        territory: p.user.territory
      })) || [];

      setParticipants(participantsList);

      // Пропускаем загрузку оценок ТП - этот блок не используется

      // Загружаем оценки кейсов
      const { data: caseData, error: caseError } = await supabase
        .from('case_evaluations')
        .select('*')
        .eq('exam_event_id', examEventId);

      if (caseError) {
        console.warn('Ошибка загрузки оценок кейсов:', caseError);
        setCaseEvaluations([]);
      } else {
        setCaseEvaluations(caseData || []);
      }

      // Загружаем оценки диагностической игры
      const { data: diagnosticData, error: diagnosticError } = await supabase
        .from('diagnostic_game_evaluations')
        .select('*')
        .eq('exam_event_id', examEventId);

      if (diagnosticError) {
        console.warn('Ошибка загрузки оценок диагностической игры:', diagnosticError);
        setDiagnosticGameEvaluations([]);
      } else {
        setDiagnosticGameEvaluations(diagnosticData || []);
      }

      // Загружаем оценки защиты проектов
      const { data: projectData, error: projectError } = await supabase
        .from('project_defense_evaluations')
        .select('*')
        .eq('exam_event_id', examEventId);

      if (projectError) {
        console.warn('Ошибка загрузки оценок защиты проектов:', projectError);
        setProjectDefenseEvaluations([]);
      } else {
        setProjectDefenseEvaluations(projectData || []);
      }

      // Загружаем данные экспертов
      const allEvaluatorIds = new Set<string>();
      [...(caseData || []), ...(diagnosticData || []), ...(projectData || [])]
        .forEach(evaluation => {
          if (evaluation.evaluator_id) {
            allEvaluatorIds.add(evaluation.evaluator_id);
          }
        });

      if (allEvaluatorIds.size > 0) {
        const { data: evaluatorsData, error: evaluatorsError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', Array.from(allEvaluatorIds));

        if (evaluatorsError) {
          console.warn('Ошибка загрузки данных экспертов:', evaluatorsError);
          setEvaluators([]);
        } else {
          setEvaluators(evaluatorsData || []);
        }
      }

    } catch (err) {
      console.error('Ошибка загрузки данных оценок:', err);
      setError('Ошибка загрузки данных оценок');
    } finally {
      setLoading(false);
    }
  };

  const getEvaluatorById = (evaluatorId: string): Evaluator | undefined => {
    return evaluators.find(evaluator => evaluator.id === evaluatorId);
  };

  // Функция для получения итоговой оценки эксперта (последняя по времени)
  const getLatestEvaluation = (evaluations: any[], participantId: string, evaluatorId: string) => {
    return evaluations
      .filter(evaluation => 
        (evaluation.participant_id === participantId || evaluation.reservist_id === participantId) && 
        evaluation.evaluator_id === evaluatorId
      )
      .sort((a, b) => new Date(b.evaluated_at || b.created_at).getTime() - new Date(a.evaluated_at || a.created_at).getTime())[0];
  };

  const getScoreColor = (score: number, maxScore: number = 5) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Загрузка результатов оценок...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 mr-2">⚠️</div>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Award className="mr-3 text-blue-600" />
          Результаты оценки экспертов
        </h2>

        {participants.map((participant) => (
          <div key={participant.id} className="mb-8 border-b border-gray-100 pb-8 last:border-b-0">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {participant.full_name}
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Email:</strong> {participant.email}</p>
                <p><strong>SAP номер:</strong> {participant.sap_number}</p>
                {participant.position && <p><strong>Должность:</strong> {participant.position.name}</p>}
                {participant.territory && <p><strong>Территория:</strong> {participant.territory.name}</p>}
              </div>
            </div>

            {/* Блок 1: Оценки кейсов */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <MessageSquare className="mr-2 text-blue-600" />
                Блок 1: Оценки решения кейсов
              </h4>
              
              {caseEvaluations.filter(evaluation => evaluation.reservist_id === participant.id).length > 0 ? (
                <div className="space-y-4">
                  {caseEvaluations
                    .filter(evaluation => evaluation.reservist_id === participant.id)
                    .map((evaluation) => (
                      <div key={evaluation.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              Эксперт: {getEvaluatorById(evaluation.evaluator_id)?.full_name || 'Неизвестный эксперт'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Кейс №{evaluation.case_number}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(evaluation.created_at).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-blue-600">
                              {((evaluation.criteria_scores.correctness + evaluation.criteria_scores.clarity + evaluation.criteria_scores.independence) / 3).toFixed(2)}/5.0
                            </span>
                            <p className="text-sm text-gray-600">Средняя оценка</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Правильность</p>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getScoreColor(evaluation.criteria_scores.correctness)}`}>
                              {evaluation.criteria_scores.correctness}/5
                            </span>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Ясность</p>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getScoreColor(evaluation.criteria_scores.clarity)}`}>
                              {evaluation.criteria_scores.clarity}/5
                            </span>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Самостоятельность</p>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getScoreColor(evaluation.criteria_scores.independence)}`}>
                              {evaluation.criteria_scores.independence}/5
                            </span>
                          </div>
                        </div>

                        {evaluation.comments && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                            <p className="text-sm text-blue-800">
                              <strong>Комментарии:</strong> {evaluation.comments}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Оценки кейсов не найдены</p>
              )}
            </div>

            {/* Блок 2: Оценки диагностической игры */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="mr-2 text-purple-600" />
                Блок 2: Оценки диагностической игры
              </h4>
              
              {(() => {
                // Получаем уникальных экспертов для этого участника
                const uniqueEvaluators = Array.from(
                  new Set(
                    diagnosticGameEvaluations
                      .filter(evaluation => evaluation.reservist_id === participant.id)
                      .map(evaluation => evaluation.evaluator_id)
                  )
                );

                if (uniqueEvaluators.length === 0) return null;

                return (
                  <div className="space-y-4">
                    {uniqueEvaluators.map((evaluatorId) => {
                      const latestEvaluation = getLatestEvaluation(diagnosticGameEvaluations, participant.id, evaluatorId);
                      if (!latestEvaluation) return null;

                      return (
                        <div key={`${participant.id}-${evaluatorId}`} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                Эксперт: {getEvaluatorById(evaluatorId)?.full_name || 'Неизвестный эксперт'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(latestEvaluation.created_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-blue-600">
                                {((latestEvaluation.competency_scores.results_orientation + latestEvaluation.competency_scores.effective_communication + latestEvaluation.competency_scores.teamwork_skills + latestEvaluation.competency_scores.systemic_thinking) / 4).toFixed(2)}/5.0
                              </span>
                              <p className="text-sm text-gray-600">Средняя оценка</p>
                            </div>
                          </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Ориентация на результат:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(latestEvaluation.competency_scores.results_orientation)}`}>
                                {latestEvaluation.competency_scores.results_orientation}/5
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Эффективная коммуникация:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(latestEvaluation.competency_scores.effective_communication)}`}>
                                {latestEvaluation.competency_scores.effective_communication}/5
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Навыки командной работы:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(latestEvaluation.competency_scores.teamwork_skills)}`}>
                                {latestEvaluation.competency_scores.teamwork_skills}/5
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Системное мышление:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(latestEvaluation.competency_scores.systemic_thinking)}`}>
                                {latestEvaluation.competency_scores.systemic_thinking}/5
                              </span>
                            </div>
                          </div>
                        </div>

                          {latestEvaluation.comments && (
                            <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                              <p className="text-sm text-blue-800">
                                <strong>Комментарии:</strong> {latestEvaluation.comments}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Блок 3: Оценки защиты проектов */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Award className="mr-2 text-orange-600" />
                Блок 3: Оценки защиты проектов
              </h4>
              
              {(() => {
                // Получаем уникальных экспертов для этого участника
                const uniqueEvaluators = Array.from(
                  new Set(
                    projectDefenseEvaluations
                      .filter(evaluation => evaluation.reservist_id === participant.id)
                      .map(evaluation => evaluation.evaluator_id)
                  )
                );

                if (uniqueEvaluators.length === 0) return null;

                return (
                  <div className="space-y-4">
                    {uniqueEvaluators.map((evaluatorId) => {
                      const latestEvaluation = getLatestEvaluation(projectDefenseEvaluations, participant.id, evaluatorId);
                      if (!latestEvaluation) return null;

                      return (
                        <div key={`${participant.id}-${evaluatorId}`} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                Эксперт: {getEvaluatorById(evaluatorId)?.full_name || 'Неизвестный эксперт'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Выступление №{latestEvaluation.presentation_number}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(latestEvaluation.created_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-blue-600">
                                {((latestEvaluation.criteria_scores.goal_achievement + latestEvaluation.criteria_scores.topic_development + latestEvaluation.criteria_scores.document_quality) / 3).toFixed(2)}/5.0
                              </span>
                              <p className="text-sm text-gray-600">Средняя оценка</p>
                            </div>
                          </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Достижение цели</p>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getScoreColor(latestEvaluation.criteria_scores.goal_achievement)}`}>
                              {latestEvaluation.criteria_scores.goal_achievement}/5
                            </span>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Проработка темы</p>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getScoreColor(latestEvaluation.criteria_scores.topic_development)}`}>
                              {latestEvaluation.criteria_scores.topic_development}/5
                            </span>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Качество документов</p>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getScoreColor(latestEvaluation.criteria_scores.document_quality)}`}>
                              {latestEvaluation.criteria_scores.document_quality}/5
                            </span>
                          </div>
                        </div>

                          {latestEvaluation.comments && (
                            <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                              <p className="text-sm text-blue-800">
                                <strong>Комментарии:</strong> {latestEvaluation.comments}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}

        {participants.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Участники экзамена не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertEvaluationResults;
