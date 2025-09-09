import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Users,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  GripVertical,
  Plus,
  Edit3,
  X,
  Search,
  ChevronDown,
} from 'lucide-react';

/* ----------------- types ----------------- */

interface TrainerTerritory {
  id: string;
  trainer_id: string;
  territory_id: string;
  trainer: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    territory_id?: string;
    territory?: {
      id: string;
      name: string;
      region?: string;
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

interface TerritoryLog {
  id: string;
  trainer_territory_id: string;
  trainer_id: string;
  territory_id: string;
  action: 'assigned' | 'unassigned' | 'activated' | 'deactivated' | 'deleted';
  performed_by: string;
  performed_at: string;
  metadata: any;
  trainer: { full_name: string };
  territory: { name: string };
  performer: { full_name: string };
}

type Territory = { id: string; name: string; region?: string };

/* ----------------- component ----------------- */

export function TrainerTerritoriesView() {
  const { userProfile } = useAuth();
  const { territories } = useAdmin();

  const [trainerTerritories, setTrainerTerritories] = useState<TrainerTerritory[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [logs, setLogs] = useState<TerritoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedTrainerForAssign, setSelectedTrainerForAssign] = useState<any>(null); // для modal/drawer
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // аккордеон на мобилке

  const [draggedTerritory, setDraggedTerritory] = useState<string | null>(null);
  const [dragOverTrainer, setDragOverTrainer] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [showAvailableTerritories, setShowAvailableTerritories] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [logsLimit, setLogsLimit] = useState(10);

  const isAdmin = userProfile?.role === 'administrator';
  const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;

  // debounce
  const debounceRef = useRef<number | null>(null);
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin, logsLimit]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('trainer_territories')
        .select(`
          id, trainer_id, territory_id, assigned_at, is_active,
          trainer:users!trainer_territories_trainer_id_fkey(
            id, full_name, email, phone, territory_id,
            territory:territories!users_territory_id_fkey(id, name, region)
          ),
          territory:territories!trainer_territories_territory_id_fkey(id, name, region)
        `)
        .order('assigned_at', { ascending: false });
      if (assignmentsError) throw assignmentsError;

      const { data: trainersData, error: trainersError } = await supabase
        .from('users')
        .select(`
          id, full_name, email, phone, territory_id,
          territory:territories!users_territory_id_fkey(id, name, region)
        `)
        .eq('role', 'trainer')
        .eq('is_active', true)
        .order('full_name');
      if (trainersError) throw trainersError;

      const { data: logsData, error: logsError } = await supabase
        .from('trainer_territories_log')
        .select(`
          id, trainer_territory_id, trainer_id, territory_id, action, performed_by, performed_at, metadata,
          trainer:users!trainer_territories_log_trainer_id_fkey(full_name),
          territory:territories!trainer_territories_log_territory_id_fkey(name),
          performer:users!trainer_territories_log_performed_by_fkey(full_name)
        `)
        .order('performed_at', { ascending: false })
        .limit(logsLimit);
      if (logsError) throw logsError;

      const formattedAssignments: TrainerTerritory[] = (assignments || []).map((a: any) => {
        const trainer = Array.isArray(a.trainer) ? a.trainer[0] : a.trainer;
        const trainerTerritory = Array.isArray(trainer?.territory) ? trainer.territory[0] : trainer?.territory;
        const territory = Array.isArray(a.territory) ? a.territory[0] : a.territory;
        return { ...a, trainer: { ...trainer, territory: trainerTerritory }, territory };
      });

      const formattedTrainers = (trainersData || []).map((t: any) => {
        const territory = Array.isArray(t.territory) ? t.territory[0] : t.territory;
        return { ...t, territory };
      });

      const formattedLogs: TerritoryLog[] = (logsData || []).map((log: any) => ({
        ...log,
        trainer: Array.isArray(log.trainer) ? log.trainer[0] : log.trainer,
        territory: Array.isArray(log.territory) ? log.territory[0] : log.territory,
        performer: Array.isArray(log.performer) ? log.performer[0] : log.performer,
      }));

      setTrainerTerritories(formattedAssignments);
      setTrainers(formattedTrainers);
      setLogs(formattedLogs);
    } catch (e: any) {
      console.error(e);
      setError('Не удалось загрузить данные. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  }

  /* helpers */
  function getTrainerTerrs(trainerId: string) {
    return trainerTerritories.filter(tt => tt.trainer_id === trainerId);
  }
  function pluralizeTerritories(count: number) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return `${count} филиалов`;
    }
    
    if (lastDigit === 1) {
      return `${count} филиал`;
    } else if (lastDigit >= 2 && lastDigit <= 4) {
      return `${count} филиала`;
    } else {
      return `${count} филиалов`;
    }
  }
  function isTerritoryAssigned(trainerId: string, territoryId: string) {
    return trainerTerritories.some(tt => tt.trainer_id === trainerId && tt.territory_id === territoryId);
  }
  function getAvailableTerritories() {
    const assigned = new Set(trainerTerritories.map(tt => tt.territory_id));
    return (territories as Territory[]).filter(t => !assigned.has(t.id));
  }
  function getFilteredAvailableTerritories() {
    const available = getAvailableTerritories();
    if (!modalSearch) return available;
    return available.filter(t => 
      t.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
      (t.region && t.region.toLowerCase().includes(modalSearch.toLowerCase()))
    );
  }
  function getActionText(action: string) {
    const m: any = { assigned: 'назначил', unassigned: 'отменил назначение', activated: 'активировал', deactivated: 'деактивировал', deleted: 'удалил' };
    return m[action] || action;
  }

