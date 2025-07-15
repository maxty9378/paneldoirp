import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building2, MapPin, Users, Briefcase, Calendar, Hash } from 'lucide-react';
import { createRegularUser } from '../../lib/userManagement';
import { supabase } from '../../lib/supabase';

interface CreateUserNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateUserNewModal({ 
  isOpen, 
  onClose, 
  onSuccess
}: CreateUserNewModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    sap_number: '',
    fullName: '',
    role: 'employee' as const,
    position_id: '',
    phone: '',
    territory_id: '',
    work_experience_days: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'warning'; text: string} | null>(null);
  const [territories, setTerritories] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  // Load territories and positions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTerritories();
      fetchPositions();
      
      // Reset form data
      setFormData({
        email: '',
        sap_number: '',
        fullName: '',
        role: 'employee',
        position_id: '',
        phone: '',
        territory_id: '',
        work_experience_days: 0
      });
      setError('');
      setMessage(null);
    }
  }, [isOpen]);

  const fetchTerritories = async () => {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTerritories(data || []);
    } catch (error) {
      console.error('Ошибка загрузки филиалов:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Ошибка загрузки должностей:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage(null);

    try {
      // Validate required fields
      if (!formData.fullName.trim()) {
        throw new Error('Полное имя обязательно для заполнения');
      }

      // Check that either email or SAP number is provided
      if (!formData.email.trim() && !formData.sap_number.trim()) {
        throw new Error('Необходимо указать Email или SAP номер');
      }
      
      // If email is not provided but SAP number is, generate email
      let userEmail = formData.email.trim();
      if (!userEmail && formData.sap_number.trim()) {
        userEmail = `${formData.sap_number.trim()}@sns.ru`;
      }

      // Convert empty SAP string to null to avoid unique constraint issues
      const sapNumber = formData.sap_number.trim() || null;

      const result = await createRegularUser(
        userEmail,
        formData.fullName,
        formData.role,
        '123456',
        {
          sap_number: sapNumber,
          phone: formData.phone.trim(),
          territory_id: formData.territory_id || null,
          position_id: formData.position_id || null,
          work_experience_days: Number(formData.work_experience_days) || 0
        }
      );

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `${result.message}\n\nEmail: ${result.email}\nПароль: ${result.password}` 
        });
        
        // Reset form
        setFormData({
          email: '',
          sap_number: '',
          fullName: '',
          role: 'employee',
          position_id: '',
          phone: '',
          territory_id: '',
          work_experience_days: 0
        });
        
        // Notify parent component
        onSuccess();
        
        // Close modal after a delay
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setMessage({ 
          type: result.configurationRequired ? 'warning' : 'error', 
          text: result.message 
        });
      }
    } catch (error: any) {
      console.error('Ошибка создания пользователя:', error);
      setError(error.message || 'Произошла ошибка при создании пользователя');
      setMessage({
        type: 'error',
        text: error.message || 'Произошла ошибка при создании пользователя'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            message.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
            'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-sm whitespace-pre-line">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основная информация */}
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Основная информация</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Полное имя *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
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
                  <Hash className="w-4 h-4 inline mr-1" />
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
            </div>
          </div>
          
          {/* Роль и должность */}
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-3 border-b pb-2">Роль и должность</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Должность
                </label>
                <select
                  name="position_id"
                  value={formData.position_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Выберите должность</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Филиал
                </label>
                <select
                  name="territory_id"
                  value={formData.territory_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Выберите филиал</option>
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name} {territory.region ? `(${territory.region})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Стаж работы (в днях)
                </label>
                <input
                  type="number"
                  name="work_experience_days"
                  value={formData.work_experience_days}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md mt-6 mb-4">
            <h4 className="font-medium text-blue-700 text-sm mb-2">Важная информация</h4>
            <ul className="list-disc pl-5 text-sm text-blue-700">
              <li>Необходимо указать либо Email, либо SAP номер</li>
              <li>Если указан только SAP номер, email будет автоматически сформирован как sapnumber@sns.ru</li>
              <li>Пользователю будет установлен стандартный пароль: <strong>123456</strong></li>
              <li>Стаж работы указывается в днях (30 дней = 1 месяц, 365 дней = 1 год)</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Создание...</span>
                </div>
              ) : (
                'Создать пользователя'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}