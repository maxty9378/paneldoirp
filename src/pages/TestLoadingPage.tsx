import { useState } from 'react';
import { AppleSpinner, AppleLoadingScreen } from '../components/AppleSpinner';
import { UnifiedLoader } from '../components/UnifiedLoader';
import { useLoadingState } from '../hooks/useLoadingState';

export default function TestLoadingPage() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showInline, setShowInline] = useState(false);
  const [showMinimal, setShowMinimal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('initializing');
  const [error, setError] = useState<string | null>(null);

  const loadingState = useLoadingState({
    maxConcurrentLoads: 1,
    debounceMs: 100
  });

  const phases = [
    'initializing',
    'session-fetch', 
    'profile-fetch',
    'auth-change',
    'profile-processing',
    'complete',
    'loading-test',
    'processing-answer',
    'saving-progress'
  ];

  const simulateLoading = async (variant: string) => {
    if (variant === 'overlay') {
      setShowOverlay(true);
      setProgress(0);
      setPhase('initializing');
      setError(null);
      
      // Симуляция прогресса
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
        if (i < 100) {
          setPhase(phases[Math.floor(i / 12)]);
        }
      }
      
      setTimeout(() => setShowOverlay(false), 1000);
    } else if (variant === 'fullscreen') {
      setShowFullscreen(true);
      setProgress(0);
      setPhase('initializing');
      setError(null);
      
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
        if (i < 100) {
          setPhase(phases[Math.floor(i / 12)]);
        }
      }
      
      setTimeout(() => setShowFullscreen(false), 1000);
    } else if (variant === 'inline') {
      setShowInline(true);
      setProgress(0);
      setPhase('initializing');
      setError(null);
      
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
        if (i < 100) {
          setPhase(phases[Math.floor(i / 12)]);
        }
      }
      
      setTimeout(() => setShowInline(false), 1000);
    } else if (variant === 'minimal') {
      setShowMinimal(true);
      setTimeout(() => setShowMinimal(false), 3000);
    } else if (variant === 'error') {
      setShowOverlay(true);
      setError('Ошибка подключения к серверу');
      setProgress(45);
      setPhase('error');
    } else if (variant === 'loading-state') {
      loadingState.startLoading('profile-fetch');
      setTimeout(() => {
        loadingState.stopLoading();
      }, 3000);
    } else if (variant === 'enhanced-loading') {
      setShowFullscreen(true);
      setProgress(0);
      setPhase('initializing');
      setError(null);
      
      // Симуляция с разными фазами и подзаголовками
      const phases = [
        { phase: 'initializing', message: 'Инициализация системы', subtitle: 'Подключение к серверу...' },
        { phase: 'session-fetch', message: 'Проверка сессии', subtitle: 'Аутентификация пользователя...' },
        { phase: 'profile-fetch', message: 'Загрузка профиля', subtitle: 'Получение данных профиля...' },
        { phase: 'profile-processing', message: 'Обработка данных', subtitle: 'Подготовка интерфейса...' },
        { phase: 'complete', message: 'Завершение', subtitle: 'Готово к работе!' }
      ];
      
      for (let i = 0; i < phases.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setPhase(phases[i].phase);
        setProgress((i + 1) * 20);
      }
      
      setTimeout(() => setShowFullscreen(false), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center font-['Mabry']">
          Тестовая страница загрузки - Apple стиль 2025
        </h1>

        {/* Демонстрация различных спинеров */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-['Mabry']">Размеры спинеров</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <AppleSpinner size="sm" />
                <span className="text-sm text-gray-600">Small</span>
              </div>
              <div className="flex items-center space-x-3">
                <AppleSpinner size="md" />
                <span className="text-sm text-gray-600">Medium</span>
              </div>
              <div className="flex items-center space-x-3">
                <AppleSpinner size="lg" />
                <span className="text-sm text-gray-600">Large</span>
              </div>
              <div className="flex items-center space-x-3">
                <AppleSpinner size="xl" />
                <span className="text-sm text-gray-600">Extra Large</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-['Mabry']">Цвета спинеров</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <AppleSpinner color="primary" />
                <span className="text-sm text-gray-600">Primary</span>
              </div>
              <div className="flex items-center space-x-3">
                <AppleSpinner color="white" />
                <span className="text-sm text-gray-600">White</span>
              </div>
              <div className="flex items-center space-x-3">
                <AppleSpinner color="gray" />
                <span className="text-sm text-gray-600">Gray</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-['Mabry']">Loading Screen 2025</h3>
            <div className="space-y-6">
              <AppleLoadingScreen 
                message="Загрузка данных..."
                subtitle="Подготавливаем интерфейс"
                progress={75}
                showProgress={true}
                showParticles={true}
              />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-['Mabry']">Minimal Loader</h3>
            <div className="space-y-4">
              <UnifiedLoader 
                visible={showMinimal}
                variant="minimal"
                message="Обработка..."
              />
            </div>
          </div>
        </div>

        {/* Кнопки для тестирования */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => simulateLoading('overlay')}
            className="bg-[#06A478] hover:bg-[#05976b] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            🎭 Overlay Loader
          </button>

          <button
            onClick={() => simulateLoading('fullscreen')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            🖥️ Fullscreen Loader
          </button>

          <button
            onClick={() => simulateLoading('inline')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            📄 Inline Loader
          </button>

          <button
            onClick={() => simulateLoading('minimal')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            ⚡ Minimal Loader
          </button>

          <button
            onClick={() => simulateLoading('error')}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            ❌ Error State
          </button>

          <button
            onClick={() => simulateLoading('loading-state')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            🔄 Loading State Hook
          </button>

          <button
            onClick={() => simulateLoading('enhanced-loading')}
            className="bg-gradient-to-r from-[#06A478] to-[#4ade80] hover:from-[#05976b] hover:to-[#22c55e] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            ✨ Enhanced Loading 2025
          </button>
        </div>

        {/* Демонстрация Inline Loader */}
        {showInline && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 font-['Mabry']">Inline Loader Demo</h3>
            <UnifiedLoader 
              visible={showInline}
              variant="inline"
              phase={phase}
              progress={progress}
              showProgress={true}
              showTimer={true}
            />
          </div>
        )}

        {/* Демонстрация Loading State Hook */}
        {loadingState.isLoading && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 font-['Mabry']">Loading State Hook Demo</h3>
            <div className="flex items-center space-x-4">
              <AppleSpinner size="lg" />
              <div>
                <p className="text-lg font-medium text-gray-800">Фаза: {typeof loadingState.phase === 'string' ? loadingState.phase : 'unknown'}</p>
                <p className="text-sm text-gray-600">Время загрузки: {loadingState.getLoadingDuration()} сек.</p>
                <p className="text-sm text-gray-600">Активных загрузок: {loadingState.activeLoadsCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Демонстрация улучшенного LoadingScreen */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 mb-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6 font-['Mabry']">Улучшенный LoadingScreen 2025</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-700">С частицами и подзаголовком</h4>
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-8">
                <AppleLoadingScreen 
                  message="Инициализация системы"
                  subtitle="Подключение к серверу..."
                  progress={45}
                  showProgress={true}
                  showParticles={true}
                />
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-700">Минималистичный вариант</h4>
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-8">
                <AppleLoadingScreen 
                  message="Обработка запроса"
                  progress={90}
                  showProgress={true}
                  showParticles={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Информация о компонентах */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6 font-['Mabry']">Информация о компонентах</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">AppleSpinner</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Размеры: sm, md, lg, xl</li>
                <li>• Цвета: primary, white, gray</li>
                <li>• Apple-стиль анимации 2025</li>
                <li>• Плавные переходы и эффекты</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">UnifiedLoader</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Варианты: overlay, fullscreen, inline, minimal</li>
                <li>• Поддержка прогресса и фаз</li>
                <li>• Обработка ошибок</li>
                <li>• Автоматическое скрытие</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">useLoadingState</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Предотвращение дублирования</li>
                <li>• Debounce для оптимизации</li>
                <li>• Ограничение одновременных загрузок</li>
                <li>• Автоматический сброс ошибок</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">AppleLoadingScreen 2025</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Множественные анимированные кольца</li>
                <li>• Плавающие частицы и эффекты</li>
                <li>• Современный прогресс-бар с градиентом</li>
                <li>• Поддержка подзаголовков</li>
                <li>• Блестящие эффекты и тени</li>
                <li>• Адаптивный дизайн</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Unified Loaders */}
        <UnifiedLoader 
          visible={showOverlay}
          variant="overlay"
          phase={phase}
          progress={progress}
          showProgress={true}
          showTimer={true}
          error={error}
          onRetry={() => {
            setError(null);
            simulateLoading('overlay');
          }}
          allowCancel={true}
          onCancel={() => setShowOverlay(false)}
        />

        <UnifiedLoader 
          visible={showFullscreen}
          variant="fullscreen"
          phase={phase}
          progress={progress}
          showProgress={true}
          showTimer={true}
          error={error}
          onRetry={() => {
            setError(null);
            simulateLoading('fullscreen');
          }}
          allowCancel={true}
          onCancel={() => setShowFullscreen(false)}
        />
      </div>
    </div>
  );
}
