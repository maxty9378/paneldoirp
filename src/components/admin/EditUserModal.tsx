import React, { useState, useEffect } from 'react';
import { X, Search, User, Mail, Phone, Building2, MapPin, Shield, Check, AlertTriangle, Filter } from 'lucide-react';
import { USER_ROLE_LABELS } from '../../types';
import { useAdminActions } from '../../hooks/useAdminActions';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  territories: any[];
  positions: any[];
  onSuccess: () => void;
}

export function EditUserModal({ isOpen, onClose, user, positions, territories, onSuccess }: EditUserModalProps) {
  const { updateUser, loading } = useAdminActions();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    sap_number: '',
    role: 'user',
    position_id: '',
    territory_id: '',
    phone: '',
    is_active: true,
    department: 'management_company',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [territorySearchTerm, setTerritorySearchTerm] = useState('');
  const [positionSearchTerm, setPositionSearchTerm] = useState('');
  const [showNoTerritoryResults, setShowNoTerritoryResults] = useState(false);
  const [showNoPositionResults, setShowNoPositionResults] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        sap_number: user.sap_number || '',
        role: user.role || 'user',
        position_id: user.position_id || '',
        territory_id: user.territory_id || '',
        phone: user.phone || '',
        is_active: user.is_active !== false,
        department: user.department || 'management_company',
      });
      
      // Reset search terms and errors
      setErrors({});
      setTerritorySearchTerm('');
      setPositionSearchTerm('');
    }
  }, [user]);

  // Filter territories based on search term
  const filteredTerritories = territories.filter(territory =>
    territory.name.toLowerCase().includes(territorySearchTerm.toLowerCase()) ||
    (territory.region && territory.region.toLowerCase().includes(territorySearchTerm.toLowerCase()))
  );
  
  // Filter positions based on search term
  const filteredPositions = positions.filter(position =>
    position.name.toLowerCase().includes(positionSearchTerm.toLowerCase()) ||
    (position.description && position.description.toLowerCase().includes(positionSearchTerm.toLowerCase()))
  );

  // Update the no results state whenever search terms change
  useEffect(() => {
    setShowNoTerritoryResults(territorySearchTerm.length > 0 && filteredTerritories.length === 0);
    setShowNoPositionResults(positionSearchTerm.length > 0 && filteredPositions.length === 0);
  }, [territorySearchTerm, positionSearchTerm, filteredTerritories.length, filteredPositions.length]);

  if (!isOpen || !user) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'ФИО обязательно для заполнения';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен для заполнения';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный формат email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData = {
        position_id: formData.position_id === '' ? null : formData.position_id,
        territory_id: formData.territory_id === '' ? null : formData.territory_id,
        phone: formData.phone || null,
    };
    
    try {
      if (validateForm()) {
        await updateUser(user.id, updateData);
        onSuccess();
        onClose();
      }
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Ошибка обновления пользователя' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Редактировать пользователя
              </h2>
              <p className="text-sm text-gray-500 mt-1">{user.full_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information Section */}
            <div className="md:col-span-2 mb-2">
              <h3 className="text-lg font-medium text-gray-700 mb-2 flex items-center">
                <User className="mr-2 h-5 w-5 text-gray-500" />
                Основная информация
              </h3>
              <div className="border-b border-gray-200 w-full mb-4"></div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ФИО
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent ${
                  errors.full_name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SAP номер
              </label>
              <input
                type="text"
                value={formData.sap_number}
                onChange={(e) => setFormData({ ...formData, sap_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Роль
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              >
                {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Position and Territory Section */}
            <div className="md:col-span-2 mt-4 mb-2">
              <h3 className="text-lg font-medium text-gray-700 mb-2 flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-gray-500" />
                Должность и территория
              </h3>
              <div className="border-b border-gray-200 w-full mb-4"></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Должность
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск должности..."
                    value={positionSearchTerm}
                    onChange={(e) => setPositionSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent ${
                      showNoPositionResults ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                    }`}
                  />
                  {positionSearchTerm && (
                    <button 
                      type="button"
                      onClick={() => setPositionSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {showNoPositionResults && (
                  <p className="text-sm text-yellow-600 flex items-center">
                    <Filter className="h-4 w-4 mr-1" />
                    Не найдено результатов для "{positionSearchTerm}"
                  </p>
                )}
                
                {positionSearchTerm && filteredPositions.length > 0 && (
                  <p className="text-sm text-green-600">
                    Найдено: {filteredPositions.length} должностей
                  </p>
                )}
                
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={formData.position_id || ''}
                    onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                  >
                    <option value="">Выберите должность</option>
                    {filteredPositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Территория
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск территории..."
                    value={territorySearchTerm}
                    onChange={(e) => setTerritorySearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent ${
                      showNoTerritoryResults ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                    }`}
                  />
                  {territorySearchTerm && (
                    <button 
                      type="button"
                      onClick={() => setTerritorySearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {showNoTerritoryResults && (
                  <p className="text-sm text-yellow-600 flex items-center">
                    <Filter className="h-4 w-4 mr-1" />
                    Не найдено результатов для "{territorySearchTerm}"
                  </p>
                )}
                
                {territorySearchTerm && filteredTerritories.length > 0 && (
                  <p className="text-sm text-green-600">
                    Найдено: {filteredTerritories.length} территорий
                  </p>
                )}
                
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={formData.territory_id || ''}
                    onChange={(e) => setFormData({ ...formData, territory_id: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                  >
                    <option value="">Выберите территорию</option>
                    {filteredTerritories.map((territory) => (
                      <option key={territory.id} value={territory.id}>
                        {territory.name} {territory.region ? `(${territory.region})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="md:col-span-2 mt-4 mb-2">
              <h3 className="text-lg font-medium text-gray-700 mb-2 flex items-center">
                <Shield className="mr-2 h-5 w-5 text-gray-500" />
                Статус учетной записи
              </h3>
              <div className="border-b border-gray-200 w-full mb-4"></div>
            </div>

            <div className="md:col-span-2 flex items-center bg-gray-50 p-4 rounded-lg">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-5 w-5 text-sns-green focus:ring-sns-green border-gray-300 rounded"
                />
                <span className="ml-3">
                  <span className="text-sm font-medium text-gray-700">Активный пользователь</span>
                  <p className="text-xs text-gray-500 mt-1">Неактивные пользователи не могут входить в систему и не отображаются в большинстве списков</p>
                  {!formData.is_active && (
                    <p className="text-xs text-red-500 mt-1 font-medium">Внимание! Неактивные пользователи не могут авторизоваться в системе.</p>
                  )}
                </span>
              </label>
            </div>

            <div className="md:col-span-2 flex items-start">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_leaving || false}
                  onChange={(e) => setFormData({ ...formData, is_leaving: e.target.checked })}
                  className="h-5 w-5 text-yellow-500 focus:ring-yellow-500 border-gray-300 rounded mt-0.5"
                />
                <span className="ml-3">
                  <span className="text-sm font-medium text-gray-700">Пользователь увольняется</span>
                  <p className="text-xs text-gray-500 mt-1">Отметьте этот флаг, если пользователь находится в процессе увольнения</p>
                  {formData.is_leaving && (
                    <p className="text-xs text-yellow-500 mt-1">Для уволенных пользователей рекомендуется также отключать активность учетной записи</p>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Ошибка обновления */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-600 flex-1">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-between space-x-3 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              ID: {user?.id}<br/>
              Последнее обновление: {user?.updated_at ? new Date(user.updated_at).toLocaleString('ru') : 'Неизвестно'}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-sns-green text-white rounded-lg hover:bg-sns-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Сохранение</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}