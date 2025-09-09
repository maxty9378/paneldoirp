import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';
import { 
  Building2, 
  Users, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle
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
  const { user, userProfile } = useAuth();
  const { territories, branches, loadData } = useAdmin();
  
  const [trainerTerritories, setTrainerTerritories] = useState<TrainerTerritory[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TrainerTerritory | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверяем права администратора
  const isAdmin = userProfile?.role === 'administrator';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Загружаем назначения тренеров к территориям
      const { data: assignments, error: assignmentsError } = await supabase
        .from('trainer_territories')
        .select(`
          id,
          trainer_id,
          territory_id,
          assigned_at,
          is_active,
          trainer:users!trainer_territories_trainer_id_fkey(
            id,
            full_name,
            email,
            phone
          ),
          territory:territories!trainer_territories_territory_id_fkey(
            id,
            name,
            region
          )
        `)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Загружаем всех тренеров
      const { data: trainersData, error: trainersError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, territory_id')
        .eq('role', 'trainer')
        .eq('is_active', true)
        .order('full_name');

      if (trainersError) throw trainersError;

      setTrainerTerritories(assignments || []);
      setTrainers(trainersData || []);
    } catch (error) {
      console.error('Error fetching trainer territories:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTrainer = async () => {
    if (!selectedTrainer || !selectedTerritory) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('trainer_territories')
        .insert({
          trainer_id: selectedTrainer,
          territory_id: selectedTerritory,
          is_active: true
        });

      if (error) throw error;

      setSelectedTrainer('');
      setSelectedTerritory('');
      setShowAssignModal(false);
      await fetchData();
    } catch (error) {
      console.error('Error assigning trainer:', error);
      setError('Ошибка назначения тренера');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAssignment = async (assignment: TrainerTerritory) => {
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('trainer_territories')
        .update({ is_active: !assignment.is_active })
        .eq('id', assignment.id);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error('Error updating assignment:', error);
      setError('Ошибка обновления назначения');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это назначение?')) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('trainer_territories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setError('Ошибка удаления назначения');
    } finally {
      setSaving(false);
    }
  };

  const filteredAssignments = trainerTerritories.filter(assignment => {
    const matchesSearch = 
      assignment.trainer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.territory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.territory.region && assignment.territory.region.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">У вас нет прав для доступа к этому разделу</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Загрузка данных...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              Филиалы тренеров
            </h1>
            <p className="text-gray-600 mt-1">Управление территориальными назначениями тренеров</p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Назначить тренера
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Всего тренеров</p>
              <p className="text-2xl font-bold text-gray-900">{trainers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Территорий</p>
              <p className="text-2xl font-bold text-gray-900">{territories.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Активных назначений</p>
              <p className="text-2xl font-bold text-gray-900">
                {trainerTerritories.filter(a => a.is_active).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Неактивных</p>
              <p className="text-2xl font-bold text-gray-900">
                {trainerTerritories.filter(a => !a.is_active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Поиск по тренеру или территории..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </button>
        </div>
      </div>

      {/* Таблица назначений */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тренер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Территория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата назначения
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.trainer.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.trainer.email}
                      </div>
                      {assignment.trainer.phone && (
                        <div className="text-sm text-gray-500">
                          {assignment.trainer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.territory.name}
                      </div>
                      {assignment.territory.region && (
                        <div className="text-sm text-gray-500">
                          {assignment.territory.region}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(assignment.assigned_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {assignment.is_active ? 'Активно' : 'Неактивно'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateAssignment(assignment)}
                        className={`px-3 py-1 rounded text-xs ${
                          assignment.is_active
                            ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                        disabled={saving}
                      >
                        {assignment.is_active ? 'Деактивировать' : 'Активировать'}
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                        disabled={saving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAssignments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Назначения не найдены' : 'Назначения тренеров отсутствуют'}
          </div>
        )}
      </div>

      {/* Модальное окно назначения */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Назначить тренера к территории</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тренер
                </label>
                <select
                  value={selectedTrainer}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Выберите тренера</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.full_name} ({trainer.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Территория
                </label>
                <select
                  value={selectedTerritory}
                  onChange={(e) => setSelectedTerritory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Выберите территорию</option>
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name} {territory.region && `(${territory.region})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Отмена
              </button>
              <button
                onClick={handleAssignTrainer}
                disabled={!selectedTrainer || !selectedTerritory || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Сохранение...' : 'Назначить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
