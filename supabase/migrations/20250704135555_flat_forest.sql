/*
  # Fix feedback stats function type mismatch

  1. Changes
    - Update get_event_feedback_stats function return type to match actual returned types
    - Change response_count from integer to bigint to match COUNT() function return type

  2. Details
    - The COUNT() function returns bigint, but function definition expected integer
    - This fixes the "structure of query does not match function result type" error
*/

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_event_feedback_stats(uuid);

-- Recreate function with correct return types
CREATE OR REPLACE FUNCTION get_event_feedback_stats(p_event_id uuid)
RETURNS TABLE (
  question_id uuid,
  question text,
  question_type text,
  average_rating numeric,
  response_count bigint,
  responses jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH question_stats AS (
    SELECT 
      fq.id as question_id,
      fq.question,
      fq.question_type,
      CASE 
        WHEN fq.question_type = 'rating' THEN
          AVG(fa.rating_value::numeric)
        ELSE NULL
      END as average_rating,
      COUNT(fa.id) as response_count
    FROM feedback_questions fq
    LEFT JOIN feedback_templates ft ON fq.template_id = ft.id
    LEFT JOIN feedback_submissions fs ON fs.template_id = ft.id 
      AND fs.event_id = p_event_id
    LEFT JOIN feedback_answers fa ON fa.submission_id = fs.id 
      AND fa.question_id = fq.id
    WHERE ft.event_type_id IN (
      SELECT e.event_type_id 
      FROM events e 
      WHERE e.id = p_event_id
    )
    GROUP BY fq.id, fq.question, fq.question_type, fq.order_num
    ORDER BY fq.order_num
  ),
  question_responses AS (
    SELECT 
      fq.id as question_id,
      jsonb_agg(
        jsonb_build_object(
          'value', COALESCE(fa.rating_value, 0),
          'user_id', fs.user_id,
          'submission_id', fs.id,
          'submitted_at', fs.submitted_at
        )
        ORDER BY fs.submitted_at
      ) FILTER (WHERE fa.id IS NOT NULL) as responses
    FROM feedback_questions fq
    LEFT JOIN feedback_templates ft ON fq.template_id = ft.id
    LEFT JOIN feedback_submissions fs ON fs.template_id = ft.id 
      AND fs.event_id = p_event_id
    LEFT JOIN feedback_answers fa ON fa.submission_id = fs.id 
      AND fa.question_id = fq.id
    WHERE ft.event_type_id IN (
      SELECT e.event_type_id 
      FROM events e 
      WHERE e.id = p_event_id
    )
    GROUP BY fq.id
  )
  SELECT 
    qs.question_id,
    qs.question,
    qs.question_type,
    qs.average_rating,
    qs.response_count,
    COALESCE(qr.responses, '[]'::jsonb) as responses
  FROM question_stats qs
  LEFT JOIN question_responses qr ON qs.question_id = qr.question_id;
END;
$$;