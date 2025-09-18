import React, { useState, useEffect } from 'react';
import { X, UserPlus, Calendar, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Reservist {
  id: string;
  full_name: string;
  email: string;
  dossier?: {
    age?: number;
  };
}

interface ScheduleItem {
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
}

interface AddReservistToScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examTitle: string;
  scheduleItems: ScheduleItem[];
  onSuccess: () => void;
}

const AddReservistToScheduleModal: React.FC<AddReservistToScheduleModalProps> = ({
  isOpen,
  onClose,
  examId,
  examTitle,
  scheduleItems,
  onSuccess
}) => {
  const [reservists, setReservists] = useState<Reservist[]>([]);
  const [selectedReservist, setSelectedReservist] = useState<string>('');
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<string>('');
  const [presentationNumber, setPresentationNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем резервистов при открытии модала
  useEffect(() => {
    if (isOpen) {
      fetchReservists();
    }
  }, [isOpen]);

  const fetchReservists = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          dossier:user_doirp(age)
        `)
        .eq('role', 'reservist')
        .order('full_name');

      if (error) {
        console.error('Ошибка загрузки резервистов:', error);
        setError('Ошибка загрузки списка резервистов');
        return;
      }

      setReservists(data || []);
    } catch (err) {
      console.error('Ошибка fetchReservists:', err);
      setError('Ошибка загрузки резервистов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReservist || !selectedScheduleItem) {
      setError('Пожалуйста, выберите резервиста и этап расписания');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Добавляем резервиста в участники экзамена
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: examId,
          user_id: selectedReservist,
          status: 'confirmed'
        });

      if (participantError) {
        console.error('Ошибка добавления участника:', participantError);
        setError('Ошибка добавления резервиста в участники экзамена');
        return;
      }

      // Добавляем назначение на выступление
      const { error: assignmentError } = await supabase
        .from('presentation_assignments')
        .insert({
          event_id: examId,
          user_id: selectedReservist,
          presentation_number: presentationNumber,
          stage: selectedScheduleItem
        });

      if (assignmentError) {
        console.error('Ошибка назначения выступления:', assignmentError);
        setError('Ошибка назначения номера выступления');
        return;
      }

      // Успешно добавлено
      onSuccess();
      onClose();
      
    } catch (err) {
      console.error('Ошибка добавления резервиста:', err);
      setError('Ошибка добавления резервиста');
    } finally {
      setLoading(false);
    }
  };

  const getAgeText = (age?: number): string => {
    if (!age) return '';
    
    const lastDigit = age % 10;
    const lastTwoDigits = age % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return `${age} лет`;
    }
    
    if (lastDigit === 1) {
      return `${age} год`;
    } else if (lastDigit >= 2 && lastDigit <= 4) {
      return `${age} года`;
    } else {
      return `${age} лет`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#06A478]/5 via-[#06A478]/10 to-[#06A478]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#06A478] rounded-lg">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Добавить резервиста в расписание</h2>
                <p className="text-sm text-gray-600">{examTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Выбор резервиста */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Выберите резервиста
              </label>
              <select
                value={selectedReservist}
                onChange={(e) => setSelectedReservist(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#06A478]/20 focus:border-[#06A478] transition-colors"
                required
              >
                <option value="">Выберите резервиста</option>
                {reservists.map((reservist) => (
                  <option key={reservist.id} value={reservist.id}>
                    {reservist.full_name} {reservist.dossier?.age && `(${getAgeText(reservist.dossier.age)})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Выбор этапа расписания */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Выберите этап расписания
              </label>
              <select
                value={selectedScheduleItem}
                onChange={(e) => setSelectedScheduleItem(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#06A478]/20 focus:border-[#06A478] transition-colors"
                required
              >
                <option value="">Выберите этап</option>
                {scheduleItems.map((item, index) => (
                  <option key={item.id || index} value={item.title}>
                    {item.title} {item.time && `(${item.time})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Номер выступления */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Номер выступления
              </label>
              <input
                type="number"
                value={presentationNumber}
                onChange={(e) => setPresentationNumber(parseInt(e.target.value) || 1)}
                min="1"
                max="999"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#06A478]/20 focus:border-[#06A478] transition-colors"
                required
              />
            </div>

            {/* Ошибка */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || !selectedReservist || !selectedScheduleItem}
                className="flex-1 px-6 py-3 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: 'linear-gradient(to right, #06A478, #059669)',
                }}
              >
                {loading ? 'Добавление...' : 'Добавить резервиста'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddReservistToScheduleModal;
