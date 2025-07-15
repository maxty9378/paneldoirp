import { supabase } from '../lib/supabase';

interface UserCreationResult {
  success: boolean;
  message: string;
  email?: string;
  password?: string;
  configurationRequired?: boolean;
  user?: any;
}

export async function createRegularUser(
  email: string,
  fullName: string,
  role: string = 'employee',
  customPassword: string = '123456'
): Promise<UserCreationResult> {
  try {
    console.log(`📝 Начало процесса создания пользователя с ролью ${role}`);
    
    // Проверяем, существует ли уже пользователь в таблице users
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    // Проверяем, существует ли пользователь в auth.users
    let authUserExists = false;
    try {
      // Используем Edge Function для проверки существования пользователя в auth
      const { data: authCheckData, error: authCheckError } = await supabase.functions.invoke(
        'create-auth-user', {
          body: {
            action: 'check_exists',
            email: email
          }
        }
      );
      
      if (!authCheckError && authCheckData && authCheckData.exists) {
        authUserExists = true;
        console.log("📝 Пользователь существует в auth.users");
      }
    } catch (authCheckErr) {
      console.warn("📝 Не удалось проверить существование в auth:", authCheckErr);
    }
    
    // Случай 1: Пользователь существует в обеих таблицах
    if (existingUser && authUserExists) {
      console.log("📝 Пользователь существует в обеих таблицах");
      return {
        success: true,
        message: 'Пользователь уже существует в системе.',
        email: email,
        password: customPassword,
        user: existingUser
      };
    }
    
    // Случай 2: Пользователь существует только в users, но не в auth
    if (existingUser && !authUserExists) {
      console.log("📝 Пользователь существует в users, но не в auth - создаем auth запись");
      try {
        // Используем Edge Function для создания auth записи с существующим ID
        const { data: syncData, error: syncError } = await supabase.functions.invoke(
          'create-auth-user', {
            body: {
              email: email,
              password: customPassword,
              userId: existingUser.id,
              fullName: fullName,
              role: role
            }
          }
        );
        
        if (!syncError && syncData && syncData.success) {
          return {
            success: true,
            message: 'Пользователь существовал в базе данных. Создана учетная запись для входа.',
            email: email,
            password: customPassword,
            user: existingUser
          };
        } else {
          throw new Error(syncData?.error || 'Не удалось создать auth запись');
        }
      } catch (syncErr) {
        console.warn("📝 Ошибка синхронизации с auth:", syncErr);
        
        // Если не удалось создать auth запись, удаляем существующего пользователя и создаем заново
        console.log("📝 Удаление существующего пользователя для повторного создания");
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('email', email);
          
        if (deleteError) {
          console.error("📝 Ошибка удаления:", deleteError);
          throw new Error('Не удалось удалить существующего пользователя');
        }
        
        // Продолжаем процесс создания нового пользователя
      }
    }
    
    // Случай 3: Пользователь существует только в auth, но не в users
    // Этот случай будет обработан при создании нового пользователя
    
    // Случай 4: Пользователь не существует ни в одной таблице - создаем нового
    console.log("📝 Создание нового пользователя");
    
    // Используем Edge Function create-user-and-auth для создания пользователя в обеих таблицах
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'create-user-and-auth', {
          body: {
            email: email,
            password: customPassword,
            full_name: fullName,
            role: role
          }
        }
      );
      
      if (!functionError && functionData && functionData.success) {
        console.log("📝 Пользователь успешно создан через Edge Function");
        return {
          success: true,
          message: 'Пользователь успешно создан.',
          email: email,
          password: customPassword,
          user: functionData.user
        };
      } else {
        console.log("📝 Ошибка Edge Function:", functionData?.error || functionError);
        throw new Error(functionData?.error || functionError?.message || 'Ошибка создания пользователя');
      }
    } catch (functionErr) {
      console.warn("📝 Ошибка вызова Edge Function:", functionErr);
      
      // Пробуем запасной вариант - создание через RPC
      try {
        console.log("📝 Попытка создания через RPC функцию");
        const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_create_user_safe', {
          p_email: email,
          p_full_name: fullName,
          p_role: role,
          p_password: customPassword
        });
        
        if (!rpcError && rpcData && rpcData.success) {
          console.log("📝 Пользователь успешно создан через RPC");
          return {
            success: true,
            message: 'Пользователь успешно создан через запасной метод.',
            email: email,
            password: customPassword,
            user: rpcData.user
          };
        } else {
          console.log("📝 Ошибка RPC:", rpcError || rpcData?.error);
          throw new Error(rpcData?.error || rpcError?.message || 'Ошибка RPC функции');
        }
      } catch (rpcErr) {
        console.warn("📝 Ошибка вызова RPC:", rpcErr);
      }
    }
    
    // Если все методы не сработали, пробуем прямое создание
    try {
      console.log("📝 Попытка прямого создания пользователя");
      
      // 1. Создаем пользователя в auth.users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: customPassword,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });
      
      if (authError) throw authError;
      
      // 2. Создаем пользователя в public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user?.id,
          email: email,
          full_name: fullName,
          role: role,
          subdivision: 'management_company',
          status: 'active',
          is_active: true,
          work_experience_days: 0,
          department: 'management_company'
        })
        .select()
        .single();
      
      if (userError) throw userError;
      
      return {
        success: true,
        message: 'Пользователь успешно создан напрямую.',
        email: email,
        password: customPassword,
        user: userData
      };
    } catch (directErr) {
      console.error("📝 Ошибка прямого создания:", directErr);
    }
    
    // Если все методы не сработали, возвращаем ошибку с инструкциями
    return {
      success: false,
      message: 'Не удалось создать пользователя автоматически.\n\nВозможные решения:\n\n' +
               '1. Проверьте подключение к Supabase\n' +
               '2. Убедитесь, что RLS политики настроены корректно\n' +
               '3. В Supabase Dashboard отключите Email Confirmation\n' +
               '4. Создайте пользователя вручную через Supabase Dashboard\n\n' +
               'Техническая информация: Возможно, пользователь существует в одной таблице, но не в другой.',
      configurationRequired: true
    };
    
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    
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
        // Если ошибка связана с дублированием, пробуем исправить ситуацию
        try {
          console.log("📝 Обнаружен дубликат, попытка восстановления");
          
          // Проверяем, существует ли пользователь в users
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();
            
          if (existingUser) {
            // Удаляем существующего пользователя
            await supabase
              .from('users')
              .delete()
              .eq('email', email);
              
            // Рекурсивно вызываем функцию создания пользователя
            console.log("📝 Повторная попытка создания после удаления дубликата");
            return createRegularUser(email, fullName, role, customPassword);
          }
        } catch (recoveryErr) {
          console.error("📝 Ошибка восстановления:", recoveryErr);
        }
        
        return {
          success: false,
          message: 'Пользователь с таким email уже существует, но возникла ошибка синхронизации. Попробуйте использовать другой email или обратитесь к администратору.'
        };
      }
      
      return {
        success: false,
        message: `Ошибка создания пользователя: ${error.message}\n\nПопробуйте создать пользователя вручную через Supabase Dashboard или обратитесь к разработчику.`
      };
    }
    
    return {
      success: false,
      message: 'Неизвестная ошибка при создании пользователя. Проверьте настройки Supabase и попробуйте снова.'
    };
  }
}