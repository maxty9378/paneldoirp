import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Target, User, Mail, Edit, Trash2, Plus, X, Save, FileText, Hash } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import DossierCard from './DossierCard';
import { CaseAssignmentModal } from './CaseAssignmentModal';
import { PresentationAssignmentModal } from './PresentationAssignmentModal';

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
  const [showCaseAssignmentModal, setShowCaseAssignmentModal] = useState(false);
  const [showPresentationAssignmentModal, setShowPresentationAssignmentModal] = useState(false);

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

      // Загружаем сохраненное детальное расписание
      if (data.detailed_schedule && Array.isArray(data.detailed_schedule) && data.detailed_schedule.length > 0) {
        // Конвертируем старый формат в новый и рассчитываем продолжительность
        const scheduleWithDuration = data.detailed_schedule.map((item: any) => {
          // Если это старый формат с time, конвертируем в новый
          if (item.time && !item.startTime) {
            const [start, end] = item.time.split('-').map((t: string) => t.trim());
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

  const fetchReservists = async (examId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          user:users(
            id,
            full_name,
            email,
            sap_number,
            position:positions(name),
            territory:territories(name)
          )
        `)
        .eq('event_id', examId);

      if (error) {
        console.error('Ошибка загрузки резервистов:', error);
        return;
      }

      console.log('Загружены резервисты:', data);
      setReservists(data || []);
    } catch (err) {
      console.error('Ошибка fetchReservists:', err);
    }
  };

  const fetchDossiers = async (examId: string) => {
    try {
      const { data: participants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', examId);

      if (!participants || participants.length === 0) return;

      const userIds = participants.map(p => p.user_id);
      
      // Используем правильную таблицу participant_dossiers
      const { data: dossiersData, error } = await supabase
        .from('participant_dossiers')
        .select('*')
        .in('user_id', userIds)
        .eq('event_id', examId);

      if (error) {
        console.error('Ошибка загрузки досье:', error);
        return;
      }

      const dossiersMap: {[key: string]: any} = {};
      dossiersData?.forEach(dossier => {
        dossiersMap[dossier.user_id] = dossier;
      });

      console.log('Загружены досье:', dossiersMap);
      setDossiers(dossiersMap);
    } catch (err) {
      console.error('Ошибка fetchDossiers:', err);
    }
  };

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

  const handleEdit = () => {
    navigate(`/exam-reserve?edit=${id}`);
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот экзамен?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/exam-reserve');
    } catch (err) {
      console.error('Ошибка удаления экзамена:', err);
      alert('Не удалось удалить экзамен');
    }
  };

  const handleAddExpert = () => {
    if (!newExpert.email) return;

    setExperts([...experts, newExpert]);
    setNewExpert({ fullName: '', position: '', email: '' });
  };

  const handleRemoveExpert = (index: number) => {
    setExperts(experts.filter((_, i) => i !== index));
  };

  const handleSaveExperts = async () => {
    try {
      const expertEmails = experts.map(expert => expert.email);
      
      const { error } = await supabase
        .from('events')
        .update({ expert_emails: expertEmails })
        .eq('id', id);

      if (error) throw error;

      setEditingExperts(false);
      alert('Эксперты сохранены');
    } catch (err) {
      console.error('Ошибка сохранения экспертов:', err);
      alert('Не удалось сохранить экспертов');
    }
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

  const handleAddScheduleItem = () => {
    setDetailedSchedule([...detailedSchedule, {
      startTime: '',
      endTime: '',
      title: '',
      duration: '',
      description: ''
    }]);
  };

  const handleRemoveScheduleItem = (index: number) => {
    setDetailedSchedule(detailedSchedule.filter((_, i) => i !== index));
  };

  const handleSaveDetailedSchedule = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ detailed_schedule: detailedSchedule })
        .eq('id', id);

      if (error) throw error;

      setEditingDetailedSchedule(false);
      alert('Расписание сохранено');
    } catch (err) {
      console.error('Ошибка сохранения расписания:', err);
      alert('Не удалось сохранить расписание');
    }
  };

  const handleSaveDossier = async (participantId: string, dossierData: any) => {
    try {
      if (!id) {
        alert('ID экзамена не найден');
        return;
      }

      const { error } = await supabase
        .from('participant_dossiers')
        .upsert({
          user_id: participantId,
          event_id: id,
          ...dossierData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Обновляем локальное состояние
      setDossiers(prev => ({
        ...prev,
        [participantId]: { ...prev[participantId], ...dossierData }
      }));

      console.log('Досье сохранено для участника:', participantId);
      alert('Досье сохранено');
    } catch (err) {
      console.error('Ошибка сохранения досье:', err);
      alert('Не удалось сохранить досье');
    }
  };

  // Удаление участника из экзамена
  const removeParticipantFromExam = async (participantId: string) => {
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
      
      // Обновляем список участников
      console.log('🔄 Обновляем список участников...');
      await fetchReservists(id!);
      console.log('✅ Список участников обновлен');
      
    } catch (err) {
      console.error('❌ Ошибка удаления участника:', err);
      alert('Ошибка удаления участника');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 hidden md:block">
          <button
            onClick={() => navigate('/exam-reserve')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Назад к экзаменам</span>
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <Target className="w-4 h-4 mr-2" />
                  Экзамен кадрового резерва
                </div>
                <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Активный
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {userProfile?.role === 'administrator' && (
                <>
                  <button
                    onClick={() => setShowCaseAssignmentModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Назначить кейсы
                  </button>
                  <button
                    onClick={() => setShowPresentationAssignmentModal(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Hash className="w-4 h-4 mr-2" />
                    Номера выступлений
                  </button>
                </>
              )}
              <button
                onClick={handleEdit}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Редактировать
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Основная информация</h2>
                <p className="text-gray-500">Детали и параметры экзамена</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
                <p className="text-gray-800">{exam.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Место проведения</label>
                <p className="text-gray-800 font-medium">{exam.location}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Группа</label>
                <p className="text-gray-800 font-medium">{exam.group_name ? `Группа #${exam.group_name}` : 'Не указано'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Создатель</label>
                <p className="text-gray-800 font-medium">{creatorName || 'Не указан'}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Расписание экзамена</h2>
                  <p className="text-gray-500">Программа и временные блоки</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showSchedule ? 'Скрыть расписание' : 'Показать расписание'}
                </button>
                <button
                  onClick={() => setEditingDetailedSchedule(!editingDetailedSchedule)}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {editingDetailedSchedule ? 'Отмена' : 'Редактировать'}
                </button>
              </div>
            </div>

            {editingDetailedSchedule && (
              <div className="space-y-4 mb-6">
                <button
                  onClick={handleAddScheduleItem}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить блок
                </button>
                
                <div className="space-y-3">
                  {detailedSchedule.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Блок {index + 1}</h4>
                        <button
                          onClick={() => handleRemoveScheduleItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="Начало"
                          value={item.startTime}
                          onChange={(e) => handleUpdateScheduleItem(index, 'startTime', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Окончание"
                          value={item.endTime}
                          onChange={(e) => handleUpdateScheduleItem(index, 'endTime', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Название"
                          value={item.title}
                          onChange={(e) => handleUpdateScheduleItem(index, 'title', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                          {item.duration || 'авто'}
                        </div>
                      </div>
                      
                      <textarea
                        placeholder="Описание"
                        value={item.description}
                        onChange={(e) => handleUpdateScheduleItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleSaveDetailedSchedule}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить расписание
                </button>
              </div>
            )}

            {showSchedule && !editingDetailedSchedule && (
              <div className="space-y-4">
                {detailedSchedule.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                          {item.startTime}
                        </div>
                        <div className="text-gray-400">—</div>
                        <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm">
                          {item.endTime}
                        </div>
                      </div>
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm font-medium">
                        {item.duration}
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                    {item.description && (
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Experts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Эксперты ({experts.length})</h2>
                  <p className="text-gray-500">Члены экзаменационной комиссии</p>
                </div>
              </div>
              
              <button
                onClick={() => setEditingExperts(!editingExperts)}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {editingExperts ? 'Отмена' : 'Редактировать'}
              </button>
            </div>

            {editingExperts ? (
              <div className="space-y-4">
                {/* Добавление нового эксперта */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-3">Добавить эксперта</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="ФИО"
                      value={newExpert.fullName}
                      onChange={(e) => setNewExpert({ ...newExpert, fullName: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Должность"
                      value={newExpert.position}
                      onChange={(e) => setNewExpert({ ...newExpert, position: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newExpert.email}
                      onChange={(e) => setNewExpert({ ...newExpert, email: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddExpert}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Список экспертов */}
                <div className="space-y-3">
                  {experts.map((expert, index) => (
                    <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{expert.fullName}</p>
                        <p className="text-sm text-gray-600">{expert.position}</p>
                      </div>
                      <div className="flex items-center text-gray-500 mr-4">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="text-sm">{expert.email}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveExpert(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleSaveExperts}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {experts.length > 0 ? (
                  experts.map((expert, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{expert.fullName}</p>
                        <p className="text-sm text-gray-600">{expert.position}</p>
                      </div>
                      <div className="text-sm text-gray-500">{expert.email}</div>
                      {(userProfile?.role === 'expert' && expert.email === userProfile?.email) || userProfile?.role === 'administrator' ? (
                        <button
                          onClick={() => navigate(`/expert-exam/${id}`)}
                          className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          {userProfile?.role === 'administrator' ? 'Управление' : 'Оценка'}
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Эксперты не добавлены</p>
                    <button
                      onClick={() => setEditingExperts(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Добавить экспертов
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reservists */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Резервисты ({reservists.length})</h2>
                  <p className="text-gray-500">Участники экзамена</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowReservists(!showReservists)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showReservists ? 'Скрыть' : 'Показать'}
              </button>
            </div>

            {showReservists && (
              <div className="space-y-3">
                {reservists.length > 0 ? (
                  reservists.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{participant.user?.full_name || 'Не указано'}</p>
                          <p className="text-sm text-gray-600">{participant.user?.position?.name || 'Должность не указана'}</p>
                          <p className="text-xs text-gray-500">{participant.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">SAP: {participant.user?.sap_number || 'Не указан'}</p>
                          <p className="text-xs text-gray-500">{participant.user?.territory?.name || 'Территория не указана'}</p>
                        </div>
                        {userProfile?.role === 'administrator' && (
                          <button
                            onClick={() => removeParticipantFromExam(participant.user.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить участника из экзамена"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Резервисты не найдены</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dossiers */}
          {reservists.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Досье резервистов</h2>
                    <p className="text-gray-500">Персональные досье участников программы</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowDossiers(!showDossiers)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showDossiers ? 'Скрыть' : 'Показать'}
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
                      onEdit={(_participantId, _dossierData) => {
                        /* редактирование внутри компонента */
                      }}
                      onSave={handleSaveDossier}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      <CaseAssignmentModal
        isOpen={showCaseAssignmentModal}
        onClose={() => setShowCaseAssignmentModal(false)}
        examId={id || ''}
        participants={reservists}
        onAssignmentSaved={() => {
          setShowCaseAssignmentModal(false);
        }}
      />

      <PresentationAssignmentModal
        isOpen={showPresentationAssignmentModal}
        onClose={() => setShowPresentationAssignmentModal(false)}
        examId={id || ''}
        participants={reservists}
        onAssignmentSaved={() => {
          setShowPresentationAssignmentModal(false);
        }}
      />
    </div>
  );
};

export default ExamDetailsPage;