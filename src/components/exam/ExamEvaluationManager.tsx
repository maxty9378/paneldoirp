import React, { useState, useEffect } from 'react';
import { Star, Users, Target, CheckCircle, XCircle, Edit, Save, X } from 'lucide-react';
import { ExamEvaluation, EvaluationScores, ExamStage, EXAM_STAGES, DEFAULT_EVALUATION_CRITERIA } from '../../types/exam';
import { supabase } from '../../lib/supabase';

interface ExamEvaluationManagerProps {
  examEventId: string;
  onEvaluationChange?: () => void;
}

export function ExamEvaluationManager({ examEventId, onEvaluationChange }: ExamEvaluationManagerProps) {
  const [evaluations, setEvaluations] = useState<ExamEvaluation[]>([]);
  const [reservists, setReservists] = useState<any[]>([]);
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEvaluation, setEditingEvaluation] = useState<ExamEvaluation | null>(null);
  const [selectedStage, setSelectedStage] = useState<ExamStage['id']>('case_defense');

  // Загрузка оценок
  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exam_evaluations')
        .select(`
          *,
          reservist:reservist_id (
            id,
            first_name,
            last_name,
            email
          ),
          evaluator:evaluator_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('exam_event_id', examEventId);

      if (error) throw error;
      setEvaluations(data || []);
    } catch (err) {
      console.error('Error fetching evaluations:', err);
      setError('Ошибка загрузки оценок');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка резервистов
  const fetchReservists = async () => {
    try {
      const { data, error } = await supabase
        .from('reservist_dossiers')
        .select(`
          user_id,
          users:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('exam_event_id', examEventId);

      if (error) throw error;
      setReservists(data?.map(d => d.users).filter(Boolean) || []);
    } catch (err) {
      console.error('Error fetching reservists:', err);
    }
  };

  // Загрузка экспертов
  const fetchEvaluators = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('role', ['administrator', 'moderator', 'trainer'])
        .order('first_name');

      if (error) throw error;
      setEvaluators(data || []);
    } catch (err) {
      console.error('Error fetching evaluators:', err);
    }
  };

  // Сохранение оценки
  const saveEvaluation = async (evaluation: Partial<ExamEvaluation>) => {
    try {
      if (editingEvaluation?.id) {
        // Обновление существующего
        const { error } = await supabase
          .from('exam_evaluations')
          .update(evaluation)
          .eq('id', editingEvaluation.id);

        if (error) throw error;
      } else {
        // Создание нового
        const { error } = await supabase
          .from('exam_evaluations')
          .insert([{ ...evaluation, exam_event_id: examEventId }]);

        if (error) throw error;
      }

      setEditingEvaluation(null);
      fetchEvaluations();
      onEvaluationChange?.();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      setError('Ошибка сохранения оценки');
    }
  };

  // Получение информации об этапе
  const getStageInfo = (stageId: string): ExamStage | undefined => {
    return EXAM_STAGES.find(stage => stage.id === stageId);
  };

  // Получение критериев для этапа
  const getStageCriteria = (stageId: string) => {
    return DEFAULT_EVALUATION_CRITERIA[stageId as keyof typeof DEFAULT_EVALUATION_CRITERIA];
  };

  // Вычисление общей оценки для этапа
  const calculateStageScore = (scores: any, stageId: string) => {
    const criteria = getStageCriteria(stageId);
    if (!criteria) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(criteria.criteria).forEach(([key, criterion]) => {
      if (scores[key]) {
        totalScore += scores[key] * criterion.weight;
        totalWeight += criterion.weight;
      }
    });

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * criteria.max_score) : 0;
  };

  // Получение оценки резервиста по этапу
  const getReservistStageEvaluation = (reservistId: string, stage: string) => {
    return evaluations.find(e => e.reservist_id === reservistId && e.stage === stage);
  };

  // Получение всех оценок резервиста
  const getReservistEvaluations = (reservistId: string) => {
    return evaluations.filter(e => e.reservist_id === reservistId);
  };

  // Вычисление общей оценки резервиста
  const calculateReservistTotalScore = (reservistId: string) => {
    const reservistEvaluations = getReservistEvaluations(reservistId);
    let totalScore = 0;
    let totalMaxScore = 0;

    reservistEvaluations.forEach(evaluation => {
      const stageScore = calculateStageScore(evaluation.scores, evaluation.stage);
      const criteria = getStageCriteria(evaluation.stage);
      totalScore += stageScore;
      totalMaxScore += criteria?.max_score || 0;
    });

    return { score: totalScore, maxScore: totalMaxScore };
  };

  useEffect(() => {
    fetchEvaluations();
    fetchReservists();
    fetchEvaluators();
  }, [examEventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с фильтром по этапам */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Оценки экзамена</h3>
        <div className="flex gap-2">
          {EXAM_STAGES.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStage === stage.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {stage.name_ru}
            </button>
          ))}
        </div>
      </div>

      {/* Список резервистов с оценками */}
      <div className="space-y-4">
        {reservists.map((reservist) => {
          const stageEvaluation = getReservistStageEvaluation(reservist.id, selectedStage);
          const totalScore = calculateReservistTotalScore(reservist.id);
          const stageInfo = getStageInfo(selectedStage);
          const criteria = getStageCriteria(selectedStage);

          return (
            <div
              key={reservist.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {reservist.first_name} {reservist.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">{reservist.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {totalScore.score}/{totalScore.maxScore}
                  </div>
                  <div className="text-sm text-gray-600">Общая оценка</div>
                </div>
              </div>

              {/* Оценка по выбранному этапу */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  {stageInfo?.name_ru} - {stageInfo?.description}
                </h5>
                
                {stageEvaluation ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Оценка этапа</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {calculateStageScore(stageEvaluation.scores, selectedStage)}/{criteria?.max_score || 0}
                        </span>
                        <span className={`text-sm ${
                          calculateStageScore(stageEvaluation.scores, selectedStage) >= (criteria?.passing_score || 0)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {calculateStageScore(stageEvaluation.scores, selectedStage) >= (criteria?.passing_score || 0)
                            ? 'Пройден'
                            : 'Не пройден'}
                        </span>
                      </div>
                    </div>

                    {/* Детальные оценки */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {criteria && Object.entries(criteria.criteria).map(([key, criterion]) => {
                        const score = stageEvaluation.scores[key as keyof typeof stageEvaluation.scores] || 0;
                        return (
                          <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{criterion.description}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= score
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{score}/10</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Комментарии и рекомендации */}
                    {(stageEvaluation.comments || stageEvaluation.recommendations) && (
                      <div className="space-y-2">
                        {stageEvaluation.comments && (
                          <div>
                            <h6 className="text-sm font-medium text-gray-700">Комментарии</h6>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {stageEvaluation.comments}
                            </p>
                          </div>
                        )}
                        {stageEvaluation.recommendations && (
                          <div>
                            <h6 className="text-sm font-medium text-gray-700">Рекомендации</h6>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {stageEvaluation.recommendations}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setEditingEvaluation(stageEvaluation)}
                        className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Редактировать
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-3">Оценка не проведена</p>
                    <button
                      onClick={() => setEditingEvaluation({
                        id: '',
                        exam_event_id: examEventId,
                        reservist_id: reservist.id,
                        stage: selectedStage,
                        evaluator_id: '',
                        scores: {},
                        comments: '',
                        recommendations: '',
                        created_at: '',
                        updated_at: ''
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Target className="h-4 w-4" />
                      Провести оценку
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Форма редактирования оценки */}
      {editingEvaluation && (
        <EvaluationEditForm
          evaluation={editingEvaluation}
          evaluators={evaluators}
          onSave={saveEvaluation}
          onCancel={() => setEditingEvaluation(null)}
        />
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

// Компонент формы редактирования оценки
interface EvaluationEditFormProps {
  evaluation: ExamEvaluation;
  evaluators: any[];
  onSave: (evaluation: Partial<ExamEvaluation>) => void;
  onCancel: () => void;
}

function EvaluationEditForm({ evaluation, evaluators, onSave, onCancel }: EvaluationEditFormProps) {
  const [formData, setFormData] = useState({
    evaluator_id: evaluation.evaluator_id || '',
    scores: evaluation.scores || {},
    comments: evaluation.comments || '',
    recommendations: evaluation.recommendations || '',
  });

  const stageInfo = EXAM_STAGES.find(stage => stage.id === evaluation.stage);
  const criteria = DEFAULT_EVALUATION_CRITERIA[evaluation.stage as keyof typeof DEFAULT_EVALUATION_CRITERIA];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.evaluator_id) {
      alert('Выберите эксперта');
      return;
    }

    onSave(formData);
  };

  const updateScore = (key: string, value: number) => {
    setFormData({
      ...formData,
      scores: {
        ...formData.scores,
        [key]: value
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Оценка: {stageInfo?.name_ru}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Выбор эксперта */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Эксперт *
          </label>
          <select
            value={formData.evaluator_id}
            onChange={(e) => setFormData({ ...formData, evaluator_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Выберите эксперта</option>
            {evaluators.map((evaluator) => (
              <option key={evaluator.id} value={evaluator.id}>
                {evaluator.first_name} {evaluator.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Критерии оценки */}
        {criteria && (
          <div className="space-y-4">
            <h5 className="text-md font-medium text-gray-900">Критерии оценки</h5>
            {Object.entries(criteria.criteria).map(([key, criterion]) => {
              const score = formData.scores[key as keyof typeof formData.scores] || 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {criterion.description}
                    </span>
                    <span className="text-sm text-gray-500">
                      Вес: {Math.round(criterion.weight * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => updateScore(key, star)}
                          className={`h-8 w-8 ${
                            star <= score
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 hover:text-yellow-300'
                          }`}
                        >
                          <Star className="h-full w-full" />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[2rem]">
                      {score}/10
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Комментарии */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Комментарии
          </label>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Дополнительные комментарии по оценке..."
          />
        </div>

        {/* Рекомендации */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Рекомендации
          </label>
          <textarea
            value={formData.recommendations}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Рекомендации по развитию..."
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save className="h-4 w-4" />
            Сохранить
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
