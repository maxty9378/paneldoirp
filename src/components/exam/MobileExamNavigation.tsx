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
  const [hasModalOpen, setHasModalOpen] = useState(false);

  // Функция для проверки наличия модальных окон на странице
  const checkForModals = () => {
    // Проверяем различные селекторы модальных окон
    const modalSelectors = [
      '[role="dialog"]',
      '.modal',
      '.modal-open',
      '[data-modal="true"]',
      '.fixed.inset-0', // Полноэкранные модальные окна
      '.case-evaluation-modal',
      '.dossier-modal',
      '.evaluation-stage-modal',
      '.project-defense-modal',
      '.diagnostic-game-modal'
    ];
    
    let modalFound = false;
    
    for (const selector of modalSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const style = window.getComputedStyle(element);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0' &&
                         element.offsetParent !== null;
        
        if (isVisible) {
          console.log('Modal found via selector:', selector, element, {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            offsetParent: element.offsetParent
          });
          modalFound = true;
          break;
        }
      }
      if (modalFound) break;
    }
    
    // Дополнительная проверка: ищем элементы с высоким z-index
    if (!modalFound) {
      const highZIndexElements = document.querySelectorAll('*');
      for (const element of highZIndexElements) {
        const style = window.getComputedStyle(element);
        const zIndex = parseInt(style.zIndex, 10);
        if (zIndex > 1000 && style.position !== 'static' && element.offsetParent !== null) {
          // Проверяем, не является ли это нашим меню
          if (!element.closest('.mobile-exam-nav') && !element.classList.contains('mobile-exam-nav')) {
            console.log('Modal found via z-index:', element, 'z-index:', zIndex);
            modalFound = true;
            break;
          }
        }
      }
    }
    
    // Дополнительная проверка: ищем элементы с классом modal-open на body
    if (!modalFound && document.body.classList.contains('modal-open')) {
      console.log('Modal found via body.modal-open class');
      modalFound = true;
    }
    
    // Дополнительная отладочная информация
    if (!modalFound) {
      console.log('No modals found. Checking all modal elements:');
      for (const selector of modalSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector ${selector}:`, elements.length, 'elements found');
        elements.forEach((el, index) => {
          const style = window.getComputedStyle(el);
          console.log(`  Element ${index}:`, {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            offsetParent: el.offsetParent,
            classList: el.classList.toString(),
            zIndex: style.zIndex,
            position: style.position
          });
        });
      }
      
      // Дополнительная проверка: ищем все элементы с высоким z-index
      console.log('Checking all high z-index elements:');
      const allElements = document.querySelectorAll('*');
      const highZElements = Array.from(allElements).filter(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex, 10);
        return zIndex > 1000 && style.position !== 'static';
      });
      
      console.log('High z-index elements found:', highZElements.length);
      highZElements.forEach((el, index) => {
        const style = window.getComputedStyle(el);
        console.log(`  High z-index element ${index}:`, {
          tagName: el.tagName,
          classList: el.classList.toString(),
          zIndex: style.zIndex,
          position: style.position,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          offsetParent: el.offsetParent
        });
      });
    }
    
    setHasModalOpen(modalFound);
  };

  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };

    checkDevice();
    
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkDevice, 200); // Увеличиваем задержку для стабильности
    });

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Проверяем наличие модальных окон периодически
  useEffect(() => {
    if (!isMobile) return;

    // Проверяем сразу
    checkForModals();
    
    // Устанавливаем интервал для периодической проверки
    const interval = setInterval(checkForModals, 100);
    
    // Также слушаем изменения DOM
    const observer = new MutationObserver(checkForModals);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-modal']
    });
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [isMobile]);

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

  // Определяем, должно ли меню быть скрыто
  const shouldHide = isHidden || hasModalOpen;
  
  // Отладочная информация
  console.log('MobileExamNavigation render:', { 
    isMobile, 
    isHidden, 
    hasModalOpen,
    shouldHide,
    activeTab, 
    willRender: isMobile && !shouldHide,
    modalElements: document.querySelectorAll('[role="dialog"], .modal, .dossier-modal, .case-evaluation-modal, .evaluation-stage-modal, .project-defense-modal, .diagnostic-game-modal').length
  });
  
  // Рендерим через портал в body только на мобильных устройствах и когда не скрыто
  if (!isMobile || shouldHide) return null;
  
  return createPortal(
    <>
      {mobileNav}
      
      {/* Отладочная информация для меню */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '120px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '10px',
          zIndex: 9999,
          maxWidth: '200px'
        }}>
          <div>Menu Auto-Hide Debug:</div>
          <div>isMobile: {isMobile.toString()}</div>
          <div>isHidden: {isHidden.toString()}</div>
          <div>hasModalOpen: {hasModalOpen.toString()}</div>
          <div>shouldHide: {shouldHide.toString()}</div>
          <div>Modal elements: {document.querySelectorAll('[role="dialog"], .modal, .dossier-modal, .case-evaluation-modal, .evaluation-stage-modal, .project-defense-modal, .diagnostic-game-modal').length}</div>
        </div>
      )}
    </>, 
    document.body
  );
};

export default MobileExamNavigation;
