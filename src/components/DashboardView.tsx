index 9a8d4168764fed0f27e397a7469124e42fb762e0..cd9e3a53c6a0c41b94922af7834f598f7a1e2210 100644
--- a/src/components/DashboardView.tsx
+++ b/src/components/DashboardView.tsx
@@ -1,639 +1,695 @@
-import React, { useState, useEffect, useMemo } from 'react';
-import { Calendar, Users, BookOpen, TrendingUp, Award, Shield, MapPin, Link as LinkIcon, Video, CalendarDays, Users2, CheckCircle2, Info, Play, Pause, Loader2, XCircle, RefreshCw } from 'lucide-react';
+import React, { useState, useEffect, useMemo, useCallback } from 'react';
+import {
+  Calendar,
+  Users,
+  BookOpen,
+  TrendingUp,
+  Award,
+  Shield,
+  MapPin,
+  Video,
+  CalendarDays,
+  Users2,
+  CheckCircle2,
+  Info,
+  Play,
+  Pause,
+  Loader2,
+  XCircle,
+  RefreshCw,
+  ArrowRight,
+  Sparkle
+} from 'lucide-react';
 import { useAuth } from '../hooks/useAuth';
-import { getDeclension } from '../utils/textUtils';
 import { getCachedEvents, setCachedEvents, clearEventsCache } from '../lib/eventsCache';
 import { Event, USER_ROLE_LABELS } from '../types';
 import { supabase } from '../lib/supabase';
-// import { AchievementSection } from './achievements';
 
 // Интерфейс для мероприятия с дополнительной информацией
 interface EventWithDetails extends Event {
   event_type?: {
     id: string;
     name: string;
     name_ru: string;
   };
   participants_count?: number;
 }
 
