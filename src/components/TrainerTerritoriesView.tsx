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
  Search,
  Edit3,
  X,
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

interface TerritoryLog {
  id: string;
  trainer_territory_id: string;
  trainer_id: string;
  territory_id: string;
  action: 'assigned' | 'unassigned' | 'activated' | 'deactivated' | 'deleted';
  performed_by: string;
  performed_at: string;
  metadata: any;
  trainer: {
    full_name: string;
  };
  territory: {
    name: string;
  };
  performer: {
    full_name: string;
  };
}

type Territory = {
  id: string;
  name: string;
  region?: string;
};

export function TrainerTerritoriesView() {
  const { userProfile } = useAuth();
  const { territories } = useAdmin(); // список филиалов

  const [trainerTerritories, setTrainerTerritories] = useState<TrainerTerritory[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [logs, setLogs] = useState<TerritoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedTrainerForAssign, setSelectedTrainerForAssign] = useState<any>(null);

  const [draggedTerritory, setDraggedTerritory] = useState<string | null>(null);
  const [dragOverTrainer, setDragOverTrainer] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  const isAdmin = userProfile?.role === 'administrator';

  // дебаунс для поиска
  const debounceRef = useRef<number | null>(null);
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // Загружаем назначения
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

      // Загружаем тренеров
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

      // Загружаем логи
      const { data: logsData, error: logsError } = await supabase
        .from('trainer_territories_log')
        .select(`
          id, trainer_territory_id, trainer_id, territory_id, action, performed_by, performed_at, metadata,
          trainer:users!trainer_territories_log_trainer_id_fkey(full_name),
          territory:territories!trainer_territories_log_territory_id_fkey(name),
          performer:users!trainer_territories_log_performed_by_fkey(full_name)
        `)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      // Форматируем данные
      const formattedAssignments: TrainerTerritory[] = (assignments || []).map((a: any) => {
        const trainer = Array.isArray(a.trainer) ? a.trainer[0] : a.trainer;
        const branch = Array.isArray(trainer?.branch) ? trainer.branch[0] : trainer?.branch;
        const territory = Array.isArray(a.territory) ? a.territory[0] : a.territory;
        return { ...a, trainer: { ...trainer, branch }, territory };
      });

      const formattedTrainers = (trainersData || []).map((t: any) => ({
        ...t,
        branch: Array.isArray(t.branch) ? t.branch[0] : t.branch,
      }));

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

  function getTrainerTerritories(trainerId: string) {
    return trainerTerritories.filter(tt => tt.trainer_id === trainerId);
  }

  function isTerritoryAssigned(trainerId: string, territoryId: string) {
    return trainerTerritories.some(tt => tt.trainer_id === trainerId && tt.territory_id === territoryId);
  }

  function getAvailableTerritories() {
    const assignedTerritoryIds = new Set(trainerTerritories.map(tt => tt.territory_id));
    return (territories as Territory[]).filter(t => !assignedTerritoryIds.has(t.id));
  }

  function getActionText(action: string) {
    const actions = {
      assigned: 'назначил',
      unassigned: 'отменил назначение',
      activated: 'активировал',
      deactivated: 'деактивировал',
      deleted: 'удалил'
    };
    return actions[action as keyof typeof actions] || action;
  }

  /* ---------- DnD ---------- */

  function handleDragStart(territoryId: string) {
    setDraggedTerritory(territoryId);
  }
  function handleDragEnd() {
    setDraggedTerritory(null);
    setDragOverTrainer(null);
  }
  function handleDragOverTrainerCard(e: React.DragEvent, trainerId: string) {
    e.preventDefault();
    setDragOverTrainer(trainerId);
  }
  async function handleDrop(trainerId: string) {
    if (draggedTerritory) {
      if (isTerritoryAssigned(trainerId, draggedTerritory)) {
        setDraggedTerritory(null);
        setDragOverTrainer(null);
        return;
      }
      await handleAssign(trainerId, draggedTerritory);
    }
    setDraggedTerritory(null);
    setDragOverTrainer(null);
  }

  /* ---------- CRUD ---------- */

  async function handleAssign(trainerId: string, territoryId: string) {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('trainer_territories')
        .insert({ trainer_id: trainerId, territory_id: territoryId, is_active: true });
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      console.error(e);
      setError('Ошибка назначения тренера.');
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

  /* ---------- фильтр по тренерам ---------- */
  const filteredTrainers = useMemo(() => {
    if (!debounced) return trainers;
    return trainers.filter((t: any) => {
      const f = (t.full_name || '').toLowerCase();
      const e = (t.email || '').toLowerCase();
      const b = (t.branch?.name || '').toLowerCase();
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
              <p className="text-sm text-gray-600">
                Базирование тренера и филиалы работы. Перетащи филиал на карточку тренера, чтобы назначить.
              </p>
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
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          icon={<Users className="h-6 w-6 text-emerald-600" />}
          label="Всего тренеров"
          value={trainers.length}
        />
        <KpiCard
          icon={<MapPin className="h-6 w-6 text-sky-600" />}
          label="Филиалов"
          value={(territories as Territory[]).length}
        />
        <KpiCard
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          label="Назначений"
          value={trainerTerritories.length}
        />
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 mb-4 rounded-2xl border border-gray-200 bg-white/70 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
             <div className="relative flex-1">
               <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
               <input
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500"
                 placeholder="Поиск по тренеру, email, базированию…"
               />
             </div>
          </div>

           <div className="flex items-center gap-2">
             <button
               onClick={() => setShowLogs(!showLogs)}
               className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
             >
               <AlertCircle className="h-4 w-4" />
               {showLogs ? 'Скрыть логи' : 'Показать логи'}
             </button>
             <button
               onClick={() => setSelectedTrainerForAssign({ bulk: true })}
               className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700"
             >
               <Plus className="h-4 w-4" />
               Массовое назначение
             </button>
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {loading ? (
          <SkeletonList />
        ) : (
          <>
            {/* Trainers list */}
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Тренеры и их филиалы</h3>

              {filteredTrainers.length === 0 && (
                <EmptyState
                  title="Тренеры не найдены"
                  subtitle="Измени запрос поиска, чтобы увидеть список"
                />
              )}

              {filteredTrainers.map((trainer: any) => {
                const assignedTerritories = getTrainerTerritories(trainer.id);
                const isDropTarget = dragOverTrainer === trainer.id;

                return (
                  <div
                    key={trainer.id}
                    onDrop={() => handleDrop(trainer.id)}
                    onDragOver={(e) => handleDragOverTrainerCard(e, trainer.id)}
                    onDragLeave={() => setDragOverTrainer(null)}
                    className={`rounded-2xl border bg-white p-4 transition-colors ${
                      isDropTarget ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-gray-200'
                    }`}
                  >
                     <div className="mb-3 flex items-center justify-between gap-3">
                       <div className="flex items-center gap-3">
                         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                           <Users className="h-4 w-4 text-emerald-600" />
                         </div>
                         <div className="min-w-0 flex-1">
                           <div className="truncate font-medium text-gray-900">{trainer.full_name}</div>
                           <div className="truncate text-sm text-gray-500">{trainer.email}</div>
                           {trainer.branch && (
                             <div className="mt-1">
                               <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                 <Building2 className="h-3 w-3" />
                                 {trainer.branch.name}
                               </span>
                             </div>
                           )}
                         </div>
                       </div>

                       <button
                         onClick={() => setSelectedTrainerForAssign(trainer)}
                         className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-600"
                         title="Редактировать филиалы"
                       >
                         <Edit3 className="h-4 w-4" />
                       </button>
                     </div>

                    {/* Assigned territories - Compact list */}
                    <div className="space-y-1">
                      {assignedTerritories.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-emerald-900">
                                {assignment.territory.name}
                              </div>
                              {assignment.territory.region && (
                                <div className="truncate text-xs text-emerald-600">
                                  {assignment.territory.region}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="rounded p-1 text-red-500 hover:bg-white hover:text-red-600"
                            title="Удалить филиал"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {assignedTerritories.length === 0 && (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-center text-sm text-gray-500">
                          Перетащи филиал сюда или нажми кнопку редактирования
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Territories sidebar */}
            <div className="w-full flex-shrink-0 lg:w-80">
              <div className="sticky top-4 rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Доступные филиалы</h3>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {getAvailableTerritories().map((territory) => (
                    <div
                      key={territory.id}
                      draggable
                      onDragStart={() => handleDragStart(territory.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-move rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 transition-all hover:border-emerald-400 hover:bg-emerald-50 ${
                        draggedTerritory === territory.id ? 'opacity-50' : ''
                      }`}
                      title="Перетащите на карточку тренера"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {territory.name}
                          </div>
                          {territory.region && (
                            <div className="truncate text-xs text-gray-500">{territory.region}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {getAvailableTerritories().length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                      Нет доступных филиалов
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  💡 Перетащи карточку филиала на тренера для назначения
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Logs section */}
      {showLogs && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">История изменений</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {log.performer?.full_name} {getActionText(log.action)} филиал "{log.territory?.name}" для {log.trainer?.full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.performed_at).toLocaleString('ru-RU')}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                  log.action === 'assigned' || log.action === 'activated' ? 'bg-green-100 text-green-700' :
                  log.action === 'unassigned' || log.action === 'deactivated' || log.action === 'deleted' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getActionText(log.action)}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                Нет записей в истории
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
            <button onClick={() => setError(null)} className="ml-2 rounded-md px-2 text-xs hover:bg-white/40">
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
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

       {/* Modal assign (improved design) */}
       {selectedTrainerForAssign && !selectedTrainerForAssign.bulk && (
         <Modal onClose={() => setSelectedTrainerForAssign(null)} title={`Редактировать филиалы для ${selectedTrainerForAssign.full_name}`}>
           <div className="space-y-6">
             {/* Trainer info */}
             <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
               <div className="flex items-center gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                   <Users className="h-5 w-5 text-emerald-600" />
                 </div>
                 <div>
                   <div className="font-medium text-gray-900">{selectedTrainerForAssign.full_name}</div>
                   <div className="text-sm text-gray-500">{selectedTrainerForAssign.email}</div>
                   {selectedTrainerForAssign.branch && (
                     <div className="mt-1">
                       <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                         <Building2 className="h-3 w-3" />
                         Базирование: {selectedTrainerForAssign.branch.name}
                       </span>
                     </div>
                   )}
                 </div>
               </div>
             </div>

             {/* Available territories */}
             <div className="space-y-3">
               <label className="text-sm font-medium text-gray-700">Доступные филиалы для назначения:</label>
               <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                 {getAvailableTerritories().map((territory) => (
                   <label
                     key={territory.id}
                     className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                   >
                     <input
                       type="checkbox"
                       checked={false}
                       onChange={async () => {
                         await handleAssign(selectedTrainerForAssign.id, territory.id);
                       }}
                       className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                     />
                     <div className="flex-1">
                       <div className="font-medium text-gray-900">{territory.name}</div>
                       {territory.region && (
                         <div className="text-sm text-gray-500">{territory.region}</div>
                       )}
                     </div>
                     <Plus className="h-4 w-4 text-gray-400" />
                   </label>
                 ))}
                 {getAvailableTerritories().length === 0 && (
                   <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                     Все филиалы уже назначены
                   </div>
                 )}
               </div>
             </div>

             {/* Current assignments */}
             <div className="space-y-3">
               <label className="text-sm font-medium text-gray-700">Текущие назначения:</label>
               <div className="space-y-1">
                 {getTrainerTerritories(selectedTrainerForAssign.id).map((assignment) => (
                   <div
                     key={assignment.id}
                     className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
                   >
                     <div className="flex items-center gap-2">
                       <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                       <div>
                         <div className="text-sm font-medium text-emerald-900">{assignment.territory.name}</div>
                         {assignment.territory.region && (
                           <div className="text-xs text-emerald-600">{assignment.territory.region}</div>
                         )}
                       </div>
                     </div>
                     <button
                       onClick={() => handleDelete(assignment.id)}
                       className="rounded p-1 text-red-500 hover:bg-white hover:text-red-600"
                       title="Удалить филиал"
                     >
                       <X className="h-3.5 w-3.5" />
                     </button>
                   </div>
                 ))}
                 {getTrainerTerritories(selectedTrainerForAssign.id).length === 0 && (
                   <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-center text-sm text-gray-500">
                     Нет назначенных филиалов
                   </div>
                 )}
               </div>
             </div>
           </div>

           <div className="mt-6 flex justify-end">
             <button
               onClick={() => setSelectedTrainerForAssign(null)}
               className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
             >
               Закрыть
             </button>
           </div>
         </Modal>
       )}

      {/* Modal bulk assign (info only) */}
      {selectedTrainerForAssign?.bulk && (
        <Modal onClose={() => setSelectedTrainerForAssign(null)} title="Массовое назначение">
          <p className="text-sm text-gray-600">
            Пока массовое назначение в этом интерфейсе не реализовано. Перетаскивайте филиалы на тренеров или назначайте через чекбоксы.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setSelectedTrainerForAssign(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Ок
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

function SkeletonList() {
  return (
    <div className="flex-1 space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
            <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="h-12 animate-pulse rounded-lg bg-gray-100" />
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
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

