import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileExamNavigation from '../exam/MobileExamNavigation';

// Определяем, какая вкладка активна, на основе текущего URL
const getActiveTabFromPathname = (pathname: string) => {
  if (pathname.includes('/schedule')) return 'schedule';
  if (pathname.includes('/evaluations')) return 'evaluations';
  return 'participants'; // По умолчанию
};

const MobileLayout: React.FC = () => {
  // Состояние для скрытия меню (например, при открытии модалок)
  const [isNavHidden, setIsNavHidden] = useState(false);

  const location = useLocation();
  const activeTab = getActiveTabFromPathname(location.pathname);

  // Функция для изменения вкладки (в данном примере не используется, т.к. навигация через ссылки)
  const handleTabChange = (tab: 'participants' | 'schedule' | 'evaluations') => {
    // Здесь должна быть логика навигации, если у вас не ссылки, а кнопки
    // navigate(`/exam/${id}/${tab}`);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      // Используем 100dvh - это "динамическая высота окна", 
      // которая учитывает появление/скрытие панелей браузера на мобильных.
      // Это современная и лучшая замена 100vh.
      height: '100vh', // Fallback для старых браузеров
      height: '100dvh', // Современные браузеры
      width: '100vw',
      overflow: 'hidden', // Запрещаем скролл для всего контейнера
      background: '#f8fafc' // Фон для всего приложения
    }}>
      
      {/* 1. ОБЛАСТЬ КОНТЕНТА (СКРОЛЛИТСЯ) */}
      <main style={{
        flex: '1 1 0%', // Занимает всё доступное пространство
        overflowY: 'auto', // Включаем скролл ТОЛЬКО для этой области
        WebkitOverflowScrolling: 'touch', // Плавный скролл на iOS
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' // Отступ под меню
      }}>
        {/* React Router будет рендерить здесь нужную страницу (ExpertExamPage и т.д.) */}
        <Outlet context={{ setIsNavHidden }} />
      </main>

      {/* 2. ОБЛАСТЬ НАВИГАЦИИ (ФИКСИРОВАНА) */}
      <footer style={{
        flexShrink: 0, // Запрещаем сжиматься
        // Убираем position: fixed, так как Flexbox сам прижмет его к низу
        backgroundColor: 'rgba(255, 0, 0, 0.1)', // Временный отладочный фон
        minHeight: '64px' // Минимальная высота для отладки
      }}>
        <MobileExamNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isHidden={isNavHidden}
        />
      </footer>
    </div>
  );
};

export default MobileLayout;
