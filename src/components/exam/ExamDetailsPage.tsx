import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Target, User, Mail, Building2, Edit, Trash2, Plus, X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import DossierCard from './DossierCard';

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
  event_types?: {
    name: string;
    name_ru: string;
  };
  talent_category?: {
    name: string;
    name_ru: string;
  };
  creator?: {
    full_name: string;
  };
  detailed_schedule?: DetailedScheduleItem[];
  created_at: string;
}

interface DetailedScheduleItem {
  startTime: string;
  endTime: string;
  title: string;
  duration: string;
  description: string;
}

interface Expert {
  fullName: string;
  position: string;
  email: string;
}

const ExamDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [exam, setExam] = useState<ExamEvent | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExperts, setEditingExperts] = useState(false);
  const [newExpert, setNewExpert] = useState({ fullName: '', position: '', email: '' });
  const [scheduleData, setScheduleData] = useState({ start_date: '', end_date: '' });
  const [reservists, setReservists] = useState<any[]>([]);
  const [showReservists, setShowReservists] = useState(false);
  const [detailedSchedule, setDetailedSchedule] = useState([
    { startTime: '09:00', endTime: '09:30', title: 'Приветственный кофе-брейк', duration: '', description: '' },
    { startTime: '09:30', endTime: '09:35', title: 'Начало мероприятия', duration: '', description: 'Вступительное слово членов экзаменационной комиссии. Инструктаж.' },
    { startTime: '09:35', endTime: '12:30', title: 'Решение и защита прикладных кейсов', duration: '', description: '5 мин на инструктаж, 20 мин на подготовку решения 2-х кейсов всеми участниками, 30 минут на защиту 2-х кейсов каждого участника' },
    { startTime: '12:30', endTime: '13:30', title: 'Обед', duration: '', description: '' },
    { startTime: '13:30', endTime: '15:15', title: 'Защита проекта сотрудниками КР', duration: '', description: '5 минут - инструктаж по защите проекта, 20 минут на защиту проекта каждым участником' },
    { startTime: '15:15', endTime: '15:30', title: 'Кофе-брейк', duration: '', description: '' },
    { startTime: '15:30', endTime: '17:20', title: 'Диагностическая игра "Командное решение"', duration: '', description: '5 мин на инструктаж, 40 мин. на выполнение задания - постройку моста, 40 мин. на обратную связь от экспертов' },
    { startTime: '17:20', endTime: '17:35', title: 'Перерыв для резервистов', duration: '', description: 'Подсчет результатов ЦО' },
    { startTime: '17:35', endTime: '18:00', title: 'Подведение итогов комплексного экзамена', duration: '', description: 'Заключительное слово ЧЭК, вручение дипломов и наград выпускникам, фуршет' }
  ]);
  const [editingDetailedSchedule, setEditingDetailedSchedule] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [creatorName, setCreatorName] = useState<string>('');
  const [dossiers, setDossiers] = useState<{[key: string]: any}>({});
  const [showDossiers, setShowDossiers] = useState(false);

  // Обработка клавиатурной навигации
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (editingDetailedSchedule) {
          setEditingDetailedSchedule(false);
        } else if (editingExperts) {
          setEditingExperts(false);
        } else if (showReservists) {
          setShowReservists(false);
        } else if (showSchedule) {
          setShowSchedule(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingDetailedSchedule, editingExperts, showReservists, showSchedule]);

  // Функция для расчёта продолжительности
  const calculateDuration = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return '';
    
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    if (isNaN(startMinutes) || isNaN(endMinutes)) return '';
    
    const durationMinutes = endMinutes - startMinutes;
    
    if (durationMinutes < 0) return '';
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}ч ${minutes}мин`;
    } else if (hours > 0) {
      return `${hours}ч`;
    } else {
      return `${minutes}мин`;
    }
  };

  // Мемоизируем вычисления для общей продолжительности
  const totalDuration = useMemo(() => {
    const start = detailedSchedule[0]?.startTime;
    const end = detailedSchedule[detailedSchedule.length - 1]?.endTime;
    if (start && end) {
      return calculateDuration(start, end);
    }
    return '--';
  }, [detailedSchedule]);

  useEffect(() => {
    if (id) {
      fetchExamDetails();
    }
  }, [id]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Загружаем экзамен с ID:', id);

      // Сначала попробуем простой запрос
      let { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_types(name, name_ru),
          talent_category:talent_categories(name, name_ru)
        `)
        .eq('id', id)
        .single();

      console.log('Результат запроса:', { data, error });

      // Если запрос не сработал, попробуем без join'ов
      if (error) {
        console.log('Пробуем альтернативный запрос...');
        const { data: altData, error: altError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        
        if (altError) {
          console.error('Ошибка альтернативного запроса:', altError);
          throw altError;
        }
        
        data = altData;
        console.log('Альтернативный запрос успешен:', data);
      }

      if (!data) {
        throw new Error('Экзамен не найден');
      }

      setExam(data);

      // Загружаем имя создателя
      if (data.creator_id) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', data.creator_id)
            .single();
          setCreatorName(userData?.full_name || 'Не указан');
        } catch (err) {
          console.log('Не удалось загрузить имя создателя:', err);
          setCreatorName('Не указан');
        }
      }

      // Инициализируем данные расписания
      setScheduleData({
        start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '',
        end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : ''
      });

      // Загружаем сохраненное детальное расписание
      if (data.detailed_schedule && Array.isArray(data.detailed_schedule) && data.detailed_schedule.length > 0) {
        // Конвертируем старый формат в новый и рассчитываем продолжительность
        const scheduleWithDuration = data.detailed_schedule.map(item => {
          // Если это старый формат с time, конвертируем в новый
          if (item.time && !item.startTime) {
            const [start, end] = item.time.split('-').map(t => t.trim());
            return {
              startTime: start || '',
              endTime: end || '',
              title: item.title || '',
              duration: calculateDuration(start || '', end || ''),
              description: item.description || ''
            };
          }
          // Если это уже новый формат
          return {
            ...item,
            duration: item.duration || calculateDuration(item.startTime || '', item.endTime || '')
          };
        });
        setDetailedSchedule(scheduleWithDuration);
      }

      // Парсим экспертов из expert_emails
      if (data.expert_emails && data.expert_emails.length > 0) {
        const parsedExperts: Expert[] = data.expert_emails.map((email: string) => ({
          fullName: 'Эксперт',
          position: 'Эксперт',
          email: email
        }));
        setExperts(parsedExperts);
      }

      // Загружаем резервистов и досье
      await fetchReservists(data.id);
      await fetchDossiers(data.id);
    } catch (err) {
      console.error('Ошибка загрузки экзамена:', err);
      setError(`Не удалось загрузить данные экзамена: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/exam-reserve?edit=${id}`);
  };

  const handleAddExpert = () => {
    if (newExpert.fullName && newExpert.email) {
      setExperts([...experts, { ...newExpert }]);
      setNewExpert({ fullName: '', position: '', email: '' });
    }
  };

  const handleRemoveExpert = (index: number) => {
    setExperts(experts.filter((_, i) => i !== index));
  };

  const handleSaveExperts = async () => {
    if (!exam) return;

    try {
      const expertEmails = experts.map(expert => expert.email);
      
      const { error } = await supabase
        .from('events')
        .update({ expert_emails: expertEmails })
        .eq('id', exam.id);

      if (error) throw error;

      setEditingExperts(false);
      // Обновляем локальное состояние экзамена
      setExam({ ...exam, expert_emails: expertEmails });
    } catch (err) {
      console.error('Ошибка сохранения экспертов:', err);
      alert('Не удалось сохранить изменения');
    }
  };


  const fetchReservists = async (eventId?: string) => {
    const targetEventId = eventId || exam?.id;
    if (!targetEventId) return;

    try {
      console.log('Загружаем резервистов для события:', targetEventId);
      
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          user:users!event_participants_user_id_fkey(
            id,
            full_name,
            email,
            sap_number,
            work_experience_days,
            position:positions(name),
            territory:territories(name)
          )
        `)
        .eq('event_id', targetEventId);

      if (error) {
        console.error('Ошибка Supabase:', error);
        throw error;
      }

      console.log('Загружены резервисты:', data);
      setReservists(data || []);
      // Показываем раздел резервистов только если есть участники
      if (data && data.length > 0) {
        setShowReservists(true);
      }
    } catch (err) {
      console.error('Ошибка загрузки резервистов:', err);
      // Не показываем alert, чтобы не мешать загрузке страницы
    }
  };

  const fetchDossiers = async (eventId?: string) => {
    const targetEventId = eventId || exam?.id;
    if (!targetEventId) return;

    try {
      const { data, error } = await supabase
        .from('participant_dossiers')
        .select('*')
        .eq('event_id', targetEventId);

      if (error) {
        console.error('Ошибка загрузки досье:', error);
        return;
      }

      // Преобразуем массив в объект с ключами user_id
      const dossiersMap: {[key: string]: any} = {};
      data?.forEach(dossier => {
        dossiersMap[dossier.user_id] = dossier;
      });
      setDossiers(dossiersMap);
    } catch (err) {
      console.error('Ошибка загрузки досье:', err);
    }
  };

  const handleSaveDossier = async (participantId: string, dossierData: any) => {
    if (!exam) return;

    try {
      const { data, error } = await supabase
        .from('participant_dossiers')
        .upsert({
          user_id: participantId,
          event_id: exam.id,
          ...dossierData
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка сохранения досье:', error);
        alert('Не удалось сохранить досье');
        return;
      }

      // Обновляем локальное состояние
      setDossiers(prev => ({
        ...prev,
        [participantId]: data
      }));

      // Показываем уведомление об успехе
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
      notification.textContent = 'Досье успешно сохранено!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 3000);
    } catch (err) {
      console.error('Ошибка сохранения досье:', err);
      alert('Не удалось сохранить досье');
    }
  };

  const handleAddScheduleItem = () => {
    setDetailedSchedule([...detailedSchedule, { startTime: '', endTime: '', title: '', duration: '', description: '' }]);
  };

  const handleUpdateScheduleItem = (index: number, field: string, value: string) => {
    const updated = [...detailedSchedule];
    updated[index] = { ...updated[index], [field]: value };
    
    // Автоматически рассчитываем продолжительность при изменении времени
    if (field === 'startTime' || field === 'endTime') {
      updated[index].duration = calculateDuration(updated[index].startTime, updated[index].endTime);
    }
    
    setDetailedSchedule(updated);
  };

  const handleRemoveScheduleItem = (index: number) => {
    setDetailedSchedule(detailedSchedule.filter((_, i) => i !== index));
  };

  const handleSaveDetailedSchedule = async () => {
    if (!exam) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({ detailed_schedule: detailedSchedule })
        .eq('id', exam.id);

      if (error) throw error;

      // Обновляем локальное состояние экзамена
      setExam({ ...exam, detailed_schedule: detailedSchedule });
      setEditingDetailedSchedule(false);
      
      // Показываем уведомление об успехе
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
      notification.textContent = 'Расписание успешно сохранено!';
      document.body.appendChild(notification);
      
      // Анимация появления
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);
      
      // Удаление через 3 секунды
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 3000);
    } catch (err) {
      console.error('Ошибка сохранения детального расписания:', err);
      alert('Не удалось сохранить изменения');
    }
  };

  const handleDelete = async () => {
    if (!exam) return;
    
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить экзамен "${exam.title}"?\n\nЭто действие нельзя отменить.`
    );
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', exam.id);

      if (error) throw error;

      navigate('/exam-reserve');
    } catch (err) {
      console.error('Ошибка удаления экзамена:', err);
      alert('Не удалось удалить экзамен');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          {/* Skeleton Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-300 mb-6">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              <span>/</span>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              <span>/</span>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="flex items-center text-gray-300 mb-6">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1">
                <div className="h-8 w-96 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="flex items-center space-x-4">
                  <div className="h-6 w-32 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex space-x-3">
                <div className="h-12 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="h-12 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Skeleton Content */}
          <div className="space-y-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse mr-3"></div>
                  <div>
                    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ошибка</h2>
          <p className="text-gray-600 mb-6">{error || 'Экзамен не найден'}</p>
          <button
            onClick={() => navigate('/exam-reserve')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6" aria-label="Навигация">
            <button
              onClick={() => navigate('/')}
              className="hover:text-[#06A478] transition-colors"
            >
              Главная
            </button>
            <span>/</span>
            <button
              onClick={() => navigate('/exam-reserve')}
              className="hover:text-[#06A478] transition-colors"
            >
              Экзамены кадрового резерва
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium truncate max-w-xs">
              {exam.title}
            </span>
          </nav>

          <button
            onClick={() => navigate('/exam-reserve')}
            className="group flex items-center text-gray-600 hover:text-[#06A478] mb-6 transition-all duration-200"
            aria-label="Вернуться к списку экзаменов"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Назад к экзаменам</span>
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center px-3 py-1.5 bg-[#06A478]/10 text-[#06A478] rounded-full text-sm font-medium">
                  <Target className="w-4 h-4 mr-2" />
                  Экзамен кадрового резерва
                </div>
                <div className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Активный
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleEdit}
                className="flex items-center justify-center px-4 py-2.5 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors"
                aria-label="Редактировать экзамен"
              >
                <Edit className="w-4 h-4 mr-2" />
                <span className="font-medium">Редактировать</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center justify-center px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                aria-label="Удалить экзамен"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span className="font-medium">Удалить</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="space-y-8" role="main" aria-label="Детали экзамена">
            {/* Basic Info */}
            <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100" aria-labelledby="basic-info-heading">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-sm mr-3">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 id="basic-info-heading" className="text-xl font-bold text-gray-900 mb-1">Основная информация</h2>
                  <p className="text-gray-600 text-sm">Детали и параметры экзамена</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Описание</label>
                  <p className="text-gray-800 leading-relaxed">{exam.description}</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center mb-2">
                      <MapPin className="w-5 h-5 text-[#06A478] mr-2" />
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Место проведения</label>
                    </div>
                    <p className="text-gray-800 font-medium">{exam.location}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center mb-2">
                      <Users className="w-5 h-5 text-[#06A478] mr-2" />
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Группа</label>
                    </div>
                    <p className="text-gray-800 font-medium">{exam.group_name ? `Группа #${exam.group_name}` : 'Не указано'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-sm mr-3">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Расписание экзамена</h2>
                    <p className="text-gray-600 text-sm">Программа и временные блоки</p>
                  </div>
                </div>
              </div>
              
              {/* Основное расписание экзамена */}
              {editingDetailedSchedule ? (
                <div className="space-y-4 mt-6">
                  <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-purple-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Edit className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Редактирование расписания</h3>
                          <p className="text-gray-600 text-xs sm:text-sm">Настройте временные блоки и описания</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleAddScheduleItem}
                        className="group flex items-center justify-center px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                        <span className="font-medium text-sm sm:text-base">Добавить блок</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {detailedSchedule.map((item, index) => (
                      <div key={index} className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                        {/* Card header with gradient */}
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                {index + 1}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">Блок {index + 1}</div>
                            </div>
                            
                            <button
                              onClick={() => handleRemoveScheduleItem(index)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                            >
                              <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-4 sm:p-6">
                          {/* Time inputs with modern design */}
                          <div className="mb-4 sm:mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Время проведения</label>
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Начало</label>
                                <input
                                  type="text"
                                  placeholder="09:00"
                                  value={item.startTime}
                                  onChange={(e) => handleUpdateScheduleItem(index, 'startTime', e.target.value)}
                                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-medium border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                              </div>
                              
                              <div className="hidden sm:flex flex-col items-center space-y-1">
                                <div className="w-8 h-0.5 bg-gray-300"></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <div className="w-8 h-0.5 bg-gray-300"></div>
                              </div>
                              
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Окончание</label>
                                <input
                                  type="text"
                                  placeholder="09:30"
                                  value={item.endTime}
                                  onChange={(e) => handleUpdateScheduleItem(index, 'endTime', e.target.value)}
                                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-medium border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                              </div>
                              
                              <div className="flex-shrink-0">
                                <label className="block text-xs text-gray-500 mb-1">Продолжительность</label>
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-sm font-medium border border-green-200 min-w-[80px] text-center">
                                  {item.duration || 'авто'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Title input */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Название блока</label>
                            <input
                              type="text"
                              placeholder="Введите название блока"
                              value={item.title}
                              onChange={(e) => handleUpdateScheduleItem(index, 'title', e.target.value)}
                              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                            />
                          </div>
                          
                          {/* Description input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Описание (необязательно)</label>
                            <textarea
                              placeholder="Добавьте подробное описание блока..."
                              value={item.description}
                              onChange={(e) => handleUpdateScheduleItem(index, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                    <button
                      onClick={handleSaveDetailedSchedule}
                      className="group flex items-center justify-center px-4 py-3 sm:px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      <span className="font-medium text-sm sm:text-base">Сохранить расписание</span>
                    </button>
                    <button
                      onClick={() => setEditingDetailedSchedule(false)}
                      className="px-4 py-3 sm:px-6 bg-white text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium w-full sm:w-auto"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mt-6">
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-sm">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">Расписание экзамена</h3>
                          <p className="text-sm sm:text-base text-gray-600 font-medium">Программа и временные блоки</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowSchedule(!showSchedule)}
                          className="flex items-center px-4 py-2.5 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors"
                          aria-label={showSchedule ? 'Скрыть детальное расписание' : 'Показать детальное расписание'}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="font-medium">
                            {showSchedule ? 'Скрыть расписание' : 'Показать расписание'}
                          </span>
                        </button>
                        <button
                          onClick={() => setEditingDetailedSchedule(!editingDetailedSchedule)}
                          className="flex items-center px-4 py-2.5 text-[#06A478] hover:text-[#059669] hover:bg-[#06A478]/5 rounded-lg transition-all duration-200 font-medium border border-[#06A478]"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {editingDetailedSchedule ? 'Отмена' : 'Редактировать'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Summary stats */}
                    <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/50">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Начало</div>
                        <div className="text-base sm:text-lg font-bold text-gray-900">{detailedSchedule[0]?.startTime || '--:--'}</div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/50">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Окончание</div>
                        <div className="text-base sm:text-lg font-bold text-gray-900">{detailedSchedule[detailedSchedule.length - 1]?.endTime || '--:--'}</div>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/50">
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Общее время</div>
                        <div className="text-base sm:text-lg font-bold text-gray-900">
                          {totalDuration}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Детальное расписание - показывается только при нажатии кнопки */}
                  {showSchedule && (
                    <div className="relative">
                      {/* Main timeline line - hidden on mobile */}
                      <div className="hidden sm:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#06A478]/20 via-[#06A478]/40 to-[#06A478]/20"></div>
                      
                      <div className="space-y-4 sm:space-y-6">
                        {detailedSchedule.map((item, index) => (
                          <div key={index} className="group relative">
                            {/* Timeline dot - hidden on mobile */}
                            <div className="hidden sm:block absolute left-6 top-6 w-4 h-4 bg-white border-4 border-[#06A478] rounded-full shadow-lg z-10 group-hover:scale-125 transition-transform duration-200"></div>
                            
                            {/* Content card */}
                            <div className="sm:ml-12 relative">
                              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group-hover:border-[#06A478]/30 group-hover:-translate-y-1 overflow-hidden">
                                {/* Card header with gradient */}
                                <div className="bg-gradient-to-r from-[#06A478]/5 via-[#06A478]/10 to-[#06A478]/5 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#06A478]/20">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                      <div className="flex items-center space-x-2">
                                        <div className="bg-[#06A478] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold shadow-sm">
                                          {item.startTime}
                                        </div>
                                        <div className="flex items-center text-[#06A478]/60">
                                          <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#06A478]/50 rounded-full mx-1"></div>
                                          <div className="w-4 h-0.5 sm:w-6 bg-[#06A478]/30"></div>
                                        </div>
                                        <div className="bg-gray-100 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-gray-200">
                                          {item.endTime}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end space-x-2">
                                      <div className="bg-gradient-to-r from-[#06A478]/10 to-[#06A478]/20 text-[#06A478] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-medium border border-[#06A478]/30">
                                        {item.duration}
                                      </div>
                                      <div className="w-2 h-2 bg-[#06A478] rounded-full animate-pulse"></div>
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
                                  
                                  {/* Progress indicator */}
                                  <div className="mt-4">
                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-[#06A478] to-[#059669] rounded-full transition-all duration-1000"
                                        style={{ width: `${((index + 1) / detailedSchedule.length) * 100}%` }}
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

            {/* Experts */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-sm mr-3">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Эксперты</h2>
                    <p className="text-gray-600 text-sm">Члены экзаменационной комиссии ({experts.length})</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingExperts(!editingExperts)}
                  className="group flex items-center px-4 py-2.5 text-[#06A478] hover:text-[#059669] hover:bg-[#06A478]/5 rounded-xl transition-all duration-200 font-medium"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {editingExperts ? 'Отмена' : 'Редактировать'}
                </button>
              </div>
              
              {editingExperts ? (
                <div className="space-y-4">
                  {/* Добавление нового эксперта */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-800 mb-3">Добавить эксперта</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="ФИО"
                        value={newExpert.fullName}
                        onChange={(e) => setNewExpert({ ...newExpert, fullName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Должность"
                        value={newExpert.position}
                        onChange={(e) => setNewExpert({ ...newExpert, position: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex space-x-2">
                        <input
                          type="email"
                          placeholder="Email"
                          value={newExpert.email}
                          onChange={(e) => setNewExpert({ ...newExpert, email: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleAddExpert}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Список экспертов с возможностью удаления */}
                  <div className="space-y-3">
                    {experts.map((expert, index) => (
                      <div key={index} className="group flex items-center p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100 hover:border-[#06A478]/30 transition-all duration-200">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#06A478]/10 to-[#06A478]/20 rounded-lg flex items-center justify-center mr-3 border border-[#06A478]/20">
                          <User className="w-5 h-5 text-[#06A478]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{expert.fullName}</p>
                          <p className="text-sm text-gray-600">{expert.position}</p>
                        </div>
                        <div className="flex items-center text-gray-500 mr-4">
                          <Mail className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">{expert.email}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveExpert(index)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group-hover:scale-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={handleSaveExperts}
                      className="group flex items-center justify-center px-4 py-2.5 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      <span className="font-medium">Сохранить</span>
                    </button>
                    <button
                      onClick={() => setEditingExperts(false)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {experts.length > 0 ? (
                    experts.map((expert, index) => (
                      <div key={index} className="group flex items-center p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100 hover:border-[#06A478]/30 transition-all duration-200">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#06A478]/10 to-[#06A478]/20 rounded-lg flex items-center justify-center mr-3 border border-[#06A478]/20">
                          <User className="w-5 h-5 text-[#06A478]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{expert.fullName}</p>
                          <p className="text-sm text-gray-600">{expert.position}</p>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Mail className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">{expert.email}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Эксперты не добавлены</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Добавьте членов экзаменационной комиссии для проведения экзамена
                      </p>
                      <button
                        onClick={() => setEditingExperts(true)}
                        className="inline-flex items-center px-4 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#059669] transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить экспертов
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Creator Info */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-sm mr-3">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Информация о создателе</h2>
                  <p className="text-gray-600 text-sm">Данные о создателе экзамена</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Создатель</label>
                  <p className="text-gray-800 font-medium">{creatorName || 'Не указан'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Дата создания</label>
                  <p className="text-gray-800 font-medium">{formatDate(exam.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Reservists */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-sm mr-3">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Резервисты</h2>
                    <p className="text-gray-600 text-sm">
                      Участники экзамена {reservists.length > 0 && `(${reservists.length})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReservists(!showReservists)}
                  className="group flex items-center px-4 py-2.5 text-[#06A478] hover:text-[#059669] hover:bg-[#06A478]/5 rounded-xl transition-all duration-200 font-medium"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {showReservists ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              
              {showReservists ? (
                <div className="space-y-3">
                  {reservists.length > 0 ? (
                    reservists.map((participant, index) => (
                      <div key={index} className="group p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100 hover:border-[#06A478]/30 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#06A478]/10 to-[#06A478]/20 rounded-xl flex items-center justify-center border border-[#06A478]/20">
                              <User className="w-6 h-6 text-[#06A478]" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">{participant.user?.full_name || 'Не указано'}</p>
                              <p className="text-sm text-gray-600 mb-1">{participant.user?.position?.name || 'Должность не указана'}</p>
                              <p className="text-xs text-gray-500">{participant.user?.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 font-medium">SAP: {participant.user?.sap_number || 'Не указан'}</p>
                            <p className="text-xs text-gray-500">{participant.user?.territory?.name || 'Территория не указана'}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Резервисты не найдены</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Участники экзамена ещё не добавлены. Они появятся здесь после регистрации на экзамен.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Загрузить участников</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Нажмите "Показать" для загрузки списка участников экзамена
                  </p>
                </div>
              )}
            </div>

            {/* Раздел досье резервистов */}
            {reservists.length > 0 && (
              <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#06A478] to-[#059669] rounded-xl flex items-center justify-center shadow-sm mr-3">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Досье резервистов</h2>
                      <p className="text-gray-600 text-sm">
                        Персональные досье участников программы {reservists.length > 0 && `(${reservists.length})`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDossiers(!showDossiers)}
                    className="group flex items-center px-4 py-2.5 text-[#06A478] hover:text-[#059669] hover:bg-[#06A478]/5 rounded-xl transition-all duration-200 font-medium"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {showDossiers ? 'Скрыть досье' : 'Показать досье'}
                  </button>
                </div>
                
                {showDossiers && (
                  <div className="space-y-6">
                    {reservists.map((participant) => (
                      <DossierCard
                        key={participant.id}
                        participant={participant}
                        dossier={dossiers[participant.user.id]}
                        groupName={exam?.group_name}
                        onEdit={(participantId, dossierData) => {
                          // Логика редактирования уже встроена в компонент
                        }}
                        onSave={handleSaveDossier}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
        </main>
      </div>
    </div>
  );
};

export default ExamDetailsPage;
