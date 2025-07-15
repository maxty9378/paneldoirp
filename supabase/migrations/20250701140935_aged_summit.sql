/*
  # Setup RPC Functions

  1. User Management Functions
    - `set_user_leaving_status` - Update user's leaving status
    - `set_user_role` - Change a user's role
    - `assign_trainer_territories` - Assign territories to a trainer
  
  2. Event Management Functions
    - `duplicate_event` - Create a copy of an existing event
*/

-- Function to update a user's leaving status
CREATE OR REPLACE FUNCTION set_user_leaving_status(p_user_id UUID, p_is_leaving BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET is_leaving = p_is_leaving,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Log the change
  INSERT INTO user_activity_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    old_values,
    new_values
  )
  VALUES (
    auth.uid(), 
    'update_leaving_status', 
    'user', 
    p_user_id, 
    jsonb_build_object('is_leaving', NOT p_is_leaving),
    jsonb_build_object('is_leaving', p_is_leaving)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change a user's role
CREATE OR REPLACE FUNCTION set_user_role(p_user_id UUID, p_role TEXT)
RETURNS VOID AS $$
DECLARE
  v_current_role TEXT;
BEGIN
  -- Get current role
  SELECT role INTO v_current_role FROM users WHERE id = p_user_id;
  
  -- Update the role
  UPDATE users
  SET role = p_role,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Log the change
  INSERT INTO user_activity_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    old_values,
    new_values
  )
  VALUES (
    auth.uid(), 
    'change_role', 
    'user', 
    p_user_id, 
    jsonb_build_object('role', v_current_role),
    jsonb_build_object('role', p_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch to a temporary role for testing
CREATE OR REPLACE FUNCTION switch_role_for_testing(p_role TEXT)
RETURNS VOID AS $$
DECLARE
  v_current_role TEXT;
  v_role_switch_exists BOOLEAN;
BEGIN
  -- Get current role
  SELECT role INTO v_current_role FROM users WHERE id = auth.uid();
  
  -- Check if there's already a role switch record
  SELECT EXISTS (
    SELECT 1 FROM user_activity_logs
    WHERE user_id = auth.uid()
    AND action = 'switch_role_original'
  ) INTO v_role_switch_exists;
  
  -- If there's no existing switch record, create one to store original role
  IF NOT v_role_switch_exists THEN
    INSERT INTO user_activity_logs (
      user_id, 
      action, 
      resource_type, 
      resource_id, 
      new_values
    )
    VALUES (
      auth.uid(), 
      'switch_role_original', 
      'user', 
      auth.uid(), 
      jsonb_build_object('original_role', v_current_role)
    );
  END IF;
  
  -- Update the role
  UPDATE users
  SET role = p_role,
      updated_at = now()
  WHERE id = auth.uid();
  
  -- Log the change
  INSERT INTO user_activity_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    old_values,
    new_values
  )
  VALUES (
    auth.uid(), 
    'switch_role_temp', 
    'user', 
    auth.uid(), 
    jsonb_build_object('role', v_current_role),
    jsonb_build_object('role', p_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore original role
CREATE OR REPLACE FUNCTION restore_original_role()
RETURNS VOID AS $$
DECLARE
  v_original_role TEXT;
  v_current_role TEXT;
BEGIN
  -- Get original role from logs
  SELECT (new_values->>'original_role')::TEXT INTO v_original_role
  FROM user_activity_logs
  WHERE user_id = auth.uid()
  AND action = 'switch_role_original'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no original role found, exit
  IF v_original_role IS NULL THEN
    RAISE EXCEPTION 'No original role found for user';
  END IF;
  
  -- Get current role
  SELECT role INTO v_current_role FROM users WHERE id = auth.uid();
  
  -- Update the role
  UPDATE users
  SET role = v_original_role,
      updated_at = now()
  WHERE id = auth.uid();
  
  -- Log the change
  INSERT INTO user_activity_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    old_values,
    new_values
  )
  VALUES (
    auth.uid(), 
    'restore_original_role', 
    'user', 
    auth.uid(), 
    jsonb_build_object('role', v_current_role),
    jsonb_build_object('role', v_original_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign territories to a trainer
CREATE OR REPLACE FUNCTION assign_trainer_territories(p_trainer_id UUID, p_territory_ids UUID[])
RETURNS VOID AS $$
BEGIN
  -- Delete existing assignments
  DELETE FROM trainer_territories
  WHERE trainer_id = p_trainer_id;
  
  -- Insert new assignments
  IF array_length(p_territory_ids, 1) > 0 THEN
    INSERT INTO trainer_territories (trainer_id, territory_id)
    SELECT p_trainer_id, territory_id
    FROM unnest(p_territory_ids) AS territory_id;
  END IF;
  
  -- Log the change
  INSERT INTO user_activity_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    new_values
  )
  VALUES (
    auth.uid(), 
    'assign_territories', 
    'user', 
    p_trainer_id, 
    jsonb_build_object('territory_ids', p_territory_ids)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to duplicate an event
CREATE OR REPLACE FUNCTION duplicate_event(p_event_id UUID, p_new_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_event RECORD;
  v_new_event_id UUID;
  v_title TEXT;
BEGIN
  -- Get original event data
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  -- If event not found, raise exception
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Set new title
  IF p_new_title IS NULL THEN
    v_title := v_event.title || ' (копия)';
  ELSE
    v_title := p_new_title;
  END IF;
  
  -- Create duplicate event
  INSERT INTO events (
    title,
    description,
    event_type_id,
    creator_id,
    start_date,
    end_date,
    location,
    location_coordinates,
    meeting_link,
    points,
    status,
    max_participants,
    files
  )
  VALUES (
    v_title,
    v_event.description,
    v_event.event_type_id,
    auth.uid(), -- Current user becomes the creator
    v_event.start_date,
    v_event.end_date,
    v_event.location,
    v_event.location_coordinates,
    v_event.meeting_link,
    v_event.points,
    'draft', -- Always start as draft
    v_event.max_participants,
    v_event.files
  )
  RETURNING id INTO v_new_event_id;
  
  -- Log the action
  INSERT INTO user_activity_logs (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    old_values,
    new_values
  )
  VALUES (
    auth.uid(), 
    'duplicate_event', 
    'event', 
    v_new_event_id, 
    jsonb_build_object('original_event_id', p_event_id),
    jsonb_build_object('new_event_id', v_new_event_id)
  );
  
  RETURN v_new_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;