import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Users,
  MapPin,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from 'lucide-react';

interface TrainerTerritory {
  id: string;
  trainer_id: string;
  territory_id: string;
  trainer: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    branch_id?: string;
    branch?: {
      id: string;
      name: string;
      code?: string;
    };
  };
  territory: {
    id: string;
    name: string;
    region?: string;
  };
  assigned_at: string;
  is_active: boolean;
}

type SortKey = 'trainer' | 'territory' | 'date' | 'status';
type SortDir = 'asc' | 'desc';

export function TrainerTerritoriesView() {
  const { userProfile } = useAuth();
  const { territories } = useAdmin();

  const [trainerTerritories, setTrainerTerritories] = useState<TrainerTerritory[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const isAdmin = userProfile?.role === 'administrator';

  // debounced search
  const searchRef = useRef<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchRef.current) window.clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
    return () => { if (searchRef.current) window.clearTimeout(searchRef.current); };
  }, [searchTerm]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('trainer_territories')
        .select(`
          id, trainer_id, territory_id, assigned_at, is_active,
          trainer:users!trainer_territories_trainer_id_fkey(
            id, full_name, email, phone, branch_id,
            branch:branches!users_branch_id_fkey(id, name, code)
          ),
          territory:territories!trainer_territories_territory_id_fkey(id, name, region)
        `)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const { data: trainersData, error: trainersError } = await supabase
        .from('users')
        .select(`
          id, full_name, email, phone, branch_id,
          branch:branches!users_branch_id_fkey(id, name, code)
        `)
        .eq('role', 'trainer')
        .eq('is_active', true)
        .order('full_name');

      if (trainersError) throw trainersError;

      // Преобразуем данные в правильный формат
      const formattedAssignments = (assignments || []).map(assignment => {
        const trainer = Array.isArray(assignment.trainer) ? assignment.trainer[0] : assignment.trainer;
        return {
          ...assignment,
          trainer: {
            ...trainer,
            branch: Array.isArray(trainer?.branch) ? trainer.branch[0] : trainer?.branch,
          },
          territory: Array.isArray(assignment.territory) ? assignment.territory[0] : assignment.territory,
        };
      });
      
      const formattedTrainers = (trainersData || []).map(trainer => ({
        ...trainer,
        branch: Array.isArray(trainer.branch) ? trainer.branch[0] : trainer.branch,
      }));

      setTrainerTerritories(formattedAssignments);
      setTrainers(formattedTrainers);
    } catch (e: any) {
      console.error(e);
      setError('Не удалось загрузить данные. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedTrainer || !selectedTerritory) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('trainer_territories')
        .insert({ trainer_id: selectedTrainer, territory_id: selectedTerritory, is_active: true });
      if (error) throw error;
      setSelectedTrainer('');
      setSelectedTerritory('');
      setShowAssignModal(false);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      setError('Ошибка назначения тренера.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(row: TrainerTerritory) {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('trainer_territories')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      console.error(e);
      setError('Не удалось изменить статус.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from('trainer_territories').delete().eq('id', id);
      if (error) throw error;
      setConfirmDeleteId(null);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      setError('Ошибка удаления назначения.');
    } finally {
      setSaving(false);
    }
  }

  const sortedFiltered = useMemo(() => {
    let list = [...trainerTerritories];

    // filter by active
    if (filterActive !== 'all') {
      list = list.filter(x => filterActive === 'active' ? x.is_active : !x.is_active);
    }

    // search
    if (debouncedSearch) {
      list = list.filter((x) => {
        const t = x.trainer?.full_name?.toLowerCase() || '';
        const e = x.trainer?.email?.toLowerCase() || '';
        const terr = x.territory?.name?.toLowerCase() || '';
        const reg = x.territory?.region?.toLowerCase() || '';
        return t.includes(debouncedSearch) || e.includes(debouncedSearch) || terr.includes(debouncedSearch) || reg.includes(debouncedSearch);
      });
    }

    // sort
    list.sort((a, b) => {
      let A = '', B = '';
      if (sortKey === 'trainer') { A = a.trainer.full_name; B = b.trainer.full_name; }
      if (sortKey === 'territory') { A = a.territory.name; B = b.territory.name; }
      if (sortKey === 'status') { A = a.is_active ? '1' : '0'; B = b.is_active ? '1' : '0'; }
      if (sortKey === 'date') { A = a.assigned_at; B = b.assigned_at; }
      const cmp = A.localeCompare(B, 'ru', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [trainerTerritories, debouncedSearch, filterActive, sortKey, sortDir]);

  function switchSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>У вас нет прав для доступа к этому разделу</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
              <Building2 className="h-5 w-5 text-emerald-700" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Филиалы тренеров</h1>
              <p className="text-sm text-gray-600">Управление филиалами работы тренеров (у каждого есть филиал базирования и может быть несколько филиалов работы)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Назначить тренера
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          icon={<Users className="h-6 w-6 text-emerald-600" />}
          label="Всего тренеров"
          value={trainers.length}
        />
        <KpiCard
          icon={<MapPin className="h-6 w-6 text-sky-600" />}
          label="Филиалов"
          value={territories.length}
        />
        <KpiCard
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          label="Активных назначений"
          value={trainerTerritories.filter(a => a.is_active).length}
        />
        <KpiCard
          icon={<AlertCircle className="h-6 w-6 text-orange-500" />}
          label="Неактивных"
          value={trainerTerritories.filter(a => !a.is_active).length}
        />
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 mb-3 rounded-2xl border border-gray-200 bg-white/70 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500"
                placeholder="Поиск по тренеру, email, филиалу…"
              />
            </div>

            <div className="hidden h-6 w-px bg-gray-200 md:block" />

            <div className="flex items-center gap-1">
              <FilterChip
                active={filterActive === 'all'}
                onClick={() => setFilterActive('all')}
                label="Все"
              />
              <FilterChip
                active={filterActive === 'active'}
                onClick={() => setFilterActive('active')}
                label="Активные"
              />
              <FilterChip
                active={filterActive === 'inactive'}
                onClick={() => setFilterActive('inactive')}
                label="Неактивные"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SortButton active={sortKey === 'date'} dir={sortKey === 'date' ? sortDir : undefined} onClick={() => switchSort('date')} label="По дате" />
            <SortButton active={sortKey === 'trainer'} dir={sortKey === 'trainer' ? sortDir : undefined} onClick={() => switchSort('trainer')} label="По тренеру" />
            <SortButton active={sortKey === 'territory'} dir={sortKey === 'territory' ? sortDir : undefined} onClick={() => switchSort('territory')} label="По филиалу" />
            <SortButton active={sortKey === 'status'} dir={sortKey === 'status' ? sortDir : undefined} onClick={() => switchSort('status')} label="По статусу" />
          </div>
        </div>
      </div>

      {/* Table / Skeleton / Empty */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <SkeletonTable />
        ) : sortedFiltered.length === 0 ? (
          <EmptyState
            title={debouncedSearch || filterActive !== 'all' ? 'Ничего не найдено' : 'Назначений пока нет'}
            subtitle={debouncedSearch || filterActive !== 'all'
              ? 'Попробуйте изменить фильтры или запрос'
              : 'Назначьте первого тренера на филиал работы'}
            actionLabel="Назначить тренера"
            onAction={() => setShowAssignModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="text-left">
                  <Th>Тренер</Th>
                  <Th>Филиал работы</Th>
                  <Th>Назначение</Th>
                  <Th>Статус</Th>
                  <Th className="text-right">Действия</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedFiltered.map((x) => (
                  <tr key={x.id} className="hover:bg-gray-50/70">
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{x.trainer.full_name}</span>
                        <span className="text-gray-500">{x.trainer.email}</span>
                        {x.trainer.phone && <span className="text-gray-400">{x.trainer.phone}</span>}
                        {x.trainer.branch && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                              <Building2 className="h-3 w-3" />
                              Базирование: {x.trainer.branch.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{x.territory.name}</span>
                        {x.territory.region && <span className="text-gray-500">{x.territory.region}</span>}
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 mt-1">
                          <MapPin className="h-3 w-3" />
                          Филиал работы
                        </span>
                      </div>
                    </Td>
                    <Td>
                      {new Date(x.assigned_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          x.is_active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${x.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {x.is_active ? 'Активно' : 'Неактивно'}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(x)}
                          disabled={saving}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            x.is_active
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {x.is_active ? 'Деактивировать' : 'Активировать'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(x.id)}
                          disabled={saving}
                          className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          aria-label="Удалить назначение"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 rounded-md px-2 text-xs hover:bg-white/40">
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && (
        <Modal onClose={() => setShowAssignModal(false)} title="Назначить тренера к филиалу работы">
          <div className="space-y-4">
            <Field label="Тренер">
              <select
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Выберите тренера</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email}) {t.branch ? `- ${t.branch.name}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Филиал работы">
              <select
                value={selectedTerritory}
                onChange={(e) => setSelectedTerritory(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Выберите филиал работы</option>
                {territories.map((tt: any) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name} {tt.region ? `(${tt.region})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowAssignModal(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
              disabled={saving}
            >
              Отмена
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedTrainer || !selectedTerritory || saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение…' : 'Назначить'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <Modal onClose={() => setConfirmDeleteId(null)} title="Удалить назначение?">
          <p className="text-sm text-gray-600">
            Это действие нельзя отменить. Назначение будет удалено безвозвратно.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
              disabled={saving}
            >
              Отмена
            </button>
            <button
              onClick={() => handleDelete(confirmDeleteId)}
              disabled={saving}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700"
            >
              Удалить
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- UI helpers ---------- */

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function SortButton({
  active,
  dir,
  onClick,
  label,
}: {
  active?: boolean;
  dir?: SortDir;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`}
      title={active ? (dir === 'asc' ? 'По возрастанию' : 'По убыванию') : 'Сортировать'}
    >
      {label}
      <ChevronDown className={`h-3.5 w-3.5 transition ${active && dir === 'desc' ? 'rotate-180' : ''}`} />
    </button>
  );
}

function Th({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <td className={`px-5 py-3 align-middle ${className}`}>{children}</td>;
}

function SkeletonTable() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 p-4">
          <div className="col-span-3 h-5 animate-pulse rounded bg-gray-100" />
          <div className="col-span-3 h-5 animate-pulse rounded bg-gray-100" />
          <div className="col-span-2 h-5 animate-pulse rounded bg-gray-100" />
          <div className="col-span-2 h-5 animate-pulse rounded bg-gray-100" />
          <div className="col-span-2 h-5 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16">
      <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
        <MapPin className="h-6 w-6 text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{subtitle}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: React.PropsWithChildren<{ title: string; onClose: () => void }>) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[min(96vw,560px)] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">Закрыть</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
