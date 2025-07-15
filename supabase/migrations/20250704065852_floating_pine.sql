-- Function to auto-assign tests for attended participants
CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS TRIGGER AS $$
DECLARE
    entry_test_id UUID;
    final_test_id UUID;
    event_type_id UUID;
    is_online_training BOOLEAN;
    is_training_event BOOLEAN;
BEGIN
    -- Get event type from the event
    SELECT e.event_type_id, 
           et.name = 'online_training', 
           e.title ILIKE '%Технология эффективных продаж%'
    INTO event_type_id, is_online_training, is_training_event
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    WHERE e.id = NEW.event_id;
    
    -- If not online training or not the specific training we're looking for, exit
    IF NOT (is_online_training AND is_training_event) THEN
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
    IF NEW.attended THEN
        -- Entry test
        IF entry_test_id IS NOT NULL THEN
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
                
                -- Log assignment
                INSERT INTO admin_logs (
                    action,
                    resource_type,
                    resource_id,
                    new_values,
                    success
                ) VALUES (
                    'auto_assign_entry_test',
                    'user_test_attempts',
                    NEW.user_id,
                    jsonb_build_object(
                        'user_id', NEW.user_id,
                        'test_id', entry_test_id,
                        'event_id', NEW.event_id
                    ),
                    TRUE
                );
            END IF;
        END IF;
        
        -- Final test
        IF final_test_id IS NOT NULL THEN
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
                
                -- Log assignment
                INSERT INTO admin_logs (
                    action,
                    resource_type,
                    resource_id,
                    new_values,
                    success
                ) VALUES (
                    'auto_assign_final_test',
                    'user_test_attempts',
                    NEW.user_id,
                    jsonb_build_object(
                        'user_id', NEW.user_id,
                        'test_id', final_test_id,
                        'event_id', NEW.event_id
                    ),
                    TRUE
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS trigger_auto_assign_tests ON event_participants;
CREATE TRIGGER trigger_auto_assign_tests
AFTER INSERT OR UPDATE OF attended ON event_participants
FOR EACH ROW
WHEN (NEW.attended = true)
EXECUTE FUNCTION auto_assign_tests_to_participant();

-- Update policy to ensure regular users can view tests they have attempts for
DROP POLICY IF EXISTS "Users can view their tests" ON tests;
CREATE POLICY "Users can view their tests" 
ON tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_test_attempts
    WHERE user_test_attempts.user_id = auth.uid()
    AND user_test_attempts.test_id = tests.id
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Ensure users can update their own test attempts
DROP POLICY IF EXISTS "Users can complete their tests" ON user_test_attempts;
CREATE POLICY "Users can complete their tests"
ON user_test_attempts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);