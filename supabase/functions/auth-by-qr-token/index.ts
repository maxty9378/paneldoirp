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

    // Находим активный токен - используем прямой SQL запрос для обхода RLS
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

    // Генерируем magic link - перенаправляем напрямую на /auth/callback
    const finalRedirectUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://paneldoirp.vercel.app'
    const callbackUrl = `${finalRedirectUrl}/auth/callback`
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: callbackUrl
      }
    })

    if (error) {
      console.error('❌ Error generating magic link:', error)
      throw new Error(`Failed to generate magic link: ${error.message}`)
    }

    console.log('✅ Magic link generated for:', user.email)
    console.log('🔗 Action link:', data.properties?.action_link?.substring(0, 50) + '...')

    // Возвращаем magic link в JSON
    const response = {
      success: true,
      redirectUrl: data.properties?.action_link || callbackUrl,
      needsActivation: true
    };
    
    console.log('📤 Returning response:', JSON.stringify(response, null, 2));
    
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
