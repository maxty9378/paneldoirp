import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Home, Calendar, BookOpen, Users, BarChart3, AlertCircle, Settings,
  TestTube, Building2, GraduationCap, Star, Shield, ChevronLeft, ChevronRight,
  Sparkles, Menu, FileText
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  roles?: string[];
}

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: <Home size={20} />, href: '/dashboard', roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] },
  { id: 'events', label: 'Мои мероприятия', icon: <BookOpen size={20} />, href: '/events', roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] },
  { id: 'tests', label: 'Тесты', icon: <FileText size={20} />, href: '/tests', roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] },
  { id: 'employees', label: 'Мои сотрудники', icon: <Users size={20} />, href: '/employees', roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'representatives', label: 'Торговые представители', icon: <Building2 size={20} />, href: '/representatives', roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'supervisors', label: 'Супервайзеры', icon: <GraduationCap size={20} />, href: '/supervisors', roles: ['trainer', 'moderator', 'administrator'] },
  { id: 'expert-events', label: 'Экспертные мероприятия', icon: <Star size={20} />, href: '/expert-events', roles: ['expert', 'trainer', 'moderator', 'administrator'] },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 size={20} />, href: '/analytics', roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'tasks', label: 'Горящие задачи', icon: <AlertCircle size={20} />, href: '/tasks', badge: 3, roles: ['supervisor', 'trainer', 'moderator', 'administrator'] },
  { id: 'testing', label: 'Тестирование', icon: <TestTube size={20} />, href: '/testing', roles: ['trainer', 'moderator', 'administrator'] },
  { id: 'trainer-territories', label: 'Филиалы тренеров', icon: <Building2 size={20} />, href: '/trainer-territories', roles: ['trainer', 'moderator', 'administrator'] },
  { id: 'admin', label: 'Администрирование', icon: <Shield size={20} />, href: '/admin', roles: ['administrator'] },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
}

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const { user, userProfile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const visibleItems = navigationItems.filter(item =>
    !item.roles || item.roles.includes(userProfile?.role || user?.role || 'employee')
  );

  const initials = userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)
    || user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)
    || (user?.email ? user.email[0].toUpperCase() : 'U');

  const fullName = userProfile?.full_name || user?.full_name || user?.email?.split('@')[0] || 'Пользователь';

  return (
    <aside
      className={clsx(
        "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col min-h-[calc(100vh-5rem)] z-30",
        isCollapsed ? "lg:w-20" : "lg:w-80", "w-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3 overflow-hidden">
          {!isCollapsed && (
            <>
              <Menu size={20} className="text-sns-500 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-gray-900">Навигация</h2>
            </>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="text-gray-600 hover:text-gray-900 hidden lg:block"
          title={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-hidden">
        <ul className="space-y-1 px-2">
          {visibleItems.map(item => {
            const isActive = activeItem === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item.id)}
                  className={clsx(
                    "group relative w-full transition-colors rounded-squircle font-medium text-sm",
                    isCollapsed
                      ? "h-12 flex items-center justify-center"
                      : "flex items-center px-4 py-3",
                    isActive ? "bg-sns-500 text-white" : "text-gray-700 hover:bg-gray-100"
                  )}
                  title={item.label}
                >
                  {/* Icon (всегда по центру) */}
                  <div
                    className={clsx(
                      "flex items-center justify-center w-6 h-6 transition-colors",
                      isActive ? "text-white" : "text-gray-500 group-hover:text-sns-500"
                    )}
                  >
                    {item.icon}
                  </div>

                  {/* Label (только в развернутом) */}
                  {!isCollapsed && (
                    <span className="ml-3 truncate">{item.label}</span>
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

      {/* User Info */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-sns-400 to-sns-600 rounded-squircle flex items-center justify-center">
            <span className="text-white font-semibold text-xs">{initials}</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.position}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Система активна</span>
          </div>
        )}
      </div>
    </aside>
  );
}
