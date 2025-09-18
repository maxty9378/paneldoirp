import React, { useState, useEffect } from 'react';
import { Star, Users, Target, Award, TrendingUp, MessageSquare, Calendar, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
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
  const { userProfile } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [caseEvaluations, setCaseEvaluations] = useState<CaseEvaluation[]>([]);
  const [diagnosticGameEvaluations, setDiagnosticGameEvaluations] = useState<DiagnosticGameEvaluation[]>([]);
  const [projectDefenseEvaluations, setProjectDefenseEvaluations] = useState<ProjectDefenseEvaluation[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для редактирования
  const [editingEvaluation, setEditingEvaluation] = useState<{
    type: 'case' | 'project' | 'diagnostic';
    id: string;
    participantId: string;
    evaluatorId: string;
    caseNumber?: number;
  } | null>(null);
  const [editScores, setEditScores] = useState<{[key: string]: number}>({});
  const [editComments, setEditComments] = useState<string>('');

  useEffect(() => {
    fetchEvaluationData();
  }, [examEventId]);

  const fetchEvaluationData = async () => {
    try {
      console.log('Начинаем загрузку данных оценок...');
      console.log('examEventId:', examEventId);
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
      console.log('Загружаем оценки кейсов для examEventId:', examEventId);
      const { data: caseData, error: caseError } = await supabase
        .from('case_evaluations')
        .select('*')
        .eq('exam_event_id', examEventId);

      if (caseError) {
        console.warn('Ошибка загрузки оценок кейсов:', caseError);
        setCaseEvaluations([]);
      } else {
        setCaseEvaluations(caseData || []);
        console.log('Оценки кейсов загружены:', caseData?.length || 0);
      }

      // Загружаем оценки диагностической игры
      console.log('Загружаем оценки диагностической игры для examEventId:', examEventId);
      const { data: diagnosticData, error: diagnosticError } = await supabase
        .from('diagnostic_game_evaluations')
        .select('*')
        .eq('exam_event_id', examEventId);

      if (diagnosticError) {
        console.warn('Ошибка загрузки оценок диагностической игры:', diagnosticError);
        setDiagnosticGameEvaluations([]);
      } else {
        setDiagnosticGameEvaluations(diagnosticData || []);
        console.log('Оценки диагностической игры загружены:', diagnosticData?.length || 0);
      }

      // Загружаем оценки защиты проектов
      console.log('Загружаем оценки защиты проектов для examEventId:', examEventId);
      const { data: projectData, error: projectError } = await supabase
        .from('project_defense_evaluations')
        .select('*')
        .eq('exam_event_id', examEventId);

      if (projectError) {
        console.warn('Ошибка загрузки оценок защиты проектов:', projectError);
        setProjectDefenseEvaluations([]);
      } else {
        setProjectDefenseEvaluations(projectData || []);
      console.log('Оценки защиты проектов загружены:', projectData?.length || 0);
      if (projectData && projectData.length > 0) {
        console.log('Пример оценки защиты проектов:', JSON.stringify(projectData[0], null, 2));
        console.log('Все ID оценок защиты проектов:', projectData.map(p => p.id));
        console.log('Ищем запись с ID 9e171321-002a-4626-8b46-a2482a94f6c5:', 
          projectData.find(p => p.id === '9e171321-002a-4626-8b46-a2482a94f6c5'));
      }
      }

    } catch (err) {
      console.error('Ошибка загрузки данных оценок:', err);
      setError('Ошибка загрузки данных оценок');
    } finally {
      console.log('Загрузка данных оценок завершена');
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

  // Функции для управления оценками
  const startEditing = (evaluation: any, type: 'case' | 'project' | 'diagnostic') => {
    console.log('Начинаем редактирование оценки:', {
      evaluationId: evaluation.id,
      type,
      evaluation: evaluation
    });
    
    setEditingEvaluation({
      type,
      id: evaluation.id,
      participantId: evaluation.reservist_id,
      evaluatorId: evaluation.evaluator_id,
      caseNumber: evaluation.case_number
    });
    
    if (type === 'case') {
      setEditScores({
        correctness: evaluation.criteria_scores.correctness,
        clarity: evaluation.criteria_scores.clarity,
        independence: evaluation.criteria_scores.independence
      });
    } else if (type === 'project') {
      setEditScores({
        goal_achievement: evaluation.criteria_scores.goal_achievement,
        topic_development: evaluation.criteria_scores.topic_development,
        document_quality: evaluation.criteria_scores.document_quality
      });
    } else if (type === 'diagnostic') {
      setEditScores({
        results_orientation: evaluation.competency_scores.results_orientation,
        effective_communication: evaluation.competency_scores.effective_communication,
        teamwork_skills: evaluation.competency_scores.teamwork_skills,
        systemic_thinking: evaluation.competency_scores.systemic_thinking
      });
    }
    
    setEditComments(evaluation.comments || '');
  };

  const cancelEditing = () => {
    setEditingEvaluation(null);
    setEditScores({});
    setEditComments('');
  };

  const saveEvaluation = async () => {
    if (!editingEvaluation) return;

    try {
      const tableName = editingEvaluation.type === 'case' ? 'case_evaluations' :
                       editingEvaluation.type === 'project' ? 'project_defense_evaluations' :
                       'diagnostic_game_evaluations';

      const updateData: any = {
        comments: editComments
      };

      if (editingEvaluation.type === 'case') {
        updateData.criteria_scores = {
          correctness: editScores.correctness,
          clarity: editScores.clarity,
          independence: editScores.independence
        };
      } else if (editingEvaluation.type === 'project') {
        updateData.criteria_scores = {
          goal_achievement: editScores.goal_achievement,
          topic_development: editScores.topic_development,
          document_quality: editScores.document_quality
        };
      } else if (editingEvaluation.type === 'diagnostic') {
        updateData.competency_scores = {
          results_orientation: editScores.results_orientation,
          effective_communication: editScores.effective_communication,
          teamwork_skills: editScores.teamwork_skills,
          systemic_thinking: editScores.systemic_thinking
        };
      }

      console.log('Сохранение оценки:', {
        tableName,
        evaluationId: editingEvaluation.id,
        updateData
      });
      
      // Детальная отладка данных
      console.log('Детали updateData:', JSON.stringify(updateData, null, 2));
      console.log('Тип оценки:', editingEvaluation.type);
      console.log('Текущие editScores:', editScores);

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', editingEvaluation.id);

      console.log('Результат обновления:', { error });

      if (error) {
        console.error('Ошибка Supabase:', error);
        throw error;
      }

      console.log('Оценка успешно обновлена в базе данных');

      // Проверим конкретную запись после обновления
      const { data: checkRecord } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', editingEvaluation.id);
      console.log('Проверка обновленной записи:', checkRecord);
      console.log('ID обновленной записи:', editingEvaluation.id);
      console.log('Содержимое обновленной записи:', JSON.stringify(checkRecord, null, 2));

      console.log('Оценка успешно сохранена, обновляем данные...');
      
      // Небольшая задержка для синхронизации с базой данных
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Обновляем локальное состояние
      await fetchEvaluationData();
      cancelEditing();
      
      console.log('Данные обновлены, модальное окно закрыто');
    } catch (err) {
      console.error('Ошибка сохранения оценки:', err);
      setError(`Не удалось сохранить оценку: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const deleteEvaluation = async (evaluationId: string, type: 'case' | 'project' | 'diagnostic') => {
    if (!confirm('Вы уверены, что хотите удалить эту оценку?')) return;

    try {
      const tableName = type === 'case' ? 'case_evaluations' :
                       type === 'project' ? 'project_defense_evaluations' :
                       'diagnostic_game_evaluations';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', evaluationId);

      if (error) throw error;

      // Обновляем локальное состояние
      await fetchEvaluationData();
    } catch (err) {
      console.error('Ошибка удаления оценки:', err);
      setError('Не удалось удалить оценку');
    }
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
    const found = evaluations.filter(evaluation => 
      evaluation.reservist_id === participantId && evaluation.evaluator_id === evaluatorId
    );
    
    // Отладка для конкретной записи
    if (evaluatorId === 'f10774ae-754d-4b44-92a4-a57a2ece733c') {
      console.log('Ищем оценки для участника:', participantId, 'эксперта:', evaluatorId);
      console.log('Все оценки:', evaluations.map(e => ({
        id: e.id,
        reservist_id: e.reservist_id,
        evaluator_id: e.evaluator_id,
        criteria_scores: e.criteria_scores
      })));
      console.log('Найдено оценок:', found.length);
      if (found.length > 0) {
        console.log('Первая найденная оценка:', found[0]);
      }
    }
    
    return found;
  };

  // Компонент для редактирования оценок
  const renderEditModal = () => {
    if (!editingEvaluation) return null;

    const getScoreInputs = () => {
      if (editingEvaluation.type === 'case') {
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Правильность</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.correctness || ''}
                onChange={(e) => setEditScores({...editScores, correctness: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ясность</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.clarity || ''}
                onChange={(e) => setEditScores({...editScores, clarity: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Самостоятельность</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.independence || ''}
                onChange={(e) => setEditScores({...editScores, independence: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      } else if (editingEvaluation.type === 'project') {
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Достижение цели</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.goal_achievement || ''}
                onChange={(e) => setEditScores({...editScores, goal_achievement: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Развитие темы</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.topic_development || ''}
                onChange={(e) => setEditScores({...editScores, topic_development: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Качество документа</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.document_quality || ''}
                onChange={(e) => setEditScores({...editScores, document_quality: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      } else if (editingEvaluation.type === 'diagnostic') {
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ориентация на результат</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.results_orientation || ''}
                onChange={(e) => setEditScores({...editScores, results_orientation: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Эффективная коммуникация</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.effective_communication || ''}
                onChange={(e) => setEditScores({...editScores, effective_communication: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Навыки командной работы</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.teamwork_skills || ''}
                onChange={(e) => setEditScores({...editScores, teamwork_skills: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Системное мышление</label>
              <input
                type="number"
                min="1"
                max="5"
                value={editScores.systemic_thinking || ''}
                onChange={(e) => setEditScores({...editScores, systemic_thinking: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Редактирование оценки
            </h3>
            <button
              onClick={cancelEditing}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
                <div className="space-y-4">
            {getScoreInputs()}
            
                          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарии</label>
              <textarea
                value={editComments}
                onChange={(e) => setEditComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите комментарии к оценке..."
              />
                          </div>
                        </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelEditing}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={saveEvaluation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </button>
                          </div>
                          </div>
                        </div>
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
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-gray-500 text-xs">
                                  Кейс {evaluation.case_number}
                                </div>
                                {userProfile?.role === 'administrator' && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => startEditing(evaluation, 'case')}
                                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                      title="Редактировать оценку"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteEvaluation(evaluation.id, 'case')}
                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                      title="Удалить оценку"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                          </div>
                        )}
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
                  
                  // Отладка для конкретной записи
                  if (evaluator.id === 'f10774ae-754d-4b44-92a4-a57a2ece733c' && participant.id === 'dfcee232-69ee-4ddf-a561-8f2b6e244edd') {
                    console.log('Отображение в таблице для участника:', participant.id, 'эксперта:', evaluator.id);
                    console.log('Найдено оценок:', evaluations.length);
                    if (evaluations.length > 0) {
                      console.log('Отображаем оценку:', evaluations[0]);
                    }
                  }
                  
                  return (
                    <td key={evaluator.id} className="px-1 py-2 text-center">
                      {evaluations.length > 0 ? (
                        <div className="space-y-1">
                          {evaluations.map((evaluation, index) => (
                            <div key={evaluation.id} className="text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-gray-500 text-xs">
                                  Защита проекта
                                </div>
                                {userProfile?.role === 'administrator' && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => startEditing(evaluation, 'project')}
                                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                      title="Редактировать оценку"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteEvaluation(evaluation.id, 'project')}
                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                      title="Удалить оценку"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
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
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-gray-500 text-xs">
                                  Диагностическая игра
                                </div>
                                {userProfile?.role === 'administrator' && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => startEditing(evaluation, 'diagnostic')}
                                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                      title="Редактировать оценку"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteEvaluation(evaluation.id, 'diagnostic')}
                                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                      title="Удалить оценку"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
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
      
      {/* Модальное окно для редактирования оценок */}
      {renderEditModal()}
    </div>
  );
};

export default ExpertEvaluationResults;
