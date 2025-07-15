import { supabase } from '../lib/supabase';

interface AdminCreationResult {
  success: boolean;
  message: string;
  email?: string;
  password?: string;
  configurationRequired?: boolean;
  user?: any;
}

export async function createAdminUser() {
  try {
    console.log("📝 Начало процесса создания администратора через bootstrap-admin");
    
    // Call the bootstrap-admin edge function
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bootstrap-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge function failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("📝 Bootstrap admin result:", data);
      
      if (data.success) {
        return {
          success: true,
          message: data.message || 'Администратор успешно создан',
          email: data.email || 'doirp@sns.ru',
          password: data.password || '123456',
          user: data.user
        };
      } else {
        throw new Error(data.error || 'Unknown error in bootstrap-admin function');
      }
    } catch (edgeFunctionError) {
      console.warn("📝 Edge function error:", edgeFunctionError);
      // Fall back to RPC methods if edge function fails
    }
    
    // Try using supabase.rpc first as it's the most direct method
    try {
      console.log("📝 Пытаемся использовать rpc_bootstrap_admin");
      const { data: rpcResult, error: rpcError } = await supabase.rpc('rpc_bootstrap_admin');
      
      if (!rpcError && rpcResult?.success) {
        console.log("📝 rpc_bootstrap_admin успешно:", rpcResult);
        return {
          success: true,
          message: 'Администратор успешно создан через RPC. Используйте стандартные учётные данные для входа.',
          email: 'doirp@sns.ru',
          password: '123456'
        };
      } else {
        console.warn("📝 Ошибка rpc_bootstrap_admin:", rpcError);
      }
    } catch (rpcErr) {
      console.warn("📝 Исключение при вызове rpc_bootstrap_admin:", rpcErr);
    }

    // Synchronize auth state in case user exists in one table but not another
    console.log("📝 Попытка синхронизации auth пользователей");
    try {
      await supabase.rpc('rpc_sync_all_users_to_auth');
      console.log("📝 Синхронизация выполнена");
    } catch (syncError) {
      console.warn("📝 Ошибка при синхронизации:", syncError);
    }
    
    // Проверяем, существует ли уже администратор
    const { data: adminUser, error: adminCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'doirp@sns.ru')
      .maybeSingle();
      
    if (adminUser) {
      console.log("📝 Администратор уже существует в базе данных");
      return {
        success: true,
        message: 'Администратор уже существует в системе. Используйте стандартные учётные данные для входа.',
        email: 'doirp@sns.ru',
        password: '123456'
      };
    }

    // Попытка создания администратора через специальную bootstrap функцию
    console.log("📝 Попытка создания администратора через bootstrap RPC");
    try {
      const { data: bootstrapData, error: bootstrapError } = await supabase.rpc('rpc_create_bootstrap_admin');
      
      if (!bootstrapError && bootstrapData) {
        if (bootstrapData.success) {
          console.log("📝 Администратор успешно создан через bootstrap функцию");
          return {
            success: true,
            message: 'Администратор успешно создан. Используйте учётные данные для входа.',
            email: 'doirp@sns.ru',
            password: '123456'
          };
        } else {
          console.log("📝 Ошибка bootstrap функции:", bootstrapData.message);
          throw new Error(bootstrapData.message || 'Unknown bootstrap error');
        }
      } else {
        console.log("📝 Ошибка вызова bootstrap RPC:", bootstrapError);
        throw bootstrapError || new Error('Bootstrap RPC call failed');
      }
    } catch (bootstrapErr) {
      console.warn("📝 Ошибка вызова bootstrap RPC:", bootstrapErr);
    }

    // Пытаемся создать администратора через обычную RPC функцию
    console.log("📝 Попытка создания администратора через обычную RPC");
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_create_user', {
        p_email: 'doirp@sns.ru',
        p_full_name: 'Администратор портала',
        p_role: 'administrator'
      });
      
      if (!rpcError && rpcData) {
        if (rpcData.success) {
          console.log("📝 Администратор успешно создан через RPC функцию");
          return {
            success: true,
            message: 'Администратор успешно создан. Используйте учётные данные для входа.',
            email: 'doirp@sns.ru',
            password: '123456'
          };
        } else {
          console.log("📝 Ошибка RPC функции:", rpcData.message);
          throw new Error(rpcData.message || 'Unknown RPC error');
        }
      } else {
        console.log("📝 Ошибка RPC:", rpcError);
        throw rpcError || new Error('RPC call failed');
      }
    } catch (rpcErr) {
      console.warn("📝 Ошибка вызова RPC:", rpcErr);
    }
    
    // Пытаемся создать администратора через Edge Function
    console.log("📝 Попытка создания администратора через Edge Function");
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'create-user', {
          body: {
            email: 'doirp@sns.ru',
            password: '123456',
            full_name: 'Администратор портала',
            role: 'administrator'
          }
        }
      );
      
      if (!functionError && functionData) {
        if (functionData.success) {
          console.log("📝 Администратор успешно создан через Edge Function");
          return {
            success: true,
            message: 'Администратор успешно создан через Edge Function. Используйте учётные данные для входа.',
            email: 'doirp@sns.ru',
            password: '123456'
          };
        } else {
          console.log("📝 Ошибка Edge Function:", functionData.message);
          throw new Error(functionData.message || 'Unknown Edge Function error');
        }
      } else {
        console.log("📝 Ошибка Edge Function:", functionError);
        throw functionError || new Error('Edge Function call failed');
      }
    } catch (functionErr) {
      console.warn("📝 Ошибка вызова Edge Function:", functionErr);
    }
    
    // Если все методы не сработали, возвращаем ошибку с инструкциями
    return {
      success: false,
      message: 'Не удалось создать администратора автоматически.\n\nВозможные решения:\n\n' +
               '1. Проверьте подключение к Supabase\n' +
               '2. Убедитесь, что RLS политики настроены корректно\n' +
               '3. В Supabase Dashboard отключите Email Confirmation\n' +
               '4. Создайте администратора вручную через Supabase Dashboard\n\n' +
               'Для ручного создания:\n' +
               '- Email: doirp@sns.ru\n' +
               '- Password: 123456\n' +
               '- Role: administrator',
      configurationRequired: true
    };
    
  } catch (error) {
    console.error('Ошибка создания администратора:', error);
    
    // Предоставляем более подробную информацию об ошибке
    if (error instanceof Error) {
      if (error.message.includes('Email confirm') || error.message.includes('unexpected_failure')) {
        return {
          success: false,
          message: 'Требуется настройка подтверждения email в Supabase Dashboard. Зайдите в Dashboard → Authentication → Settings и отключите "Enable Email Confirm" для тестирования.',
          configurationRequired: true
        };
      }
      
      if (error.message.includes('already registered') || error.message.includes('23505') || error.message.includes('already exists')) {
        return {
          success: true,
          message: 'Администратор уже существует в системе. Используйте учётные данные для входа.',
          email: 'doirp@sns.ru',
          password: '123456'
        };
      }
      
      return {
        success: false,
        message: `Ошибка создания администратора: ${error.message}\n\nПопробуйте создать администратора вручную через Supabase Dashboard или обратитесь к разработчику.`
      };
    }
    
    return {
      success: false,
      message: 'Неизвестная ошибка при создании администратора. Проверьте настройки Supabase и попробуйте снова.'
    };
  }
}