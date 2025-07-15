/*
  # Create auth trigger function

  1. New Trigger Function
    - `after_user_created_in_users` trigger function to automatically create auth users
    - When a user is created in the users table, a corresponding auth user will be created

  2. Security
    - Uses service role permissions to create auth users
    - Logs all auth user creations
*/

-- Function to create auth user after user created in users table
CREATE OR REPLACE FUNCTION after_user_created_in_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password text := '123456';
  v_claims jsonb;
BEGIN
  -- Only proceed if email is provided
  IF NEW.email IS NOT NULL THEN
    -- Create claims for the new user
    v_claims := jsonb_build_object(
      'role', COALESCE(NEW.role, 'employee'),
      'full_name', NEW.full_name
    );
    
    -- Create user in auth.users if they don't already exist
    IF NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = NEW.email
    ) THEN
      -- Create the user in auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        (SELECT instance_id FROM auth.instances LIMIT 1),  -- Get the instance ID
        NEW.id,                                           -- Use the same ID
        'authenticated',
        'authenticated',
        NEW.email,
        crypt(v_password, gen_salt('bf')),                -- Default password
        NOW(),                                           -- Email pre-confirmed
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
          'full_name', NEW.full_name,
          'role', NEW.role
        ),
        NOW(),
        NOW()
      );
      
      -- Add user to default authenticated role
      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        NEW.email,
        NEW.id,
        jsonb_build_object('sub', NEW.id, 'email', NEW.email),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
      
      -- Log the auth user creation
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        new_values
      ) VALUES (
        auth.uid(),
        'create_auth_user',
        'auth.users',
        NEW.id,
        jsonb_build_object(
          'email', NEW.email,
          'password', v_password
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to create auth users
DROP TRIGGER IF EXISTS after_user_created ON users;
CREATE TRIGGER after_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION after_user_created_in_users();