/*
  # Fix SAP Number Constraints

  1. Changes
     - Update existing empty SAP numbers to NULL
     - Add CHECK constraint to prevent empty strings in sap_number field

  2. Why
     - Ensures data consistency
     - Prevents unique constraint violations with empty strings
     - Aligns database constraints with application logic
*/

-- First update all rows that have empty sap_number to NULL
UPDATE users SET sap_number = NULL WHERE sap_number = '';
UPDATE users SET sap_number = NULL WHERE sap_number IS NOT NULL AND trim(sap_number) = '';

-- Then add the check constraint to ensure sap_number is either NULL or not empty
ALTER TABLE users ADD CONSTRAINT users_sap_number_not_empty
  CHECK (sap_number IS NULL OR trim(sap_number) <> '');