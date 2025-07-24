-- Create event_files table for storing file metadata
-- Execute this script in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS event_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('presentation', 'workbook')),
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;

-- Event files policies
CREATE POLICY "Event creators can manage their event files"
  ON event_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_files.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = 'administrator'
        )
      )
    )
  );

CREATE POLICY "Users can read event files for events they have access to"
  ON event_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_files.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_participants
          WHERE event_id = event_files.event_id
          AND user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = ANY(ARRAY['administrator', 'moderator'])
        )
      )
    )
  );

-- Create index for better performance
CREATE INDEX idx_event_files_event_id ON event_files(event_id);
CREATE INDEX idx_event_files_file_type ON event_files(file_type); 