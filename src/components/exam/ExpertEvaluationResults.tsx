import React, { useState, useEffect } from 'react';
import { Star, Users, Target, Award, TrendingUp, MessageSquare, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import '../../styles/scrollbar.css';

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

      // Загружаем всех экспертов из базы данных
      const { data: expertsData, error: expertsError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'expert');

      if (expertsError) {
        console.warn('Ошибка загрузки экспертов:', expertsError);
        setEvaluators([]);
      } else {
        setEvaluators(expertsData || []);
      }

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

  // Функция для получения всех уникальных экспертов по этапу
  const getUniqueEvaluatorsForStage = (evaluations: any[]) => {
    return Array.from(new Set(evaluations.map(evaluation => evaluation.evaluator_id)));
  };

  // Функция для получения оценок участника от конкретного эксперта
  const getParticipantEvaluationsByExpert = (evaluations: any[], participantId: string, evaluatorId: string) => {
    return evaluations.filter(evaluation => 
      evaluation.reservist_id === participantId && evaluation.evaluator_id === evaluatorId
    );
  };

  // Функция для рендера таблицы оценок кейсов
  const renderCaseEvaluationsTable = () => {
    if (evaluators.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>Эксперты не найдены</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg" style={{ minWidth: `${evaluators.length * 120 + 180}px` }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-b border-gray-200 w-36 sticky left-0 bg-gray-50 z-20 shadow-sm">
                Участник
              </th>
              {evaluators.map(evaluator => (
                <th key={evaluator.id} className="px-2 py-2 text-center text-xs font-semibold text-gray-900 border-b border-gray-200 min-w-24">
                  <div className="text-center">
                    <div className="font-medium text-xs truncate" title={evaluator.full_name}>{evaluator.full_name}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {participants.map(participant => (
              <tr key={participant.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10 shadow-sm">
                  <div>
                    <div className="text-xs font-medium text-gray-900 truncate" title={participant.full_name}>{participant.full_name}</div>
                    <div className="text-xs text-gray-500">{participant.sap_number}</div>
                  </div>
                </td>
                {evaluators.map(evaluator => {
                  const evaluations = getParticipantEvaluationsByExpert(caseEvaluations, participant.id, evaluator.id);
                  return (
                    <td key={evaluator.id} className="px-1 py-2 text-center">
                      {evaluations.length > 0 ? (
                        <div className="space-y-1">
                          {evaluations.map((evaluation, index) => (
                            <div key={evaluation.id} className="text-xs">
                              <div className="text-gray-500 mb-1 text-xs">
                                Кейс {evaluation.case_number}
                              </div>
                              <div className="flex justify-center space-x-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.criteria_scores.correctness)}`}>
                                  {evaluation.criteria_scores.correctness}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.criteria_scores.clarity)}`}>
                                  {evaluation.criteria_scores.clarity}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.criteria_scores.independence)}`}>
                                  {evaluation.criteria_scores.independence}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs">
                            <div className="text-gray-400 mb-1 text-xs">Кейс 1</div>
                            <div className="flex justify-center space-x-0.5">
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                                0
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                                0
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                                0
                              </span>
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="text-gray-400 mb-1 text-xs">Кейс 2</div>
                            <div className="flex justify-center space-x-0.5">
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                                0
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                                0
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                                0
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Функция для рендера таблицы оценок защиты проектов
  const renderProjectDefenseTable = () => {
    if (evaluators.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Award className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>Эксперты не найдены</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg" style={{ minWidth: `${evaluators.length * 120 + 180}px` }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-b border-gray-200 w-36 sticky left-0 bg-gray-50 z-20 shadow-sm">
                Участник
              </th>
              {evaluators.map(evaluator => (
                <th key={evaluator.id} className="px-2 py-2 text-center text-xs font-semibold text-gray-900 border-b border-gray-200 min-w-24">
                  <div className="text-center">
                    <div className="font-medium text-xs truncate" title={evaluator.full_name}>{evaluator.full_name}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {participants.map(participant => (
              <tr key={participant.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10 shadow-sm">
                  <div>
                    <div className="text-xs font-medium text-gray-900 truncate" title={participant.full_name}>{participant.full_name}</div>
                    <div className="text-xs text-gray-500">{participant.sap_number}</div>
                  </div>
                </td>
                {evaluators.map(evaluator => {
                  const evaluations = getParticipantEvaluationsByExpert(projectDefenseEvaluations, participant.id, evaluator.id);
                  return (
                    <td key={evaluator.id} className="px-1 py-2 text-center">
                      {evaluations.length > 0 ? (
                        <div className="space-y-1">
                          {evaluations.map((evaluation, index) => (
                            <div key={evaluation.id} className="text-xs">
                              <div className="flex justify-center space-x-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.criteria_scores.goal_achievement)}`}>
                                  {evaluation.criteria_scores.goal_achievement}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.criteria_scores.topic_development)}`}>
                                  {evaluation.criteria_scores.topic_development}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.criteria_scores.document_quality)}`}>
                                  {evaluation.criteria_scores.document_quality}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-0.5">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            0
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            0
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            0
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Функция для рендера таблицы оценок диагностической игры
  const renderDiagnosticGameTable = () => {
    if (evaluators.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>Эксперты не найдены</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg" style={{ minWidth: `${evaluators.length * 120 + 180}px` }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-b border-gray-200 w-36 sticky left-0 bg-gray-50 z-20 shadow-sm">
                Участник
              </th>
              {evaluators.map(evaluator => (
                <th key={evaluator.id} className="px-2 py-2 text-center text-xs font-semibold text-gray-900 border-b border-gray-200 min-w-24">
                  <div className="text-center">
                    <div className="font-medium text-xs truncate" title={evaluator.full_name}>{evaluator.full_name}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {participants.map(participant => (
              <tr key={participant.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10 shadow-sm">
                  <div>
                    <div className="text-xs font-medium text-gray-900 truncate" title={participant.full_name}>{participant.full_name}</div>
                    <div className="text-xs text-gray-500">{participant.sap_number}</div>
                  </div>
                </td>
                {evaluators.map(evaluator => {
                  const evaluations = getParticipantEvaluationsByExpert(diagnosticGameEvaluations, participant.id, evaluator.id);
                  return (
                    <td key={evaluator.id} className="px-1 py-2 text-center">
                      {evaluations.length > 0 ? (
                        <div className="space-y-1">
                          {evaluations.map((evaluation, index) => (
                            <div key={evaluation.id} className="text-xs">
                              <div className="flex justify-center space-x-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.competency_scores.results_orientation)}`}>
                                  {evaluation.competency_scores.results_orientation}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.competency_scores.effective_communication)}`}>
                                  {evaluation.competency_scores.effective_communication}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.competency_scores.teamwork_skills)}`}>
                                  {evaluation.competency_scores.teamwork_skills}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getScoreColor(evaluation.competency_scores.systemic_thinking)}`}>
                                  {evaluation.competency_scores.systemic_thinking}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-0.5">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            0
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            0
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            0
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            0
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Award className="mr-3 text-[#06A478]" />
          Результаты оценки экспертов
        </h2>

        {/* Этап 1: Решение кейсов */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <MessageSquare className="mr-3 text-[#06A478]" />
            Этап 1: Решение кейсов
          </h3>
          <p className="text-sm text-gray-600 mb-4">Оценка решения прикладных кейсов по критериям: правильность, ясность, самостоятельность</p>
          {renderCaseEvaluationsTable()}
        </div>

        {/* Этап 2: Защита проектов */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="mr-3 text-[#06A478]" />
            Этап 2: Защита проектов
          </h3>
          <p className="text-sm text-gray-600 mb-4">Оценка презентации и защиты проектов по критериям: достижение цели, проработка темы, качество документов</p>
          {renderProjectDefenseTable()}
        </div>

        {/* Этап 3: Диагностическая игра */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="mr-3 text-[#06A478]" />
            Этап 3: Диагностическая игра
          </h3>
          <p className="text-sm text-gray-600 mb-4">Оценка управленческих компетенций: ориентация на результат, эффективная коммуникация, навыки командной работы, системное мышление</p>
          {renderDiagnosticGameTable()}
        </div>

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
