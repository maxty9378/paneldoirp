import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Получаем заголовок авторизации для проверки прав
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Отсутствует заголовок авторизации' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Создаем клиент Supabase с сервисной ролью для административных операций
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Проверяем права доступа текущего пользователя
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Недостаточно прав для создания пользователя' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Проверяем, является ли пользователь админом или модератором
    const { data: userRole, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (roleError || !userRole || !['administrator', 'moderator', 'trainer'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Недостаточно прав для создания пользователя' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Получаем данные пользователя из запроса
    const {
      email,
      password = '123456',
      full_name,
      role = 'employee',
      sap_number = null,
      position_id = null,
      territory_id = null,
      phone = null,
      department = 'management_company',
      subdivision = 'management_company',
      branch_id = null,
      branch_subrole = null,
      work_experience_days = 0
    } = await req.json();
    
    // Проверяем входные данные
    if (!full_name || !full_name.trim()) {
      throw new Error('ФИО обязательно для заполнения');
    }
    
    if ((!email || !email.trim()) && (!sap_number || !sap_number.trim())) {
      throw new Error('Необходимо указать email или SAP номер');
    }
    
    console.log('Создание/обновление пользователя:', { email, full_name, role });
    
    // Шаг 1: Проверяем, существует ли уже пользователь в public.users
    let existingUser = null;
    if (email && email.trim()) {
      const { data: existingByEmail } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      existingUser = existingByEmail;
    }
    
    if (!existingUser && sap_number && sap_number.trim()) {
      const { data: existingBySap } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('sap_number', sap_number)
        .single();
      existingUser = existingBySap;
    }
    
    let userId;
    let authCreated = false;
    let isUpdate = false;
    
    if (existingUser) {
      // Пользователь уже существует в базе данных, обновляем его данные
      userId = existingUser.id;
      isUpdate = true;
      console.log('Пользователь уже существует в базе данных, обновляем:', userId);
      
      // Если есть email, пробуем обновить auth пользователя
      if (email && email.trim()) {
        try {
          // Проверяем, существует ли auth пользователь
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
          
          if (authUser.user) {
            // Обновляем существующего auth пользователя
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password,
              email_confirm: true,
              user_metadata: {
                full_name,
                role
              }
            });
            authCreated = true;
            console.log('Auth пользователь обновлен:', userId);
          } else {
            // Auth пользователь не существует, создаем новый с существующим ID
            const { data: newAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: {
                full_name,
                role
              }
            });
            
            if (!authError && newAuthData.user) {
              // Если создался новый пользователь с другим ID, обновляем userId
              if (newAuthData.user.id !== userId) {
                userId = newAuthData.user.id;
                
                // Важно: обновляем ID пользователя в public.users на ID из auth
                if (newAuthData.user.id !== userId) {
                  const { error: updateIdError } = await supabaseAdmin
                    .from('users')
                    .update({ id: newAuthData.user.id })
                    .eq('id', userId);
                  
                  if (!updateIdError) {
                    userId = newAuthData.user.id; // Обновляем ID для дальнейшего использования
                    console.log('Обновлен ID пользователя в public.users:', userId);
                  }
                }
              }
              authCreated = true;
              console.log('Создан новый auth пользователь:', userId);
            }
          }
        } catch (authError) {
          console.warn('Ошибка при работе с auth пользователем:', authError.message);
          // Продолжаем без auth, если не критично
        }
      }
      
      // Обновляем данные в public.users
      const updateData = {
        full_name,
        role,
        position_id,
        territory_id,
        phone,
        department,
        subdivision,
        branch_id,
        branch_subrole, 
        work_experience_days: parseInt(work_experience_days) || 0,
        status: 'active', 
        work_experience_days: parseInt(work_experience_days) || 0,
        is_active: true,
        work_experience_days: parseInt(work_experience_days) || 0,
      }
      
      // Добавляем email и sap_number только если они предоставлены
      if (email && email.trim()) {
        updateData.email = email;
      }
      if (sap_number && sap_number.trim()) {
        updateData.sap_number = sap_number;
      }
      
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
      
      if (userError) {
        throw userError;
      }
      
      // Логируем обновление
      await supabaseAdmin
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'update_user_complete',
          resource_type: 'users',
          resource_id: userId,
          old_values: existingUser,
          new_values: updateData,
          success: true
        });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Пользователь успешно обновлен',
          user: userData,
          auth_created: authCreated,
          is_update: true,
          tempPassword: authCreated ? password : null
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Пользователь не существует, создаем нового
    // Шаг 2: Создаем пользователя в auth.users, если указан email
    // ВАЖНО: Сначала создаем в auth.users, а затем в public.users
    if (email && email.trim()) {
      try {
        console.log('Сначала создаем пользователя в auth.users');
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name,
            role
          }
        });
        
        if (authError) {
          console.error('Ошибка создания auth пользователя:', authError.message);
          
          // Если пользователь уже существует в auth, получаем его ID
          if (authError.message.includes('already registered')) {
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
              filter: email
            });
            
            if (existingUsers?.users?.length > 0) {
              userId = existingUsers.users[0].id;
              console.log('Auth пользователь уже существует, ID:', userId);
              
              // Сбрасываем пароль существующему пользователю
              await supabaseAdmin.auth.admin.updateUserById(userId, {
                password,
                email_confirm: true
              });
              
              authCreated = true;
            } else {
              throw authError;
            }
          } else {
            throw authError;
          }
        } else {
          // Auth пользователь успешно создан
          userId = authData.user.id;
          authCreated = true;
          console.log('Auth пользователь создан:', userId);
        }
      } catch (authCreationError) {
        console.error('Ошибка взаимодействия с auth API:', authCreationError);
        
        // Если не удалось создать auth пользователя, но требуется создать запись в users,
        // генерируем UUID сами
        if (sap_number && sap_number.trim()) {
          userId = crypto.randomUUID();
          console.log('Сгенерирован UUID для пользователя без auth записи:', userId);
        } else {
          throw new Error(`Не удалось создать auth пользователя: ${authCreationError.message}`);
        }
      }
    } else {
      // Если email не указан, просто генерируем UUID для пользователя в users
      userId = crypto.randomUUID();
      console.log('Сгенерирован UUID для пользователя без email:', userId);
      
      // Логируем действие
      await supabaseAdmin
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'create_user_without_email',
          resource_type: 'users',
          resource_id: userId,
          new_values: {
            sap_number,
            full_name
          }
        });
    }
    
    // Шаг 3: Создаем пользователя в public.users
    console.log('Создаем или обновляем запись в public.users с ID:', userId);
    
    // Проверяем, существует ли уже пользователь с этим ID
    const { data: existingWithId } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    let userData;
    if (existingWithId) {
      // Обновляем существующего пользователя
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          email,
          sap_number,
          full_name,
          role,
          position_id,
          territory_id,
          phone,
          department,
          subdivision,
          branch_id,
          branch_subrole,
          status: 'active',
          is_active: true,
          password_changed_at: authCreated ? new Date() : null
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      userData = data;
    } else {
      // Создаем нового пользователя
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email,
          sap_number,
          full_name,
          role,
          position_id,
          territory_id,
          phone,
          department,
          subdivision,
          branch_id,
          branch_subrole,
          status: 'active',
          is_active: true,
          work_experience_days: 0,
          password_changed_at: authCreated ? new Date() : null
        })
        .select()
        .single();
      
      if (error) throw error;
      userData = data;
    }
    
    if (!userData) {
      console.error('Не удалось создать или обновить пользователя в базе данных');
      
      // Обработка ошибок при создании пользователя
      if (authCreated && !isUpdate) {
        // Если пользователь создан в auth, но не в базе данных, пытаемся удалить auth запись
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log('Удалена auth запись после ошибки создания пользователя в базе данных');
        } catch (deleteError) {
          console.error('Не удалось удалить auth запись:', deleteError);
        }
      }
      
      throw new Error('Не удалось создать или обновить пользователя в базе данных');
    }
    
    // Логируем успешное создание
    await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'create_user_complete',
        resource_type: 'users',
        resource_id: userId,
        new_values: {
          email,
          full_name,
          role,
          auth_created: authCreated
        },
        success: true
      });
    
    // Возвращаем результат
    return new Response(
      JSON.stringify({
        success: true,
        message: authCreated 
          ? 'Пользователь успешно создан с возможностью входа' 
          : 'Пользователь создан, но вход невозможен (нет auth записи)',
        user: userData,
        auth_created: authCreated,
        is_update: false,
        tempPassword: authCreated ? password : null
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Ошибка в create-user-and-auth:', error);
    
    // Логируем ошибку
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseAdmin
        .from('admin_logs')
        .insert({
          action: 'create_user_and_auth_error',
          error_message: error.message,
          success: false
        });
    } catch (logError) {
      console.error('Ошибка при логировании:', logError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Ошибка при создании пользователя',
        error: error.message
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});