-// Карточка мероприятия (как в EventsView)
+// Единая карта статусов, чтобы визуально унифицировать карточки
+const STATUS_MAP = {
+  draft: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', Icon: Pause },
+  published: { label: '', tone: 'text-[#0E9F6E] bg-[#0E9F6E]/10', ring: 'ring-[#0E9F6E]/20', Icon: Play },
+  active: {
+    label: 'Активно',
+    tone: 'text-[#0E9F6E] bg-[#0E9F6E]/10',
+    ring: 'ring-[#0E9F6E]/20',
+    Icon: () => <div className="h-3.5 w-3.5 rounded-full bg-[#0E9F6E]" />
+  },
+  ongoing: { label: 'Идёт', tone: 'text-sky-600 bg-sky-50', ring: 'ring-sky-200', Icon: Loader2 },
+  completed: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', Icon: CheckCircle2 },
+  cancelled: { label: '', tone: 'text-rose-600 bg-rose-50', ring: 'ring-rose-200', Icon: XCircle }
+} as const;
+
+// Вспомогательная функция для отображения типа мероприятия
+const TYPE_LABELS = {
+  training: { label: 'Онлайн тренинг', icon: Video },
+  webinar: { label: 'Вебинар', icon: CalendarDays },
+  workshop: { label: 'Мастер-класс', icon: Users2 },
+  exam: { label: 'Экзамен', icon: CheckCircle2 },
+  other: { label: 'Другое', icon: Info }
+} as const;
+
+// Карточка мероприятия с визуальной идентикой
 function EventCard({ event }: { event: EventWithDetails }) {
-  // Парсинг даты
-  const parseDate = (event: EventWithDetails) => {
-    const base = event.start_date || event.date_time || event.created_at || '';
-    const d = new Date(base);
-    return isNaN(d.getTime()) ? null : d;
-  };
-  
-  const d = parseDate(event);
-  
-  // Статус мероприятия
-  const STATUS_MAP = {
-    draft: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', dot: 'bg-slate-400', Icon: Pause },
-    published: { label: '', tone: 'text-[#06A478] bg-[#06A478]/10', ring: 'ring-[#06A478]/20', dot: 'bg-[#06A478]', Icon: Play },
-    active: { label: 'Активно', tone: 'text-[#06A478] bg-[#06A478]/10', ring: 'ring-[#06A478]/20', dot: 'bg-[#06A478]', Icon: () => <div className="h-3.5 w-3.5 rounded-full bg-[#06A478]" /> },
-    ongoing: { label: 'Идёт', tone: 'text-blue-600 bg-blue-50', ring: 'ring-blue-200', dot: 'bg-blue-500', Icon: Loader2 },
-    completed: { label: '', tone: 'text-slate-600 bg-slate-100', ring: 'ring-slate-200', dot: 'bg-slate-400', Icon: CheckCircle2 },
-    cancelled: { label: '', tone: 'text-rose-600 bg-rose-50', ring: 'ring-rose-200', dot: 'bg-rose-400', Icon: XCircle },
-  };
-  
+  const { userProfile } = useAuth();
+
+  // Развёрнутые комментарии на русском по требованию пользователя
+  // Определяем, имеет ли эксперт доступ к карточке экзамена
+  const role = userProfile?.role;
+  const isExpert = role === 'expert';
+  const isAdmin = role === 'administrator';
+  const expertEmails = Array.isArray(event.expert_emails) ? event.expert_emails : [];
+  const isExamTalentReserve = event.event_type?.name === 'exam_talent_reserve';
+  const isExpertAssigned = isExpert && expertEmails.includes(userProfile?.email || '');
+  const shouldOpenExam = isExamTalentReserve && (isAdmin || isExpertAssigned);
+
+  if (isExpert && isExamTalentReserve && !shouldOpenExam) {
+    return null;
+  }
+
+  // Подготавливаем дату для компактного отображения
+  const baseDate = event.start_date || event.date_time || event.created_at || '';
+  const parsedDate = useMemo(() => {
+    const d = new Date(baseDate);
+    return Number.isNaN(d.getTime()) ? null : d;
+  }, [baseDate]);
+
   const status = STATUS_MAP[event.status as keyof typeof STATUS_MAP] || STATUS_MAP.draft;
   const { label, tone: statusTone, ring, Icon: StatusIcon } = status;
-  
-  // Тип мероприятия
-  const TYPE_LABELS = {
-    training: { label: 'Онлайн тренинг', icon: Video },
-    webinar: { label: 'Вебинар', icon: CalendarDays },
-    workshop: { label: 'Мастер-класс', icon: Users2 },
-    exam: { label: 'Экзамен', icon: CheckCircle2 },
-    other: { label: 'Другое', icon: Info },
-  };
-  
+
   const typeInfo = event.type
     ? TYPE_LABELS[event.type as keyof typeof TYPE_LABELS] || { label: event.event_type?.name_ru || 'Мероприятие', icon: Info }
-    : { 
-        label: event.event_type?.name === 'exam_talent_reserve' ? 'Экзамен' : (event.event_type?.name_ru || 'Мероприятие'), 
-        icon: event.event_type?.name === 'exam_talent_reserve' ? CheckCircle2 : Info 
+    : {
+        label: event.event_type?.name === 'exam_talent_reserve' ? 'Экзамен' : event.event_type?.name_ru || 'Мероприятие',
+        icon: event.event_type?.name === 'exam_talent_reserve' ? CheckCircle2 : Info
       };
-  
+
   const TypeIcon = typeInfo.icon;
-  
-  // Цветовые классы для типа
-  const getTypeChipClasses = (type: string, eventTypeName?: string) => {
-    // Специальная обработка для экзамена кадрового резерва
-    if (eventTypeName === 'exam_talent_reserve') {
-      return 'animate-gradient-shift text-white ring-0 shadow-lg';
-    }
-    
-    const typeColors = {
-      training: 'bg-blue-50 text-blue-700 ring-blue-200',
-      webinar: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
-      workshop: 'bg-purple-50 text-purple-700 ring-purple-200',
-      exam: 'bg-rose-50 text-rose-700 ring-rose-200',
-      other: 'bg-amber-50 text-amber-700 ring-amber-200',
-    };
-    return typeColors[type as keyof typeof typeColors] || 'bg-slate-50 text-slate-700 ring-slate-200';
-  };
-  
-  // Акцент даты
+
+  // Отдельная функция для акцентной плашки с датой
   const DateAccent = ({ date }: { date: Date | null }) => {
     if (!date) {
       return (
-        <div className="rounded-2xl bg-slate-50/80 backdrop-blur-sm px-4 py-3 text-center border border-slate-200/50">
-          <div className="text-[11px] text-slate-500 font-medium">Дата</div>
+        <div className="rounded-2xl border border-slate-200/50 bg-slate-50/80 px-4 py-3 text-center backdrop-blur-sm">
+          <div className="text-[11px] font-medium text-slate-500">Дата</div>
           <div className="text-sm font-semibold text-slate-600">Не указана</div>
         </div>
       );
     }
 
     const day = date.toLocaleDateString('ru-RU', { day: '2-digit' });
     const month = date.toLocaleDateString('ru-RU', { month: 'long' });
-    const time = new Intl.DateTimeFormat('ru-RU', { 
-      hour: '2-digit', 
+    const time = new Intl.DateTimeFormat('ru-RU', {
+      hour: '2-digit',
       minute: '2-digit',
       timeZone: 'Europe/Moscow'
     }).format(date);
-    
-    // Исправляем окончания месяцев
-    const monthWithCorrectEnding = month.endsWith('ь') ? month.slice(0, -1) + 'я' : month;
+
+    const monthWithCorrectEnding = month.endsWith('ь') ? `${month.slice(0, -1)}я` : month;
 
     return (
-      <div className="rounded-2xl border border-[#06A478]/20 px-4 py-3 bg-gradient-to-br from-[#06A478]/5 to-[#06A478]/10 backdrop-blur-sm text-center relative shadow-sm">
+      <div className="relative rounded-2xl border border-[#0E9F6E]/20 bg-gradient-to-br from-[#0E9F6E]/5 to-[#0E9F6E]/10 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
         <div className="flex items-end justify-center gap-1 leading-none">
-          <span className="text-2xl md:text-3xl font-bold text-slate-900">{day}</span>
+          <span className="text-2xl font-bold text-slate-900 md:text-3xl">{day}</span>
         </div>
         <div className="mt-1 text-[12px] font-medium text-slate-600">{monthWithCorrectEnding}</div>
-        <div className="mt-2 text-[11px] font-semibold text-slate-700">
-          {time}
-        </div>
+        <div className="mt-2 text-[11px] font-semibold text-slate-700">{time}</div>
       </div>
     );
   };
-  
+
+  const typeChipClasses = useMemo(() => {
+    if (event.event_type?.name === 'exam_talent_reserve') {
+      return 'animate-gradient-shift text-white ring-0 shadow-lg';
+    }
+
+    const typeColors: Record<string, string> = {
+      training: 'bg-sky-50 text-sky-700 ring-sky-200',
+      webinar: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
+      workshop: 'bg-purple-50 text-purple-700 ring-purple-200',
+      exam: 'bg-rose-50 text-rose-700 ring-rose-200',
+      other: 'bg-amber-50 text-amber-700 ring-amber-200'
+    };
+
+    return typeColors[event.type || 'other'] || 'bg-slate-50 text-slate-700 ring-slate-200';
+  }, [event.event_type?.name, event.type]);
+
   return (
-    <article
-      className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-slate-200/50 p-5 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full hover:scale-[1.02] hover:border-slate-300/60"
-    >
-      {/* Верх: дата-время + статус/тип */}
-      <header className="mb-3 flex items-start justify-between gap-3 flex-shrink-0">
-        <div className="flex flex-col gap-2 min-w-0">
-          <div className="flex flex-col gap-2">
-            {/* Статус */}
-            <div className="flex flex-wrap items-center gap-2">
-              {(() => {
-                const { userProfile } = useAuth();
-                const isExpert = userProfile?.role === 'expert';
-                
-                // Для экспертов не показываем статус
-                if (isExpert) {
-                  return null;
-                }
-                
-                const isIconOnly = !label;
-                const badgeClass = `inline-flex items-center gap-1 text-[10px] font-semibold ring-1 shadow-sm ${
-                  isIconOnly ? 'h-7 w-7 justify-center rounded-lg p-0' : 'rounded-full px-2 py-0.5'
-                } ${statusTone} ${ring}`;
-                const iconSize = isIconOnly ? 'h-4 w-4' : 'h-3.5 w-3.5';
-
-                return (
-                  <span className={badgeClass}>
-                    <StatusIcon className={`${iconSize} ${event.status === 'ongoing' && 'animate-spin'}`} />
-                    {!isIconOnly && <span>{label}</span>}
+    <article className="group relative flex h-full min-w-[260px] flex-col overflow-hidden rounded-[26px] border border-white/40 bg-white/70 p-5 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.55)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_48px_80px_-42px_rgba(15,23,42,0.45)] sm:min-w-0">
+      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,159,110,0.08),transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
+      <div className="relative flex h-full flex-col">
+        <header className="mb-4 flex flex-shrink-0 items-start justify-between gap-3">
+          <div className="min-w-0 flex flex-col gap-3">
+            <div className="flex flex-col gap-2">
+              <div className="flex flex-wrap items-center gap-2">
+                {!isExpert && (
+                  <span
+                    className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ring-1 shadow-sm ${
+                      !label ? 'h-7 w-7 justify-center rounded-lg p-0' : 'rounded-full px-2 py-1'
+                    } ${statusTone} ${ring}`}
+                  >
+                    <StatusIcon className={`${!label ? 'h-4 w-4' : 'h-3.5 w-3.5'} ${event.status === 'ongoing' && 'animate-spin'}`} />
+                    {label && <span>{label}</span>}
                   </span>
-                );
-              })()}
-            </div>
-            
-            {/* Тип мероприятия */}
-            <div className="flex items-center gap-2">
-              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm ${getTypeChipClasses(event.type || 'other', event.event_type?.name)}`}>
-                <TypeIcon className="h-3.5 w-3.5" />
-                {typeInfo.label}
-              </span>
+                )}
+                <span
+                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold ring-1 shadow-sm ${typeChipClasses}`}
+                >
+                  <TypeIcon className="h-3.5 w-3.5" />
+                  {typeInfo.label}
+                </span>
+              </div>
             </div>
+
+            <h3 className="text-lg font-semibold leading-tight text-slate-900">{event.title}</h3>
+            {event.location && (
+              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
+                <MapPin className="h-3.5 w-3.5" />
+                <span className="truncate">{event.location}</span>
+              </div>
+            )}
           </div>
 
-          {/* Название */}
-          <h3 className="text-lg font-bold leading-tight text-slate-900">
-            {event.title}
-          </h3>
-        </div>
+          <div className="w-[108px] shrink-0">
+            <DateAccent date={parsedDate} />
+          </div>
+        </header>
 
-        {/* Правый – акцент на дате/времени */}
-        <div className="shrink-0 w-[112px]">
-          <DateAccent date={d} />
+        <div className="flex-1">
+          {event.description && (
+            <div className="mb-4 rounded-[20px] border border-slate-200/50 bg-slate-50/70 p-4 backdrop-blur-sm">
+              <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{event.description}</p>
+            </div>
+          )}
         </div>
-      </header>
-
-      {/* Описание */}
-      <div className="flex-1">
-        {event.description && (
-          <div className="mb-4 rounded-2xl bg-slate-50/60 backdrop-blur-sm p-4 border border-slate-200/40 shimmer-text">
-            <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
-              {event.description}
-            </p>
-          </div>
-        )}
+
+        <footer className="mt-auto flex-shrink-0">
+          <button
+            onClick={() => {
+              if (shouldOpenExam) {
+                window.location.href = `/expert-exam/${event.id}`;
+              } else {
+                window.location.href = `/event/${event.id}`;
+              }
+            }}
+            className={`group/button relative w-full justify-center overflow-hidden rounded-2xl py-3 px-4 font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA47A]/30 ${
+              shouldOpenExam
+                ? 'bg-gradient-to-r from-[#0EA47A] via-[#06A478] to-[#059669] text-white hover:from-[#059669] hover:to-[#047857]'
+                : 'bg-slate-900 text-white hover:bg-slate-800'
+            } shadow-sm hover:shadow-lg`}
+            title={shouldOpenExam ? 'Перейти к оценке' : 'Открыть событие'}
+          >
+            <span className="relative z-10 inline-flex items-center justify-center gap-2 text-sm font-medium">
+              {shouldOpenExam ? 'Перейти к оценке' : 'Открыть событие'}
+              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-0.5" />
+            </span>
+          </button>
+        </footer>
       </div>
-      
-      {/* Низ: действия */}
-      <footer className="mt-auto flex-shrink-0">
-        {(() => {
-          const { userProfile } = useAuth();
-          const isExpert = userProfile?.role === 'expert';
-          const isAdmin = userProfile?.role === 'administrator';
-          const isExamTalentReserve = event.event_type?.name === 'exam_talent_reserve';
-          const isExpertForThisExam = (isExpert || isAdmin) && isExamTalentReserve && (event.expert_emails?.includes(userProfile?.email || '') || isAdmin);
-          
-          // Для администраторов: если это экзамен, показываем кнопку "Оценить"
-          if (isAdmin && isExamTalentReserve) {
-            return (
-              <button 
-                onClick={() => window.location.href = `/expert-exam/${event.id}`}
-                className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-[#06A478] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#06A478]/25 focus:outline-none focus:ring-2 focus:ring-[#06A478]/20 focus:ring-offset-2 group"
-                title="Перейти к оценке"
-              >
-                <span className="text-sm font-medium relative z-10 group-hover:scale-105 transition-transform duration-200">Перейти к оценке</span>
-              </button>
-            );
-          }
-          
-          // Для экспертов, назначенных на конкретный экзамен
-          if (isExpertForThisExam) {
-            return (
-              <button 
-                onClick={() => window.location.href = `/expert-exam/${event.id}`}
-                className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-[#06A478] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-[#06A478]/25 focus:outline-none focus:ring-2 focus:ring-[#06A478]/20 focus:ring-offset-2 group"
-                title="Перейти к оценке"
-              >
-                <span className="text-sm font-medium relative z-10 group-hover:scale-105 transition-transform duration-200">Перейти к оценке</span>
-              </button>
-            );
-          }
-          
-          // Для экспертов не показываем кнопку
-          if (isExpert) {
-            return null;
-          }
-          
-          return (
-            <button 
-              onClick={() => window.location.href = `/event/${event.id}`}
-              className="w-full justify-center relative overflow-hidden bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium py-3 px-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-slate-500/25 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:ring-offset-2 group"
-              title="Открыть"
-            >
-              <span className="text-sm font-medium relative z-10 group-hover:scale-105 transition-transform duration-200">Открыть</span>
-            </button>
-          );
-        })()}
-      </footer>
     </article>
   );
 }
 
-// Карточка статистики
+// Карточка статистики с вариативной цветовой палитрой
 function StatsCard({
   title,
   value,
-  change,
-  changeType,
-  icon
+  icon,
+  tone
 }: {
   title: string;
   value: string | number;
-  change?: string;
-  changeType?: 'positive' | 'negative';
   icon: React.ReactNode;
+  tone: 'emerald' | 'slate' | 'blue' | 'amber';
 }) {
+  const palette = {
+    emerald: {
+      badge: 'bg-emerald-500/10 text-emerald-600',
+      border: 'border-emerald-500/15'
+    },
+    slate: {
+      badge: 'bg-slate-500/10 text-slate-600',
+      border: 'border-slate-500/15'
+    },
+    blue: {
+      badge: 'bg-sky-500/10 text-sky-600',
+      border: 'border-sky-500/15'
+    },
+    amber: {
+      badge: 'bg-amber-500/10 text-amber-600',
+      border: 'border-amber-500/15'
+    }
+  } as const;
+
+  const colors = palette[tone];
+
   return (
-    <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2 items-start">
-      <div className="flex items-center gap-2 text-sns-500">{icon}</div>
-      <div className="text-2xl font-bold text-gray-900">{value}</div>
-      <div className="text-sm text-gray-500">{title}</div>
-      {change && (
-        <div className={`text-xs mt-1 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
-          {change}
-        </div>
-      )}
+    <div
+      className={`relative flex min-w-[140px] flex-1 items-center gap-3 overflow-hidden rounded-[20px] border ${colors.border} bg-white/85 px-3 py-2.5 shadow-[0_20px_38px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5`}
+    >
+      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${colors.badge}`}>{icon}</div>
+      <div className="space-y-0.5">
+        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{title}</div>
+        <div className="text-base font-semibold text-slate-900">{value}</div>
+      </div>
+    </div>
+  );
+}
+
+// Лоадер в фирменном стиле, чтобы не дублировать разметку
+function LoadingPulse({ message = 'Загружаем данные…' }: { message?: string }) {
+  return (
+    <div className="flex items-center justify-center py-12">
+      <div className="flex flex-col items-center gap-3 text-slate-500">
+        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
+        <p className="text-sm font-medium">{message}</p>
+      </div>
     </div>
   );
 }
 
+// Приветственный блок для эффекта "Apple 2025"
+function HeroPanel({
+  greeting,
+  fullName,
+  motivationalMessage,
+  roleLabel,
+  gradientAngle
+}: {
+  greeting: string;
+  fullName: string;
+  motivationalMessage: string;
+  roleLabel: string;
+  gradientAngle: number;
+}) {
+  const firstName = useMemo(() => {
+    const parts = fullName.split(' ');
+    return parts.length > 1 ? parts[1] : parts[0];
+  }, [fullName]);
+
+  return (
+    <section
+      className="relative overflow-hidden rounded-[32px] border border-white/15 px-6 py-8 text-white shadow-[0_44px_120px_-70px_rgba(8,47,35,0.8)] sm:px-10 sm:py-10"
+      style={{
+        background: `linear-gradient(${gradientAngle}deg, rgba(11,138,103,0.95) 0%, rgba(8,115,86,0.9) 45%, rgba(6,93,70,0.95) 100%)`
+      }}
+    >
+      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),transparent_55%)]" />
+      <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl" />
+      <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
+      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_40%)]" />
+
+      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
+        <div className="space-y-5">
+          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
+            <Sparkle className="h-3.5 w-3.5" />
+            <span>Панель развития</span>
+          </div>
+          <div className="space-y-3">
+            <h1 className="text-[28px] font-semibold leading-tight sm:text-[34px]">
+              {greeting}, {firstName}!
+            </h1>
+            <p className="max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">{motivationalMessage}</p>
+          </div>
+          <div className="inline-flex flex-wrap items-center gap-2 text-xs text-white/85 sm:text-sm">
+            <Shield className="h-4 w-4" />
+            <span className="font-medium">Ваша роль — {roleLabel}</span>
+          </div>
+        </div>
+
+        <div className="flex flex-col items-start gap-4 sm:items-end">
+          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left text-sm font-medium text-white/85 backdrop-blur-md">
+            Поддерживаем ваш путь по программе «Потенциал ГДФ».
+          </div>
+          <div className="flex items-center gap-2 text-xs text-white/70">
+            <Calendar className="h-4 w-4" />
+            <span>Мы рядом, чтобы помочь вам в развитии</span>
+          </div>
+        </div>
+      </div>
+    </section>
+  );
+}
+
 export function DashboardView() {
   const { user, userProfile, loading } = useAuth();
   const [upcomingEvents, setUpcomingEvents] = useState<EventWithDetails[]>([]);
   const [eventsLoading, setEventsLoading] = useState(true);
   const [eventsError, setEventsError] = useState<string | null>(null);
   const [stats, setStats] = useState({
     activeEvents: 0,
     totalParticipants: 0,
     completedCourses: 0,
     averageRating: 0
   });
+  const [heroGradientAngle, setHeroGradientAngle] = useState(120);
 
   const getGreeting = () => {
     const hour = new Date().getHours();
     if (hour < 12) return 'Доброе утро';
     if (hour < 18) return 'Добрый день';
     return 'Добрый вечер';
   };
 
-  function extractFirstName(fullName: string): string {
-    const parts = fullName.split(' ');
-    return parts.length > 1 ? parts[1] : parts[0];
-  }
-
-  // Фиксируем мотивационное сообщение с помощью useMemo
+  // Фиксируем мотивационное сообщение, чтобы оно не дёргалось при рендерах
   const motivationalMessage = useMemo(() => {
-    // Специальные сообщения для экспертов
     if (userProfile?.role === 'expert') {
       const expertMessages = [
         'Спасибо за ваш вклад в развитие команды!',
-        'Ваша экспертная оценка помогает расти другим',
-        'Благодарим за участие в наставничестве',
-        'Ваш опыт ценен для всей команды',
-        'Спасибо за вашу экспертную поддержку'
+        'Ваша экспертная оценка помогает расти другим.',
+        'Благодарим за участие в наставничестве.',
+        'Ваш опыт ценен для всей команды.',
+        'Спасибо за вашу экспертную поддержку.'
       ];
       return expertMessages[Math.floor(Math.random() * expertMessages.length)];
     }
-    
-    // Обычные сообщения для остальных ролей
+
     const messages = [
       'Готовы к новым знаниям?',
       'Продолжайте развиваться!',
-      'Каждый день — новая возможность учиться',
-      'Ваш путь к успеху начинается здесь',
-      'Инвестируйте в свое будущее'
+      'Каждый день — новая возможность учиться.',
+      'Ваш путь к успеху начинается здесь.',
+      'Инвестируйте в своё будущее.'
     ];
     return messages[Math.floor(Math.random() * messages.length)];
-  }, [userProfile?.role]); // Пересчитываем только при изменении роли
+  }, [userProfile?.role]);
 
-  // Загрузка мероприятий пользователя с кэшированием
-  const fetchUserEvents = async (forceRefresh = false) => {
-    if (!user?.id || !userProfile?.role) return;
-    
-    try {
-      // Проверяем кэш, если не принудительное обновление
-      if (!forceRefresh) {
-        const cachedEvents = getCachedEvents(user.id, userProfile.role);
-        if (cachedEvents) {
-          setUpcomingEvents(cachedEvents);
-          setEventsLoading(false);
-          setEventsError(null);
-          return;
-        }
-      }
+  useEffect(() => {
+    const interval = window.setInterval(() => {
+      setHeroGradientAngle(prev => (prev + 1) % 360);
+    }, 120);
 
-      setEventsLoading(true);
-      setEventsError(null);
+    return () => {
+      window.clearInterval(interval);
+    };
+  }, []);
+
+  // Загружаем мероприятия с учётом кэша и принудительного обновления
+  const fetchUserEvents = useCallback(
+    async (forceRefresh = false) => {
+      if (!user?.id || !userProfile?.role) return;
+
+      try {
+        if (!forceRefresh) {
+          const cachedEvents = getCachedEvents(user.id, userProfile.role);
+          if (cachedEvents) {
+            setUpcomingEvents(cachedEvents);
+            setEventsLoading(false);
+            setEventsError(null);
+            return;
+          }
+        }
 
-      const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
-      const isExpert = userProfile?.role === 'expert';
-      
-      let query;
-      
-      if (isAdmin) {
-        // Администраторы видят все мероприятия
-        query = supabase
-          .from('events')
-          .select(`
-            *,
-            event_type:event_types(id, name, name_ru),
-            event_participants(id)
-          `)
-          .order('start_date', { ascending: false })
-          .limit(6);
-      } else if (isExpert) {
-        // Эксперты видят мероприятия, где они указаны в expert_emails
-        query = supabase
-          .from('events')
-          .select(`
-            *,
-            event_type:event_types(id, name, name_ru),
-            event_participants(id)
-          `)
-          .contains('expert_emails', [userProfile?.email])
-          .order('start_date', { ascending: false })
-          .limit(6);
-      } else {
-        // Обычные пользователи видят только свои мероприятия
-        query = supabase
-          .from('events')
-          .select(`
-            *,
-            event_type:event_types(id, name, name_ru),
-            event_participants!inner(user_id)
-          `)
-          .eq('status', 'active')
-          .gte('start_date', new Date().toISOString())
-          .eq('event_participants.user_id', user.id)
-          .order('start_date', { ascending: true })
-          .limit(6);
-      }
+        setEventsLoading(true);
+        setEventsError(null);
+
+        const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
+        const isExpert = userProfile?.role === 'expert';
+
+        let query;
+
+        if (isAdmin) {
+          query = supabase
+            .from('events')
+            .select(`
+              *,
+              event_type:event_types(id, name, name_ru),
+              event_participants(id)
+            `)
+            .order('start_date', { ascending: false })
+            .limit(6);
+        } else if (isExpert) {
+          query = supabase
+            .from('events')
+            .select(`
+              *,
+              event_type:event_types(id, name, name_ru),
+              event_participants(id)
+            `)
+            .contains('expert_emails', [userProfile?.email])
+            .order('start_date', { ascending: false })
+            .limit(6);
+        } else {
+          query = supabase
+            .from('events')
+            .select(`
+              *,
+              event_type:event_types(id, name, name_ru),
+              event_participants!inner(user_id)
+            `)
+            .eq('status', 'active')
+            .gte('start_date', new Date().toISOString())
+            .eq('event_participants.user_id', user.id)
+            .order('start_date', { ascending: true })
+            .limit(6);
+        }
 
-      const { data, error } = await query;
+        const { data, error } = await query;
 
-      console.log('Dashboard fetchEvents - isAdmin:', isAdmin, 'user:', user?.id, 'userProfile:', userProfile?.role);
-      console.log('Dashboard fetchEvents - data length:', data?.length, 'data:', data, 'error:', error);
+        if (error) {
+          console.error('Error fetching events:', error);
+          setEventsError(`Ошибка загрузки мероприятий: ${error.message}`);
+          return;
+        }
 
-      if (error) {
+        if (data) {
+          const uniqueEvents = data.reduce((acc, event) => {
+            if (!acc.find(e => e.id === event.id)) {
+              acc.push(event);
+            }
+            return acc;
+          }, [] as EventWithDetails[]);
+
+          const eventsWithDetails = uniqueEvents.map(event => ({
+            ...event,
+            participants_count: 0
+          }));
+
+          setUpcomingEvents(eventsWithDetails);
+          setCachedEvents(eventsWithDetails, user.id, userProfile.role);
+        } else {
+          setUpcomingEvents([]);
+          setCachedEvents([], user.id, userProfile.role);
+        }
+      } catch (error) {
         console.error('Error fetching events:', error);
-        setEventsError(`Ошибка загрузки мероприятий: ${error.message}`);
-        return;
+        setEventsError(`Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
+      } finally {
+        setEventsLoading(false);
       }
+    },
+    [user?.id, userProfile?.role, userProfile?.email]
+  );
 
-      if (data) {
-        // Для inner join нужно получить уникальные события
-        const uniqueEvents = data.reduce((acc, event) => {
-          if (!acc.find(e => e.id === event.id)) {
-            acc.push(event);
-          }
-          return acc;
-        }, [] as any[]);
-
-        const eventsWithDetails = uniqueEvents.map(event => ({
-          ...event,
-          participants_count: 0 // Пока не показываем количество участников для простоты
-        }));
-        
-        setUpcomingEvents(eventsWithDetails);
-        // Сохраняем в кэш
-        setCachedEvents(eventsWithDetails, user.id, userProfile.role);
-      } else {
-        setUpcomingEvents([]);
-        setCachedEvents([], user.id, userProfile.role);
-      }
-    } catch (error) {
-      console.error('Error fetching events:', error);
-      setEventsError(`Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
-    } finally {
-      setEventsLoading(false);
-    }
-  };
-
-  // Загрузка статистики
-  const fetchStats = async () => {
+  // Загружаем компактную статистику по роли
+  const fetchStats = useCallback(async () => {
     if (!user?.id) return;
 
     try {
       const isAdmin = userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role);
       const isExpert = userProfile?.role === 'expert';
-      
-      if (isAdmin) {
-        // Для администраторов - общая статистика
-        const { data: eventsData } = await supabase
-          .from('events')
-          .select('id, status')
-          .eq('status', 'active');
 
-        const { data: participantsData } = await supabase
-          .from('event_participants')
-          .select('id');
+      if (isAdmin) {
+        const { data: eventsData } = await supabase.from('events').select('id, status').eq('status', 'active');
+        const { data: participantsData } = await supabase.from('event_participants').select('id');
 
         setStats({
           activeEvents: eventsData?.length || 0,
           totalParticipants: participantsData?.length || 0,
-          completedCourses: 0, // TODO: реализовать подсчет завершенных курсов
-          averageRating: 4.8 // TODO: реализовать подсчет средней оценки
+          completedCourses: 0,
+          averageRating: 4.8
         });
       } else if (isExpert) {
-        // Для экспертов - статистика по их мероприятиям
         const { data: expertEventsData } = await supabase
           .from('events')
           .select('id, status')
           .contains('expert_emails', [userProfile?.email])
           .eq('status', 'active');
 
         setStats({
           activeEvents: expertEventsData?.length || 0,
-          totalParticipants: 0, // Не показываем общее количество участников для экспертов
-          completedCourses: 0, // TODO: реализовать подсчет завершенных курсов эксперта
-          averageRating: 0 // Не показываем среднюю оценку для экспертов
+          totalParticipants: 0,
+          completedCourses: 0,
+          averageRating: 0
         });
       } else {
-        // Для обычных пользователей - их статистика
         const { data: userEventsData } = await supabase
           .from('events')
           .select('id, status')
           .eq('status', 'active')
           .eq('event_participants.user_id', user.id);
 
         setStats({
           activeEvents: userEventsData?.length || 0,
-          totalParticipants: 0, // Не показываем общее количество участников для обычных пользователей
-          completedCourses: 0, // TODO: реализовать подсчет завершенных курсов пользователя
-          averageRating: 0 // Не показываем среднюю оценку для обычных пользователей
+          totalParticipants: 0,
+          completedCourses: 0,
+          averageRating: 0
         });
       }
     } catch (error) {
       console.error('Error fetching stats:', error);
     }
-  };
+  }, [user?.id, userProfile?.role, userProfile?.email]);
 
   useEffect(() => {
     if (user && userProfile) {
-      // Очищаем кэш при смене пользователя
       clearEventsCache();
       fetchUserEvents();
       fetchStats();
     }
-  }, [user, userProfile]);
+  }, [user, userProfile, fetchUserEvents, fetchStats]);
+
+  const role = userProfile?.role;
+
+  const statsCards = useMemo(() => {
+    if (!role) return [];
+
+    if (role === 'expert') {
+      return [
+        {
+          title: 'Активные экзамены',
+          value: stats.activeEvents,
+          icon: <CheckCircle2 className="h-5 w-5" />,
+          tone: 'emerald' as const
+        }
+      ];
+    }
+
+    const baseCards = [
+      {
+        title: 'Активные мероприятия',
+        value: stats.activeEvents,
+        icon: <BookOpen className="h-5 w-5" />,
+        tone: 'emerald' as const
+      },
+      {
+        title: 'Завершенные курсы',
+        value: stats.completedCourses,
+        icon: <Award className="h-5 w-5" />,
+        tone: 'amber' as const
+      }
+    ];
+
+    if (['administrator', 'moderator', 'trainer'].includes(role)) {
+      baseCards.push(
+        {
+          title: 'Участники',
+          value: stats.totalParticipants,
+          icon: <Users className="h-5 w-5" />,
+          tone: 'blue' as const
+        },
+        {
+          title: 'Средняя оценка',
+          value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—',
+          icon: <TrendingUp className="h-5 w-5" />,
+          tone: 'slate' as const
+        }
+      );
+    }
+
+    return baseCards;
+  }, [role, stats]);
 
   if (loading) {
     return (
-      <div className="flex items-center justify-center min-h-[60vh]">
-        <div className="flex flex-col items-center">
-          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
-          <p className="text-gray-600">Загрузка данных пользователя...</p>
-        </div>
+      <div className="flex min-h-[60vh] items-center justify-center">
+        <LoadingPulse message="Загружаем ваш дашборд…" />
       </div>
     );
   }
 
   return (
-    <div className="space-y-6 pb-24 md:pb-8 pb-safe-bottom">
-      {/* Welcome Section */}
-      <section className="bg-gradient-to-br from-[#06A478] via-[#059669] to-[#047857] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
-        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
-          <div>
-            <h1 className="text-xl sm:text-2xl font-semibold mb-2 text-white">
-              {getGreeting()}, {extractFirstName(userProfile?.full_name || 'Пользователь')}
-            </h1>
-            <p className="text-white/90 text-sm sm:text-base mb-3 leading-relaxed">
-              {motivationalMessage}
-            </p>
-            <div className="flex items-center space-x-2 text-white/80 text-xs">
-              <Shield size={14} />
-              <span className="font-medium">
-                Ваша роль - {userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Не определена'}
-              </span>
-            </div>
-          </div>
-          <div className="flex items-center space-x-3 mt-2 sm:mt-0">
-            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
-              <Calendar size={16} className="text-white/90" />
-              <span className="text-sm font-medium text-white">
-                {new Date().toLocaleDateString('ru-RU', {
-                  weekday: 'short',
-                  day: 'numeric',
-                  month: 'long'
-                })}
-              </span>
-            </div>
+    <div className="relative pb-28 pb-safe-bottom md:pb-12">
+      <div className="absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.22),transparent_65%)] blur-3xl" />
+      <div className="absolute inset-x-0 top-40 h-72 bg-[radial-gradient(circle_at_center,_rgba(6,164,120,0.12),transparent_70%)] blur-2xl" />
+
+      <div className="relative z-10 flex flex-col gap-8">
+        <HeroPanel
+          greeting={getGreeting()}
+          fullName={userProfile?.full_name || 'Пользователь'}
+          motivationalMessage={motivationalMessage}
+          roleLabel={userProfile?.role ? USER_ROLE_LABELS[userProfile.role] : 'Не определена'}
+          gradientAngle={heroGradientAngle}
+        />
+
+        <section className="space-y-3">
+          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Ваш прогресс</h2>
+          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
+            {statsCards.map(card => (
+              <StatsCard key={card.title} title={card.title} value={card.value} icon={card.icon} tone={card.tone} />
+            ))}
           </div>
-        </div>
-        {/* Декоративные элементы */}
-        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
-        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
-        <div className="absolute top-1/2 -right-8 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />
-      </section>
-
-      {/* Stats Grid */}
-      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
-        {/* Для экспертов не показываем карточки статистики */}
-        {userProfile?.role !== 'expert' && (
-          <>
-            <StatsCard
-              title="Активные мероприятия"
-              value={stats.activeEvents}
-              icon={<BookOpen size={22} />}
-            />
-            <StatsCard
-              title="Завершенные курсы"
-              value={stats.completedCourses}
-              icon={<Award size={22} />}
-            />
-          </>
-        )}
-        {userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role) && (
-          <StatsCard
-            title="Участники"
-            value={stats.totalParticipants}
-            icon={<Users size={22} />}
-          />
-        )}
-        {userProfile?.role && ['administrator', 'moderator', 'trainer'].includes(userProfile.role) && (
-          <StatsCard
-            title="Средняя оценка"
-            value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
-            icon={<TrendingUp size={22} />}
-          />
-        )}
-      </section>
-
-      {/* Achievements Section - временно отключено */}
-      {/* <AchievementSection /> */}
-
-      {/* Upcoming Events as Cards */}
-      <section className="mt-4">
-        <div className="flex items-center justify-between mb-2">
-          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
-            Ближайшие мероприятия
-          </h2>
-          <div className="flex items-center gap-2">
-            <button 
+        </section>
+
+        <section className="space-y-4">
+          <div className="flex items-center justify-between">
+            <h2 className="text-lg font-semibold text-slate-900">Ближайшие мероприятия</h2>
+            <button
               onClick={() => fetchUserEvents(true)}
               disabled={eventsLoading}
-              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50/50 hover:bg-slate-100/80 px-2 py-1.5 rounded-lg border border-slate-200/60 hover:border-slate-300/80"
+              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors duration-200 hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
             >
-              <RefreshCw className={`w-3.5 h-3.5 ${eventsLoading ? 'animate-spin' : ''}`} />
+              <RefreshCw className={`h-3.5 w-3.5 ${eventsLoading ? 'animate-spin' : ''}`} />
               Обновить
             </button>
           </div>
-        </div>
-        
-        {eventsLoading ? (
-          <div className="flex items-center justify-center py-12 mb-32 md:mb-20">
-            <div className="flex flex-col items-center">
-              <div className="w-8 h-8 border-3 border-[#06A478] border-t-transparent rounded-full animate-spin mb-4"></div>
-              <p className="text-slate-600 font-medium">Загрузка мероприятий...</p>
+
+          {eventsLoading ? (
+            <LoadingPulse message="Загружаем мероприятия…" />
+          ) : eventsError ? (
+            <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-100 bg-red-50/60 px-6 py-8 text-center text-red-600">
+              <XCircle className="h-10 w-10" />
+              <p className="text-sm font-semibold">{eventsError}</p>
+              <div className="flex flex-col gap-3 sm:flex-row">
+                <button
+                  onClick={() => fetchUserEvents(true)}
+                  className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-600"
+                >
+                  <RefreshCw className="h-4 w-4" />
+                  Попробовать снова
+                </button>
+                <button
+                  onClick={() => fetchUserEvents()}
+                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-white/60"
+                >
+                  Загрузить из кэша
+                </button>
+              </div>
             </div>
-          </div>
-        ) : eventsError ? (
-          <div className="text-center py-12 mb-32 md:mb-20">
-            <XCircle className="mx-auto text-red-500 mb-4" size={48} />
-            <p className="text-red-600 mb-4 font-medium">{eventsError}</p>
-            <div className="flex flex-col sm:flex-row gap-3 justify-center">
-              <button 
+          ) : upcomingEvents.length === 0 ? (
+            <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200/70 bg-white/70 px-6 py-12 text-center">
+              <BookOpen size={48} className="text-slate-300" />
+              <div className="space-y-2">
+                <p className="text-sm font-semibold text-slate-700">У вас пока нет предстоящих мероприятий</p>
+                <p className="text-xs text-slate-500">Обратитесь к администратору, чтобы записаться и получить новые события.</p>
+              </div>
+              <button
                 onClick={() => fetchUserEvents(true)}
-                className="inline-flex items-center px-4 py-2 bg-[#06A478] text-white rounded-2xl hover:bg-[#059669] transition-colors text-sm font-medium shadow-sm hover:shadow-md"
-              >
-                <RefreshCw className="w-4 h-4 mr-2" />
-                Попробовать снова
-              </button>
-              <button 
-                onClick={() => fetchUserEvents()}
-                className="inline-flex items-center px-4 py-2 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-colors text-sm font-medium"
+                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
               >
-                Загрузить из кэша
+                <RefreshCw className="h-4 w-4" />
+                Обновить
               </button>
             </div>
-          </div>
-        ) : upcomingEvents.length === 0 ? (
-          <div className="text-center py-12 mb-32 md:mb-20">
-            <BookOpen size={48} className="mx-auto text-slate-400 mb-4" />
-            <p className="text-slate-600 mb-2 font-medium">У вас пока нет предстоящих мероприятий</p>
-            <p className="text-sm text-slate-500 mb-6">Обратитесь к администратору для записи на мероприятия</p>
-            <button 
-              onClick={() => fetchUserEvents(true)}
-              className="inline-flex items-center px-4 py-2 text-slate-600 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-colors text-sm font-medium"
-            >
-              <RefreshCw className="w-4 h-4 mr-2" />
-              Обновить
-            </button>
-          </div>
-        ) : (
-          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-32 md:mb-20 mt-4 md:mt-0" style={{ lineHeight: '1.2' }}>
-            {upcomingEvents.map((event) => (
-              <EventCard key={event.id} event={event} />
-            ))}
-          </div>
-        )}
-      </section>
-
-      {/* Bottom Navigation для мобильных */}
-
+          ) : (
+            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 scrollbar-hide sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 xl:grid-cols-3">
+              {upcomingEvents.map(event => (
+                <EventCard key={event.id} event={event} />
+              ))}
+            </div>
+          )}
+        </section>
+      </div>
     </div>
   );
-}
+}
