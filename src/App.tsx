import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage/LoginPage';
import { hasCachedUsers } from './lib/userCache';
import { CreateEventModal } from './components/events/CreateEventModal';
// Импорт CreateEventPage только один раз — для других роутов, если нужно (но для модалки он не юзается)
import CreateEventPage from './pages/CreateEventPage';
import { DashboardView } from './components/DashboardView';
import { AdminView } from './components/AdminView';
import { EventsView } from './components/EventsView';
import EmployeesView from './components/EmployeesView';
import EventDetailView from './components/EventDetailView';
import { CalendarView } from './components/CalendarView';
import { RepresentativesView } from './components/RepresentativesView';
import { SupervisorsView } from './components/SupervisorsView';
import { ExpertEventsView } from './components/ExpertEventsView';
import { TasksView } from './components/TasksView'; 
import { TestingView } from './components/admin/TestingView';
import { TrainerTerritoriesView } from './components/TrainerTerritoriesView';
import { ExamReservePage, ExamDetailsPage, ExpertExamPage } from './components/exam';
import CaseEvaluationPage from './components/exam/CaseEvaluationPage';
import ExpertSchedulePage from './components/exam/ExpertSchedulePage';
import ExpertRouteGuard from './components/ExpertRouteGuard';
import MobileLayout from './components/layout/MobileLayout';
import { RefreshCw, OctagonAlert as AlertOctagon } from 'lucide-react';
import TakeTestPage from './pages/TakeTestPage';
import TestResultsPage from './pages/TestResultsPage';
import EventTestResultsPage from './pages/EventTestResultsPage';
import EventTestReviewPage from './pages/EventTestReviewPage';
import EventTPEvaluation from './pages/EventTPEvaluation';
import AuthCallback from './pages/AuthCallback';
import QRAuthPage from './pages/QRAuthPage';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Spinner } from './components/ui/Spinner';
import { initNetworkDiagnostics } from './utils/networkDiagnostics';

function EventDetailPage({ onStartTest }: { onStartTest: (testId: string, eventId: string, attemptId: string) => void }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  if (!eventId) return <div>Некорректный ID мероприятия</div>;
  
  const handleBack = () => {
    navigate('/events');
  };
  
  return <EventDetailView eventId={eventId} onStartTest={onStartTest} onBack={handleBack} />;
}

