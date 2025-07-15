import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Home,
  Calendar, 
  BookOpen, 
  Users, 
  BarChart3, 
  AlertCircle, 
  Settings, 
  TestTube,
  Building2,
  GraduationCap,
  Star,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Menu,
  FileText
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {  
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  roles?: string[]; // Роли, которые могут видеть этот пункт меню
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Главная',
    icon: <Home size={20} />,
    href: '/dashboard',
    roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator']
  },
  {
    id: 'events',
    label: 'Мои мероприятия',
    icon: <BookOpen size={20} />,
    href: '/events',
    roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator']
  },
  {
    id: 'tests',
    label: 'Тесты',
    icon: <FileText size={20} />,
    href: '/tests',
    roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator']
  },
  {
    id: 'employees',
    label: 'Мои сотрудники',
    icon: <Users size={20} />,
    href: '/employees',
    roles: ['supervisor', 'trainer', 'moderator', 'administrator']
  },
  {
    id: 'representatives',
    label: 'Торговые представители',
    icon: <Building2 size={20} />,
    href: '/representatives',
    roles: ['supervisor', 'trainer', 'moderator', 'administrator']
  },
  {
    id: 'supervisors',
    label: 'Супервайзеры',
    icon: <GraduationCap size={20} />,
    href: '/supervisors',
    roles: ['trainer', 'moderator', 'administrator']
  },
  {
    id: 'expert-events',
    label: 'Экспертные мероприятия',
    icon: <Star size={20} />,
    href: '/expert-events',
    roles: ['expert', 'trainer', 'moderator', 'administrator']
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    icon: <BarChart3 size={20} />,
    href: '/analytics',
    roles: ['supervisor', 'trainer', 'moderator', 'administrator'] 
  },
  {
    id: 'tasks',
    label: 'Горящие задачи',
    icon: <AlertCircle size={20} />,
    href: '/tasks',
    badge: 3,
    roles: ['supervisor', 'trainer', 'moderator', 'administrator']
  },
  {
    id: 'testing',
    label: 'Тестирование',
    icon: <TestTube size={20} />,
    href: '/testing',
    roles: ['trainer', 'moderator', 'administrator']
  },
  {
    id: 'trainer-territories',
    label: 'Филиалы тренеров',
    icon: <Building2 size={20} />,
    href: '/trainer-territories',
    roles: ['trainer', 'moderator', 'administrator']
  },
  {
    id: 'admin',
    label: 'Администрирование',
    icon: <Shield size={20} />,
    href: '/admin',
    roles: ['administrator']
  },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, userProfile } = useAuth();

  // Фильтруем пункты меню на основе роли пользователя
  const visibleItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(userProfile?.role || user?.role || 'employee')
  );

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside 
      className={`
        ${isCollapsed ? 'w-20' : 'w-80'} 
        bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
        flex flex-col relative min-h-[calc(100vh-5rem)] z-30
      `}
    >
      {/* Заголовок с кнопкой сворачивания */}
      <div className={`
        flex items-center justify-between p-4 border-b border-gray-100
        ${isCollapsed ? 'px-3 justify-center' : 'px-4'}
      `}>
        <div className={`
          flex items-center space-x-3 overflow-hidden transition-all duration-300
          ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
        `}>
          <div className="flex items-center space-x-2">
            <Menu size={18} className="text-sns-500" />
            <h2 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
              Навигация
            </h2>
          </div>
        </div>
        
        <button
          onClick={toggleSidebar}
          className={`
            p-2 rounded-squircle hover:bg-gray-100 transition-colors flex-shrink-0
            ${isCollapsed ? 'w-full flex justify-center' : ''}
          `}
          title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {isCollapsed ? (
            <ChevronRight size={18} className="text-gray-600" />
          ) : (
            <ChevronLeft size={18} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* Навигационное меню */}
      <nav className="flex-1 py-4 overflow-hidden">
        <ul className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {visibleItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onItemClick(item.id)}
                className={`
                  w-full flex items-center text-sm font-medium rounded-squircle transition-colors relative
                  ${isCollapsed ? 'p-3' : 'px-4 py-3'}
                  ${
                    activeItem === item.id
                      ? 'bg-sns-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                  group
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Иконка - центрируется автоматически в свернутом состоянии */}
                <div className={`
                  relative
                  ${isCollapsed ? 'w-full flex justify-center ml-2' : 'w-5 h-5 flex-shrink-0'}
                `}>
                  <span className={`transition-colors block
                    ${activeItem === item.id ? 'text-white' : 'text-gray-500 group-hover:text-sns-500'}
                  `}>
                    {item.icon}
                  </span>
                </div>

                {/* Бейдж для свернутого состояния - абсолютное позиционирование */}
                {item.badge && isCollapsed && item.id === 'tasks' && (
                  <span className="absolute -top-1 -right-6 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center z-10 shadow-sm font-medium">
                    {item.badge}
                  </span>
                )}

                {/* Текст */}
                <span className={`
                  ml-3 whitespace-nowrap transition-all duration-300 overflow-hidden
                  ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                `}>
                  {item.label}
                </span>

                {/* Бейдж для развернутого состояния */}
                {item.badge && !isCollapsed && item.id === 'tasks' && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                    {item.badge}
                  </span>
                )}

                {/* Тултип для свернутого состояния */}
                {isCollapsed && (
                  <div className="
                    absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-squircle
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition-all duration-200 whitespace-nowrap z-50
                    pointer-events-none
                  ">
                    {item.label}
                    {item.badge && item.id === 'tasks' && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                    {/* Стрелка тултипа */}
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Информация о пользователе */}
      <div className={`
        border-t border-gray-100 p-4 transition-all duration-300
        ${isCollapsed ? 'flex justify-center' : ''}
      `}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-sns-400 to-sns-600 rounded-squircle flex items-center justify-center">
              <span className="text-white font-semibold text-xs">
                {userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                 user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 
                 (user?.email ? user.email[0].toUpperCase() : 'U')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{userProfile?.full_name || user?.full_name || user?.email?.split('@')[0] || 'Пользователь'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.position}</p>
            </div>
          </div>
        )}
        
        <div className={`
          flex items-center space-x-2 text-xs text-gray-500 transition-all duration-300
          ${isCollapsed ? 'justify-center' : ''}
        `}>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          {!isCollapsed && <span className="whitespace-nowrap">Система активна</span>}
        </div>
      </div>
    </aside>
  );
}