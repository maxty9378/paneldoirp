import { format, parseISO, isValid, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatEventDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Дата не указана';
    return format(date, 'dd MMM yyyy', { locale: ru });
  } catch (e) {
    return 'Дата не указана';
  }
};

export const formatEventTime = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '--:--';
    return format(date, 'HH:mm');
  } catch (e) {
    return '--:--';
  }
};

export const formatEventDateTime = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Дата не указана';
    return format(date, 'dd MMM yyyy, HH:mm', { locale: ru });
  } catch (e) {
    return 'Дата не указана';
  }
};

export const isEventToday = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return false;
    return isSameDay(date, new Date());
  } catch (e) {
    return false;
  }
};

export const isDateInRange = (dateString: string, startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return true;
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return false;
    
    if (startDate && endDate) {
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));
      return date >= start && date <= end;
    }
    
    if (startDate) {
      const start = startOfDay(parseISO(startDate));
      return date >= start;
    }
    
    if (endDate) {
      const end = endOfDay(parseISO(endDate));
      return date <= end;
    }
    
    return true;
  } catch (e) {
    return false;
  }
};