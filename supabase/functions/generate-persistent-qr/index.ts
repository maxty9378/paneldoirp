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

    const { email } = await req.json()
    
    if (!email) {
      throw new Error('Email is required')
    }

    // Нормализуем email к строчным буквам для поиска
    const normalizedEmail = email.toLowerCase()
    console.log('📧 Generating persistent QR for:', normalizedEmail)

    // Находим пользователя
    const { data: usersList, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    if (usersError) {
      console.error('❌ Error listing users:', usersError)
      throw new Error('Failed to list users')
    }

    const existingUser = usersList.users.find(user => user.email === normalizedEmail)
    if (!existingUser) {
      throw new Error(`User ${email} not found`)
    }

    console.log('✅ User found:', existingUser.id)

    // Проверяем существующий активный токен
    const { data: existingTokens, error: tokenError } = await supabaseAdmin
      .from('user_qr_tokens')
      .select('token')
      .eq('user_id', existingUser.id)
      .eq('is_active', true)

    if (tokenError) {
      console.error('❌ Error checking existing tokens:', tokenError)
      throw new Error('Failed to check existing tokens')
    }

    if (existingTokens && existingTokens.length > 0) {
      console.log('🔄 Returning existing token')
      const existingToken = existingTokens[0]
      const persistentUrl = `https://paneldoirp.vercel.app/auth/qr/${existingToken.token}`
      
      return new Response(
        JSON.stringify({ 
          persistentUrl,
          token: existingToken.token,
          message: 'Existing persistent QR token'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Генерируем новый уникальный токен
    const crypto = globalThis.crypto || (await import('node:crypto')).webcrypto
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

    console.log('🆕 Generated new token:', token.substring(0, 8) + '...')

    // Деактивируем старые токены
    await supabaseAdmin
      .from('user_qr_tokens')
      .update({ is_active: false })
      .eq('user_id', existingUser.id)

    // Сохраняем новый токен
    const { error: insertError } = await supabaseAdmin
      .from('user_qr_tokens')
      .insert({
        user_id: existingUser.id,
        token: token,
        is_active: true
      })

    if (insertError) {
      console.error('❌ Error saving token:', insertError)
      throw new Error('Failed to save QR token')
    }

    const persistentUrl = `https://paneldoirp.vercel.app/auth/qr/${token}`
    
    console.log('✅ Persistent QR URL generated:', persistentUrl)

    return new Response(
      JSON.stringify({ 
        persistentUrl,
        token,
        message: 'New persistent QR token generated'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error in generate-persistent-qr:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