function AppContent() {
  const { 
    user, 
    userProfile,
    loading, 
    resetAuth, 
    authError, 
    loadingPhase,
    retryFetchProfile
  } = useAuth();

  // Инициализируем диагностику сети
  useEffect(() => {
    initNetworkDiagnostics();
  }, []);
  const [showEventModal, setShowEventModal] = useState(false); // Состояние для модалки создания/редактирования события
  const [showQuickLoginOnLogout, setShowQuickLoginOnLogout] = useState(false);
  const navigate = useNavigate();

  // Логика для показа глобального оверлея - упрощенная
  const isAuthFlow = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/');
  const isExpertQR = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/qr');
  const showOverlay =
    isAuthFlow ||
    (loadingPhase === 'initializing') ||
    (loadingPhase === 'session-fetch') ||
    (loadingPhase === 'auth-change');

  // Показываем модальное окно быстрого входа при разлогинивании, если есть сохраненные пользователи
  useEffect(() => {
    if (!user && !loading && hasCachedUsers() && !isAuthFlow) {
      // Небольшая задержка, чтобы пользователь увидел, что он разлогинился
      const timer = setTimeout(() => {
        setShowQuickLoginOnLogout(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setShowQuickLoginOnLogout(false);
    }
  }, [user, loading, isAuthFlow]);

  // Проверяем auth параметры и перенаправляем на callback
  useEffect(() => {
    console.log('🔄 App: Checking auth params');
    const { hash, search, pathname } = window.location;
    console.log('🔄 App: Current URL:', window.location.href);
    console.log('🔄 App: Pathname:', pathname);
    console.log('🔄 App: Search:', search);
    console.log('🔄 App: Hash:', hash);

    const hasPKCE = search.includes('code=');
    const hasHashTokens = hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('token=');
    const hasSearchMagic = search.includes('token=') && search.includes('type=magiclink');
    const hasIPhoneAuth = search.includes('auth=success') && search.includes('user=') && search.includes('token=');

    console.log('🔄 App: hasPKCE:', hasPKCE);
    console.log('🔄 App: hasHashTokens:', hasHashTokens);
    console.log('🔄 App: hasSearchMagic:', hasSearchMagic);
    console.log('🔄 App: hasIPhoneAuth:', hasIPhoneAuth);

    // Если мы уже на /auth/callback, не делаем редирект
    if (pathname === '/auth/callback') {
      console.log('ℹ️ Already on /auth/callback, skipping redirect');
      return;
    }

    // Если есть auth параметры, но пользователь уже авторизован, просто очищаем URL
    if (user && (hasPKCE || hasHashTokens || hasSearchMagic || hasIPhoneAuth)) {
      console.log('✅ App: User already authenticated, cleaning URL without redirect');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      return;
    }

    // Специальная обработка iPhone авторизации
    if (hasIPhoneAuth) {
      console.log('🍎 iPhone auth detected, redirecting to callback...');
      const urlParams = new URLSearchParams(search);
      const userId = urlParams.get('user');
      const qrToken = urlParams.get('token');
      
      if (userId && qrToken) {
        // Перенаправляем на callback с фиктивными токенами для iPhone
        console.log('🍎 iPhone: Redirecting to callback with mock tokens');
        const mockCallbackUrl = `/auth/callback?token=iphone_${qrToken}&type=magiclink&redirect_to=http://51.250.94.103/`;
        window.location.replace(mockCallbackUrl);
        return;
      }
      
      // Если что-то пошло не так, очищаем URL и показываем форму входа
      console.log('🍎 iPhone: Clearing URL and showing login form');
      window.history.replaceState({}, '', '/');
      return;
    }

    // Если есть auth параметры и мы не на callback, перенаправляем
    if ((hasPKCE || hasHashTokens || hasSearchMagic) && pathname !== '/auth/callback') {
      const suffix = hasPKCE ? search : hash || search;
      console.log('🔄 Auth params detected, redirecting to /auth/callback...');
      console.log('🔄 App: Redirecting to:', '/auth/callback' + suffix);
      window.location.replace('/auth/callback' + suffix);
    } else {
      console.log('ℹ️ No magic link tokens found');
    }

    // Проверяем сохраненную сессию при загрузке
    const checkStoredSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          console.log('✅ Found stored session:', session.user.email);
        } else {
          console.log('ℹ️ No stored session found');
        }
      } catch (error) {
        console.error('❌ Error checking stored session:', error);
      }
    };

    checkStoredSession();
  }, [user]); // Добавляем user в зависимости
  
  const [editingEvent, setEditingEvent] = useState<any>(null); // Состояние для редактируемого события (null для создания)
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const location = useLocation();
  const isAuthCallback = location.pathname === '/auth/callback';

  // ⚠️ Никаких экранов загрузки/логина для AuthCallback — просто отдаём коллбек
  if (isAuthCallback) {
    return <AuthCallback />;
  }

  // ⚠️ Разрешаем QR авторизацию без проверки loading/user
  const isQRAuth = location.pathname.startsWith('/auth/qr/');
  if (isQRAuth) {
    return (
      <Routes>
        <Route path="/auth/qr/:token" element={<QRAuthPage />} />
      </Routes>
    );
  }

  // Для Layout: определяем текущий view по location.pathname
  const getCurrentView = () => {
    if (location.pathname.startsWith('/take-test')) return 'take-test';
    if (location.pathname.startsWith('/test-results/')) return 'take-test';
    if (location.pathname.startsWith('/events')) return 'events';
    if (location.pathname.startsWith('/event/')) return 'event-detail';
    if (location.pathname.startsWith('/calendar')) return 'calendar';
    if (location.pathname.startsWith('/representatives')) return 'representatives';
    if (location.pathname.startsWith('/supervisors')) return 'supervisors';
    if (location.pathname.startsWith('/expert-events')) return 'expert-events';
    if (location.pathname.startsWith('/tasks')) return 'tasks';
    if (location.pathname.startsWith('/testing')) return 'tests';
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/employees')) return 'employees';
    if (location.pathname.startsWith('/exam-management')) return 'exam-reserve';
    if (location.pathname.startsWith('/exam-reserve')) return 'exam-reserve';
    if (location.pathname.startsWith('/expert-schedule')) return 'schedule';
    return 'dashboard';
  };
  const currentView = getCurrentView();

  // Новый обработчик запуска теста
  const handleStartTest = (testId: string, eventId: string, attemptId?: string) => {
    console.log('🚀 App handleStartTest вызвана с параметрами:', { testId, eventId, attemptId });
    
    const params = new URLSearchParams({
      eventId: eventId,
      testId: testId
    });
    if (attemptId) {
      params.append('attemptId', attemptId);
    }
    
    const url = `/take-test?${params.toString()}`;
    console.log('🧭 Перенаправляем на:', url);
    navigate(url);
  };

  // Обработчик для редактирования события — загружает данные и открывает модалку
  const handleEditEvent = async (eventId: string) => {
    console.log('handleEditEvent вызвана с eventId:', eventId);
    try {
      // Загружаем данные мероприятия
      const { data: event, error } = await supabase
        .from('events')
        .select(`
          *,
          event_types (*),
          creator:creator_id(
            id,
            full_name,
            email,
            avatar_url
          ),
          event_participants (
            user_id,
            users (
              id,
              full_name,
              email,
              sap_number
            )
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Ошибка загрузки мероприятия:', error);
        return;
      }

      console.log('Загруженные данные мероприятия:', event);
      setEditingEvent(event); // Устанавливаем событие для редактирования
      setShowEventModal(true); // Открываем модалку
    } catch (error) {
      console.error('Ошибка при редактировании мероприятия:', error);
    }
  };

  // Функция для открытия модалки создания (null для editingEvent значит — новое событие)
  const handleCreateEvent = () => {
    setEditingEvent(null); // Сброс для чистого создания
    setShowEventModal(true); // Открываем модалку
  };

  // Track loading time
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setInterval(() => {
        setLoadingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setLoadingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        {/* Фон в стиле Apple 2025 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50" />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-400/20 via-cyan-300/20 to-teal-400/20 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-300/20 via-green-400/20 to-lime-300/20 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_50%)]" />
        </div>

        <div className="relative z-10 bg-white/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/50 max-w-md mx-auto">
          <div className="text-center">
            <Spinner size={48} className="mx-auto mb-6" label="Загружаем" />

            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Загрузка приложения</h2>
            <p className="text-gray-600 mb-4">
              {loadingPhase === 'initializing' && 'Инициализация...'}
              {loadingPhase === 'session-fetch' && 'Проверка сессии...'}
              {loadingPhase === 'profile-fetch' && 'Загрузка профиля...'}
              {loadingPhase === 'auth-change' && 'Обработка авторизации...'}
              {!['initializing', 'session-fetch', 'profile-fetch', 'auth-change'].includes(loadingPhase) && 'Подготовка интерфейса...'}
            </p>

            {loadingSeconds > 3 && (
              <p className="text-sm text-gray-500 mb-4">
                Время загрузки: {loadingSeconds} сек.
              </p>
            )}

            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left">
                <div className="flex items-start">
                  <AlertOctagon className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium text-sm">Ошибка загрузки</p>
                    <p className="text-red-700 text-sm mt-1">{authError}</p>
                  </div>
                </div>
              </div>
            )}

            {loadingSeconds > 5 && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {authError && retryFetchProfile && (
                  <button
                    onClick={retryFetchProfile}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Повторить попытку
                  </button>
                )}
                <button
                  onClick={resetAuth}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  🧹 Очистить кэш и сбросить
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    // Пока идёт auth-флоу или ранняя инициализация — форму вообще не показываем
    if (isAuthFlow || loadingPhase === 'initializing' || loadingPhase === 'session-fetch' || loadingPhase === 'auth-change') {
      return null; // оверлей уже показан глобально
    }
    return <LoginPage />;
  }

  // Фикс роута /events: передаем onCreateEvent как handleCreateEvent (открывает модалку вместо navigate)
  // onEditEvent остается handleEditEvent, onNavigateToEvent — как было
  return (
    <>
      <LoadingOverlay
        visible={showOverlay}
        title={isExpertQR ? 'Вход эксперта' : 'Подтверждаем вход…'}
        subtitle={isExpertQR ? 'Сверяем QR-токен и подгружаем доступы' : 'Идёт проверка токена и загрузка профиля'}
      />
      <Layout currentView={currentView}>
        <Routes>
          <Route path="/" element={<DashboardView />} />
          {/* Роут /events: теперь onCreateEvent открывает модалку, а не пейдж */}
          <Route 
            path="/events" 
            element={
              <EventsView 
                onNavigateToEvent={id => {
                  // Для экспертов все мероприятия ведут на страницу эксперта
                  if (userProfile?.role === 'expert') {
                    navigate('/expert-exam/36520f72-c191-4e32-ba02-aa17c482c50b');
                  } else {
                    // Для администраторов и других ролей ведем на обычную страницу мероприятия
                    // Логика для экзаменов резерва талантов будет обработана в EventCard
                    navigate(`/event/${id}`);
                  }
                }} 
                onEditEvent={id => handleEditEvent(id)} 
                onCreateEvent={handleCreateEvent} // <- Фикс: теперь открывает модалку для создания
              />} 
          />
          {/* Убрали роут /create-event полностью — создание только через модалку (фикс #15) */}
          <Route path="/event/:eventId" element={<EventDetailPage onStartTest={handleStartTest} />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/representatives" element={<RepresentativesView />} />
          <Route path="/supervisors" element={<SupervisorsView />} />
          <Route path="/expert-events" element={<ExpertEventsView />} />
          <Route path="/tasks" element={<TasksView />} />
          <Route path="/testing" element={<TestingView />} />
          <Route path="/trainer-territories" element={<TrainerTerritoriesView />} />
          <Route path="/admin" element={<AdminView />} />
          <Route path="/employees" element={<EmployeesView />} />
          <Route path="/exam-reserve" element={<ExamReservePage />} />
          <Route path="/exam-details/:id" element={<ExamDetailsPage />} />
          <Route path="/expert-schedule" element={<ExpertSchedulePage />} />
          
          {/* Роуты с мобильным меню */}
          <Route element={<MobileLayout />}>
            <Route path="/expert-exam/:id" element={
              <ExpertRouteGuard>
                <ExpertExamPage />
              </ExpertRouteGuard>
            } />
            <Route path="/expert-exam/:id/schedule" element={
              <ExpertRouteGuard>
                <ExpertExamPage />
              </ExpertRouteGuard>
            } />
            <Route path="/expert-exam/:id/evaluations" element={
              <ExpertRouteGuard>
                <ExpertExamPage />
              </ExpertRouteGuard>
            } />
            <Route path="/case-evaluation/:examId" element={
              <ExpertRouteGuard>
                <CaseEvaluationPage />
              </ExpertRouteGuard>
            } />
          </Route>
          <Route path="/take-test" element={<TakeTestPage />} />
          <Route path="/test-results/:attemptId" element={<TestResultsPage />} />
          <Route path="/event-test-results/:eventId" element={<EventTestResultsPage />} />
          <Route path="/event-test-review/:eventId" element={<EventTestReviewPage />} />
          <Route path="/event-tp-evaluation/:eventId" element={<EventTPEvaluation />} />
          <Route path="/auth/qr/:token" element={<QRAuthPage />} />
        </Routes>
        
        {/* Модалка для создания/редактирования события — теперь основной способ (фикс #15) */}
        <CreateEventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null); // Сброс editingEvent при закрытии
          }}
          onSuccess={() => {
            setShowEventModal(false);
            setEditingEvent(null); // Сброс после успеха
            navigate('/events'); // Редирект на список событий
          }}
          editingEvent={editingEvent} // null для создания, объект для редактирования
        />
        
        {/* Модальное окно быстрого входа при разлогинивании */}
        {showQuickLoginOnLogout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-bold">👋</span>
                    </div>
                    <h3 className="text-lg font-semibold">Быстрый вход</h3>
                  </div>
                  <button
                    onClick={() => setShowQuickLoginOnLogout(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">
                    Вы вышли из системы. Хотите войти снова?
                  </p>
                  <p className="text-sm text-gray-500">
                    Выберите аккаунт для быстрого входа или войдите заново
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowQuickLoginOnLogout(false);
                      // Показываем модальное окно быстрого входа из LoginForm
                      const quickLoginBtn = document.querySelector('[data-quick-login]') as HTMLButtonElement;
                      if (quickLoginBtn) {
                        quickLoginBtn.click();
                      }
                    }}
                    className="w-full flex items-center justify-center px-4 py-3 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors shadow-sm hover:shadow-md"
                  >
                    <span className="mr-2">⚡</span>
                    Выбрать из сохраненных
                  </button>

                  <button
                    onClick={() => setShowQuickLoginOnLogout(false)}
                    className="w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Войти заново
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;