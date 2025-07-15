import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, XCircle, Search, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TerritoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  territories: any[];
  onUpdate: () => void;
}

export function TerritoriesModal({ isOpen, onClose, territories, onUpdate }: TerritoriesModalProps) {
  const [newTerritory, setNewTerritory] = useState({ name: '', region: '' });
  const [editingTerritory, setEditingTerritory] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset the form when the modal is closed
      setNewTerritory({ name: '', region: '' });
      setEditingTerritory(null);
      setError(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTerritories = territories.filter(territory => 
    territory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (territory.region && territory.region.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddTerritory = async () => {
    if (!newTerritory.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('territories')
        .insert({
          name: newTerritory.name.trim(),
          region: newTerritory.region.trim() || null
        })
        .select();

      if (error) throw error;

      setNewTerritory({ name: '', region: '' });
      onUpdate();
    } catch (error) {
      console.error('Error adding branch:', error);
      setError(error.message || 'Ошибка при добавлении филиала');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditing = (territory) => {
    setEditingTerritory({
      id: territory.id,
      name: territory.name,
      region: territory.region || ''
    });
  };

  const handleCancelEditing = () => {
    setEditingTerritory(null);
  };

  const handleUpdateTerritory = async () => {
    if (!editingTerritory || !editingTerritory.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('territories')
        .update({
          name: editingTerritory.name.trim(),
          region: editingTerritory.region.trim() || null
        })
        .eq('id', editingTerritory.id);

      if (error) throw error;

      setEditingTerritory(null);
      onUpdate();
    } catch (error) {
      console.error('Error updating branch:', error);
      setError(error.message || 'Ошибка при обновлении филиала');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerritory = async (territoryId) => {
    if (!confirm('Вы уверены, что хотите удалить этот филиал?')) return;

    setSaving(true);
    setError(null);
    try {
      // First check if there are any users associated with this territory
      const { data: usersWithTerritory, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('territory_id', territoryId);
      
      if (checkError) throw checkError;
      
      if (usersWithTerritory && usersWithTerritory.length > 0) {
        throw new Error(`Невозможно удалить филиал, связанный с ${usersWithTerritory.length} пользователями. Сначала переместите пользователей в другой филиал.`);
      }

      const { error } = await supabase
        .from('territories')
        .delete()
        .eq('id', territoryId);

      if (error) throw error;
      
      onUpdate();
    } catch (error) {
      console.error('Error deleting branch:', error);
      setError(error.message || 'Ошибка при удалении филиала');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Управление филиалами
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Добавление нового филиала */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="flex items-center text-lg font-medium text-gray-900 mb-4">
              <MapPin className="mr-2 text-sns-green" size={18} />
              Добавить филиал
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Название филиала"
                value={newTerritory.name}
                onChange={(e) => setNewTerritory({ ...newTerritory, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Регион"
                value={newTerritory.region}
                onChange={(e) => setNewTerritory({ ...newTerritory, region: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
              <button
                onClick={handleAddTerritory}
                disabled={saving || !newTerritory.name.trim()}
                className="bg-sns-green text-white px-4 py-2 rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Добавление...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Добавить</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Поиск филиалов */}
          {territories.length > 5 && (
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск филиалов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
            </div>
          )}

          {/* Список филиалов */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Существующие филиалы 
              <span className="ml-2 text-sm text-gray-500">
                {filteredTerritories.length} из {territories.length}
              </span>
            </h3>
            <div className="space-y-2">
              {filteredTerritories.map((territory) => (
                <div key={territory.id} className="border border-gray-200 rounded-lg hover:border-sns-green hover:bg-gray-50">
                  {editingTerritory && editingTerritory.id === territory.id ? (
                    <div className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="Название филиала"
                          value={editingTerritory.name}
                          onChange={(e) => setEditingTerritory({ ...editingTerritory, name: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Регион"
                          value={editingTerritory.region}
                          onChange={(e) => setEditingTerritory({ ...editingTerritory, region: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelEditing}
                          className="px-3 py-1 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-1"
                        >
                          <XCircle size={14} />
                          <span>Отмена</span>
                        </button>
                        <button
                          onClick={handleUpdateTerritory}
                          disabled={saving || !editingTerritory.name.trim()}
                          className="px-3 py-1 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          {saving ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                              <span>Сохранение...</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Сохранить</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-sns-green flex-shrink-0" />
                          <p className="font-medium text-gray-900">{territory.name}</p>
                        </div>
                        {territory.region && (
                          <p className="text-sm text-gray-500 mt-1 ml-6">{territory.region}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEditing(territory)}
                          className="text-gray-400 hover:text-sns-green transition-colors p-1 rounded hover:bg-gray-100"
                          title="Редактировать"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTerritory(territory.id)}
                          disabled={saving}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-gray-100"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredTerritories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'Филиалы по запросу не найдены' : 'Филиалы не найдены'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose} 
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <X size={16} className="mr-2" />
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}