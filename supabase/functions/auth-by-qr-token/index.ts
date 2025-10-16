import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 auth-by-qr-token Edge Function called')
    console.log('📋 Request method:', req.method)
    console.log('📋 Request URL:', req.url)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables')
      throw new Error('Missing Supabase configuration')
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Получаем токен из body (POST) или URL path (GET)
    let token: string;
    
    if (req.method === 'POST') {
      const body = await req.json()
      token = body.token
    } else {
      // GET запрос - токен из URL path
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      token = pathParts[pathParts.length - 1] // последняя часть пути
    }
    
    if (!token || token === 'auth-by-qr-token') {
      console.error('❌ No token provided. URL:', req.url)
      throw new Error('Token is required')
    }

    console.log('🔍 Looking up QR token:', token.substring(0, 8) + '...')

    // Находим активный токен
    let qrToken: any = null;
    let tokenError: any = null;

    try {
      // Сначала пробуем RPC функцию
      const rpcResult = await supabaseAdmin
        .rpc('get_qr_token_user', { token_param: token })
      
      console.log('🔍 RPC result:', rpcResult)
      
      if (rpcResult.data && rpcResult.data.length > 0) {
        qrToken = { user_id: rpcResult.data[0].user_id }
      } else {
        tokenError = rpcResult.error
      }
    } catch (e) {
      console.log('🔄 RPC failed, trying direct query...')
      tokenError = e
    }

    // Если RPC не работает, попробуем прямой запрос
    if (!qrToken) {
      console.log('🔄 Trying direct query...')
      const directResult = await supabaseAdmin
        .from('user_qr_tokens')
        .select('user_id')
        .eq('token', token)
        .eq('is_active', true)
        .single()
      
      console.log('🔍 Direct query result:', directResult)
      
      if (directResult.data) {
        qrToken = directResult.data
      } else {
        tokenError = directResult.error
      }
    }

    if (!qrToken || !qrToken.user_id) {
      console.error('❌ Invalid or expired token:', tokenError)
      throw new Error('Invalid or expired QR token')
    }

    console.log('✅ Valid token found for user:', qrToken.user_id)

    // Получаем пользователя
    const { data: usersList, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    if (usersError) {
      console.error('❌ Error listing users:', usersError)
      throw new Error('Failed to list users')
    }

    const user = usersList.users.find(u => u.id === qrToken.user_id)
    if (!user) {
      throw new Error('User not found')
    }

    console.log('✅ User found:', user.email)

    // НОВЫЙ ПОДХОД: Создаём сессию напрямую вместо magic link
    // Это позволит нам вернуть токены в JSON ответе, а не через redirect
    console.log('🔑 Creating session for user...')
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
      user_id: user.id,
      // Можно указать срок действия сессии (по умолчанию используется из настроек Supabase)
      // session_not_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
    })

    if (sessionError) {
      console.error('❌ Error creating session:', sessionError)
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    if (!sessionData?.access_token || !sessionData?.refresh_token) {
      console.error('❌ No tokens in session data:', sessionData)
      throw new Error('Failed to generate session tokens')
    }

    console.log('✅ Session created successfully')
    console.log('🔑 Access token length:', sessionData.access_token.length)
    console.log('🔑 Refresh token length:', sessionData.refresh_token.length)

    const baseAppUrl = Deno.env.get('PUBLIC_APP_URL') || 'http://51.250.94.103'

    // Возвращаем токены напрямую в JSON
    // Frontend установит их в localStorage/sessionStorage
    const response = {
      success: true,
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      expires_in: sessionData.expires_in,
      expires_at: sessionData.expires_at,
      token_type: 'bearer',
      user: sessionData.user,
      // Также отправляем redirectUrl для обратной совместимости
      redirectUrl: `${baseAppUrl}/`,
      needsActivation: false // Токены уже готовы, активация не нужна
    };
    
    console.log('📤 Returning response with tokens');
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Error in auth-by-qr-token:', error)
    
    // Возвращаем ошибку в JSON
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Authentication failed'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
})
