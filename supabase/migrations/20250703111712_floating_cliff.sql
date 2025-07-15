/*
  # Fix admin_logs foreign key constraint for user deletion

  1. Changes
    - Make admin_id column nullable in admin_logs table
    - Drop existing foreign key constraint admin_logs_admin_id_fkey
    - Add new foreign key constraint with ON DELETE SET NULL

  2. Security
    - No changes to RLS policies
    - Preserves existing data integrity while allowing user deletion
*/

-- First, make the admin_id column nullable
ALTER TABLE admin_logs ALTER COLUMN admin_id DROP NOT NULL;

-- Drop the existing foreign key constraint
ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey;

-- Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE admin_logs 
ADD CONSTRAINT admin_logs_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;