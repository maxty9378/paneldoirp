import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

interface UpdateUserRequest {
  userId: string;
  updates: {
    full_name?: string;
    email?: string;
    sap_number?: string;
    role?: string;
    position_id?: string | null;
    territory_id?: string | null;
    phone?: string | null;
    is_active?: boolean;
    department?: string;
    is_leaving?: boolean;
    notes?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase with service role key for admin operations
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user has admin privileges
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin or moderator role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['administrator', 'moderator'].includes(userProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, updates }: UpdateUserRequest = await req.json();

    if (!userId || !updates) {
      return new Response(
        JSON.stringify({ error: 'userId and updates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the current user data for logging
    const { data: oldUserData, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (getUserError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update email in Auth if it changed
    if (updates.email && updates.email !== oldUserData.email) {
      try {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { email: updates.email, email_confirm: false }
        );
        
        if (updateAuthError) {
          console.error('Error updating auth email:', updateAuthError);
        }
      } catch (error) {
        console.warn('Error updating auth email:', error);
        // Continue anyway as the user might only exist in the users table
      }
    }

    // Update the user in the database
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log admin action
    await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'update_user',
        resource_type: 'users',
        resource_id: userId,
        old_values: oldUserData,
        new_values: updates
      });

    return new Response(
      JSON.stringify({ user: updatedUser }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error updating user:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});