/*
  # Add INSERT policy for event_participants table

  1. Security
    - Add INSERT policy for `event_participants` table
    - Allow trainers, experts, moderators, and administrators to add participants to events
    - Ensure only users with appropriate roles can create event participants

  This fixes the RLS policy violation error when creating events with participants.
*/

-- Add INSERT policy for event_participants table
CREATE POLICY "Users can add event participants"
  ON event_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY[
          'trainer'::user_role_enum,
          'expert'::user_role_enum,
          'moderator'::user_role_enum,
          'administrator'::user_role_enum
        ])
    )
  );