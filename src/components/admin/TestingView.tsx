import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  FileText,
  Calendar,
  CheckCircle,
  Search,
  Eye,
  Download,
  Upload,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { TestCreationModal } from './TestCreationModal';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { useAuth } from '../../hooks/useAuth';
import { ParticipantTestsView } from '../testing/ParticipantTestsView';
import { TestResultsOverview } from './TestResultsOverview';
import { useToast } from '../../hooks/use-toast';

// -------------------- Types --------------------
interface Test {
  id: string;
  title: string;
  description?: string;
  type: 'entry' | 'final' | 'annual';
  passing_score: number;
  time_limit: number;
  event_type_id?: string;
  status: 'draft' | 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  questions_count?: number;
  event_type?: {
    name: string;
    name_ru: string;
  };
  // Вложенный ответ супабейса test_questions(count)
  test_questions?: { count: number }[];
}

interface Question {
  id: string;
  test_id: string;
  question: string;
  question_type: string;
  order: number;
  points: number;
  answers?: Answer[];
  explanation?: string;
}

interface Answer {
  id?: string;
  question_id?: string;
  text: string;
  is_correct: boolean;
  order: number;
}

// -------------------- Small UI helpers --------------------
function TypePill({ type }: { type: Test['type'] }) {
  const map = {
    entry: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    final: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    annual: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  } as const;
  const label = { entry: 'Входной', final: 'Финальный', annual: 'Годовой' }[type] ?? type;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[type]}`}>
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: Test['status'] }) {
  const map = {
    active: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    draft: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    inactive: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200',
  } as const;
  const label = { active: 'Активен', draft: 'Черновик', inactive: 'Неактивен' }[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-10 text-center text-gray-500">
      <Icon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
      <p className="font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {action}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" /></td>
      <td className="px-3 py-3"><div className="h-4 w-14 bg-gray-200 rounded animate-pulse mx-auto" /></td>
      <td className="px-3 py-3"><div className="h-4 w-10 bg-gray-200 rounded animate-pulse mx-auto" /></td>
      <td className="px-3 py-3"><div className="h-4 w-14 bg-gray-200 rounded animate-pulse mx-auto" /></td>
      <td className="px-3 py-3"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse mx-auto" /></td>
      <td className="px-3 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto" /></td>
      <td className="px-3 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto" /></td>
    </tr>
  );
}

// Карточка для мобильной сетки
function TestCard({
  test,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  busy,
  loadingQuestions,
}: {
  test: Test;
  onView: (t: Test) => void;
  onEdit: (t: Test) => void;
  onDuplicate: (t: Test) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  loadingQuestions: boolean;
}) {
  return (
    <div className="md:hidden rounded-xl border border-gray-100 p-4 flex flex-col gap-3 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-gray-900 break-words">{test.title}</div>
          {test.description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{test.description}</div>
          )}
        </div>
        <div className="flex gap-1">
          <TypePill type={test.type} />
          <StatusPill status={test.status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="font-semibold">{test.passing_score}%</div>
          <div className="text-[11px] text-gray-500">Проходной</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="font-semibold">{test.time_limit === 0 ? '∞' : `${test.time_limit} мин`}</div>
          <div className="text-[11px] text-gray-500">Время</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="font-semibold">{test.questions_count ?? 0}</div>
          <div className="text-[11px] text-gray-500">Вопросов</div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          aria-label="Просмотр"
          className="text-gray-400 hover:text-blue-600 focus-visible:ring-2 ring-blue-400 rounded p-1 disabled:opacity-50"
          onClick={() => onView(test)}
          disabled={loadingQuestions}
        >
          {loadingQuestions ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Eye size={16} />
          )}
        </button>
        <button
          aria-label="Редактировать"
          className="text-gray-400 hover:text-emerald-600 focus-visible:ring-2 ring-emerald-400 rounded p-1"
          onClick={() => onEdit(test)}
        >
          <Edit size={16} />
        </button>
        <button
          aria-label="Дублировать"
          className="text-gray-400 hover:text-blue-600 focus-visible:ring-2 ring-blue-400 rounded p-1"
          onClick={() => onDuplicate(test)}
        >
          <Copy size={16} />
        </button>
        <button
          aria-label="Удалить"
          className="text-gray-400 hover:text-red-600 focus-visible:ring-2 ring-red-400 rounded p-1 disabled:opacity-50"
          onClick={() => onDelete(test.id)}
          disabled={busy}
        >
          {busy ? (
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>
    </div>
  );
}

const TestRow = React.memo(function TestRow({
  test,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  busy,
  loadingQuestions,
}: {
  test: Test;
  onView: (t: Test) => void;
  onEdit: (t: Test) => void;
  onDuplicate: (t: Test) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  loadingQuestions: boolean;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="w-2/5 px-4 py-3">
        <div className="text-sm font-medium text-gray-900 break-words leading-tight">{test.title}</div>
        {test.description && (
          <div className="text-xs text-gray-500 break-words leading-tight mt-1 line-clamp-2">{test.description}</div>
        )}
      </td>
      <td className="w-16 px-3 py-3"><TypePill type={test.type} /></td>
      <td className="w-16 px-3 py-3 text-sm text-gray-600 text-center">{test.passing_score}%</td>
      <td className="w-16 px-3 py-3 text-sm text-gray-600 text-center">
        {test.time_limit === 0 ? <span className="text-emerald-700">Не ограничено</span> : `${test.time_limit} мин`}
      </td>
      <td className="w-16 px-3 py-3 text-sm text-gray-600 text-center">{test.questions_count ?? 0}</td>
      <td className="w-20 px-3 py-3"><StatusPill status={test.status} /></td>
      <td className="w-24 px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            aria-label="Просмотр теста"
            className="text-gray-400 hover:text-blue-600 focus-visible:ring-2 ring-blue-400 rounded p-1 disabled:opacity-50"
            onClick={() => onView(test)}
            disabled={loadingQuestions}
          >
            {loadingQuestions ? (
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Eye size={14} />
            )}
          </button>
          <button
            aria-label="Редактировать тест"
            className="text-gray-400 hover:text-emerald-600 focus-visible:ring-2 ring-emerald-400 rounded p-1"
            onClick={() => onEdit(test)}
          >
            <Edit size={14} />
          </button>
          <button
            aria-label="Дублировать тест"
            className="text-gray-400 hover:text-blue-600 focus-visible:ring-2 ring-blue-400 rounded p-1"
            onClick={() => onDuplicate(test)}
          >
            <Copy size={14} />
          </button>
          <button
            aria-label="Удалить тест"
            className="text-gray-400 hover:text-red-600 focus-visible:ring-2 ring-red-400 rounded p-1 disabled:opacity-50"
            onClick={() => onDelete(test.id)}
            disabled={busy}
          >
            {busy ? (
              <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
});

// Секция-аккордеон для списков тестов
function TestSection({
  title,
  subtitle,
  tests,
  loading,
  deletingTestId,
  loadingQuestions,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  emptyTitle,
  emptyDescr,
  onCreate,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  tests: Test[];
  loading: boolean;
  deletingTestId: string | null;
  loadingQuestions: boolean;
  onView: (t: Test) => void;
  onEdit: (t: Test) => void;
  onDuplicate: (t: Test) => void;
  onDelete: (id: string) => void;
  emptyTitle: string;
  emptyDescr: string;
  onCreate?: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full p-6 flex items-start justify-between gap-4 border-b border-gray-200 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-sns-green" />
            {title}
          </h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="text-gray-400">
          {open ? <ChevronUp /> : <ChevronDown />}
        </div>
      </button>

      {open && (
        <div className="px-0 md:px-0">
          {/* Мобильные карточки */}
          <div className="p-4 space-y-3 md:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-4">
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 bg-gray-100 rounded" />
                  </div>
                </div>
              ))
            ) : tests.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={emptyTitle}
                description={emptyDescr}
                action={
                  onCreate ? (
                    <button
                      onClick={onCreate}
                      className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors inline-flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Создать тест
                    </button>
                  ) : undefined
                }
              />
            ) : (
              tests.map((t) => (
                <TestCard
                  key={t.id}
                  test={t}
                  onView={onView}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  busy={deletingTestId === t.id}
                  loadingQuestions={loadingQuestions}
                />
              ))
            )}
          </div>

          {/* Таблица для md+ */}
          <div className="overflow-hidden hidden md:block">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-2/5 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название теста</th>
                  <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                  <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Балл</th>
                  <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                  <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Вопросы</th>
                  <th className="w-20 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="w-24 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : tests.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={FileText}
                        title={emptyTitle}
                        description={emptyDescr}
                        action={
                          onCreate ? (
                            <button
                              onClick={onCreate}
                              className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors inline-flex items-center"
                            >
                              <Plus className="h-4 w-4 mr-2" /> Создать тест
                            </button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  tests.map((t) => (
                    <TestRow
                      key={t.id}
                      test={t}
                      onView={onView}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                      busy={deletingTestId === t.id}
                      loadingQuestions={loadingQuestions}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------- Main Component --------------------
export type ViewMode = 'tests' | 'results';

export function TestingView() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [rawSearch, setRawSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'updated' | 'title' | 'status' | 'questions'>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isEditing, setIsEditing] = useState(false);
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tests');

  // employee -> ParticipantTestsView
  const isEmployee = userProfile?.role === 'employee';
  
  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(rawSearch.trim()), 250);
    return () => clearTimeout(id);
  }, [rawSearch]);

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          event_type:event_type_id(name, name_ru),
          test_questions(count)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const testsWithCounts: Test[] = (data || []).map((t: any) => ({
        ...t,
        questions_count: t.test_questions?.[0]?.count ?? 0,
      }));

      setTests(testsWithCounts);
    } catch (e: any) {
      console.error('Ошибка загрузки тестов:', e);
      toast(`Ошибка загрузки: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestQuestions(testId: string) {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('"order"', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: true, nullsLast: true })
        .order('id', { ascending: true });

      if (error) throw error;

      const questionsWithAnswers = await Promise.all(
        (data || []).map(async (q: any) => {
          if (q.question_type === 'sequence') {
            const { data: seq, error: seqErr } = await supabase
            .from('test_sequence_answers')
            .select('*')
              .eq('question_id', q.id)
            .order('answer_order');
            if (seqErr) throw seqErr;
            const answers: Answer[] = (seq || []).map((a: any) => ({
              id: a.id,
              question_id: a.question_id,
            text: a.answer_text,
              order: a.answer_order,
              is_correct: true,
          }));
            return { ...q, answers } as Question;
        } else {
            const { data: ans, error: ansErr } = await supabase
            .from('test_answers')
            .select('*')
              .eq('question_id', q.id)
            .order('order');
            if (ansErr) throw ansErr;
            const answers: Answer[] = (ans || []).map((a: any) => ({
              id: a.id,
              question_id: a.question_id,
              text: a.text,
              order: a.order,
              is_correct: !!a.is_correct,
            }));
            return { ...q, answers } as Question;
          }
        })
      );

      setQuestions(questionsWithAnswers);
      return questionsWithAnswers as Question[];
    } catch (e) {
      console.error('Ошибка загрузки вопросов:', e);
      toast('Не удалось загрузить вопросы');
      return [] as Question[];
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleViewTest(test: Test) {
    setSelectedTest(test);
    setQuestions([]);
    await fetchTestQuestions(test.id);
    setShowTestDetails(true);
  }

  function handleViewQuestion(question: Question) {
    setSelectedQuestion(question);
    setShowQuestionPreview(true);
  }

  function handleCloseTestDetails() {
    setShowTestDetails(false);
    setSelectedTest(null);
    setQuestions([]);
  }

  function handleCreateTest() {
    setIsEditing(false);
    setSelectedTest(null);
    setShowCreateModal(true);
  }

  function handleEditTest(test: Test) {
    setSelectedTest(test);
    setIsEditing(true);
    setShowCreateModal(true);
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
    setSelectedTest(null);
    setIsEditing(false);
  }

  async function handleDuplicateTest(test: Test) {
    try {
      const { data: newTest, error: testError } = await supabase
        .from('tests')
        .insert({
          title: `Копия ${test.title}`,
          description: test.description,
          type: test.type,
          passing_score: test.passing_score,
          time_limit: test.time_limit,
          event_type_id: test.event_type_id,
          status: 'draft',
        })
        .select()
        .single();

      if (testError) throw testError;

      const originalQuestions = await fetchTestQuestions(test.id);

      for (const q of originalQuestions) {
        const { data: newQ, error: qErr } = await supabase
          .from('test_questions')
          .insert({
            test_id: newTest.id,
            question: q.question,
            question_type: q.question_type,
            order: q.order,
            points: q.points,
            explanation: q.explanation ?? null,
          })
          .select()
          .single();
        if (qErr) throw qErr;

        if (q.answers?.length) {
          if (q.question_type === 'sequence') {
            const payload = q.answers.map((a) => ({
              question_id: newQ.id,
              answer_text: a.text,
              answer_order: a.order,
              is_correct: true,
            }));
            const { error: seqErr } = await supabase.from('test_sequence_answers').insert(payload);
            if (seqErr) throw seqErr;
          } else {
            const payload = q.answers.map((a) => ({
              question_id: newQ.id,
              text: a.text,
              is_correct: a.is_correct,
              order: a.order,
            }));
            const { error: ansErr } = await supabase.from('test_answers').insert(payload);
            if (ansErr) throw ansErr;
          }
        }
      }

      await fetchTests();
      toast(`Тест скопирован: ${newTest.title}`);
    } catch (e: any) {
      console.error('Ошибка при дублировании теста:', e);
      toast(`Ошибка копирования: ${e.message}`);
    }
  }

  async function handleDeleteTest(testId: string) {
    if (!window.confirm('Удалить тест? Действие необратимо.')) return;

    setDeletingTestId(testId);
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (error) throw error;
      setTests((prev) => prev.filter((t) => t.id !== testId));
      toast('Тест удален');
    } catch (e: any) {
      console.error('Ошибка удаления теста:', e);
      toast(`Ошибка удаления: ${e.message}`);
    } finally {
      setDeletingTestId(null);
    }
  }

  function handleTestCreationSuccess() {
    fetchTests();
  }

  function getQuestionTypeLabel(questionType: string) {
    const typeLabels = {
      single_choice: 'Один вариант',
      multiple_choice: 'Несколько вариантов',
      text: 'Текстовый ответ',
      sequence: 'Последовательность',
    } as const;
    return (typeLabels as any)[questionType] ?? 'Вопрос';
  }

  // --------- Derived data ---------
  const filteredTests = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let arr = tests.filter((t) => {
      const byText = term
        ? t.title.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term)
        : true;
      const byType = selectedType === 'all' ? true : t.type === (selectedType as any);
      return byText && byType;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    arr = arr.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'questions':
          return ((a.questions_count ?? 0) - (b.questions_count ?? 0)) * dir;
        case 'updated':
        default:
          return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
      }
    });

    return arr;
  }, [tests, searchTerm, selectedType, sortKey, sortDir]);

  const countsByType = useMemo(
    () => ({
      entry: tests.filter((t) => t.type === 'entry').length,
      final: tests.filter((t) => t.type === 'final').length,
      annual: tests.filter((t) => t.type === 'annual').length,
    }),
    [tests]
  );

  // Разделение по секциям
  const onlineTrainingTests = filteredTests.filter(
    (t) => t.event_type?.name === 'online_training' && ['entry', 'final', 'annual'].includes(t.type)
  );
  const akbTests = filteredTests.filter(
    (t) => t.event_type?.name === 'in_person_training' &&
      t.title.includes('Управление территорией для развития АКБ') &&
      ['entry', 'final', 'annual'].includes(t.type)
  );
  const otherTests = filteredTests.filter(
    (t) => !(
      (t.event_type?.name === 'online_training' && ['entry', 'final', 'annual'].includes(t.type)) ||
      (t.event_type?.name === 'in_person_training' && t.title.includes('Управление территорией для развития АКБ') && ['entry', 'final', 'annual'].includes(t.type))
    )
  );

  // Пагинация для "Все тесты"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => setPage(1), [searchTerm, selectedType, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(otherTests.length / pageSize));
  const pagedOther = useMemo(() => {
    const start = (page - 1) * pageSize;
    return otherTests.slice(start, start + pageSize);
  }, [otherTests, page, pageSize]);

  // Статистика
  const stats = {
    totalTests: tests.length,
    entryTests: tests.filter((t) => t.type === 'entry').length,
    finalTests: tests.filter((t) => t.type === 'final').length,
    annualTests: tests.filter((t) => t.type === 'annual').length,
    activeTests: tests.filter((t) => t.status === 'active').length,
    totalQuestions: tests.reduce((sum, t) => sum + (t.questions_count || 0), 0),
  };

  // Экспорт/Импорт заглушки
  function handleExport() {
    toast('Экспорт пока как заглушка');
  }
  function handleImport() {
    toast('Импорт пока как заглушка');
  }

  // Employee view
  if (isEmployee) return <ParticipantTestsView />;
  if (viewMode === 'results') return <TestResultsOverview onBack={() => setViewMode('tests')} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Управление тестированием</h1>
        </div>
        <div className="flex items-center gap-3">
          <div role="tablist" aria-label="Режим просмотра" className="flex bg-gray-100 rounded-lg p-1">
            <button
              role="tab"
              aria-selected={viewMode === 'tests'}
              tabIndex={viewMode === 'tests' ? 0 : -1}
              onClick={() => setViewMode('tests')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 ring-sns-green focus:outline-none',
                viewMode === 'tests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Управление тестами
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'results'}
              tabIndex={viewMode === 'results' ? 0 : -1}
              onClick={() => setViewMode('results')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 ring-sns-green focus:outline-none',
                viewMode === 'results' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Результаты тестов
            </button>
          </div>
          <button 
            onClick={handleCreateTest}
            className="bg-sns-green text-white px-4 py-2 rounded-lg hover:bg-sns-green-dark transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Создать тест</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Всего тестов</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTests}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Активных тестов</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeTests}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Play size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Входные тесты</p>
              <p className="text-2xl font-bold text-purple-600">{stats.entryTests}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Play size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Финальные тесты</p>
              <p className="text-2xl font-bold text-orange-600">{stats.finalTests}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Годовые тесты</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.annualTests}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Calendar size={24} className="text-cyan-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Всего вопросов</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalQuestions}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Тип:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-green focus:border-transparent"
            >
              <option value="all">Все типы • {tests.length}</option>
              <option value="entry">Входные • {countsByType.entry}</option>
              <option value="final">Финальные • {countsByType.final}</option>
              <option value="annual">Годовые • {countsByType.annual}</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Сортировка:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sns-green focus:border-transparent"
            >
              <option value="updated">По обновлению</option>
              <option value="title">По названию</option>
              <option value="status">По статусу</option>
              <option value="questions">По кол-ву вопросов</option>
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
          
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={loading || loadingQuestions}
              className="flex items-center gap-1 text-sns-green hover:text-sns-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5" />
              <span className="text-sm">Экспорт</span>
            </button>
            <button
              onClick={handleImport}
              disabled={loading || loadingQuestions}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              <span className="text-sm">Импорт</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <TestSection
        title='Тесты для "Технология эффективных продаж"'
        subtitle="Тесты, автоматически назначаемые при создании мероприятия онлайн-тренинга"
        tests={onlineTrainingTests}
        loading={loading}
        deletingTestId={deletingTestId}
        loadingQuestions={loadingQuestions}
        onView={handleViewTest}
        onEdit={handleEditTest}
        onDuplicate={handleDuplicateTest}
        onDelete={handleDeleteTest}
        emptyTitle="Нет стандартных тестов"
        emptyDescr='Нет стандартных тестов для "Технология эффективных продаж"'
        onCreate={handleCreateTest}
      />

      <TestSection
        title='Тесты для "Управление территорией для развития АКБ"'
        subtitle="Тесты, автоматически назначаемые при создании мероприятия очного тренинга"
        tests={akbTests}
        loading={loading}
        deletingTestId={deletingTestId}
        loadingQuestions={loadingQuestions}
        onView={handleViewTest}
        onEdit={handleEditTest}
        onDuplicate={handleDuplicateTest}
        onDelete={handleDeleteTest}
        emptyTitle="Нет стандартных тестов"
        emptyDescr='Нет стандартных тестов для "Управление территорией для развития АКБ"'
        onCreate={handleCreateTest}
      />

      {/* All tests with pagination */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-500" /> Все тесты
          </h2>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <span>На странице:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value) || 20)}
              className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-sns-green focus:border-transparent"
            >
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="ml-3">Стр. {page} / {totalPages}</span>
            <div className="ml-2 flex gap-1">
                        <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded border text-gray-700 disabled:opacity-50"
              >
                Назад
                        </button>
                        <button 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border text-gray-700 disabled:opacity-50"
              >
                Вперёд
                        </button>
                      </div>
        </div>
      </div>

        {/* Мобилка */}
        <div className="p-4 space-y-3 md:hidden">
              {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-4">
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-3" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 bg-gray-100 rounded" />
                  <div className="h-10 bg-gray-100 rounded" />
                  <div className="h-10 bg-gray-100 rounded" />
                    </div>
                      </div>
            ))
          ) : otherTests.length === 0 ? (
            <EmptyState icon={FileText} title="Другие тесты не найдены" description="Нет тестов, которые не относятся к стандартным категориям" />
          ) : (
            pagedOther.map((t) => (
              <TestCard
                key={t.id}
                test={t}
                onView={handleViewTest}
                onEdit={handleEditTest}
                onDuplicate={handleDuplicateTest}
                onDelete={handleDeleteTest}
                busy={deletingTestId === t.id}
                loadingQuestions={loadingQuestions}
              />
            ))
          )}
      </div>
      
        {/* Десктоп */}
        <div className="overflow-hidden hidden md:block">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="w-2/5 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название теста</th>
                <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Балл</th>
                <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Вопросы</th>
                <th className="w-20 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="w-24 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : otherTests.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={FileText} title="Другие тесты не найдены" description="Нет тестов, которые не относятся к стандартным категориям" />
                  </td>
                </tr>
              ) : (
                pagedOther.map((t) => (
                  <TestRow
                    key={t.id}
                    test={t}
                    onView={handleViewTest}
                    onEdit={handleEditTest}
                    onDuplicate={handleDuplicateTest}
                    onDelete={handleDeleteTest}
                    busy={deletingTestId === t.id}
                    loadingQuestions={loadingQuestions}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Пагинация снизу для десктопа */}
        <div className="hidden md:flex items-center justify-between p-4 border-t border-gray-100 text-sm text-gray-600">
          <div>
            Показано {pagedOther.length} из {otherTests.length}
          </div>
          <div className="flex items-center gap-2">
            <span>Стр. {page} / {totalPages}</span>
            <div className="ml-2 flex gap-1">
                        <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded border text-gray-700 disabled:opacity-50"
              >
                Назад
                        </button>
                        <button 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border text-gray-700 disabled:opacity-50"
              >
                Вперёд
                        </button>
                      </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showTestDetails && selectedTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedTest.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <TypePill type={selectedTest.type} />
                  <StatusPill status={selectedTest.status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
              <button
                  onClick={() => handleDuplicateTest(selectedTest)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Дублировать
                </button>
                <button
                  onClick={() => handleEditTest(selectedTest)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-sns-green text-white hover:bg-sns-green-dark transition-colors"
                >
                  Редактировать
                </button>
                <button onClick={handleCloseTestDetails} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} />
              </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Проходной балл</p>
                    <p className="font-medium text-gray-900">{selectedTest.passing_score}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ограничение времени</p>
                    <p className="font-medium text-gray-900">
                      {selectedTest.time_limit === 0 ? 'Не ограничено' : `${selectedTest.time_limit} минут`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Вопросов</p>
                    <p className="font-medium text-gray-900">{questions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Тип мероприятия</p>
                    <p className="font-medium text-gray-900">{selectedTest.event_type?.name_ru || 'Не указан'}</p>
                  </div>
                </div>
                {selectedTest.description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Описание</p>
                    <p className="text-gray-700">{selectedTest.description}</p>
                  </div>
                )}
              </div>
              
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Список вопросов</h4>
              {loadingQuestions ? (
                <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-sns-green border-t-transparent rounded-full animate-spin mr-2" />
                    Загрузка вопросов...
                  </div>
                </div>
              ) : questions.length === 0 ? (
                <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
                  <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">У этого теста нет вопросов</p>
                  <button
                    onClick={() => handleEditTest(selectedTest)}
                    className="mt-4 px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors inline-flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Редактировать тест
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div 
                      key={q.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => handleViewQuestion(q)}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-blue-700 font-semibold">
                            {idx + 1}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 line-clamp-1">{q.question}</h5>
                            <div className="flex flex-wrap items-center mt-1 gap-2">
                              <span
                                className={clsx(
                                  'px-2 py-0.5 rounded text-xs font-medium',
                                  q.question_type === 'single_choice'
                                    ? 'bg-blue-100 text-blue-800'
                                    : q.question_type === 'multiple_choice'
                                    ? 'bg-purple-100 text-purple-800'
                                    : q.question_type === 'sequence'
                                    ? 'bg-lime-100 text-lime-800'
                                    : 'bg-green-100 text-green-800'
                                )}
                              >
                                {getQuestionTypeLabel(q.question_type)}
                              </span>
                              <span className="text-xs text-gray-500">{q.points} балл(ов)</span>
                              {q.answers && (
                                <span className="text-xs text-gray-500">{q.answers.length} вариантов ответа</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Eye size={16} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseTestDetails}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <TestCreationModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        testId={isEditing ? selectedTest?.id : undefined}
        onSuccess={handleTestCreationSuccess}
      />
      
      <QuestionPreviewModal
        isOpen={showQuestionPreview}
        onClose={() => setShowQuestionPreview(false)}
        question={selectedQuestion}
      />
    </div>
  );
}
