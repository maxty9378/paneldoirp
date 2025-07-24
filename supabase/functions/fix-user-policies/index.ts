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
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Try to update user policies by directly updating the database
    // First, let's check if we can read the current policies
    const { data: policies, error: policiesError } = await supabaseClient
      .from('users')
      .select('*')
      .limit(1)

    if (policiesError) {
      console.error('Error reading users table:', policiesError)
      return new Response(
        JSON.stringify({ error: policiesError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try to update a user's avatar_url directly to test permissions
    const testUserId = '345f0a3d-4da1-4ac1-8f2d-dd4d7ae9e4e4'
    const { data: updateData, error: updateError } = await supabaseClient
      .from('users')
      .update({ avatar_url: 'test-url' })
      .eq('id', testUserId)
      .select('avatar_url')

    if (updateError) {
      console.error('Error updating user:', updateError)
      return new Response(
        JSON.stringify({ 
          error: updateError.message,
          hint: 'This confirms that RLS policies are blocking the update'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User update test successful',
        data: updateData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 