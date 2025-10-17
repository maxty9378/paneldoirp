import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Users, Target, User, Star, AlertCircle, RefreshCw, Hash } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
// import DossierCard from './DossierCard';
import { CompactDossierCard } from './CompactDossierCard';
import { DossierModal } from './DossierModal';
import { EvaluationStageModal } from './EvaluationStageModal';
import { ProjectDefenseModal } from './ProjectDefenseModal';
import { DiagnosticGameModal } from './DiagnosticGameModal';
import { PresentationAssignmentModal } from './PresentationAssignmentModal';
import ExpertEvaluationResults from './ExpertEvaluationResults';
import { FloatingActionButton } from '../ui/FloatingActionButton';
import { ScheduleModal } from './ScheduleModal';

interface ExamEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  talent_category_id?: string;
  group_name?: string;
  expert_emails?: string[];
  status: string;
  detailed_schedule?: Array<{
    id?: string;
    startTime?: string;
    endTime?: string;
    time?: string;
    title: string;
    description?: string;
    duration?: string | number;
    type?: string;
    location?: string;
    speaker?: string;
  }>;
  event_types?: {
    name: string;
    name_ru: string;
  };
  talent_category?: {
    name: string;
    name_ru: string;
    color: string;
  };
  creator?: {
    full_name: string;
  };
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    sap_number: string;
    work_experience_days?: number;
    position?: { name: string };
    territory?: { name: string };
  };
  dossier?: {
    id: string;
    photo_url?: string;
    program_name?: string;
    position?: string;
    territory?: string;
    age?: number;
    experience_in_position?: string;
    education?: {
      level?: string;
      institution?: string;
      specialty?: string;
    };
    career_path?: string;
    achievements?: string[];
  };
}

interface Evaluation {
  id?: string;
  exam_event_id: string;
  reservist_id: string;
  evaluator_id: string;
  stage: string;
  scores: { total_score?: number };
  comments: string;
  recommendations?: string;
  created_at?: string;
}

const ExpertExamPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuthBFF();
  const { setIsNavHidden } = useOutletContext<{ setIsNavHidden: (hidden: boolean) => void }>();
  
  const [exam, setExam] = useState<ExamEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Определяем активную вкладку по URL
  const getActiveTabFromUrl = () => {
    if (location.pathname.includes('/schedule')) return 'schedule';
    if (location.pathname.includes('/evaluations')) return 'evaluations';
    return 'participants';
  };
  
  const [activeTab, setActiveTab] = useState<'participants' | 'evaluations' | 'schedule' | 'results'>(getActiveTabFromUrl);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Синхронизируем activeTab с URL
  useEffect(() => {
    const newTab = getActiveTabFromUrl();
    console.log('🔄 Смена вкладки на:', newTab, 'URL:', location.pathname);
    setActiveTab(newTab);
  }, [location.pathname]);

  // Обновляем заголовок в Layout при изменении вкладки
  useEffect(() => {
    const tabTitles = {
      participants: 'Резервисты',
      evaluations: 'Оценки', 
      schedule: 'Расписание',
      results: 'Результаты оценок'
    };
    
    // Сохраняем текущую вкладку в window для Layout
    (window as any).currentExamTab = tabTitles[activeTab];
    
    // Принудительно обновляем Layout
    window.dispatchEvent(new CustomEvent('examTabChanged', { 
      detail: { tab: activeTab, title: tabTitles[activeTab] } 
    }));
  }, [activeTab]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [selectedParticipantForEvaluation, setSelectedParticipantForEvaluation] = useState<Participant | null>(null);
  const [showProjectDefenseModal, setShowProjectDefenseModal] = useState(false);
  const [showDiagnosticGameModal, setShowDiagnosticGameModal] = useState(false);
  const [showEvaluationResults, setShowEvaluationResults] = useState(false);
  const [showPresentationAssignmentModal, setShowPresentationAssignmentModal] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  
  // Вычисляем состояние открытых модалок
  const computedModalOpen = showEvaluationModal || showProjectDefenseModal || showDiagnosticGameModal || showEvaluationResults || showPresentationAssignmentModal || !!selectedParticipantId;
  
  // Отслеживание открытых модальных окон
  useEffect(() => {
    // Обновляем состояние модальных окон
    setIsAnyModalOpen(computedModalOpen);
    
    // Сообщаем родительскому layout, нужно ли скрыть меню
    setIsNavHidden(computedModalOpen);
    
    // Отправляем событие в Layout для скрытия шапки
    window.dispatchEvent(new CustomEvent('modalStateChanged', { 
      detail: { isOpen: computedModalOpen } 
    }));
  }, [computedModalOpen, setIsNavHidden]);

  // Обработчик события для открытия результатов оценок из мобильной навигации
  useEffect(() => {
    const handleOpenEvaluationResults = () => {
      // Открываем результаты только для администраторов
      if (userProfile?.role === 'administrator') {
        setShowEvaluationResults(true);
      }
    };

    window.addEventListener('openEvaluationResults', handleOpenEvaluationResults);
    return () => {
      window.removeEventListener('openEvaluationResults', handleOpenEvaluationResults);
    };
  }, [userProfile?.role]);

  // Сброс скрытия меню на размонтировании
  useEffect(() => {
    return () => setIsNavHidden(false);
  }, [setIsNavHidden]);

  // Определяем тёмную тему
  useEffect(() => {
    const checkDarkMode = () => setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    checkDarkMode();
    
    const onThemeChange = () => checkDarkMode();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onThemeChange);
    
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', onThemeChange);
    };
  }, []);


  
  const [bannerSettings, setBannerSettings] = useState({
    position: 'center bottom',
    showAdminControls: false,
    showVisualEditor: false,
    previewPosition: { x: 50, y: 100 }, // x: 0-100%, y: 0-100%
    isDragging: false
  });

  // Упрощенная загрузка данных экзамена - без проверок доступа
  const fetchExamData = async () => {
    if (!id) return;

    try {
      console.log('🔄 Загружаем данные экзамена для ID:', id);
      setLoading(true);
      
      // Загружаем только необходимые данные экзамена
      const { data: examData, error: examError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          location,
          start_date,
          end_date,
          status,
          created_at,
          detailed_schedule,
          event_types (*),
          talent_category: talent_categories (*)
        `)
        .eq('id', id)
        .single();

      if (examError) throw examError;

      setExam(examData as unknown as ExamEvent);

      // Загружаем участников
      console.log('👥 Загружаем участников...');
      await fetchParticipants();

      // Загружаем оценки эксперта
      console.log('⭐ Загружаем оценки...');
      await fetchEvaluations();

    } catch (err) {
      console.error('Ошибка загрузки данных экзамена:', err);
      setError('Ошибка загрузки данных экзамена');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка участников
  const fetchParticipants = async () => {
    if (!id) return;

    try {
      console.log('🔍 Ищем участников для экзамена:', id);
      
      // Сначала загружаем участников без досье
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          *,
          user: users (
            id,
            full_name,
            email,
            sap_number,
            work_experience_days,
            position: positions (name),
            territory: territories (name)
          )
        `)
        .eq('event_id', id);


      if (participantsError) {
        console.error('❌ Ошибка загрузки участников:', participantsError);
        throw participantsError;
      }
      
      console.log('✅ Найдено участников:', participantsData?.length || 0);
      
      // Теперь загружаем досье для каждого участника отдельно
      const participantsWithDossiers = await Promise.all(
        (participantsData || []).map(async (participant) => {
          try {
            const { data: dossierData, error: dossierError } = await supabase
              .from('participant_dossiers')
              .select('*')
              .eq('user_id', participant.user_id)
              .eq('event_id', id)
              .single();

            if (dossierError && dossierError.code !== 'PGRST116') {
              console.warn(`Ошибка загрузки досье для ${participant.user.full_name}:`, dossierError);
            } else if (dossierError && dossierError.code === 'PGRST116') {
              console.log(`Досье для ${participant.user.full_name} не найдено - это нормально, если досье еще не создано`);
            }

            return {
              ...participant,
              dossier: dossierData || null
            };
          } catch (err) {
            console.warn(`Ошибка загрузки досье для ${participant.user.full_name}:`, err);
            return {
              ...participant,
              dossier: null
            };
          }
        })
      );
      
      console.log('✅ Участники с досье загружены:', participantsWithDossiers.length);
      console.log('🔄 Обновляем состояние participants:', participantsWithDossiers.map(p => p.user.full_name));
      setParticipants(participantsWithDossiers);
    } catch (err) {
      console.error('Ошибка загрузки участников:', err);
    }
  };

  // Загрузка оценок эксперта
  const fetchEvaluations = async () => {
    if (!id || !user?.id) return;

    try {
      console.log('🔍 Ищем оценки для экзамена:', id, 'пользователя:', user.id);
      
      // Загружаем оценки кейсов из case_evaluations
      let query = supabase
        .from('case_evaluations')
        .select('*')
        .eq('exam_event_id', id);

      // Если не администратор, показываем только свои оценки
      if (userProfile?.role !== 'administrator') {
        query = query.eq('evaluator_id', user.id);
      }

      const { data, error } = await query;


      if (error) {
        console.error('❌ Ошибка загрузки оценок:', error);
        throw error;
      }
      
      console.log('✅ Найдено оценок:', data?.length || 0);
      setEvaluations(data || []);
    } catch (err) {
      console.error('Ошибка загрузки оценок кейсов:', err);
    }
  };


  // Сохранение оценки (функция зарезервирована для будущего использования)
  // const saveEvaluation = async (participantId: string, stage: string, score: number, comments: string) => {
  //   if (!id || !user?.id) return;
  //   // Реализация будет добавлена позже
  // };

  // Функции для управления настройками обложки
  const toggleAdminControls = () => {
    setBannerSettings(prev => ({
      ...prev,
      showAdminControls: !prev.showAdminControls
    }));
  };

  const toggleVisualEditor = () => {
    setBannerSettings(prev => ({
      ...prev,
      showVisualEditor: !prev.showVisualEditor
    }));
  };

  const updateBannerPosition = (position: string) => {
    setBannerSettings(prev => ({
      ...prev,
      position,
      previewPosition: parseBannerPosition(position)
    }));
    
    // Сохраняем позицию в базу данных
    saveBannerPosition(position);
  };

  const updatePreviewPosition = (x: number, y: number) => {
    setBannerSettings(prev => ({
      ...prev,
      previewPosition: { x, y }
    }));
  };

  // Функция для парсинга позиции обложки
  const parseBannerPosition = (position: string) => {
    if (position.includes('%')) {
      const [x, y] = position.split(' ').map(p => parseFloat(p.replace('%', '')));
      return { x: x || 50, y: y || 50 };
    }
    
    // Преобразуем именованные позиции в координаты
    const positionMap: { [key: string]: { x: number; y: number } } = {
      'center top': { x: 50, y: 0 },
      'center center': { x: 50, y: 50 },
      'center bottom': { x: 50, y: 100 },
      'left top': { x: 0, y: 0 },
      'left center': { x: 0, y: 50 },
      'left bottom': { x: 0, y: 100 },
      'right top': { x: 100, y: 0 },
      'right center': { x: 100, y: 50 },
      'right bottom': { x: 100, y: 100 }
    };
    
    return positionMap[position] || { x: 50, y: 100 };
  };

  // Функция для сохранения позиции в базу данных
  const saveBannerPosition = async (position: string) => {
    if (!id) return;
    
    try {
      
      // Проверяем, что ID валидный UUID
      if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return;
      }
      
      const { error } = await supabase
        .from('events')
        .update({ banner_position: position })
        .eq('id', id);
      
      if (error) {
        
        // Пробуем альтернативный способ - сохранить в metadata
        const { error: metadataError } = await supabase
          .from('events')
          .update({ 
            metadata: { banner_position: position }
          })
          .eq('id', id);
          
        if (metadataError) {
        } else {
        }
        return;
      }
      
    } catch (err) {
      console.error('Ошибка сохранения позиции обложки:', err);
    }
  };

  // Функция удаления участника из экзамена
  const removeParticipant = async (participantId: string) => {
    if (!id || !participantId) return;
    
    if (!confirm('Вы уверены, что хотите удалить этого участника из экзамена?')) {
      return;
    }
    
    try {
      console.log('🗑️ Удаляем участника из экзамена:', participantId);
      
      const { error, count } = await supabase
        .from('event_participants')
        .delete({ count: 'exact' })
        .eq('event_id', id)
        .eq('user_id', participantId);
      
      if (error) {
        console.error('❌ Ошибка удаления участника:', error);
        alert('Ошибка удаления участника: ' + error.message);
        return;
      }
      
      console.log('✅ Участник успешно удален, удалено записей:', count);
      
      if (count === 0) {
        console.warn('⚠️ Участник не был найден в базе данных');
        alert('Участник не был найден в базе данных');
        return;
      }
      
      // Принудительно обновляем список участников
      console.log('🔄 Обновляем список участников...');
      await fetchParticipants();
      
      // Дополнительно обновляем состояние, если fetchParticipants не сработал
      setParticipants(prev => prev.filter(p => p.user.id !== participantId));
      console.log('✅ Список участников обновлен');
      
    } catch (err) {
      console.error('❌ Ошибка удаления участника:', err);
      alert('Ошибка удаления участника');
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bannerSettings.showVisualEditor) return;
    
    setBannerSettings(prev => ({ ...prev, isDragging: true }));
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bannerSettings.showVisualEditor || !bannerSettings.isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Ограничиваем значения
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    updatePreviewPosition(clampedX, clampedY);
    
    // Преобразуем в CSS background-position
    const cssPosition = `${clampedX}% ${clampedY}%`;
    updateBannerPosition(cssPosition);
  };

  const handleMouseUp = () => {
    if (!bannerSettings.showVisualEditor) return;
    
    setBannerSettings(prev => ({ ...prev, isDragging: false }));
    
    // Сохраняем позицию в базу данных
    saveBannerPosition(bannerSettings.position);
  };

  // Убираем автоматическую загрузку - данные загружаются по требованию
  useEffect(() => {
    if (id) {
      console.log('🚀 Инициализация для ID:', id, 'URL:', location.pathname);
      // Загружаем данные в фоне, не блокируя интерфейс
      fetchExamData();
    }
  }, [id, location.pathname]);

  // Глобальные обработчики мыши для лучшего контроля
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (bannerSettings.isDragging) {
        setBannerSettings(prev => ({ ...prev, isDragging: false }));
      }
    };

    if (bannerSettings.showVisualEditor) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [bannerSettings.showVisualEditor, bannerSettings.isDragging]);

  // Показываем заглушку, если данные еще не загружены или идет загрузка
  if (!exam || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#06A478]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-4 border-[#06A478] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Загрузка экзамена</h2>
            <p className="text-gray-600">Подготавливаем данные для работы...</p>
          </div>
        </div>
      </div>
    );
  }

  // Показываем ошибку, если что-то пошло не так
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка загрузки</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchExamData();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Функции зарезервированы для будущего использования
  // const getEvaluation = (participantId: string, stage: string) => {
  //   if (userProfile?.role === 'administrator') {
  //     return evaluations.find(e => e.reservist_id === participantId && e.stage === stage);
  //   } else {
  //     return evaluations.find(e => e.reservist_id === participantId && e.stage === stage && e.evaluator_id === user?.id);
  //   }
  // };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'published': return 'bg-green-100 text-green-800';
  //     case 'draft': return 'bg-yellow-100 text-yellow-800';
  //     case 'completed': return 'bg-blue-100 text-blue-800';
  //     case 'cancelled': return 'bg-red-100 text-red-800';
  //     default: return 'bg-gray-100 text-gray-800';
  //   }
  // };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Активный';
      case 'draft':
        return 'Черновик';
      case 'completed':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      default:
        return 'Неизвестно';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="container mx-auto px-0 md:px-4 pt-4 pb-8 md:pb-8">

        {/* Шапка мероприятия в стиле очного тренинга */}
        <div className={`w-full rounded-2xl shadow-lg overflow-hidden relative mb-4 sm:mb-6 font-mabry hidden md:block transition-all duration-300 ${
          isAnyModalOpen ? 'opacity-0 pointer-events-none transform scale-95' : 'opacity-100'
        }`}>
          {/* Hero секция с фоновым изображением */}
          <div
            className={`relative min-h-[200px] sm:min-h-[240px] md:min-h-[280px] flex items-end ${
              bannerSettings.showVisualEditor ? 'cursor-crosshair' : ''
            } ${bannerSettings.isDragging ? 'cursor-grabbing' : ''}`}
            style={{ 
              background: `url('https://static.tildacdn.com/tild3833-3934-4965-b661-623437346431/Frame_37704_1.png') ${bannerSettings.position}/cover no-repeat` 
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Градиентное затемнение для лучшей читаемости */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            {/* Визуальный индикатор позиции для редактора */}
            {bannerSettings.showVisualEditor && (
              <div
                className="absolute w-4 h-4 border-2 border-white rounded-full bg-red-500 shadow-lg z-30 pointer-events-none transform -translate-x-2 -translate-y-2"
                style={{
                  left: `${bannerSettings.previewPosition.x}%`,
                  top: `${bannerSettings.previewPosition.y}%`
                }}
              />
            )}

            {/* Бейдж администратора и кнопка настроек */}
            {userProfile?.role === 'administrator' && (
              <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 flex items-center gap-2">
                <button
                  onClick={toggleAdminControls}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/20 hover:border-white/30 text-white font-medium text-xs sm:text-sm shadow-lg transition-all duration-200"
                  title="Настройки обложки"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  <span className="hidden sm:inline">Настройки</span>
                </button>
                <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Режим администратора</span>
                  <span className="inline sm:hidden">Админ</span>
                </div>
              </div>
            )}

            {/* Основной контент */}
            <div className="relative z-10 w-full p-4 sm:p-6 md:p-8">
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Заголовок и описание по левой стороне */}
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 leading-tight drop-shadow-lg uppercase font-sns whitespace-pre-line">
                    {exam.title}
                  </h1>
                  {exam.description && (
                    <p className="text-white/90 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl drop-shadow mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none">
                      {exam.description}
                    </p>
                  )}
                </div>
                
                {/* Дата и место проведения по левой стороне */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm text-white/90 drop-shadow">
                  {/* Дата и время */}
                  {exam.start_date && (
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80 flex-shrink-0" />
                      <span className="font-medium truncate">
                        {new Date(exam.start_date).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {exam.end_date && exam.end_date !== exam.start_date && 
                          ` - ${new Date(exam.end_date).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}`
                        }
                      </span>
                    </div>
                  )}

                  {/* Локация */}
                  {exam.location && (
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80 flex-shrink-0" />
                      <span className="font-medium truncate">{exam.location}</span>
                    </div>
                  )}

                  {/* Количество резервистов */}
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80 flex-shrink-0" />
                    <span className="font-medium">{participants.length} резервистов</span>
                  </div>
                </div>

                {/* Бейджи и метрики по левой стороне */}
                <div className="flex flex-col items-start gap-2 sm:gap-3 mt-3 sm:mt-0">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 list-none" style={{ listStyle: 'none' }}>
                    {/* Статус - оставляем только его, так как остальная информация уже есть в названии */}
                    <span className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-white font-medium text-xs sm:text-sm shadow-lg border border-white/20 ${
                      exam.status === 'published' ? 'bg-green-500' :
                      exam.status === 'draft' ? 'bg-yellow-500' :
                      exam.status === 'completed' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}>
                      {getStatusText(exam.status)}
                    </span>
                  </div>
                  
                  {/* Кнопки действий */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {userProfile?.role === 'administrator' && (
                      <button
                        onClick={() => setShowPresentationAssignmentModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
                      >
                        <Hash className="w-4 h-4" />
                        Назначить номера выступлений
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Панель настроек обложки для администратора */}
        {userProfile?.role === 'administrator' && bannerSettings.showAdminControls && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-[#06A478]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Настройки обложки
              </h3>
              <button
                onClick={toggleVisualEditor}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  bannerSettings.showVisualEditor
                    ? 'bg-[#06A478] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {bannerSettings.showVisualEditor ? 'Отключить редактор' : 'Визуальный редактор'}
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Позиция обложки
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'center top', label: 'Центр-Верх' },
                    { value: 'center center', label: 'Центр-Центр' },
                    { value: 'center bottom', label: 'Центр-Низ' },
                    { value: 'left top', label: 'Лево-Верх' },
                    { value: 'left center', label: 'Лево-Центр' },
                    { value: 'left bottom', label: 'Лево-Низ' },
                    { value: 'right top', label: 'Право-Верх' },
                    { value: 'right center', label: 'Право-Центр' },
                    { value: 'right bottom', label: 'Право-Низ' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateBannerPosition(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        bannerSettings.position === option.value
                          ? 'bg-[#06A478] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="text-sm text-gray-500">
                  Текущая позиция: <span className="font-medium">{bannerSettings.position}</span>
                </div>
                {bannerSettings.showVisualEditor && (
                  <div className="text-sm text-gray-500">
                    Координаты: <span className="font-medium">
                      X: {Math.round(bannerSettings.previewPosition.x)}%, Y: {Math.round(bannerSettings.previewPosition.y)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  {bannerSettings.showVisualEditor && (
                    <div className="text-xs text-gray-400">
                      💡 Нажмите и перетащите по обложке для настройки позиции
                    </div>
                  )}
                  <button
                    onClick={toggleAdminControls}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Десктопные вкладки */}
        <div className={`hidden md:block ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-lg border mb-8 transition-all duration-300 ${
          isAnyModalOpen ? 'opacity-0 pointer-events-none transform scale-95' : 'opacity-100'
        }`}>
          <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => navigate(`/expert-exam/${id}`)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'participants'
                    ? 'border-[#06A478] text-[#06A478]'
                    : isDarkMode 
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Резервисты ({participants.length})
              </button>
              <button
                onClick={() => navigate(`/expert-exam/${id}/schedule`)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'schedule'
                    ? 'border-[#06A478] text-[#06A478]'
                    : isDarkMode 
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Расписание
              </button>
              {userProfile?.role === 'administrator' && (
                <button
                  onClick={() => setShowEvaluationResults(true)}
                  className={`py-4 px-1 border-b-2 border-transparent font-medium text-sm transition-colors ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-gray-200 hover:border-gray-500'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Target className="w-4 h-4 inline mr-2" />
                  Результаты оценок
                </button>
              )}
            </nav>
          </div>

          <div className="p-3 md:pb-6">
            {/* Содержимое вкладки "Резервисты" */}
            {activeTab === 'participants' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Резервисты экзамена</h3>
                
                {participants.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Резервисты не добавлены</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                    {participants.map((participant, index) => (
                      <div 
                        key={participant.id}
                        className={`card-enter ${index < 6 ? `card-stagger-${(index % 6) + 1}` : ''}`}
                        style={{ opacity: 0 }}
                      >
                        <CompactDossierCard
                          participant={participant}
                          dossier={participant.dossier ? { ...participant.dossier, user_id: participant.user.id } : undefined}
                          onRate={() => {
                            setSelectedParticipantForEvaluation(participant);
                            setShowEvaluationModal(true);
                          }}
                          onViewDossier={(participantId) => {
                            setSelectedParticipantId(participantId);
                          }}
                          onRemove={removeParticipant}
                          showRemoveButton={userProfile?.role === 'administrator'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Содержимое вкладки "Оценки" */}
            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {userProfile?.role === 'administrator' ? 'Все оценки экспертов' : 'Мои оценки'}
                </h3>
                
                {evaluations.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Оценки не выставлены</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluations.map((evaluation) => {
                      const participant = participants.find(p => p.user_id === evaluation.reservist_id);
                      
                      // Для администратора получаем информацию об эксперте
                      let expertInfo = null;
                      if (userProfile?.role === 'administrator' && evaluation.evaluator_id) {
                        // Здесь можно добавить запрос к базе данных для получения информации об эксперте
                        expertInfo = { email: 'Эксперт' }; // Заглушка
                      }
                      
                      return (
                        <div key={evaluation.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {participant?.user.full_name || 'Неизвестный участник'}
                              </p>
                              <p className="text-sm text-gray-500">{evaluation.stage}</p>
                              {userProfile?.role === 'administrator' && expertInfo && (
                                <p className="text-xs text-gray-400">Эксперт: {expertInfo.email}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-[#06A478]">{evaluation.scores?.total_score || 0}</p>
                              <p className="text-sm text-gray-500">баллов</p>
                            </div>
                          </div>
                          {evaluation.comments && (
                            <p className="text-sm text-gray-600 mt-2">{evaluation.comments}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Содержимое вкладки "Расписание" */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Расписание экзамена</h3>
                
                {!exam?.detailed_schedule || exam.detailed_schedule.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Расписание не настроено</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Main timeline line - hidden on mobile */}
                    <div className="hidden sm:block absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-[#06A478]/30 via-[#06A478]/60 to-[#06A478]/30 z-0"></div>
                    
                    <div className="space-y-4 sm:space-y-6">
                      {exam.detailed_schedule.map((item, index) => (
                        <div key={item.id || index} className="group relative">
                          {/* Timeline dot - hidden on mobile */}
                          <div className="hidden sm:block absolute left-[30px] top-[18px] w-4 h-4 bg-white border-4 border-[#06A478] rounded-full shadow-lg z-20 group-hover:scale-125 transition-transform duration-200"></div>
                          
                          {/* Content card */}
                          <div className="sm:ml-12 relative">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group-hover:border-[#06A478]/30 group-hover:-translate-y-1 overflow-hidden">
                              {/* Card header with gradient */}
                              <div className="bg-gradient-to-r from-[#06A478]/5 via-[#06A478]/10 to-[#06A478]/5 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#06A478]/20">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <div className="bg-[#06A478] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold shadow-sm">
                                        {item.time || item.startTime || 'Время не указано'}
                                      </div>
                                      {item.endTime && (
                                        <>
                                          <div className="flex items-center text-[#06A478]/60">
                                            <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#06A478]/50 rounded-full mx-1"></div>
                                            <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                          </div>
                                          <div className="bg-gray-100 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-gray-200">
                                            {item.endTime}
                                          </div>
                                        </>
                                      )}
                                      {!item.endTime && (
                                        <div className="flex items-center text-[#06A478]/60">
                                          <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#06A478]/50 rounded-full mx-1"></div>
                                          <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                        </div>
                                      )}
                                      {item.duration && (
                                        <div className="bg-gray-100 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-gray-200">
                                          {item.duration}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between sm:justify-end space-x-2">
                                    {item.type && (
                                      <div className="bg-gradient-to-r from-[#06A478]/10 to-[#06A478]/20 text-[#06A478] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-[#06A478]/30">
                                        {item.type}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Card content */}
                              <div className="p-4 sm:p-6">
                                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-[#06A478] transition-colors">
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <div className="mt-3">
                                    <p className="text-gray-600 leading-relaxed text-sm">
                                      {item.description}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Additional info */}
                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                                  {item.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      <span>{item.location}</span>
                                    </div>
                                  )}
                                  {item.speaker && (
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>{item.speaker}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Progress indicator */}
                                <div className="mt-4">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-[#06A478] to-[#059669] rounded-full transition-all duration-1000"
                                      style={{ width: `${((index + 1) / (exam.detailed_schedule?.length || 1)) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Мобильный контент */}
        <div className="md:hidden bg-white rounded-2xl shadow-lg border border-gray-200 mb-8">
          <div className="p-3">
            {/* Содержимое вкладки "Резервисты" */}
            {activeTab === 'participants' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Резервисты экзамена</h3>
                
                {participants.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Резервисты не добавлены</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <CompactDossierCard
                        key={participant.id}
                        participant={participant}
                        dossier={participant.dossier ? { ...participant.dossier, user_id: participant.user.id } : undefined}
                        onRate={() => {
                          setSelectedParticipantForEvaluation(participant);
                          setShowEvaluationModal(true);
                        }}
                        onViewDossier={(participantId) => {
                          setSelectedParticipantId(participantId);
                        }}
                        onRemove={removeParticipant}
                        showRemoveButton={userProfile?.role === 'administrator'}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Содержимое вкладки "Оценки" */}
            {activeTab === 'evaluations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Оценки экспертов</h3>
                
                {evaluations.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Оценки не добавлены</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluations.map((evaluation) => {
                      const participant = participants.find(p => p.user_id === evaluation.reservist_id);
                      const expertInfo = evaluation.evaluator_id ? { email: 'expert@example.com' } : null;
                      
                      return (
                        <div key={evaluation.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {participant?.user.full_name || 'Неизвестный участник'}
                              </p>
                              <p className="text-sm text-gray-500">{evaluation.stage}</p>
                              {userProfile?.role === 'administrator' && expertInfo && (
                                <p className="text-xs text-gray-400">Эксперт: {expertInfo.email}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-[#06A478]">{evaluation.scores?.total_score || 0}</p>
                              <p className="text-sm text-gray-500">баллов</p>
                            </div>
                          </div>
                          {evaluation.comments && (
                            <p className="text-sm text-gray-600 mt-2">{evaluation.comments}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Содержимое вкладки "Расписание" */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Расписание экзамена</h3>
                
                {!exam?.detailed_schedule || exam.detailed_schedule.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Расписание не настроено</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Main timeline line - hidden on mobile */}
                    <div className="hidden sm:block absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-[#06A478]/30 via-[#06A478]/60 to-[#06A478]/30 z-0"></div>
                    
                    <div className="space-y-4 sm:space-y-6">
                      {exam.detailed_schedule.map((item, index) => (
                        <div key={item.id || index} className="group relative">
                          {/* Timeline dot - hidden on mobile */}
                          <div className="hidden sm:block absolute left-[30px] top-[18px] w-4 h-4 bg-white border-4 border-[#06A478] rounded-full shadow-lg z-20 group-hover:scale-125 transition-transform duration-200"></div>
                          
                          {/* Content card */}
                          <div className="sm:ml-12 relative">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group-hover:border-[#06A478]/30 group-hover:-translate-y-1 overflow-hidden">
                              {/* Card header with gradient */}
                              <div className="bg-gradient-to-r from-[#06A478]/5 via-[#06A478]/10 to-[#06A478]/5 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#06A478]/20">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <div className="bg-[#06A478] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold shadow-sm">
                                        {item.time || item.startTime || 'Время не указано'}
                                      </div>
                                      {item.endTime && (
                                        <>
                                          <div className="flex items-center text-[#06A478]/60">
                                            <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#06A478]/50 rounded-full mx-1"></div>
                                            <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                          </div>
                                          <div className="bg-gray-100 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-gray-200">
                                            {item.endTime}
                                          </div>
                                        </>
                                      )}
                                      {!item.endTime && (
                                        <div className="flex items-center text-[#06A478]/60">
                                          <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#06A478]/50 rounded-full mx-1"></div>
                                          <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                        </div>
                                      )}
                                      {item.duration && (
                                        <div className="bg-gray-100 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-gray-200">
                                          {item.duration}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between sm:justify-end space-x-2">
                                    {item.type && (
                                      <div className="bg-gradient-to-r from-[#06A478]/10 to-[#06A478]/20 text-[#06A478] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-[#06A478]/30">
                                        {item.type}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Card content */}
                              <div className="p-4 sm:p-6">
                                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-[#06A478] transition-colors">
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <div className="mt-3">
                                    <p className="text-gray-600 leading-relaxed text-sm">
                                      {item.description}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Additional info */}
                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                                  {item.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      <span>{item.location}</span>
                                    </div>
                                  )}
                                  {item.speaker && (
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>{item.speaker}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Progress indicator */}
                                <div className="mt-4">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-[#06A478] to-[#059669] rounded-full transition-all duration-1000"
                                      style={{ width: `${((index + 1) / (exam.detailed_schedule?.length || 1)) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      

      {/* Модальное окно досье */}
      {selectedParticipantId && (() => {
        const selectedParticipant = participants.find(p => p.user.id === selectedParticipantId);
        return selectedParticipant ? (
          <DossierModal
            isOpen={!!selectedParticipantId}
            onClose={() => setSelectedParticipantId(null)}
            onBack={() => {
              setSelectedParticipantId(null);
              setActiveTab('participants');
            }}
            user={selectedParticipant.user}
            dossier={selectedParticipant.dossier ? { ...selectedParticipant.dossier, user_id: selectedParticipant.user.id } : undefined}
          />
        ) : null;
      })()}

      {/* Модальное окно выбора этапа оценки */}
      <EvaluationStageModal
        isOpen={showEvaluationModal}
        onClose={() => {
          console.log('🔄 Закрываем EvaluationStageModal');
          setShowEvaluationModal(false);
          setSelectedParticipantForEvaluation(null);
          
          // Принудительно восстанавливаем прокрутку на случай проблем
          setTimeout(() => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            console.log('✅ Прокрутка восстановлена принудительно');
          }, 50);
          
          console.log('✅ EvaluationStageModal закрыт');
        }}
        onStageSelect={(stage) => {
          
          // Для кейсов НЕ закрываем основное меню (обрабатывается внутри EvaluationStageModal)
          // Для других этапов закрываем и переходим к соответствующему модальному окну
          if (stage !== 'case-solving') {
            setShowEvaluationModal(false);
            
            // Открываем соответствующее модальное окно
            if (stage === 'project-defense') {
              setShowProjectDefenseModal(true);
            } else if (stage === 'diagnostic-game') {
              setShowDiagnosticGameModal(true);
            }
          }
        }}
        onCaseEvaluationComplete={async () => {
          // Перезагружаем оценки после завершения оценки кейса
          await fetchEvaluations();
        }}
        participantName={selectedParticipantForEvaluation?.user.full_name || ''}
        participantPhoto={selectedParticipantForEvaluation?.dossier?.photo_url}
        examId={id || ''}
        participantId={selectedParticipantForEvaluation?.user.id || ''}
        // Передаем загруженные оценки для отображения статуса завершенности
        evaluations={evaluations}
        onModalStateChange={(isOpen) => {
          // Уведомляем о состоянии модального окна для скрытия меню
          setIsAnyModalOpen(isOpen);
        }}
      />


      {/* Модальное окно защиты проекта */}
      {selectedParticipantForEvaluation && (
        <ProjectDefenseModal
          isOpen={showProjectDefenseModal}
          onClose={() => {
            setShowProjectDefenseModal(false);
            setSelectedParticipantForEvaluation(null);
          }}
          participantId={selectedParticipantForEvaluation.user.id}
          participantName={selectedParticipantForEvaluation.user.full_name}
          examId={id || ''}
          onEvaluationComplete={async () => {
            // Перезагружаем данные после завершения оценки
            await fetchExamData();
          }}
          onRemoveEvaluation={async () => {
            // Перезагружаем данные после удаления оценки
            await fetchExamData();
          }}
          onModalStateChange={(isOpen) => {
            // Уведомляем о состоянии модального окна для скрытия меню
            setIsAnyModalOpen(isOpen);
          }}
        />
      )}

      {/* Модальное окно диагностической игры */}
      {selectedParticipantForEvaluation && (
        <DiagnosticGameModal
          isOpen={showDiagnosticGameModal}
          onClose={() => {
            setShowDiagnosticGameModal(false);
            setSelectedParticipantForEvaluation(null);
          }}
          participantId={selectedParticipantForEvaluation.user.id}
          participantName={selectedParticipantForEvaluation.user.full_name}
          examId={id || ''}
          onEvaluationComplete={async () => {
            // Перезагружаем данные после завершения оценки
            await fetchExamData();
          }}
          onRemoveEvaluation={async () => {
            // Перезагружаем данные после удаления оценки
            await fetchExamData();
          }}
          onModalStateChange={(isOpen) => {
            // Уведомляем о состоянии модального окна для скрытия меню
            setIsAnyModalOpen(isOpen);
          }}
        />
      )}

      {/* Модальное окно результатов оценок */}
      {showEvaluationResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Результаты оценок экспертов</h2>
              <button
                onClick={() => setShowEvaluationResults(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {id && <ExpertEvaluationResults examEventId={id} />}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Schedule */}
      <FloatingActionButton
        onClick={() => setShowScheduleModal(true)}
        icon={<Calendar className="w-5 h-5" />}
        label="Расписание"
        position="bottom-right"
        size="md"
        color="primary"
      />

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        schedule={exam?.detailed_schedule || []}
        examTitle={exam?.title || 'Расписание экзамена'}
      />

      {/* Presentation Assignment Modal */}
      <PresentationAssignmentModal
        isOpen={showPresentationAssignmentModal}
        onClose={() => setShowPresentationAssignmentModal(false)}
        examId={id || ''}
        participants={participants}
        onAssignmentSaved={async () => {
          setShowPresentationAssignmentModal(false);
          // Перезагружаем данные участников после сохранения назначений
          await fetchParticipants();
        }}
      />

    </div>
  );
};

export default ExpertExamPage;