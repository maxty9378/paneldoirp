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

    // НОВЫЙ ПОДХОД: Генерируем magic link, но возвращаем URL напрямую
    console.log('🔑 Generating magic link for user...')
    
    const baseAppUrl = Deno.env.get('PUBLIC_APP_URL') || 'http://51.250.94.103'
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: `${baseAppUrl}/auth/callback`
      }
    })

    if (linkError) {
      console.error('❌ Error generating magic link:', linkError)
      throw new Error(`Failed to generate magic link: ${linkError.message}`)
    }

    if (!linkData?.properties?.action_link) {
      console.error('❌ No magic link generated:', linkData)
      throw new Error('Failed to generate magic link')
    }

    console.log('✅ Magic link generated successfully')
    console.log('🔗 Magic link length:', linkData.properties.action_link.length)

    // Возвращаем magic link для авторизации
    // Frontend перейдет по ссылке и получит токены через callback
    const response = {
      success: true,
      redirectUrl: linkData.properties.action_link,
      user: user,
      needsActivation: true // Требуется переход по magic link
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
