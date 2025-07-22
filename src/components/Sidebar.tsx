import React from 'react';
import { SidebarToggleButton } from './SidebarToggleButton';
import { useAuth } from '../hooks/useAuth';
import {
  AppWindow, Calendar, BookOpen, Users, BarChart3, AlertCircle, Settings,
  TestTube, Building2, GraduationCap, Star, Shield,
  Sparkles, FileText
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  href: string;
  badge?: number;
  roles?: string[];
}

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: <AppWindow />, href: '/dashboard', roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] },
  { id: 'events', label: 'Мои мероприятия', icon: <BookOpen />, href: '/events', roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] },
  { id: 'tests', label: 'Тесты', icon: <FileText />, href: '/tests', roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] },
  { id: 'employees', label: 'Мои сотрудники', icon: <Users />, href: '/employees', roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'representatives', label: 'Торговые представители', icon: <Building2 />, href: '/representatives', roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'supervisors', label: 'Супервайзеры', icon: <GraduationCap />, href: '/supervisors', roles: ['trainer', 'moderator', 'administrator'] },
  { id: 'expert-events', label: 'Экспертные мероприятия', icon: <Star />, href: '/expert-events', roles: ['expert', 'trainer', 'moderator', 'administrator'] },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 />, href: '/analytics', roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'tasks', label: 'Горящие задачи', icon: <AlertCircle />, href: '/tasks', badge: 3, roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'testing', label: 'Тестирование', icon: <TestTube />, href: '/testing', roles: ['trainer', 'moderator', 'administrator'] },
  { id: 'trainer-territories', label: 'Филиалы тренеров', icon: <Building2 />, href: '/trainer-territories', roles: ['trainer', 'moderator', 'administrator'] },
  { id: 'admin', label: 'Администрирование', icon: <Shield />, href: '/admin', roles: ['administrator'] },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeItem, onItemClick, isCollapsed, onToggle }: SidebarProps) {
  const { user, userProfile } = useAuth();

  const visibleItems = navigationItems.filter(item =>
    !item.roles || item.roles.includes(userProfile?.role || user?.role || 'employee')
  );

  const initials = userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)
    || (user?.email ? user.email[0].toUpperCase() : 'U');

  const fullName = userProfile?.full_name || user?.email?.split('@')[0] || 'Пользователь';

  return (
    <aside
      className={clsx(
        "fixed left-4 top-[96px] z-40 bg-white shadow-xl drop-shadow-xl rounded-2xl transition-all duration-300 ease-in-out flex flex-col h-[calc(100vh-96px-2rem)] pt-0 mb-8",
        isCollapsed ? "lg:w-20" : "lg:w-80", "w-full"
      )}
    >
      {/* Верхняя часть: навигация */}
      <nav className="flex-1 py-2 overflow-hidden">
        <ul className="space-y-1 px-2">
          {visibleItems.map(item => {
            const isActive = activeItem === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item.id)}
                  className={clsx(
                    "group relative w-full transition-colors font-medium text-sm superellipse",
                    isCollapsed
                      ? "h-12 flex items-center justify-center"
                      : "flex items-center px-4 py-3",
                    isActive ? "bg-sns-500" : "hover:bg-gray-100"
                  )}
                  title={item.label}
                >
                  {/* Icon (всегда по центру) */}
                  <div className="flex items-center justify-center w-7 h-7">
                    {React.cloneElement(item.icon as React.ReactElement, {
                      size: 22,
                      strokeWidth: 1.4,
                      className: clsx(
                        'transition-colors duration-200',
                        activeItem === item.id
                          ? 'text-white'
                          : 'text-slate-500 group-hover:text-sns-500 group-focus:text-sns-500'
                      )
                    })}
                  </div>
                  {/* Label (только в развернутом) */}
                  {!isCollapsed && (
                    <span className={clsx(
                      "ml-3 truncate",
                      isActive ? "text-white font-semibold" : "text-gray-700"
                    )}>
                      {item.label}
                    </span>
                  )}
                  {/* Badge expanded */}
                  {item.badge && !isCollapsed && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {/* Badge collapsed */}
                  {item.badge && isCollapsed && (
                    <span className="absolute top-1 right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center shadow-sm font-medium">
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-squircle shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap">
                      {item.label}
                      {item.badge && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {item.badge}
                        </span>
                      )}
                      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}

        </ul>
      </nav>

      {/* User Info — всегда внизу */}
      <div className="border-t border-gray-100 p-4 mt-0">
        {isCollapsed ? (
          <div className="relative flex flex-col items-center gap-2">
            <div className="relative z-10 w-8 h-8 bg-gradient-to-br from-sns-400 to-sns-600 rounded-squircle flex items-center justify-center squircle24">
              <span className="text-white font-semibold text-xs">{initials}</span>
            </div>
            {/* Кнопка свернуть/развернуть — рядом с аватаркой, под аватаркой */}
            <SidebarToggleButton
              isCollapsed={isCollapsed}
              onToggle={onToggle}
              className="absolute right-[-72px] top-1/2 -translate-y-1/2 hidden lg:flex z-0"
            />
          </div>
        ) : (
          <>
            <div className="relative flex items-center space-x-3">
              <div className="relative z-10 w-8 h-8 bg-gradient-to-br from-sns-400 to-sns-600 rounded-squircle flex items-center justify-center squircle24">
                <span className="text-white font-semibold text-xs">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{fullName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.position}</p>
              </div>
              {/* Кнопка свернуть/развернуть — справа на уровне ФИО */}
              <SidebarToggleButton
                isCollapsed={isCollapsed}
                onToggle={onToggle}
                className="absolute right-[-72px] top-1/2 -translate-y-1/2 hidden lg:flex"
              />
            </div>

          </>
        )}
      </div>

    </aside>
  );
}
