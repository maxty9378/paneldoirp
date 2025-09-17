import React, { useEffect, useState } from 'react';
import { Users, Calendar, Target } from 'lucide-react';
import './MobileExamNavigation.css';

type ExamTab = 'participants' | 'schedule' | 'evaluations' | 'results';

interface MobileExamNavigationProps {
  activeTab: ExamTab;
  onTabChange: (tab: ExamTab) => void;
  isHidden?: boolean; // Новый пропс для скрытия меню
  userRole?: string; // Роль пользователя для проверки доступа
}

const MobileExamNavigation: React.FC<MobileExamNavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  isHidden = false,
  userRole
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDevice = () => setIsMobile(window.matchMedia('(max-width: 767.98px)').matches);
    const checkDarkMode = () => setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    checkDevice();
    checkDarkMode();
    
    const onOrientation = () => setTimeout(checkDevice, 200);
    const onThemeChange = () => checkDarkMode();
    
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', onOrientation);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onThemeChange);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', onOrientation);
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', onThemeChange);
    };
  }, []);

  const navItems = [
    {
      id: 'participants' as const,
      icon: Users,
      label: 'Оценка',
      count: 0 // Убираем счетчик для Оценки
    },
    {
      id: 'schedule' as const,
      icon: Calendar,
      label: 'Расписание',
      count: 0
    },
    // Показываем "Результаты" только администраторам
    ...(userRole === 'administrator' ? [{
      id: 'results' as const,
      icon: Target,
      label: 'Результаты',
      count: 0
    }] : [])
  ];

  const mobileNav = (
    <div className={`mobile-exam-nav-container ${isHidden ? 'hidden' : 'visible'}`}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px', // Боковые отступы для контейнера
        // Дополнительные отступы для safe zone
        paddingBottom: isHidden ? '0' : 'env(safe-area-inset-bottom, 8px)',
      }}>
      <nav 
        className="mobile-exam-nav"
        style={{ 
          borderRadius: '24px',
          padding: '8px',
          boxSizing: 'border-box',
          maxWidth: '400px',
          width: '100%',
          position: 'relative',
          background: isDarkMode 
            ? 'rgba(17, 24, 39, 0.8)' 
            : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(30px) saturate(120%)',
          WebkitBackdropFilter: 'blur(30px) saturate(120%)',
          border: isDarkMode 
            ? '1px solid rgba(55, 65, 81, 0.3)' 
            : '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: isDarkMode 
            ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
            : '0 4px 16px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden'
          // Убираем transform отсюда, так как он теперь на родительском элементе
        }}
      >
        {/* Глянцевый эффект */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '40%',
          background: isDarkMode 
            ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 70%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%)',
          borderRadius: '24px 24px 0 0',
          pointerEvents: 'none'
        }} />
        
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: '4px',
            minWidth: 0,
            position: 'relative',
            zIndex: 1
          }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.id}
                data-active={isActive}
                onClick={() => onTabChange(item.id)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = isDarkMode 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = isDarkMode 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  } else {
                    // Убеждаемся, что активная кнопка остается корпоративного цвета
                    e.currentTarget.style.backgroundColor = '#06A478';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  padding: '4px 8px',
                  borderRadius: '16px',
                  backgroundColor: isActive 
                    ? '#06A478' 
                    : isDarkMode 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isActive ? '0 2px 8px rgba(6, 164, 120, 0.3)' : 'none',
                  border: 'none',
                  color: isActive 
                    ? '#ffffff' 
                    : isDarkMode 
                      ? '#d1d5db' 
                      : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: 0
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <IconComponent size={18} />
                  {item.count > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: isActive ? '#ffffff' : '#06A478',
                      color: isActive ? '#06A478' : '#ffffff',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      zIndex: 3
                    }}>
                      {item.count}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  lineHeight: '1.2',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  width: '100%',
                  display: 'block',
                  textAlign: 'center'
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      </div>
    </div>
  );

  
  // В App Shell архитектуре рендерим напрямую, без портала
  if (!isMobile) return null;
  
  return mobileNav;
};

export default MobileExamNavigation;
