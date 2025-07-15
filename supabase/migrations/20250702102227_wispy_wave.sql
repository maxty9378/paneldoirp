/*
# Add default password setting

1. New Settings
  - Add default_password system setting for new user accounts

2. Description
  This migration adds a system setting for the default password used when creating new user accounts.
*/

-- Add default password setting if it doesn't exist
INSERT INTO system_settings (key, value, description, category) 
SELECT 'default_password', '"123456"'::jsonb, 'Стандартный пароль для новых пользователей', 'security'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'default_password');

-- Add some helpful comments to document the password behavior
COMMENT ON TABLE users IS 'User accounts with the default password of 123456';

-- Create or replace a function to help retrieve the default password
CREATE OR REPLACE FUNCTION get_default_password()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT value::text FROM system_settings WHERE key = 'default_password'),
    '"123456"'
  )::json::text;
$$;