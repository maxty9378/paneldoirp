import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MobileExamNavigation from '../exam/MobileExamNavigation';
import { useAuth } from '../../hooks/useAuth';

// Тип для события состояния модального окна
interface ModalStateChangeEvent extends CustomEvent {
  detail: {
    isOpen: boolean;
  };
}

interface MobileMenuStateChangeEvent extends CustomEvent {
  detail: {
    isOpen: boolean;
  };
}

// Определяем, какая вкладка активна, на основе текущего URL
const getActiveTabFromPathname = (pathname: string) => {
  if (pathname.includes('/schedule')) return 'schedule';
  if (pathname.includes('/evaluations')) return 'evaluations';
  if (pathname.includes('/results')) return 'results';
  return 'participants'; // По умолчанию
};

const MobileLayout: React.FC = () => {
  // Состояние для скрытия меню (например, при открытии модалок)
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const activeTab = getActiveTabFromPathname(location.pathname);

  // Проверяем, находимся ли мы на страницах оценки или досье (где нужно скрыть меню)
  const isEvaluationOrDossierPage = location.pathname.includes('/case-evaluation/') || 
                                   location.pathname.includes('/evaluations') ||
                                   (location.pathname.includes('/expert-exam/') && 
                                    (location.pathname.includes('/evaluations') || 
                                     location.pathname.includes('/dossiers')));

  // Слушаем события о состоянии модальных окон
  useEffect(() => {
    const handleModalStateChange = (event: ModalStateChangeEvent) => {
      setIsModalOpen(event.detail.isOpen);
    };

    window.addEventListener('modalStateChange', handleModalStateChange as EventListener);
    
    return () => {
      window.removeEventListener('modalStateChange', handleModalStateChange as EventListener);
    };
  }, []);

  // Слушаем события о состоянии мобильного меню
  useEffect(() => {
    const handleMobileMenuStateChange = (event: MobileMenuStateChangeEvent) => {
      setIsMobileMenuOpen(event.detail.isOpen);
    };

    window.addEventListener('mobileMenuStateChange', handleMobileMenuStateChange as EventListener);
    
    return () => {
      window.removeEventListener('mobileMenuStateChange', handleMobileMenuStateChange as EventListener);
    };
  }, []);

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

  // Управляем overflow body для App Shell архитектуры (стабильно, без переключений)
  useEffect(() => {
    if (!isMobile) return;
    
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehaviorY = 'none';
    // iPhone-специфичные стили
    (document.body.style as any).WebkitOverflowScrolling = 'touch';
    // без position: fixed, пусть скроллится ваш <main>

    // Cleanup при размонтировании
    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehaviorY = '';
      (document.body.style as any).WebkitOverflowScrolling = '';
    };
  }, [isMobile]);

  // Функция для изменения вкладки через URL
  const handleTabChange = (tab: 'participants' | 'schedule' | 'evaluations' | 'results') => {
    const base = location.pathname.replace(/\/(schedule|evaluations|results)$/, '');
    if (tab === 'participants') {
      navigate(base, { replace: false });
    } else if (tab === 'results') {
      // Для результатов открываем модальное окно
      window.dispatchEvent(new CustomEvent('openEvaluationResults'));
    } else {
      navigate(`${base}/${tab}`, { replace: false });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100svh',
      width: '100vw',
      background: '#f8fafc',
      // Учитываем все safe zone для iPhone с вырезами
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)'
    }}>
      
      {/* 1. ОБЛАСТЬ КОНТЕНТА (СКРОЛЛИТСЯ) */}
      <main style={{
        flex: '1 1 0%',
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        // Фиксированная высота для предсказуемости
        // Если на странице оценки/досье, убираем отступ для нижнего меню
        paddingBottom: isEvaluationOrDossierPage 
          ? '16px'
          : '80px'
      }}>
        {/* React Router будет рендерить здесь нужную страницу (ExpertExamPage и т.д.) */}
        <Outlet context={{ setIsNavHidden }} />
      </main>

      {/* 2. ОБЛАСТЬ НАВИГАЦИИ (ФИКСИРОВАНА) - только на мобильных и не на страницах оценки/досье */}
      {isMobile && !isEvaluationOrDossierPage && !isModalOpen && !isMobileMenuOpen && (
        <footer
          style={{
            // ДЕЛАЕМ ФИКСИРОВАННЫМ, чтобы быть НАД браузерным UI
            position: 'fixed',
            left: 'env(safe-area-inset-left, 0px)',
            right: 'env(safe-area-inset-right, 0px)',
            bottom: '16px',
            zIndex: 1000,               // ниже модальных окон
            backgroundColor: 'transparent',
            // геометрия футера
            height: '64px',
            paddingTop: 8,
            paddingBottom: 8
          }}
        >
          <MobileExamNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isHidden={isNavHidden}
            userRole={userProfile?.role}
          />
        </footer>
      )}
    </div>
  );
};

export default MobileLayout;
