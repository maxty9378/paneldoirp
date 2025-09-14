import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { SidebarToggleButton } from './SidebarToggleButton';
import { Header } from './Header';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  Calendar, 
  Menu,
  X,
  Bell
} from 'lucide-react';
import { clsx } from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
}

export function Layout({ children, currentView, testTitle }: LayoutProps & { testTitle?: string }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((v) => !v);
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Отслеживание скролла для эффектов
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Закрытие мобильного меню при изменении маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Управление скроллом body при открытии мобильного меню
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }

    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Проверяем, находимся ли мы на странице теста
  const isTestPage = currentView === 'take-test';

  // Теперь Sidebar будет использовать navigate для перехода по роутам
  const handleMenuItemClick = (itemId: string) => {
    switch (itemId) {
      case 'dashboard': navigate('/'); break;
      case 'events': navigate('/events'); break;
      case 'tests': navigate('/testing'); break;
      case 'calendar': navigate('/calendar'); break;
      case 'employees': navigate('/employees'); break;
      case 'representatives': navigate('/representatives'); break;
      case 'supervisors': navigate('/supervisors'); break;
      case 'expert-events': navigate('/expert-events'); break;
      case 'exam-management': navigate('/exam-reserve'); break;
      case 'analytics': navigate('/analytics'); break;
      case 'tasks': navigate('/tasks'); break;
      case 'testing': navigate('/testing'); break;
      case 'admin': navigate('/admin'); break;
      case 'trainer-territories': navigate('/trainer-territories'); break;
      default: navigate('/');
    }
    setIsMobileMenuOpen(false);
  };

  const getPageTitle = (view: string) => {
    if (view === 'take-test' && testTitle) return testTitle;
    switch (view) {
      case 'dashboard': return 'Главная';
      case 'events': return 'Мои мероприятия';
      case 'tests': return 'Тесты';
      case 'testing': return 'Тестирование';
      case 'create-event': return 'Создание мероприятия';
      case 'calendar': return 'Календарь';
      case 'employees': return 'Мои сотрудники';
      case 'representatives': return 'Торговые представители';
      case 'supervisors': return 'Супервайзеры';
      case 'expert-events': return 'Экспертные мероприятия';
      case 'exam-management': return 'Экзамен кадрового резерва';
      case 'analytics': return 'Аналитика';
      case 'tasks': return 'Горящие задачи';
      case 'admin': return 'Администрирование';
      case 'trainer-territories': return 'Филиалы тренеров';
      default: return 'SNS Learning';
    }
  };

  // Если это страница теста на мобильном, показываем только контент без шапки и сайдбара
  if (isTestPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* На мобильных устройствах скрываем шапку и сайдбар */}
        <div className="lg:hidden px-4 pt-4 pb-safe-bottom">
          {children}
        </div>
        
        {/* На десктопе показываем обычный layout */}
        <div className="hidden lg:flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Desktop sidebar */}
          <div className="relative flex-shrink-0">
            <Sidebar 
              activeItem={currentView} 
              onItemClick={handleMenuItemClick}
              isCollapsed={isSidebarCollapsed}
              onToggle={toggleSidebar}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />
            <main className={clsx(
                "flex-1 overflow-auto pt-20 transition-all duration-300",
                isSidebarCollapsed ? "lg:ml-20" : "lg:ml-80"
              )}>
              <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Mobile menu overlay с улучшенной анимацией */}
      <div className={clsx(
        'fixed inset-0 flex z-50 lg:hidden transition-all duration-300',
        isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
      )}>
        {/* Backdrop */}
        <div 
          className={clsx(
            'fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          )} 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
        
        {/* Sidebar container */}
        <div className={clsx(
          'relative flex-1 flex flex-col max-w-xs w-full transform transition-transform duration-300 ease-out h-full',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <Sidebar 
            activeItem={currentView} 
            onItemClick={handleMenuItemClick}
            isMobile={true}
            onMobileClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="relative hidden lg:flex lg:flex-shrink-0">
        <Sidebar 
          activeItem={currentView} 
          onItemClick={handleMenuItemClick}
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMobileMenuToggle={() => setIsMobileMenuOpen(true)} />
        <main className={clsx(
            "flex-1 overflow-auto transition-all duration-300",
            // Отступы для мобильной версии
            "pt-16 lg:pt-20",
            // Отступы для десктопной версии
            isSidebarCollapsed ? "lg:ml-20" : "lg:ml-80"
          )}>
          <div className="py-4 sm:py-6 pb-safe-bottom">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>


    </div>
  );
}