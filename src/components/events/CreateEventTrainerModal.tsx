import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Users, Star, LinkIcon, Save, Upload, Search, AlertCircle, Check, Download, FileSpreadsheet, Plus, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { createRegularUser } from '../../lib/userManagement';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface EventType {
  id: string;
  name: string;
  name_ru: string;
  description: string;
  is_online: boolean;
}

interface ParticipantData {
  id?: string;
  full_name: string;
  sap_number?: string;
  email?: string;
  position?: string;
  territory?: string;
  work_experience_days?: number;
  phone?: string;
  exists?: boolean;
  error?: string | null;
  status?: 'new' | 'existing' | 'error';
}

interface CreateEventTrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEventTrainerModal({ isOpen, onClose, onSuccess }: CreateEventTrainerModalProps) {
  const { user } = useAuth();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '09:00',
    location: '',
    meeting_link: '',
    points: 100,
  });

  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [importPreview, setImportPreview] = useState<ParticipantData[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Format date for input
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];

  // Load event types from database
  useEffect(() => {
    const loadEventTypes = async () => {
      setLoadingTypes(true);
      try {
        const { data, error } = await supabase
          .from('event_types')
          .select('*')
          .in('name', ['online_training', 'offline_training'])
          .order('is_online', { ascending: false });

        if (error) throw error;
        
        setEventTypes(data || []);
        
        // Set first event type as default
        if (data && data.length > 0) {
          setSelectedType(data[0]);
          // Set the appropriate title based on the training type
          if (data[0].name === 'online_training') {
            setFormData(prev => ({
              ...prev,
              title: "Онлайн-тренинг \"Технология эффективных продаж\"",
              meeting_link: prev.meeting_link,
              location: ''
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              title: "Очный тренинг \"Управление территорией для развития АКБ и получения максимального бонуса\"",
              meeting_link: '',
              location: prev.location
            }));
          }
        }
      } catch (error) {
        console.error('Error loading event types:', error);
      } finally {
        setLoadingTypes(false);
      }
    };

    if (isOpen) {
      loadEventTypes();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: 'Стандартное мероприятие для тренеров СПП',
        start_date: formattedDate,
        start_time: '09:00',
        location: '',
        meeting_link: '',
        points: 100,
      });
      setParticipants([]);
      setCurrentStep(1);
      setErrors({});
      setImportErrors([]);
      setImportPreview([]);
      setShowImportPreview(false);
    }
  }, [isOpen]);

  // Event type change handler
  const handleTypeChange = (type: EventType) => {
    setSelectedType(type);
    
    // Set the fixed title based on training type
    if (type.name === 'online_training') {
      setFormData(prev => ({
        ...prev,
        title: "Онлайн-тренинг \"Технология эффективных продаж\"",
        meeting_link: prev.meeting_link || '',
        location: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        title: "Очный тренинг \"Управление территорией для развития АКБ и получения максимального бонуса\"",
        meeting_link: '',
        location: prev.location || ''
      }));
    }
  };

  // Outside click handler for search results
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

  // Search users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, sap_number, phone, position_id, territory_id, position:position_id(name), territory:territory_id(name)')
        .or(`full_name.ilike.%${query}%, email.ilike.%${query}%, sap_number.ilike.%${query}%`)
        .order('full_name')
        .limit(10);

      if (error) throw error;
      
      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Add participant from search
  const addParticipantFromSearch = (user) => {
    // Check if already added
    if (participants.some(p => p.id === user.id)) {
      return;
    }

    setParticipants([...participants, {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      sap_number: user.sap_number,
      phone: user.phone,
      position: user.position?.name,
      territory: user.territory?.name,
      exists: true,
      status: 'existing'
    }]);
    
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Remove participant
  const removeParticipant = (index) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  // Handle file import
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);
    try {
      const data = await readExcelFile(file);
      setImportPreview(data);
      setShowImportPreview(true);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setImportErrors([error.message]);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Read and parse Excel file
  const readExcelFile = (file): Promise<ParticipantData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert to JSON starting from row 13 (as per template)
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 12 });
          
          if (jsonData.length === 0) {
            throw new Error('Файл не содержит данных. Убедитесь, что данные начинаются с 13-й строки.');
          }
          
          // Map Excel columns to participant data
          const parsedData: ParticipantData[] = jsonData.map((row: any, index) => {
            // Получаем значения из колонок на основе шаблона
            // B - Full name, C - SAP, D - Position, E - Territory, F - Experience, H - Phone, I - Email
            const fullName = row['__EMPTY_1'] || ''; // Column B
            const sapNumber = row['__EMPTY_2'] || ''; // Column C
            const position = row['__EMPTY_3'] || ''; // Column D
            const territory = row['__EMPTY_4'] || ''; // Column E
            const experience = row['__EMPTY_5'] || 0; // Column F
            const phone = row['__EMPTY_7'] || ''; // Column H
            const email = row['__EMPTY_8'] || ''; // Column I
            
            // Validate required fields
            let error = null;
            if (!fullName) {
              error = 'Отсутствует ФИО';
            } else if (!email && !sapNumber) {
              error = 'Необходимо указать либо Email, либо SAP номер';
            }
            
            return {
              full_name: fullName,
              sap_number: sapNumber || null,
              position: position,
              territory: territory,
              work_experience_days: experience || 0,
              phone: phone,
              email: email || null,
              error,
              status: error ? 'error' : 'new'
            };
          });
          
          resolve(parsedData);
        } catch (error) {
          console.error('Error parsing Excel:', error);
          reject(new Error('Ошибка при чтении файла. Убедитесь, что файл соответствует шаблону.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  // Confirm imported participants
  const confirmImport = async () => {
    // Add to participants
    const validParticipants = importPreview.filter(p => !p.error);
    setParticipants(prev => [...prev, ...validParticipants]);
    setShowImportPreview(false);
    setImportPreview([]);
  };

  // Download import template
  const downloadTemplate = () => {
    const templateUrl = '/templates/participants_import_template.xlsx';
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = 'Шаблон_импорта_участников.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedType) {
      newErrors.event_type = 'Тип тренинга обязателен';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Дата начала обязательна';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Время начала обязательно';
    }

    if (selectedType?.is_online && !formData.meeting_link) {
      newErrors.meeting_link = 'Ссылка на встречу обязательна для онлайн-тренинга';
    }

    if (selectedType && !selectedType.is_online && !formData.location) {
      newErrors.location = 'Место проведения обязательно для очного тренинга';
    }

    if (participants.length === 0 && currentStep === 2) {
      newErrors.participants = 'Необходимо добавить хотя бы одного участника';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form navigation
  const handleNextStep = () => {
    if (validateForm()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!selectedType) return;

    setSaving(true);

    try {
      // Prepare event data
      const startDateTime = `${formData.start_date}T${formData.start_time}:00`;
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        event_type_id: selectedType.id,
        start_date: startDateTime,
        location: formData.location.trim() || null,
        meeting_link: formData.meeting_link.trim() || null,
        points: formData.points,
        creator_id: user?.id,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create event
      const { data: createdEvent, error: eventError } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (eventError) {
        console.error("Ошибка создания мероприятия:", eventError);
        throw eventError;
      }

      // Process participants and create any new users
      if (participants.length > 0) {
        const participantsPromises = participants.map(async (participant) => {
          let userId = participant.id;

          // Если пользователь не существует, создаем нового
          if (!userId) {
            try {
              // Create user in database
              const result = await createRegularUser(
                participant.email || '',
                participant.full_name,
                'employee',
                '123456',
                {
                  sap_number: participant.sap_number || null,
                  phone: participant.phone || null,
                  work_experience_days: participant.work_experience_days || 0
                }
              );

              if (result.success && result.user) {
                userId = result.user.id;
              } else {
                console.error('Error creating user:', result.message);
                return null;
              }
            } catch (error) {
              console.error('Error creating user:', error);
              return null;
            }
          }

          // Return participant data for event_participants table
          return {
            event_id: createdEvent.id,
            user_id: userId
          };
        });

        // Wait for all participant processing to complete
        const participantsData = (await Promise.all(participantsPromises)).filter(Boolean);

        // Add participants to event
        if (participantsData.length > 0) {
          const { error: participantsError } = await supabase
            .from('event_participants')
            .insert(participantsData);

          if (participantsError) {
            console.error("Ошибка добавления участников:", participantsError);
            throw participantsError;
          }
        }
      }
      
      // Успешно создали мероприятие
      console.log("Мероприятие успешно создано:", createdEvent);

      onSuccess();
    } catch (error) {
      console.error('Error saving event:', error);
      setErrors({ submit: error.message || 'Ошибка при сохранении мероприятия' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Создание мероприятия для тренеров
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Event Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Training Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Тип тренинга
                </label>
                {loadingTypes ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Загрузка типов событий...</p>
                  </div>
                ) : eventTypes.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Типы событий не найдены</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {eventTypes.map(type => (
                    <div
                      key={type.id}
                      onClick={() => handleTypeChange(type)}
                      className={clsx(
                        "p-4 border rounded-lg cursor-pointer transition-colors",
                        selectedType?.id === type.id 
                          ? "border-sns-500 bg-sns-50" 
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={clsx(
                          "w-4 h-4 rounded-full flex items-center justify-center border",
                          selectedType?.id === type.id 
                            ? "border-sns-500" 
                            : "border-gray-300"
                        )}>
                          {selectedType?.id === type.id && (
                            <div className="w-2 h-2 rounded-full bg-sns-500"></div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{type.name_ru || type.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 pl-6">{type.description || type.name_ru || type.name}</p>
                    </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title and Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                  <span>Название мероприятия *</span>
                  <span className="text-xs text-gray-500">(автоматически заполняется)</span>
                </label>
                <div
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                    errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {selectedType?.name === 'online_training' 
                    ? 'Онлайн-тренинг "Технология эффективных продаж"' 
                    : 'Очный тренинг "Управление территорией для развития АКБ и получения максимального бонуса"'}
                </div>
                <input
                  type="hidden"
                  value={formData.title}
                  name="title"
                  required
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание
                </label>
                <p className="text-xs text-gray-500 mb-2">Дополнительная информация о мероприятии (необязательно)</p>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent"
                  placeholder="Опишите цели и содержание тренинга"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                        errors.start_date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      required
                      min={formattedDate}
                    />
                  </div>
                  {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Время *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">По умолчанию: 09:00</p>
                 <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                        errors.start_time ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      required
                    />
                  </div>
                  {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>}
                </div>
              </div>

              {/* Location or Meeting Link */}
              <div>
                {selectedType?.is_online ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ссылка на встречу *
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        value={formData.meeting_link}
                        onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                          errors.meeting_link ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                    {errors.meeting_link && <p className="mt-1 text-sm text-red-600">{errors.meeting_link}</p>}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Место проведения *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-sns-500 focus:border-transparent ${
                          errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Адрес или название помещения"
                      />
                    </div>
                    {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                  </div>
                )}
              </div>

              {/* Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Баллы за участие
                </label>
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.points}
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 bg-gray-50 rounded-lg"
                    min="0"
                    readOnly
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Next Step Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!selectedType || loadingTypes}
                  className="w-full px-4 py-2 bg-sns-600 text-white rounded-lg hover:bg-sns-700 transition-colors"
                >
                  Далее: Добавление участников
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Participants */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Добавление участников
                {participants.length > 0 && (
                  <span className="ml-2 text-sm text-gray-600">({participants.length})</span>
                )}
              </h3>
              {/* Search and Add */}
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
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
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
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showSearchResults && searchTerm && searchResults.length === 0 && !isSearching && (
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

                  {importing && (
                    <div className="mt-2 flex items-center text-gray-600">
                      <div className="w-4 h-4 mr-2 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                      Обработка файла...
                    </div>
                  )}
                  
                  {importErrors.length > 0 && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <AlertCircle size={16} className="text-red-500 mr-2" />
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

                {/* Import Preview */}
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
                          <Check size={14} />
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
                              <td className="px-3 py-2 text-sm">{participant.position || '-'}</td>
                              <td className="px-3 py-2 text-xs text-center">
                                {participant.error ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Ошибка
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
                      <AlertCircle size={14} className="mr-1 text-amber-500" />
                      Пользователи с ошибками не будут импортированы. Исправьте данные в файле и загрузите снова.
                    </div>
                  </div>
                )}

                {/* Participants List */}
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
                              <td className="px-3 py-2 text-sm hidden md:table-cell">{participant.position || '-'}</td>
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

              {/* Navigation Buttons */}
              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Назад
                </button>
                
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-sns-600 text-white rounded-lg hover:bg-sns-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                 {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Создать мероприятие</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Form Submission Error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-red-500 mr-2" />
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}