import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Save, CheckCircle, MessageSquare, User, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface CaseEvaluation {
  id?: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  case_number: number;
  criteria_scores: {
    correctness: number; // Правильность решения кейса
    clarity: number; // Чёткость объяснения
    independence: number; // Степень самостоятельности
  };
  comments?: string;
  created_at?: string;
  updated_at?: string;
}

interface Participant {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    position?: { name: string };
    territory?: { name: string };
  };
}

const CaseEvaluationPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const participantId = searchParams.get('participantId');
  const caseNumber = parseInt(searchParams.get('caseNumber') || '1');

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [evaluation, setEvaluation] = useState<CaseEvaluation>({
    exam_event_id: examId || '',
    reservist_id: participantId || '',
    evaluator_id: user?.id || '',
    case_number: caseNumber,
    criteria_scores: {
      correctness: 0,
      clarity: 0,
      independence: 0
    },
    comments: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [caseAssigned, setCaseAssigned] = useState(true); // Предполагаем что кейс назначен, пока не проверим

  useEffect(() => {
    if (examId && participantId) {
      fetchParticipantData();
      fetchExistingEvaluation();
      checkCaseAssignment();
    }
  }, [examId, participantId, caseNumber]);

  const fetchParticipantData = async () => {
    if (!participantId) return;

    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          id,
          user:users (
            id,
            full_name,
            email,
            position:positions (name),
            territory:territories (name)
          )
        `)
        .eq('user_id', participantId)
        .eq('event_id', examId)
        .single();

      if (error) throw error;
      setParticipant(data as Participant);
    } catch (err) {
      console.error('Ошибка загрузки данных участника:', err);
    }
  };

  const fetchExistingEvaluation = async () => {
    if (!examId || !participantId || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('case_evaluations')
        .select('*')
        .eq('exam_event_id', examId)
        .eq('reservist_id', participantId)
        .eq('evaluator_id', user.id)
        .eq('case_number', caseNumber)
        .single();

      if (data && !error) {
        setEvaluation(prev => ({
          ...prev,
          ...data,
          criteria_scores: data.criteria_scores || prev.criteria_scores
        }));
        setSaved(true);
      }
    } catch (err) {
      console.log('Оценка не найдена, создаём новую');
    } finally {
      setLoading(false);
    }
  };

  const checkCaseAssignment = async () => {
    if (!examId || !participantId) return;

    try {
      const { data, error } = await supabase
        .from('case_assignments')
        .select('case_numbers')
        .eq('exam_event_id', examId)
        .eq('participant_id', participantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка проверки назначения кейса:', error);
        setCaseAssigned(true); // По умолчанию разрешаем оценку
        return;
      }

      if (data) {
        const assignedCases = data.case_numbers || [];
        setCaseAssigned(assignedCases.includes(caseNumber));
      } else {
        // Назначения не найдено - разрешаем оценку (для совместимости)
        setCaseAssigned(true);
      }
    } catch (err) {
      console.error('Ошибка проверки назначения кейса:', err);
      setCaseAssigned(true); // По умолчанию разрешаем оценку
    }
  };

  const handleScoreChange = (criterion: keyof CaseEvaluation['criteria_scores'], score: number) => {
    setEvaluation(prev => ({
      ...prev,
      criteria_scores: {
        ...prev.criteria_scores,
        [criterion]: score
      }
    }));
    setSaved(false);
  };

  const handleCommentsChange = (comments: string) => {
    setEvaluation(prev => ({ ...prev, comments }));
    setSaved(false);
  };

  const saveEvaluation = async () => {
    if (!examId || !participantId || !user?.id) return;

    setSaving(true);
    try {
      const evaluationData = {
        exam_event_id: examId,
        reservist_id: participantId,
        evaluator_id: user.id,
        case_number: caseNumber,
        criteria_scores: evaluation.criteria_scores,
        comments: evaluation.comments || null,
        updated_at: new Date().toISOString()
      };

      if (evaluation.id) {
        // Обновляем существующую оценку
        const { error } = await supabase
          .from('case_evaluations')
          .update(evaluationData)
          .eq('id', evaluation.id);

        if (error) throw error;
      } else {
        // Создаём новую оценку
        const { data, error } = await supabase
          .from('case_evaluations')
          .insert([{
            ...evaluationData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        setEvaluation(prev => ({ ...prev, id: data.id }));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Ошибка сохранения оценки:', err);
      alert('Ошибка сохранения оценки');
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    const { correctness, clarity, independence } = evaluation.criteria_scores;
    const validScores = [correctness, clarity, independence].filter(score => score > 0);
    if (validScores.length === 0) return 0;
    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return Math.round(average * 10) / 10; // Округление до 1 знака после запятой
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const criteria = [
    {
      key: 'correctness' as const,
      title: 'Правильность решения кейса',
      description: 'Совпадение с правильным ответом',
      icon: CheckCircle
    },
    {
      key: 'clarity' as const,
      title: 'Чёткость объяснения',
      description: 'Чёткость объяснения выбранного варианта решения',
      icon: MessageSquare
    },
    {
      key: 'independence' as const,
      title: 'Степень самостоятельности',
      description: 'Решил самостоятельно или с чьей-либо помощью',
      icon: User
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!caseAssigned) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Кейс не назначен</h2>
          <p className="text-gray-600 mb-6">
            Кейс #{caseNumber} не назначен участнику {participant?.user.full_name || 'этому участнику'}.
            Обратитесь к администратору для назначения кейса.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'SNS, sans-serif' }}>
                    Оценка решения кейса #{caseNumber}
                  </h1>
                  <p className="text-gray-600">
                    {participant?.user.full_name || 'Резервист'}
                  </p>
                </div>
              </div>
              {participant?.user.position?.name && (
                <div className="text-sm text-gray-500">
                  {participant.user.position.name}
                  {participant.user.territory?.name && ` • ${participant.user.territory.name}`}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {getTotalScore()}<span className="text-gray-400">/5</span>
              </div>
              <div className="text-sm text-gray-500">Средний балл</div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Критерии оценки */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'SNS, sans-serif' }}>
              Критерии оценки
            </h2>
            
            {criteria.map((criterion) => {
              const Icon = criterion.icon;
              const currentScore = evaluation.criteria_scores[criterion.key];
              
              return (
                <div key={criterion.key} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {criterion.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {criterion.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(currentScore)}`}>
                        {currentScore}<span className="text-gray-400">/5</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Оценочная шкала */}
                  <div className="space-y-2">
                    {/* Первый ряд - целые числа */}
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => handleScoreChange(criterion.key, score)}
                          className={`flex-1 h-12 rounded-xl border-2 transition-all duration-200 font-semibold ${
                            currentScore === score
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    {/* Второй ряд - дробные числа */}
                    <div className="flex gap-2">
                      {[1.5, 2.5, 3.5, 4.5].map((score) => (
                        <button
                          key={score}
                          onClick={() => handleScoreChange(criterion.key, score)}
                          className={`flex-1 h-12 rounded-xl border-2 transition-all duration-200 font-semibold ${
                            currentScore === score
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-700 shadow-sm'
                              : 'border-gray-200 bg-gray-25 text-gray-400 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-500'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                      {/* Пустая кнопка для выравнивания */}
                      <div className="flex-1"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Комментарии */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Комментарии <span className="text-gray-400 font-normal">(при необходимости)</span>
            </h3>
            <textarea
              value={evaluation.comments || ''}
              onChange={(e) => handleCommentsChange(e.target.value)}
              placeholder="Дополнительные комментарии к оценке решения кейса..."
              className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={saveEvaluation}
              disabled={saving || getTotalScore() === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                saving || getTotalScore() === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Сохранение...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Сохранено
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Сохранить оценку
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseEvaluationPage;
