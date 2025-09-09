import React, { useEffect, useState } from 'react';
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


export function TrainerTerritoriesView() {
  const { userProfile } = useAuth();
  const { territories } = useAdmin();

  const [trainerTerritories, setTrainerTerritories] = useState<TrainerTerritory[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedTrainerForAssign, setSelectedTrainerForAssign] = useState<any>(null);
  const [draggedTerritory, setDraggedTerritory] = useState<string | null>(null);

  const isAdmin = userProfile?.role === 'administrator';


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


  async function handleDragAssign(trainerId: string, territoryId: string) {
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

  function handleDragStart(territoryId: string) {
    setDraggedTerritory(territoryId);
  }

  function handleDragEnd() {
    setDraggedTerritory(null);
  }

  function handleDrop(trainerId: string) {
    if (draggedTerritory) {
      handleDragAssign(trainerId, draggedTerritory);
    }
    setDraggedTerritory(null);
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


  function getTrainerTerritories(trainerId: string) {
    return trainerTerritories.filter(tt => tt.trainer_id === trainerId);
  }

  function isTerritoryAssigned(trainerId: string, territoryId: string) {
    return trainerTerritories.some(tt => tt.trainer_id === trainerId && tt.territory_id === territoryId);
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


      {/* Drag & Drop Interface */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {loading ? (
          <SkeletonTable />
        ) : (
          <>
            {/* Trainers with their assigned territories - Main content */}
            <div className="flex-1 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Тренеры и их филиалы</h3>
              {trainers.map((trainer) => {
                const assignedTerritories = getTrainerTerritories(trainer.id);
                return (
                  <div
                    key={trainer.id}
                    onDrop={() => handleDrop(trainer.id)}
                    onDragOver={(e) => e.preventDefault()}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                          <Users className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{trainer.full_name}</div>
                          <div className="text-sm text-gray-500">{trainer.email}</div>
                          {trainer.branch && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                                <Building2 className="h-3 w-3" />
                                Базирование: {trainer.branch.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTrainerForAssign(trainer)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Назначить филиалы
                      </button>
                    </div>

                    {/* Assigned territories */}
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {assignedTerritories.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                            <div>
                              <div className="font-medium text-emerald-900">
                                {assignment.territory.name}
                              </div>
                              {assignment.territory.region && (
                                <div className="text-xs text-emerald-600">
                                  {assignment.territory.region}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                assignment.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                assignment.is_active ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              {assignment.is_active ? 'Активно' : 'Неактивно'}
                            </span>
                            <button
                              onClick={() => handleToggleActive(assignment)}
                              disabled={saving}
                              className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {assignedTerritories.length === 0 && (
                        <div className="col-span-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-gray-500">
                          Перетащите филиалы сюда
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Available Territories - Compact sidebar */}
            <div className="w-full flex-shrink-0 lg:w-80">
              <div className="sticky top-4 rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Доступные филиалы</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {territories.map((territory) => (
                    <div
                      key={territory.id}
                      draggable
                      onDragStart={() => handleDragStart(territory.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-move rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 transition-all hover:border-emerald-400 hover:bg-emerald-50 ${
                        draggedTerritory === territory.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-gray-900 text-sm">
                            {territory.name}
                          </div>
                          {territory.region && (
                            <div className="truncate text-xs text-gray-500">
                              {territory.region}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {territories.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-gray-500 text-sm">
                      Нет доступных филиалов
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  💡 Перетащите филиал к тренеру для назначения
                </div>
              </div>
            </div>
          </>
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
      {selectedTrainerForAssign && (
        <Modal onClose={() => setSelectedTrainerForAssign(null)} title={`Назначить филиалы для ${selectedTrainerForAssign.full_name}`}>
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Филиал базирования: {selectedTrainerForAssign.branch?.name || 'Не указан'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Выберите филиалы работы:</label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {territories.map((territory) => {
                  const isAssigned = isTerritoryAssigned(selectedTrainerForAssign.id, territory.id);
                  return (
                    <label
                      key={territory.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        isAssigned
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={async (e) => {
                          if (e.target.checked) {
                            await handleDragAssign(selectedTrainerForAssign.id, territory.id);
                          } else {
                            const assignment = trainerTerritories.find(
                              tt => tt.trainer_id === selectedTrainerForAssign.id && tt.territory_id === territory.id
                            );
                            if (assignment) {
                              await handleDelete(assignment.id);
                            }
                          }
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{territory.name}</div>
                        {territory.region && (
                          <div className="text-sm text-gray-500">{territory.region}</div>
                        )}
                      </div>
                      {isAssigned && (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setSelectedTrainerForAssign(null)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Закрыть
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
