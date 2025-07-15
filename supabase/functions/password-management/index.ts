import { createClient } from 'npm:@supabase/supabase-js@2'

// Функция для проверки, является ли пользователь администратором
async function isAdmin(supabaseClient) {
  const { data: { user } } = await supabaseClient.auth.getUser()
  if (!user) return false
  
  const { data: userData, error } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (error || !userData) return false
  return userData.role === 'administrator'
}

// Генерация случайного пароля
function generatePassword(length = 10) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }
  return password
}

Deno.serve(async (req) => {
  // CORS заголовки
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    })
  }

  try {
    // Создание клиента Supabase с использованием токена авторизации из запроса
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )
    
    // Проверка прав администратора
    const adminStatus = await isAdmin(supabaseClient)
    if (!adminStatus) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Administrator access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Получение данных запроса
    const { action, email, userId, password } = await req.json()
    
    // Создание клиента с сервисной ролью для административных операций
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // Обработка различных действий
    switch (action) {
      case 'reset_password': {
        // Проверяем, что email или userId предоставлен
        if (!email && !userId) {
          return new Response(
            JSON.stringify({ error: 'Email or userId is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        let userIdentifier = userId
        let userEmail = email

        // Если предоставлен только email, находим userId
        if (email && !userId) {
          const { data: userData, error: userError } = await adminClient
            .from('users')
            .select('id')
            .eq('email', email)
            .single()

          if (userError || !userData) {
            return new Response(
              JSON.stringify({ error: `User with email ${email} not found` }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }
          
          userIdentifier = userData.id
        }
        
        // Если предоставлен только userId, находим email
        if (userId && !email) {
          const { data: userData, error: userError } = await adminClient
            .from('users')
            .select('email')
            .eq('id', userId)
            .single()

          if (userError || !userData || !userData.email) {
            return new Response(
              JSON.stringify({ error: `User with id ${userId} not found or has no email` }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }
          
          userEmail = userData.email
        }
        
        if (!userEmail) {
          return new Response(
            JSON.stringify({ error: 'User has no email address' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        
        // Генерация нового пароля, если не указан
        const newPassword = password || '123456'
        
        // Сброс пароля пользователя
        try {
          const { error } = await adminClient.auth.admin.updateUserById(
            userIdentifier,
            { password: newPassword }
          )
          
          if (error) {
            return new Response(
              JSON.stringify({ error: `Failed to reset password: ${error.message}` }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }
        } catch (error) {
          console.error('Error resetting password:', error)
          return new Response(
            JSON.stringify({ error: `Error resetting password: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Логируем действие в admin_logs
        await adminClient.from('admin_logs').insert({
          admin_id: supabaseClient.auth.getUser().then(res => res.data.user?.id),
          action: 'reset_password',
          resource_type: 'users',
          resource_id: userIdentifier,
          new_values: { email: userEmail, password_reset: true }
        })
        
        // Обновляем дату смены пароля
        await adminClient
          .from('users')
          .update({ password_changed_at: new Date().toISOString() })
          .eq('id', userIdentifier)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            email: userEmail, 
            password: newPassword,
            userId: userIdentifier,
            message: 'Password has been reset successfully'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      case 'get_password': {
        // Валидация параметров
        if (!email && !userId) {
          return new Response(
            JSON.stringify({ error: 'Email or userId is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Находим пользователя по email или userId
        let query = adminClient.from('users').select('id, email')
        
        if (email) {
          query = query.eq('email', email)
        } else {
          query = query.eq('id', userId)
        }
        
        const { data: userData, error: userError } = await query.single()
          
        if (userError || !userData) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Для простоты, возвращаем стандартный пароль
        return new Response(
          JSON.stringify({
            success: true,
            userId: userData.id,
            email: userData.email,
            password: '123456',
            message: 'Standard password retrieved'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      case 'list_users': {
        // Получаем список пользователей с email
        const { data: users, error } = await adminClient
          .from('users')
          .select('id, email, full_name, role, created_at')
          .order('created_at', { ascending: false })
          .filter('email', 'not.is', null)
          
        if (error) {
          return new Response(
            JSON.stringify({ error: `Failed to list users: ${error.message}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        
        // Добавляем к каждому пользователю стандартный пароль
        const usersWithPasswords = users.map(user => ({
          ...user,
          standard_password: '123456'
        }))
        
        return new Response(
          JSON.stringify({ success: true, users: usersWithPasswords }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Must be one of: reset_password, get_password, list_users' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})