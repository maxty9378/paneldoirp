import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  User,
  FileText,
  CheckCircle,
  Eye,
  BarChart3,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { TestReviewModal } from './TestReviewModal';

// -------------------- Types --------------------
interface PendingTest {
  attempt_id: string;
  user_name: string;
  user_email: string;
  test_title: string;
  test_type: 'entry' | 'final' | 'annual' | string;
  submitted_at: string;
  open_questions_count: number;
}

interface ReviewedTest {
  attempt_id: string;
  user_name: string;
  user_email: string;
  test_title: string;
  test_type: 'entry' | 'final' | 'annual' | string;
  reviewed_at: string;
  score: number;
  passed: boolean;
  correct_answers: number;
  total_answers: number;
  reviewer_name: string;
}

interface TestsPendingReviewProps {
  eventId?: string;
  onReviewComplete?: () => void;
  onEditReview?: (attemptId: string) => void;
}

// -------------------- Small UI helpers --------------------
function TypePill({ type }: { type: PendingTest['test_type'] }) {
  const map: Record<string, string> = {
    entry: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    final: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    annual: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    default: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200',
  };
  const cls = map[type] || map.default;
  const label = type === 'entry' ? 'Входной' : type === 'final' ? 'Финальный' : type === 'annual' ? 'Годовой' : type;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-10 text-center text-gray-500">
      <Icon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
      <p className="text-lg font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {children}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-52 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-6 py-4"><div className="h-8 w-24 bg-gray-200 rounded animate-pulse ml-auto" /></td>
    </tr>
  );
}

