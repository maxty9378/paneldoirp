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
}

const MobileExamNavigation: React.FC<MobileExamNavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  participantsCount = 0,
  evaluationsCount = 0 
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
      label: 'Досье',
      count: 0 // Убираем счетчик для Досье
    },
    {
      id: 'schedule' as const,
      icon: Calendar,
      label: 'Расписание',
      count: 0
    },
    {
      id: 'evaluations' as const,
      icon: Star,
      label: 'Оценка',
      count: evaluationsCount
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
          borderRadius: '20px',
          padding: '8px 12px 12px 12px',
          boxSizing: 'border-box',
          maxWidth: '450px',
          width: '100%',
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(6, 164, 120, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: '4px',
            minWidth: 0
          }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  padding: '5px 2px',
                  borderRadius: '16px',
                  background: isActive ? '#06A478' : 'transparent',
                  border: 'none',
                  color: isActive ? '#ffffff' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: 0
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 2
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
                  fontSize: '9px',
                  fontWeight: 500,
                  lineHeight: '1.1',
                  position: 'relative',
                  zIndex: 2,
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

  // Рендерим через портал в body только на мобильных устройствах
  if (!isMobile) return null;
  
  return createPortal(mobileNav, document.body);
};

export default MobileExamNavigation;
