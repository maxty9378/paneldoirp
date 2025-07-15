import React, { useState, useEffect, useMemo } from 'react';
import { User, LogOut, Settings, Camera, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLE_LABELS } from '../../types';
import { AvatarModal } from '../profile/AvatarModal';
import { RoleSwitcherModal } from '../admin/RoleSwitcherModal';
import { supabase } from '../../lib/supabase';
import { NotificationBell } from '../notifications/NotificationBell';

export function Header() {
  const { user, userProfile, loading, signOut, refreshProfile } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isRoleSwitched, setIsRoleSwitched] = useState(false);

  const isAdmin = userProfile?.role === 'administrator';

  // Мемоизация вычислений имени и роли
  const displayName = useMemo(() => {
    if (loading) return '...';
    return userProfile?.full_name || user?.full_name || user?.email?.split('@')[0] || 'Пользователь';
  }, [userProfile, user, loading]);

  const displayRole = useMemo(() => {
    if (loading) return '...';
    return userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Пользователь';
  }, [userProfile, loading]);

  // Проверка переключения роли
  useEffect(() => {
    let ignore = false;
    async function checkRoleSwitchStatus() {
      if (!userProfile?.id) return;
      try {
        const { data, error } = await supabase
          .from('user_activity_logs')
          .select('new_values, old_values')
          .eq('action', 'switch_role_original')
          .eq('resource_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!ignore && data && data.length > 0) {
          const originalRole = data[0].new_values?.original_role;
          setIsRoleSwitched(Boolean(originalRole && originalRole !== userProfile.role));
        }
      } catch (err) {
        if (!ignore) setIsRoleSwitched(false);
        // Можно добавить логирование ошибки
      }
    }
    checkRoleSwitchStatus();
    return () => { ignore = true; };
  }, [userProfile?.id, userProfile?.role]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Можно добавить уведомление об ошибке
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 fixed top-0 left-0 right-0 z-40">
      <div className="flex items-center justify-between">
        {/* Логотип и заголовок */}
        <div className="flex items-center space-x-4">
          <img src="/sns-logo.png" alt="ГК СНС" className="h-8 w-auto" />
          <div className="w-px h-8 bg-gray-300" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Портал обучения</h1>
            <p className="text-sm text-gray-500">Личный кабинет</p>
          </div>
        </div>

        {/* Правая часть: уведомления, профиль, действия */}
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <div className="flex items-center space-x-3">
            {/* Имя и роль */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <div className="flex items-center space-x-1">
                <p className="text-xs text-gray-500">{displayRole}</p>
                {isRoleSwitched && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <RotateCcw size={10} className="mr-0.5" />
                    Тест
                  </span>
                )}
              </div>
            </div>
            {/* Аватар */}
            <div className="relative group">
              <div className="w-12 h-12 bg-gray-300 rounded-2xl flex items-center justify-center overflow-hidden">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-gray-600" />
                )}
              </div>
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-sns-green rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
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
              {isAdmin && (
                <button
                  onClick={() => setShowRoleSwitcher(true)}
                  className="p-2 text-gray-400 hover:text-sns-green transition-colors"
                  title={isRoleSwitched ? "Вернуть оригинальную роль" : "Переключить роль (тестирование)"}
                >
                  <RotateCcw size={18} className={isRoleSwitched ? "text-yellow-500" : ""} />
                </button>
              )}
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

      {/* Модальные окна */}
      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        user={userProfile}
        onSuccess={() => {
          setShowAvatarModal(false);
          refreshProfile();
        }}
      />
      {isAdmin && (
        <RoleSwitcherModal
          isOpen={showRoleSwitcher}
          onClose={() => setShowRoleSwitcher(false)}
          currentUser={userProfile}
          onRoleChange={refreshProfile}
        />
      )}
    </header>
  );
}