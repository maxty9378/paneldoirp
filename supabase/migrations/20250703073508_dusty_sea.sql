/*
  # Fix user creation trigger for auth integration

  1. Database Functions
    - Create or replace `handle_new_user` function to properly handle auth user creation
    - Ensure all required NOT NULL fields are populated with appropriate defaults
    
  2. Triggers
    - Set up trigger on auth.users to call handle_new_user function
    - Ensure trigger has proper security context

  3. Security
    - Function runs with security definer to bypass RLS during user creation
    - Ensures new users can be created even with strict RLS policies
*/

-- Create or replace the function that handles new user creation from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    subdivision,
    status,
    is_active,
    work_experience_days,
    department,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Новый пользователь'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role_enum, 'employee'::user_role_enum),
    'management_company'::subdivision_enum,
    'active'::user_status_enum,
    true,
    0,
    'management_company',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;

-- Ensure the trigger function has access to auth schema
GRANT USAGE ON SCHEMA auth TO postgres;