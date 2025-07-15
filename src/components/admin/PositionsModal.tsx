import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PositionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: any[];
  onUpdate: () => void;
}

export function PositionsModal({ isOpen, onClose, positions, onUpdate }: PositionsModalProps) {
  const [newPosition, setNewPosition] = useState({ name: '', description: '' });
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset the form when the modal is closed
      setNewPosition({ name: '', description: '' });
      setEditingPosition(null);
      setError(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPositions = positions.filter(position => 
    position.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (position.description && position.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddPosition = async () => {
    if (!newPosition.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('positions')
        .insert({
          name: newPosition.name.trim(),
          description: newPosition.description.trim() || null
        })
        .select();

      if (error) throw error;

      setNewPosition({ name: '', description: '' });
      onUpdate();
    } catch (error) {
      console.error('Error adding position:', error);
      setError(error.message || 'Ошибка при добавлении должности');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditing = (position) => {
    setEditingPosition({
      id: position.id,
      name: position.name,
      description: position.description || ''
    });
  };

  const handleCancelEditing = () => {
    setEditingPosition(null);
  };

  const handleUpdatePosition = async () => {
    if (!editingPosition || !editingPosition.name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('positions')
        .update({
          name: editingPosition.name.trim(),
          description: editingPosition.description.trim() || null
        })
        .eq('id', editingPosition.id);

      if (error) throw error;

      setEditingPosition(null);
      onUpdate();
    } catch (error) {
      console.error('Error updating position:', error);
      setError(error.message || 'Ошибка при обновлении должности');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async (positionId) => {
    if (!confirm('Вы уверены, что хотите удалить эту должность?')) return;

    setSaving(true);
    setError(null);
    try {
      // First check if there are any users associated with this position
      const { data: usersWithPosition, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('position_id', positionId);
      
      if (checkError) throw checkError;
      
      if (usersWithPosition && usersWithPosition.length > 0) {
        throw new Error(`Невозможно удалить должность, связанную с ${usersWithPosition.length} пользователями. Сначала измените должность у пользователей.`);
      }

      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', positionId);

      if (error) throw error;
      
      onUpdate();
    } catch (error) {
      console.error('Error deleting position:', error);
      setError(error.message || 'Ошибка при удалении должности');
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
              Управление должностями
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
          {/* Добавление новой должности */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Добавить должность</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Название должности"
                value={newPosition.name}
                onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Описание (необязательно)"
                value={newPosition.description}
                onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
              <button
                onClick={handleAddPosition}
                disabled={saving || !newPosition.name.trim()}
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

          {/* Поиск должностей */}
          {positions.length > 5 && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск должностей..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
            </div>
          )}

          {/* Список должностей */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Существующие должности ({filteredPositions.length})
            </h3>
            <div className="space-y-2">
              {filteredPositions.map((position) => (
                <div key={position.id} className="border border-gray-200 rounded-lg hover:border-sns-green hover:bg-gray-50">
                  {editingPosition && editingPosition.id === position.id ? (
                    <div className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="Название должности"
                          value={editingPosition.name}
                          onChange={(e) => setEditingPosition({ ...editingPosition, name: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Описание (необязательно)"
                          value={editingPosition.description}
                          onChange={(e) => setEditingPosition({ ...editingPosition, description: e.target.value })}
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
                          onClick={handleUpdatePosition}
                          disabled={saving || !editingPosition.name.trim()}
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
                        <p className="font-medium text-gray-900">{position.name}</p>
                        {position.description && (
                          <p className="text-sm text-gray-600">{position.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEditing(position)}
                          className="text-gray-400 hover:text-sns-green transition-colors p-1 rounded hover:bg-gray-100"
                          title="Редактировать"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePosition(position.id)}
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
              
              {filteredPositions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'Должности по запросу не найдены' : 'Должности не найдены'}
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