/*
  # Fix test visibility for users and autoassign tests

  1. Improvements
    - Add trigger to automatically create attempts for users when they are added to online training events
    - Ensure RLS policies allow users to view their own test attempts
  
  2. Security
    - Update RLS policies to allow proper access to test data
*/

-- Function to automatically create test attempts when user is added to an event
CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS TRIGGER AS $$
DECLARE
    entry_test_id UUID;
    final_test_id UUID;
    event_type_id UUID;
    is_online_training BOOLEAN;
BEGIN
    -- Get event type from the event
    SELECT e.event_type_id, et.name = 'online_training' 
    INTO event_type_id, is_online_training
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    WHERE e.id = NEW.event_id;
    
    -- If not online training, exit
    IF NOT is_online_training THEN
        RETURN NEW;
    END IF;
    
    -- Find entry and final tests for this event type
    SELECT id INTO entry_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'entry'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO final_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'final'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Create test attempts for the user if they attended
    IF NEW.attended AND entry_test_id IS NOT NULL THEN
        -- Check if attempt already exists
        IF NOT EXISTS (
            SELECT 1 FROM user_test_attempts
            WHERE user_id = NEW.user_id
            AND test_id = entry_test_id
            AND event_id = NEW.event_id
        ) THEN
            -- Create entry test attempt
            INSERT INTO user_test_attempts (
                user_id, test_id, event_id, status, start_time
            ) VALUES (
                NEW.user_id, entry_test_id, NEW.event_id, 'in_progress', CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
    
    IF NEW.attended AND final_test_id IS NOT NULL THEN
        -- Check if attempt already exists
        IF NOT EXISTS (
            SELECT 1 FROM user_test_attempts
            WHERE user_id = NEW.user_id
            AND test_id = final_test_id
            AND event_id = NEW.event_id
        ) THEN
            -- Create final test attempt
            INSERT INTO user_test_attempts (
                user_id, test_id, event_id, status, start_time
            ) VALUES (
                NEW.user_id, final_test_id, NEW.event_id, 'in_progress', CURRENT_TIMESTAMP
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign tests when user is added to event
DROP TRIGGER IF EXISTS trigger_auto_assign_tests ON event_participants;
CREATE TRIGGER trigger_auto_assign_tests
AFTER INSERT OR UPDATE OF attended ON event_participants
FOR EACH ROW
WHEN (NEW.attended = true)
EXECUTE FUNCTION auto_assign_tests_to_participant();

-- Improve RLS policies for test attempts to ensure users can see their own tests
DROP POLICY IF EXISTS "Users can view their own test attempts" ON user_test_attempts;
CREATE POLICY "Users can view their own test attempts"
ON user_test_attempts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Allow users to update their own test attempts
DROP POLICY IF EXISTS "Users can update their own test attempts" ON user_test_attempts;
CREATE POLICY "Users can update their own test attempts"
ON user_test_attempts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Ensure users can see tests relevant to their events
DROP POLICY IF EXISTS "Users can view their relevant tests" ON tests;
CREATE POLICY "Users can view their relevant tests" 
ON tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN event_participants ep ON e.id = ep.event_id
    WHERE e.event_type_id = tests.event_type_id
    AND ep.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Log test assignments
CREATE OR REPLACE FUNCTION log_test_assignments()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_logs (
    action,
    resource_type,
    resource_id,
    new_values,
    success
  ) VALUES (
    'auto_assign_test',
    'user_test_attempts',
    NEW.id,
    jsonb_build_object(
      'user_id', NEW.user_id,
      'test_id', NEW.test_id,
      'event_id', NEW.event_id,
      'status', NEW.status
    ),
    TRUE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging test assignments
DROP TRIGGER IF EXISTS trigger_log_test_assignments ON user_test_attempts;
CREATE TRIGGER trigger_log_test_assignments
AFTER INSERT ON user_test_attempts
FOR EACH ROW
EXECUTE FUNCTION log_test_assignments();