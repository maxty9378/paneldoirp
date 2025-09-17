import React, { useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTabFromPathname(location.pathname);

  // Определяем, мобильное ли устройство
  useEffect(() => {
    const checkDevice = () => setIsMobile(window.matchMedia('(max-width: 767.98px)').matches);
    checkDevice();
    const onOrientation = () => setTimeout(checkDevice, 200);
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, []);

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
      // Применяем position: fixed только на мобильных устройствах
      ...(isMobile ? {
        position: 'fixed',
        inset: '0',
      } : {
        height: '100vh',
        width: '100vw',
      }),
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
      overflow: isMobile ? 'hidden' : 'auto', // На десктопе разрешаем скролл
    }}>
      
      {/* 1. ОБЛАСТЬ КОНТЕНТА (СКРОЛЛИТСЯ) */}
      <main style={{
        flex: '1 1 auto', // Позволяем расти и сжиматься
        overflowY: isMobile ? 'auto' : 'visible', // На мобильных скролл внутри, на десктопе обычный
        WebkitOverflowScrolling: 'touch', // Плавный скролл на iOS
        // Отступ снизу нужен только на мобильных, чтобы контент не прятался ЗА меню
        paddingBottom: isMobile ? '80px' : '0',
      }}>
        {/* React Router будет рендерить здесь нужную страницу (ExpertExamPage и т.д.) */}
        <Outlet context={{ setIsNavHidden }} />
      </main>

      {/* 2. ОБЛАСТЬ НАВИГАЦИИ (ФИКСИРОВАНА) - только на мобильных */}
      {isMobile && (
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
      )}
    </div>
  );
};

export default MobileLayout;
