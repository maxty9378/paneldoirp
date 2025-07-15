import React, { useState } from 'react';
import { X, Plus, Edit, Trash2 } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleAddTerritory = async () => {
    if (!newTerritory.name.trim()) return;

    setSaving(true);
    try {
      // Здесь будет логика добавления филиала
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNewTerritory({ name: '', region: '' });
      onUpdate();
    } catch (error) {
      console.error('Error adding territory:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerritory = async (territoryId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот филиал?')) return;

    setSaving(true);
    try {
      // Здесь будет логика удаления филиала
      await new Promise(resolve => setTimeout(resolve, 1000));
      onUpdate();
    } catch (error) {
      console.error('Error deleting territory:', error);
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

        <div className="p-6 space-y-6">
          {/* Добавление нового филиала */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Добавить филиал</h3>
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
                <Plus size={16} />
                <span>Добавить</span>
              </button>
            </div>
          </div>

          {/* Список филиалов */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Существующие филиалы</h3>
            <div className="space-y-2">
              {territories.map((territory) => (
                <div key={territory.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-sns-green hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{territory.name}</p>
                    {territory.region && (
                      <p className="text-sm text-gray-600">{territory.region}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingTerritory(territory)}
                      className="text-gray-400 hover:text-sns-green transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTerritory(territory.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {territories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Филиалы не найдены
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}