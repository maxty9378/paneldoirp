import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Download, 
  Upload, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Award, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  GraduationCap,
  Send,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  sap_number?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  department: 'managing_company' | 'branches';
  role: string;
  sub_role?: string;
  position?: {
    id: string;
    name: string;
  };
  territory?: {
    id: string;
    name: string;
    region?: string;
  };
  experience?: number;
  is_leaving?: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  stats?: {
    total_events: number;
    completed_events: number;
    attendance_rate: number;
    average_test_score: number;
    pending_tests: number;
    pending_annual_tests: number;
  };
}

// Вспомогательная функция для форматирования стажа
const formatExperienceDays = (days: number | undefined | null): string => {
  if (!days || days === 0) return 'Новичок';
  
  if (days < 30) return `${days} дн.`;
  
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months} мес.`;
    return `${months} мес. ${remainingDays} дн.`;
  }
  
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  const finalDays = remainingDays % 30;
  
  let result = `${years} г.`;
  if (months > 0) result += ` ${months} мес.`;
  if (finalDays > 0) result += ` ${finalDays} дн.`;
  
  return result;
};

export function EmployeesView() {
  const { user, userProfile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive' | 'leaving'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'position' | 'territory' | 'experience'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Определяем права пользователя
  const isManager = userProfile?.role === 'manager';
  const isTrainer = userProfile?.role === 'trainer';
  const isAdmin = userProfile?.role === 'administrator' || userProfile?.role === 'moderator';
  const canManageEmployees = isManager || isTrainer || isAdmin;

  useEffect(() => {
    if (user && userProfile) {
      fetchEmployees();
    }
  }, [user, userProfile]);

  useEffect(() => {
    filterAndSortEmployees();
  }, [employees, searchTerm, selectedRole, selectedStatus, sortBy, sortOrder]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          sap_number,
          phone,
          avatar_url,
          is_active,
          department,
          role,
          work_experience_days,
          is_leaving,
          created_at,
          updated_at,
          last_sign_in_at,
          position:position_id(
            id, 
            name
          ),
          territory:territories!users_territory_id_fkey(
            id, 
            name
          )
        `);
      
      // Фильтрация по территории для руководителей и тренеров
      if (isManager && userProfile?.territory_id) {
        query = query.eq('territory_id', userProfile.territory_id);
      } else if (isTrainer && userProfile?.territory_id) {
        query = query.eq('territory_id', userProfile.territory_id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
      
      // Преобразуем данные в нужный формат
      const employeesWithStats = (data || []).map((employee) => ({
        ...employee,
        experience: employee.work_experience_days,
        last_login_at: employee.last_sign_in_at,
        stats: {
          total_events: 0,
          completed_events: 0,
          attendance_rate: 0,
          average_test_score: 0,
          pending_tests: 0,
          pending_annual_tests: 0
        }
      }));
      
      setEmployees(employeesWithStats);
      setFilteredEmployees(employeesWithStats);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortEmployees = () => {
    let filtered = [...employees];

    // Поиск
    if (searchTerm) {
      filtered = filtered.filter(employee =>
        employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.sap_number && employee.sap_number.includes(searchTerm)) ||
        (employee.position?.name && employee.position.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (employee.territory?.name && employee.territory.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Фильтр по роли
    if (selectedRole !== 'all') {
      filtered = filtered.filter(employee => employee.role === selectedRole);
    }

    // Фильтр по статусу
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(employee => employee.is_active && !employee.is_leaving);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter(employee => !employee.is_active);
      } else if (selectedStatus === 'leaving') {
        filtered = filtered.filter(employee => employee.is_leaving);
      }
    }

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case 'position':
          aValue = a.position?.name?.toLowerCase() || '';
          bValue = b.position?.name?.toLowerCase() || '';
          break;
        case 'territory':
          aValue = a.territory?.name?.toLowerCase() || '';
          bValue = b.territory?.name?.toLowerCase() || '';
          break;
        case 'experience':
          aValue = a.experience || 0;
          bValue = b.experience || 0;
          break;
        default:
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEmployees(filtered);
  };

  const toggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    setActionLoading(employeeId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', employeeId);
      
      if (error) throw error;
      
      // Обновляем локальное состояние
      setEmployees(prev => 
        prev.map(emp => emp.id === employeeId ? { ...emp, is_active: !currentStatus } : emp)
      );
    } catch (error) {
      console.error('Error updating employee status:', error);
      alert('Ошибка при изменении статуса сотрудника');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleLeavingStatus = async (employeeId: string, currentStatus: boolean) => {
    setActionLoading(employeeId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_leaving: !currentStatus })
        .eq('id', employeeId);
      
      if (error) throw error;
      
      // Обновляем локальное состояние
      setEmployees(prev => 
        prev.map(emp => emp.id === employeeId ? { ...emp, is_leaving: !currentStatus } : emp)
      );
    } catch (error) {
      console.error('Error updating leaving status:', error);
      alert('Ошибка при изменении статуса увольнения');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpandEmployee = (employeeId: string) => {
    if (expandedEmployeeId === employeeId) {
      setExpandedEmployeeId(null);
    } else {
      setExpandedEmployeeId(employeeId);
    }
  };

  const exportEmployees = () => {
    // Создаем CSV строку
    const headers = ['ФИО', 'Email', 'SAP номер', 'Телефон', 'Должность', 'Территория', 'Стаж', 'Статус'];
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        emp.full_name,
        emp.email || '',
        emp.sap_number || '',
        emp.phone || '',
        emp.position?.name || '',
        emp.territory?.name || '',
        formatExperienceDays(emp.experience),
        emp.is_active ? (emp.is_leaving ? 'Увольняется' : 'Активен') : 'Неактивен'
      ].join(','))
    ].join('\n');

    // Создаем и скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'employees.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Статистика по сотрудникам
  const employeeStats = {
    total: employees.length,
    active: employees.filter(e => e.is_active && !e.is_leaving).length,
    inactive: employees.filter(e => !e.is_active).length,
    leaving: employees.filter(e => e.is_leaving).length,
    pendingTests: employees.reduce((sum, emp) => sum + (emp.stats?.pending_tests || 0), 0),
    pendingAnnualTests: employees.reduce((sum, emp) => sum + (emp.stats?.pending_annual_tests || 0), 0)
  };

  if (!canManageEmployees) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Доступ запрещен</h2>
        <p className="text-gray-600">У вас нет прав для просмотра этого раздела.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-safe-bottom">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои сотрудники</h1>
          <p className="text-gray-600 mt-1">
            {isManager 
              ? 'Управление сотрудниками вашей территории' 
              : isTrainer 
              ? 'Управление обучением сотрудников вашей территории'
              : 'Управление всеми сотрудниками'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={exportEmployees}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={20} />
            <span>Экспорт</span>
          </button>
          
          {isAdmin && (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <UserPlus size={20} />
              <span>Добавить сотрудника</span>
            </button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Всего</p>
              <p className="text-2xl font-bold text-gray-900">{employeeStats.total}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Активные</p>
              <p className="text-2xl font-bold text-green-600">{employeeStats.active}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Неактивные</p>
              <p className="text-2xl font-bold text-red-600">{employeeStats.inactive}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Увольняются</p>
              <p className="text-2xl font-bold text-yellow-600">{employeeStats.leaving}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ждут тестов</p>
              <p className="text-2xl font-bold text-blue-600">{employeeStats.pendingTests}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Годовые тесты</p>
              <p className="text-2xl font-bold text-purple-600">{employeeStats.pendingAnnualTests}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Панель управления */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени, email, SAP номеру, должности или территории..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Фильтры */}
          <div className="flex items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[160px]"
            >
              <option value="all">Все роли</option>
              <option value="employee">Сотрудники</option>
              <option value="manager">Руководители</option>
              <option value="expert">Эксперты</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive' | 'leaving')}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
              <option value="leaving">Увольняются</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter size={20} />
              <span>Фильтры</span>
            </button>
          </div>
        </div>

        {/* Расширенные фильтры */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'position' | 'territory' | 'experience')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="name">По имени</option>
                  <option value="position">По должности</option>
                  <option value="territory">По территории</option>
                  <option value="experience">По стажу</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Порядок
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="asc">По возрастанию</option>
                  <option value="desc">По убыванию</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedRole('all');
                    setSelectedStatus('all');
                    setSortBy('name');
                    setSortOrder('asc');
                  }}
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Список сотрудников */}
      <div className="bg-white rounded-xl shadow-soft border border-gray-100">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Сотрудники ({filteredEmployees.length})
            </h2>
          </div>
        </div>
        
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Сотрудники не найдены
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedRole !== 'all' || selectedStatus !== 'all'
                ? 'Попробуйте изменить параметры поиска или фильтры'
                : 'В вашей территории пока нет сотрудников'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Заголовок таблицы */}
            <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Сотрудник</div>
              <div>Должность</div>
              <div>Территория</div>
              <div className="text-center">Статус</div>
              <div className="text-center">Действия</div>
            </div>
            
            {/* Список сотрудников */}
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="hover:bg-gray-50">
                {/* Основная строка сотрудника */}
                <div 
                  className="grid grid-cols-6 gap-4 px-6 py-4 cursor-pointer"
                  onClick={() => toggleExpandEmployee(employee.id)}
                >
                  <div className="col-span-2 flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3 text-blue-600 font-medium">
                      {employee.avatar_url ? (
                        <img 
                          src={employee.avatar_url} 
                          alt={employee.full_name} 
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {employee.full_name}
                        {employee.is_leaving && (
                          <span className="ml-2 text-yellow-600 text-xs px-1.5 py-0.5 bg-yellow-100 rounded-full">
                            Увольняется
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.email}
                        {employee.sap_number && ` • SAP: ${employee.sap_number}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    {employee.position?.name || '-'}
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    {employee.territory?.name || '-'}
                  </div>
                  <div className="flex items-center justify-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // handleViewEmployee(employee);
                      }}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Просмотр профиля"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // handleViewStats(employee);
                      }}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Статистика"
                    >
                      <BarChart3 size={16} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEmployeeStatus(employee.id, employee.is_active);
                        }}
                        disabled={!!actionLoading}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title={employee.is_active ? "Деактивировать" : "Активировать"}
                      >
                        {actionLoading === employee.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          employee.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Развернутая информация о сотруднике */}
                {expandedEmployeeId === employee.id && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Основная информация */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Контактная информация</h4>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Mail size={14} className="text-gray-400 mr-2" />
                          <a href={`mailto:${employee.email}`} className="text-blue-600 hover:underline">
                            {employee.email}
                          </a>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center text-sm">
                            <Phone size={14} className="text-gray-400 mr-2" />
                            <a href={`tel:${employee.phone}`} className="text-blue-600 hover:underline">
                              {employee.phone}
                            </a>
                          </div>
                        )}
                        {employee.sap_number && (
                          <div className="flex items-center text-sm">
                            <User size={14} className="text-gray-400 mr-2" />
                            <span className="text-gray-700">SAP: {employee.sap_number}</span>
                          </div>
                        )}
                        {employee.experience !== undefined && (
                          <div className="flex items-center text-sm">
                            <Clock size={14} className="text-gray-400 mr-2" />
                            <span className="text-gray-700">Стаж: {formatExperienceDays(employee.experience)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Информация о должности */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Должность и территория</h4>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Building2 size={14} className="text-gray-400 mr-2" />
                          <span className="text-gray-700">{employee.position?.name || 'Должность не указана'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MapPin size={14} className="text-gray-400 mr-2" />
                          <span className="text-gray-700">{employee.territory?.name || 'Территория не указана'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar size={14} className="text-gray-400 mr-2" />
                          <span className="text-gray-700">
                            Создан: {new Date(employee.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        {employee.last_login_at && (
                          <div className="flex items-center text-sm">
                            <Clock size={14} className="text-gray-400 mr-2" />
                            <span className="text-gray-700">
                              Последний вход: {new Date(employee.last_login_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Действия */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Действия</h4>
                      <div className="space-y-2">
                        {isAdmin && (
                          <button
                            onClick={() => toggleLeavingStatus(employee.id, !!employee.is_leaving)}
                            disabled={!!actionLoading}
                            className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                              employee.is_leaving 
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            }`}
                          >
                            {actionLoading === employee.id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
                            ) : (
                              employee.is_leaving ? 'Отменить увольнение' : 'Отметить увольнение'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeesView;