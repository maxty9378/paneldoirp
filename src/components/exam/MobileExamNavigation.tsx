import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, Calendar, Star } from 'lucide-react';
import './MobileExamNavigation.css';

type ExamTab = 'participants' | 'schedule' | 'evaluations';

interface MobileExamNavigationProps {
  activeTab: ExamTab;
  onTabChange: (tab: ExamTab) => void;
  participantsCount?: number; // Опциональный параметр
  evaluationsCount?: number;
  isHidden?: boolean; // Новый пропс для скрытия меню
}

const MobileExamNavigation: React.FC<MobileExamNavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  participantsCount = 0,
  evaluationsCount = 0,
  isHidden = false
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkDevice();
    
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkDevice, 100);
    });

    return () => {
      window.removeEventListener('resize', checkDevice);
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
    }
  ];

  const mobileNav = (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      zIndex: 2147483647,
      display: 'flex',
      justifyContent: 'center',
      padding: 'max(16px, env(safe-area-inset-bottom, 16px)) 16px 16px 16px'
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
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(30px) saturate(120%)',
          WebkitBackdropFilter: 'blur(30px) saturate(120%)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden'
        }}
      >
        {/* Глянцевый эффект */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '40%',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%)',
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
                onClick={() => onTabChange(item.id)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
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
                  backgroundColor: isActive ? '#06A478' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isActive ? '0 2px 8px rgba(6, 164, 120, 0.3)' : 'none',
                  border: 'none',
                  color: isActive ? '#ffffff' : '#374151',
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
  );

  // Рендерим через портал в body только на мобильных устройствах и когда не скрыто
  if (!isMobile || isHidden) return null;
  
  return createPortal(mobileNav, document.body);
};

export default MobileExamNavigation;
