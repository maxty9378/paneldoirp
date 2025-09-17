import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const activeTab = getActiveTabFromPathname(location.pathname);

  // Функция для изменения вкладки через URL
  const handleTabChange = (tab: 'participants' | 'schedule' | 'evaluations') => {
    const base = location.pathname.replace(/\/(schedule|evaluations)$/, '');
    if (tab === 'participants') {
      navigate(base, { replace: false });
    } else {
      navigate(`${base}/${tab}`, { replace: false });
    }
  };

  return (
    <div style={{
      position: 'fixed', // Прибиваем каркас к окну
      inset: '0', // Растягиваем на весь экран (top: 0, left: 0, right: 0, bottom: 0)
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
      // overflow: 'hidden' здесь больше не нужен, так как inset: 0 уже фиксирует размер
    }}>
      
      {/* 1. ОБЛАСТЬ КОНТЕНТА (СКРОЛЛИТСЯ) */}
      <main style={{
        flex: '1 1 auto', // Позволяем расти и сжиматься
        overflowY: 'auto', // Включаем скролл ТОЛЬКО для этой области
        WebkitOverflowScrolling: 'touch', // Плавный скролл на iOS
        // Отступ снизу нужен, чтобы контент не прятался ЗА меню
        // Высота меню (64px) + его нижний отступ (16px) = 80px
        paddingBottom: '80px',
      }}>
        {/* React Router будет рендерить здесь нужную страницу (ExpertExamPage и т.д.) */}
        <Outlet context={{ setIsNavHidden }} />
      </main>

      {/* 2. ОБЛАСТЬ НАВИГАЦИИ (ФИКСИРОВАНА) */}
      <footer style={{
        flexShrink: 0, // Запрещаем сжиматься
        width: '100%',
        // Добавляем фон, чтобы контент при скролле не просвечивал
        backgroundColor: '#f8fafc', 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)' // Safe area для iPhone
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