  /* DnD (desktop) */
  function handleDragStart(territoryId: string) { if (!isTouch) setDraggedTerritory(territoryId); }
  function handleDragEnd() { setDraggedTerritory(null); setDragOverTrainer(null); }
  function handleDragOverTrainerCard(e: React.DragEvent, trainerId: string) { e.preventDefault(); setDragOverTrainer(trainerId); }
  async function handleDrop(trainerId: string) {
    if (draggedTerritory) {
      if (!isTerritoryAssigned(trainerId, draggedTerritory)) await handleAssign(trainerId, draggedTerritory);
    }
    setDraggedTerritory(null); setDragOverTrainer(null);
  }

  /* CRUD */
  async function handleAssign(trainerId: string, territoryId: string) {
    setSaving(true); setError(null);
    try {
      const { error } = await supabase.from('trainer_territories').insert({ trainer_id: trainerId, territory_id: territoryId, is_active: true });
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      console.error(e); setError('Ошибка назначения тренера.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setSaving(true); setError(null);
    try {
      if (userProfile?.role !== 'administrator') throw new Error('У вас нет прав для удаления назначений');
      const { error } = await supabase.from('trainer_territories').delete().eq('id', id);
      if (error) throw error;
      setConfirmDeleteId(null);
      await fetchData();
    } catch (e: any) {
      console.error(e); setError(`Ошибка удаления: ${e.message || 'Неизвестная ошибка'}`);
    } finally { setSaving(false); }
  }

  /* фильтр */
  const filteredTrainers = useMemo(() => {
    if (!debounced) return trainers;
    return trainers.filter((t: any) => {
      const f = (t.full_name || '').toLowerCase();
      const e = (t.email || '').toLowerCase();
      const b = (t.territory?.name || '').toLowerCase();
      return f.includes(debounced) || e.includes(debounced) || b.includes(debounced);
    });
  }, [trainers, debounced]);

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

  /* ----------------- UI ----------------- */

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
            <Building2 className="h-5 w-5 text-emerald-700" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Филиалы тренеров</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              На десктопе — перетаскивание филиалов. На телефоне — через кнопку «Редактировать».
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard icon={<Users className="h-5 w-5 text-emerald-600" />} label="Тренеров" value={trainers.length} />
        <KpiCard icon={<MapPin className="h-5 w-5 text-sky-600" />} label="Филиалов" value={(territories as Territory[]).length} />
        <KpiCard icon={<CheckCircle className="h-5 w-5 text-green-600" />} label="Назначений" value={trainerTerritories.length} />
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 mb-4 rounded-2xl border border-gray-200 bg-white/80 p-2 sm:p-3 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Поиск по тренеру, email или базированию…"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAvailableTerritories((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Building2 className="h-4 w-4" />
              {showAvailableTerritories ? 'Скрыть филиалы' : 'Показать филиалы'}
            </button>
            <button
              onClick={() => setShowLogs((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <AlertCircle className="h-4 w-4" />
              {showLogs ? 'Скрыть логи' : 'Показать логи'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {loading ? (
          <SkeletonList />
        ) : (
          <>
            {/* Trainers header */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Тренеры и их филиалы</h3>

              {filteredTrainers.length === 0 && (
                <EmptyState title="Тренеры не найдены" subtitle="Измени запрос поиска, чтобы увидеть список" />
              )}
            </div>

            {/* Main content row */}
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Trainers list */}
              <div className="flex-1 space-y-3 sm:space-y-4">
              {filteredTrainers.map((trainer: any) => {
                const assigned = getTrainerTerrs(trainer.id);
                const isDropTarget = dragOverTrainer === trainer.id;
                const isOpen = expanded[trainer.id] ?? true; // по умолчанию открыто на десктопе, на мобилке — свернуто
                return (
                  <div
                    key={trainer.id}
                    onDrop={() => !isTouch && handleDrop(trainer.id)}
                    onDragOver={(e) => !isTouch && handleDragOverTrainerCard(e, trainer.id)}
                    onDragLeave={() => setDragOverTrainer(null)}
                    className={`rounded-2xl border bg-white p-3 sm:p-4 transition-colors ${
                      !isTouch && isDropTarget ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-gray-200'
                    }`}
                  >
                     {/* header row */}
                     <div
                       className="w-full flex items-center justify-between gap-3"
                       onClick={() => isTouch && setExpanded((m) => ({ ...m, [trainer.id]: !isOpen }))}
                       role={isTouch ? "button" : undefined}
                       tabIndex={isTouch ? 0 : undefined}
                       onKeyDown={(e) => {
                         if (isTouch && (e.key === 'Enter' || e.key === ' ')) {
                           e.preventDefault();
                           setExpanded((m) => ({ ...m, [trainer.id]: !isOpen }));
                         }
                       }}
                       aria-expanded={isTouch ? isOpen : undefined}
                     >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                          <Users className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-900">{trainer.full_name}</div>
                          <div className="truncate text-xs sm:text-sm text-gray-500">{trainer.email}</div>
                        </div>
                      </div>

                       <div className="flex items-center gap-2">
                         <span className="hidden sm:inline rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                           {pluralizeTerritories(assigned.length)}
                         </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedTrainerForAssign(trainer); }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700"
                          title="Редактировать филиалы"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                         {isTouch && <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                       </div>
                     </div>

                    {/* assigned list */}
                    {(!isTouch || isOpen) && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {assigned
                          .sort((a, b) => {
                            const aIsBase = trainer.territory_id === a.territory.id;
                            const bIsBase = trainer.territory_id === b.territory.id;
                            if (aIsBase && !bIsBase) return -1;
                            if (!aIsBase && bIsBase) return 1;
                            return 0;
                          })
                          .map((a) => {
                          const isBase = trainer.territory_id === a.territory.id;
                          return (
                            <div
                              key={a.id}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                                isBase ? 'border-blue-300 bg-blue-50' : 'border-emerald-200 bg-emerald-50'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${isBase ? 'text-blue-600' : 'text-emerald-600'}`} />
                                <div className="min-w-0">
                                  <div className={`truncate text-sm font-medium ${isBase ? 'text-blue-900' : 'text-emerald-900'}`}>
                                    {a.territory.name}
                                    {isBase && <span className="ml-1 text-xs font-normal text-blue-600">(базирование)</span>}
                                  </div>
                                  {a.territory.region && (
                                    <div className={`truncate text-xs ${isBase ? 'text-blue-600' : 'text-emerald-600'}`}>{a.territory.region}</div>
                                  )}
                                </div>
                              </div>
                              {!isBase && (
                                <button
                                  onClick={() => handleDelete(a.id)}
                                  className="rounded p-1 text-red-500 hover:bg-white hover:text-red-600"
                                  title="Удалить филиал"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {assigned.length === 0 && (
                          <div className="col-span-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-center text-xs sm:text-sm text-gray-500">
                            {isTouch ? 'Нажми «редактировать», чтобы назначить филиалы' : 'Перетащи филиал сюда или нажми «редактировать»'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>

              {/* Territories (desktop sidebar) */}
              {showAvailableTerritories && !isTouch && (
                <div className="w-full flex-shrink-0 lg:w-72">
                  <div className="sticky top-4 rounded-2xl border border-gray-200 bg-white p-3">
                    <h3 className="mb-3 text-base font-semibold text-gray-900">Доступные филиалы</h3>
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                      {getAvailableTerritories().length > 0 ? (
                        getAvailableTerritories().map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={() => handleDragStart(t.id)}
                            onDragEnd={handleDragEnd}
                            className={`cursor-move rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 transition-all hover:border-emerald-400 hover:bg-emerald-50 ${
                              draggedTerritory === t.id ? 'opacity-50' : ''
                            }`}
                            title="Перетащите на карточку тренера"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900">{t.name}</div>
                                {t.region && <div className="truncate text-xs text-gray-500">{t.region}</div>}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                          <Building2 className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2">Все филиалы назначены тренерам</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-gray-500"><span role="img" aria-label="hint">💡</span> Перетащите на тренера</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Logs */}
      {showLogs && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-900">История изменений</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {log.performer?.full_name} {getActionText(log.action)} филиал «{log.territory?.name}» для {log.trainer?.full_name}
                  </div>
                  <div className="text-xs text-gray-500">{new Date(log.performed_at).toLocaleString('ru-RU')}</div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    log.action === 'assigned' || log.action === 'activated'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {getActionText(log.action)}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                Нет записей в истории
              </div>
            )}
            {logs.length > 0 && logs.length >= logsLimit && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setLogsLimit(prev => prev + 10)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Показать больше
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 rounded-md px-2 text-xs hover:bg-white/40">Закрыть</button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <Modal onClose={() => setConfirmDeleteId(null)} title="Удалить назначение?">
          <p className="text-sm text-gray-600">Это действие нельзя отменить. Назначение будет удалено безвозвратно.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setConfirmDeleteId(null)} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50" disabled={saving}>Отмена</button>
            <button onClick={() => handleDelete(confirmDeleteId)} disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700">Удалить</button>
          </div>
        </Modal>
      )}

      {/* Assign drawer/modal (mobile friendly) */}
      {selectedTrainerForAssign && !selectedTrainerForAssign.bulk && (
        <BottomSheet onClose={() => { setSelectedTrainerForAssign(null); setModalSearch(''); }} title={`Редактирование филиалов`}>
          {/* trainer brief */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold text-gray-900">{selectedTrainerForAssign.full_name}</div>
                <div className="text-sm text-gray-500">{selectedTrainerForAssign.email}</div>
                <div className="mt-1 text-xs text-gray-600">
                  {pluralizeTerritories(getTrainerTerrs(selectedTrainerForAssign.id).length)} назначено
                </div>
              </div>
            </div>
          </div>

          {/* current assignments */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">Текущие назначения</h4>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                {getTrainerTerrs(selectedTrainerForAssign.id).length}
              </span>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {getTrainerTerrs(selectedTrainerForAssign.id)
                .sort((a, b) => {
                  const aIsBase = selectedTrainerForAssign.territory_id === a.territory.id;
                  const bIsBase = selectedTrainerForAssign.territory_id === b.territory.id;
                  if (aIsBase && !bIsBase) return -1;
                  if (!aIsBase && bIsBase) return 1;
                  return 0;
                })
                .map((a) => {
                const isBase = selectedTrainerForAssign.territory_id === a.territory.id;
                return (
                  <div key={a.id} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${isBase ? 'border-blue-300 bg-blue-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className="flex items-center gap-3">
                      <MapPin className={`h-4 w-4 ${isBase ? 'text-blue-600' : 'text-emerald-600'}`} />
                      <div>
                        <div className={`text-sm font-medium ${isBase ? 'text-blue-900' : 'text-emerald-900'}`}>
                          {a.territory.name}
                          {isBase && <span className="ml-2 text-xs font-normal text-blue-600">(базирование)</span>}
                        </div>
                        {a.territory.region && <div className={`text-xs ${isBase ? 'text-blue-600' : 'text-emerald-600'}`}>{a.territory.region}</div>}
                      </div>
                    </div>
                    {!isBase && (
                      <button 
                        onClick={() => handleDelete(a.id)} 
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors" 
                        title="Удалить филиал"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
              {getTrainerTerrs(selectedTrainerForAssign.id).length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  <MapPin className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  Нет назначенных филиалов
                </div>
              )}
            </div>
          </div>

          {/* available territories with search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">Доступные филиалы</h4>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                {getFilteredAvailableTerritories().length}
              </span>
            </div>
            
            {/* search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Поиск по названию или региону..."
              />
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {getFilteredAvailableTerritories().map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{t.name}</div>
                    {t.region && <div className="text-xs text-gray-500">{t.region}</div>}
                  </div>
                  <button
                    onClick={async () => { await handleAssign(selectedTrainerForAssign.id, t.id); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-700 transition-colors"
                    title="Добавить филиал"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {getFilteredAvailableTerritories().length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  <Building2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  {modalSearch ? 'Филиалы не найдены' : 'Все филиалы уже назначены'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => { setSelectedTrainerForAssign(null); setModalSearch(''); }} 
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Готово
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/* ---------- UI helpers ---------- */

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">{icon}</div>
        <div>
          <p className="text-xs sm:text-sm text-gray-600">{label}</p>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex-1 space-y-3 sm:space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
            <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="h-11 sm:h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-2xl bg-gray-100" />
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{subtitle}</p>
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
      <div className="w-[min(96vw,720px)] rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">Закрыть</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** BottomSheet = тот же Modal, но удобный на телефонах (full-width, прижат к низу) */
function BottomSheet({ title, children, onClose }: React.PropsWithChildren<{ title: string; onClose: () => void }>) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full sm:w-[720px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xl">
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Закрыть</button>
        </div>
        {children}
      </div>
    </div>
  );
}
