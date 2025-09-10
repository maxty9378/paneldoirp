import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, User, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/useAuth';
import { clsx } from 'clsx';

interface TestAnswer {
  id: string;
  question_id: string;
  question: string;
  question_type: string;
  text_answer?: string;
  is_correct?: boolean;
}

interface TestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  eventId: string;
}

export function TestReviewModal({ isOpen, onClose, attemptId, eventId }: TestReviewModalProps) {
  const { toast } = useToast();
  const { userProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [attemptInfo, setAttemptInfo] = useState<any>(null);

  console.log('TestReviewModal render:', { isOpen, attemptId, eventId });

  useEffect(() => {
    if (isOpen && attemptId) {
      fetchTestAnswers();
    }
  }, [isOpen, attemptId]);

  const fetchTestAnswers = async () => {
    setLoading(true);
    try {
      // Получаем информацию о попытке
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_test_attempts')
        .select(`
          *,
          user:user_id(full_name, email),
          test:tests(title, type, passing_score)
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      console.log('Attempt data:', attemptData);
      console.log('Test ID from attempt:', attemptData.test_id);
      setAttemptInfo(attemptData);

      // Получаем открытые вопросы теста
      const testId = attemptData.test_id || attemptData.test?.id;
      console.log('Using test ID:', testId);
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('id, question, question_type, created_at, "order"')
        .eq('test_id', testId)
        .in('question_type', ['text', 'sequence'])
        .order('"order"', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: true, nullsLast: true })
        .order('id', { ascending: true });

      if (questionsError) {
        console.error('Questions error:', questionsError);
        throw questionsError;
      }

      console.log('Questions data:', questionsData);
      console.log('Number of questions:', questionsData?.length);
      console.log('Questions order:', questionsData?.map(q => ({ 
        id: q.id, 
        order: q.order,
        created_at: q.created_at,
        question: q.question.substring(0, 50) + '...' 
      })));

      // Получаем ответы пользователя на эти вопросы
      const questionIds = questionsData.map(q => q.id);
      console.log('Question IDs for answers query:', questionIds);
      
      const { data: answersData, error: answersError } = await supabase
        .from('user_test_answers')
        .select('id, question_id, text_answer')
        .eq('attempt_id', attemptId)
        .in('question_id', questionIds);

      if (answersError) {
        console.error('Answers error:', answersError);
        throw answersError;
      }

      console.log('Answers data:', answersData);

      // Получаем существующие результаты проверки
      const { data: reviewData, error: reviewError } = await supabase
        .from('test_answer_reviews')
        .select('question_id, is_correct')
        .eq('attempt_id', attemptId);

      if (reviewError) {
        console.log('No existing reviews found (this is OK):', reviewError);
      } else {
        console.log('Existing reviews loaded:', reviewData);
      }

      // Создаем массив вопросов с ответами пользователя и существующими оценками
      const formattedAnswers = questionsData.map(question => {
        const userAnswer = answersData.find(answer => answer.question_id === question.id);
        const existingReview = reviewData?.find(review => review.question_id === question.id);
        
        return {
          id: userAnswer?.id || `temp-${question.id}`,
          question_id: question.id,
          question: question.question,
          question_type: question.question_type,
          text_answer: userAnswer?.text_answer,
          is_correct: existingReview?.is_correct ?? false
        };
      });

      console.log('Formatted answers:', formattedAnswers);
      setAnswers(formattedAnswers);
    } catch (error: any) {
      console.error('Ошибка загрузки ответов:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast(`Ошибка загрузки: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const handleCorrectnessChange = (answerId: string, isCorrect: boolean) => {
    setAnswers(prev => prev.map(answer => 
      answer.id === answerId 
        ? { ...answer, is_correct: isCorrect }
        : answer
    ));
  };

  const saveReviewResults = async (attemptId: string, answers: TestAnswer[], correctAnswers: number, totalAnswers: number, score: number, passed: boolean) => {
    try {
      // Сначала удаляем старые записи проверки для этой попытки
      const { error: deleteError } = await supabase
        .from('test_answer_reviews')
        .delete()
        .eq('attempt_id', attemptId);

      if (deleteError) {
        console.log('Could not delete old reviews (this is OK):', deleteError);
      }

      // Сохраняем результаты проверки в таблице test_answer_reviews
      const reviewData = answers.map(answer => ({
        attempt_id: attemptId,
        question_id: answer.question_id,
        reviewer_id: user.id,
        is_correct: answer.is_correct || false,
        points_awarded: answer.is_correct ? 1 : 0,
        review_notes: null
      }));

      const { error: reviewError } = await supabase
        .from('test_answer_reviews')
        .insert(reviewData);

      if (reviewError) {
        console.error('Error saving review results:', reviewError);
        throw reviewError;
      }

      console.log('Review results saved successfully:', {
        attemptId,
        correctAnswers,
        totalAnswers,
        score,
        passed
      });
    } catch (error) {
      console.error('Failed to save review results:', error);
      throw error;
    }
  };

  const handleSubmitReview = async () => {
    const reviewedAnswers = answers.filter(answer => answer.is_correct !== undefined);
    if (reviewedAnswers.length === 0) {
      toast('Необходимо оценить хотя бы один ответ');
      return;
    }

    setSubmitting(true);
    try {
      // Получаем ID текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      // Подсчитываем правильные ответы только среди открытых вопросов
      const correctAnswers = answers.filter(answer => answer.is_correct === true).length;
      const totalAnswers = answers.length;
      const score = Math.round((correctAnswers / totalAnswers) * 100);
      
      console.log('Review calculation (open questions only):', {
        correctAnswers,
        totalAnswers,
        score,
        note: 'Calculated only for open-ended questions'
      });
      const passingScore = attemptInfo?.test.passing_score;
      const passed = passingScore ? score >= passingScore : true; // Если проходной балл не установлен, считаем пройденным
      
      console.log('Review calculation:', {
        correctAnswers,
        totalAnswers,
        score,
        passingScore,
        passed
      });

      // Сохраняем результаты проверки в test_answer_reviews (это всегда работает)
      await saveReviewResults(attemptId, answers, correctAnswers, totalAnswers, score, passed);

      // Обновляем основную таблицу с результатами проверки
      try {
        const { error: updateError } = await supabase
          .from('user_test_attempts')
          .update({
            status: 'completed',
            score: score,
            passed: passed,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', attemptId);

        if (updateError) {
          console.log('Could not update user_test_attempts, but review is saved:', updateError);
        } else {
          console.log('Successfully updated user_test_attempts with full data');
        }
      } catch (updateError) {
        console.log('Update attempt failed, but review is saved:', updateError);
      }

      toast(`✅ Тест проверен: ${correctAnswers}/${totalAnswers} правильных ответов (${score}%)`);
      onClose();
    } catch (error: any) {
      console.error('Ошибка проверки теста:', error);
      toast(`Ошибка проверки: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    console.log('TestReviewModal: not open, returning null');
    return null;
  }

  console.log('TestReviewModal: rendering modal');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Проверка теста</h3>
            {attemptInfo && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                  <User size={14} />
                  <span className="font-medium">{attemptInfo.user.full_name}</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                  <FileText size={14} />
                  <span className="font-medium">{attemptInfo.test.title}</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                  <Clock size={14} />
                  <span>{new Date(attemptInfo.updated_at).toLocaleString('ru-RU')}</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-sns-green border-t-transparent rounded-full animate-spin mr-2"></div>
              Загрузка ответов...
            </div>
          ) : (
            <>
              {/* Сводка */}
              <div className="bg-gradient-to-r from-sns-green/5 to-blue-50 p-4 rounded-xl border border-sns-green/20 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Проверка ответов</h4>
                    <p className="text-sm text-gray-600">
                      Оцените каждый ответ как "Верно" или "Неверно"
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1 bg-sns-green/10 text-sns-green text-sm font-medium rounded-full">
                      {attemptInfo?.test.passing_score 
                        ? `Проходной балл: ${attemptInfo.test.passing_score}%`
                        : 'Проходной балл не установлен'
                      }
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Верно: {answers.filter(a => a.is_correct === true).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">Неверно: {answers.filter(a => a.is_correct === false).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-gray-600">Не оценено: {answers.filter(a => a.is_correct === undefined).length}</span>
                  </div>
                </div>
              </div>

              {/* Список ответов */}
              <div className="space-y-4">
                {answers.map((answer, index) => (
                  <div key={answer.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Вопрос и ответ участника слева */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-sns-green text-white text-xs font-medium rounded-full">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-600">Вопрос {index + 1}</span>
                        </div>
                        
                        {/* Вопрос */}
                        <div className="mb-3">
                          <p className="text-gray-800 text-sm leading-relaxed font-medium">
                            {answer.question}
                          </p>
                        </div>
                        
                        {/* Ответ участника */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">Ответ участника:</p>
                          <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                            {answer.text_answer || 'Нет ответа'}
                          </p>
                        </div>
                      </div>

                      {/* Кнопки Верно/Неверно справа */}
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <button
                          onClick={() => handleCorrectnessChange(answer.id, true)}
                          className={clsx(
                            'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                            answer.is_correct === true
                              ? 'bg-green-100 border-2 border-green-500 text-green-700'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
                          )}
                        >
                          <CheckCircle size={16} />
                          Верно
                        </button>
                        <button
                          onClick={() => handleCorrectnessChange(answer.id, false)}
                          className={clsx(
                            'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                            answer.is_correct === false
                              ? 'bg-red-100 border-2 border-red-500 text-red-700'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                          )}
                        >
                          <XCircle size={16} />
                          Неверно
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Кнопки действий */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-sns-green rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {answers.filter(a => a.is_correct !== undefined).length} из {answers.length} ответов оценено
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting || answers.filter(a => a.is_correct !== undefined).length === 0}
                    className="px-6 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Проверка...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Завершить проверку
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
