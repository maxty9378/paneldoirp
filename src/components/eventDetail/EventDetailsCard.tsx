import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Download, X, FileSpreadsheet, Phone, Mail, Copy } from 'lucide-react';
import { SiTelegram, SiWhatsapp, SiZoom } from 'react-icons/si';
import { getEventFiles, deleteEventFile } from '../../lib/eventFileStorage';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';

// Хук для инициализации CSS Houdini один раз
function useHoudiniSquircleOnce() {
  // Squircle отключен для избежания ошибок регистрации
}

// Типизация
interface Person {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  position?: { name?: string };
  territory?: { name?: string };
  branch?: { name?: string };
}

interface EventModel {
  id: string;
  title: string;
  description?: string;
  start_date: string; // ISO
  end_date?: string;  // ISO
  meeting_link?: string;
  status?: 'planned'|'completed'|'canceled';
  creator?: Person;
}

interface EventFile {
  id: string;
  name: string;
  type: 'presentation' | 'workbook';
  url: string;
  size: number;
  created_at: string;
}

interface EventDetailsCardProps {
  event: EventModel | null;
  isCreator?: boolean;
  participants?: any[];
  onUpdateOrganizerData?: (newAvatarUrl: string) => void;
  onCompleteEvent?: () => void;
}

// Утилиты


const normalizeUrl = (u: string) => /^https?:\/\//i.test(u) ? u : `https://${u}`;

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0; while (bytes >= 1024 && i < units.length-1) { bytes/=1024; i++; }
  return `${bytes.toFixed(bytes < 10 && i>0 ? 2 : 0)} ${units[i]}`;
};

const extIcon: Record<string, JSX.Element> = {
  pdf: <FileText className="w-4 h-4" />,
  ppt: <FileSpreadsheet className="w-4 h-4" />,
  pptx: <FileSpreadsheet className="w-4 h-4" />,
  doc: <FileText className="w-4 h-4" />,
  docx: <FileText className="w-4 h-4" />,
  xls: <FileSpreadsheet className="w-4 h-4" />,
  xlsx: <FileSpreadsheet className="w-4 h-4" />,
};

const getFileIcon = (name: string) => extIcon[name.split('.').pop()?.toLowerCase() || ''] ?? <FileText className="w-4 h-4" />;

// Хелперы для окружения и открытия с фолбэком
// Определяем платформу
const getUA = () => (typeof navigator !== 'undefined' ? navigator.userAgent : '');
const isIOS = /iP(hone|od|ad)/i.test(getUA());
const isAndroid = /Android/i.test(getUA());
const isMobile = isIOS || isAndroid;

// Пытаемся открыть приложение, если не получилось — веб (t.me/ wa.me)
function openWithAppFallback(appUrl: string, webUrl: string, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 900;

  // В десктопе сразу открываем веб — так надёжнее и без лишних попапов
  if (!isMobile) {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // На мобиле: пробуем app-схему, если не ушли в приложение — откроем веб
  let didHide = false;
  const onVis = () => { if (document.hidden) didHide = true; };

  document.addEventListener('visibilitychange', onVis, { once: true });

  // Открытие app-схемы должно быть в обработчике клика — у тебя так и есть
  // Меняем текущую вкладку, чтобы iOS не блокировал
  window.location.href = appUrl;

  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVis);
    if (!didHide) {
      // приложение не перехватило — идём в веб
      window.location.href = webUrl;
    }
  }, timeout);
}

// нормализация для сравнения (убираем ?query)
// если токен критичен для загрузки — оставляем src как есть,
// но сравниваем по base без query
const baseUrl = (url?: string) => {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.origin);
    return `${u.origin}${u.pathname}`;
  } catch {
    // относительные/кривые URL — fallback
    const q = url.indexOf('?');
    return q === -1 ? url : url.slice(0, q);
  }
};

