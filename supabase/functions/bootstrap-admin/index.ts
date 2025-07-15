import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting bootstrap admin creation process");
    
    // Create admin Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
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

    // First check if user already exists in auth table
    // Check if user exists in both auth and public tables
    const { data: existingAuthUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    const authUser = existingAuthUsers?.users.find(u => u.email === email);
    let authUserId = authUser?.id;
    
    console.log("Auth user check result:", authUserId ? `Found: ${authUserId}` : "Not found");
    
    // Check if user exists in public.users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();
      
    console.log("Public user check result:", existingUser ? `Found: ${existingUser.id}` : "Not found");
    
    // If user exists in auth but not in public, create in public
    if (authUserId && !existingUser) {
      console.log("Creating user in public.users with auth ID:", authUserId);
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUserId,
          email,
          full_name: fullName,
          role: role,
          subdivision: 'management_company',
          status: 'active',
          is_active: true,
          work_experience_days: 0,
          department: 'management_company'
        })
        .select()
        .single();
      
      if (error) {
        console.error("Failed to create user in public.users:", error);
        throw error;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Администратор создан в базе данных",
          email,
          password,
          user: data
        }),
        { headers: corsHeaders }
      );
    }
    
    // If user exists in public but not in auth, create in auth
    if (!authUserId && existingUser) {
      console.log("Creating user in auth.users with public ID:", existingUser.id);
      
      try {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: role
          },
          user_id: existingUser.id
        });
        
        if (error) {
          console.error("Failed to create auth user:", error);
          throw error;
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Администратор создан в auth системе",
            email,
            password,
            user: { ...existingUser, id: data.user.id }
          }),
          { headers: corsHeaders }
        );
      } catch (error) {
        console.error("Error creating auth user:", error);
        // Try updating the public.users record to use a new UUID instead
        try {
          // Create a regular auth user without specifying the ID
          const { data: newAuthUser, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              role: role
            }
          });
          
          if (newAuthError) {
            console.error("Failed to create new auth user:", newAuthError);
            throw newAuthError;
          }
          
          // Update the public.users record with the new ID
          const { data: updatedUser, error: updateError } = await supabaseAdmin
            .from('users')
            .update({ id: newAuthUser.user.id })
            .eq('id', existingUser.id)
            .select()
            .single();
            
          if (updateError) {
            console.error("Failed to update public user ID:", updateError);
            throw updateError;
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              message: "Администратор синхронизирован с новым ID",
              email,
              password,
              user: updatedUser
            }),
            { headers: corsHeaders }
          );
        } catch (syncError) {
          console.error("Failed to synchronize user IDs:", syncError);
          throw syncError;
        }
      }
    }
    
    // If user exists in both places, ensure IDs match
    if (authUserId && existingUser && authUserId !== existingUser.id) {
      console.log("User exists in both tables, but IDs don't match. Fixing...");
      
      // Update the public users record to use the auth ID
      try {
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ id: authUserId })
          .eq('id', existingUser.id)
          .select()
          .single();
          
        if (updateError) {
          console.error("Failed to update user ID:", updateError);
          throw updateError;
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "ID администратора синхронизирован",
            email,
            password,
            user: updatedUser
          }),
          { headers: corsHeaders }
        );
      } catch (error) {
        console.error("Failed to synchronize IDs:", error);
        throw error;
      }
    }
    
    // If user already exists in both places with matching IDs
    if (authUserId && existingUser && authUserId === existingUser.id) {
      console.log("User already exists in both tables with matching IDs");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Администратор уже существует в системе",
          email,
          password,
          user: { 
            id: authUserId, 
            email, 
            full_name: fullName, 
            role: existingUser.role 
          }
        }),
        { headers: corsHeaders }
      );
    }
    
    // If user doesn't exist in either place, create from scratch
    if (!authUserId && !existingUser) {
      console.log("Creating admin user from scratch");
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          full_name: fullName,
          role: role
        }
      });
      
      if (authError) {
        console.error("Error creating auth user:", authError);
        throw authError;
      }
      
      console.log("Admin created in auth with ID:", authData.user.id);
      
      // Create user in public.users
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: role,
          subdivision: 'management_company',
          status: 'active',
          is_active: true,
          work_experience_days: 0,
          department: 'management_company'
        })
        .select()
        .single();
      
      if (userError) {
        console.error("Error creating user in database:", userError);
        throw userError;
      }
      
      console.log("Admin created successfully in both tables");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Администратор успешно создан",
          email,
          password,
          user: userData
        }),
        { headers: corsHeaders }
      );
    }
    
    // Fallback to calling the SQL function directly
    console.log("Using SQL function fallback");
    
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('rpc_bootstrap_admin');
      
      if (rpcError) {
        console.error("RPC function error:", rpcError);
        throw rpcError;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: rpcResult.message || "Администратор создан через SQL функцию",
          email,
          password,
          user: { 
            id: rpcResult.id,
            email, 
            role: "administrator" 
          }
        }),
        { headers: corsHeaders }
      );
    } catch (rpcError) {
      console.error("RPC function error:", rpcError);
      throw rpcError;
    }
  } catch (error) {
    console.error("Function error:", error);
    
    // Last resort - try another approach by calling rpc function
    try {
      console.log("Attempting direct DB function call as last resort");
      const { data: lastResult, error: lastError } = await supabaseAdmin.rpc('rpc_bootstrap_admin');
      
      if (!lastError && lastResult) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Администратор создан через запасной метод",
            email,
            password,
            fallback: true
          }),
          { headers: corsHeaders }
        );
      }
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
        message: "Failed to create administrator"
      }),
      {
        headers: corsHeaders,
        status: 500
      }
    );
  }
});