import React, { useState } from 'react';
import { X, User, Mail, Phone, Building, MapPin, Users, Briefcase } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (userData: any) => Promise<any>;
  onSuccess: (result: any) => void;
  branches: any[];
  positions: any[];
  territories: any[];
}

export default function CreateUserModal({ 
  isOpen, 
  onClose, 
  onCreateUser,
  onSuccess,
  branches,
  positions,
  territories
}: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    sap_number: '',
    full_name: '',
    position: '',
    phone: '',
    role: 'employee' as const,
    subdivision: 'management_company' as const,
    branch_subrole: null as string | null,
    branch_id: null as string | null,
    position_id: null as string | null,
    territory_id: null as string | null,
    department: 'management_company'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.full_name) {
        throw new Error('Полное имя обязательно для заполнения');
      }

      if (!formData.email && !formData.sap_number) {
        throw new Error('Необходимо указать email или SAP номер');
      }

      // Prepare user data for database
      const userData = {
        email: formData.email.trim() || null,
        sap_number: formData.sap_number.trim() || null,
        full_name: formData.full_name.trim(),
        position: formData.position || null,
        phone: formData.phone || null,
        role: formData.role,
        subdivision: formData.subdivision,
        branch_subrole: formData.subdivision === 'branches' ? formData.branch_subrole : null,
        branch_id: formData.subdivision === 'branches' ? formData.branch_id : null,
        position_id: formData.position_id || null,
        territory_id: formData.territory_id || null,
        department: formData.department,
      };

      // Call the create user function passed from parent
      try {
        const result = await onCreateUser(userData);
        
        // Проверяем результат создания
        if (result && result.user) {
          onSuccess(result);
          
          // Если использовался fallback метод
          if (result.fallback_used) {
            console.log('Использовался резервный метод создания пользователя:', result);
          }
          
          // Если auth запись не создана, показываем предупреждение
          if (!result.auth_created && userData.email) {
            alert('Пользователь создан, но запись в системе авторизации не создана. Вход в систему будет невозможен.');
          }
          
          // Если был создан временный пароль, показываем его
          if (result.tempPassword) {
            alert(`Пользователь успешно создан!\n\nEmail: ${userData.email}\nВременный пароль: ${result.tempPassword}`);
          }
          
          onClose();
          
          // Reset form
          setFormData({
            email: '',
            sap_number: '',
            full_name: '',
            position: '',
            phone: '',
            role: 'employee',
            subdivision: 'management_company',
            branch_subrole: null,
            branch_id: null,
            position_id: null,
            territory_id: null,
            department: 'management_company'
          });
        } else {
          // Handle case where result doesn't have user but doesn't throw error
          throw new Error(result.message || 'Неизвестная ошибка при создании пользователя');
        }
      } catch (err) {
        console.error('Error in user creation:', err);
        setError(err.message || 'Произошла ошибка при создании пользователя');
      }
      
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Произошла ошибка при создании пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Создать пользователя</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Полное имя *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SAP номер
              </label>
              <input
                type="text"
                name="sap_number"
                value={formData.sap_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Телефон
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="w-4 h-4 inline mr-1" />
                Должность
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="w-4 h-4 inline mr-1" />
                Роль
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="employee">Сотрудник</option>
                <option value="supervisor">Супервайзер</option>
                <option value="trainer">Тренер</option>
                <option value="expert">Эксперт</option>
                <option value="moderator">Модератор</option>
                <option value="administrator">Администратор</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4 inline mr-1" />
                Подразделение
              </label>
              <select
                name="subdivision"
                value={formData.subdivision}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="management_company">Управляющая компания</option>
                <option value="branches">Филиалы</option>
              </select>
            </div>

            {formData.subdivision === 'branches' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Роль в филиале
                  </label>
                  <select
                    name="branch_subrole"
                    value={formData.branch_subrole || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Выберите роль</option>
                    <option value="sales_representative">Торговый представитель</option>
                    <option value="supervisor">Супервайзер</option>
                    <option value="branch_director">Директор филиала</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Филиал
                  </label>
                  <select
                    name="branch_id"
                    value={formData.branch_id || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Выберите филиал</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {positions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Позиция
                </label>
                <select
                  name="position_id"
                  value={formData.position_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Выберите позицию</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {territories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Территория
                </label>
                <select
                  name="territory_id"
                  value={formData.territory_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Выберите территорию</option>
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p><strong>Примечание:</strong> Пользователю будет установлен пароль по умолчанию: <code>123456</code></p>
            <p className="text-sm text-blue-600">
              Необходимо указать либо email, либо SAP номер (или оба).
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Важно:</strong> Пользователи с email смогут входить в систему. Пользователи только с SAP номером не смогут авторизоваться.
            </p>
          </div>

          <div className="text-sm text-blue-600 mt-4 bg-blue-50 p-3 rounded-md">
            <p className="font-medium">Обратите внимание:</p>
            <p>Система создаст запись пользователя в базе данных, а также учетную запись для авторизации, если указан email.</p>
            <p className="mt-1">Если у вас возникают проблемы с созданием пользователя, обратитесь к администратору системы.</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {loading ? 'Создание...' : 'Создать пользователя'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}