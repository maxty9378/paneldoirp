import React, { useState, useEffect, useMemo } from 'react';
import snsLogo from '../assets/sns-logo.svg';
import { User, LogOut, Settings, Camera, Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

import { AvatarModal } from './profile/AvatarModal';

import { supabase } from '../lib/supabase';
import { NotificationBell } from './notifications/NotificationBell';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, userProfile, loading, signOut, refreshProfile } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

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
    return userProfile?.position || 'Должность не указана';
  }, [userProfile, loading]);

  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Можно добавить уведомление об ошибке
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 fixed top-0 left-0 right-0 z-40 shadow-md">
      <div className="flex items-center justify-between">
        {/* Левая часть: лого и заголовок всегда */}
        <div className="flex items-center space-x-4">
          {/* Кнопка мобильного меню */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Открыть меню"
          >
            <Menu size={24} />
          </button>
          
          {/* Логотип */}
          <img src="https://static.tildacdn.com/tild3434-6235-4334-b731-653564373934/Group.svg" alt="SNS Group of companies" className="h-8 w-auto" />
          {/* Разделитель */}
          <div className="border-l border-gray-200 h-8 mx-4" />
          {/* Заголовок */}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Портал обучения</h1>
            <p className="text-sm text-gray-500">Личный кабинет</p>
          </div>
        </div>

        {/* Правая часть: профиль и действия */}
        {/* Desktop: всё, Mobile: только аватар */}
        <div className="flex items-center space-x-4">
          {/* Мобильная версия — только аватар */}
          <div className="lg:hidden">
            <div className="relative group">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                {userProfile?.avatar_url ? (
                  <img
                    src={`${userProfile.avatar_url}?t=${avatarTimestamp}`}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Если аватарка не загрузилась, показываем инициалы
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
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#06A478] rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:scale-110"
                title="Изменить аватар"
                tabIndex={-1}
              >
                <Camera size={14} className="text-white" />
              </button>
            </div>
          </div>

          {/* Десктопная версия — всё как было */}
          <div className="hidden lg:flex items-center space-x-4">

          {/* Десктопная правая часть — всё как было */}
          {/* <NotificationBell /> */}
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
                      // Если аватарка не загрузилась, показываем инициалы
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
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" title="Настройки">
                <Settings size={18} />
              </button>
              
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors flex items-center space-x-1"
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

      {/* Модальные окна */}
      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        user={userProfile}
        onSuccess={handleAvatarUpdate}
      />
    </header>
  );
}