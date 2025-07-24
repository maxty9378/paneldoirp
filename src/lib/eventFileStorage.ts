import { supabase } from './supabase';

// Функция для очистки названий файлов от недопустимых символов
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9\-_]/g, '_') // Заменяем все недопустимые символы на подчеркивание
    .replace(/_+/g, '_') // Заменяем множественные подчеркивания на одно
    .replace(/^_|_$/g, '') // Убираем подчеркивания в начале и конце
    .substring(0, 100); // Ограничиваем длину
};

export interface EventFile {
  id: string;
  name: string;
  type: 'presentation' | 'workbook';
  url: string;
  size: number;
  created_at: string;
}

export const uploadEventFile = async (
  file: File,
  eventId: string,
  fileType: 'presentation' | 'workbook',
  customFileName?: string
): Promise<{ success: boolean; url?: string; error?: string; originalName?: string }> => {
  try {
    // Создаем уникальное имя файла
    const fileExt = file.name.split('.').pop();
    const baseFileName = customFileName || file.name;
    // Убираем расширение из пользовательского названия, если оно есть
    const nameWithoutExt = baseFileName.replace(/\.[^/.]+$/, '');
    
    // Очищаем название файла от недопустимых символов для Storage
    const sanitizedName = sanitizeFileName(nameWithoutExt);
    
    const fileName = `${eventId}/${fileType}/${Date.now()}-${sanitizedName}.${fileExt}`;

    // Загружаем файл в Supabase Storage
    const { data, error } = await supabase.storage
      .from('event-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Ошибка загрузки файла:', error);
      return { success: false, error: error.message };
    }

    // Получаем публичную ссылку на файл
    const { data: urlData } = supabase.storage
      .from('event-files')
      .getPublicUrl(fileName);

    // Сохраняем метаданные файла в базу данных
    const { error: dbError } = await supabase
      .from('event_files')
      .insert({
        event_id: eventId,
        file_name: baseFileName,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_size: file.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (dbError) {
      console.error('Ошибка сохранения метаданных файла:', dbError);
      await supabase.storage.from('event-files').remove([fileName]);
      return { success: false, error: dbError.message };
    }



    return {
      success: true,
      url: urlData.publicUrl,
      originalName: baseFileName
    };
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
};

export const deleteEventFile = async (fileId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Сначала получаем информацию о файле из БД
    const { data: fileData, error: fetchError } = await supabase
      .from('event_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError) {
      console.error('Ошибка получения информации о файле:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!fileData) {
      return { success: false, error: 'Файл не найден' };
    }

    // Извлекаем путь файла из URL
    const url = new URL(fileData.file_url);
    const filePath = url.pathname.split('/').slice(-3).join('/'); // Получаем путь вида eventId/type/filename

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from('event-files')
      .remove([filePath]);

    if (storageError) {
      console.error('Ошибка удаления файла из Storage:', storageError);
      // Продолжаем удаление записи из БД даже если файл не найден в Storage
    }

    // Удаляем запись из БД
    const { error: dbError } = await supabase
      .from('event_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Ошибка удаления записи из БД:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Ошибка при удалении файла:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
};

export const updateEventFileName = async (fileId: string, newFileName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Обновляем название файла в базе данных
    const { error } = await supabase
      .from('event_files')
      .update({ file_name: newFileName })
      .eq('id', fileId);

    if (error) {
      console.error('Ошибка обновления названия файла:', error);
      return { success: false, error: error.message };
    }

    console.log('Название файла обновлено в БД:', newFileName);
    return { success: true };
  } catch (error) {
    console.error('Ошибка при обновлении названия файла:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
  
  /*
  try {
    const { error } = await supabase
      .from('event_files')
      .update({ file_name: newFileName })
      .eq('id', fileId);

    if (error) {
      console.error('Ошибка обновления названия файла:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Ошибка при обновлении названия файла:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
  */
};

export const getEventFiles = async (eventId: string): Promise<EventFile[]> => {
  try {
    // Получаем файлы из базы данных
    const { data, error } = await supabase
      .from('event_files')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения файлов из БД:', error);
      return [];
    }

    // Преобразуем данные в формат EventFile
    const files: EventFile[] = (data || []).map(file => ({
      id: file.id,
      name: file.file_name, // Используем оригинальное название из БД
      type: file.file_type as 'presentation' | 'workbook',
      url: file.file_url,
      size: file.file_size,
      created_at: file.created_at
    }));

    return files;
  } catch (error) {
    console.error('Ошибка при получении файлов:', error);
    return [];
  }
}; 