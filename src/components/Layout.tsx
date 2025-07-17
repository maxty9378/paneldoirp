import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { useNavigate } from 'react-router-dom';
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
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  // Теперь Sidebar будет использовать navigate для перехода по роутам
  const handleMenuItemClick = (itemId: string) => {
    switch (itemId) {
      case 'dashboard': navigate('/'); break;
      case 'events': navigate('/events'); break;
      case 'calendar': navigate('/calendar'); break;
      case 'employees': navigate('/employees'); break;
      case 'representatives': navigate('/representatives'); break;
      case 'supervisors': navigate('/supervisors'); break;
      case 'expert-events': navigate('/expert-events'); break;
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
      case 'create-event': return 'Создание мероприятия';
      case 'calendar': return 'Календарь';
      case 'employees': return 'Мои сотрудники';
      case 'representatives': return 'Торговые представители';
      case 'supervisors': return 'Супервайзеры';
      case 'expert-events': return 'Экспертные мероприятия';
      case 'analytics': return 'Аналитика';
      case 'tasks': return 'Горящие задачи';
      case 'admin': return 'Администрирование';
      case 'trainer-territories': return 'Филиалы тренеров';
      default: return 'SNS Learning';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Mobile menu overlay */}
      <div className={clsx(
        'fixed inset-0 flex z-40 lg:hidden',
        isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
      )}>
        <div className={clsx(
          'fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300',
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
        )} onClick={() => setIsMobileMenuOpen(false)} />
        
        <div className={clsx(
          'relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl transform transition-transform duration-300',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          
          <div className="h-full">
            <Sidebar 
              activeItem={currentView} 
              onItemClick={handleMenuItemClick}
            />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar 
          activeItem={currentView} 
          onItemClick={handleMenuItemClick}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-soft border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              className="p-2 rounded-squircle text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sns-500 transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sns-500 rounded-squircle-sm flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">SNS Learning</span>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-squircle-sm transition-all duration-200">
                <Bell className="h-5 w-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-squircle-sm transition-all duration-200"
                title="Выйти"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex bg-white shadow-soft border-b border-gray-200">
          <div className="flex-1 flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {getPageTitle(currentView)}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-squircle-sm transition-all duration-200">
                <Bell className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-sns-400 to-sns-600 rounded-squircle flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.position}</p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-squircle-sm transition-all duration-200"
                title="Выйти"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}