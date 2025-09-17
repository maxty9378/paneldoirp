import React, { useState, useEffect, useMemo } from 'react';
import snsLogo from '../assets/sns-logo.svg';
import { User, LogOut, Settings, Camera, Menu, Search, Bell, ChevronDown, Home, Calendar, Users, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AvatarModal } from './profile/AvatarModal';
import { supabase } from '../lib/supabase';
import { NotificationBell } from './notifications/NotificationBell';
import { useNavigate, useLocation } from 'react-router-dom';
import { USER_ROLE_LABELS } from '../types';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, userProfile, loading, signOut, refreshProfile } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Отслеживание скролла для эффекта стекла
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Функция для получения инициалов из полного имени
  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName[0]?.toUpperCase() || '?';
  };

  // Функция для обновления аватарки
  const handleAvatarUpdate = () => {
    setAvatarTimestamp(Date.now());
    refreshProfile();
  };

  const isAdmin = userProfile?.role === 'administrator';

  // Мемоизация вычислений имени и должности
  const displayName = useMemo(() => {
    if (loading) return '...';
    return userProfile?.full_name || user?.email?.split('@')[0] || 'Пользователь';
  }, [userProfile, user, loading]);

  const displayPosition = useMemo(() => {
    if (loading) return '...';
    return userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Роль не определена';
  }, [userProfile, loading]);

  // Получение текущего заголовка страницы
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/': return 'Главная';
      case '/events': return 'Мероприятия';
      case '/testing': return 'Тесты';
      case '/employees': return 'Сотрудники';
      case '/representatives': return 'Представители';
      case '/supervisors': return 'Супервайзеры';
      case '/expert-events': return 'Экспертные мероприятия';
      case '/analytics': return 'Аналитика';
      case '/tasks': return 'Задачи';
      case '/admin': return 'Администрирование';
      case '/trainer-territories': return 'Филиалы';
      default: return 'Портал обучения';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Можно добавить уведомление об ошибке
    }
  };

  // Быстрые действия для мобильной навигации
  const quickActions = [
    { id: 'dashboard', label: 'Главная', icon: <Home size={20} />, path: '/' },
    { id: 'events', label: 'Мероприятия', icon: <Calendar size={20} />, path: '/events' },
    { id: 'tests', label: 'Тесты', icon: <FileText size={20} />, path: '/testing' },
    { id: 'employees', label: 'Сотрудники', icon: <Users size={20} />, path: '/employees' },
  ];

  return (
    <>
      {/* Основная шапка */}
      <header className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out
        ${isScrolled 
          ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg' 
          : 'bg-white/95 backdrop-blur-md border-b border-gray-100'
        }
      `}>
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Левая часть: лого и заголовок */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Кнопка мобильного меню */}
              <button
                onClick={onMobileMenuToggle}
                className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95"
                title="Открыть меню"
              >
                <Menu size={24} />
              </button>
              
              {/* Логотип */}
              <div className="flex items-center space-x-3">
                <img 
                  src="https://static.tildacdn.com/tild3434-6235-4334-b731-653564373934/Group.svg" 
                  alt="SNS Group of companies" 
                  className="h-7 sm:h-8 w-auto"
                />
                <div className="hidden sm:block border-l border-gray-200 h-6" />
              </div>
              
              {/* Заголовок */}
              <div className="hidden sm:block ml-4">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Портал обучения</h1>
                <p className="text-xs sm:text-sm text-gray-500">Личный кабинет</p>
              </div>
            </div>

            {/* Центральная часть: заголовок страницы (только на мобильных) */}
            <div className="sm:hidden flex-1 text-center">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {getCurrentPageTitle()}
              </h2>
            </div>

            {/* Правая часть: профиль и действия */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Поиск (только на десктопе) */}
              <button className="hidden lg:flex p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200">
                <Search size={20} />
              </button>

              {/* Уведомления (только на десктопе) */}
              <div className="hidden lg:block">
                <NotificationBell />
              </div>

              {/* Мобильная версия — аватар с выпадающим меню */}
              <div className="lg:hidden">
                <div className="relative">
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-95"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                      {userProfile?.avatar_url ? (
                        <img
                          src={`${userProfile.avatar_url}?t=${avatarTimestamp}`}
                          alt={userProfile.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${userProfile?.avatar_url ? 'hidden' : ''}`}>
                        <span className="text-xs font-bold text-gray-600">
                          {getInitials(userProfile?.full_name)}
                        </span>
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${showMobileMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Мобильное выпадающее меню */}
                  {showMobileMenu && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      {/* Заголовок профиля */}
                      <div className="p-4 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                            {userProfile?.avatar_url ? (
                              <img
                                src={`${userProfile.avatar_url}?t=${avatarTimestamp}`}
                                alt={userProfile.full_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${userProfile?.avatar_url ? 'hidden' : ''}`}>
                              <span className="text-sm font-bold text-gray-600">
                                {getInitials(userProfile?.full_name)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{displayPosition}</p>
                          </div>
                          <button
                            onClick={() => setShowAvatarModal(true)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Изменить аватар"
                          >
                            <Camera size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Быстрые действия */}
                      <div className="p-3">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">Быстрый доступ</p>
                        <div className="grid grid-cols-2 gap-2">
                          {quickActions.map((action) => (
                                                         <button
                               key={action.id}
                               onClick={() => {
                                 navigate(action.path);
                                 setShowMobileMenu(false);
                               }}
                               className="flex items-center space-x-2 p-3 text-left rounded-xl hover:bg-gray-50 transition-all duration-200 active:scale-95"
                             >
                              <div className="text-gray-600">{action.icon}</div>
                              <span className="text-sm font-medium text-gray-700">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="p-3 border-t border-gray-100">
                        {/* Скрываем кнопку "Настройки" для экспертов */}
                        {userProfile?.role !== 'expert' && (
                          <button
                            onClick={() => {
                              setShowMobileMenu(false);
                              // Добавить логику настроек
                            }}
                            className="flex items-center space-x-3 w-full p-3 text-left rounded-xl hover:bg-gray-50 transition-all duration-200 active:scale-95"
                          >
                            <Settings size={18} className="text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Настройки</span>
                          </button>
                        )}
                                                 <button
                           onClick={() => {
                             handleSignOut();
                             setShowMobileMenu(false);
                           }}
                           className="flex items-center space-x-3 w-full p-3 text-left rounded-xl hover:bg-red-50 transition-all duration-200 active:scale-95"
                         >
                          <LogOut size={18} className="text-red-500" />
                          <span className="text-sm font-medium text-red-600">Выйти</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Десктопная версия — полный профиль */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  {/* Имя и роль */}
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                    <div className="flex items-center space-x-1">
                      <p className="text-xs text-gray-500">{displayPosition}</p>
                    </div>
                  </div>
                  {/* Аватар */}
                  <div className="relative group">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                      {userProfile?.avatar_url ? (
                        <img
                          src={`${userProfile.avatar_url}?t=${avatarTimestamp}`}
                          alt={userProfile.full_name}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${userProfile?.avatar_url ? 'hidden' : ''}`}>
                        <span className="text-base font-bold text-gray-600">
                          {getInitials(userProfile?.full_name)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#06A478] rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:scale-110"
                      title="Изменить аватар"
                      tabIndex={-1}
                    >
                      <Camera size={14} className="text-white" />
                    </button>
                  </div>
                  {/* Кнопки действий */}
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200" title="Настройки">
                      <Settings size={18} />
                    </button>
                    
                    <button
                      onClick={handleSignOut}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 flex items-center space-x-1"
                      title="Выйти"
                    >
                      <LogOut size={18} />
                      <span className="text-xs hidden sm:inline">Выйти</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Оверлей для закрытия мобильного меню */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Модальные окна */}
      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        user={userProfile}
        onSuccess={handleAvatarUpdate}
      />
    </>
  );
}