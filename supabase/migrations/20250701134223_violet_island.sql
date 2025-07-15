/*
  # Fix admin user

  1. Changes
     - Ensures the admin user exists in the database
     - Sets the correct role for the admin user
*/

-- Check if admin user exists in auth but not in users table
DO $$
DECLARE
    admin_auth_id uuid;
    admin_exists boolean;
BEGIN
    -- Try to get admin user from auth.users
    SELECT id INTO admin_auth_id 
    FROM auth.users 
    WHERE email = 'doirp@sns.ru' 
    LIMIT 1;
    
    IF admin_auth_id IS NOT NULL THEN
        -- Check if user exists in users table
        SELECT EXISTS(
            SELECT 1 FROM users WHERE id = admin_auth_id
        ) INTO admin_exists;
        
        -- If admin doesn't exist in users table, create it
        IF NOT admin_exists THEN
            INSERT INTO users (
                id, 
                email, 
                full_name, 
                role, 
                subdivision, 
                status, 
                work_experience_days
            ) VALUES (
                admin_auth_id,
                'doirp@sns.ru',
                'Администратор портала',
                'administrator',
                'management_company',
                'active',
                0
            );
        ELSE
            -- If admin exists, ensure role is set to administrator
            UPDATE users 
            SET role = 'administrator' 
            WHERE id = admin_auth_id AND role != 'administrator';
        END IF;
    END IF;
END $$;