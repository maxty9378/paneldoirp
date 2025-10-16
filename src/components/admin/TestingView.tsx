
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Eye,
  Edit,
  Copy,
  Trash2,
  Search,
  Download,
  Upload,
  FileText,
  Clock3,
  Gauge,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Loader2,
  Filter
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { TestCreationModal } from './TestCreationModal';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { useAuth } from '../../hooks/useAuth';
import { ParticipantTestsView } from '../testing/ParticipantTestsView';
import { TestResultsOverview } from './TestResultsOverview';
import { useToast } from '../../hooks/use-toast';

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

export type ViewMode = 'tests' | 'results';

const TYPE_LABELS: Record<Test['type'], string> = {
  entry: 'Входной',
  final: 'Финальный',
  annual: 'Годовой'
};

const STATUS_LABELS: Record<Test['status'], string> = {
  draft: 'Черновик',
  active: 'Активен',
  inactive: 'Выключен'
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: 'Один вариант',
  multiple_choice: 'Несколько вариантов',
  text: 'Текстовый ответ',
  sequence: 'Последовательность'
};
function TypeBadge({ type }: { type: Test['type'] }) {
  const styles: Record<Test['type'], string> = {
    entry: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30',
    final: 'bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/30',
    annual: 'bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/30'
  };

  const style = styles[type] ?? 'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/30';
  const label = TYPE_LABELS[type] ?? type;

  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', style)}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: Test['status'] }) {
  const styles: Record<Test['status'], string> = {
    active: 'bg-emerald-400/15 text-emerald-600 ring-1 ring-emerald-400/30',
    draft: 'bg-amber-400/15 text-amber-700 ring-1 ring-amber-400/30',
    inactive: 'bg-slate-400/15 text-slate-600 ring-1 ring-slate-400/30'
  };

  const style = styles[status] ?? 'bg-slate-400/15 text-slate-600 ring-1 ring-slate-400/30';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide', style)}>
      {label}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent: 'emerald' | 'sky' | 'indigo' | 'amber' | 'purple';
}) {
  const accentStyles: Record<typeof accent, string> = {
    emerald: 'bg-emerald-500/12 text-emerald-600',
    sky: 'bg-sky-500/12 text-sky-600',
    indigo: 'bg-indigo-500/12 text-indigo-600',
    amber: 'bg-amber-500/12 text-amber-600',
    purple: 'bg-purple-500/12 text-purple-600'
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/60 bg-white/80 px-5 py-4 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={clsx('flex h-12 w-12 items-center justify-center rounded-xl', accentStyles[accent])}>{icon}</div>
      </div>
    </div>
  );
}
function FilterBar({
  rawSearch,
  onSearchChange,
  selectedType,
  onTypeChange,
  countsByType,
  totalTests,
  sortKey,
  onSortKeyChange,
  sortDir,
  onSortDirChange,
  onExport,
  onImport,
  disabled
}: {
  rawSearch: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  countsByType: { entry: number; final: number; annual: number };
  totalTests: number;
  sortKey: 'updated' | 'title' | 'status' | 'questions';
  onSortKeyChange: (value: 'updated' | 'title' | 'status' | 'questions') => void;
  sortDir: 'asc' | 'desc';
  onSortDirChange: (value: 'asc' | 'desc') => void;
  onExport: () => void;
  onImport: () => void;
  disabled: boolean;
}) {
  const typeFilters = [
    { value: 'all', label: `Все (${totalTests})` },
    { value: 'entry', label: `Входные (${countsByType.entry})` },
    { value: 'final', label: `Финальные (${countsByType.final})` },
    { value: 'annual', label: `Годовые (${countsByType.annual})` }
  ];

  return (
    <div className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.4)] backdrop-blur-xl space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={rawSearch}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Поиск по названию или описанию..."
            className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-700 shadow-inner shadow-slate-900/5 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Тип теста
          </span>
          <div className="flex flex-wrap gap-2">
            {typeFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => onTypeChange(filter.value)}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                  selectedType === filter.value
                    ? 'bg-emerald-500/15 text-emerald-700 ring-2 ring-emerald-500/30 shadow-sm shadow-emerald-950/10'
                    : 'bg-white/70 text-slate-500 hover:text-slate-700'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm text-slate-500">
            <span>Сортировка</span>
            <select
              value={sortKey}
              onChange={event => onSortKeyChange(event.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            >
              <option value="updated">По обновлению</option>
              <option value="title">По названию</option>
              <option value="status">По статусу</option>
              <option value="questions">По вопросам</option>
            </select>
            <select
              value={sortDir}
              onChange={event => onSortDirChange(event.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExport}
            disabled={disabled}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Экспорт
          </button>
          <button
            onClick={onImport}
            disabled={disabled}
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Импорт
          </button>
        </div>
      </div>
    </div>
  );
}
function TestCard({
  test,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  busy,
  loadingQuestions
}: {
  test: Test;
  onView: (test: Test) => void;
  onEdit: (test: Test) => void;
  onDuplicate: (test: Test) => void;
  onDelete: (id: string) => void;
  busy: boolean;
  loadingQuestions: boolean;
}) {
  return (
    <div className="group relative flex h-full flex-col rounded-[26px] border border-white/60 bg-white/80 p-5 shadow-[0_28px_60px_-38px_rgba(15,23,42,0.4)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_48px_80px_-42px_rgba(15,23,42,0.4)]">
      {busy && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[26px] bg-white/70 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={test.type} />
          <StatusBadge status={test.status} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold leading-tight text-slate-900">{test.title}</h3>
          {test.description && <p className="text-sm leading-relaxed text-slate-600 line-clamp-3">{test.description}</p>}
        </div>
        {test.event_type?.name_ru && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50/60 px-3 py-1 text-xs font-medium text-slate-500">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            {test.event_type.name_ru}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-500">
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-sm font-semibold text-slate-900">
            <Gauge className="h-4 w-4 text-emerald-500" />
            <span>{test.passing_score}%</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.08em]">Проходной</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-sm font-semibold text-slate-900">
            <Clock3 className="h-4 w-4 text-sky-500" />
            <span>{test.time_limit === 0 ? '∞' : `${test.time_limit} мин`}</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.08em]">Лимит</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-sm font-semibold text-slate-900">
            <ClipboardCheck className="h-4 w-4 text-purple-500" />
            <span>{test.questions_count ?? 0}</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.08em]">Вопросы</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={() => onView(test)}
          disabled={loadingQuestions || busy}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingQuestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Просмотр
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(test)}
            className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:text-emerald-600"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDuplicate(test)}
            className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:text-sky-600"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(test.id)}
            className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
function SkeletonCard() {
  return (
    <div className="flex h-full flex-col rounded-[26px] border border-slate-200/60 bg-white/70 p-5">
      <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200/70" />
      <div className="mt-3 h-6 w-3/4 animate-pulse rounded-full bg-slate-200/70" />
      <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-200/60" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-200/60" />
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="h-10 w-28 animate-pulse rounded-full bg-slate-200/60" />
        <div className="flex gap-2">
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200/60" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200/60" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200/60" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[24px] border border-slate-200/70 bg-slate-50/60 px-6 py-10 text-center">
      <FileText className="h-10 w-10 text-slate-300" />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
function CategorySection({
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
  onCreate
}: {
  title: string;
  subtitle?: string;
  tests: Test[];
  loading: boolean;
  deletingTestId: string | null;
  loadingQuestions: boolean;
  onView: (test: Test) => void;
  onEdit: (test: Test) => void;
  onDuplicate: (test: Test) => void;
  onDelete: (id: string) => void;
  onCreate?: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_28px_60px_-38px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 text-left transition hover:border-slate-300"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <span className="text-xs font-medium text-slate-400">{subtitle}</span>}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="rounded-full border border-slate-200 bg-white/70 p-1 text-slate-500">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="mt-5">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <EmptyState
              title="В этой категории пока пусто"
              description="Создайте тест, чтобы пользователи быстрее получали образовательные сценарии."
              action={
                onCreate && (
                  <button
                    onClick={onCreate}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Новый тест
                  </button>
                )
              }
            />
          ) : (
            <div className="-mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-1 scrollbar-hide md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 xl:grid-cols-3">
              {tests.map(test => (
                <TestCard
                  key={test.id}
                  test={test}
                  onView={onView}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  busy={deletingTestId === test.id}
                  loadingQuestions={loadingQuestions}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function AllTestsBoard({
  tests,
  loading,
  pagedTests,
  deletingTestId,
  loadingQuestions,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onView,
  onEdit,
  onDuplicate,
  onDelete
}: {
  tests: Test[];
  loading: boolean;
  pagedTests: Test[];
  deletingTestId: string | null;
  loadingQuestions: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onView: (test: Test) => void;
  onEdit: (test: Test) => void;
  onDuplicate: (test: Test) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_28px_60px_-38px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-slate-200/60 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Все тесты</h2>
          <p className="text-xs text-slate-500">Отображаются результаты с учётом фильтров и сортировки</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>На странице:</span>
          <select
            value={pageSize}
            onChange={event => onPageSizeChange(Number(event.target.value) || 20)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          >
            {[9, 12, 18, 24].map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="hidden md:block">
            Страница {page} из {totalPages}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: pageSize }).map((_, index) => <SkeletonCard key={index} />)
          : pagedTests.map(test => (
              <TestCard
                key={test.id}
                test={test}
                onView={onView}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                busy={deletingTestId === test.id}
                loadingQuestions={loadingQuestions}
              />
            ))}
      </div>

      {!loading && pagedTests.length === 0 && (
        <div className="mt-5">
          <EmptyState
            title="Не найдено тестов по текущим условиям"
            description="Попробуйте изменить фильтр, настройки сортировки или сбросить поисковый запрос."
          />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-slate-200/60 pt-5 text-sm text-slate-500 md:flex-row">
        <div>
          Показано {pagedTests.length} из {tests.length} тестов
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </button>
          <span className="hidden md:inline">Страница {page} из {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Вперёд
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
function TestDetailsModal({
  open,
  test,
  questions,
  loading,
  onClose,
  onDuplicate,
  onEdit,
  onViewQuestion
}: {
  open: boolean;
  test: Test | null;
  questions: Question[];
  loading: boolean;
  onClose: () => void;
  onDuplicate: (test: Test) => void;
  onEdit: (test: Test) => void;
  onViewQuestion: (question: Question) => void;
}) {
  if (!open || !test) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-6">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/15 bg-white shadow-[0_40px_120px_-50px_rgba(15,23,42,0.6)]">
        <div className="flex flex-col gap-4 border-b border-slate-200/60 bg-slate-50/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={test.type} />
                <StatusBadge status={test.status} />
                {test.event_type?.name_ru && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white px-3 py-1 text-xs text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {test.event_type.name_ru}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{test.title}</h3>
              {test.description && <p className="text-sm text-slate-600">{test.description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              Закрыть
            </button>
          </div>

          <div className="grid gap-3 rounded-[20px] border border-white/70 bg-white/80 p-4 text-sm text-slate-600 md:grid-cols-4">
            <div className="flex flex-col gap-1 rounded-[16px] border border-slate-200/60 bg-slate-50/60 p-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Проходной балл</span>
              <span className="text-base font-semibold text-slate-900">{test.passing_score}%</span>
            </div>
            <div className="flex flex-col gap-1 rounded-[16px] border border-slate-200/60 bg-slate-50/60 p-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Временной лимит</span>
              <span className="text-base font-semibold text-slate-900">
                {test.time_limit === 0 ? 'Без ограничений' : `${test.time_limit} мин`}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-[16px] border border-slate-200/60 bg-slate-50/60 p-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Вопросов</span>
              <span className="text-base font-semibold text-slate-900">{questions.length}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-[16px] border border-slate-200/60 bg-slate-50/60 p-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Последнее обновление</span>
              <span className="text-base font-semibold text-slate-900">
                {new Date(test.updated_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onEdit(test)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <Edit className="h-4 w-4" />
              Редактировать
            </button>
            <button
              onClick={() => onDuplicate(test)}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-600 transition hover:border-sky-300 hover:text-sky-700"
            >
              <Copy className="h-4 w-4" />
              Дублировать
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h4 className="text-lg font-semibold text-slate-900">Список вопросов</h4>
          <p className="mb-4 text-xs text-slate-500">Нажмите на карточку, чтобы открыть детальный предпросмотр.</p>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Загружаем вопросы...
            </div>
          ) : questions.length === 0 ? (
            <EmptyState
              title="У теста пока нет вопросов"
              description="Добавьте вопросы, чтобы тест можно было назначать участникам."
              action={
                <button
                  onClick={() => onEdit(test)}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Добавить вопросы
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => onViewQuestion(question)}
                  className="w-full rounded-[20px] border border-slate-200/70 bg-white/90 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 font-semibold text-emerald-600">
                          {index + 1}
                        </span>
                        <span>{QUESTION_TYPE_LABELS[question.question_type] ?? 'Вопрос'}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {question.points} баллов
                        </span>
                        {question.answers && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            {question.answers.length} ответов
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900">{question.question}</p>
                    </div>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function TestingView() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [rawSearch, setRawSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'updated' | 'title' | 'status' | 'questions'>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tests');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(
          `
            *,
            event_type:event_type_id(name, name_ru),
            test_questions(count)
          `
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped: Test[] =
        data?.map((test: any) => ({
          ...test,
          questions_count: test.test_questions?.[0]?.count ?? 0
        })) ?? [];

      setTests(mapped);
    } catch (err) {
      console.error('Ошибка при загрузке тестов:', err);
      toast('Не удалось загрузить тесты, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTestQuestions = useCallback(
    async (testId: string) => {
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
          (data ?? []).map(async (question: any) => {
            if (question.question_type === 'sequence') {
              const { data: seqAnswers, error: seqError } = await supabase
                .from('test_sequence_answers')
                .select('*')
                .eq('question_id', question.id)
                .order('answer_order');
              if (seqError) throw seqError;
              const answers: Answer[] =
                seqAnswers?.map((answer: any) => ({
                  id: answer.id,
                  question_id: answer.question_id,
                  text: answer.answer_text,
                  order: answer.answer_order,
                  is_correct: true
                })) ?? [];
              return { ...question, answers } as Question;
            }

            const { data: answersData, error: answersError } = await supabase
              .from('test_answers')
              .select('*')
              .eq('question_id', question.id)
              .order('order');

            if (answersError) throw answersError;

            const answers: Answer[] =
              answersData?.map((answer: any) => ({
                id: answer.id,
                question_id: answer.question_id,
                text: answer.text,
                order: answer.order,
                is_correct: Boolean(answer.is_correct)
              })) ?? [];

            return { ...question, answers } as Question;
          })
        );

        setQuestions(questionsWithAnswers);
        return questionsWithAnswers;
      } catch (err) {
        console.error('Ошибка при загрузке вопросов:', err);
        toast('Не удалось загрузить вопросы теста.');
        return [];
      } finally {
        setLoadingQuestions(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchTerm(rawSearch.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [rawSearch]);
  const filteredTests = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = tests.filter(test => {
      const matchesText = term
        ? test.title.toLowerCase().includes(term) || test.description?.toLowerCase().includes(term)
        : true;
      const matchesType = selectedType === 'all' ? true : test.type === (selectedType as Test['type']);
      return matchesText && matchesType;
    });

    const direction = sortDir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return a.title.localeCompare(b.title) * direction;
        case 'status':
          return a.status.localeCompare(b.status) * direction;
        case 'questions':
          return ((a.questions_count ?? 0) - (b.questions_count ?? 0)) * direction;
        case 'updated':
        default:
          return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * direction;
      }
    });
  }, [tests, searchTerm, selectedType, sortKey, sortDir]);

  const countsByType = useMemo(
    () => ({
      entry: tests.filter(test => test.type === 'entry').length,
      final: tests.filter(test => test.type === 'final').length,
      annual: tests.filter(test => test.type === 'annual').length
    }),
    [tests]
  );

  const onlineTrainingTests = filteredTests.filter(test => test.event_type?.name === 'online_training' && ['entry', 'final', 'annual'].includes(test.type));

  const akbTests = filteredTests.filter(
    test =>
      test.event_type?.name === 'in_person_training' &&
      test.title.includes('Управление территорией для развития АКБ') &&
      ['entry', 'final', 'annual'].includes(test.type)
  );

  const otherTests = filteredTests.filter(
    test =>
      !(
        (test.event_type?.name === 'online_training' && ['entry', 'final', 'annual'].includes(test.type)) ||
        (test.event_type?.name === 'in_person_training' &&
          test.title.includes('Управление территорией для развития АКБ') &&
          ['entry', 'final', 'annual'].includes(test.type))
      )
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedType, sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(otherTests.length / pageSize));

  const pagedOtherTests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return otherTests.slice(start, start + pageSize);
  }, [otherTests, page, pageSize]);

  const stats = useMemo(
    () => ({
      totalTests: tests.length,
      activeTests: tests.filter(test => test.status === 'active').length,
      entryTests: tests.filter(test => test.type === 'entry').length,
      finalTests: tests.filter(test => test.type === 'final').length,
      totalQuestions: tests.reduce((sum, test) => sum + (test.questions_count ?? 0), 0)
    }),
    [tests]
  );
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

  async function handleDuplicateTest(test: Test) {
    try {
      const { data: newTest, error } = await supabase
        .from('tests')
        .insert({
          title: `Копия ${test.title}`,
          description: test.description,
          type: test.type,
          passing_score: test.passing_score,
          time_limit: test.time_limit,
          event_type_id: test.event_type_id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      const originalQuestions = await fetchTestQuestions(test.id);

      for (const question of originalQuestions) {
        const { data: createdQuestion, error: questionInsertError } = await supabase
          .from('test_questions')
          .insert({
            test_id: newTest.id,
            question: question.question,
            question_type: question.question_type,
            order: question.order,
            points: question.points,
            explanation: question.explanation ?? null
          })
          .select()
          .single();

        if (questionInsertError) throw questionInsertError;

        if (question.answers?.length) {
          if (question.question_type === 'sequence') {
            const payload = question.answers.map(answer => ({
              question_id: createdQuestion.id,
              answer_text: answer.text,
              answer_order: answer.order,
              is_correct: true
            }));
            const { error: seqError } = await supabase.from('test_sequence_answers').insert(payload);
            if (seqError) throw seqError;
          } else {
            const payload = question.answers.map(answer => ({
              question_id: createdQuestion.id,
              text: answer.text,
              is_correct: answer.is_correct,
              order: answer.order
            }));
            const { error: answersError } = await supabase.from('test_answers').insert(payload);
            if (answersError) throw answersError;
          }
        }
      }

      await fetchTests();
      toast(`Тест скопирован: ${newTest.title}`);
    } catch (err) {
      console.error('Ошибка при дублировании теста:', err);
      toast('Не удалось создать копию теста.');
    }
  }

  async function handleDeleteTest(testId: string) {
    if (!window.confirm('Удалить тест? Действие необратимо.')) return;

    setDeletingTestId(testId);
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (error) throw error;
      setTests(prev => prev.filter(test => test.id !== testId));
      toast('Тест удалён');
    } catch (err) {
      console.error('Ошибка при удалении теста:', err);
      toast('Не удалось удалить тест.');
    } finally {
      setDeletingTestId(null);
    }
  }

  function handleTestCreationSuccess() {
    fetchTests();
  }

  function handleExport() {
    toast('Экспорт доступен в ближайшем обновлении.');
  }

  function handleImport() {
    toast('Импорт доступен в ближайшем обновлении.');
  }
  const isEmployee = userProfile?.role === 'employee';
  if (isEmployee) return <ParticipantTestsView />;

  if (viewMode === 'results') {
    return <TestResultsOverview onBack={() => setViewMode('tests')} />;
  }

  const quickStats = [
    {
      title: 'Всего тестов',
      value: stats.totalTests,
      icon: <FileText className="h-5 w-5" />,
      accent: 'emerald' as const
    },
    {
      title: 'Активные',
      value: stats.activeTests,
      icon: <ShieldCheck className="h-5 w-5" />,
      accent: 'sky' as const
    },
    {
      title: 'Входные',
      value: stats.entryTests,
      icon: <BarChart3 className="h-5 w-5" />,
      accent: 'purple' as const
    },
    {
      title: 'Вопросов суммарно',
      value: stats.totalQuestions,
      icon: <ClipboardCheck className="h-5 w-5" />,
      accent: 'amber' as const
    }
  ];

  const overviewMessage = stats.totalTests
    ? `Всего тестов: ${stats.totalTests}. Активных: ${stats.activeTests}.`
    : 'Добавьте первый тест, чтобы сотрудники могли проходить обучение.';

  return (
    <div className="space-y-8 pb-safe-bottom">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-slate-900">Управление тестированием</h1>
          <p className="text-sm text-slate-600">{overviewMessage}</p>
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-600">
            <button
              onClick={() => setViewMode('tests')}
              className={clsx(
                'flex items-center gap-2 rounded-full px-4 py-2 transition',
                viewMode === 'tests' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              )}
            >
              <FileText className="h-4 w-4" />
              Тесты
            </button>
            <button
              onClick={() => setViewMode('results')}
              className={clsx(
                'flex items-center gap-2 rounded-full px-4 py-2 transition',
                viewMode === 'results' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Результаты
            </button>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleCreateTest}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Создать тест
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map(stat => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} accent={stat.accent} />
        ))}
      </section>

      <FilterBar
        rawSearch={rawSearch}
        onSearchChange={setRawSearch}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        countsByType={countsByType}
        totalTests={tests.length}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        onExport={handleExport}
        onImport={handleImport}
        disabled={loading || loadingQuestions}
      />

      <CategorySection
        title='Категория "Online training"'
        subtitle="Стандартные входные, финальные и годовые тесты для онлайн-программ"
        tests={onlineTrainingTests}
        loading={loading}
        deletingTestId={deletingTestId}
        loadingQuestions={loadingQuestions}
        onView={handleViewTest}
        onEdit={handleEditTest}
        onDuplicate={handleDuplicateTest}
        onDelete={handleDeleteTest}
        onCreate={handleCreateTest}
      />

      <CategorySection
        title='Категория "Управление территорией для развития АКБ"'
        subtitle="Специализированные тесты для очных программ развития территорий"
        tests={akbTests}
        loading={loading}
        deletingTestId={deletingTestId}
        loadingQuestions={loadingQuestions}
        onView={handleViewTest}
        onEdit={handleEditTest}
        onDuplicate={handleDuplicateTest}
        onDelete={handleDeleteTest}
        onCreate={handleCreateTest}
      />

      <AllTestsBoard
        tests={otherTests}
        loading={loading}
        pagedTests={pagedOtherTests}
        deletingTestId={deletingTestId}
        loadingQuestions={loadingQuestions}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onView={handleViewTest}
        onEdit={handleEditTest}
        onDuplicate={handleDuplicateTest}
        onDelete={handleDeleteTest}
      />

      <TestDetailsModal
        open={showTestDetails}
        test={selectedTest}
        questions={questions}
        loading={loadingQuestions}
        onClose={handleCloseTestDetails}
        onDuplicate={handleDuplicateTest}
        onEdit={handleEditTest}
        onViewQuestion={handleViewQuestion}
      />

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


