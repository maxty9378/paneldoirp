import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Users, Target, Clock, Search, Filter, MoreVertical, Edit, Trash2, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { CreateEventModal } from '../events/CreateEventModal';

interface ExamEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  talent_category_id?: string;
  talent_category?: {
    id: string;
    name_ru: string;
    color: string;
  } | null;
  group_name?: string;
  expert_emails?: string[];
  created_at: string;
  creator?: {
    full_name: string;
  };
  event_types?: {
    name: string;
    name_ru: string;
  };
}

export function ExamReservePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamEvent | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Загрузка экзаменов
  const fetchExams = async () => {
    try {
      setLoading(true);
      console.log('Загружаем экзамены кадрового резерва...');
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          location,
          status,
          group_name,
          expert_emails,
          created_at,
          talent_category_id,
          talent_category: talent_categories (
            id,
            name_ru,
            color
          ),
          event_types!inner (
            name,
            name_ru
          ),
          creator: creator_id (
            full_name
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
        .eq('event_types.name', 'exam_talent_reserve')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки экзаменов:', error);
        throw error;
      }
      
      console.log('Загружены экзамены:', data);
      setExams(data || []);
    } catch (error) {
      console.error('Ошибка загрузки экзаменов:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Обработчики для модального окна
  const handleCreateExam = () => {
    console.log('Создание экзамена, устанавливаем defaultEventType: exam');
    console.log('showCreateModal до:', showCreateModal);
    setEditingExam(null);
    setShowCreateModal(true);
    console.log('showCreateModal после:', true);
  };

  const handleEditExam = async (exam: ExamEvent) => {
    console.log('Редактирование экзамена:', exam);
    
    try {
      // Загружаем полные данные экзамена включая участников
      const { data: fullExamData, error } = await supabase
        .from('events')
        .select(`
          *,
          event_types (*),
          event_participants (
            user_id,
            users (
              id,
              full_name,
              email,
              sap_number
            )
          ),
          talent_category: talent_categories (*),
          creator: creator_id (
            id,
            full_name,
            email
          )
        `)
        .eq('id', exam.id)
        .single();

      if (error) {
        console.error('Ошибка загрузки данных экзамена:', error);
        throw error;
      }

      console.log('Полные данные экзамена с участниками:', fullExamData);
      setEditingExam(fullExamData);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Ошибка при загрузке экзамена для редактирования:', error);
      // Fallback: используем базовые данные
      setEditingExam(exam);
      setShowCreateModal(true);
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingExam(null);
  };

  const handleModalSuccess = () => {
    setShowCreateModal(false);
    setEditingExam(null);
    fetchExams(); // Обновляем список экзаменов
  };

  // Обновление статуса экзамена
  const updateExamStatus = async (examId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId);

      if (error) throw error;
      fetchExams();
    } catch (err) {
      console.error('Error updating exam status:', err);
    }
  };

  // Удаление экзамена
  const deleteExam = async (examId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', examId);

      if (error) throw error;
      fetchExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  // Фильтрация экзаменов
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.talent_category?.name_ru.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || exam.talent_category?.name_ru === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'draft':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Опубликован';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#06A478] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка экзаменов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Экзамены кадрового резерва</h1>
          <p className="text-gray-600 mt-1">
            Управление экзаменами для оценки кандидатов в кадровый резерв
            {exams.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({exams.length} экзаменов)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            console.log('Кнопка "Создать экзамен" нажата');
            handleCreateExam();
          }}
          className="inline-flex items-center px-4 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#05976b] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать экзамен
        </button>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию, группе или категории..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
            />
          </div>

          {/* Фильтр по статусу */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="draft">Черновик</option>
            <option value="published">Опубликован</option>
            <option value="completed">Завершен</option>
            <option value="cancelled">Отменен</option>
          </select>

          {/* Фильтр по категории */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06A478] focus:border-transparent"
          >
            <option value="all">Все категории</option>
            <option value="Таланты СВ">Таланты СВ</option>
            <option value="Потенциал ГДФ">Потенциал ГДФ</option>
            <option value="Профессионалы РМ">Профессионалы РМ</option>
          </select>
        </div>
      </div>

      {/* Список экзаменов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredExams.map((exam) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            {/* Заголовок и статус */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{exam.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                    {getStatusIcon(exam.status)}
                    <span className="ml-1">{getStatusText(exam.status)}</span>
                  </span>
                </div>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === exam.id ? null : exam.id);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {/* Выпадающее меню */}
                {openMenuId === exam.id && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10 min-w-[200px]"
                  >
                    {/* Пункты меню для смены статуса */}
                    {exam.status === 'draft' && (
                      <button
                        onClick={() => {
                          if (confirm('Активировать экзамен? После активации он станет доступен участникам.')) {
                            updateExamStatus(exam.id, 'published');
                            setOpenMenuId(null);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Активировать экзамен
                      </button>
                    )}
                    
                    {exam.status === 'published' && (
                      <>
                        <button
                          onClick={() => {
                            if (confirm('Завершить экзамен? Это действие нельзя будет отменить.')) {
                              updateExamStatus(exam.id, 'completed');
                              setOpenMenuId(null);
                            }
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Завершить экзамен
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Вернуть экзамен в черновик? Участники потеряют доступ к экзамену.')) {
                              updateExamStatus(exam.id, 'draft');
                              setOpenMenuId(null);
                            }
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 flex items-center gap-2"
                        >
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          Вернуть в черновик
                        </button>
                      </>
                    )}
                    
                    {exam.status === 'completed' && (
                      <button
                        onClick={() => {
                          if (confirm('Вернуть экзамен в активное состояние?')) {
                            updateExamStatus(exam.id, 'published');
                            setOpenMenuId(null);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Реактивировать экзамен
                      </button>
                    )}
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    {/* Дополнительные действия */}
                    <button
                      onClick={() => {
                        setEditingExam(exam);
                        setShowCreateModal(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Редактировать
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить этот экзамен?')) {
                          deleteExam(exam.id);
                          setOpenMenuId(null);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Категория и группа */}
            <div className="space-y-2 mb-4">
              {exam.talent_category && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: exam.talent_category.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{exam.talent_category.name_ru}</span>
                </div>
              )}
              {exam.group_name && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Группа: {exam.group_name}</span>
                </div>
              )}
              {exam.event_participants && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Участников: {exam.event_participants.length}</span>
                </div>
              )}
            </div>

            {/* Даты */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {new Date(exam.start_date).toLocaleDateString('ru-RU')}
                </span>
              </div>
              {exam.location && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{exam.location}</span>
                </div>
              )}
            </div>

            {/* Эксперты */}
            {exam.expert_emails && exam.expert_emails.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Эксперты:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {exam.expert_emails.slice(0, 2).map((email, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {email}
                    </span>
                  ))}
                  {exam.expert_emails.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{exam.expert_emails.length - 2} еще
                    </span>
                  )}
                </div>
              </div>
            )}


            {/* Действия */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <button 
                onClick={() => navigate(`/exam-details/${exam.id}`)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                Просмотр
              </button>
              <button 
                onClick={() => handleEditExam(exam)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Редактировать
              </button>
              <button className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Пустое состояние */}
      {filteredExams.length === 0 && !loading && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Экзамены не найдены</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Попробуйте изменить фильтры поиска'
              : 'Создайте первый экзамен кадрового резерва'
            }
          </p>
          {(!searchTerm && statusFilter === 'all' && categoryFilter === 'all') && (
            <button
              onClick={() => {
                console.log('Кнопка "Создать экзамен" (вторая) нажата');
                handleCreateExam();
              }}
              className="inline-flex items-center px-4 py-2 bg-[#06A478] text-white rounded-lg hover:bg-[#05976b] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать экзамен
            </button>
          )}
        </div>
      )}

      {/* Модальное окно создания/редактирования экзамена */}
      {console.log('ExamReservePage: showCreateModal:', showCreateModal)}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingEvent={editingExam}
        defaultEventType="exam"
      />
    </div>
  );
}
