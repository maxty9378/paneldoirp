import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Star, LinkIcon, Save, Upload, Download, Search, Plus, FileSpreadsheet, User, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { createRegularUser } from '../../lib/userManagement';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingEvent?: any;
}

export function CreateEventModal({ isOpen, onClose, onSuccess, editingEvent }: CreateEventModalProps) {
  const { user, userProfile } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type_id: '',
    start_date: '',
    end_date: '',
    location: '',
    meeting_link: '',
    points: 0,
    max_participants: '',
    status: 'draft',
  });

  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [territories, setTerritories] = useState<any[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Заполняем форму при редактировании
  useEffect(() => {
    if (editingEvent) {
      setFormData({
        title: editingEvent.title || '',
        description: editingEvent.description || '',
        event_type_id: editingEvent.event_type_id || '',
        start_date: editingEvent.start_date ? new Date(editingEvent.start_date).toISOString().slice(0, 16) : '',
        end_date: editingEvent.end_date ? new Date(editingEvent.end_date).toISOString().slice(0, 16) : '',
        location: editingEvent.location || '',
        meeting_link: editingEvent.meeting_link || '',
        points: editingEvent.points || 0,
        max_participants: editingEvent.max_participants?.toString() || '',
        status: editingEvent.status || 'draft',
      });
    } else {
      // Сброс формы для нового мероприятия
      setFormData({
        title: '',
        description: '',
        event_type_id: '',
        start_date: '',
        end_date: '',
        location: '',
        meeting_link: '',
        points: 0,
        max_participants: '',
        status: 'draft',
      });
    }
    
    // Reset participants when modal is opened/closed
    if (isOpen) {
      setParticipants([]);
      fetchPositions();
      fetchTerritories();
      setStep(1);
      setImportErrors([]);
      setImportPreview([]);
      setShowImportPreview(false);
      fetchEventTypes();
      fetchUsers();
    }
    
    setErrors({});
  }, [editingEvent, isOpen]);

  // Загрузка должностей
  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Ошибка загрузки должностей:', error);
    }
  };
  
  // Загрузка территорий
  const fetchTerritories = async () => {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTerritories(data || []);
    } catch (error) {
      console.error('Ошибка загрузки территорий:', error);
    }
  };

  // Загрузка типов мероприятий
  const fetchEventTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .order('name_ru');

      if (error) throw error;
      setEventTypes(data || []);
    } catch (error) {
      console.error('Ошибка загрузки типов мероприятий:', error);
    }
  };

  // Загрузка пользователей
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, 
          full_name, 
          email, 
          sap_number, 
          phone, 
          position:position_id(name), 
          territory:territory_id(name)
        `)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  // Эффект для отслеживания выбора типа мероприятия
  useEffect(() => {
    if (formData.event_type_id) {
      const eventType = eventTypes.find(et => et.id === formData.event_type_id);
      setSelectedEventType(eventType || null);
    } else {
      setSelectedEventType(null);
    }
  }, [formData.event_type_id, eventTypes]);

  // Эффект для обработки клика вне выпадающего списка поиска
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Поиск пользователей
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    const filteredResults = allUsers.filter(user => 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.sap_number && user.sap_number.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 10);
    
    setSearchResults(filteredResults);
    setShowSearchResults(true);
  }, [searchTerm, allUsers]);

  // Обработчик добавления участника из поиска
  const addParticipantFromSearch = (user) => {
    // Проверяем, не добавлен ли уже этот пользователь
    if (participants.some(p => p.id === user.id)) {
      return;
    }
    
    setParticipants([...participants, user]);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Обработчик удаления участника
  const removeParticipant = (index) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  // Обработчик импорта из Excel
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await readExcelFile(file);
      setImportPreview(data);
      setShowImportPreview(true);
      setImportErrors([]);
    } catch (error) {
      console.error('Ошибка при чтении Excel файла:', error);
      setImportErrors([error.message || 'Ошибка при чтении файла']);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Чтение и парсинг Excel файла
  const readExcelFile = (file): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Получаем первый лист
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Конвертируем в JSON начиная с 13-й строки (как в шаблоне)
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 12 });
          
          if (jsonData.length === 0) {
            throw new Error('Файл не содержит данных. Убедитесь, что данные начинаются с 13-й строки.');
          }
          
          // Преобразуем данные в формат участников
          const parsedData = jsonData.map((row: any, index) => {
            // Получаем значения из колонок на основе шаблона
            // B - Full name, C - SAP, D - Position, E - Territory, F - Experience, H - Phone, I - Email
            const fullName = row['__EMPTY_1'] || '';
            const sapNumber = row['__EMPTY_2'] || '';
            const position = row['__EMPTY_3'] || '';
            const territory = row['__EMPTY_4'] || '';
            const experience = row['__EMPTY_5'] || 0;
            const phone = row['__EMPTY_7'] || '';
            const email = row['__EMPTY_8'] || '';
            
            // Валидируем обязательные поля
            let error = null;
            if (!fullName) {
              error = 'Отсутствует ФИО';
            } else if (!email && !sapNumber) {
              error = 'Необходимо указать либо Email, либо SAP номер';
            }
            
            return {
              full_name: fullName,
              sap_number: sapNumber || null,
              position: { name: position },
              territory: { name: territory },
              work_experience_days: experience || 0,
              phone: phone,
              email: email || null,
              error,
              status: error ? 'error' : 'new'
            };
          });
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Ошибка при чтении файла. Убедитесь, что файл соответствует шаблону.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // Подтверждение импорта
  const confirmImport = () => {
    const validParticipants = importPreview.filter(p => !p.error);
    setParticipants(prev => [...prev, ...validParticipants]);
    setShowImportPreview(false);
  };

  // Скачивание шаблона
  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/participants_import_template.xlsx';
    link.download = 'Шаблон импорта участников.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.event_type_id) {
      newErrors.event_type_id = 'Тип мероприятия обязателен';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Дата начала обязательна';
    }

    if (formData.end_date && formData.start_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      newErrors.end_date = 'Дата окончания не может быть раньше даты начала';
    }

    if (formData.max_participants && parseInt(formData.max_participants) < 1) {
      newErrors.max_participants = 'Количество участников должно быть больше 0';
    }

    // Проверка участников на шаге 2
    if (step === 2 && participants.length === 0) {
      newErrors.participants = 'Необходимо добавить хотя бы одного участника';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработчик перехода к следующему шагу
  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setStep(2);
  };

  // Обработчик возврата к предыдущему шагу
  const prevStep = () => {
    setStep(1);
  };

  // Финальное сохранение мероприятия и добавление участников
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    setLoading(true);

    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_type_id: formData.event_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        location: formData.location.trim() || null,
        meeting_link: formData.meeting_link.trim() || null,
        points: parseInt(formData.points.toString()) || 0,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        status: formData.status,
        creator_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (editingEvent) {
        // Обновление существующего мероприятия
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);
        
        // Если есть участники, добавляем их
        if (participants.length > 0) {
          // Удаляем существующих участников
          await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', editingEvent.id);
            
          // Добавляем новых участников
          const participantsData = participants.map(p => ({
            event_id: editingEvent.id,
            user_id: p.id,
            attended: false
          }));
          
          await supabase
            .from('event_participants')
            .insert(participantsData);
        }

        if (error) throw error;
      } else {
        // Создание нового мероприятия
        const { data, error } = await supabase
          .from('events')
          .insert({
            ...eventData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        
        // Если есть участники, добавляем их
        if (participants.length > 0 && data) {
          const finalParticipants = [];
          
          for (const participant of participants) {
            // Если у участника уже есть id, используем его
            if (participant.id) {
              finalParticipants.push({
                event_id: data.id,
                user_id: participant.id,
                attended: false
              });
              continue;
            }
            
            // Ищем существующего пользователя по email или SAP
            let existingUser = null;
            
            if (participant.email) {
              const { data: userByEmail } = await supabase
                .from('users')
                .select('id')
                .eq('email', participant.email)
                .maybeSingle();
                
              if (userByEmail) {
                existingUser = userByEmail;
              }
            }
            
            if (!existingUser && participant.sap_number) {
              const { data: userBySap } = await supabase
                .from('users')
                .select('id')
                .eq('sap_number', participant.sap_number)
                .maybeSingle();
                
              if (userBySap) {
                existingUser = userBySap;
              }
            }
            
            // Если пользователь найден, используем его id
            if (existingUser) {
              finalParticipants.push({
                event_id: data.id,
                user_id: existingUser.id,
                attended: false
              });
              continue;
            }
            
            // Если пользователь не найден, создаем нового
            try {
              // Найти ID территории по названию (если указано)
              let territoryId = null;
              if (participant.territory) {
                const matchingTerritory = territories.find(t => 
                  t.name.toLowerCase() === participant.territory.toLowerCase() ||
                  (t.region && t.region.toLowerCase() === participant.territory.toLowerCase())
                );
                if (matchingTerritory) {
                  territoryId = matchingTerritory.id;
                }
              }
              
              // Найти ID должности по названию (если указано)
              let positionId = null;
              if (participant.position) {
                const matchingPosition = positions.find(p => 
                  p.name.toLowerCase() === participant.position.toLowerCase()
                );
                if (matchingPosition) {
                  positionId = matchingPosition.id;
                }
              }
              
              // Создаем пользователя
              const result = await createRegularUser(
                participant.email || '',
                participant.full_name,
                'employee',
                '123456',
                {
                  sap_number: participant.sap_number || null,
                  phone: participant.phone || null,
                  territory_id: territoryId,
                  position_id: positionId,
                  work_experience_days: participant.work_experience_days || 0
                }
              );
              
              if (result.success && result.user) {
                finalParticipants.push({
                  event_id: data.id,
                  user_id: result.user.id,
                  attended: false
                });
                
                console.log(`Создан новый пользователь: ${participant.full_name} (ID: ${result.user.id})`);
              } else {
                console.error('Ошибка создания пользователя:', result.message);
                setErrors({
                  submit: `Ошибка создания пользователя ${participant.full_name}: ${result.message}`
                });
              }
            } catch (error) {
              console.error('Ошибка создания пользователя:', error);
              
              if (typeof error === 'object' && error !== null) {
                const errorMessage = (error as Error).message || 'Неизвестная ошибка';
                setErrors({
                  submit: `Ошибка создания пользователя ${participant.full_name}: ${errorMessage}`
                });
              }
            }
          }
          
          // Если у нас есть участники для добавления
          if (finalParticipants.length > 0) {
            const { error: participantsError } = await supabase
              .from('event_participants')
              .insert(finalParticipants);

            if (participantsError) throw participantsError;
          } else if (participants.length > 0) {
            // Все участники не были добавлены
            throw new Error("Не удалось добавить ни одного участника. Проверьте данные участников.");
          }
        }

      }

      onSuccess();
    } catch (error) {
      console.error('Error saving event:', error);
      setErrors({ submit: 'Ошибка при сохранении мероприятия' });
    } finally {
      setLoading(false);
    }
  };

  // Визуализация шагов создания мероприятия
  const renderStepIndicator = () => {
    return (
      <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
        <div 
          className={`flex items-center ${step === 1 ? 'text-blue-600' : 'text-gray-400'}`}
          onClick={() => step > 1 && setStep(1)}
          style={{cursor: step > 1 ? 'pointer' : 'default'}}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
            step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="font-medium">Информация</span>
        </div>
        <div className="w-10 h-px bg-gray-300 mx-2"></div>
        <div className={`flex items-center ${step === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
            step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="font-medium">Участники</span>
        </div>
      </div>
    );
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку поля при изменении
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingEvent ? 'Редактировать мероприятие' : 'Создать мероприятие'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Помощник по выбору типа мероприятия для тренеров */}
          {userProfile?.role === 'trainer' && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-blue-800 font-medium mb-2">Подсказка для тренеров</h3>
              <p className="text-blue-700 text-sm">
                Для создания мероприятий с автоматическим назначением тестов выберите:
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: "Онлайн-тренинг \"Технология эффективных продаж\"",
                      status: "published",
                      points: 100,
                    });
                  }}
                  className={clsx(
                    "px-3 py-2 border rounded-lg text-left text-sm",
                    formData.title === "Онлайн-тренинг \"Технология эффективных продаж\""
                      ? "border-blue-500 bg-blue-100"
                      : "border-gray-300 hover:bg-blue-50"
                  )}
                >
                  <strong className="block font-medium">Онлайн-тренинг</strong>
                  <span className="text-xs text-gray-600">Технология эффективных продаж</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: "Очный тренинг \"Управление территорией для развития АКБ\"",
                      status: "published",
                      points: 100,
                    });
                  }}
                  className={clsx(
                    "px-3 py-2 border rounded-lg text-left text-sm",
                    formData.title === "Очный тренинг \"Управление территорией для развития АКБ\""
                      ? "border-blue-500 bg-blue-100"
                      : "border-gray-300 hover:bg-blue-50"
                  )}
                >
                  <strong className="block font-medium">Очный тренинг</strong>
                  <span className="text-xs text-gray-600">Управление территорией для развития АКБ</span>
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Для этих типов тренингов автоматически подключаются:
                <span className="font-medium"> Входной тест, Финальный тест и Годовой тест</span> (через 3 месяца).
              </p>
            </div>
          )}
        {renderStepIndicator()}

        <form onSubmit={step === 1 ? nextStep : handleSubmit} className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Тип мероприятия */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип мероприятия *
                </label>
                <select
                  value={formData.event_type_id || ''}
                  onChange={(e) => handleChange('event_type_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                    errors.event_type_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Выберите тип мероприятия</option>
                  {eventTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name_ru || type.name}
                    </option>
                  ))}
                </select>
                {errors.event_type_id && <p className="mt-1 text-sm text-red-600">{errors.event_type_id}</p>}
              </div>
            
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название мероприятия *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Введите название мероприятия"
                  required
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                  placeholder="Опишите цели и содержание мероприятия"
                />
              </div>

              {/* Даты */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата и время начала *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => handleChange('start_date', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                        errors.start_date ? 'border-red-300' : 'border-gray-300'
                      }`}
                      required
                    />
                  </div>
                  {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата и время окончания
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => handleChange('end_date', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                        errors.end_date ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
                </div>
              </div>

              {/* Место и ссылка */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Место проведения
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                      placeholder="Адрес или название помещения"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ссылка на встречу
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="url"
                      value={formData.meeting_link}
                      onChange={(e) => handleChange('meeting_link', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                      placeholder="https://zoom.us/j/..."
                    />
                  </div>
                </div>
              </div>

              {/* Баллы и максимальное количество участников */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Максимальное количество участников
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.max_participants}
                      onChange={(e) => handleChange('max_participants', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                      placeholder="Не ограничено"
                      min="1"
                    />
                  </div>
                  {errors.max_participants && <p className="mt-1 text-sm text-red-600">{errors.max_participants}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Баллы за участие
                  </label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.points}
                      onChange={(e) => handleChange('points', parseInt(e.target.value) || 0)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              {/* Кнопка для перехода к следующему шагу */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mr-3"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sns-600 text-white rounded-lg hover:bg-sns-700 transition-colors"
                >
                  Далее: Участники
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Добавление участников
                {participants.length > 0 && (
                  <span className="ml-2 text-sm text-gray-600">({participants.length})</span>
                )}
              </h3>
              
              {/* Поиск и добавление участников */}
              <div className="space-y-4">
                <div ref={searchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Поиск участников
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Поиск по ФИО, Email или SAP номеру..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                    />
                  </div>
                  
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                          onClick={() => addParticipantFromSearch(user)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{user.full_name}</p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {user.email && <span>{user.email}</span>}
                                {user.sap_number && <span>SAP: {user.sap_number}</span>}
                              </div>
                            </div>
                            <button 
                              type="button"
                              className="p-1 text-sns-600 hover:bg-sns-100 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                addParticipantFromSearch(user);
                              }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showSearchResults && searchTerm && searchResults.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 p-4 text-center">
                      <p className="text-gray-600">Пользователи не найдены</p>
                    </div>
                  )}
                </div>

                {/* Импорт из Excel */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet size={20} className="text-green-600" />
                      <h4 className="text-sm font-medium text-gray-900">Импорт из Excel</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={downloadTemplate}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <Download size={14} />
                        <span>Скачать шаблон</span>
                      </button>
                      <label className="px-3 py-1.5 bg-sns-500 text-white rounded-lg hover:bg-sns-600 transition-colors cursor-pointer text-sm flex items-center space-x-1">
                        <Upload size={14} />
                        <span className="whitespace-nowrap">Загрузить файл</span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".xlsx"
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Загрузите файл Excel с данными участников. Используйте шаблон для правильного форматирования данных.
                  </div>
                  
                  {importErrors.length > 0 && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <X size={16} className="text-red-500 mr-2" />
                        <h5 className="text-sm font-medium text-red-800">Ошибки импорта</h5>
                      </div>
                      <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                        {importErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Предпросмотр импорта */}
                {showImportPreview && importPreview.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Предпросмотр импорта: {importPreview.length} участников
                      </h4>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowImportPreview(false)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={confirmImport}
                          className="text-sm text-sns-600 hover:text-sns-700 flex items-center space-x-1"
                          disabled={importPreview.every(p => p.error)}
                        >
                          <Check size={14} className="mr-1" />
                          <span>Подтвердить</span>
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SAP / Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Статус</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importPreview.map((participant, idx) => (
                            <tr key={idx} className={participant.error ? 'bg-red-50' : ''}>
                              <td className="px-3 py-2 text-sm">{participant.full_name}</td>
                              <td className="px-3 py-2 text-sm">
                                {participant.email && <div className="text-blue-600">{participant.email}</div>}
                                {participant.sap_number && <div className="text-gray-600 text-xs">SAP: {participant.sap_number}</div>}
                              </td>
                              <td className="px-3 py-2 text-sm">{participant.position?.name || '-'}</td>
                              <td className="px-3 py-2 text-xs text-center">
                                {participant.error ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Ошибка
                                    {participant.error && <span className="ml-1 text-xs">: {participant.error}</span>}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Готов к импорту
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 flex items-center">
                      <X size={14} className="mr-1 text-amber-500" />
                      Участники с ошибками не будут импортированы. Исправьте данные в файле и загрузите снова.
                    </div>
                  </div>
                )}

                {/* Список участников */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      Участники ({participants.length})
                    </h4>
                    {participants.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setParticipants([])}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Очистить
                      </button>
                    )}
                  </div>

                  {participants.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Users size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 text-sm">
                        Нет добавленных участников. Используйте поиск или импорт из Excel.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SAP / Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Должность</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {participants.map((participant, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm">{participant.full_name}</td>
                              <td className="px-3 py-2 text-sm">
                                {participant.email && <div className="text-blue-600">{participant.email}</div>}
                                {participant.sap_number && <div className="text-gray-600 text-xs">SAP: {participant.sap_number}</div>}
                              </td>
                              <td className="px-3 py-2 text-sm hidden md:table-cell">{participant.position?.name || '-'}</td>
                              <td className="px-3 py-2 text-sm text-center">
                                <button
                                  type="button"
                                  onClick={() => removeParticipant(idx)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {errors.participants && (
                    <p className="mt-1 text-sm text-red-600">{errors.participants}</p>
                  )}
                </div>
              </div>
              
              {/* Кнопки навигации */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Назад
                </button>
                
                <div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mr-3"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-sns-600 text-white rounded-lg hover:bg-sns-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>{editingEvent ? 'Сохранить' : 'Создать'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

        </form>
      </div>

      </div>
    </div>
  );
}