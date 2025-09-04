import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowLeft,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';


interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_type: {
    id: string;
    name: string;
    name_ru: string;
    has_entry_test: boolean;
    has_final_test: boolean;
  };
}

interface Participant {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  attended: boolean;
  entry_test_score: number | null;
  final_test_score: number | null;
  test_attempts: TestAttempt[];
}

interface TestAttempt {
  id: string;
  test_id: string;
  event_id: string;
  status: 'in_progress' | 'completed' | 'failed';
  score: number | null;
  start_time: string;
  end_time: string | null;
  test: {
    id: string;
    title: string;
    type: 'entry' | 'final' | 'annual';
    passing_score: number;
  };
}

interface TestAnswer {
  id: string;
  question_id: string;
  answer_id?: string;
  text_answer?: string;
  is_correct: boolean;
  user_order?: string[];
  question: {
    id: string;
    question: string;
    question_type: string;
    points: number;
    correct_order?: string[];
    answers?: {
      id: string;
      text: string;
      is_correct: boolean;
      order: number;
    }[];
    sequence_answers?: {
      id: string;
      question_id: string;
      answer_order: number;
      answer_text: string;
    }[];
  };
}

interface DetailedTestResult {
  id: string;
  test_id: string;
  event_id: string;
  status: string;
  score: number;
  start_time: string;
  end_time: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  test: {
    id: string;
    title: string;
    description?: string;
    type: 'entry' | 'final' | 'annual';
    passing_score: number;
    time_limit: number;
  };
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
  answers?: TestAnswer[];
}

interface TestResultsOverviewProps {
  eventId?: string; // Если не указан, показываем все мероприятия
  onBack?: () => void; // Функция для возврата назад
}

