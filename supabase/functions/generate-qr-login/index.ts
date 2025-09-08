import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin privileges
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['administrator', 'moderator'].includes(userProfile.role)) {
      throw new Error('Insufficient permissions')
    }

    // Parse request body
    const { email, redirectTo } = await req.json()
    
    if (!email) {
      throw new Error('Email is required')
    }

    console.log('Generating magic link for:', email)

    // Determine redirect URL based on the request origin
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer') || '';
    const isLocalhost = requestOrigin.includes('localhost') || redirectTo?.includes('localhost');
    
    const finalRedirectUrl = isLocalhost 
      ? 'http://localhost:5174/auth/callback'
      : 'https://paneldoirp.vercel.app/auth/callback';

    console.log('Request origin:', requestOrigin);
    console.log('Is localhost:', isLocalhost);
    console.log('Using redirect URL:', finalRedirectUrl);

    // Generate magic link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { 
        emailRedirectTo: finalRedirectUrl
      }
    })

    if (error) {
      throw error
    }

    const actionLink = data?.properties?.action_link
    if (!actionLink) {
      console.error('No action_link in response:', data)
      throw new Error('No action_link returned')
    }

    console.log('Generated magic link for:', email)
    console.log('Action link:', actionLink)

    return new Response(
      JSON.stringify({ 
        actionLink,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error generating QR login:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

