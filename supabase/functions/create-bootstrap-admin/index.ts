import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Admin key
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

    const email = "doirp@sns.ru";
    const password = "123456";
    const fullName = "Администратор портала";
    const role = "administrator";

    // Try to create the user via auth API first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName,
        role: role
      }
    });

    console.log("Auth creation result:", authError ? "Error" : "Success");

    // If there's an auth error about duplicate user, that's okay - the user exists in auth
    let userExists = false;
    if (authError) {
      if (authError.message.includes("already registered")) {
        userExists = true;
        console.log("User already exists in auth");
      } else if (!authError.message.includes("already registered")) {
        console.error("Auth error:", authError);
        // Continue anyway, we'll try the DB method
      }
    }

    // Check if user exists in public.users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing user:", checkError);
    }

    // If user doesn't exist in the public users table, create it
    if (!existingUser) {
      console.log("Creating user in public.users table");
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData?.user?.id || (userExists ? null : undefined),
          email,
          full_name: fullName,
          role,
          subdivision: 'management_company',
          status: 'active',
          is_active: true,
          work_experience_days: 0,
          department: 'management_company'
        })
        .select()
        .single();

      if (userError) {
        console.error("Error creating user in DB:", userError);
        throw userError;
      }

      console.log("User created in DB:", userData.id);
    } else {
      console.log("User already exists in DB:", existingUser.id);
    }

    // Ensure the user in auth and users table have the same ID
    if (userExists && existingUser) {
      // Try to repair any synchronization issues
      try {
        await supabaseAdmin.rpc('rpc_sync_all_users_to_auth');
        console.log("User synchronization attempted");
      } catch (syncError) {
        console.error("Error syncing users:", syncError);
      }
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Администратор создан или восстановлен успешно",
        email,
        password
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500 
      }
    );
  }
});