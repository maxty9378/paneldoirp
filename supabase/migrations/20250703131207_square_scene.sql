/*
  # Add SAP Number Check Constraint
  
  1. Changes
    - Adds a check constraint to ensure sap_number is either NULL or not an empty string
    - This prevents issues with the unique constraint on empty strings
  
  2. Security
    - No security changes
*/

-- Add check constraint to ensure sap_number is either NULL or not empty string
ALTER TABLE users ADD CONSTRAINT users_sap_number_not_empty
  CHECK (sap_number IS NULL OR trim(sap_number) <> '');