// -------------------- Main --------------------
export function TestsPendingReview({ eventId, onReviewComplete, onEditReview }: TestsPendingReviewProps) {
  const { toast } = useToast();

  const [tests, setTests] = useState<PendingTest[]>([]);
  const [reviewedTests, setReviewedTests] = useState<ReviewedTest[]>([]);

  const [loading, setLoading] = useState(true);
  const [reviewedLoading, setReviewedLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [questionStats, setQuestionStats] = useState<any[]>([]);

  const [showReviewedSection, setShowReviewedSection] = useState(true);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // UX: фильтры/поиск/сортировка
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entry' | 'final' | 'annual'>('all');
  const [sortKey, setSortKey] = useState<'time' | 'name' | 'title' | 'open'>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Пагинация проверенных тестов
  const [revPage, setRevPage] = useState(1);
  const [revPageSize, setRevPageSize] = useState(10);

  useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  useEffect(() => {
    fetchPendingTests();
    fetchReviewedTests();
    fetchQuestionStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // ---------- Data fetchers ----------
  async function fetchPendingTests() {
    setLoading(true);
    try {
      let query = supabase
        .from('user_test_attempts')
        .select(`
          id,
          status,
          score,
          completed_at,
          created_at,
          test_id,
          user:user_id(id, full_name, email),
          test:tests(id, title, type)
        `)
        .or('status.eq.pending_review,and(status.eq.completed,score.eq.0)')
        .order('completed_at', { ascending: false });

      if (eventId) query = query.eq('event_id', eventId);
      const { data: attempts, error } = await query;
      if (error) throw error;

      const validAttempts = (attempts || []).filter(a => a.test);
      const testIds = Array.from(new Set(validAttempts.map(a => a.test.id)));

      // Загружаем количество открытых вопросов для всех тестов одним запросом
      const { data: openQuestions, error: qErr } = await supabase
        .from('test_questions')
        .select('id, test_id')
        .in('test_id', testIds)
        .eq('question_type', 'text');
      if (qErr) throw qErr;

      const openCountByTest = new Map<string, number>();
      (openQuestions || []).forEach(q => {
        openCountByTest.set(q.test_id, (openCountByTest.get(q.test_id) || 0) + 1);
      });

      const rows: PendingTest[] = validAttempts
        .map((a: any) => {
          const openCount = openCountByTest.get(a.test.id) || 0;
          if (openCount === 0) return null; // показываем только если есть открытые вопросы
          return {
            attempt_id: a.id,
            user_name: a.user?.full_name || 'Неизвестно',
            user_email: a.user?.email || '',
            test_title: a.test?.title || 'Без названия',
            test_type: a.test?.type || 'unknown',
            submitted_at: a.completed_at || a.created_at || new Date().toISOString(),
            open_questions_count: openCount,
          } as PendingTest;
        })
        .filter(Boolean) as PendingTest[];

      setTests(rows);
    } catch (e: any) {
      console.error('Ошибка загрузки тестов на проверке:', e);
      toast(`Ошибка загрузки: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviewedTests() {
    setReviewedLoading(true);
    try {
      const { data: attempts, error } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          score,
          passed,
          reviewed_at,
          test:tests(id, title, type, passing_score),
          user:user_id(id, full_name, email),
          reviewer:reviewed_by(id, full_name)
        `)
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false });

      if (error) throw error;

      const reviewedWithCalc: ReviewedTest[] = await Promise.all(
        (attempts || []).map(async (a: any) => {
          const { data: reviews } = await supabase
            .from('test_answer_reviews')
            .select('is_correct')
            .eq('attempt_id', a.id);

          const correct = (reviews || []).filter(r => r.is_correct).length;
          const total = reviews?.length || 0;
          const score = total > 0 ? Math.round((correct / total) * 100) : 0;
          const passed = score >= (a.test?.passing_score ?? 70);

          return {
            attempt_id: a.id,
            user_name: a.user?.full_name || 'Неизвестно',
            user_email: a.user?.email || '',
            test_title: a.test?.title || 'Без названия',
            test_type: a.test?.type || 'unknown',
            reviewed_at: a.reviewed_at || new Date().toISOString(),
            score,
            passed,
            correct_answers: correct,
            total_answers: total,
            reviewer_name: a.reviewer?.full_name || 'Неизвестно',
          } as ReviewedTest;
        })
      );

      setReviewedTests(reviewedWithCalc);
    } catch (e: any) {
      console.error('Ошибка загрузки проверенных тестов:', e);
      toast(`Ошибка загрузки проверенных тестов: ${e.message}`);
    } finally {
      setReviewedLoading(false);
    }
  }

  async function fetchQuestionStats() {
    setStatsLoading(true);
    try {
      if (!eventId) {
        setQuestionStats([]);
        return;
      }

      const { data: allAttempts, error: attErr } = await supabase
        .from('user_test_attempts')
        .select(`id, test_id, status, test:tests(id, title)`) // для заголовков
        .eq('event_id', eventId)
        .in('status', ['completed', 'pending_review']);
      if (attErr) throw attErr;
      if (!allAttempts || allAttempts.length === 0) {
        setQuestionStats([]);
        return;
      }

      const attemptIds = allAttempts.map(a => a.id);
      const testIds = Array.from(new Set(allAttempts.map(a => a.test_id)));

      const { data: testQuestions, error: qErr } = await supabase
        .from('test_questions')
        .select('id, question, question_type, test_id')
        .in('test_id', testIds)
        .in('question_type', ['text', 'sequence']);
      if (qErr) throw qErr;
      if (!testQuestions || testQuestions.length === 0) {
        setQuestionStats([]);
        return;
      }

      const { data: allReviews } = await supabase
        .from('test_answer_reviews')
        .select('question_id, is_correct, attempt_id')
        .in('attempt_id', attemptIds);

      const questionStatsMap = new Map<string, any>();

      testQuestions.forEach((q) => {
        const testTitle = allAttempts.find(a => a.test_id === q.test_id)?.test?.title || 'Неизвестный тест';
        const totalAnswers = allAttempts.filter(a => a.test_id === q.test_id).length;
        const qReviews = (allReviews || []).filter((r: any) => r.question_id === q.id);
        const correct = qReviews.filter((r: any) => r.is_correct).length;
        const correct_percentage = totalAnswers > 0 ? Math.round((correct / totalAnswers) * 100) : 0;
        questionStatsMap.set(q.id, {
          question_id: q.id,
          question_text: q.question,
          test_title: testTitle,
          total_answers: totalAnswers,
          correct_answers: correct,
          correct_percentage,
        });
      });

      setQuestionStats(Array.from(questionStatsMap.values()));
    } catch (e: any) {
      console.error('Ошибка загрузки статистики вопросов:', e);
      toast('Не удалось загрузить статистику');
    } finally {
      setStatsLoading(false);
    }
  }

  // ---------- Actions ----------
  function handleReviewTest(attemptId: string) {
    setSelectedAttemptId(attemptId);
    setShowReviewModal(true);
  }

  function handleReviewCompleteLocal() {
    setShowReviewModal(false);
    setSelectedAttemptId(null);
    fetchPendingTests();
    fetchReviewedTests();
    onReviewComplete?.();
  }

  function handleEditReview(attemptId: string) {
    onEditReview?.(attemptId);
  }

  // ---------- Derived ----------
  const filteredPending = useMemo(() => {
    const arr = tests.filter((t) => {
      const byType = typeFilter === 'all' ? true : t.test_type === typeFilter;
      const s = search;
      const byText = s
        ? t.user_name.toLowerCase().includes(s) ||
          t.user_email.toLowerCase().includes(s) ||
          t.test_title.toLowerCase().includes(s)
        : true;
      return byType && byText;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.user_name.localeCompare(b.user_name) * dir;
        case 'title':
          return a.test_title.localeCompare(b.test_title) * dir;
        case 'open':
          return (a.open_questions_count - b.open_questions_count) * dir;
        case 'time':
        default:
          return (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()) * dir;
      }
    });
  }, [tests, typeFilter, search, sortKey, sortDir]);

  const filteredReviewed = useMemo(() => {
    const s = search;
    let arr = reviewedTests.filter((t) =>
      s
        ? t.user_name.toLowerCase().includes(s) ||
          t.user_email.toLowerCase().includes(s) ||
          t.test_title.toLowerCase().includes(s)
        : true
    );
    // простая сортировка: последние сверху
    arr = arr.sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime());
    return arr;
  }, [reviewedTests, search]);

  // пагинация проверенных
  const revTotalPages = Math.max(1, Math.ceil(filteredReviewed.length / revPageSize));
  useEffect(() => setRevPage(1), [search, revPageSize]);
  const revPaged = useMemo(() => {
    const start = (revPage - 1) * revPageSize;
    return filteredReviewed.slice(start, start + revPageSize);
  }, [filteredReviewed, revPage, revPageSize]);

  // date helper
  function formatDateSafe(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime()) || d.getFullYear() < 2020) return 'Дата не указана';
    return d.toLocaleString('ru-RU');
  }

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* Сообщение когда нет тестов на проверке */}
      {!loading && filteredPending.length === 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
          <div className="absolute inset-0 opacity-50">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat'
            }}></div>
          </div>
          <div className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Нет тестов на проверку</h3>
                <p className="text-gray-600">Все проверено или нет тестов с открытыми вопросами</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Все задачи выполнены</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Панель фильтров/поиска - только если есть тесты на проверке */}
      {filteredPending.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="relative md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="Поиск по имени, email или названию теста"
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-green focus:border-transparent"
              >
                <option value="all">Все типы</option>
                <option value="entry">Входные</option>
                <option value="final">Финальные</option>
                <option value="annual">Годовые</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Сортировка:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-green focus:border-transparent"
              >
                <option value="time">По времени отправки</option>
                <option value="name">По участнику</option>
                <option value="title">По названию теста</option>
                <option value="open">По открытым вопросам</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-green focus:border-transparent"
              >
                <option value="desc">По убыванию</option>
                <option value="asc">По возрастанию</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Секция: тесты на проверке - только если есть тесты */}
      {filteredPending.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft border border-gray-100">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-amber-500" /> Тесты на проверке
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {loading ? 'Загрузка…' : `${filteredPending.length} тест(ов) ожидают проверки тренером или администратором`}
                </p>
              </div>
              {!loading && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {filteredPending.length} ожидают
                </span>
              )}
            </div>
          </div>

        {/* Мобильные карточки */}
        <div className="p-4 space-y-3 md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-4">
                <div className="h-4 w-52 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-80 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 bg-gray-100 rounded" />
                  <div className="h-8 bg-gray-100 rounded" />
                  <div className="h-8 bg-gray-100 rounded" />
                </div>
              </div>
            ))
          ) : filteredPending.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Нет тестов на проверке"
              description="Все проверено или нет тестов с открытыми вопросами"
            />
          ) : (
            filteredPending.map((t) => (
              <div key={t.attempt_id} className="rounded-xl border border-gray-100 p-4 flex flex-col gap-3 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t.user_name}</div>
                      <div className="text-xs text-gray-500">{t.user_email}</div>
                      <div className="mt-1 text-sm text-gray-800">{t.test_title}</div>
                      <div className="mt-1"><TypePill type={t.test_type} /></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Отправлен</div>
                    <div className="text-sm text-gray-700">{formatDateSafe(t.submitted_at)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 flex items-center">
                    <FileText className="h-4 w-4 mr-1" /> {t.open_questions_count} открытых
                  </div>
                  <button
                    onClick={() => handleReviewTest(t.attempt_id)}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-sns-green text-white rounded-lg hover:bg-sns-green-dark"
                  >
                    <Eye className="h-4 w-4 mr-1" /> Проверить тесты
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Таблица для md+ */}
        <div className="overflow-hidden hidden md:block">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Участник</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тест</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Открытые вопросы</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Отправлен</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredPending.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={CheckCircle}
                      title="Нет тестов на проверке"
                      description="Все проверено или нет тестов с открытыми вопросами"
                    />
                  </td>
                </tr>
              ) : (
                filteredPending.map((t) => (
                  <tr key={t.attempt_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{t.user_name}</div>
                          <div className="text-xs text-gray-500">{t.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{t.test_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><TypePill type={t.test_type} /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <FileText className="h-4 w-4 mr-1" /> {t.open_questions_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateSafe(t.submitted_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleReviewTest(t.attempt_id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-sns-green text-white rounded-lg hover:bg-sns-green-dark"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Проверить тесты
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Секция: проверенные тесты */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100">
        <button
          onClick={() => setShowReviewedSection(v => !v)}
          className="w-full p-4 md:p-6 flex items-center justify-between border-b border-gray-200 text-left"
        >
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Проверенные тесты
            </h3>
            <p className="text-sm text-gray-600 mt-1">История проверок и быстрый переход к редактированию</p>
          </div>
          <span className="text-gray-400">{showReviewedSection ? <ChevronUp /> : <ChevronDown />}</span>
        </button>

        {showReviewedSection && (
          <div className="p-4 md:p-6">
            {/* Мобильные карточки */}
            <div className="space-y-3 md:hidden">
              {reviewedLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-4">
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 w-72 bg-gray-200 rounded animate-pulse mb-3" />
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))
              ) : filteredReviewed.length === 0 ? (
                <EmptyState icon={FileText} title="Нет проверенных тестов" description="История проверок появится здесь" />
              ) : (
                revPaged.map((t) => (
                  <div key={t.attempt_id} className="rounded-xl border border-gray-100 p-4 flex flex-col gap-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{t.user_name}</div>
                        <div className="text-xs text-gray-500">{t.user_email}</div>
                        <div className="mt-1 text-sm text-gray-800">{t.test_title}</div>
                        <div className="mt-1"><TypePill type={t.test_type} /></div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.score}%</div>
                        <div className="text-xs text-gray-600 mt-1">{t.correct_answers}/{t.total_answers}</div>
                        <div className="text-xs text-gray-500">{formatDateSafe(t.reviewed_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button onClick={() => handleEditReview(t.attempt_id)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Изменить</button>
                    </div>
                  </div>
                ))
              )}

              {/* Пагинация моб */}
              {filteredReviewed.length > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-600 pt-2">
                  <span>Стр. {revPage} / {revTotalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRevPage(p => Math.max(1, p - 1))}
                      disabled={revPage <= 1}
                      className="px-3 py-1.5 rounded border disabled:opacity-50"
                    >Назад</button>
                    <button
                      onClick={() => setRevPage(p => Math.min(revTotalPages, p + 1))}
                      disabled={revPage >= revTotalPages}
                      className="px-3 py-1.5 rounded border disabled:opacity-50"
                    >Вперёд</button>
                  </div>
                </div>
              )}
            </div>

            {/* Таблица для md+ */}
            <div className="hidden md:block">
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Участник</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тест</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Результат</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Проверено</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reviewedLoading ? (
                      Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : filteredReviewed.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState icon={FileText} title="Нет проверенных тестов" description="История проверок появится здесь" />
                        </td>
                      </tr>
                    ) : (
                      revPaged.map((t) => (
                        <tr key={t.attempt_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{t.user_name}</div>
                            <div className="text-xs text-gray-500">{t.user_email}</div>
                          </td>
                          <td className="px-6 py-4"><div className="text-sm text-gray-900">{t.test_title}</div></td>
                          <td className="px-6 py-4 whitespace-nowrap"><TypePill type={t.test_type} /></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{t.score}%</div>
                            <div className="text-xs text-gray-600">{t.correct_answers}/{t.total_answers}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateSafe(t.reviewed_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button onClick={() => handleEditReview(t.attempt_id)} className="text-blue-600 hover:text-blue-900 text-sm font-medium">Изменить</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Пагинация */}
              {filteredReviewed.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-100 text-sm text-gray-600">
                  <div>
                    Показано {revPaged.length} из {filteredReviewed.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>На странице:</span>
                    <select
                      value={revPageSize}
                      onChange={(e) => setRevPageSize(parseInt(e.target.value) || 10)}
                      className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-sns-green focus:border-transparent"
                    >
                      {[10, 20, 50].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <span className="ml-3">Стр. {revPage} / {revTotalPages}</span>
                    <div className="ml-2 flex gap-1">
                      <button
                        onClick={() => setRevPage(p => Math.max(1, p - 1))}
                        disabled={revPage <= 1}
                        className="px-2 py-1 rounded border text-gray-700 disabled:opacity-50"
                      >Назад</button>
                      <button
                        onClick={() => setRevPage(p => Math.min(revTotalPages, p + 1))}
                        disabled={revPage >= revTotalPages}
                        className="px-2 py-1 rounded border text-gray-700 disabled:opacity-50"
                      >Вперёд</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Общая статистика */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" /> Общая статистика
          </h3>
          <p className="text-sm text-gray-600 mt-1">Статистика по открытым/последовательным вопросам в границах выбранного мероприятия</p>
        </div>
        <div className="p-4 md:p-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-gray-600">Загрузка статистики...</span>
            </div>
          ) : questionStats.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {questionStats.map((stat, idx) => (
                <div key={stat.question_id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Вопрос {idx + 1}</h4>
                      <p className="text-sm text-gray-600 line-clamp-3">{stat.question_text}</p>
                      <p className="mt-1 text-xs text-gray-500">{stat.test_title}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-gray-900">{stat.correct_percentage}%</div>
                      <div className="text-sm text-gray-600">{stat.correct_answers}/{stat.total_answers}</div>
                      <div className="text-xs text-gray-500 mt-1">правильных</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        stat.correct_percentage >= 80
                          ? 'bg-green-500'
                          : stat.correct_percentage >= 60
                          ? 'bg-yellow-500'
                          : stat.correct_percentage >= 40
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${stat.correct_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="Нет данных для статистики" description="Статистика появится после проверок открытых вопросов" />
          )}
        </div>
      </div>

      {/* Модальное окно проверки */}
      {showReviewModal && selectedAttemptId && eventId && (
        <TestReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAttemptId(null);
          }}
          attemptId={selectedAttemptId}
          eventId={eventId}
          onComplete={handleReviewCompleteLocal}
        />
      )}
    </div>
  );
}
