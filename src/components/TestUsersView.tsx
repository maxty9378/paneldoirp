import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Users, Mail, Phone, Briefcase, Building, MapPin, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  sap_number: string;
  phone: string;
  role: string;
  subdivision: string;
  branch_subrole?: string;
  position: string;
  department: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function TestUsersView() {
  const { user: currentUser, userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Текущий пользователь:', currentUser);
      console.log('🔍 Роль пользователя:', userProfile?.role);
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })
        .limit(50); // Ограничиваем 50 пользователями для теста
      
      if (fetchError) {
        console.error('❌ Ошибка загрузки пользователей:', fetchError);
        setError(`Ошибка загрузки: ${fetchError.message}`);
        setUsers([]);
        return;
      }
      
      console.log('✅ Загружено пользователей:', data?.length || 0);
      console.log('📊 Данные пользователей:', data);
      
      setUsers(data || []);
      setLastFetch(new Date());
    } catch (err) {
      console.error('❌ Неожиданная ошибка:', err);
      setError(`Неожиданная ошибка: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      administrator: 'bg-purple-100 text-purple-800',
      moderator: 'bg-blue-100 text-blue-800',
      expert: 'bg-indigo-100 text-indigo-800',
      trainer: 'bg-green-100 text-green-800',
      supervisor: 'bg-yellow-100 text-yellow-800',
      employee: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getSubdivisionBadgeColor = (subdivision: string) => {
    if (subdivision === 'management_company') {
      return 'bg-emerald-100 text-emerald-800';
    }
    return 'bg-orange-100 text-orange-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#06A478] to-[#4ade80] rounded-xl flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Тестовая страница пользователей</h1>
              <p className="text-sm text-gray-600">Проверка видимости данных МТС в Supabase</p>
            </div>
          </div>
          
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Обновить</span>
          </button>
        </div>

        {/* Информация о текущем пользователе */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Текущий пользователь</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <div><strong>Имя:</strong> {currentUser?.full_name || 'Не указано'}</div>
                <div><strong>Email:</strong> {currentUser?.email || 'Не указано'}</div>
                <div><strong>Роль:</strong> <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-200 text-blue-900">{userProfile?.role || 'Не указано'}</span></div>
                <div><strong>Подразделение:</strong> <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-200 text-blue-900">{userProfile?.subdivision || 'Не указано'}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            <div className="text-sm text-gray-600">Всего пользователей</div>
          </div>
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Активных</div>
          </div>
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.subdivision === 'management_company').length}
            </div>
            <div className="text-sm text-gray-600">Управляющая компания</div>
          </div>
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">
              {users.filter(u => u.subdivision === 'branches').length}
            </div>
            <div className="text-sm text-gray-600">Филиалы</div>
          </div>
        </div>

        {/* Время последнего обновления */}
        {lastFetch && (
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            Последнее обновление: {lastFetch.toLocaleString('ru-RU')}
          </div>
        )}
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Ошибка загрузки данных</h3>
              <p className="text-sm text-red-800">{error}</p>
              <p className="text-xs text-red-700 mt-2">
                Это может означать, что у вашей роли нет доступа к данным пользователей или есть проблемы с RLS политиками.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Загрузка */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#06A478] border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Загрузка пользователей...</p>
        </div>
      )}

      {/* Список пользователей */}
      {!loading && !error && users.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ФИО
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SAP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Телефон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Подразделение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Должность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-[#06A478] to-[#4ade80] flex items-center justify-center text-white font-semibold">
                          {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.sap_number || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {user.phone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSubdivisionBadgeColor(user.subdivision)}`}>
                          {user.subdivision === 'management_company' ? 'УК' : 'Филиалы'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                        {user.position || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Пустое состояние */}
      {!loading && !error && users.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Пользователи не найдены</h3>
          <p className="text-gray-600">
            Не удалось загрузить пользователей. Возможно, у вашей роли нет доступа к данным.
          </p>
        </div>
      )}

      {/* Инструкции */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">📋 Инструкции по тестированию</h3>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>Эта страница показывает пользователей из таблицы <code className="bg-yellow-100 px-1 rounded">users</code> в Supabase</li>
          <li>Если вы видите список пользователей — значит RLS политики работают корректно для вашей роли</li>
          <li>Если вы видите ошибку или пустой список — значит у вашей роли нет доступа к данным</li>
          <li>Попробуйте войти под разными ролями (администратор, тренер, эксперт и т.д.) и проверьте, какие данные видны</li>
          <li>Все данные логируются в консоль браузера (F12) для отладки</li>
        </ul>
      </div>
    </div>
  );
}