function useStableImage(src?: string, fadeMs = 180) {
  const [visibleSrc, setVisibleSrc] = React.useState<string | undefined>(src);
  const [nextSrc, setNextSrc] = React.useState<string | undefined>(undefined);
  const [fading, setFading] = React.useState(false);
  const lastBaseRef = React.useRef(baseUrl(src));

  React.useEffect(() => {
    if (!src) { setNextSrc(undefined); return; }

    const incomingBase = baseUrl(src);
    // если по сути тот же файл (поменялись только query-параметры), просто игнорим
    if (incomingBase === lastBaseRef.current) return;

    // прелоадим новый src
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;

    if (img.complete && img.naturalWidth > 0) {
      lastBaseRef.current = incomingBase;
      setNextSrc(src);
      setFading(true);
      const t = setTimeout(() => {
        setVisibleSrc(src);
        setNextSrc(undefined);
        setFading(false);
      }, fadeMs);
      return () => clearTimeout(t);
    }

    const onLoad = () => {
      lastBaseRef.current = incomingBase;
      setNextSrc(src);
      setFading(true);
      setTimeout(() => {
        setVisibleSrc(src);
        setNextSrc(undefined);
        setFading(false);
      }, fadeMs);
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
    const onError = () => {
      // не переключаемся — остаёмся на старой картинке/инициалах
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [src, fadeMs]);

  return { visibleSrc, nextSrc, fading };
}

export const Avatar = React.memo(function Avatar({
  src,
  fallback,
  className,
}: { src?: string; fallback: string; className?: string }) {
  const { visibleSrc, nextSrc, fading } = useStableImage(src);

  return (
    <div
      className={`relative ${className} rounded-3xl overflow-hidden`} 
      // ВАЖНО: squircle на контейнер, а не на img
    >
      {visibleSrc ? (
        <img
          src={visibleSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ borderRadius: 24 }} // мягкий фолбек, меньше перерисовок
          onError={(e) => {
            console.error('Ошибка загрузки аватара:', visibleSrc);
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
          <span className="text-white font-bold text-3xl">{fallback}</span>
        </div>
      )}

      {/* слой для кроссфейда следующей картинки */}
      {nextSrc && (
        <img
          src={nextSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity`}
          style={{
            opacity: fading ? 1 : 0,
            borderRadius: 24,
            transitionDuration: '180ms',
          }}
          decoding="async"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
});

export function EventDetailsCard({ event, isCreator = false, participants = [], onUpdateOrganizerData, onCompleteEvent }: EventDetailsCardProps) {
  const { userProfile } = useAuthBFF();
  const { toast } = useToast();
  
  // Инициализация Houdini
  useHoudiniSquircleOnce();
  
  // Безопасное копирование
  const safeCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Скопировано в буфер');
    } catch {
      // Фолбэк через временный input
      const el = document.createElement('textarea');
      el.value = text; el.setAttribute('readonly', '');
      el.style.position = 'absolute'; el.style.left = '-9999px';
      document.body.appendChild(el); el.select();
      try { document.execCommand('copy'); toast('Скопировано'); } catch { toast('Не удалось скопировать'); }
      document.body.removeChild(el);
    }
  }, [toast]);
  
  // Оптимизированные стили для squircle и touch-манипуляций
  const squircleStyles = useMemo(() => `
    /* Squircle отключен, используем обычные border-radius */
    
    /* Улучшения для touch-устройств */
    @media (hover: none) and (pointer: coarse) {
      button, a, [role="button"] {
        min-height: 44px;
        min-width: 44px;
      }
      
      .touch-target {
        min-height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  `, []);
  
  // Принудительное обновление данных организатора при изменении аватара с debounce
  useEffect(() => {
    const eId = event?.creator?.id;
    const uId = userProfile?.id;
    const eAva = event?.creator?.avatar_url || '';
    const uAva = userProfile?.avatar_url || '';
    if (!(eId && uId && eId === uId)) return;

    // если по сути тот же файл — не дергаем апдейт
    if (baseUrl(eAva) === baseUrl(uAva)) return;

    const t = setTimeout(() => {
      onUpdateOrganizerData?.(uAva);
    }, 400); // лёгкий debounce
    return () => clearTimeout(t);
  }, [event?.creator?.id, event?.creator?.avatar_url, userProfile?.id, userProfile?.avatar_url, onUpdateOrganizerData]);
  
  // Проверяем, может ли пользователь управлять файлами
  const canManageFiles = isCreator || userProfile?.role === 'administrator' || userProfile?.role === 'moderator';
  const [files, setFiles] = useState<EventFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Удалена старая функция copyToClipboard - теперь используется safeCopy

  // Улучшенная функция для отправки информации о мероприятии
  const shareEventInfo = useCallback(async (platform: 'whatsapp' | 'telegram') => {
    if (!event) return;

    const appBaseUrl = location.hostname === 'localhost' ? 'http://51.250.94.103' : location.origin;
    const url = `${appBaseUrl}/event/${event.id}`;

    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : null;
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    const dateText = end ? `${fmt(start)} - ${fmt(end)}` : fmt(start);

    // Получаем список участников
    const participantsText = participants.length > 0 
      ? `\n👥 Участники (${participants.length}):\n${participants.slice(0, 5).map(p => `• ${p.full_name || 'Не указано'}`).join('\n')}${participants.length > 5 ? `\n... и еще ${participants.length - 5} участников` : ''}`
      : '\n👥 Участники: пока не зарегистрированы';

    // Форматирование для разных платформ
    let text: string;
    if (platform === 'whatsapp') {
      // WhatsApp: используем эмодзи и простой текст
      text = [
        `🎯 *${event.title}*`,
        `📅 ${dateText}`,
        `👨‍🏫 Тренер: ${event.creator?.full_name || 'Не указан'}`,
        event.description ? `\n📝 ${event.description}` : '',
        participantsText,
        `\n🔗 ${url}`
      ].join('\n');
    } else {
      // Telegram: используем Markdown форматирование
      text = [
        `🎯 *${event.title}*`,
        `📅 ${dateText}`,
        `👨‍🏫 Тренер: ${event.creator?.full_name || 'Не указан'}`,
        event.description ? `\n📝 ${event.description}` : '',
        participantsText,
        `\n🔗 [Перейти к мероприятию](${url})`
      ].join('\n');
    }

    // 1) Системный шэр — идеален на мобилках и в PWA
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator && isMobile) {
        // @ts-ignore
        await navigator.share({ title: event.title, text, url });
        return;
      }
    } catch {
      // игнорим, упадём на deep-link/веб
    }

    // 2) Deep-link + веб фолбэк
    if (platform === 'whatsapp') {
      const appUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
      const webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      openWithAppFallback(appUrl, webUrl, { timeout: 900 });
    } else {
      // Telegram: используем tg://msg_url (широко поддерживается) + веб-шэр
      const appUrl = `tg://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      const webUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      openWithAppFallback(appUrl, webUrl, { timeout: 900 });
    }
  }, [event, participants]);

  // Удалена неиспользуемая функция splitFullName

  // Функция для получения инициалов из полного имени
  const getInitials = (fullName: string | undefined) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName[0]?.toUpperCase() || '?';
  };

  // Загрузка файлов мероприятия
  useEffect(() => {
    if (event?.id) {
      let alive = true;
      const loadFiles = async () => {
        setLoading(true);
        try {
          const eventFiles = await getEventFiles(event.id);
          if (alive) {
            setFiles(eventFiles);
          }
        } catch (error) {
          if (alive) {
            console.error('Ошибка загрузки файлов:', error);
          }
        } finally {
          if (alive) {
            setLoading(false);
          }
        }
      };
      loadFiles();
      return () => { alive = false; };
    }
  }, [event?.id]);

  // Защита от отсутствия данных о мероприятии
  if (!event) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Информация о мероприятии</h3>
          <p className="text-xs sm:text-sm text-gray-600">Загрузка данных...</p>
        </div>
        <div className="p-2 sm:p-4 lg:p-6">
          <p className="text-gray-500">Данные о мероприятии загружаются...</p>
        </div>
      </div>
    );
  }

  // Функция loadEventFiles перенесена в useEffect для отмены запросов

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот файл?')) return;

    try {
      const result = await deleteEventFile(fileId);
      if (result.success) {
        // Обновляем список файлов после удаления
        setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      } else {
        alert('Ошибка удаления файла: ' + result.error);
      }
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      alert('Произошла ошибка при удалении файла');
    }
  };

  // Удалены старые функции formatFileSize и getFileIcon - теперь используются утилиты

  return (
    <>
      <style>{squircleStyles}</style>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Заголовок */}
        <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-5 border-b border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-4">
            <div className="w-full">
              <h3 className="text-xl sm:text-xl lg:text-2xl font-bold text-gray-900">
                Информация о мероприятии
              </h3>
              <p className="text-sm sm:text-sm text-gray-400">
                Детальная информация о мероприятии
              </p>
            </div>
            
            {/* Кнопка завершения мероприятия для тренеров */}
            {userProfile?.role === 'trainer' && onCompleteEvent && (
              <div className="flex items-center justify-center sm:justify-end gap-2">
                {event.status === 'completed' ? (
                  <button
                    type="button"
                    onClick={onCompleteEvent}
                    className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px] w-full sm:w-auto sm:whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden sm:inline">Отменить завершение</span>
                    <span className="sm:hidden">Отменить</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onCompleteEvent}
                    className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-[#06A478] hover:bg-[#059669] active:bg-[#047857] text-white rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px] w-full sm:w-auto sm:whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="hidden sm:inline">Завершить мероприятие</span>
                    <span className="sm:hidden">Завершить</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Основной контент */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6 p-3 sm:p-4 lg:p-6">
          
          {/* Организатор и онлайн встреча */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Организатор - 2/3 */}
            <div className="lg:col-span-2 bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-3 sm:p-5 lg:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 lg:gap-5">
                {/* Аватарка */}
                <div className="flex-shrink-0">
                  <Avatar
                    src={event.creator?.avatar_url}
                    fallback={getInitials(event.creator?.full_name || '')}
                    className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 xl:w-40 xl:h-40 bg-gradient-to-br from-[#06A478] to-[#059669] shadow-lg"
                  />
                </div>
                
                {/* Информация */}
                <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                  <div className="mb-2 sm:mb-3">
                    <h5 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 leading-tight break-words">
                      {event.creator?.full_name || 'НЕ УКАЗАН'}
                    </h5>
                  </div>
                  
                  {event.creator?.position?.name && (
                    <p className="text-sm sm:text-base text-gray-600 mb-1 break-words">
                      {event.creator.position.name}
                    </p>
                  )}
                  
                  {(event.creator?.territory?.name || event.creator?.branch?.name) && (
                    <p className="text-sm sm:text-base text-gray-500 mb-3 break-words">
                      {event.creator.territory?.name || event.creator.branch?.name}
                    </p>
                  )}
                  
                  {/* Контакты */}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center sm:justify-start">
                    {event.creator?.phone && (
                      <button 
                        type="button"
                        onClick={() => safeCopy(event.creator?.phone || '')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm rounded-lg border border-gray-200 transition-colors touch-manipulation min-h-[44px] w-full sm:w-auto"
                        title="Копировать номер телефона"
                        aria-label="Копировать номер телефона"
                      >
                        <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate">
                          {event.creator.phone}
                        </span>
                      </button>
                    )}
                    
                    {event.creator?.email && (
                      <button 
                        type="button"
                        onClick={() => safeCopy(event.creator?.email || '')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm rounded-lg border border-gray-200 transition-colors touch-manipulation min-h-[44px] w-full sm:w-auto"
                        title="Копировать email"
                        aria-label="Копировать email"
                      >
                        <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate">
                          {event.creator.email}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Правая колонка - Объединённый блок встречи и шаринга */}
            {event.meeting_link && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 lg:p-6 border border-blue-200 rounded-xl">
                {/* Платформа */}
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex-shrink-0">
                    <SiZoom className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-medium text-blue-700">ZOOM</p>
                    <p className="text-xs sm:text-sm text-blue-600 hidden sm:block">Онлайн платформа</p>
                  </div>
                </div>

                {/* Действия со встречей — адаптивная сетка */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <a
                    href={normalizeUrl(event.meeting_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-12 sm:h-10 rounded-lg text-sm font-medium
                               bg-blue-600 text-white shadow-md hover:shadow-lg hover:bg-blue-700 active:bg-blue-800 
                               transition-all no-underline touch-manipulation min-h-[44px]"
                  >
                    Перейти к встрече
                  </a>

                  <button
                    type="button"
                    onClick={() => safeCopy(event.meeting_link || '')}
                    className="inline-flex items-center justify-center h-12 sm:h-10 rounded-lg text-sm font-medium
                               bg-gray-600 text-white shadow-md hover:shadow-lg hover:bg-gray-700 active:bg-gray-800 
                               transition-all touch-manipulation min-h-[44px]"
                  >
                    <Copy className="w-4 h-4 mr-2 sm:mr-1" />
                    <span>Скопировать</span>
                  </button>
                </div>

                {/* Разделитель */}
                <div className="my-4 h-px bg-blue-200/60" />

                {/* Отправка информации о мероприятии — единый блок ниже встречи */}
                {userProfile?.role === 'trainer' && (
                  <div>
                    <p className="text-sm sm:text-base text-gray-600 mb-3 text-center sm:text-left">Отправить информацию о мероприятии</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => shareEventInfo('whatsapp')}
                        className="inline-flex items-center justify-center gap-2 w-full h-12 sm:h-10 rounded-lg text-sm font-medium
                                   bg-[#25D3661A] text-[#25D366] border border-black/5 hover:bg-[#25D36633] active:bg-[#25D3664D] 
                                   hover:shadow-sm transition-all touch-manipulation min-h-[44px]"
                        title="Отправить в WhatsApp"
                        aria-label="Отправить в WhatsApp"
                      >
                        <SiWhatsapp className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => shareEventInfo('telegram')}
                        className="inline-flex items-center justify-center gap-2 w-full h-12 sm:h-10 rounded-lg text-sm font-medium
                                   bg-[#26A5E41A] text-[#26A5E4] border border-black/5 hover:bg-[#26A5E433] active:bg-[#26A5E44D] 
                                   hover:shadow-sm transition-all touch-manipulation min-h-[44px]"
                        title="Отправить в Telegram"
                        aria-label="Отправить в Telegram"
                      >
                        <SiTelegram className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span>Telegram</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>



          {/* Файлы мероприятия - показываем только если есть файлы */}
          {files.length > 0 && (
            <div className="p-3 sm:p-4 lg:p-6 border border-gray-200 rounded-xl bg-gray-50/30">
            <h4 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              Файлы мероприятия
            </h4>

            {/* Список файлов */}
            {loading ? (
              <div className="text-center py-8 sm:py-10">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-[#06A478] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm sm:text-base text-gray-500">Загрузка файлов...</p>
              </div>
            ) : files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex flex-col p-3 sm:p-4 rounded-lg border ${
                      file.type === 'presentation' 
                        ? 'bg-[#06A478]/10 border-[#06A478]/20' 
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        file.type === 'presentation' 
                          ? 'bg-[#06A478]/20 text-[#06A478]' 
                          : 'bg-orange-100 text-orange-600'
                      }`}>
                        {getFileIcon(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          file.type === 'presentation' 
                            ? 'bg-[#06A478]/20 text-[#06A478]' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {file.type === 'presentation' ? 'Презентация' : 'Рабочая тетрадь'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Скачать файл"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        </a>
                        {canManageFiles && (
                          <button
                            onClick={() => handleFileDelete(file.id)}
                            className="p-2 text-gray-400 hover:text-red-600 active:text-red-700 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Удалить файл"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-10 text-gray-500">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Файлы не загружены</p>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
      
    </>
  );
} 
