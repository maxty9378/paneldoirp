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
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',       // вместо position: fixed + inset: 0
      width: '100vw',
      background: '#f8fafc'
    }}>
      
      {/* 1. ОБЛАСТЬ КОНТЕНТА (СКРОЛЛИТСЯ) */}
      <main style={{
        flex: '1 1 0%',
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        // 64 (высота меню) + 16 (верхний паддинг футера) + 16 (нижний паддинг футера) + safe-area
        paddingBottom: 'calc(64px + 16px + 16px + env(safe-area-inset-bottom, 0px))'
      }}>
        {/* React Router будет рендерить здесь нужную страницу (ExpertExamPage и т.д.) */}
        <Outlet context={{ setIsNavHidden }} />
      </main>

      {/* 2. ОБЛАСТЬ НАВИГАЦИИ (ФИКСИРОВАНА) - только на мобильных */}
      {isMobile && (
        <footer style={{
          flexShrink: 0,
          position: 'relative',
          width: '100%',
          backgroundColor: '#f8fafc',
          height: '64px',
          padding: '8px 0',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))'
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
