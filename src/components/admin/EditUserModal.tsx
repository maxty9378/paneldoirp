import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building2, Shield, Check, AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { motion } from 'framer-motion';

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
    work_experience_days: 0,
    hire_date: '',
    is_leaving: false,
  });
  const [initialFormData, setInitialFormData] = useState(formData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [territorySearchTerm, setTerritorySearchTerm] = useState('');
  const [positionSearchTerm, setPositionSearchTerm] = useState('');
  const [showNoTerritoryResults, setShowNoTerritoryResults] = useState(false);
  const [showNoPositionResults, setShowNoPositionResults] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const experience_days = user.work_experience_days || 0;
      let hire_date_str = '';
      if (experience_days > 0) {
        const today = new Date();
        const hireDate = new Date(today.setDate(today.getDate() - experience_days));
        hire_date_str = hireDate.toISOString().split('T')[0];
      }

      const newFormData = {
        full_name: user.full_name || '',
        email: user.email || '',
        sap_number: user.sap_number || '',
        role: user.role || 'user',
        position_id: user.position_id || '',
        territory_id: user.territory_id || '',
        phone: user.phone || '',
        is_active: user.is_active !== false,
        department: user.department || 'management_company',
        work_experience_days: experience_days,
        hire_date: hire_date_str,
        is_leaving: user.is_leaving || false,
      };

      setFormData(newFormData);
      setInitialFormData(newFormData);
      
      // Reset search terms and errors
      setErrors({});
      setTerritorySearchTerm('');
      setPositionSearchTerm('');
    }
  }, [user]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

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

    if (!formData.full_name.trim()) newErrors.full_name = 'ФИО обязательно';
    if (!formData.email.trim()) newErrors.email = 'Email обязателен';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Некорректный email';
    if (!formData.sap_number || !formData.sap_number.trim()) newErrors.sap_number = 'SAP номер обязателен';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const isValid = Object.keys(errors).length === 0 && formData.full_name && formData.email && formData.sap_number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updateData = {
      full_name: formData.full_name,
      email: formData.email,
      sap_number: formData.sap_number,
      role: formData.role,
      position_id: formData.position_id === '' ? null : formData.position_id,
      territory_id: formData.territory_id === '' ? null : formData.territory_id,
      phone: formData.phone || null,
      is_active: formData.is_active,
      department: formData.department,
      work_experience_days: Number(formData.work_experience_days) || 0,
      is_leaving: formData.is_leaving,
    };
    
    try {
      await updateUser(user.id, updateData as any);
      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Ошибка обновления пользователя' });
    }
  };

  const handleHireDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hireDateStr = e.target.value;

    if (!hireDateStr) {
      setFormData({ ...formData, hire_date: '', work_experience_days: 0 });
      return;
    }

    const hireDate = new Date(hireDateStr);
    const today = new Date();
    
    // Reset time to compare dates only
    hireDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (hireDate > today) {
      setFormData({ ...formData, hire_date: hireDateStr, work_experience_days: 0 });
      return;
    }
    
    const diffTime = today.getTime() - hireDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setFormData({
      ...formData,
      hire_date: hireDateStr,
      work_experience_days: diffDays
    });
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return;
    
    const hireDateStr = format(date, 'yyyy-MM-dd');
    const today = new Date();
    
    date.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setFormData({
      ...formData,
      hire_date: hireDateStr,
      work_experience_days: diffDays < 0 ? 0 : diffDays,
    });
    setIsCalendarOpen(false);
  }

  function CustomDayjsCalendar({ selectedDate, onDateSelect }: { selectedDate: string, onDateSelect: (date: string) => void }) {
    dayjs.locale('ru');
    const [currentDate, setCurrentDate] = useState(dayjs(selectedDate || new Date()));

    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const years = Array.from({ length: 101 }, (_, i) => dayjs().year() - 50 + i);
    const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM'));

    const generateCalendar = () => {
        const days = [];
        let date = startDate;
        while (date.isBefore(endDate) || date.isSame(endDate, 'day')) {
            days.push(date);
            date = date.add(1, 'day');
        }
        return days;
    };

    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    
    return (
        <div className="w-[320px] bg-gray-50/80 backdrop-blur-md rounded-2xl shadow-lg p-4 font-sans text-sm border border-white/20">
            <div className="flex justify-between items-center mb-4">
                <button 
                  type="button" 
                  onClick={handlePrevMonth} 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                    <select
                        value={currentDate.format('MMMM')}
                        onChange={(e) => setCurrentDate(currentDate.month(months.indexOf(e.target.value)))}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold bg-white shadow-sm appearance-none text-center"
                    >
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                        value={currentDate.year()}
                        onChange={(e) => setCurrentDate(currentDate.year(Number(e.target.value)))}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold bg-white shadow-sm appearance-none"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <button 
                  type="button" 
                  onClick={handleNextMonth} 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
            </div>

            <div className="grid grid-cols-7 text-gray-500 text-center mb-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {generateCalendar().map((date, i) => {
                    const isThisMonth = date.month() === currentDate.month();
                    const isSelected = dayjs(selectedDate).isSame(date, 'day');
                    const isToday = dayjs().isSame(date, 'day');
                    
                    return (
                        <div
                            key={i}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-colors 
                                ${!isThisMonth ? 'text-gray-300' : ''} 
                                ${isSelected ? 'bg-sns-green text-white font-bold' : ''} 
                                ${!isSelected && isToday ? 'border-2 border-sns-green' : ''}
                                ${!isSelected ? 'hover:bg-sns-green-light' : ''}
                            `}
                            onClick={() => onDateSelect(date.format('YYYY-MM-DD'))}
                        >
                            {date.date()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return '...';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in-up">
        <div className="bg-gray-50 rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-sns-green flex items-center justify-center text-white font-bold text-2xl">
                    {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" /> : getInitials(user.full_name)}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {formData.full_name || 'Редактирование'}
                    </h2>
                    <p className="text-base text-gray-500">{formData.email}</p>
                </div>
            </div>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200"
            >
                <X size={24} />
            </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-8">
          {/* --- Основная информация --- */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="mr-3 h-6 w-6 text-sns-green" />
              Основная информация
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 border-l-2 border-sns-green-light pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent transition-colors duration-200 ${errors.full_name ? 'border-red-300' : 'border-gray-300'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  placeholder="example@sns.ru"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent transition-colors duration-200 ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SAP номер <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="12345678"
                  value={formData.sap_number}
                  onChange={(e) => setFormData({ ...formData, sap_number: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent transition-colors duration-200 ${errors.sap_number ? 'border-red-300' : 'border-gray-300'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+7 (999) 999-99-99"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent transition-colors duration-200"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* --- Организация --- */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Building2 className="mr-3 h-6 w-6 text-sns-green" />
              Организация
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 border-l-2 border-sns-green-light pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль в системе</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                >
                  {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
                <select
                  value={formData.position_id || ''}
                  onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                >
                  <option value="">Выберите должность</option>
                  {filteredPositions.map((position) => (
                    <option key={position.id} value={position.id}>{position.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Филиал</label>
                <select
                  value={formData.territory_id || ''}
                  onChange={(e) => setFormData({ ...formData, territory_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
                >
                  <option value="">Выберите филиал</option>
                  {filteredTerritories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name} {territory.region ? `(${territory.region})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата приема</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="w-full flex justify-between items-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent text-left transition-colors duration-200"
                  >
                    <span>{formData.hire_date ? format(new Date(formData.hire_date), 'dd MMMM yyyy', { locale: ru }) : 'Выберите дату'}</span>
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  {isCalendarOpen && (
                    <div className="absolute z-20 mt-2 shadow-xl rounded-2xl border border-gray-200 animate-fade-in">
                      <CustomDayjsCalendar 
                        selectedDate={formData.hire_date}
                        onDateSelect={(date) => {
                          handleDaySelect(new Date(date));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Стаж (в днях)</label>
                <input
                  type="number"
                  readOnly
                  value={formData.work_experience_days}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* --- Статус --- */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Shield className="mr-3 h-6 w-6 text-sns-green" />
              Статус учетной записи
            </h3>
            <div className="space-y-4 border-l-2 border-sns-green-light pl-6">
                <label className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 cursor-pointer">
                    <span className="flex-grow">
                        <span className="text-sm font-medium text-gray-800">Активный пользователь</span>
                        <p className="text-xs text-gray-500 mt-1">Неактивные пользователи не могут входить в систему.</p>
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-sns-green transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-full transition-transform"></div>
                    </div>
                </label>
                <label className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 cursor-pointer">
                     <span className="flex-grow">
                        <span className="text-sm font-medium text-gray-800">Пользователь увольняется</span>
                        <p className="text-xs text-gray-500 mt-1">Отметьте, если пользователь в процессе увольнения.</p>
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.is_leaving || false} onChange={(e) => setFormData({ ...formData, is_leaving: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-yellow-400 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-full transition-transform"></div>
                    </div>
                </label>
            </div>
          </div>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-600 flex-1">{errors.submit}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white/50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500 space-y-1">
                <p><strong>ID:</strong> {user?.id}</p>
                <p><strong>Создан:</strong> {user?.created_at ? new Date(user.created_at).toLocaleString('ru') : 'Неизвестно'}</p>
                <p><strong>Последний вход:</strong> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ru') : 'Никогда'}</p>
            </div>
            <div className="flex space-x-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  Отмена
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  onClick={handleSubmit}
                  disabled={!isValid || !isDirty}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-sns-green rounded-lg hover:bg-sns-green-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Сохранить
                    </>
                  )}
                </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}