import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Star, LinkIcon, Save, Upload, Download, Search, Plus, FileSpreadsheet, User, Check, CalendarDays, Building2, UserCheck, Target, ChevronLeft, ArrowRight, Sparkles, ChevronRight, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthBFF } from '../../hooks/useAuthBFF';
import { ExamTypeSelector } from './ExamTypeSelector';
import { createRegularUser, findUserByEmail } from '../../lib/userManagement';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { motion } from 'framer-motion';
import { uploadEventFile, updateEventFileName, getEventFiles, deleteEventFile } from '../../lib/eventFileStorage';
import { createEventNotification, createNotificationForRole } from '../../utils/notificationUtils';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingEvent?: any;
  defaultEventType?: 'online' | 'offline' | 'exam';
}

export function CreateEventModal({ isOpen, onClose, onSuccess, editingEvent, defaultEventType }: CreateEventModalProps) {
  const { user, userProfile } = useAuthBFF();
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

  const [eventFiles, setEventFiles] = useState<Array<{
    id: string;
    file: File | null;
    type: 'presentation' | 'workbook';
    name: string;
    url?: string;
    size?: number;
  }>>([]);
  const [editingFileName, setEditingFileName] = useState<string | null>(null);
  const [editingFileNameValue, setEditingFileNameValue] = useState<string>('');
  const [fileTypeSelection, setFileTypeSelection] = useState<{
    isOpen: boolean;
    file: File | null;
  }>({ isOpen: false, file: null });

  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<any | null>(null);
  const [eventType, setEventType] = useState<'online' | 'offline' | 'exam' | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
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
  
  // Состояние для экзамена
  const [examData, setExamData] = useState({
    talentCategory: null as any,
    groupName: '',
    expertEmails: [] as string[],
    experts: [] as Array<{
      id: string;
      fullName: string;
      position: string;
      email: string;
    }>,
  });
  const [sapAnalysis, setSapAnalysis] = useState<{
    existing: string[];
    new: string[];
    total: number;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Отладочная информация
  console.log('CreateEventModal: Рендер с eventType:', eventType, 'eventTypes:', eventTypes);
  console.log('CreateEventModal: isOpen:', isOpen, 'defaultEventType:', defaultEventType, 'editingEvent:', editingEvent);

  // Загружаем типы мероприятий при монтировании компонента
  useEffect(() => {
    fetchEventTypes();
  }, []);

  // Устанавливаем тип мероприятия по умолчанию
  useEffect(() => {
    if (isOpen && defaultEventType && !editingEvent && eventTypes.length > 0) {
      console.log('Устанавливаем тип мероприятия по умолчанию:', defaultEventType);
      
      if (defaultEventType === 'exam') {
        setEventType('exam');
        const examType = eventTypes.find(type => 
          type.name === 'exam_talent_reserve' || 
          type.name_ru === 'Экзамен кадрового резерва'
        );
        console.log('Найденный тип экзамена для defaultEventType:', examType);
        if (examType) {
          console.log('Устанавливаем formData для экзамена с event_type_id:', examType.id);
          setFormData(prev => ({
            ...prev,
            title: "Экзамен кадрового резерва",
            description: "Комплексная оценка кандидатов в кадровый резерв",
            event_type_id: examType.id,
            status: "draft",
            points: 0,
          }));
          setExamData({
            talentCategory: null,
            groupName: '',
            expertEmails: [],
            experts: [],
          });
          console.log('formData установлен для экзамена');
        } else {
          console.log('Тип экзамена не найден в eventTypes');
        }
      }
    }
  }, [isOpen, defaultEventType, editingEvent, eventTypes]);

  // Сброс состояния при закрытии модального окна
  useEffect(() => {
    if (!isOpen) {
      setEventType(null);
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
      setExamData({
        talentCategory: null,
        groupName: '',
        expertEmails: [],
        experts: [],
      });
    }
  }, [isOpen]);

  // Заполняем форму при редактировании
  useEffect(() => {
    const initializeForm = async () => {
    if (editingEvent) {
        console.log('Редактирование мероприятия:', editingEvent);
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

        // Определяем eventType для тренеров на основе существующего типа мероприятия
        if (userProfile?.role === 'trainer' && editingEvent.event_types) {
          const typeName = editingEvent.event_types.name;
          const isOnline = editingEvent.event_types.is_online;
          console.log('Определяем тип мероприятия:', { typeName, isOnline, eventType: editingEvent.event_types });
          
          if (typeName === 'online_training' || (typeName === 'in_person_training' && isOnline === true)) {
            setEventType('online');
          } else if (typeName === 'offline_training' || (typeName === 'in_person_training' && isOnline === false)) {
            setEventType('offline');
          }
        }

        // Обработка экзаменов кадрового резерва
        if (editingEvent.event_types?.name === 'exam_talent_reserve') {
          console.log('Редактирование экзамена кадрового резерва:', editingEvent);
          setEventType('exam');
          
          // Загружаем данные экзамена
          setExamData({
            talentCategory: editingEvent.talent_category ? {
              id: editingEvent.talent_category.id,
              name_ru: editingEvent.talent_category.name_ru,
              color: editingEvent.talent_category.color
            } : null,
            groupName: editingEvent.group_name || '',
            expertEmails: editingEvent.expert_emails || [],
            experts: editingEvent.expert_emails ? editingEvent.expert_emails.map((email: string, index: number) => ({
              id: `expert-${index}`,
              fullName: `Эксперт ${index + 1}`,
              position: 'Эксперт',
              email: email
            })) : []
          });
        }

        // Загружаем участников мероприятия
        console.log('🔄 Загружаем участников для редактирования...');
        console.log('editingEvent.event_participants:', editingEvent.event_participants);
        if (editingEvent.event_participants && editingEvent.event_participants.length > 0) {
          const participantsData = editingEvent.event_participants.map((ep: any) => ({
            id: ep.user_id,
            full_name: ep.users?.full_name || '',
            email: ep.users?.email || '',
            sap_number: ep.users?.sap_number || '',
            position: '', // Будет загружено отдельно
            territory: '' // Будет загружено отдельно
          }));
          console.log('✅ Участники загружены:', participantsData);
          setParticipants(participantsData);
          
          // Загружаем должности и территории участников отдельно
          if (participantsData.length > 0) {
            await loadParticipantDetails(participantsData);
          }
        } else {
          console.log('⚠️ Нет участников или пустой массив');
          setParticipants([]);
        }

        // Загружаем существующие файлы
        console.log('Загружаем файлы для мероприятия:', editingEvent.id);
        await loadEventFiles(editingEvent.id);
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
        setParticipants([]);
        setEventFiles([]);
    }
    
    // Reset participants when modal is opened/closed
    if (isOpen) {
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
    };

    initializeForm();
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
      console.log('🔄 Загружаем типы мероприятий...');
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .order('name_ru');

      if (error) {
        console.error('❌ Ошибка загрузки типов мероприятий:', error);
        throw error;
      }
      
      setEventTypes(data || []);
      console.log('✅ Загружены типы мероприятий:', data);
      
      // Проверяем наличие экзамена кадрового резерва
      const examType = data?.find(type => 
        type.name === 'exam_talent_reserve' || 
        type.name_ru === 'Экзамен кадрового резерва'
      );
      console.log('Найденный тип экзамена кадрового резерва:', examType);
      
      // Отладочная информация для тренеров
      if (userProfile?.role === 'trainer') {
        const onlineTypes = data?.filter(type => 
          type.name === 'online_training' || 
          type.name_ru === 'Онлайн-тренинг' ||
          (type.name === 'in_person_training' && type.is_online === true)
        );
        const offlineTypes = data?.filter(type => 
          type.name === 'offline_training' || 
          type.name_ru === 'Очный тренинг' ||
          (type.name === 'in_person_training' && type.is_online === false)
        );
        console.log('Найденные онлайн типы:', onlineTypes);
        console.log('Найденные оффлайн типы:', offlineTypes);
      }
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

  // Загрузка деталей участников (должности и территории)
  const loadParticipantDetails = async (participantsData: any[]) => {
    try {
      console.log('Загружаем детали для участников:', participantsData);
      const userIds = participantsData.map(p => p.id);
      console.log('ID участников:', userIds);
      
      // Загружаем должности
      const { data: positionsData, error: positionsError } = await supabase
        .from('users')
        .select('id, position:position_id(name)')
        .in('id', userIds);
        
      console.log('Данные должностей:', positionsData, 'Ошибка:', positionsError);
        
      // Загружаем территории
      const { data: territoriesData, error: territoriesError } = await supabase
        .from('users')
        .select('id, territory:territory_id(name)')
        .in('id', userIds);
        
      console.log('Данные территорий:', territoriesData, 'Ошибка:', territoriesError);
        
      // Обновляем участников с должностями и территориями
      const updatedParticipants = participantsData.map(participant => {
        const userPosition = positionsData?.find(u => u.id === participant.id);
        const userTerritory = territoriesData?.find(u => u.id === participant.id);
        
        return {
          ...participant,
          position: userPosition?.position || { name: '' },
          territory: userTerritory?.territory || { name: '' }
        };
      });
      
      console.log('Обновленные участники:', updatedParticipants);
      setParticipants(updatedParticipants);
    } catch (error) {
      console.error('Ошибка загрузки деталей участников:', error);
    }
  };

  // Загрузка существующих файлов мероприятия
  const loadEventFiles = async (eventId: string) => {
    try {
      console.log('Начинаем загрузку файлов для мероприятия:', eventId);
      
      // Получаем файлы из базы данных
      const files = await getEventFiles(eventId);
      
      // Преобразуем в формат для компонента
      const eventFilesData = files.map(file => ({
        id: file.id,
        name: file.name, // Используем оригинальное название с кириллицей
        type: file.type,
        file: null, // Файл уже загружен, поэтому null
        url: file.url,
        size: file.size
      }));
      
      console.log('Итоговые файлы мероприятия:', eventFilesData);
      setEventFiles(eventFilesData);
    } catch (error) {
      console.error('Ошибка загрузки файлов мероприятия:', error);
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
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Отдельный useEffect для закрытия календаря и времени
  useEffect(() => {
    function handleDropdownClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      const calendarButton = target.closest('[data-calendar-button]');
      const calendarDropdown = target.closest('[data-calendar-dropdown]');
      const timeButton = target.closest('[data-time-button]');
      const timeDropdown = target.closest('[data-time-dropdown]');
      
      if (isCalendarOpen && !calendarButton && !calendarDropdown) {
        setIsCalendarOpen(false);
      }
      
      if (isTimeOpen && !timeButton && !timeDropdown) {
        setIsTimeOpen(false);
      }
    }
    
    if (isCalendarOpen || isTimeOpen) {
      document.addEventListener("mousedown", handleDropdownClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleDropdownClickOutside);
      };
    }
  }, [isCalendarOpen, isTimeOpen]);

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
  const addParticipantFromSearch = (user: any) => {
    // Проверяем, не добавлен ли уже этот пользователь
    if (participants.some(p => p.id === user.id)) {
      return;
    }
    setParticipants([
      ...participants,
      {
        ...user,
        position: user.position || { name: '' },
        territory: user.territory || { name: '' }
      }
    ]);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Обработчик удаления участника
  const removeParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  // Обработчик импорта из Excel
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем размер файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB в байтах
    if (file.size > maxSize) {
      setImportErrors([`Файл слишком большой. Максимальный размер: 10MB. Текущий размер: ${(file.size / 1024 / 1024).toFixed(1)}MB`]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Проверяем расширение файла
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      setImportErrors(['Неподдерживаемый формат файла. Используйте .xlsx или .xls']);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setImportErrors([]);
      const data = await readExcelFile(file);
      
      if (data.length === 0) {
        setImportErrors(['Файл не содержит данных для импорта']);
        return;
      }
      
      setImportPreview(data);
      setShowImportPreview(true);
      
      // Анализируем SAP номера
      await analyzeSapNumbers(data);
    } catch (error) {
      console.error('Ошибка при чтении Excel файла:', error instanceof Error ? error.message : 'Неизвестная ошибка');
      setImportErrors([error instanceof Error ? error.message : 'Ошибка при чтении файла']);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Чтение и парсинг Excel файла
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Получаем первый лист
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Проверяем, является ли это файлом ТП
          const isTPFile = detectTPFile(firstSheet);
          
          if (isTPFile) {
            console.log('Обнаружен файл ТП, используем специальный парсер');
            const tpData = parseTPFile(firstSheet);
            resolve(tpData);
            return;
          }
          
          // Сначала пробуем найти заголовки в файле
          let headerRow = 0;
          let jsonData: any[] = [];
          
          // Ищем строку с заголовками (обычно это строки 1-15)
          for (let i = 0; i < 15; i++) {
            const testData = XLSX.utils.sheet_to_json(firstSheet, { range: i, header: 1 });
            if (testData.length > 0) {
              const firstRow = testData[0] as any[];
              if (firstRow && firstRow.some(cell => 
                typeof cell === 'string' && 
                (cell.toLowerCase().includes('фио') || 
                 cell.toLowerCase().includes('имя') || 
                 cell.toLowerCase().includes('full name') ||
                 cell.toLowerCase().includes('фамилия'))
              )) {
                headerRow = i;
                jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: i + 1 });
                break;
              }
            }
          }
          
          // Если заголовки не найдены, используем старый метод (начиная с 13-й строки)
          if (jsonData.length === 0) {
            jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 12 });
          }
          
          if (jsonData.length === 0) {
            throw new Error('Файл не содержит данных. Убедитесь, что файл соответствует шаблону.');
          }
          
          // Определяем маппинг колонок
          const firstRow = jsonData[0];
          const columnMapping = detectColumnMapping(firstRow);
          
          // Преобразуем данные в формат участников
          const parsedData = jsonData.map((row: any, index) => {
            const fullName = getColumnValue(row, columnMapping.fullName) || '';
            const sapNumber = getColumnValue(row, columnMapping.sapNumber) || '';
            const position = getColumnValue(row, columnMapping.position) || '';
            const territory = getColumnValue(row, columnMapping.territory) || '';
            const experience = getColumnValue(row, columnMapping.experience) || 0;
            const phone = getColumnValue(row, columnMapping.phone) || '';
            const email = getColumnValue(row, columnMapping.email) || '';
            
            // Валидируем обязательные поля
            let error = null;
            if (!fullName.trim()) {
              error = 'Отсутствует ФИО';
            } else if (!email.trim() && !sapNumber.trim()) {
              error = 'Необходимо указать либо Email, либо SAP номер';
            } else if (email && !isValidEmail(email)) {
              error = 'Неверный формат Email';
            }
            
            return {
              full_name: fullName.trim(),
              sap_number: sapNumber.trim() || null,
              position: { name: position.trim() },
              territory: { name: territory.trim() },
              work_experience_days: parseInt(experience.toString()) || 0,
              phone: phone.trim(),
              email: email.trim() || null,
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

  // Функция для определения файла ТП
  const detectTPFile = (worksheet: any): boolean => {
    try {
      // Проверяем первые строки на наличие ключевых слов ТП
      for (let row = 0; row < 15; row++) {
        const rowData = [];
        for (let col = 0; col < 15; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          const value = cell ? cell.v : '';
          rowData.push(value);
        }
        
        const rowText = rowData.join(' ').toLowerCase();
        if (rowText.includes('торговый представитель') || 
            rowText.includes('список тп') || 
            rowText.includes('филиал тп') ||
            rowText.includes('sap id') ||
            rowText.includes('стаж работы тп') ||
            rowText.includes('фио тп') ||
            rowText.includes('должность тп') ||
            rowText.includes('онлайн тренинге') ||
            rowText.includes('эффективные продажи')) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Функция для парсинга файла ТП
  const parseTPFile = (worksheet: any): any[] => {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const tpData = [];
    
    // Ищем данные ТП начиная с 13-й строки
    for (let row = 12; row <= range.e.r; row++) {
      const rowData = [];
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        const value = cell ? cell.v : '';
        rowData.push(value);
      }
      
      // Проверяем, что это строка с данными ТП (есть номер и ФИО)
      if (rowData[0] && !isNaN(rowData[0]) && rowData[1] && typeof rowData[1] === 'string' && rowData[1].length > 5) {
        const fullName = rowData[1] || '';
        const sapNumber = rowData[2] || '';
        const position = rowData[3] || '';
        const territory = rowData[4] || '';
        const experience = rowData[5] || 0;
        const phone = rowData[7] || '';
        const status = rowData[8] || '';
        
        // Валидируем обязательные поля
        let error = null;
        if (!fullName.trim()) {
          error = 'Отсутствует ФИО';
        } else if (!sapNumber.toString().trim()) {
          error = 'Отсутствует SAP номер';
        }
        
        // Создаем email на основе SAP номера (если нет ошибок)
        const email = !error ? `${sapNumber}@sns.ru` : null;
        
        tpData.push({
          full_name: fullName.trim(),
          sap_number: sapNumber.toString().trim(),
          position: { name: position.trim() },
          territory: { name: territory.trim() },
          work_experience_days: parseInt(experience.toString()) || 0,
          phone: phone.toString().trim(),
          email: email,
          approval_status: status.toString().trim(), // Статус согласования
          error,
          is_tp: true, // Флаг для идентификации ТП
          import_status: error ? 'error' : 'new'
        });
      }
    }
    
    return tpData;
  };

  // Функция для определения маппинга колонок
  const detectColumnMapping = (firstRow: any) => {
    const keys = Object.keys(firstRow);
    const mapping: any = {};
    
    keys.forEach(key => {
      const value = firstRow[key];
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        
        if (lowerValue.includes('фио') || lowerValue.includes('имя') || lowerValue.includes('full name') || lowerValue.includes('фамилия')) {
          mapping.fullName = key;
        } else if (lowerValue.includes('sap') || lowerValue.includes('сап') || lowerValue.includes('номер')) {
          mapping.sapNumber = key;
        } else if (lowerValue.includes('должность') || lowerValue.includes('position') || lowerValue.includes('профессия')) {
          mapping.position = key;
        } else if (lowerValue.includes('филиал') || lowerValue.includes('территория') || lowerValue.includes('territory') || lowerValue.includes('регион')) {
          mapping.territory = key;
        } else if (lowerValue.includes('опыт') || lowerValue.includes('experience') || lowerValue.includes('стаж')) {
          mapping.experience = key;
        } else if (lowerValue.includes('телефон') || lowerValue.includes('phone') || lowerValue.includes('тел')) {
          mapping.phone = key;
        } else if (lowerValue.includes('email') || lowerValue.includes('почта') || lowerValue.includes('e-mail')) {
          mapping.email = key;
        }
      }
    });
    
    // Если маппинг не найден, используем старые ключи
    if (!mapping.fullName) mapping.fullName = '__EMPTY_1';
    if (!mapping.sapNumber) mapping.sapNumber = '__EMPTY_2';
    if (!mapping.position) mapping.position = '__EMPTY_3';
    if (!mapping.territory) mapping.territory = '__EMPTY_4';
    if (!mapping.experience) mapping.experience = '__EMPTY_5';
    if (!mapping.phone) mapping.phone = '__EMPTY_7';
    if (!mapping.email) mapping.email = '__EMPTY_8';
    
    return mapping;
  };

  // Функция для получения значения из колонки
  const getColumnValue = (row: any, columnKey: string) => {
    if (columnKey.startsWith('__EMPTY_')) {
      return row[columnKey];
    }
    return row[columnKey];
  };

  // Функция валидации email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Подтверждение импорта
  // Обновление данных пользователя
  const updateUserData = async (userId: string, participant: any) => {
    let updatedFields = 0;
    try {
      // Найти ID территории по названию (если указано)
      let territoryId = null;
      if (participant.territory) {
        const territoryName = typeof participant.territory === 'string' 
          ? participant.territory 
          : participant.territory.name || participant.territory.region || '';
        
        if (territoryName) {
          const matchingTerritory = territories.find(t => 
            t.name.toLowerCase() === territoryName.toLowerCase() ||
            (t.region && t.region.toLowerCase() === territoryName.toLowerCase())
          );
          if (matchingTerritory) {
            territoryId = matchingTerritory.id;
          }
        }
      }
      
      // Найти ID должности по названию (если указано)
      let positionId = null;
      if (participant.position) {
        const positionName = typeof participant.position === 'string' 
          ? participant.position 
          : participant.position.name || '';
        
        if (positionName) {
          // Сначала ищем точное совпадение
          let matchingPosition = positions.find(p => 
            p.name.toLowerCase() === positionName.toLowerCase()
          );
          
          // Если точное совпадение не найдено, ищем похожие должности
          if (!matchingPosition) {
            const lowerPositionName = positionName.toLowerCase();
            
            // Логика для торговых представителей
            if (lowerPositionName.includes('торговый представитель')) {
              matchingPosition = positions.find(p => 
                p.name.toLowerCase().includes('торговый представитель')
              );
            }
          }
          
          if (matchingPosition) {
            positionId = matchingPosition.id;
          }
        }
      }
      
      // Подготавливаем данные для обновления
      const updateData: any = {};
      
      if (positionId) {
        updateData.position_id = positionId;
        updatedFields++;
      }
      if (territoryId) {
        updateData.territory_id = territoryId;
        updatedFields++;
      }
      if (participant.phone) {
        updateData.phone = participant.phone;
        updatedFields++;
      }
      if (participant.work_experience_days) {
        updateData.work_experience_days = participant.work_experience_days;
        updatedFields++;
      }
      
      // Обновляем только если есть что обновлять
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);
        
        if (updateError) {
          console.error('❌ Ошибка обновления пользователя:', updateError);
          return false;
        }
        
        console.log(`✅ Обновлены данные пользователя ${participant.full_name} (${updatedFields} полей):`, updateData);
        return updatedFields > 0;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка обновления данных пользователя:', error);
      return false;
    }
  };

  // Анализ SAP номеров
  const analyzeSapNumbers = async (participants: any[]) => {
    const sapNumbers = participants
      .filter(p => p.sap_number && !p.error)
      .map(p => p.sap_number);
    
    if (sapNumbers.length === 0) {
      setSapAnalysis({ existing: [], new: sapNumbers, total: 0 });
      return;
    }
    
    try {
      // Проверяем существующие SAP номера в базе
      const { data: existingUsers, error } = await supabase
        .from('users')
        .select('sap_number')
        .in('sap_number', sapNumbers)
        .not('sap_number', 'is', null);
      
      if (error) {
        console.error('Ошибка проверки SAP номеров:', error);
        return;
      }
      
      const existingSapNumbers = existingUsers?.map(u => u.sap_number) || [];
      const newSapNumbers = sapNumbers.filter(sap => !existingSapNumbers.includes(sap));
      
      setSapAnalysis({
        existing: existingSapNumbers,
        new: newSapNumbers,
        total: sapNumbers.length
      });
      
      console.log('📊 Анализ SAP номеров:', {
        total: sapNumbers.length,
        existing: existingSapNumbers.length,
        new: newSapNumbers.length,
        existingSap: existingSapNumbers,
        newSap: newSapNumbers
      });
      
    } catch (error) {
      console.error('Ошибка анализа SAP номеров:', error);
    }
  };

  const confirmImport = () => {
    const validParticipants = importPreview.filter(p => !p.error);
    setParticipants(prev => [...prev, ...validParticipants]);
    setShowImportPreview(false);
  };

  // Скачивание шаблона
  const downloadTemplate = () => {
    // Создаем шаблон Excel файла программно
    const workbook = XLSX.utils.book_new();
    
    // Создаем данные для шаблона
    const templateData = [
              ['ФИО', 'SAP номер', 'Должность', 'Филиал', 'Опыт работы (дни)', '', 'Телефон', 'Email'],
      ['Иванов Иван Иванович', '12345', 'Менеджер', 'Москва', '365', '', '+7900123456', 'ivanov@example.com'],
      ['Петров Петр Петрович', '67890', 'Специалист', 'Санкт-Петербург', '180', '', '+7900987654', 'petrov@example.com'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Устанавливаем ширину колонок
    worksheet['!cols'] = [
      { width: 25 }, // ФИО
      { width: 12 }, // SAP номер
      { width: 20 }, // Должность
              { width: 20 }, // Филиал
      { width: 18 }, // Опыт работы
      { width: 5 },  // Пустая колонка
      { width: 15 }, // Телефон
      { width: 25 }  // Email
    ];
    
    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Участники');
    
    // Генерируем файл и скачиваем
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Шаблон_импорта_участников.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Очищаем URL
    URL.revokeObjectURL(url);
  };

  // Скачивание шаблона для ТП
  const downloadTPTemplate = () => {
    const workbook = XLSX.utils.book_new();
    
    // Создаем данные для шаблона ТП
    const templateData = [
      ['', '', '', '', 'Департамент обучения и развития персонала', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Список ТП стажем от 30 до 120 дней, участвующих в онлайн тренинге', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', 'ФИО тренера СПП', '', 'Иванов Иван Иванович', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Филиал', '', 'СНС-Москва', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Дата', '', '01.01.2025', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Время проведения', '', 'с 09:00 до 13:00', '', '', '', '', '', '', '', '', '', ''],
      ['', 'Место проведения', '', 'ZOOM, онлайн тренинг', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', 'Филиал ТП', 'SAP ID', 'ФИО ТП (полностью)', 'Должность ТП из SAP'],
      ['Список ТП стажем от 30 до 120 дней, ранее не обучавшихся на онлайн тренинге', '', '', '', '', 'Обучение данных ТП в онлайн тренинге обязательно', '', '', '', '', '', '', '', ''],
      ['№ пп', 'ФИО ТП (полностью)', 'SAP ID', 'Должность ТП из SAP', 'Филиал ТП', 'Общий стаж работы ТП в должн. на момент провед. онлайн тренинга (в днях)', 'Комментарии ГДф о согласовании и причинах пропуска онлайн тренинга', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', 'Согласован или Не согласован', 'Тел. ТП', 'Причина не согласования (больничный, плановое лечение, увольнение)', '', '', '', '', '', ''],
      ['1', 'ПОЛТАРАЦКИХ Геннадий Алексеевич', '50161090', 'Торговый представитель', 'СНС-Барнаул', '129', '', '79017801500', 'Увольняется', '', '', '', '', '', ''],
      ['2', 'БОЕВА Алена Геннадьевна', '50161250', 'Торговый представитель', 'СНС-Красноярск', '114', '', '79017801500', '', '', '', '', '', '', ''],
      ['3', 'БУБНОВА Виктория Викторовна', '50161418', 'Торговый представитель УДФ', 'СНС-Новокузнецк', '100', '', '79017801500', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Устанавливаем ширину колонок
    worksheet['!cols'] = [
      { width: 8 },  // № пп
      { width: 30 }, // ФИО ТП
      { width: 12 }, // SAP ID
      { width: 25 }, // Должность
      { width: 20 }, // Филиал ТП
      { width: 35 }, // Стаж работы
      { width: 40 }, // Комментарии
      { width: 8 },  // Пустая
      { width: 15 }, // Телефон
      { width: 40 }, // Причина не согласования
      { width: 8 },  // Пустая
      { width: 8 },  // Пустая
      { width: 8 },  // Пустая
      { width: 15 }, // Филиал ТП (дубликат)
      { width: 12 }, // SAP ID (дубликат)
      { width: 30 }  // ФИО ТП (дубликат)
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Списки ТП');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Шаблон_списка_ТП.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    console.log('validateForm: Начало валидации');
    console.log('formData.event_type_id:', formData.event_type_id);
    console.log('eventType:', eventType);

    // Для экзаменов кадрового резерва event_type_id может быть не установлен сразу
    if (!formData.event_type_id && !(defaultEventType === 'exam' && eventType === 'exam')) {
      newErrors.event_type_id = 'Тип мероприятия обязателен';
      console.log('validateForm: Ошибка - не выбран тип мероприятия');
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

    // Валидация для экзамена
    if (eventType === 'exam') {
      console.log('validateForm: Валидация экзамена');
      console.log('examData.talentCategory:', examData.talentCategory);
      console.log('examData.groupName:', examData.groupName);
      console.log('examData.experts:', examData.experts);
      
      if (!examData.talentCategory) {
        newErrors.talentCategory = 'Выберите категорию талантов';
        console.log('validateForm: Ошибка - не выбрана категория талантов');
      }
      if (!examData.groupName.trim()) {
        newErrors.groupName = 'Название группы обязательно';
        console.log('validateForm: Ошибка - не указано название группы');
      }
      if (examData.experts.length === 0) {
        newErrors.expertEmails = 'Добавьте хотя бы одного эксперта';
        console.log('validateForm: Ошибка - не добавлены эксперты');
      }
    }

    // Проверка участников на шаге 2
    if (step === 2 && participants.length === 0) {
      newErrors.participants = 'Необходимо добавить хотя бы одного участника';
    }

    setErrors(newErrors);
    console.log('validateForm: Результат валидации:', Object.keys(newErrors).length === 0);
    console.log('validateForm: Ошибки:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработчик перехода к следующему шагу
  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('nextStep: Проверка формы...');
    console.log('formData:', formData);
    console.log('eventType:', eventType);
    console.log('examData:', examData);
    
    // Для экзаменов кадрового резерва убеждаемся, что event_type_id установлен
    if (defaultEventType === 'exam' && eventType === 'exam' && !formData.event_type_id) {
      console.log('nextStep: Устанавливаем event_type_id для экзамена');
      const examType = eventTypes.find(type => 
        type.name === 'exam_talent_reserve' || 
        type.name_ru === 'Экзамен кадрового резерва'
      );
      if (examType) {
        setFormData(prev => ({
          ...prev,
          event_type_id: examType.id
        }));
        console.log('nextStep: event_type_id установлен:', examType.id);
      }
    }
    
    if (!validateForm()) {
      console.log('nextStep: Валидация не прошла, ошибки:', errors);
      return;
    }
    
    console.log('nextStep: Валидация прошла, переходим к шагу 2');
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
    
    console.log(`🚀 Начало сохранения мероприятия. Участников: ${participants.length}`);
    console.log('📋 Участники:', participants.map(p => ({ name: p.full_name, id: p.id, email: p.email, sap: p.sap_number })));

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
        // Данные для экзамена
        ...(eventType === 'exam' && examData.talentCategory && {
          talent_category_id: examData.talentCategory.id,
          group_name: examData.groupName,
          expert_emails: examData.expertEmails,
        }),
        creator_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      let eventId;

      if (editingEvent) {
        // Обновление существующего мероприятия
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);
        
        if (error) throw error;
        eventId = editingEvent.id;
        
        // Создание учетных записей для экспертов при обновлении экзамена
        if (eventType === 'exam' && examData.experts && examData.experts.length > 0) {
          
          for (const expert of examData.experts) {
            try {
              // Пытаемся создать пользователя - функция сама обработает случай существующего пользователя
              
              const result = await createRegularUser(
                expert.email,
                expert.fullName,
                'expert', // Используем роль 'expert' после добавления в enum
                '123456', // Пароль по умолчанию
                {
                  sap_number: '', // У экспертов может не быть SAP номера
                  territory_id: userProfile?.territory_id || null, // Привязываем к территории создателя
                  position_id: null, // Позиция будет установлена отдельно
                  work_experience_days: 0
                }
              );

              if (!result.success) {
                console.error(`❌ Не удалось обработать эксперта ${expert.fullName}:`, result.message);
              }
            } catch (error) {
              console.error(`❌ Ошибка при обработке эксперта ${expert.fullName}:`, error);
            }
          }
        }
        
        // Если есть участники, обновляем их
        if (participants.length > 0) {
          console.log(`🔄 Обновление участников для существующего мероприятия (ID: ${editingEvent.id})`);
          
          // Получаем существующих участников
          const { data: existingParticipants, error: existingError } = await supabase
            .from('event_participants')
            .select('user_id')
            .eq('event_id', editingEvent.id);
          
          if (existingError) {
            console.error('❌ Ошибка получения существующих участников:', existingError);
            throw existingError;
          }
          
          console.log(`📋 Существующие участники:`, existingParticipants);
          
          const existingUserIds = existingParticipants?.map(p => p.user_id) || [];
          const newUserIds = participants.map(p => p.id).filter(id => id && !existingUserIds.includes(id));
          
          console.log(`🔍 Существующие ID:`, existingUserIds);
          console.log(`🆕 Новые ID:`, newUserIds);
          console.log(`📊 Детали участников:`, participants.map(p => ({
            name: p.full_name,
            id: p.id,
            email: p.email,
            sap: p.sap_number,
            hasId: !!p.id
          })));
          
          // Обрабатываем всех участников для обновления данных
          console.log(`🔄 Обработка ${participants.length} участников для обновления данных`);
          
          // Обновляем данные существующих пользователей
          for (const participant of participants) {
            if (participant.id) {
              console.log(`🔄 Обновление данных существующего пользователя: ${participant.full_name}`);
              await updateUserData(participant.id, participant);
            }
          }
          
          // Обрабатываем участников без ID (новые пользователи)
          const participantsWithoutId = participants.filter(p => !p.id);
          console.log(`🆕 Участников без ID (требуют создания): ${participantsWithoutId.length}`);
          
          if (participantsWithoutId.length > 0) {
            console.log(`👥 Начинаем создание новых пользователей...`);
            const finalParticipants = [];
            
            for (const participant of participantsWithoutId) {
              console.log(`🔍 Обработка участника: ${participant.full_name} (Email: ${participant.email}, SAP: ${participant.sap_number})`);
              console.log(`📊 Структура данных участника:`, {
                full_name: participant.full_name,
                email: participant.email,
                sap_number: participant.sap_number,
                territory: participant.territory,
                position: participant.position,
                phone: participant.phone,
                work_experience_days: participant.work_experience_days
              });
              
              // Ищем существующего пользователя по email или SAP
              let existingUser = null;
              
              if (participant.email) {
                console.log(`🔍 Поиск пользователя по email: ${participant.email}`);
                const { data: userByEmail } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', participant.email)
                  .maybeSingle();
                  
                if (userByEmail) {
                  existingUser = userByEmail;
                  console.log(`✅ Найден пользователь по email: ${participant.email} (ID: ${userByEmail.id})`);
                }
              }
              
              if (!existingUser && participant.sap_number) {
                console.log(`🔍 Поиск пользователя по SAP: ${participant.sap_number}`);
                const { data: userBySap } = await supabase
                  .from('users')
                  .select('id')
                  .eq('sap_number', participant.sap_number)
                  .maybeSingle();
                  
                if (userBySap) {
                  existingUser = userBySap;
                  console.log(`✅ Найден пользователь по SAP: ${participant.sap_number} (ID: ${userBySap.id})`);
                }
              }
              
                          // Если пользователь найден, используем его id и обновляем данные
            if (existingUser) {
              finalParticipants.push({
                event_id: editingEvent.id,
                user_id: existingUser.id,
                attended: false
              });
              console.log(`✅ Используем найденного пользователя: ${participant.full_name} (ID: ${existingUser.id})`);
              
              // Обновляем данные пользователя
              await updateUserData(existingUser.id, participant);
              continue;
            }
              
              // Если пользователь не найден, создаем нового
              console.log(`🆕 Создание нового пользователя: ${participant.full_name}`);
              try {
                // Найти ID территории по названию (если указано)
                let territoryId = null;
                if (participant.territory) {
                  // Получаем название территории (может быть строкой или объектом)
                  const territoryName = typeof participant.territory === 'string' 
                    ? participant.territory 
                    : participant.territory.name || participant.territory.region || '';
                  
                  console.log(`🔍 Поиск территории: "${territoryName}" (тип: ${typeof participant.territory})`);
                  
                  if (territoryName) {
                    // Сначала ищем точное совпадение
                    let matchingTerritory = territories.find(t => 
                      t.name.toLowerCase() === territoryName.toLowerCase() ||
                      (t.region && t.region.toLowerCase() === territoryName.toLowerCase())
                    );
                    
                    // Если точное совпадение не найдено, ищем похожие территории
                    if (!matchingTerritory) {
                      const lowerTerritoryName = territoryName.toLowerCase();
                      
                      // Ищем территории, содержащие ключевые слова
                      matchingTerritory = territories.find(t => 
                        t.name.toLowerCase().includes(lowerTerritoryName) ||
                        (t.region && t.region.toLowerCase().includes(lowerTerritoryName)) ||
                        lowerTerritoryName.includes(t.name.toLowerCase()) ||
                        (t.region && lowerTerritoryName.includes(t.region.toLowerCase()))
                      );
                      
                      if (matchingTerritory) {
                        console.log(`🔄 Найдена похожая территория: "${matchingTerritory.name}" для "${territoryName}"`);
                      }
                    }
                    
                    if (matchingTerritory) {
                      territoryId = matchingTerritory.id;
                      console.log(`✅ Найдена территория: "${matchingTerritory.name}" (ID: ${territoryId})`);
                    } else {
                      console.log(`⚠️ Территория не найдена: "${territoryName}"`);
                      console.log(`📋 Доступные территории:`, territories.map(t => ({ name: t.name, region: t.region })));
                    }
                  } else {
                    console.log(`⚠️ Не удалось извлечь название территории из:`, participant.territory);
                  }
                }
                
                // Найти ID должности по названию (если указано)
                let positionId = null;
                if (participant.position) {
                  // Получаем название должности (может быть строкой или объектом)
                  const positionName = typeof participant.position === 'string' 
                    ? participant.position 
                    : participant.position.name || '';
                  
                  console.log(`🔍 Поиск должности: "${positionName}" (тип: ${typeof participant.position})`);
                  
                  if (positionName) {
                    // Сначала ищем точное совпадение
                    let matchingPosition = positions.find(p => 
                      p.name.toLowerCase() === positionName.toLowerCase()
                    );
                    
                    // Если точное совпадение не найдено, ищем похожие должности
                    if (!matchingPosition) {
                      const lowerPositionName = positionName.toLowerCase();
                      
                      // Логика для торговых представителей
                      if (lowerPositionName.includes('торговый представитель')) {
                        // Ищем любую должность, содержащую "торговый представитель"
                        matchingPosition = positions.find(p => 
                          p.name.toLowerCase().includes('торговый представитель')
                        );
                        
                        if (matchingPosition) {
                          console.log(`🔄 Найдена похожая должность: "${matchingPosition.name}" для "${positionName}"`);
                        }
                      }
                      
                      // Можно добавить другие правила для похожих должностей
                      // Например, для менеджеров, специалистов и т.д.
                    }
                    
                    if (matchingPosition) {
                      positionId = matchingPosition.id;
                      console.log(`✅ Найдена должность: "${matchingPosition.name}" (ID: ${positionId})`);
                    } else {
                      console.log(`⚠️ Должность не найдена: "${positionName}"`);
                      console.log(`📋 Доступные должности:`, positions.map(p => p.name));
                    }
                  } else {
                    console.log(`⚠️ Не удалось извлечь название должности из:`, participant.position);
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
                    event_id: editingEvent.id,
                    user_id: result.user.id,
                    attended: false
                  });
                  
                  console.log(`✅ Создан новый пользователь: ${participant.full_name} (ID: ${result.user.id})`);
                } else {
                  console.error('❌ Ошибка создания пользователя:', result.message);
                  console.warn(`⚠️ Пропускаем пользователя ${participant.full_name}: ${result.message}`);
                }
              } catch (error) {
                console.error('❌ Ошибка создания пользователя:', error);
                
                if (typeof error === 'object' && error !== null) {
                  const errorMessage = (error as Error).message || 'Неизвестная ошибка';
                  console.warn(`⚠️ Пропускаем пользователя ${participant.full_name}: ${errorMessage}`);
                }
              }
            }
            
            // Добавляем новых участников
            if (finalParticipants.length > 0) {
              console.log(`📋 Добавляем ${finalParticipants.length} новых участников в мероприятие`);
              
              // Проверяем, какие участники уже существуют в мероприятии
              const userIdsToAdd = finalParticipants.map(p => p.user_id);
              const { data: existingParticipants, error: checkError } = await supabase
                .from('event_participants')
                .select('user_id')
                .eq('event_id', editingEvent.id)
                .in('user_id', userIdsToAdd);
              
              if (checkError) {
                console.error('❌ Ошибка проверки существующих участников:', checkError);
                throw checkError;
              }
              
              const existingUserIds = existingParticipants?.map(p => p.user_id) || [];
              const newParticipantsToAdd = finalParticipants.filter(p => !existingUserIds.includes(p.user_id));
              
              console.log(`🔍 Проверка дубликатов:`, {
                total: finalParticipants.length,
                existing: existingUserIds.length,
                new: newParticipantsToAdd.length,
                existingIds: existingUserIds,
                newIds: newParticipantsToAdd.map(p => p.user_id)
              });
              
              if (newParticipantsToAdd.length > 0) {
                try {
                  console.log('🔍 Попытка вставки участников:', {
                    count: newParticipantsToAdd.length,
                    data: newParticipantsToAdd.map(p => ({ event_id: p.event_id, user_id: p.user_id }))
                  });
                  const { error: insertError } = await supabase
                    .from('event_participants')
                    .insert(newParticipantsToAdd);
                    
                  if (insertError) {
                    // Если ошибка связана с дубликатами, это нормально
                    if (insertError.code === '23505') {
                      console.log(`ℹ️ Некоторые участники уже существуют в мероприятии (дубликаты проигнорированы)`);
                    } else {
                      console.error('❌ Ошибка добавления новых участников:', insertError);
                      console.error('📋 Детали ошибки:', {
                        code: insertError.code,
                        message: insertError.message,
                        details: insertError.details,
                        hint: insertError.hint
                      });
                      throw insertError;
                    }
                  } else {
                    console.log(`✅ Успешно добавлено ${newParticipantsToAdd.length} новых участников`);
                  }
                } catch (error) {
                  // Игнорируем ошибки дубликатов
                  if (error.code === '23505') {
                    console.log(`ℹ️ Некоторые участники уже существуют в мероприятии (дубликаты проигнорированы)`);
                  } else {
                    throw error;
                  }
                }
              } else {
                console.log(`ℹ️ Все участники уже существуют в мероприятии`);
              }
              
              if (existingUserIds.length > 0) {
                console.log(`⚠️ Пропущено ${existingUserIds.length} участников (уже существуют в мероприятии)`);
              }
            }
          }
          
          // Добавляем участников с существующими ID
          if (newUserIds.length > 0) {
            const newParticipantsData = participants
              .filter(p => p.id && newUserIds.includes(p.id))
              .map(p => ({
                event_id: editingEvent.id,
                user_id: p.id,
                attended: false
              }));
            
            console.log(`📋 Данные участников с существующими ID:`, newParticipantsData);
            
            // Проверяем, какие участники уже существуют в мероприятии
            const userIdsToAdd = newParticipantsData.map(p => p.user_id);
            const { data: existingParticipants, error: checkError } = await supabase
              .from('event_participants')
              .select('user_id')
              .eq('event_id', editingEvent.id)
              .in('user_id', userIdsToAdd);
            
            if (checkError) {
              console.error('❌ Ошибка проверки существующих участников:', checkError);
              throw checkError;
            }
            
            const existingUserIds = existingParticipants?.map(p => p.user_id) || [];
            const participantsToAdd = newParticipantsData.filter(p => !existingUserIds.includes(p.user_id));
            
            console.log(`🔍 Проверка дубликатов для существующих ID:`, {
              total: newParticipantsData.length,
              existing: existingUserIds.length,
              new: participantsToAdd.length
            });
            
            if (participantsToAdd.length > 0) {
              try {
                const { error: insertError } = await supabase
                  .from('event_participants')
                  .insert(participantsToAdd);
                  
                if (insertError) {
                  // Если ошибка связана с дубликатами, это нормально
                  if (insertError.code === '23505') {
                    console.log(`ℹ️ Некоторые участники уже существуют в мероприятии (дубликаты проигнорированы)`);
                  } else {
                    console.error('❌ Ошибка добавления участников с существующими ID:', insertError);
                    console.error('📋 Детали ошибки:', {
                      code: insertError.code,
                      message: insertError.message,
                      details: insertError.details,
                      hint: insertError.hint
                    });
                    throw insertError;
                  }
                } else {
                  console.log(`✅ Добавлено ${participantsToAdd.length} участников с существующими ID`);
                }
              } catch (error) {
                // Игнорируем ошибки дубликатов
                if (error.code === '23505') {
                  console.log(`ℹ️ Некоторые участники уже существуют в мероприятии (дубликаты проигнорированы)`);
                } else {
                  throw error;
                }
              }
            } else {
              console.log(`ℹ️ Все участники с существующими ID уже есть в мероприятии`);
            }
            
            if (existingUserIds.length > 0) {
              console.log(`⚠️ Пропущено ${existingUserIds.length} участников с существующими ID (уже существуют в мероприятии)`);
            }
          } else {
            console.log(`ℹ️ Участников с существующими ID для добавления нет`);
          }
        } else {
          console.log(`ℹ️ Нет участников для обновления`);
        }
      } else {
        // Создание нового мероприятия
        console.log(`🆕 Создание нового мероприятия`);
        const { data, error } = await supabase
          .from('events')
          .insert({
            ...eventData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Ошибка создания мероприятия:', error);
          throw error;
        }
        
        eventId = data.id;
        console.log(`✅ Мероприятие создано с ID: ${eventId}`);
        
        // Создание конфигурации экзамена, если это экзамен
        if (eventType === 'exam' && examData.talentCategory) {
          console.log(`🎓 Создание конфигурации экзамена`);
          const { error: examConfigError } = await supabase
            .from('exam_configs')
            .insert([{
              exam_event_id: eventId,
              total_duration_hours: 8,
              break_duration_minutes: 30,
              max_participants: formData.max_participants || 20,
              evaluation_criteria: {},
            }]);

          if (examConfigError) {
            console.error('❌ Ошибка создания конфигурации экзамена:', examConfigError);
            throw examConfigError;
          }
          console.log(`✅ Конфигурация экзамена создана`);

          // Создание учетных записей для экспертов
          if (examData.experts && examData.experts.length > 0) {
            
            for (const expert of examData.experts) {
              try {
                // Пытаемся создать пользователя - функция сама обработает случай существующего пользователя
                
                const result = await createRegularUser(
                  expert.email,
                  expert.fullName,
                  'expert', // Используем роль 'expert' после добавления в enum
                  '123456', // Пароль по умолчанию
                  {
                    sap_number: '', // У экспертов может не быть SAP номера
                    territory_id: userProfile?.territory_id || null, // Привязываем к территории создателя
                    position_id: null, // Позиция будет установлена отдельно
                    work_experience_days: 0
                  }
                );

                if (!result.success) {
                  console.error(`❌ Не удалось обработать эксперта ${expert.fullName}:`, result.message);
                }
              } catch (error) {
                console.error(`❌ Ошибка при обработке эксперта ${expert.fullName}:`, error);
              }
            }
          }
        }
        
        // Если есть участники, добавляем их
        if (participants.length > 0 && data) {
          console.log(`👥 Начало обработки ${participants.length} участников для нового мероприятия`);
          const finalParticipants = [];
          
          for (const participant of participants) {
            console.log(`🔍 Обработка участника: ${participant.full_name} (ID: ${participant.id}, Email: ${participant.email}, SAP: ${participant.sap_number})`);
            
            // Если у участника уже есть id, используем его и обновляем данные
            if (participant.id) {
              finalParticipants.push({
                event_id: data.id,
                user_id: participant.id,
                attended: false
              });
              console.log(`✅ Используем существующего пользователя: ${participant.full_name} (ID: ${participant.id})`);
              
              // Обновляем данные пользователя
              await updateUserData(participant.id, participant);
              continue;
            }
            
            // Ищем существующего пользователя по email или SAP
            let existingUser = null;
            
            if (participant.email) {
              console.log(`🔍 Поиск пользователя по email: ${participant.email}`);
              const { data: userByEmail } = await supabase
                .from('users')
                .select('id')
                .eq('email', participant.email)
                .maybeSingle();
                
              if (userByEmail) {
                existingUser = userByEmail;
                console.log(`✅ Найден пользователь по email: ${participant.email} (ID: ${userByEmail.id})`);
              }
            }
            
            if (!existingUser && participant.sap_number) {
              console.log(`🔍 Поиск пользователя по SAP: ${participant.sap_number}`);
              const { data: userBySap } = await supabase
                .from('users')
                .select('id')
                .eq('sap_number', participant.sap_number)
                .maybeSingle();
                
              if (userBySap) {
                existingUser = userBySap;
                console.log(`✅ Найден пользователь по SAP: ${participant.sap_number} (ID: ${userBySap.id})`);
              }
            }
            
            // Если пользователь найден, используем его id
            if (existingUser) {
              finalParticipants.push({
                event_id: data.id,
                user_id: existingUser.id,
                attended: false
              });
              console.log(`✅ Используем найденного пользователя: ${participant.full_name} (ID: ${existingUser.id})`);
              continue;
            }
            
            // Если пользователь не найден, создаем нового
            console.log(`🆕 Создание нового пользователя: ${participant.full_name}`);
            try {
              // Найти ID территории по названию (если указано)
              let territoryId = null;
              if (participant.territory) {
                console.log(`🔍 Поиск территории: ${participant.territory}`);
                const matchingTerritory = territories.find(t => 
                  t.name.toLowerCase() === participant.territory.toLowerCase() ||
                  (t.region && t.region.toLowerCase() === participant.territory.toLowerCase())
                );
                if (matchingTerritory) {
                  territoryId = matchingTerritory.id;
                  console.log(`✅ Найдена территория: ${participant.territory} (ID: ${territoryId})`);
                } else {
                  console.log(`⚠️ Территория не найдена: ${participant.territory}`);
                }
              }
              
              // Найти ID должности по названию (если указано)
              let positionId = null;
              if (participant.position) {
                console.log(`🔍 Поиск должности: ${participant.position}`);
                const matchingPosition = positions.find(p => 
                  p.name.toLowerCase() === participant.position.toLowerCase()
                );
                if (matchingPosition) {
                  positionId = matchingPosition.id;
                  console.log(`✅ Найдена должность: ${participant.position} (ID: ${positionId})`);
                } else {
                  console.log(`⚠️ Должность не найдена: ${participant.position}`);
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
                
                console.log(`✅ Создан новый пользователь: ${participant.full_name} (ID: ${result.user.id})`);
              } else {
                console.error('❌ Ошибка создания пользователя:', result.message);
                // Не останавливаем весь процесс, просто логируем ошибку
                console.warn(`⚠️ Пропускаем пользователя ${participant.full_name}: ${result.message}`);
              }
            } catch (error) {
              console.error('❌ Ошибка создания пользователя:', error);
              
              if (typeof error === 'object' && error !== null) {
                const errorMessage = (error as Error).message || 'Неизвестная ошибка';
                console.warn(`⚠️ Пропускаем пользователя ${participant.full_name}: ${errorMessage}`);
              }
            }
          }
          
          // Если у нас есть участники для добавления
          console.log(`📊 Итоговые участники для добавления: ${finalParticipants.length} из ${participants.length}`);
          if (finalParticipants.length > 0) {
            console.log('📋 Добавляем участников в event_participants:', finalParticipants);
            const { error: participantsError } = await supabase
              .from('event_participants')
              .insert(finalParticipants);

            if (participantsError) {
              console.error('❌ Ошибка добавления участников:', participantsError);
              throw participantsError;
            }
            console.log('✅ Участники успешно добавлены в мероприятие');
          } else if (participants.length > 0) {
            // Все участники не были добавлены
            console.error('❌ Не удалось добавить ни одного участника');
            throw new Error("Не удалось добавить ни одного участника. Проверьте данные участников.");
          }
        }

      }

      // Загрузка файлов в Supabase Storage
      if (eventFiles.length > 0 && eventId) {
        const uploadPromises = eventFiles
          .filter(fileItem => fileItem.file) // Только новые файлы
          .map(async (fileItem) => {
            const result = await uploadEventFile(fileItem.file!, eventId, fileItem.type, fileItem.name);
            if (!result.success) {
              console.error(`Ошибка загрузки файла ${fileItem.name}:`, result.error);
            }
            return result;
          });

        await Promise.all(uploadPromises);
      }

      // Создаем уведомления о новом мероприятии
      try {
        console.log('🔔 Создание уведомлений о новом мероприятии');
        
        // Уведомляем всех участников мероприятия
        if (participants.length > 0) {
          for (const participant of participants) {
            if (participant.id) {
              await createEventNotification(
                participant.id,
                formData.title,
                eventId
              );
            }
          }
        }
        
        // Уведомляем всех тренеров о новом мероприятии
        await createNotificationForRole(
          'trainer',
          'Новое мероприятие',
          `Создано новое мероприятие "${formData.title}"`,
          'event',
          'medium'
        );
        
        console.log('✅ Уведомления о мероприятии созданы');
      } catch (notificationError) {
        console.error('⚠️ Ошибка создания уведомлений:', notificationError);
        // Не прерываем процесс, если уведомления не создались
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


  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку поля при изменении
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDaySelect = (date: Date) => {
    console.log('handleDaySelect called with:', date);
    const dateString = date.toISOString().slice(0, 16);
    console.log('dateString:', dateString);
    setFormData(prev => ({ ...prev, start_date: dateString }));
    setIsCalendarOpen(false);
  };

  const handleTimeSelect = (time: string) => {
    const currentDate = formData.start_date ? formData.start_date.split('T')[0] : new Date().toISOString().split('T')[0];
    const newDateTime = `${currentDate}T${time}`;
    setFormData(prev => ({ ...prev, start_date: newDateTime }));
    setIsTimeOpen(false);
  };

  const handleEventFileUpload = (fileType: 'presentation' | 'workbook', file: File) => {
    // Проверяем размер файла (максимум 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Размер файла не должен превышать 50MB');
      return;
    }

    // Проверяем тип файла
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы PDF, PowerPoint, Word и Excel');
      return;
    }

    const newFile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      file,
      type: fileType,
      name: file.name // Сохраняем оригинальное название с кириллицей
    };

    setEventFiles(prev => [...prev, newFile]);
  };

  const removeFile = async (fileId: string) => {
    // Проверяем, является ли файл уже загруженным (есть URL)
    const fileToRemove = eventFiles.find(file => file.id === fileId);
    
    if (fileToRemove?.url) {
      // Файл уже загружен в базу данных, удаляем его оттуда
      if (confirm('Вы уверены, что хотите удалить этот файл?')) {
        try {
          const result = await deleteEventFile(fileId);
          if (result.success) {
            setEventFiles(prev => prev.filter(file => file.id !== fileId));
          } else {
            alert('Ошибка удаления файла: ' + result.error);
          }
        } catch (error) {
          console.error('Ошибка удаления файла:', error);
          alert('Произошла ошибка при удалении файла');
        }
      }
    } else {
      // Файл еще не загружен, просто удаляем из локального состояния
      setEventFiles(prev => prev.filter(file => file.id !== fileId));
    }
  };

  // Функция для извлечения расширения файла
  const getFileExtension = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  };

  // Функция для получения имени файла без расширения
  const getFileNameWithoutExtension = (fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  };

  const updateFileName = async (fileId: string, newName: string) => {
    // Находим текущий файл для получения расширения
    const currentFile = eventFiles.find(file => file.id === fileId);
    if (!currentFile) return;

    // Получаем расширение из оригинального имени файла
    const extension = getFileExtension(currentFile.name);
    
    // Формируем новое полное имя с расширением
    const fullNewName = newName + extension;

    // Обновляем в локальном состоянии
    setEventFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, name: fullNewName } : file
    ));
    
    // Сохраняем в базе данных
    const result = await updateEventFileName(fileId, fullNewName);
    if (!result.success) {
      console.error('Ошибка сохранения названия файла:', result.error);
      // Можно добавить уведомление пользователю об ошибке
    }
    
    setEditingFileName(null);
    setEditingFileNameValue('');
  };

  const startEditingFileName = (fileId: string) => {
    const file = eventFiles.find(f => f.id === fileId);
    if (file) {
      setEditingFileName(fileId);
      setEditingFileNameValue(getFileNameWithoutExtension(file.name));
    }
  };

  const cancelEditingFileName = () => {
    setEditingFileName(null);
    setEditingFileNameValue('');
  };

  const handleFileSelect = (file: File) => {
    setFileTypeSelection({ isOpen: true, file });
  };

  const handleFileTypeConfirm = (fileType: 'presentation' | 'workbook') => {
    if (fileTypeSelection.file) {
      handleEventFileUpload(fileType, fileTypeSelection.file);
      setFileTypeSelection({ isOpen: false, file: null });
    }
  };

  const handleFileTypeCancel = () => {
    setFileTypeSelection({ isOpen: false, file: null });
  };

  const changeFileType = (fileId: string, newType: 'presentation' | 'workbook') => {
    setEventFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, type: newType } : file
    ));
  };

  function CustomDayjsCalendar({ selectedDate, onDateSelect }: { selectedDate: string, onDateSelect: (date: string) => void }) {
    dayjs.locale('ru');
    const [currentDate, setCurrentDate] = useState(dayjs(selectedDate || new Date()));

    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const years = Array.from({ length: 101 }, (_, i) => dayjs().year() - 50 + i);
    const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMMM'));

    const generateCalendar = () => {
        const days = [];
        let date = startDate;
        while (date.isBefore(endDate) || date.isSame(endDate, 'day')) {
            days.push(date);
            date = date.add(1, 'day');
        }
        return days;
    };

    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    
    return (
        <div className="w-[320px] bg-gray-50/80 backdrop-blur-md rounded-2xl shadow-lg p-4 font-sans text-sm border border-white/20">
            <div className="flex justify-between items-center mb-4">
                <button 
                  type="button" 
                  onClick={handlePrevMonth} 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                    <select
                        value={currentDate.format('MMMM')}
                        onChange={(e) => setCurrentDate(currentDate.month(months.indexOf(e.target.value)))}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold bg-white shadow-sm appearance-none text-center"
                    >
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                        value={currentDate.year()}
                        onChange={(e) => setCurrentDate(currentDate.year(Number(e.target.value)))}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold bg-white shadow-sm appearance-none"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
          </div>
                <button 
                  type="button" 
                  onClick={handleNextMonth} 
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
        </div>

            <div className="grid grid-cols-7 text-gray-500 text-center mb-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
          </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {generateCalendar().map((date, i) => {
                    const isThisMonth = date.month() === currentDate.month();
                    const isSelected = dayjs(selectedDate).isSame(date, 'day');
                    const isToday = dayjs().isSame(date, 'day');
                    
                    return (
                        <div
                            key={i}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer transition-colors 
                                ${!isThisMonth ? 'text-gray-300' : ''} 
                                ${isSelected ? 'bg-sns-green text-white font-bold' : ''} 
                                ${!isSelected && isToday ? 'border-2 border-sns-green' : ''}
                                ${!isSelected ? 'hover:bg-sns-green-light' : ''}
                            `}
                            onClick={() => {
                              console.log('Calendar day clicked:', date.format('YYYY-MM-DD'));
                              onDateSelect(date.format('YYYY-MM-DD'));
                            }}
                        >
                            {date.date()}
                        </div>
                    );
                })}
        </div>
      </div>
    );
  }

  function CustomTimePicker({ selectedTime, onTimeSelect }: { selectedTime: string, onTimeSelect: (time: string) => void }) {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    
    // Используем selectedTime или по умолчанию 09:00
    const defaultTime = selectedTime || '09:00';
    const [selectedHour, setSelectedHour] = useState(defaultTime.split(':')[0]);
    const [selectedMinute, setSelectedMinute] = useState(defaultTime.split(':')[1]);

    // Автоматическая прокрутка к выбранному времени
    useEffect(() => {
      const hourElement = document.getElementById(`hour-${selectedHour}`);
      const minuteElement = document.getElementById(`minute-${selectedMinute}`);
      
      if (hourElement) {
        hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (minuteElement) {
        minuteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [selectedHour, selectedMinute]);

    const handleHourChange = (hour: string) => {
      setSelectedHour(hour);
      onTimeSelect(`${hour}:${selectedMinute}`);
    };

    const handleMinuteChange = (minute: string) => {
      setSelectedMinute(minute);
      onTimeSelect(`${selectedHour}:${minute}`);
    };

    return (
      <div className="w-[280px] bg-gray-50/80 backdrop-blur-md rounded-2xl shadow-lg p-4 font-sans text-sm border border-white/20">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Выберите время</h3>
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          {/* Часы */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-2">Часы</div>
            <div className="h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {hours.map((hour) => (
                <div
                  key={hour}
                  id={`hour-${hour}`}
                  className={`px-4 py-2 cursor-pointer hover:bg-sns-green/10 transition-colors ${
                    selectedHour === hour ? 'bg-sns-green text-white font-bold' : ''
                  }`}
                  onClick={() => handleHourChange(hour)}
                >
                  {hour}
                </div>
              ))}
            </div>
          </div>

          <div className="text-2xl font-bold text-gray-400">:</div>

          {/* Минуты */}
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-2">Минуты</div>
            <div className="h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {minutes.map((minute) => (
                <div
                  key={minute}
                  id={`minute-${minute}`}
                  className={`px-4 py-2 cursor-pointer hover:bg-sns-green/10 transition-colors ${
                    selectedMinute === minute ? 'bg-sns-green text-white font-bold' : ''
                  }`}
                  onClick={() => handleMinuteChange(minute)}
                >
                  {minute}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="text-lg font-bold text-gray-800">
            {selectedHour}:{selectedMinute}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl pb-safe-bottom"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#06A478]/5 to-emerald-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#06A478] to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingEvent ? 'Редактировать мероприятие' : 'Создать мероприятие'}
              </h2>
              <p className="text-sm text-gray-600">
                {editingEvent ? 'Внесите изменения в мероприятие' : 'Заполните информацию о новом мероприятии'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50 rounded-xl w-10 h-10 flex items-center justify-center transition-colors duration-200 shadow-sm border border-gray-200"
          >
            <X size={20} />
          </button>
        </div>

          {/* Прогресс-бар */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">Прогресс заполнения</span>
              <span className="text-sm font-medium text-[#06A478]">
                {Math.min(
                  (formData.title ? 20 : 0) + 
                  (formData.description ? 20 : 0) + 
                  (formData.start_date ? 20 : 0) + 
                  (formData.location || formData.meeting_link ? 20 : 0) + 
                  (participants.length > 0 ? 20 : 0), 
                  100
                )}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#06A478] to-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min(
                    (formData.title ? 20 : 0) + 
                    (formData.description ? 20 : 0) + 
                    (formData.start_date ? 20 : 0) + 
                    (formData.location || formData.meeting_link ? 20 : 0) + 
                    (participants.length > 0 ? 20 : 0), 
                    100
                  )}%` 
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto">
          
          {/* Информационное сообщение для экзаменов кадрового резерва */}
          {defaultEventType === 'exam' && (
            <div className="mx-6 mt-4 mb-2 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl">
              <div className="flex items-center">
                <Target className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-base font-semibold text-blue-800">Экзамен кадрового резерва</h3>
                  <p className="text-sm text-blue-600 mt-1">
                    Создание комплексной оценки кандидатов в кадровый резерв
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Выбор типа мероприятия для тренеров - только на первом шаге */}
          {userProfile?.role === 'trainer' && step === 1 && !defaultEventType && (
            <div className="mx-6 mt-4 mb-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <CalendarDays className="w-5 h-5 text-sns-green mr-2" />
                  <h3 className="text-base font-semibold text-gray-800">Тип мероприятия</h3>
                </div>
                {editingEvent && eventType && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventType(null);
                      setFormData({
                        ...formData,
                        title: editingEvent.title || '',
                        description: editingEvent.description || '',
                        event_type_id: editingEvent.event_type_id || '',
                      });
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Очный тренинг - первый */}
                <button
                  type="button"
                  onClick={() => {
                    setEventType('offline');
                    // Находим ID для очного тренинга (точно по названию)
                    const offlineType = eventTypes.find(type => 
                      type.name === 'offline_training' || 
                      type.name_ru === 'Очный тренинг' ||
                      type.name === 'in_person_training' && type.is_online === false
                    );
                    setFormData({
                      ...formData,
                      title: "Управление территорией для развития АКБ",
                      description: "Тренинг предназначен для формирования у ТП навыков по управлению дистрибуцией на вверенной территории для получения максимального бонуса.",
                      event_type_id: offlineType?.id || '',
                      status: "published",
                      points: 100,
                    });
                  }}
                  className={`px-4 py-4 border-2 rounded-xl text-center transition-all duration-200 ${
                    eventType === 'offline'
                      ? 'border-[#06A478] bg-[#06A478]/5 text-[#06A478] shadow-lg'
                      : 'border-gray-300 bg-white hover:border-[#06A478]/50 hover:bg-[#06A478]/5 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 bg-[#06A478]/10 rounded-lg mr-3">
                      <Users className="w-5 h-5 text-[#06A478]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base">Очный тренинг</div>
                      <div className="text-xs text-gray-500">Управление территорией для развития АКБ</div>
                    </div>
                  </div>
                </button>
                
                {/* Экзамен кадрового резерва - второй */}
                <button
                  type="button"
                  onClick={() => {
                    console.log('Кнопка "Экзамен кадрового резерва" нажата!');
                    setEventType('exam');
                    // Находим ID для экзамена кадрового резерва
                    const examType = eventTypes.find(type => 
                      type.name === 'exam_talent_reserve' || 
                      type.name_ru === 'Экзамен кадрового резерва'
                    );
                    console.log('Найденный тип экзамена:', examType);
                    setFormData({
                      ...formData,
                      title: "Экзамен кадрового резерва",
                      description: "Комплексная оценка кандидатов в кадровый резерв",
                      event_type_id: examType?.id || '',
                      status: "draft",
                      points: 0,
                    });
                    // Сброс данных экзамена
                    setExamData({
                      talentCategory: null,
                      groupName: '',
                      expertEmails: [],
                      experts: [],
                    });
                    console.log('Установлен eventType: exam, event_type_id:', examType?.id);
                  }}
                  className={`px-4 py-4 border-2 rounded-xl text-center transition-all duration-200 ${
                    eventType === 'exam'
                      ? 'border-[#06A478] bg-[#06A478]/5 text-[#06A478] shadow-lg'
                      : 'border-gray-300 bg-white hover:border-[#06A478]/50 hover:bg-[#06A478]/5 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 bg-[#06A478]/10 rounded-lg mr-3">
                      <Target className="w-5 h-5 text-[#06A478]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base">Экзамен кадрового резерва</div>
                      <div className="text-xs text-gray-500">Оценка талантов и потенциала</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Неактивные типы мероприятий */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Другие типы мероприятий (в разработке)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center opacity-40 cursor-not-allowed select-none relative">
                    <div className="font-medium text-sm text-gray-400">Онлайн-тренинг</div>
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs mt-1">
                      в разработке
                    </div>
                  </div>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center opacity-40 cursor-not-allowed select-none relative">
                    <div className="font-medium text-sm text-gray-400">Вебинар</div>
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs mt-1">
                      в разработке
                    </div>
                  </div>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center opacity-40 cursor-not-allowed select-none relative">
                    <div className="font-medium text-sm text-gray-400">Конференция</div>
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs mt-1">
                      в разработке
                    </div>
                  </div>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center opacity-40 cursor-not-allowed select-none relative">
                    <div className="font-medium text-sm text-gray-400">Практикум</div>
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs mt-1">
                      в разработке
                    </div>
                  </div>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center opacity-40 cursor-not-allowed select-none relative">
                    <div className="font-medium text-sm text-gray-400">Деловая игра</div>
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs mt-1">
                      в разработке
                    </div>
                  </div>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center opacity-40 cursor-not-allowed select-none relative">
                    <div className="font-medium text-sm text-gray-400">Семинар</div>
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs mt-1">
                      в разработке
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Эти типы мероприятий будут доступны в следующих версиях
                </p>
              </div>
            </div>
          )}

          <form onSubmit={step === 1 ? nextStep : handleSubmit} className="px-6 pt-2 pb-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              {/* Тип мероприятия - скрыт для тренеров и когда defaultEventType установлен */}
              {userProfile?.role !== 'trainer' && !defaultEventType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип мероприятия *
                </label>
                <select
                  value={formData.event_type_id || ''}
                  onChange={(e) => {
                    const selectedTypeId = e.target.value;
                    const selectedType = eventTypes.find(type => type.id === selectedTypeId);
                    console.log('Выбран тип мероприятия:', selectedType);
                    
                    // Проверяем, является ли выбранный тип экзаменом кадрового резерва
                    if (selectedType && (selectedType.name === 'exam_talent_reserve' || selectedType.name_ru === 'Экзамен кадрового резерва')) {
                      console.log('Выбран экзамен кадрового резерва, устанавливаем eventType: exam');
                      setEventType('exam');
                      setFormData({
                        ...formData,
                        event_type_id: selectedTypeId,
                        title: "Экзамен кадрового резерва",
                        description: "Комплексная оценка кандидатов в кадровый резерв",
                        status: "draft",
                        points: 0,
                      });
                      // Сброс данных экзамена
                      setExamData({
                        talentCategory: null,
                        groupName: '',
                        expertEmails: [],
                        experts: [],
                      });
                    } else {
                      // Сброс eventType для других типов мероприятий
                      setEventType(null);
                      handleChange('event_type_id', selectedTypeId);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                    errors.event_type_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Выберите тип мероприятия</option>
                  {/* Активные типы мероприятий */}
                  <option value={eventTypes.find(type => type.name === 'offline_training' || type.name_ru === 'Очный тренинг')?.id || ''}>
                    Очный тренинг
                  </option>
                  <option value={eventTypes.find(type => type.name === 'exam_talent_reserve' || type.name_ru === 'Экзамен кадрового резерва')?.id || ''}>
                    Экзамен кадрового резерва
                  </option>
                  {/* Разделитель */}
                  <option disabled>──────────────</option>
                  {/* Неактивные типы мероприятий */}
                  {eventTypes
                    .filter(type => 
                      type.name !== 'offline_training' && 
                      type.name !== 'exam_talent_reserve' &&
                      type.name_ru !== 'Очный тренинг' &&
                      type.name_ru !== 'Экзамен кадрового резерва'
                    )
                    .map((type) => (
                      <option key={type.id} value="" disabled style={{ color: '#9CA3AF' }}>
                        {type.name_ru || type.name} • в разработке
                      </option>
                    ))}
                </select>
                {errors.event_type_id && <p className="mt-1 text-sm text-red-600">{errors.event_type_id}</p>}
              </div>
              )}
            
              {/* Название и описание в одной строке */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Название */}
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <Star className="w-4 h-4 text-[#06A478] mr-2" />
                    Название мероприятия *
                  </label>
                  <div className="flex-1 min-h-[100px] flex flex-col">
                    <div className="relative group">
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        disabled={userProfile?.role === 'trainer' && eventType !== null || eventType === 'exam'}
                        className={`w-full px-4 py-4 border-2 rounded-xl focus:ring-4 focus:ring-[#06A478]/20 focus:border-[#06A478] transition-all duration-200 flex-1 text-gray-800 font-medium ${
                          errors.title ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                        } ${
                          (userProfile?.role === 'trainer' && eventType !== null) || eventType === 'exam'
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-700 cursor-not-allowed border-blue-200' 
                            : 'bg-white shadow-sm hover:shadow-md'
                        }`}
                        placeholder={(userProfile?.role === 'trainer' && eventType !== null) || eventType === 'exam'
                          ? "Название автоматически установлено" 
                          : "Введите название мероприятия"
                        }
                        required
                      />
                      {(userProfile?.role === 'trainer' && eventType !== null) || eventType === 'exam' ? (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Check className="w-5 h-5 text-[#06A478]" />
                        </div>
                      ) : null}
                    </div>
                    {errors.title && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertOctagon className="w-4 h-4 mr-1" />
                        {errors.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Описание */}
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <FileSpreadsheet className="w-4 h-4 text-[#06A478] mr-2" />
                    Описание
                  </label>
                  <div className="flex-1 min-h-[100px] flex flex-col">
                    <div className="relative group">
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        disabled={userProfile?.role === 'trainer' && eventType !== null || eventType === 'exam'}
                        rows={3}
                        className={`w-full px-4 py-4 border-2 rounded-xl focus:ring-4 focus:ring-[#06A478]/20 focus:border-[#06A478] transition-all duration-200 flex-1 resize-none text-gray-700 leading-relaxed ${
                          (userProfile?.role === 'trainer' && eventType !== null) || eventType === 'exam'
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-600 cursor-not-allowed border-blue-200' 
                            : 'bg-white shadow-sm hover:shadow-md border-gray-200 hover:border-gray-300'
                        }`}
                        placeholder={(userProfile?.role === 'trainer' && eventType !== null) || eventType === 'exam'
                          ? "Описание автоматически установлено" 
                          : "Опишите цели и содержание мероприятия"
                        }
                      />
                      {(userProfile?.role === 'trainer' && eventType !== null) || eventType === 'exam' ? (
                        <div className="absolute right-3 top-3">
                          <Check className="w-5 h-5 text-[#06A478]" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Информационные сообщения для тренеров */}
              {userProfile?.role === 'trainer' && eventType !== null && eventType !== 'exam' && (
                <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  <p className="text-sm text-green-700 font-medium">
                    Название и описание автоматически установлены при выборе типа мероприятия
                  </p>
                </div>
              )}

              {/* Информационное сообщение для экзамена */}
              {eventType === 'exam' && (
                <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <Sparkles className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                  <p className="text-sm text-blue-700 font-medium">
                    Название и описание автоматически генерируются на основе выбранной категории талантов и группы
                  </p>
                </div>
              )}

              {/* Форма экзамена кадрового резерва */}
              {eventType === 'exam' && (
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center mb-6">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mr-4">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        Настройки экзамена кадрового резерва
                      </h3>
                      <p className="text-sm text-gray-600">
                        Выберите категорию талантов и настройте параметры экзамена
                      </p>
                    </div>
                  </div>
                  {console.log('CreateEventModal: Отображается форма экзамена, eventType:', eventType)}
                  <ExamTypeSelector
                    onCategorySelect={(category) => setExamData(prev => ({ ...prev, talentCategory: category }))}
                    onGroupNameChange={(groupName) => setExamData(prev => ({ ...prev, groupName }))}
                    onExpertEmailsChange={(emails) => setExamData(prev => ({ ...prev, expertEmails: emails }))}
                    onExpertsChange={(experts) => setExamData(prev => ({ ...prev, experts }))}
                    onTitleUpdate={(title) => setFormData(prev => ({ ...prev, title }))}
                    onDescriptionUpdate={(description) => setFormData(prev => ({ ...prev, description }))}
                    selectedCategory={examData.talentCategory}
                    groupName={examData.groupName}
                    expertEmails={examData.expertEmails}
                    experts={examData.experts}
                  />
                  
                  {/* Отображение ошибок валидации для экзамена */}
                  {errors.talentCategory && (
                    <p className="mt-2 text-sm text-red-600">{errors.talentCategory}</p>
                  )}
                  {errors.groupName && (
                    <p className="mt-2 text-sm text-red-600">{errors.groupName}</p>
                  )}
                  {errors.expertEmails && (
                    <p className="mt-2 text-sm text-red-600">{errors.expertEmails}</p>
                  )}
                </div>
              )}

              {/* Дата и время начала */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата и время начала *
                  </label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Выбор даты */}
                  <div className="relative">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-sns-green" />
                      <button
                        type="button"
                        data-calendar-button
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className={`w-full flex items-center pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent text-left transition-colors duration-200 ${
                          errors.start_date ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <span>
                          {formData.start_date 
                            ? format(new Date(formData.start_date), 'dd MMMM yyyy HH:mm', { locale: ru }) 
                            : 'Выберите дату'
                          }
                        </span>
                      </button>
                    </div>
                    {isCalendarOpen && (
                      <div data-calendar-dropdown className="absolute z-20 mt-2 shadow-xl rounded-2xl border border-gray-200 animate-fade-in">
                        <CustomDayjsCalendar 
                          selectedDate={formData.start_date ? formData.start_date.split('T')[0] : ''}
                          onDateSelect={(date) => {
                            console.log('onDateSelect called with:', date);
                            const currentTime = formData.start_date ? formData.start_date.split('T')[1] : '09:00';
                            const fullDateTime = `${date}T${currentTime}`;
                            console.log('fullDateTime:', fullDateTime);
                            setFormData(prev => ({ ...prev, start_date: fullDateTime }));
                            setIsCalendarOpen(false);
                          }}
                    />
                  </div>
                    )}
                </div>

                  {/* Выбор времени */}
                  <div className="relative">
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-sns-green" />
                      <button
                        type="button"
                        data-time-button
                        onClick={() => setIsTimeOpen(!isTimeOpen)}
                        className={`w-full flex items-center pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent text-left transition-colors duration-200 ${
                          errors.start_date ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <span>
                          {formData.start_date 
                            ? formData.start_date.split('T')[1] 
                            : '09:00'
                          }
                        </span>
                      </button>
                    </div>
                    {isTimeOpen && (
                      <div data-time-dropdown className="absolute z-20 mt-2 shadow-xl rounded-2xl border border-gray-200 animate-fade-in">
                        <CustomTimePicker 
                          selectedTime={formData.start_date ? formData.start_date.split('T')[1] : '09:00'}
                          onTimeSelect={handleTimeSelect}
                    />
                  </div>
                    )}
                </div>
                </div>
                {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
              </div>

              {/* Место и ссылка */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Место проведения
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      disabled={userProfile?.role === 'trainer' && eventType === 'online'}
                      className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                        userProfile?.role === 'trainer' && eventType === 'online' 
                          ? 'bg-gray-100 text-gray-600 cursor-not-allowed' 
                          : ''
                      }`}
                      placeholder={userProfile?.role === 'trainer' && eventType === 'online' 
                        ? "ZOOM (автоматически установлено)" 
                        : "Адрес или название помещения"
                      }
                    />
                  </div>
                  {userProfile?.role === 'trainer' && eventType === 'online' && (
                    <p className="mt-1 text-sm text-gray-500">
                      Место проведения автоматически установлено для онлайн-тренинга
                    </p>
                  )}
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

              {/* Баллы за участие */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Баллы за участие
                  </label>
                  <div className="relative">
                  <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-500" />
                    <input
                      type="number"
                    value={formData.points}
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="100"
                    min="0"
                    />
                  </div>
                <p className="mt-1 text-sm text-gray-500">
                  Баллы автоматически установлены для данного типа мероприятия
                </p>
                </div>

              {/* Файлы мероприятия */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Файлы мероприятия
                  </label>
                
                {/* Область загрузки файлов */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-sns-green/50 transition-colors">
                    <input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileSelect(file);
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                    multiple
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Загрузить файлы</p>
                      <p className="text-xs text-gray-500">PDF, PowerPoint, Word, Excel (до 50MB каждый)</p>
                  </div>
                  </label>
                </div>

                {/* Список загруженных файлов */}
                {eventFiles.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Загруженные файлы
                    </label>
                    {eventFiles.map((fileItem) => (
                      <div
                        key={fileItem.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          fileItem.type === 'presentation' 
                            ? 'bg-blue-50 border-blue-200 hover:border-blue-300' 
                            : 'bg-orange-50 border-orange-200 hover:border-orange-300'
                        } transition-colors`}
                      >
                        <div className={`p-2 rounded-lg ${
                          fileItem.type === 'presentation' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-orange-100 text-orange-600'
                        }`}>
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {editingFileName === fileItem.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editingFileNameValue}
                                  onChange={(e) => {
                                    setEditingFileNameValue(e.target.value);
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      await updateFileName(fileItem.id, editingFileNameValue);
                                    } else if (e.key === 'Escape') {
                                      cancelEditingFileName();
                                    }
                                  }}
                                  onBlur={async () => await updateFileName(fileItem.id, editingFileNameValue)}
                                  className={`text-sm font-medium bg-white border rounded px-2 py-1 focus:outline-none ${
                                    fileItem.type === 'presentation' 
                                      ? 'border-blue-200 focus:ring-1 focus:ring-blue-300 focus:border-blue-300' 
                                      : 'border-orange-200 focus:ring-1 focus:ring-orange-300 focus:border-orange-300'
                                  }`}
                                  autoFocus
                                />
                                <span className="text-sm text-gray-500">
                                  {getFileExtension(fileItem.name)}
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => await updateFileName(fileItem.id, editingFileNameValue)}
                                  className={`p-1 transition-colors duration-200 ${
                                    fileItem.type === 'presentation' 
                                      ? 'text-blue-600 hover:text-blue-700' 
                                      : 'text-orange-600 hover:text-orange-700'
                                  }`}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingFileName}
                                  className="text-gray-500 hover:text-gray-700 p-1 transition-colors duration-200"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {fileItem.name}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => startEditingFileName(fileItem.id)}
                                  className={`p-1 transition-colors duration-200 ${
                                    fileItem.type === 'presentation' 
                                      ? 'text-blue-600 hover:text-blue-700' 
                                      : 'text-orange-600 hover:text-orange-700'
                                  }`}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                fileItem.type === 'presentation' 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-orange-100 text-orange-700 border border-orange-200'
                              }`}>
                                {fileItem.type === 'presentation' ? 'Презентация' : 'Рабочая тетрадь'}
                              </span>
                              <button
                                type="button"
                                onClick={() => changeFileType(fileItem.id, fileItem.type === 'presentation' ? 'workbook' : 'presentation')}
                                className="text-gray-400 hover:text-gray-600 p-1 transition-colors duration-200"
                                title="Изменить тип файла"
                              >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {fileItem.size ? (fileItem.size / 1024 / 1024).toFixed(2) : (fileItem.file?.size ? (fileItem.file.size / 1024 / 1024).toFixed(2) : '0')} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(fileItem.id)}
                          className="text-gray-400 hover:text-red-600 p-1 transition-colors duration-200"
                          title="Удалить файл"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Отображение ошибок валидации */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Ошибки валидации:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {Object.entries(errors).map(([key, message]) => (
                      <li key={key}>• {message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Кнопка для перехода к следующему шагу */}
              <div className="flex justify-end items-center pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 mr-3 font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    console.log('Кнопка "Далее: Участники" нажата');
                    console.log('Текущий step:', step);
                    console.log('formData:', formData);
                    console.log('eventType:', eventType);
                    console.log('examData:', examData);
                  }}
                  className="px-6 py-3 bg-[#06A478] text-white rounded-xl hover:bg-[#05976b] transition-all duration-200 font-medium flex items-center gap-2 shadow-lg"
                >
                  <span>Далее: Участники</span>
                  <ArrowRight className="w-4 h-4" />
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
                      <button
                        type="button"
                        onClick={downloadTPTemplate}
                        className="text-sm text-green-600 hover:text-green-700 flex items-center space-x-1"
                      >
                        <Download size={14} />
                        <span>Шаблон ТП</span>
                      </button>
                      <label className="px-3 py-1.5 bg-sns-500 text-white rounded-lg hover:bg-sns-600 transition-colors cursor-pointer text-sm flex items-center space-x-1">
                        <Upload size={14} />
                        <span className="whitespace-nowrap">Загрузить файл</span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".xlsx,.xls"
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-gray-600">
                      <p className="font-medium mb-1">Инструкция по импорту:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Скачайте шаблон и заполните данными участников</li>
                        <li>Обязательные поля: <strong>ФИО</strong> и <strong>Email</strong> или <strong>SAP номер</strong></li>
                        <li>Поддерживаемые форматы: .xlsx, .xls</li>
                        <li>Максимальный размер файла: 10MB</li>
                        <li>Поддерживаются файлы со списками ТП (автоматическое определение)</li>
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <Sparkles size={16} className="text-blue-500 mt-0.5" />
                        </div>
                        <div className="ml-2">
                          <p className="text-xs font-medium text-blue-800">Умный импорт</p>
                          <p className="text-xs text-blue-700 mt-1">
                            Система автоматически определит структуру файла и найдет нужные колонки по названиям заголовков.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {importErrors.length > 0 && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
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
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          Предпросмотр импорта: {importPreview.length} участников
                        </h4>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                            Готово к импорту: {importPreview.filter(p => !p.error).length}
                          </span>
                          <span className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                            С ошибками: {importPreview.filter(p => p.error).length}
                          </span>
                        </div>
                        
                        {/* Статистика по SAP */}
                        {sapAnalysis && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-xs font-medium text-blue-800 mb-2">Анализ SAP номеров:</div>
                            <div className="text-xs text-blue-700 space-y-1">
                              <div className="flex justify-between">
                                <span>Всего SAP номеров:</span>
                                <span className="font-medium">{sapAnalysis.total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-700">✅ Существующих учетных записей:</span>
                                <span className="font-medium text-green-700">{sapAnalysis.existing.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-orange-700">🆕 Будет создано новых:</span>
                                <span className="font-medium text-orange-700">{sapAnalysis.new.length}</span>
                              </div>
                              
                              {sapAnalysis.existing.length > 0 && (
                                <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-xs">
                                  <div className="text-green-800 font-medium mb-1">Существующие SAP:</div>
                                  <div className="text-green-700">
                                    {sapAnalysis.existing.slice(0, 3).join(', ')}
                                    {sapAnalysis.existing.length > 3 && ` и еще ${sapAnalysis.existing.length - 3}`}
                                  </div>
                                </div>
                              )}
                              
                              {sapAnalysis.new.length > 0 && (
                                <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded text-xs">
                                  <div className="text-orange-800 font-medium mb-1">Новые SAP (будут созданы):</div>
                                  <div className="text-orange-700">
                                    {sapAnalysis.new.slice(0, 3).join(', ')}
                                    {sapAnalysis.new.length > 3 && ` и еще ${sapAnalysis.new.length - 3}`}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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
                          <span>Подтвердить ({importPreview.filter(p => !p.error).length})</span>
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Идентификатор / Контакты</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Филиал</th>
                            {importPreview.some(p => p.is_tp) && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Согласование</th>
                            )}
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Статус</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importPreview.map((participant, idx) => (
                            <tr key={idx} className={`${participant.error ? 'bg-red-50' : 'hover:bg-gray-50'} ${participant.is_tp ? 'border-l-4 border-l-blue-500' : ''}`}>
                              <td className="px-3 py-2 text-sm font-medium">
                                {participant.full_name}
                                {participant.is_tp && (
                                  <div className="text-xs text-blue-600 font-medium">ТП</div>
                                )}
                                {sapAnalysis && participant.sap_number && (
                                  <div className={`text-xs font-medium mt-1 ${
                                    sapAnalysis.existing.includes(participant.sap_number)
                                      ? 'text-green-600'
                                      : 'text-orange-600'
                                  }`}>
                                    {sapAnalysis.existing.includes(participant.sap_number)
                                      ? '✅ Существующий'
                                      : '🆕 Новый'
                                    }
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {participant.is_tp ? (
                                  // Для ТП: SAP как главный, телефон, Email малозаметно
                                  <>
                                    {participant.sap_number && <div className="text-blue-600 font-medium">SAP: {participant.sap_number}</div>}
                                    {participant.phone && <div className="text-gray-600 text-xs">Тел: {participant.phone}</div>}
                                    {participant.email && <div className="text-gray-400 text-xs opacity-60">{participant.email}</div>}
                                    {participant.work_experience_days > 0 && (
                                      <div className="text-gray-500 text-xs">Стаж: {participant.work_experience_days} дн.</div>
                                    )}
                                  </>
                                ) : (
                                  // Для обычных участников: Email как главный, SAP, телефон
                                  <>
                                    {participant.email && <div className="text-blue-600">{participant.email}</div>}
                                    {participant.sap_number && <div className="text-gray-600 text-xs">SAP: {participant.sap_number}</div>}
                                    {participant.phone && <div className="text-gray-500 text-xs">Тел: {participant.phone}</div>}
                                    {participant.work_experience_days > 0 && (
                                      <div className="text-gray-500 text-xs">Стаж: {participant.work_experience_days} дн.</div>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm">{participant.position?.name || '-'}</td>
                              <td className="px-3 py-2 text-sm">{participant.territory?.name || '-'}</td>
                              {importPreview.some(p => p.is_tp) && (
                                <td className="px-3 py-2 text-xs">
                                  {participant.approval_status ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      participant.approval_status.toLowerCase().includes('согласован') 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {participant.approval_status}
                                    </span>
                                  ) : '-'}
                                </td>
                              )}
                              <td className="px-3 py-2 text-xs text-center">
                                {participant.error ? (
                                  <div className="flex flex-col items-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Ошибка
                                    </span>
                                    <span className="text-xs text-red-600 mt-1 max-w-32 text-center">
                                      {participant.error}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <Check size={12} className="mr-1" />
                                    Готов
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-gray-500 flex items-center">
                        <X size={14} className="mr-1 text-amber-500" />
                        Участники с ошибками не будут импортированы. Исправьте данные в файле и загрузите снова.
                      </div>
                      
                      {importPreview.filter(p => p.error).length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <Target size={16} className="text-amber-500 mt-0.5" />
                            </div>
                            <div className="ml-2">
                              <p className="text-xs font-medium text-amber-800">Рекомендации по исправлению:</p>
                              <ul className="text-xs text-amber-700 mt-1 space-y-1">
                                <li>• Убедитесь, что все обязательные поля заполнены</li>
                                <li>• Проверьте правильность формата Email адресов</li>
                                <li>• Убедитесь, что ФИО указано полностью</li>
                                <li>• Укажите либо Email, либо SAP номер для каждого участника</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
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
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-[#06A478] text-white rounded-xl hover:bg-[#05976b] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Создатель:</strong> {userProfile?.full_name || user?.email}</p>
              <p><strong>Дата создания:</strong> {new Date().toLocaleDateString('ru')}</p>
              {editingEvent && (
                <p><strong>ID события:</strong> {editingEvent.id}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Модальное окно выбора типа файла */}
      {fileTypeSelection.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Выберите тип файла
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Файл:</p>
                <p className="text-sm font-medium text-gray-900">{fileTypeSelection.file?.name}</p>
                <p className="text-xs text-gray-500">
                  {fileTypeSelection.file?.size ? (fileTypeSelection.file.size / 1024 / 1024).toFixed(2) : '0'} MB
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleFileTypeConfirm('presentation')}
                  className="w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Презентация</p>
                      <p className="text-sm text-gray-500">Слайды, материалы для выступления</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFileTypeConfirm('workbook')}
                  className="w-full p-4 border-2 border-orange-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Рабочая тетрадь</p>
                      <p className="text-sm text-gray-500">Задания, упражнения, материалы для работы</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleFileTypeCancel}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  Отмена
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}