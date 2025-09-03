import React, { useState, useEffect } from 'react';
import { SidebarToggleButton } from './SidebarToggleButton';
import { useAuth } from '../hooks/useAuth';
import {
  AppWindow, Calendar, BookOpen, Users, BarChart3, AlertCircle, Settings,
  TestTube, Building2, GraduationCap, Star, Shield,
  Sparkles, FileText, X, Home, LogOut, Camera, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { USER_ROLE_LABELS } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  href: string;
  badge?: number;
  roles?: string[];
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

const navigationItems: NavItem[] = [
  { 
    id: 'dashboard', 
    label: 'Главная', 
    icon: <AppWindow />, 
    href: '/dashboard', 
    description: 'Обзор и статистика',
    roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] 
  },
  { 
    id: 'events', 
    label: 'Мои мероприятия', 
    icon: <BookOpen />, 
    href: '/events', 
    description: 'Управление мероприятиями',
    roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] 
  },
  { 
    id: 'tests', 
    label: 'Тесты', 
    icon: <FileText />, 
    href: '/testing', 
    description: 'Прохождение тестов',
    roles: ['employee', 'supervisor', 'trainer', 'expert', 'moderator', 'administrator'] 
  },
  { 
    id: 'employees', 
    label: 'Мои сотрудники', 
    icon: <Users />, 
    href: '/employees', 
    description: 'Управление командой',
    roles: ['supervisor', 'trainer', 'moderator', 'administrator'] 
  },
  { 
    id: 'representatives', 
    label: 'Торговые представители', 
    icon: <Building2 />, 
    href: '/representatives', 
    description: 'Работа с представителями',
    roles: ['supervisor', 'trainer', 'moderator', 'administrator'],
    disabled: true,
    disabledReason: 'В разработке'
  },
  { 
    id: 'supervisors', 
    label: 'Супервайзеры', 
    icon: <GraduationCap />, 
    href: '/supervisors', 
    description: 'Управление супервайзерами',
    roles: ['trainer', 'moderator', 'administrator'],
    disabled: true,
    disabledReason: 'В разработке'
  },
  { 
    id: 'expert-events', 
    label: 'Экспертные мероприятия', 
    icon: <Star />, 
    href: '/expert-events', 
    description: 'Специальные события',
    roles: ['expert', 'trainer', 'moderator', 'administrator'],
    disabled: true,
    disabledReason: 'В разработке'
  },
  { 
    id: 'analytics', 
    label: 'Аналитика', 
    icon: <BarChart3 />, 
    href: '/analytics', 
    description: 'Отчеты и метрики',
    roles: ['supervisor', 'trainer', 'moderator', 'administrator'],
    disabled: true,
    disabledReason: 'В разработке'
  },
  { 
    id: 'tasks', 
    label: 'Горящие задачи', 
    icon: <AlertCircle />, 
    href: '/tasks', 
    badge: 3, 
    description: 'Срочные поручения',
    roles: ['supervisor', 'trainer', 'moderator', 'administrator'],
    disabled: true,
    disabledReason: 'В разработке'
  },
  { 
    id: 'testing', 
    label: 'Тестирование', 
    icon: <TestTube />, 
    href: '/testing', 
    description: 'Администрирование тестов',
    roles: ['trainer', 'moderator', 'administrator'] 
  },
  { 
    id: 'trainer-territories', 
    label: 'Филиалы тренеров', 
    icon: <Building2 />, 
    href: '/trainer-territories', 
    description: 'Территориальное управление',
    roles: ['trainer', 'moderator', 'administrator'] 
  },
  { 
    id: 'admin', 
    label: 'Администрирование', 
    icon: <Shield />, 
    href: '/admin', 
    description: 'Системные настройки',
    roles: ['administrator'] 
  },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (itemId: string) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ activeItem, onItemClick, isCollapsed = false, onToggle, isMobile = false, onMobileClose }: SidebarProps) {
  const { user, userProfile } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Отслеживание скролла для мобильной версии
  useEffect(() => {
    if (isMobile) {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 10);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isMobile]);

  const visibleItems = navigationItems.filter(item =>
    !item.roles || item.roles.includes(userProfile?.role || user?.role || 'employee')
  );

  const initials = userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)
    || (user?.email ? user.email[0].toUpperCase() : 'U');

  const fullName = userProfile?.full_name || user?.email?.split('@')[0] || 'Пользователь';

  return (
    <aside
      className={clsx(
        "transition-all duration-300 ease-out flex flex-col",
        isMobile 
          ? "w-full mobile-menu-full-height rounded-none pt-safe-top pb-safe-bottom mobile-glass-effect" 
          : "fixed left-4 top-[96px] z-40 rounded-2xl h-[calc(100vh-96px-2rem)] pt-0 mb-8 bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-100/50",
        isCollapsed ? "lg:w-20" : "lg:w-80", 
        isMobile ? "w-full" : "w-full"
      )}
    >
      {/* Заголовок и кнопка закрытия для мобильной версии */}
      {isMobile && onMobileClose && (
        <div className={clsx(
          "flex items-center justify-between p-4 transition-all duration-300 flex-shrink-0 mobile-glass-header",
          isScrolled ? "mobile-glass-header" : "mobile-glass-header"
        )}>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Навигация</h2>
            <p className="text-sm text-gray-500">Быстрый доступ к разделам</p>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-xl transition-all duration-200 active:scale-95 backdrop-blur-sm"
            title="Закрыть меню"
          >
            <X size={24} />
          </button>
        </div>
      )}



      {/* Верхняя часть: навигация */}
      <nav className={clsx("flex-1 overflow-y-auto", isMobile ? "mobile-glass-nav" : "")}>
        <div className={clsx("space-y-1", isMobile ? "px-4 py-4" : "px-2 py-2")}>
          {visibleItems.length > 0 ? (
            visibleItems.map(item => {
              const isActive = activeItem === item.id;
              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => !item.disabled && onItemClick(item.id)}
                    disabled={item.disabled}
                    className={clsx(
                      "group relative w-full transition-all duration-300 font-medium text-sm rounded-2xl",
                      isMobile 
                        ? "flex items-center px-4 py-4 h-16"
                        : isCollapsed
                          ? "h-12 flex items-center justify-center"
                          : "flex items-center px-4 py-3 h-14",
                      item.disabled
                        ? "opacity-50 cursor-not-allowed bg-gray-50/50 text-gray-400"
                        : isActive 
                          ? "bg-gradient-to-r from-[#06A478] to-[#059669] text-white shadow-xl shadow-[#06A478]/30 backdrop-blur-sm" 
                          : isMobile
                            ? "hover:bg-white/70 text-gray-700 hover:text-gray-900 hover:shadow-md hover:backdrop-blur-sm"
                            : "hover:bg-gray-50/80 text-gray-700 hover:text-gray-900 hover:shadow-sm hover:backdrop-blur-sm"
                    )}
                    title={item.disabled ? item.disabledReason : item.label}
                  >
                    {/* Icon */}
                    <div className={clsx(
                      "flex items-center justify-center rounded-xl transition-all duration-300",
                      isMobile ? "w-10 h-10" : "w-9 h-9",
                      item.disabled
                        ? "bg-gray-100/50"
                        : isActive
                          ? "bg-white/20 backdrop-blur-sm"
                          : "bg-transparent group-hover:bg-[#06A478]/10 group-hover:backdrop-blur-sm"
                    )}>
                      {React.cloneElement(item.icon as React.ReactElement, {
                        size: isMobile ? 22 : 20,
                        strokeWidth: 2,
                        className: clsx(
                          'transition-all duration-300',
                          item.disabled
                            ? 'text-gray-400'
                            : isActive
                              ? 'text-white drop-shadow-sm'
                              : 'text-gray-600 group-hover:text-[#06A478] group-hover:scale-110'
                        )
                      })}
                    </div>
                    
                    {/* Label и описание (только в развернутом или мобильном) */}
                    {(isMobile || !isCollapsed) && (
                      <div className="flex-1 min-w-0 ml-3 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className={clsx(
                              "font-medium truncate",
                              isMobile ? "text-base" : "text-sm",
                              item.disabled 
                                ? "text-gray-400" 
                                : isActive 
                                  ? "text-white font-semibold" 
                                  : "text-gray-700"
                            )}>
                              {item.label}
                            </span>
                            {item.disabled && (
                              <span className="text-xs text-gray-500 font-normal mt-0.5">
                                В разработке
                              </span>
                            )}
                          </div>
                          {/* Badge */}
                          {item.badge && (
                            <span className="ml-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full px-2.5 py-1 font-semibold min-w-[24px] text-center shadow-sm border border-red-400/20">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {/* Описание (только на мобильных) */}
                        {isMobile && item.description && !item.disabled && (
                          <p className={clsx(
                            "text-xs truncate mt-0.5",
                            isActive 
                              ? "text-white/80" 
                              : "text-gray-500"
                          )}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Стрелка для мобильной версии */}
                    {isMobile && (
                      <div className="p-1 rounded-lg bg-gray-100/50">
                        <ChevronRight size={16} className={clsx(
                          "transition-all duration-300",
                          item.disabled 
                            ? "text-gray-300" 
                            : isActive 
                              ? "text-white/80" 
                              : "text-gray-500 group-hover:text-[#06A478] group-hover:scale-110"
                        )} />
                      </div>
                    )}
                  </button>
                  
                  {/* Badge для свернутой версии */}
                  {item.badge && !isMobile && isCollapsed && (
                    <span className="absolute top-1 right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-md font-semibold border border-red-400/20">
                      {item.badge}
                    </span>
                  )}
                  
                  {/* Tooltip для свернутой версии */}
                  {!isMobile && isCollapsed && (
                    <div className="absolute left-full ml-3 px-4 py-3 bg-gray-900/95 backdrop-blur-md text-white text-sm rounded-2xl shadow-2xl border border-gray-700/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        {item.disabled && (
                          <span className="text-xs text-gray-400 font-normal mt-1">
                            В разработке
                          </span>
                        )}
                      </div>
                      {item.badge && !item.disabled && (
                        <span className="ml-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full px-2.5 py-1 shadow-sm border border-red-400/20">
                          {item.badge}
                        </span>
                      )}
                      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/95 rotate-45 border-l border-t border-gray-700/50"></div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Нет доступных разделов</p>
            </div>
          )}
        </div>
      </nav>

      {/* User Info — всегда внизу */}
      <div className={clsx(
        "mt-0 transition-all duration-300 flex-shrink-0",
        isMobile ? "p-6 pb-safe-bottom mobile-glass-user" : "p-4 border-t border-gray-100/50"
      )}>
        {isMobile ? (
          <div className="space-y-4">
            {/* Профиль пользователя */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">{initials}</span>
                </div>
                                               <button
                onClick={() => {
                  // Добавить логику изменения аватара
                }}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:scale-110 transition-all duration-200"
                title="Изменить аватар"
              >
                  <Camera size={12} className="text-gray-600" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">{fullName}</p>
                <p className="text-sm text-gray-500 truncate">{userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Роль не определена'}</p>
              </div>
            </div>
            
            {/* Быстрые действия */}
            <div className="space-y-2">
                                           <button className="flex items-center space-x-3 w-full p-3 text-left rounded-xl hover:bg-white/60 transition-all duration-200 active:scale-95 backdrop-blur-sm">
                <Settings size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Настройки</span>
              </button>
              <button 
                onClick={() => {
                  // Добавить логику выхода
                }}
                className="flex items-center space-x-3 w-full p-3 text-left rounded-xl hover:bg-red-50/80 transition-all duration-200 active:scale-95 backdrop-blur-sm"
              >
               <LogOut size={18} className="text-red-500" />
               <span className="text-sm font-medium text-red-600">Выйти</span>
             </button>
            </div>
          </div>
        ) : (
          <>
            {isCollapsed ? (
              <div className="relative flex flex-col items-center gap-2">
                <div className="relative z-10 w-8 h-8 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-xs">{initials}</span>
                </div>
                {/* Кнопка свернуть/развернуть — только для десктопа */}
                {!isMobile && onToggle && (
                  <SidebarToggleButton
                    isCollapsed={isCollapsed}
                    onToggle={onToggle}
                    className="absolute right-[-72px] top-1/2 -translate-y-1/2 hidden lg:flex z-0"
                  />
                )}
              </div>
            ) : (
              <div className="relative flex items-center space-x-3">
                <div className="relative z-10 w-8 h-8 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-xs">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Роль не определена'}</p>
                </div>
                {/* Кнопка свернуть/развернуть — только для десктопа */}
                {!isMobile && onToggle && (
                  <SidebarToggleButton
                    isCollapsed={isCollapsed}
                    onToggle={onToggle}
                    className="absolute right-[-72px] top-1/2 -translate-y-1/2 hidden lg:flex"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
