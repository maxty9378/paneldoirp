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
    
    // Создаем клиент с пользовательским токеном для проверки прав
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Проверяем права доступа текущего пользователя
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
    
    if (roleError || !userRole || !['administrator', 'moderator'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Недостаточно прав для создания пользователя' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password = '123456', userId, fullName, role = 'employee', action = 'create' } = await req.json();

    // Проверка действия
    if (action === 'check_exists') {
      // Проверяем существование пользователя в auth
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        filter: email
      });
      
      const exists = existingUsers?.users?.some(u => u.email === email) || false;
      
      return new Response(
        JSON.stringify({
          success: true,
          exists,
          count: existingUsers?.users?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем входные данные для создания пользователя
    if (action === 'create' || !action) {
      if (!email || !email.includes('@')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Не указан корректный email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!password || password.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'Пароль должен содержать не менее 6 символов' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Создание пользователя в auth: ${email} (ID: ${userId || 'новый'})`);

      // Создаем пользователя в auth системе
      const createUserOptions: any = {
        email,
        password,
        email_confirm: true, // Автоматически подтверждаем email
        user_metadata: {
          full_name: fullName || email.split('@')[0],
          role: role || 'employee'
        }
      };

      // Если передан userId, то используем его для создания пользователя
      if (userId) {
        createUserOptions.user_id = userId;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser(createUserOptions);

      if (error) {
        console.error('Ошибка создания пользователя в auth:', error);
        
        // Проверяем, является ли ошибка ошибкой о существовании пользователя
        if (error.message.includes('already registered')) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Пользователь с таким email уже существует в auth системе',
              error: error.message
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Ошибка создания пользователя в auth системе',
            error: error.message
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Логируем успешное создание
      await supabaseAdmin
        .from('admin_logs')
        .insert({
          admin_id: user.id,
          action: 'create_auth_user_edge',
          resource_type: 'auth.users',
          resource_id: data.user.id,
          new_values: {
            email,
            full_name: fullName,
            role,
            created_at: new Date().toISOString()
          },
          success: true
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Пользователь успешно создан в auth системе',
          user: {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'employee',
            created_at: data.user.created_at
          },
          password
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Неизвестное действие' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Ошибка в функции create-auth-user:', error);
    
    // Логируем ошибку, если возможно
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseAdmin
        .from('admin_logs')
        .insert({
          action: 'create_auth_user_edge_error',
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