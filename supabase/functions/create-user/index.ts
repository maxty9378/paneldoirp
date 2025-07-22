import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Минимальный endpoint для создания пользователя: только ФИО и email
  if (new URL(req.url).pathname === '/simple-create' && req.method === 'POST') {
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      const body = await req.json();
      const full_name = body.full_name ?? '';
      const email = body.email ?? '';
      if (!full_name || !email) {
        return new Response(JSON.stringify({ success: false, error: 'full_name and email required' }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400
        });
      }
      const { data, error } = await supabaseClient.auth.admin.createUser({
        email,
        password: '123456',
        email_confirm: true,
        user_metadata: { full_name }
      });
      if (error) {
        return new Response(JSON.stringify({ success: false, error }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400
        });
      }
      return new Response(JSON.stringify({ success: true, user: data.user }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 201
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: String(e) }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      });
    }
  }

  // MCP TEST ENDPOINT: /test-mcp-create
  if (new URL(req.url).pathname === '/test-mcp-create' && req.method === 'POST') {
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      const random = Math.floor(Math.random()*1000000);
      const email = `cascade-mcp-test-${random}@example.com`;
      const password = 'CascadeTest123!';
      const full_name = 'Cascade MCP Test User';
      // 1. Создаём пользователя в Auth
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: 'authenticated'
        }
      });
      if (authError) {
        return new Response(JSON.stringify({ success: false, error: authError }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 500
        });
      }
      const userId = authData.user.id;
      // 2. Создаём профиль в public.users
      const { data: userData, error: userError } = await supabaseClient.from('users').insert({
        id: userId,
        full_name,
        role: 'authenticated', // Проверяем, что триггер/валидация защитит
        branch: 'rnd_branch',
        avatar_url: 'https://example.com/avatar.png',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).select().single();
      if (userError) {
        // Чистим auth если не удалось создать профиль
        await supabaseClient.auth.admin.deleteUser(userId);
        return new Response(JSON.stringify({ success: false, error: userError }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 500
        });
      }
      return new Response(JSON.stringify({ success: true, auth_user: authData.user, public_user: userData }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 201
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: String(e) }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      });
    }
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, full_name, role, sap_number } = await req.json()

    console.log('Creating user:', { email, full_name, role })

    // Validate required fields
    if (!email || !password || !full_name) {
      throw new Error('Email, password, and full_name are required')
    }

    // Validate inputs
    if (!full_name || full_name.trim() === '') {
      throw new Error('Full name is required');
    }

    // Must have either email or SAP number
    if ((!email || email.trim() === '') && (!sap_number || sap_number.trim() === '')) {
      throw new Error('Either email or SAP number is required');
    }

    let userId;
    
    // Create user in Auth if email is provided
    if (email && email.trim() !== '') {
      // Check if user with this email already exists in auth
      const { data: existingAuthUsers } = await supabaseClient.auth.admin.listUsers({
        filters: {
          email: email
        }
      });

      const existingAuthUser = existingAuthUsers?.users?.length > 0 
        ? existingAuthUsers.users[0] 
        : null;

      if (existingAuthUser) {
        console.log('User with this email already exists in auth:', existingAuthUser.id);
        userId = existingAuthUser.id;
      } else {
        // Create user in Auth
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email,
          password: password || '123456',
          email_confirm: true,
          user_metadata: {
            full_name,
            role: role || 'employee'
          }
        });

        if (authError) {
          console.error('Auth creation error:', authError);
          throw authError;
        }

        console.log('Auth user created:', authData.user?.id);
        userId = authData.user.id;
      }
    } else {
      // If no email provided, generate a UUID for the user
      userId = crypto.randomUUID();
      console.log('Generated UUID for user without email:', userId);
    }

    // Check if user already exists in public.users
    let existingUser = null;
    if (email) {
      const { data: existingUserData } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      existingUser = existingUserData;
    } else if (sap_number) {
      const { data: existingUserData } = await supabaseClient
        .from('users')
        .select('*')
        .eq('sap_number', sap_number)
        .maybeSingle();
      
      existingUser = existingUserData;
    }

    if (existingUser) {
      console.log('User already exists in database:', existingUser);
      throw new Error('User with this email or SAP number already exists');
    }

    // Create user profile in public.users table
    // Валидация роли
    const VALID_ROLES = [
      'employee',
      'supervisor',
      'trainer',
      'expert',
      'moderator',
      'administrator'
    ];
    const safeRole = VALID_ROLES.includes(role) ? role : 'employee';
    const userData = {
      id: userId,
      email: email || null,
      sap_number: sap_number || null,
      full_name,
      role: safeRole,
      position_id,
      territory_id,
      subdivision: subdivision || 'management_company',
      branch_subrole: branch_subrole || null,
      branch_id: branch_id || null,
      status: 'active',
      work_experience_days: 0,
      is_active: true,
      department: department || 'management_company'
    };


    const { data: profileData, error: profileError } = await supabaseClient
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // If profile creation fails and we created an auth user, try to delete it
      if (email && userId && !existingAuthUser) {
        try {
          await supabaseClient.auth.admin.deleteUser(userId);
          console.log('Deleted auth user after profile creation failed');
        } catch (deleteError) {
          console.error('Failed to delete auth user after profile creation error:', deleteError);
        }
      }
      
      throw profileError;
    }

    console.log('User profile created:', profileData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: profileData,
        message: 'User created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      },
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to create user'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})