  import React, { useState, useEffect } from 'react';
  import { 
    Users, 
    Settings, 
    Upload, 
    Download, 
    Plus, 
    Edit, 
    Trash2, 
    Search, 
    Filter,
    Building2,
    MapPin,
    Shield,
    Eye,
    EyeOff,
    Save,
    X,
    Check,
    AlertTriangle,
    UserPlus,
    FileText,
    Send,
    CalendarClock,
    MessageSquare,
    Clipboard
  } from 'lucide-react';
  import { useAuth } from '../hooks/useAuth';
  import { User, UserRole, USER_ROLE_LABELS } from '../types';
  import { useAdmin } from '../hooks/useAdmin';
  import { useAdminActions } from '../hooks/useAdminActions';
  import CreateUserModal from './admin/CreateUserModal';
  import CreateUserNewModal from './admin/CreateUserNewModal';
  import { EditUserModal } from './admin/EditUserModal';
  import { TerritoriesModal } from './admin/TerritoriesModal';
  import { PositionsModal } from './admin/PositionsModal';
  import { SystemSettingsModal } from './admin/SystemSettingsModal';
  import ImportUsersModal from './admin/ImportUsersModal';
  import { ExportDataModal } from './admin/ExportDataModal';
  import { SendCredentialsModal } from './admin/SendCredentialsModal';
  import { FeedbackManagement } from './admin/FeedbackManagement';

  // Компонент для SAP с иконкой копирования

  function SapWithCopy({ sap }: { sap: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(sap);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {}
    };
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>SAP: {sap}</span>
        <div className="relative">
          <button
            type="button"
            className="text-gray-400 hover:text-sns-green transition-colors"
            title="Скопировать SAP"
            onClick={handleCopy}
          >
            <Clipboard size={14} />
          </button>
          <span 
            className={`
              absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap 
              rounded-md bg-gray-800/90 px-2 py-1 text-xs font-semibold text-white shadow-lg 
              transition-all duration-300 ease-in-out
              ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
            `}
          >
            Скопировано!
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800/90"></div>
          </span>
        </div>
      </span>
    );
  }

  export function AdminView() {
    const { user } = useAuth();
    const {
      users,
      branches,
      territories,
      positions,
      statistics,
      loading,
      error,
      loadData
    } = useAdmin();
    
    const {
      createUser,
      updateUser,
      deleteUser,
      bulkUpdateUsers,
      importUsers,
      resetUserPassword,
      toggleUserStatus,
      loading: actionLoading,
      error: actionError
    } = useAdminActions();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateUserNew, setShowCreateUserNew] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [showTerritories, setShowTerritories] = useState(false);
    const [showPositions, setShowPositions] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showFeedbackManagement, setShowFeedbackManagement] = useState(false);
    const [showSendCredentials, setShowSendCredentials] = useState(false);
    const [selectedUserForCredentials, setSelectedUserForCredentials] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);

    useEffect(() => {
      loadData();
    }, []);

    const filteredUsers = users.filter(user => {
      const matchesSearch = 
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.sap_number && user.sap_number.includes(searchQuery));

      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' && user.is_active) ||
        (selectedStatus === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
      setProcessingUserId(userId);
      try {
        await toggleUserStatus(userId, currentStatus);
        await loadData(); // Перезагружаем данные
      } catch (error) {
        console.error('Error updating user status:', error);
        alert('Ошибка при изменении статуса пользователя');
      } finally {
        setProcessingUserId(null);
      }
    };

    const handleDeleteUser = async (userId: string) => {
      if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        setProcessingUserId(userId);
        try {
          await deleteUser(userId);
          await loadData(); // Перезагружаем данные
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Ошибка при удалении пользователя');
        } finally {
          setProcessingUserId(null);
        }
      }
    };

    const handleEditUser = (user: User) => {
      setEditingUser(user);
      setShowEditUser(true);
    };

    const handleCreateSuccess = async (result: any) => {
      setShowCreateUserNew(false);
      await loadData();
      
      // Если был создан пользователь с временным паролем, показываем его
      if (result.tempPassword) {
        alert(`Пользователь создан! Временный пароль: ${result.tempPassword}`);
      }
    };

    const handleEditSuccess = async () => {
      setShowEditUser(false);
      setEditingUser(null);
      await loadData();
    };

    const handleSendCredentials = (user: User) => {
      setSelectedUserForCredentials(user);
      setShowSendCredentials(true);
    };

    const handleImportUsers = async (file: File) => {
      try {
        const result = await importUsers(file);
        await loadData();
        return result;
      } catch (error) {
        console.error('Error importing users:', error);
        return {
          success: 0,
          errors: [error instanceof Error ? error.message : 'Ошибка при импорте пользователей'],
          warnings: []
        };
      }
    };

    const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
      if (selectedUsers.length === 0) return;

      const confirmMessage = 
        action === 'delete' 
          ? `Вы уверены, что хотите удалить ${selectedUsers.length} пользователей?`
          : `Вы уверены, что хотите ${action === 'activate' ? 'активировать' : 'деактивировать'} ${selectedUsers.length} пользователей?`;

      if (confirm(confirmMessage)) {
        try {
          if (action === 'delete') {
            // Массовое удаление - удаляем по одному
            for (const userId of selectedUsers) {
              await deleteUser(userId);
            }
          } else {
            await bulkUpdateUsers(selectedUsers, { is_active: action === 'activate' });
          }
          await loadData();
          setSelectedUsers([]);
        } catch (error) {
          console.error('Error in bulk action:', error);
          alert('Ошибка при выполнении массового действия');
        }
      }
    };

    const toggleSelectUser = (userId: string) => {
      setSelectedUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    };

    const toggleSelectAll = () => {
      if (selectedUsers.length === filteredUsers.length) {
        setSelectedUsers([]);
      } else {
        setSelectedUsers(filteredUsers.map(user => user.id));
      }
    };

    const getPositionName = (positionId?: string) => {
      const position = positions.find(p => p.id === positionId);
      return position?.name || 'Не указана';
    };

    const getTerritoryName = (territoryId?: string) => {
      const territory = territories.find(t => t.id === territoryId);
      return territory?.name || 'Не указана';
    };

    if (!user) {
      return (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Shield size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Доступ запрещен</h2>
          <p className="text-gray-600">Необходима авторизация для доступа к этому разделу.</p>
        </div>
      );
    }

    // Показываем ошибку, если есть
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки данных</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-sns-green text-white px-4 py-2 rounded-lg hover:bg-sns-green-dark transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8 pb-safe-bottom">
        {/* Заголовок */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Администрирование</h1>
            <p className="text-gray-600 mt-1">
              Управление пользователями, ролями и системными настройками
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateUserNew(true)}
              className="bg-sns-green text-white px-4 py-2 rounded-lg hover:bg-sns-green-dark transition-colors flex items-center space-x-2"
            >
              <UserPlus size={20} />
              <span>Создать пользователя</span>
            </button>
          </div>
        </div>

        {/* Основные карточки */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Управление пользователями */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Управление пользователями</h2>
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setShowCreateUserNew(true)}
                className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors mb-2"
              >
                <span className="font-medium">Создать пользователя</span>
                <UserPlus className="h-5 w-5" />
              </button>

              <button
                onClick={loadData}
                className="w-full flex items-center justify-between p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors mb-2"
              >
                <span className="font-medium">Обновить ФИО пользователей</span>
                <Download className="h-5 w-5" />
              </button>

              <button
                onClick={() => setShowImport(true)}
                className="w-full flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="font-medium">Импорт пользователей</span>
                <Upload className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowExport(true)}
                className="w-full flex items-center justify-between p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <span className="font-medium">Экспорт данных</span>
                <Download className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Всего пользователей: <span className="font-medium text-blue-600">{users.length}</span>
            </div>
          </div>
          
          {/* Управление филиалами и должностями */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Справочники</h2>
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setShowTerritories(true)}
                className="w-full flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="font-medium">Филиалы</span>
                <Building2 className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowPositions(true)}
                className="w-full flex items-center justify-between p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <span className="font-medium">Должности</span>
                <Shield className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowFeedbackManagement(true)}
                className="w-full flex items-center justify-between p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <span className="font-medium">Управление обратной связью</span>
                <MessageSquare className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center justify-between p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="font-medium">Настройки системы</span>
                <Settings className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Филиалов: <span className="font-medium text-green-600">{territories.length}</span> • 
              Должностей: <span className="font-medium text-purple-600">{positions.length}</span>
            </div>
          </div>
          
          {/* Статистика */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Статистика системы</h2>
              <CalendarClock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Активных пользователей</span>
                <span className="text-lg font-semibold text-green-600">
                  {users.filter(u => u.is_active).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Неактивных пользователей</span>
                <span className="text-lg font-semibold text-red-600">
                  {users.filter(u => !u.is_active).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Администраторов</span>
                <span className="text-lg font-semibold text-blue-600">
                  {users.filter(u => u.role === 'administrator').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Увольняющиеся</span>
                <span className="text-lg font-semibold text-orange-600">
                  {users.filter(u => u.is_leaving).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Поиск и фильтры */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск пользователей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              >
                <option value="all">Все роли</option>
                {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>
          </div>
        </div>

        {/* Массовые действия */}
        {selectedUsers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  Выбрано пользователей: {selectedUsers.length}
                </span>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Отменить выбор
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Активировать
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={actionLoading}
                  className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                >
                  Деактивировать
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={actionLoading}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  {actionLoading ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Удаление...</span>
                    </div>
                  ) : (
                    'Удалить'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблица пользователей */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Пользователи ({filteredUsers.length})
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-sns-green hover:text-sns-green-dark"
                >
                  {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? 'Снять выбор' : 'Выбрать все'}
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-sns-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-sns-green focus:ring-sns-green border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Должность
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Филиал
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="h-4 w-4 text-sns-green focus:ring-sns-green border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            {getPositionName(user.position_id) === 'Торговый представитель' && user.sap_number
                              ? <SapWithCopy sap={user.sap_number} />
                              : (user.email || (user.sap_number ? `SAP: ${user.sap_number}` : ''))}
                            {user.is_leaving && (
                              <span className="ml-2 text-yellow-600 font-medium">
                                • Увольняется
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getPositionName(user.position_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getTerritoryName(user.territory_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                          disabled={processingUserId === user.id}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            user.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } ${processingUserId === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {processingUserId === user.id ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1"></div>
                          ) : null}
                          {user.is_active ? 'Активен' : 'Неактивен'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            disabled={processingUserId === user.id}
                            className="text-gray-400 hover:text-sns-green transition-colors"
                            title="Редактировать"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleSendCredentials(user)}
                            disabled={processingUserId === user.id}
                            className="text-gray-400 hover:text-purple-600 transition-colors"
                            title="Сбросить пароль"
                          >
                            <Send size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={processingUserId === user.id}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Удалить"
                          >
                            {processingUserId === user.id ? (
                              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Пользователи не найдены</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Модальные окна */}
        <CreateUserModal
          isOpen={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          onCreateUser={createUser}
          onSuccess={handleCreateSuccess}
          branches={branches}
          territories={territories}
          positions={positions}
        />

        <CreateUserNewModal
          isOpen={showCreateUserNew}
          onClose={() => setShowCreateUserNew(false)}
          onSuccess={() => {
            loadData();
            setShowCreateUserNew(false);
          }}
        />

        <EditUserModal
          isOpen={showEditUser}
          onClose={() => {
            setShowEditUser(false);
            setEditingUser(null);
          }}
          onSuccess={handleEditSuccess}
          user={editingUser}
          territories={territories}
          positions={positions}
        />

        {/* Форма обратной связи */}
        {showFeedbackManagement && (
          <FeedbackManagement />
        )}

        <TerritoriesModal
          isOpen={showTerritories}
          onClose={() => setShowTerritories(false)}
          territories={territories}
          onUpdate={() => loadData()}
        />

        <PositionsModal
          isOpen={showPositions}
          onClose={() => setShowPositions(false)}
          positions={positions}
          onUpdate={() => loadData()}
        />

        <SystemSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        <ImportUsersModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleImportUsers}
          onSuccess={() => setShowImport(false)}
        />

        <ExportDataModal
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          users={users}
          territories={territories}
          positions={positions}
        />

        <SendCredentialsModal
          isOpen={showSendCredentials}
          onClose={() => {
            setShowSendCredentials(false);
            setSelectedUserForCredentials(null);
          }}
          user={selectedUserForCredentials}
        />
      </div>
    );
  }