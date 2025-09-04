import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Users, TrendingUp, Award, BarChart3, Star, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface TPEvaluationStatsProps {
  eventId: string;
}

interface EvaluationStats {
  total_participants: number;
  evaluated_participants: number;
  average_leadership_potential: string;
  average_business_communication: string;
  average_learning_ability: string;
  average_motivation_level: string;
  average_skills_score: number;
  high_performers: number;
  medium_performers: number;
  low_performers: number;
}

interface DetailedEvaluation {
  id: string;
  participant_name: string;
  territory_name?: string;
  territory_region?: string;
  leadership_potential: string;
  business_communication: string;
  learning_ability: string;
  motivation_level: string;
  average_skills_score: number;
  notes?: string;
  evaluated_at: string;
}

export function TPEvaluationStats({ eventId }: TPEvaluationStatsProps) {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [detailedEvaluations, setDetailedEvaluations] = useState<DetailedEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchEvaluationStats();
  }, [eventId]);

  const fetchEvaluationStats = async () => {
    try {
      // Получаем общую статистику
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_tp_evaluation_stats', { p_event_id: eventId });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Получаем детальные оценки
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('tp_evaluations')
        .select(`
          id,
          participant_id,
          leadership_potential,
          business_communication,
          learning_ability,
          motivation_level,
          average_skills_score,
          notes,
          evaluated_at,
          users!tp_evaluations_participant_id_fkey(full_name),
          event_participants_view!inner(territory_name, territory_region)
        `)
        .eq('event_id', eventId)
        .order('average_skills_score', { ascending: false });

      if (evaluationsError) throw evaluationsError;

      const detailedData = evaluationsData?.map(evaluation => ({
        id: evaluation.id,
        participant_name: evaluation.users?.full_name || 'Неизвестный участник',
        territory_name: evaluation.event_participants_view?.territory_name,
        territory_region: evaluation.event_participants_view?.territory_region,
        leadership_potential: evaluation.leadership_potential,
        business_communication: evaluation.business_communication,
        learning_ability: evaluation.learning_ability,
        motivation_level: evaluation.motivation_level,
        average_skills_score: evaluation.average_skills_score,
        notes: evaluation.notes,
        evaluated_at: evaluation.evaluated_at
      })) || [];

      setDetailedEvaluations(detailedData);
    } catch (err) {
      console.error('Error fetching evaluation stats:', err);
      setError('Не удалось загрузить статистику оценок');
    } finally {
      setLoading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 4.0) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 3.0) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score > 4.0) return 'Высокий уровень';
    if (score >= 3.0) return 'Средний уровень';
    return 'Низкий уровень';
  };

  const getCompletionRate = () => {
    if (!stats || stats.total_participants === 0) return 0;
    return Math.round((stats.evaluated_participants / stats.total_participants) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.evaluated_participants === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Оценки ТП не найдены</h3>
          <p className="text-gray-600">По данному мероприятию еще не проводились оценки участников.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sns-green" />
            Статистика оценок ТП
          </h3>
          <div className="text-sm text-gray-600">
            Завершено: {getCompletionRate()}% ({stats.evaluated_participants} из {stats.total_participants})
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600">Оценено</p>
                <p className="text-lg font-bold text-blue-900">{stats.evaluated_participants}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500 rounded-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600">Средняя оценка</p>
                <p className="text-lg font-bold text-green-900">{stats.average_skills_score.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500 rounded-lg">
                <Award className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600">Высокий</p>
                <p className="text-lg font-bold text-purple-900">{stats.high_performers}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500 rounded-lg">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-orange-600">Низкий</p>
                <p className="text-lg font-bold text-orange-900">{stats.low_performers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Распределение по уровням */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 text-sm mb-2">Лидерство</h4>
            <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getLevelColor(stats.average_leadership_potential)}`}>
              {getLevelLabel(stats.average_leadership_potential)}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 text-sm mb-2">Коммуникация</h4>
            <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getLevelColor(stats.average_business_communication)}`}>
              {getLevelLabel(stats.average_business_communication)}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 text-sm mb-2">Обучаемость</h4>
            <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getLevelColor(stats.average_learning_ability)}`}>
              {getLevelLabel(stats.average_learning_ability)}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 text-sm mb-2">Мотивация</h4>
            <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getLevelColor(stats.average_motivation_level)}`}>
              {getLevelLabel(stats.average_motivation_level)}
            </div>
          </div>
        </div>
      </div>

      {/* Детальные оценки */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-sns-green" />
            Детальные оценки участников
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sns-green hover:text-green-600 transition-colors flex items-center gap-2"
          >
            {showDetails ? 'Скрыть детали' : 'Показать детали'}
            {showDetails ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Участник</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Территория</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Лидерство</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Коммуникация</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Обучаемость</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Мотивация</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Навыки продаж</th>
                {showDetails && <th className="text-left py-3 px-4 font-medium text-gray-900">Комментарии</th>}
              </tr>
            </thead>
            <tbody>
              {detailedEvaluations.map((evaluation) => (
                <tr key={evaluation.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{evaluation.participant_name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-600">
                      {evaluation.territory_name && <p>{evaluation.territory_name}</p>}
                      {evaluation.territory_region && <p>{evaluation.territory_region}</p>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(evaluation.leadership_potential)}`}>
                      {getLevelLabel(evaluation.leadership_potential)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(evaluation.business_communication)}`}>
                      {getLevelLabel(evaluation.business_communication)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(evaluation.learning_ability)}`}>
                      {getLevelLabel(evaluation.learning_ability)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(evaluation.motivation_level)}`}>
                      {getLevelLabel(evaluation.motivation_level)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getScoreColor(evaluation.average_skills_score)}`}>
                      {evaluation.average_skills_score.toFixed(1)}
                    </div>
                  </td>
                  {showDetails && (
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">
                        {evaluation.notes || '—'}
                      </p>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
