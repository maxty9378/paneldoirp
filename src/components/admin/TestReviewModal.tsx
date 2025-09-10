import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, CheckCircle, XCircle, Clock, User, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/useAuth';
import { clsx } from 'clsx';

interface TestAnswer {
  id: string; // id ответа пользователя или temp-id
  question_id: string;
  question: string;
  question_type: string; // 'text' | 'sequence'
  text_answer?: string;
  is_correct?: boolean; // undefined — не оценено
}

interface TestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  eventId: string;
}

// Вспомогательная плашка статуса
function StatusDot({ color }: { color: 'green' | 'red' | 'gray' }) {
  const m = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    gray: 'bg-gray-300',
  } as const;
  return <span className={clsx('inline-block w-2 h-2 rounded-full', m[color])} />;
}

export function TestReviewModal({ isOpen, onClose, attemptId, eventId }: TestReviewModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [attemptInfo, setAttemptInfo] = useState<any>(null);

  // UX state
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'correct' | 'incorrect'>('all');
  const [activeIndex, setActiveIndex] = useState(0); // для навигации с клавиатуры

  const scrollContainerRef = useRef<HTMLDivElement>(null);


  // Загрузка
  useEffect(() => {
    if (isOpen && attemptId) fetchTestAnswers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, attemptId]);

  // Вычисляем filteredAnswers перед эффектами
  const filteredAnswers = useMemo(() => {
    let arr = answers;
    if (filter === 'unreviewed') arr = arr.filter((a) => a.is_correct === undefined);
    if (filter === 'correct') arr = arr.filter((a) => a.is_correct === true);
    if (filter === 'incorrect') arr = arr.filter((a) => a.is_correct === false);
    return arr;
  }, [answers, filter]);

  // Клавиатурные шорткаты внутри модалки
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (answers.length === 0) return;
      if (['j', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filteredAnswers.length - 1));
      }
      if (['k', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === '1') { // отметить верно
        e.preventDefault();
        const a = filteredAnswers[activeIndex];
        if (a) markAnswer(a.id, true);
      }
      if (e.key === '2') { // отметить неверно
        e.preventDefault();
        const a = filteredAnswers[activeIndex];
        if (a) markAnswer(a.id, false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { // сохранение/завершение
        e.preventDefault();
        handleSubmitReview();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, answers, filteredAnswers, activeIndex]);

  // Автоскролл к активной карточке
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLDivElement>(`[data-idx="${activeIndex}"]`);
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  async function fetchTestAnswers() {
    setLoading(true);
    try {
      // Попытка
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_test_attempts')
        .select(`
          id, test_id, status, updated_at,
          user:user_id(full_name, email),
          test:tests(id, title, type, passing_score)
        `)
        .eq('id', attemptId)
        .single();
      if (attemptError) throw attemptError;
      setAttemptInfo(attemptData);

      const testId = attemptData.test_id || attemptData.test?.id;

      // Вопросы: открытые и последовательности (ручная проверка)
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select('id, question, question_type, created_at, "order"')
        .eq('test_id', testId)
        .in('question_type', ['text', 'sequence'])
        .order('"order"', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: true, nullsLast: true })
        .order('id', { ascending: true });
      if (questionsError) throw questionsError;

      const qIds = (questionsData || []).map((q) => q.id);

      // Ответы пользователя
      const { data: answersData, error: answersError } = await supabase
        .from('user_test_answers')
        .select('id, question_id, text_answer')
        .eq('attempt_id', attemptId)
        .in('question_id', qIds);
      if (answersError) throw answersError;

      // Существующие оценки (если были)
      const { data: reviewData } = await supabase
        .from('test_answer_reviews')
        .select('question_id, is_correct')
        .eq('attempt_id', attemptId);

      const formatted: TestAnswer[] = (questionsData || []).map((q) => {
        const ua = (answersData || []).find((a) => a.question_id === q.id);
        const rev = (reviewData || []).find((r) => r.question_id === q.id);
        return {
          id: ua?.id || `temp-${q.id}`,
          question_id: q.id,
          question: q.question,
          question_type: q.question_type,
          text_answer: ua?.text_answer,
          is_correct: rev?.is_correct,
        };
      });

      // Восстановление драфта из localStorage
      const draftKey = `review-draft-${attemptId}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed: Record<string, boolean> = JSON.parse(draft);
          for (const ans of formatted) {
            if (parsed[ans.id] !== undefined) ans.is_correct = parsed[ans.id];
          }
        } catch {}
      }

      setAnswers(formatted);
      setActiveIndex(0);
    } catch (error: any) {
      console.error('Ошибка загрузки ответов:', error);
      toast(`Ошибка загрузки: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const markAnswer = useCallback((answerId: string, isCorrect: boolean) => {
    setAnswers((prev) => {
      const next = prev.map((a) => (a.id === answerId ? { ...a, is_correct: isCorrect } : a));
      // Автосейв драфта
      const draftMap: Record<string, boolean> = {};
      next.forEach((a) => {
        if (a.is_correct !== undefined) draftMap[a.id] = a.is_correct;
      });
      localStorage.setItem(`review-draft-${attemptId}`, JSON.stringify(draftMap));
      return next;
    });
  }, [attemptId]);

  const handleCorrectnessChange = (answerId: string, value: boolean) => markAnswer(answerId, value);

  const reviewedCount = useMemo(() => answers.filter((a) => a.is_correct !== undefined).length, [answers]);
  const correctCount = useMemo(() => answers.filter((a) => a.is_correct === true).length, [answers]);
  const incorrectCount = useMemo(() => answers.filter((a) => a.is_correct === false).length, [answers]);

  async function saveReviewResults(attemptId: string, answers: TestAnswer[], correctAnswers: number, totalAnswers: number, score: number, passed: boolean) {
    // стираем старые оценки и пишем новые
    const { error: delErr } = await supabase.from('test_answer_reviews').delete().eq('attempt_id', attemptId);
    if (delErr) console.log('Не удалось очистить прошлые оценки (не критично):', delErr);

    const payload = answers.map((a) => ({
      attempt_id: attemptId,
      question_id: a.question_id,
      reviewer_id: user?.id,
      is_correct: !!a.is_correct,
      points_awarded: a.is_correct ? 1 : 0,
      review_notes: null,
    }));

    const { error: insErr } = await supabase.from('test_answer_reviews').insert(payload);
    if (insErr) throw insErr;
  }

  async function handleSubmitReview() {
    const reviewed = answers.filter((a) => a.is_correct !== undefined);
    if (reviewed.length === 0) {
      toast('Необходимо оценить хотя бы один ответ');
      return;
    }

    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error('Пользователь не авторизован');

      const correctAnswers = answers.filter((a) => a.is_correct === true).length;
      const totalAnswers = answers.length;
      const score = Math.round((correctAnswers / totalAnswers) * 100);
      const passingScore = attemptInfo?.test?.passing_score;
      const passed = passingScore ? score >= passingScore : true;

      await saveReviewResults(attemptId, answers, correctAnswers, totalAnswers, score, passed);

      // апдейт попытки
      const { error: upErr } = await supabase
        .from('user_test_attempts')
        .update({
          status: 'completed',
          score,
          passed,
          reviewed_by: auth.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', attemptId);
      if (upErr) console.log('Не удалось обновить user_test_attempts (оценки сохранены):', upErr);

      // чистим драфт
      localStorage.removeItem(`review-draft-${attemptId}`);

      toast(`✅ Тест проверен: ${correctAnswers}/${totalAnswers} (${score}%)`);
      onClose();
    } catch (e: any) {
      console.error('Ошибка проверки теста:', e);
      toast(`Ошибка проверки: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  // Прогресс-бар
  const progress = answers.length ? Math.round((reviewedCount / answers.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* фон */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* модалка */}
      <div className="relative bg-white rounded-xl max-w-5xl w-[96vw] md:w-[90vw] max-h-[92vh] shadow-xl ring-1 ring-black/5 flex flex-col">
        {/* header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          {/* Заголовок и кнопка закрытия */}
          <div className="p-3 md:p-6 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Проверка теста</h3>
              {attemptInfo && (
                <div className="mt-1 md:mt-2 flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full"><User size={12} /><span className="font-medium truncate max-w-[30vw] md:max-w-none">{attemptInfo.user?.full_name}</span></span>
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full"><FileText size={12} /><span className="font-medium truncate max-w-[30vw] md:max-w-none">{attemptInfo.test?.title}</span></span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0"><X size={20} /></button>
          </div>

          {/* Статистика и фильтры */}
          <div className="px-3 md:px-6 pb-3 md:pb-4">
            {/* Статистика в сетке - компактная на мобилке */}
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="bg-gray-50 rounded-lg p-2 md:p-3 text-center">
                <div className="text-xs font-medium text-gray-500 mb-0.5 md:mb-1">Не оценено</div>
                <div className="text-sm md:text-lg font-bold text-gray-900">{answers.length - reviewedCount}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2 md:p-3 text-center">
                <div className="text-xs font-medium text-green-600 mb-0.5 md:mb-1">Верно</div>
                <div className="text-sm md:text-lg font-bold text-green-700">{correctCount}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-2 md:p-3 text-center">
                <div className="text-xs font-medium text-red-600 mb-0.5 md:mb-1">Неверно</div>
                <div className="text-sm md:text-lg font-bold text-red-700">{incorrectCount}</div>
              </div>
            </div>


            {/* Прогресс-бар */}
            <div className="mt-3 flex items-center gap-2 md:gap-3">
              <div className="text-xs md:text-sm text-gray-700">Проходной балл: <span className="font-medium">{attemptInfo?.test?.passing_score ?? '—'}%</span></div>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 md:w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-sns-green transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs md:text-sm text-gray-700 whitespace-nowrap font-medium">{reviewedCount}/{answers.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-600">
              <div className="w-6 h-6 border-2 border-sns-green border-t-transparent rounded-full animate-spin mr-2" /> Загрузка ответов...
            </div>
          ) : filteredAnswers.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              Ничего не найдено по текущим фильтрам
            </div>
          ) : (
            filteredAnswers.map((answer, idx) => {
              const realIndex = answers.findIndex((a) => a.id === answer.id);
              const isActive = realIndex === activeIndex;
              return (
                <div
                  key={answer.id}
                  data-idx={realIndex}
                  className={clsx('border rounded-xl p-4 transition-all', isActive ? 'border-sns-green ring-1 ring-sns-green/30 bg-sns-green/5' : 'border-gray-100 bg-white hover:bg-gray-50')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-sns-green text-white text-xs font-medium rounded-full">{realIndex + 1}</span>
                      <span className="text-sm font-medium text-gray-600">Вопрос {realIndex + 1}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {answer.is_correct === true && (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200"><CheckCircle size={12}/> верно</span>)}
                      {answer.is_correct === false && (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200"><XCircle size={12}/> неверно</span>)}
                      {answer.is_correct === undefined && (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">не оценено</span>)}
                    </div>
                  </div>

                  {/* вопрос */}
                  <div className="mt-3 text-gray-900 text-sm leading-relaxed font-medium whitespace-pre-wrap">{answer.question}</div>

                  {/* ответ участника */}
                  <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Ответ участника:</p>
                    <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">{answer.text_answer || 'Нет ответа'}</p>
                  </div>

                  {/* кнопки */}
                  <div className="mt-3 grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2">
                    <button
                      onClick={() => handleCorrectnessChange(answer.id, true)}
                      className={clsx('flex items-center justify-center gap-2 px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-all', answer.is_correct === true ? 'bg-green-100 border-2 border-green-500 text-green-700' : 'bg-white border border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50')}
                      title="1"
                    >
                      <CheckCircle size={16}/> Верно
                    </button>
                    <button
                      onClick={() => handleCorrectnessChange(answer.id, false)}
                      className={clsx('flex items-center justify-center gap-2 px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-all', answer.is_correct === false ? 'bg-red-100 border-2 border-red-500 text-red-700' : 'bg-white border border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50')}
                      title="2"
                    >
                      <XCircle size={16}/> Неверно
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100">
          <div className="p-4 md:p-6">
            {/* Кнопки */}
            <div className="flex items-center justify-center md:justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition-all">
                Отмена
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting || reviewedCount === 0}
                className="px-4 py-2.5 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center justify-center gap-2 transition-all"
                title="Ctrl/Cmd + S"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    Проверка…
                  </>
                ) : (
                  <>
                    <CheckCircle size={16}/>
                    Завершить проверку
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
