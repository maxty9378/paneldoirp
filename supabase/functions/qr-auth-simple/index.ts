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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { token } = await req.json()
    
    if (!token) {
      throw new Error('Token is required')
    }

    // Находим токен в базе
    const { data: qrToken, error: tokenError } = await supabaseAdmin
      .from('user_qr_tokens')
      .select('user_id')
      .eq('token', token)
      .eq('is_active', true)
      .single()
    
    if (tokenError || !qrToken) {
      throw new Error('Invalid or expired QR token')
    }

    // Получаем email пользователя
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(qrToken.user_id)
    
    if (userError || !user) {
      throw new Error('User not found')
    }

    // Генерируем временный пароль на основе токена
    const tempPassword = `qr_${token.substring(0, 16)}`
    
    // Устанавливаем временный пароль пользователю
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      qrToken.user_id,
      { password: tempPassword }
    )
    
    if (passwordError) {
      throw new Error('Failed to set temporary password')
    }

    // Возвращаем данные для входа
    return new Response(JSON.stringify({
      success: true,
      email: user.user.email,
      password: tempPassword
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
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