export function TestResultsOverview({ eventId, onBack }: TestResultsOverviewProps) {
  const { userProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTestType, setSelectedTestType] = useState<'all' | 'entry' | 'final' | 'annual'>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();
  
  // Состояние для модального окна с детальными результатами
  const [showTestDetailsModal, setShowTestDetailsModal] = useState(false);
  const [selectedTestResult, setSelectedTestResult] = useState<DetailedTestResult | null>(null);
  const [loadingTestDetails, setLoadingTestDetails] = useState(false);
  const [testDetailsError, setTestDetailsError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      // Если указан конкретный eventId, загружаем только его
      loadSingleEvent(eventId);
    } else {
      // Иначе загружаем все мероприятия
      loadEvents();
    }
  }, [eventId]);

  const loadEvents = async () => {
    console.log('loadEvents called');
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching events from Supabase...');
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          end_date,
          event_type:event_type_id(
            id,
            name,
            name_ru,
            has_entry_test,
            has_final_test
          )
        `)
        .order('start_date', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) throw error;
      console.log('Setting events:', data || []);
      console.log('Events count:', data?.length || 0);
      setEvents(data || []);
    } catch (err: any) {
      console.error('Ошибка загрузки мероприятий:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSingleEvent = async (eventId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          end_date,
          event_type:event_type_id(
            id,
            name,
            name_ru,
            has_entry_test,
            has_final_test
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvents([data]);
      setSelectedEvent(data);
      setExpandedEvent(data.id);
      loadEventParticipants(data.id);
    } catch (err: any) {
      console.error('Ошибка загрузки мероприятия:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEventParticipants = async (eventId: string) => {
    console.log('loadEventParticipants called for eventId:', eventId);
    setLoading(true);
    setError(null);
    
    try {
      // Загружаем участников мероприятия
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          attended,
          entry_test_score,
          final_test_score,
          user:users(
            id,
            full_name,
            email
          )
        `)
        .eq('event_id', eventId);

      console.log('Participants data:', participantsData);
      console.log('Participants error:', participantsError);

      if (participantsError) throw participantsError;

      // Загружаем попытки прохождения тестов для всех участников
      const participantIds = participantsData?.map(p => p.user_id) || [];
      
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          user_id,
          test_id,
          event_id,
          status,
          score,
          start_time,
          end_time,
          test:tests(
            id,
            title,
            type,
            passing_score
          )
        `)
        .eq('event_id', eventId)
        .in('user_id', participantIds);

      if (attemptsError) throw attemptsError;

      // Группируем попытки по пользователям
      const attemptsByUser: { [key: string]: TestAttempt[] } = {};
      attemptsData?.forEach(attempt => {
        if (!attemptsByUser[attempt.user_id]) {
          attemptsByUser[attempt.user_id] = [];
        }
        attemptsByUser[attempt.user_id].push(attempt);
      });



      // Формируем финальный список участников с попытками
      const formattedParticipants = participantsData?.map(participant => {
        const userAttempts = attemptsByUser[participant.user_id] || [];
        
        // Находим лучшие результаты для каждого типа теста
        const entryAttempt = userAttempts
          .filter(attempt => attempt.test.type === 'entry' && attempt.status === 'completed')
          .sort((a, b) => (b.score || 0) - (a.score || 0))[0];
          
        const finalAttempt = userAttempts
          .filter(attempt => attempt.test.type === 'final' && attempt.status === 'completed')
          .sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        
        return {
          id: participant.id,
          user_id: participant.user_id,
          full_name: participant.user?.full_name || 'Неизвестный пользователь',
          email: participant.user?.email || '',
          attended: participant.attended,
          entry_test_score: entryAttempt?.score || participant.entry_test_score,
          final_test_score: finalAttempt?.score || participant.final_test_score,
          test_attempts: userAttempts
        };
      }) || [];

      console.log('Formatted participants:', formattedParticipants);
      setParticipants(formattedParticipants);
    } catch (err: any) {
      console.error('Ошибка загрузки участников:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    const newExpandedEvent = expandedEvent === event.id ? null : event.id;
    console.log('Event clicked:', event.title, 'Current expanded:', expandedEvent, 'New expanded:', newExpandedEvent);
    
    setSelectedEvent(event);
    setExpandedEvent(newExpandedEvent);
    
    // Если раскрываем карточку, загружаем участников
    if (newExpandedEvent === event.id) {
      console.log('Loading participants for event:', event.id);
      loadEventParticipants(event.id);
    }
  };

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'entry': return 'Входной тест';
      case 'final': return 'Финальный тест';
      case 'annual': return 'Годовой тест';
      default: return 'Тест';
    }
  };

  const getTestTypeColor = (type: string) => {
    switch (type) {
      case 'entry': return 'bg-blue-100 text-blue-800';
      case 'final': return 'bg-purple-100 text-purple-800';
      case 'annual': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };



  const exportToPDF = async () => {
    if (!selectedTestResult) return;

    try {
      // Рассчитываем статистику
      let totalPoints = 0;
      let earnedPoints = 0;
      let correctAnswers = 0;
      let totalQuestions = selectedTestResult.answers?.length || 0;
      
      selectedTestResult.answers?.forEach(answer => {
        totalPoints += answer.question.points;
        
        let isCorrect = false;
        if (answer.question.question_type === 'single_choice' && answer.answer_id) {
          const selectedAnswer = answer.question.answers?.find(a => a.id === answer.answer_id);
          isCorrect = selectedAnswer?.is_correct || false;
        } else if (answer.question.question_type === 'sequence' && answer.user_order) {
          const sequenceAnswers = answer.question.sequence_answers || [];
          const correctOrder = sequenceAnswers
            .sort((a, b) => a.answer_order - b.answer_order)
            .map(item => item.id);
          isCorrect = JSON.stringify(answer.user_order) === JSON.stringify(correctOrder);
        } else {
          isCorrect = answer.is_correct;
        }
        
        if (isCorrect) {
          earnedPoints += answer.question.points;
          correctAnswers++;
        }
      });
      
      const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // Создаем HTML для PDF с компактным дизайном
      const createPageHTML = (questions: TestAnswer[], startIndex: number, isFirstPage: boolean = false) => {
        const questionsForPage = questions.slice(startIndex);
        
        return `
          <div style="
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
            color: #1f2937;
          ">
            ${isFirstPage ? `
              <!-- Заголовок -->
              <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
                <h1 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Результаты тестирования</h1>
                <h2 style="color: #6b7280; font-size: 16px; font-weight: 500; margin: 0;">${selectedTestResult.test.title}</h2>
              </div>

              <!-- Основная информация -->
              <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                  <div>
                    <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">Информация о тестировании</h3>
                    <div style="font-size: 11px;">
                      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500; color: #374151;">Сотрудник:</span>
                        <span style="color: #1f2937;">${selectedTestResult.user?.full_name || 'Не указан'}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500; color: #374151;">Мероприятие:</span>
                        <span style="color: #1f2937;">${selectedTestResult.event.title}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500; color: #374151;">Дата прохождения:</span>
                        <span style="color: #1f2937;">${formatDateForPDF(selectedTestResult.start_time)}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="font-weight: 500; color: #374151;">Проходной балл:</span>
                        <span style="color: #1f2937;">${selectedTestResult.test.passing_score}%</span>
                      </div>
                    </div>
                  </div>
                  <div style="text-align: center; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 28px; font-weight: 700; color: ${percentage >= selectedTestResult.test.passing_score ? '#059669' : '#dc2626'}; margin-bottom: 3px;">
                      ${percentage}%
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                      ${earnedPoints} / ${totalPoints} баллов
                    </div>
                    <div style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; color: white; background-color: ${percentage >= selectedTestResult.test.passing_score ? '#059669' : '#dc2626'};">
                      ${percentage >= selectedTestResult.test.passing_score ? '✓ Тест пройден' : '✗ Тест не пройден'}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Статистика -->
              <div style="margin-bottom: 20px;">
                <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Статистика результатов</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
                  <div style="text-align: center; flex: 1;">
                    <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 3px;">${totalQuestions}</div>
                    <div style="font-size: 11px; color: #6b7280;">Всего вопросов</div>
                  </div>
                  <div style="text-align: center; flex: 1;">
                    <div style="font-size: 18px; font-weight: 700; color: #059669; margin-bottom: 3px;">${correctAnswers}</div>
                    <div style="font-size: 11px; color: #6b7280;">Правильных ответов</div>
                  </div>
                  <div style="text-align: center; flex: 1;">
                    <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 3px;">${totalPoints}</div>
                    <div style="font-size: 11px; color: #6b7280;">Максимальный балл</div>
                  </div>
                  <div style="text-align: center; flex: 1;">
                    <div style="font-size: 18px; font-weight: 700; color: #3b82f6; margin-bottom: 3px;">${earnedPoints}</div>
                    <div style="font-size: 11px; color: #6b7280;">Заработано баллов</div>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Вопросы -->
            <div style="margin-bottom: 20px;">
              ${isFirstPage ? '<h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Детальные ответы</h3>' : ''}
              ${questionsForPage.map((answer, index) => {
                const questionIndex = startIndex + index;
                let isCorrect = false;
                let userAnswerText = '';
                let correctAnswerText = '';

                if (answer.question.question_type === 'single_choice' && answer.answer_id) {
                  const selectedAnswer = answer.question.answers?.find(a => a.id === answer.answer_id);
                  isCorrect = selectedAnswer?.is_correct || false;
                  userAnswerText = selectedAnswer?.text || 'Ответ не найден';
                  correctAnswerText = answer.question.answers?.find(a => a.is_correct)?.text || 'Правильный ответ не найден';
                } else if (answer.question.question_type === 'sequence' && answer.user_order) {
                  const sequenceAnswers = answer.question.sequence_answers || [];
                  const correctOrder = sequenceAnswers
                    .sort((a, b) => a.answer_order - b.answer_order)
                    .map(item => item.id);
                  isCorrect = JSON.stringify(answer.user_order) === JSON.stringify(correctOrder);
                  
                  const userAnswers = answer.user_order.map(id => {
                    const answer = sequenceAnswers.find(sa => sa.id === id);
                    return answer ? answer.answer_text : `ID: ${id}`;
                  });
                  const correctAnswers = correctOrder.map(id => {
                    const answer = sequenceAnswers.find(sa => sa.id === id);
                    return answer ? answer.answer_text : `ID: ${id}`;
                  });
                  
                  userAnswerText = userAnswers.join(' → ');
                  correctAnswerText = correctAnswers.join(' → ');
                } else {
                  isCorrect = answer.is_correct;
                  userAnswerText = answer.text_answer || 'Ответ не предоставлен';
                  correctAnswerText = 'Правильный ответ не указан';
                }

                return `
                  <div style="margin-bottom: 15px; padding: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                      <h4 style="color: #1f2937; font-size: 13px; font-weight: 600; margin: 0; flex: 1;">Вопрос ${questionIndex + 1}: ${answer.question.question}</h4>
                      <span style="padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; color: white; background-color: ${isCorrect ? '#059669' : '#dc2626'}; margin-left: 10px; white-space: nowrap;">
                        ${isCorrect ? '✓ Правильно' : '✗ Неправильно'}
                      </span>
                    </div>
                    <div style="padding: 8px; background: ${isCorrect ? '#f0fdf4' : '#fef2f2'}; border-radius: 6px; margin-bottom: 8px;">
                      <div style="font-weight: 600; color: #374151; margin-bottom: 3px; font-size: 11px;">Ответ сотрудника:</div>
                      <div style="color: #1f2937; line-height: 1.4; font-size: 11px;">${userAnswerText}</div>
                    </div>
                    ${!isCorrect ? `
                      <div style="padding: 8px; background: #f0fdf4; border-radius: 6px;">
                        <div style="font-weight: 600; color: #374151; margin-bottom: 3px; font-size: 11px;">Правильный ответ:</div>
                        <div style="color: #059669; line-height: 1.4; font-size: 11px;">${correctAnswerText}</div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Подпись -->
            <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <div style="color: #6b7280; font-size: 10px; line-height: 1.4;">
                <div style="margin-bottom: 3px;">Отчет сгенерирован автоматически</div>
                <div>${new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })} в ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>
        `;
      };

      // Функция для создания временного элемента
      const createTempElement = (html: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '800px';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.style.fontFamily = 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
        tempDiv.style.fontSize = '14px';
        tempDiv.style.lineHeight = '1.6';
        document.body.appendChild(tempDiv);
        return tempDiv;
      };

      // Функция для измерения высоты элемента
      const measureHeight = (element: HTMLElement) => {
        return element.offsetHeight;
      };

      // Функция для добавления страницы в PDF
      const addPageToPDF = async (html: string) => {
        const tempElement = createTempElement(html);
        const canvas = await html2canvas(tempElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 800,
          height: tempElement.offsetHeight,
          scrollX: 0,
          scrollY: 0
        });
        document.body.removeChild(tempElement);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        return pdf;
      };

      // Создаем PDF с разбивкой по вопросам
      const questions = selectedTestResult.answers || [];
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = 297; // A4 height in mm
      const maxContentHeight = pageHeight - 40; // Оставляем отступы
      
      let currentY = 0;
      
      // Функция для создания HTML одного вопроса
      const createQuestionHTML = (answer: TestAnswer, questionIndex: number) => {
        let isCorrect = false;
        let userAnswerText = '';
        let correctAnswerText = '';

        if (answer.question.question_type === 'single_choice' && answer.answer_id) {
          const selectedAnswer = answer.question.answers?.find(a => a.id === answer.answer_id);
          isCorrect = selectedAnswer?.is_correct || false;
          userAnswerText = selectedAnswer?.text || 'Ответ не найден';
          correctAnswerText = answer.question.answers?.find(a => a.is_correct)?.text || 'Правильный ответ не найден';
        } else if (answer.question.question_type === 'sequence' && answer.user_order) {
          const sequenceAnswers = answer.question.sequence_answers || [];
          const correctOrder = sequenceAnswers
            .sort((a, b) => a.answer_order - b.answer_order)
            .map(item => item.id);
          isCorrect = JSON.stringify(answer.user_order) === JSON.stringify(correctOrder);
          
          const userAnswers = answer.user_order.map(id => {
            const answer = sequenceAnswers.find(sa => sa.id === id);
            return answer ? answer.answer_text : `ID: ${id}`;
          });
          const correctAnswers = correctOrder.map(id => {
            const answer = sequenceAnswers.find(sa => sa.id === id);
            return answer ? answer.answer_text : `ID: ${id}`;
          });
          
          userAnswerText = userAnswers.join(' → ');
          correctAnswerText = correctAnswers.join(' → ');
        } else {
          isCorrect = answer.is_correct;
          userAnswerText = answer.text_answer || 'Ответ не предоставлен';
          correctAnswerText = 'Правильный ответ не указан';
        }

        return `
          <div style="
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
            color: #1f2937;
          ">
            <div style="margin-bottom: 3px; padding: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                <h4 style="color: #1f2937; font-size: 13px; font-weight: 600; margin: 0; flex: 1;">Вопрос ${questionIndex + 1}: ${answer.question.question}</h4>
                <span style="padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; color: white; background-color: ${isCorrect ? '#059669' : '#dc2626'}; margin-left: 10px; white-space: nowrap; align-self: center;">
                  ${isCorrect ? 'Правильно' : 'Неправильно'}
                </span>
              </div>
              <div style="padding: 6px; background: ${isCorrect ? '#f0fdf4' : '#fef2f2'}; border-radius: 4px; margin-bottom: 6px;">
                <div style="font-weight: 600; color: #374151; margin-bottom: 2px; font-size: 11px;">Ответ сотрудника:</div>
                <div style="color: #1f2937; line-height: 1.3; font-size: 11px;">${userAnswerText}</div>
              </div>
              ${!isCorrect ? `
                <div style="padding: 6px; background: #f0fdf4; border-radius: 4px;">
                  <div style="font-weight: 600; color: #374151; margin-bottom: 2px; font-size: 11px;">Правильный ответ:</div>
                  <div style="color: #059669; line-height: 1.3; font-size: 11px;">${correctAnswerText}</div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      };

      // Создаем HTML для первой страницы (только заголовок и статистика, без вопросов)
      const headerHTML = `
        <div style="
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          background: white; 
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
          color: #1f2937;
        ">
          <!-- Заголовок -->
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb;">
            <h1 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Результаты тестирования</h1>
            <h2 style="color: #6b7280; font-size: 16px; font-weight: 500; margin: 0;">${selectedTestResult.test.title}</h2>
          </div>

          <!-- Основная информация -->
          <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">Информация о тестировании</h3>
                <div style="font-size: 11px;">
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 500; color: #374151;">Сотрудник:</span>
                    <span style="color: #1f2937;">${selectedTestResult.user?.full_name || 'Не указан'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 500; color: #374151;">Мероприятие:</span>
                    <span style="color: #1f2937;">${selectedTestResult.event.title}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 500; color: #374151;">Дата прохождения:</span>
                    <span style="color: #1f2937;">${formatDateForPDF(selectedTestResult.start_time)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: 500; color: #374151;">Проходной балл:</span>
                    <span style="color: #1f2937;">${selectedTestResult.test.passing_score}%</span>
                  </div>
                </div>
              </div>
              <div style="text-align: center; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 28px; font-weight: 700; color: ${percentage >= selectedTestResult.test.passing_score ? '#059669' : '#dc2626'}; margin-bottom: 3px;">
                  ${percentage}%
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                  ${earnedPoints} / ${totalPoints} баллов
                </div>
                <div style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; color: white; background-color: ${percentage >= selectedTestResult.test.passing_score ? '#059669' : '#dc2626'};">
                  ${percentage >= selectedTestResult.test.passing_score ? '✓ Тест пройден' : '✗ Тест не пройден'}
                </div>
              </div>
            </div>
          </div>

          <!-- Статистика -->
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Статистика результатов</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px;">
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 3px;">${totalQuestions}</div>
                <div style="font-size: 11px; color: #6b7280;">Всего вопросов</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 18px; font-weight: 700; color: #059669; margin-bottom: 3px;">${correctAnswers}</div>
                <div style="font-size: 11px; color: #6b7280;">Правильных ответов</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 3px;">${totalPoints}</div>
                <div style="font-size: 11px; color: #6b7280;">Максимальный балл</div>
              </div>
              <div style="text-align: center; flex: 1;">
                <div style="font-size: 18px; font-weight: 700; color: #3b82f6; margin-bottom: 3px;">${earnedPoints}</div>
                <div style="font-size: 11px; color: #6b7280;">Заработано баллов</div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Добавляем первую страницу с заголовком и статистикой
      const firstPageElement = createTempElement(headerHTML);
      const firstPageCanvas = await html2canvas(firstPageElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: firstPageElement.offsetHeight,
        scrollX: 0,
        scrollY: 0
      });
      document.body.removeChild(firstPageElement);

      const firstPageImgData = firstPageCanvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (firstPageCanvas.height * imgWidth) / firstPageCanvas.width;
      
      // Добавляем первую страницу
      pdf.addImage(firstPageImgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Если первая страница не помещается, разбиваем на несколько
      let heightLeft = imgHeight;
      while (heightLeft > pageHeight) {
        pdf.addPage();
        heightLeft -= pageHeight;
        pdf.addImage(firstPageImgData, 'PNG', 0, -pageHeight + heightLeft, imgWidth, imgHeight);
      }

      // Устанавливаем текущую позицию после первой страницы
      currentY = heightLeft > 0 ? heightLeft : 0;

      // Добавляем заголовок для вопросов
      const questionsHeaderHTML = `
        <div style="
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          background: white; 
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
          color: #1f2937;
        ">
          <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Детальные ответы</h3>
        </div>
      `;

      const questionsHeaderElement = createTempElement(questionsHeaderHTML);
      const questionsHeaderCanvas = await html2canvas(questionsHeaderElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: questionsHeaderElement.offsetHeight,
        scrollX: 0,
        scrollY: 0
      });
      document.body.removeChild(questionsHeaderElement);

      const questionsHeaderImgData = questionsHeaderCanvas.toDataURL('image/png');
      const questionsHeaderImgHeight = (questionsHeaderCanvas.height * imgWidth) / questionsHeaderCanvas.width;

      // Проверяем, поместится ли заголовок вопросов на текущей странице
      if (currentY + questionsHeaderImgHeight > maxContentHeight) {
        pdf.addPage();
        currentY = 0;
      }

      // Добавляем заголовок вопросов
      pdf.addImage(questionsHeaderImgData, 'PNG', 0, currentY, imgWidth, questionsHeaderImgHeight);
      currentY += questionsHeaderImgHeight + 5;

      // Добавляем вопросы по одному
      for (let i = 0; i < questions.length; i++) {
        const questionHTML = createQuestionHTML(questions[i], i);
        const questionElement = createTempElement(questionHTML);
        const questionCanvas = await html2canvas(questionElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 800,
          height: questionElement.offsetHeight,
          scrollX: 0,
          scrollY: 0
        });
        document.body.removeChild(questionElement);

        const questionImgData = questionCanvas.toDataURL('image/png');
        const questionImgHeight = (questionCanvas.height * imgWidth) / questionCanvas.width;

        // Проверяем, поместится ли вопрос на текущей странице
        if (currentY + questionImgHeight > maxContentHeight) {
          // Создаем новую страницу
          pdf.addPage();
          currentY = 0;
        }

        // Добавляем вопрос
        pdf.addImage(questionImgData, 'PNG', 0, currentY, imgWidth, questionImgHeight);
        currentY += questionImgHeight + 2; // Добавляем отступ между вопросами
      }

      // Сохраняем файл
      const fileName = `Результаты_теста_${selectedTestResult.user?.full_name?.replace(/\s+/g, '_') || 'Сотрудник'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Ошибка при экспорте в PDF:', error);
      alert('Ошибка при создании PDF файла');
    }
  };

  const loadTestDetails = async (attemptId: string) => {
    setLoadingTestDetails(true);
    setTestDetailsError(null);
    
    try {
      console.log('Loading test details for attempt:', attemptId);
      
      // Загружаем результат теста
      const { data: resultData, error: resultError } = await supabase
        .from('user_test_attempts')
        .select(`
          id,
          test_id,
          event_id,
          user_id,
          status,
          score,
          start_time,
          end_time,
          user:users!user_id(
            id,
            full_name,
            email
          ),
          test:tests(
            id,
            title,
            description,
            type,
            passing_score,
            time_limit
          ),
          event:events(
            id,
            title,
            start_date,
            end_date
          )
        `)
        .eq('id', attemptId)
        .single();

      if (resultError) throw resultError;
      if (!resultData) throw new Error('Результат теста не найден');

      // Если данные пользователя не загрузились через связь, загружаем отдельно
      let userData = resultData.user;
      if (!userData && resultData.user_id) {
        const { data: userResult, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', resultData.user_id)
          .single();
        
        if (!userError && userResult) {
          userData = userResult;
        }
      }

      // Загружаем ответы пользователя (только уникальные вопросы)
      const { data: answersData, error: answersError } = await supabase
        .from('user_test_answers')
        .select(`
          id,
          question_id,
          answer_id,
          text_answer,
          is_correct,
          user_order,
          question:test_questions(
            id,
            question,
            question_type,
            points,
            correct_order,
            answers:test_answers(
              id,
              text,
              is_correct,
              "order"
            )
          )
        `)
        .eq('attempt_id', attemptId)
        .order('question_id', { ascending: true });

      if (answersError) {
        console.error('Error loading answers:', answersError);
        throw answersError;
      }

      // Дополнительно загружаем sequence_answers для sequence вопросов
      const sequenceQuestions = answersData?.filter(answer => answer.question?.question_type === 'sequence') || [];
      const sequenceQuestionIds = sequenceQuestions.map(q => q.question_id);
      
      let sequenceAnswersData: any = {};
      if (sequenceQuestionIds.length > 0) {
        const { data: seqData, error: seqError } = await supabase
          .from('test_sequence_answers')
          .select('*')
          .in('question_id', sequenceQuestionIds)
          .order('answer_order');

        if (!seqError && seqData) {
          // Группируем sequence_answers по question_id
          seqData.forEach(seqAnswer => {
            if (!sequenceAnswersData[seqAnswer.question_id]) {
              sequenceAnswersData[seqAnswer.question_id] = [];
            }
            sequenceAnswersData[seqAnswer.question_id].push(seqAnswer);
          });
        }
      }

      if (answersError) throw answersError;

      // Обновляем resultData с данными пользователя
      const finalResultData = {
        ...resultData,
        user: userData
      };

      // Фильтруем уникальные вопросы (берем только первый ответ для каждого вопроса)
      const uniqueAnswers = answersData ? 
        answersData.reduce((acc, answer) => {
          const existingIndex = acc.findIndex(a => a.question_id === answer.question_id);
          if (existingIndex === -1) {
            // Добавляем sequence_answers к вопросу
            const enrichedAnswer = {
              ...answer,
              question: {
                ...answer.question,
                sequence_answers: sequenceAnswersData[answer.question_id] || []
              }
            };
            acc.push(enrichedAnswer);
          }
          return acc;
        }, [] as typeof answersData) : [];

      setSelectedTestResult({
        ...finalResultData,
        answers: uniqueAnswers || []
      });
      setShowTestDetailsModal(true);
    } catch (err: any) {
      console.error('Ошибка загрузки деталей теста:', err);
      setTestDetailsError(err.message);
    } finally {
      setLoadingTestDetails(false);
    }
  };

  const getEventStats = (event: Event) => {
    // Если участники ещё не загружены для этого мероприятия, возвращаем нули
    if (expandedEvent !== event.id) {
      return {
        totalParticipants: 0,
        entryTestsCompleted: 0,
        finalTestsCompleted: 0,
        annualTestsCompleted: 0,
        averageEntryScore: 0,
        averageFinalScore: 0,
        averageAnnualScore: 0
      };
    }

    // Участники для конкретного мероприятия
    const eventParticipants = participants.filter(p => 
      p.test_attempts.some(attempt => attempt.event_id === event.id)
    );

    console.log(`Event ${event.title} (${event.id}) has ${eventParticipants.length} participants`);

    const totalParticipants = eventParticipants.length;
    const entryTestsCompleted = eventParticipants.filter(p => p.entry_test_score !== null).length;
    const finalTestsCompleted = eventParticipants.filter(p => p.final_test_score !== null).length;
    
    // Подсчитываем годовое тестирование
    const annualTestsCompleted = eventParticipants.filter(p => 
      p.test_attempts.some(attempt => 
        attempt.event_id === event.id && 
        attempt.test.type === 'annual' && 
        attempt.status === 'completed'
      )
    ).length;
    
    const averageEntryScore = entryTestsCompleted > 0 
      ? Math.round(eventParticipants.reduce((sum, p) => sum + (p.entry_test_score || 0), 0) / entryTestsCompleted)
      : 0;
    
    const averageFinalScore = finalTestsCompleted > 0 
      ? Math.round(eventParticipants.reduce((sum, p) => sum + (p.final_test_score || 0), 0) / finalTestsCompleted)
      : 0;

    // Подсчитываем средний балл годового тестирования
    const annualScores = eventParticipants
      .map(p => p.test_attempts.find(attempt => 
        attempt.event_id === event.id && 
        attempt.test.type === 'annual' && 
        attempt.status === 'completed'
      )?.score)
      .filter(score => score !== null && score !== undefined);
    
    const averageAnnualScore = annualScores.length > 0 
      ? Math.round(annualScores.reduce((sum, score) => sum + (score || 0), 0) / annualScores.length)
      : 0;

    return {
      totalParticipants,
      entryTestsCompleted,
      finalTestsCompleted,
      annualTestsCompleted,
      averageEntryScore,
      averageFinalScore,
      averageAnnualScore
    };
  };

  // Фильтрация мероприятий
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTestType = selectedTestType === 'all' || 
      (selectedTestType === 'entry' && event.event_type.has_entry_test) ||
      (selectedTestType === 'final' && event.event_type.has_final_test);
    
    return matchesSearch && matchesTestType;
  });

  console.log('TestResultsOverview render state:', {
    loading,
    error,
    eventsCount: events.length,
    filteredEventsCount: filteredEvents.length,
    participantsCount: participants.length,
    expandedEvent,
    events: events.map(e => ({ id: e.id, title: e.title }))
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sns-green" />
        <span className="text-gray-600 ml-2">Загрузка результатов тестов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          {onBack && (
            <div className="mb-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Назад к управлению тестами</span>
              </button>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Результаты тестов</h1>
          <p className="text-gray-600">Просмотр результатов тестирования по мероприятиям</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Поиск мероприятий..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
            />
          </div>
          
          {/* Фильтр по типу теста */}
          <select
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sns-green focus:border-transparent"
          >
            <option value="all">Все тесты</option>
            <option value="entry">Входные тесты</option>
            <option value="final">Финальные тесты</option>
          </select>
        </div>
      </div>

      {/* Список мероприятий */}
      <div className="space-y-4">
        {filteredEvents.map(event => {
          const isExpanded = expandedEvent === event.id;
          const stats = getEventStats(event);
          const filteredParticipants = participants.filter(p => 
            p.test_attempts.some(attempt => attempt.event_id === event.id)
          );

          return (
            <div key={event.id} className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
              {/* Заголовок мероприятия */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                onClick={() => handleEventClick(event)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar size={16} />
                        <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users size={16} />
                        <span>{stats.totalParticipants} участников</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Входные тесты</div>
                      <div className="text-lg font-bold text-blue-600">
                        {stats.entryTestsCompleted}/{stats.totalParticipants}
                      </div>
                      {stats.entryTestsCompleted > 0 && (
                        <div className="text-xs text-gray-500">
                          Средний балл: {stats.averageEntryScore}%
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Финальные тесты</div>
                      <div className="text-lg font-bold text-purple-600">
                        {stats.finalTestsCompleted}/{stats.totalParticipants}
                      </div>
                      {stats.finalTestsCompleted > 0 && (
                        <div className="text-xs text-gray-500">
                          Средний балл: {stats.averageFinalScore}%
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Годовое тестирование</div>
                      <div className="text-lg font-bold text-orange-600">
                        {stats.annualTestsCompleted || 0}/{stats.totalParticipants}
                      </div>
                      {stats.annualTestsCompleted > 0 && (
                        <div className="text-xs text-gray-500">
                          Средний балл: {stats.averageAnnualScore || 0}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Детали участников */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {loading ? (
                    <div className="p-6 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-sns-green mx-auto" />
                      <span className="text-gray-600 ml-2">Загрузка участников...</span>
                    </div>
                  ) : (
                    <div className="p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Участники и результаты тестов</h4>
                      
                      {filteredParticipants.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                          <p>Нет участников для отображения</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Участник
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Присутствие
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Входной тест
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Финальный тест
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Годовое тестирование
                                </th>

                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredParticipants.map(participant => (
                                <tr key={participant.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {participant.full_name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {participant.email}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={clsx(
                                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                      participant.attended 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-gray-100 text-gray-800"
                                    )}>
                                      {participant.attended ? 'Присутствовал' : 'Отсутствовал'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {participant.entry_test_score !== null ? (
                                      <button
                                        onClick={() => {
                                          const entryAttempt = participant.test_attempts.find(
                                            attempt => attempt.test.type === 'entry' && attempt.status === 'completed'
                                          );
                                          if (entryAttempt) {
                                            console.log('Loading entry test details for attempt:', entryAttempt.id);
                                            loadTestDetails(entryAttempt.id);
                                          }
                                        }}
                                        className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer"
                                        title="Кликните для просмотра деталей входного теста"
                                      >
                                        <span className={clsx(
                                          "text-sm font-medium",
                                          participant.entry_test_score >= 70 
                                            ? "text-green-600" 
                                            : "text-red-600"
                                        )}>
                                          {participant.entry_test_score}%
                                        </span>
                                        {participant.entry_test_score >= 70 ? (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="text-sm text-gray-500">Не проходил</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {participant.final_test_score !== null ? (
                                      <button
                                        onClick={() => {
                                          const finalAttempt = participant.test_attempts.find(
                                            attempt => attempt.test.type === 'final' && attempt.status === 'completed'
                                          );
                                          
                                          if (finalAttempt) {
                                            loadTestDetails(finalAttempt.id);
                                          } else {
                                            // Попробуем найти любую попытку финального теста
                                            const anyFinalAttempt = participant.test_attempts.find(
                                              attempt => attempt.test.type === 'final'
                                            );
                                            if (anyFinalAttempt) {
                                              loadTestDetails(anyFinalAttempt.id);
                                            }
                                          }
                                        }}
                                        className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer"
                                        title="Кликните для просмотра деталей финального теста"
                                      >
                                        <span className={clsx(
                                          "text-sm font-medium",
                                          participant.final_test_score >= 70 
                                            ? "text-green-600" 
                                            : "text-red-600"
                                        )}>
                                          {participant.final_test_score}%
                                        </span>
                                        {participant.final_test_score >= 70 ? (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="text-sm text-gray-500">Не проходил</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {(() => {
                                      const annualAttempt = participant.test_attempts.find(
                                        attempt => attempt.test.type === 'annual' && attempt.status === 'completed'
                                      );
                                      return annualAttempt ? (
                                        <button
                                          onClick={() => {
                                            console.log('Loading annual test details for attempt:', annualAttempt.id);
                                            loadTestDetails(annualAttempt.id);
                                          }}
                                          className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded transition-colors cursor-pointer"
                                          title="Кликните для просмотра деталей годового тестирования"
                                        >
                                          <span className={clsx(
                                            "text-sm font-medium",
                                            annualAttempt.score >= annualAttempt.test.passing_score
                                              ? "text-green-600" 
                                              : "text-red-600"
                                          )}>
                                            {annualAttempt.score}%
                                          </span>
                                          {annualAttempt.score >= annualAttempt.test.passing_score ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                          )}
                                        </button>
                                      ) : (
                                        <span className="text-sm text-gray-500">Не проходил</span>
                                      );
                                    })()}
                                  </td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Мероприятия не найдены</h3>
          <p className="text-gray-600">Попробуйте изменить параметры поиска</p>
        </div>
      )}

      {/* Модальное окно с детальными результатами теста */}
      {showTestDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Детальные результаты теста
                  </h2>
                  {selectedTestResult?.user && (
                    <p className="text-sm text-gray-600 mt-1">
                      Сотрудник: {selectedTestResult.user.full_name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowTestDetailsModal(false);
                    setSelectedTestResult(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingTestDetails ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-sns-green mx-auto" />
                  <span className="text-gray-600 ml-2">Загрузка деталей...</span>
                </div>
              ) : testDetailsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600">{testDetailsError}</p>
                </div>
              ) : selectedTestResult ? (
                <div className="space-y-6">
                  {/* Основная информация о тесте */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{selectedTestResult.test.title}</h3>
                        <p className="text-sm text-gray-600">{selectedTestResult.event.title}</p>
                      </div>
                      <div className="text-center">
                        <div className={clsx(
                          "text-3xl font-bold",
                          selectedTestResult.score >= selectedTestResult.test.passing_score
                            ? "text-green-600"
                            : "text-red-600"
                        )}>
                          {selectedTestResult.score}%
                        </div>
                        <div className="text-sm text-gray-500">
                          Проходной балл: {selectedTestResult.test.passing_score}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {formatDate(selectedTestResult.start_time)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {selectedTestResult.test.time_limit > 0 
                            ? `${selectedTestResult.test.time_limit} мин`
                            : 'Без ограничений'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Детали ответов */}
                  {selectedTestResult.answers && selectedTestResult.answers.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900">Ответы на вопросы ({selectedTestResult.answers.length})</h3>
                      {selectedTestResult.answers.map((answer, index) => (
                          <div key={answer.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-gray-900">
                              Вопрос {index + 1}: {answer.question.question}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={clsx(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                (() => {
                                  // Определяем правильность ответа на основе данных
                                  if (answer.question.question_type === 'single_choice') {
                                    if (answer.answer_id) {
                                      const selectedAnswer = answer.question.answers?.find(a => a.id === answer.answer_id);
                                      return selectedAnswer?.is_correct || false;
                                    } else {
                                      // Если ответ не выбран, считаем неправильным
                                      return false;
                                    }
                                  } else if (answer.question.question_type === 'sequence' && answer.user_order) {
                                    const sequenceAnswers = answer.question.sequence_answers || [];
                                    const correctOrder = sequenceAnswers
                                      .sort((a, b) => a.answer_order - b.answer_order)
                                      .map(item => item.id);
                                    return JSON.stringify(answer.user_order) === JSON.stringify(correctOrder);
                                  }
                                  return answer.is_correct || false;
                                })()
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-red-100 text-red-800"
                              )}>
                                {(() => {
                                  // Определяем правильность ответа на основе данных
                                  if (answer.question.question_type === 'single_choice') {
                                    if (answer.answer_id) {
                                      const selectedAnswer = answer.question.answers?.find(a => a.id === answer.answer_id);
                                      return selectedAnswer?.is_correct ? 'Правильно' : 'Неправильно';
                                    } else {
                                      return 'Ответ не выбран';
                                    }
                                  } else if (answer.question.question_type === 'sequence' && answer.user_order) {
                                    const sequenceAnswers = answer.question.sequence_answers || [];
                                    const correctOrder = sequenceAnswers
                                      .sort((a, b) => a.answer_order - b.answer_order)
                                      .map(item => item.id);
                                    return JSON.stringify(answer.user_order) === JSON.stringify(correctOrder) ? 'Правильно' : 'Неправильно';
                                  }
                                  return answer.is_correct ? 'Правильно' : 'Неправильно';
                                })()}
                              </span>

                            </div>
                          </div>

                          {/* Ответ пользователя */}
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Ответ пользователя:</h5>
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              {answer.question.question_type === 'single_choice' ? (
                                answer.answer_id ? (
                                  <p className="text-blue-800">
                                    {answer.question.answers?.find(a => a.id === answer.answer_id)?.text || 'Ответ не найден'}
                                  </p>
                                ) : (
                                  <div className="text-blue-800">
                                    <p className="font-medium mb-2">Ответ не выбран</p>
                                    <p className="text-sm text-gray-600">Доступные варианты:</p>
                                    <ul className="mt-1 space-y-1">
                                      {answer.question.answers?.map((option, idx) => (
                                        <li key={option.id} className="text-sm">
                                          {idx + 1}. {option.text}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              ) : answer.question.question_type === 'multiple_choice' ? (
                                answer.answer_id ? (
                                  <p className="text-blue-800">
                                    {answer.question.answers?.find(a => a.id === answer.answer_id)?.text || 'Ответ не найден'}
                                  </p>
                                ) : (
                                  <div className="text-blue-800">
                                    <p className="font-medium mb-2">Ответ не выбран</p>
                                    <p className="text-sm text-gray-600">Доступные варианты:</p>
                                    <ul className="mt-1 space-y-1">
                                      {answer.question.answers?.map((option, idx) => (
                                        <li key={option.id} className="text-sm">
                                          {idx + 1}. {option.text}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              ) : answer.question.question_type === 'text' ? (
                                answer.text_answer ? (
                                  <p className="text-blue-800">{answer.text_answer}</p>
                                ) : (
                                  <p className="text-blue-800">Текстовый ответ не предоставлен</p>
                                )
                              ) : answer.question.question_type === 'sequence' && answer.user_order ? (
                                (() => {
                                  // Используем sequence_answers для sequence вопросов
                                  const sequenceAnswers = answer.question.sequence_answers || [];
                                  
                                  // Проверяем, есть ли данные для отображения
                                  if (sequenceAnswers.length === 0) {
                                    return (
                                      <div className="text-blue-800">
                                        <p>Порядок: {answer.user_order.join(' → ')}</p>
                                        {answer.question.correct_order && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            Правильный порядок: {answer.question.correct_order.join(' → ')}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  }
                                  
                                  // Создаем правильную последовательность на основе answer_order
                                  const correctOrder = sequenceAnswers
                                    .sort((a, b) => a.answer_order - b.answer_order)
                                    .map(item => item.id);
                                  
                                  // Получаем тексты ответов пользователя
                                  const userAnswers = answer.user_order.map(id => {
                                    const answer = sequenceAnswers.find(sa => sa.id === id);
                                    return answer ? answer.answer_text : `ID: ${id}`;
                                  });
                                  
                                  // Получаем тексты правильных ответов
                                  const correctAnswers = correctOrder.map(id => {
                                    const answer = sequenceAnswers.find(sa => sa.id === id);
                                    return answer ? answer.answer_text : `ID: ${id}`;
                                  });
                                  
                                  // Проверяем правильность последовательности
                                  const isCorrect = JSON.stringify(answer.user_order) === JSON.stringify(correctOrder);
                                  
                                  return (
                                    <div className="text-gray-800">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          isCorrect 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {isCorrect ? '✓ Правильно' : 'Неправильно'}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                          {isCorrect ? 'Последовательность верна' : 'Ошибки в последовательности'}
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="font-medium text-xs mb-2 text-blue-700 uppercase tracking-wide">Ответ сотрудника:</p>
                                          <div className="space-y-1">
                                            {userAnswers.map((text, index) => {
                                              const correctPosition = correctOrder.indexOf(answer.user_order[index]);
                                              const isInCorrectPosition = correctPosition === index;
                                              const isInWrongPosition = correctPosition !== -1 && correctPosition !== index;
                                              
                                              return (
                                                <div key={index} className={`flex items-center p-2 rounded text-xs ${
                                                  isInCorrectPosition 
                                                    ? 'bg-green-50 border-l-2 border-green-400' 
                                                    : isInWrongPosition 
                                                    ? 'bg-yellow-50 border-l-2 border-yellow-400' 
                                                    : 'bg-red-50 border-l-2 border-red-400'
                                                }`}>
                                                  <span className={`text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 ${
                                                    isInCorrectPosition 
                                                      ? 'bg-green-500' 
                                                      : isInWrongPosition 
                                                      ? 'bg-yellow-500' 
                                                      : 'bg-red-500'
                                                  }`}>
                                                    {index + 1}
                                                  </span>
                                                  <span className="leading-tight">{text}</span>
                                                  {isInWrongPosition && (
                                                    <span className="ml-auto text-yellow-600 text-xs">
                                                      →{correctPosition + 1}
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                        <div>
                                          <p className="font-medium text-xs mb-2 text-green-700 uppercase tracking-wide">Верный ответ:</p>
                                          <div className="space-y-1">
                                            {correctAnswers.map((text, index) => (
                                              <div key={index} className="flex items-center p-2 bg-green-50 rounded border-l-2 border-green-400">
                                                <span className="bg-green-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0">
                                                  {index + 1}
                                                </span>
                                                <span className="leading-tight text-xs">{text}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <p className="text-gray-500">Ответ не предоставлен</p>
                              )}
                            </div>
                          </div>

                          {/* Правильный ответ - показываем для всех вопросов с выбором */}
                          {(answer.question.question_type === 'single_choice' || answer.question.question_type === 'multiple_choice') && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Правильный ответ:</h5>
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                {answer.question.question_type === 'single_choice' ? (
                                  <p className="text-green-800">
                                    {answer.question.answers?.find(a => a.is_correct)?.text || 'Правильный ответ не найден'}
                                  </p>
                                ) : answer.question.question_type === 'multiple_choice' ? (
                                  <p className="text-green-800">
                                    {answer.question.answers?.find(a => a.is_correct)?.text || 'Правильный ответ не найден'}
                                  </p>
                                ) : (
                                  <p className="text-green-800">Правильный ответ не указан</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    
                    {/* Расчет итогового результата */}
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <h3 className="text-base font-medium text-gray-900 mb-3">Расчет результата</h3>
                      {(() => {
                        let totalPoints = 0;
                        let earnedPoints = 0;
                        let correctAnswers = 0;
                        let totalQuestions = selectedTestResult.answers?.length || 0;
                        
                        selectedTestResult.answers?.forEach(answer => {
                          totalPoints += answer.question.points;
                          
                          let isCorrect = false;
                          if (answer.question.question_type === 'single_choice') {
                            if (answer.answer_id) {
                              const selectedAnswer = answer.question.answers?.find(a => a.id === answer.answer_id);
                              isCorrect = selectedAnswer?.is_correct || false;
                            } else {
                              // Если ответ не выбран, считаем неправильным
                              isCorrect = false;
                            }
                          } else if (answer.question.question_type === 'sequence' && answer.user_order) {
                            const sequenceAnswers = answer.question.sequence_answers || [];
                            const correctOrder = sequenceAnswers
                              .sort((a, b) => a.answer_order - b.answer_order)
                              .map(item => item.id);
                            isCorrect = JSON.stringify(answer.user_order) === JSON.stringify(correctOrder);
                          } else {
                            isCorrect = answer.is_correct;
                          }
                          
                          if (isCorrect) {
                            earnedPoints += answer.question.points;
                            correctAnswers++;
                          }
                        });
                        
                        const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
                        
                        return (
                          <div className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Итоговый результат:</span>
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                percentage >= selectedTestResult.test.passing_score 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {percentage >= selectedTestResult.test.passing_score ? 'Пройден' : 'Не пройден'}
                              </span>
                            </div>
                            <div className="text-xl font-bold text-gray-900 mb-2">
                              {earnedPoints} / {totalPoints} = {percentage}%
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Вопросов: {totalQuestions}</span>
                              <span>Правильно: {correctAnswers}</span>
                              <span>Баллов: {earnedPoints}/{totalPoints}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    

                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p>Детали ответов недоступны</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Ответы: {selectedTestResult.answers?.length || 0}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 