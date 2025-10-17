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
    console.log('🚀 QR Direct Auth Edge Function called')
    
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

    // Получаем токен из body
    const { token } = await req.json()
    
    if (!token) {
      console.error('❌ No token provided')
      throw new Error('Token is required')
    }

    console.log('🔍 Looking up QR token:', token.substring(0, 8) + '...')

    // Находим активный токен
    const { data: qrToken, error: tokenError } = await supabaseAdmin
      .from('user_qr_tokens')
      .select('user_id')
      .eq('token', token)
      .eq('is_active', true)
      .single()
    
    if (tokenError || !qrToken) {
      console.error('❌ Invalid or expired token:', tokenError)
      throw new Error('Invalid or expired QR token')
    }

    console.log('✅ Valid token found for user:', qrToken.user_id)

    // Получаем пользователя
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(qrToken.user_id)
    
    if (userError || !user) {
      console.error('❌ User not found:', userError)
      throw new Error('User not found')
    }

    console.log('✅ User found:', user.user.email)

    // Генерируем прямую ссылку авторизации
    const baseAppUrl = Deno.env.get('PUBLIC_APP_URL') || 'http://51.250.94.103'
    
    // Создаем сессию напрямую через admin API
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.user.email!,
      options: {
        redirectTo: `${baseAppUrl}/auth/callback`
      }
    })

    if (sessionError || !sessionData) {
      console.error('❌ Error generating session:', sessionError)
      throw new Error(`Failed to generate session: ${sessionError?.message}`)
    }

    console.log('✅ Session generated successfully')

    // Возвращаем magic link для авторизации
    const response = {
      success: true,
      redirectUrl: sessionData.properties.action_link,
      user: {
        id: user.user.id,
        email: user.user.email,
        full_name: user.user.user_metadata?.full_name
      }
    };
    
    console.log('📤 Returning response with redirect URL');
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Error in qr-direct-auth:', error)
    
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

