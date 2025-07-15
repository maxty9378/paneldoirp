// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface reqPayload {
  eventId: string; // Предполагаем, что вы передаете eventId
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.info('server started');

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey"
      }
    });
  }

  const { eventId }: reqPayload = await req.json();

  // Получение статистики участников
  const { data: participants, error: participantsError } = await supabase
    .from('participants') // Замените на ваше имя таблицы
    .select('*')
    .eq('event_id', eventId);

  if (participantsError) {
    return new Response(JSON.stringify({ error: participantsError.message }), { status: 400 });
  }

  // Получение попыток тестов
  const { data: testAttempts, error: testAttemptsError } = await supabase
    .from('user_test_attempts') // Замените на ваше имя таблицы
    .select('*')
    .eq('event_id', eventId);

  if (testAttemptsError) {
    return new Response(JSON.stringify({ error: testAttemptsError.message }), { status: 400 });
  }

  // Получение обратной связи
  const { data: feedback, error: feedbackError } = await supabase
    .from('feedback') // Замените на ваше имя таблицы
    .select('*')
    .eq('event_id', eventId);

  if (feedbackError) {
    return new Response(JSON.stringify({ error: feedbackError.message }), { status: 400 });
  }

  // Формирование статистики
  const totalParticipants = participants.length;
  const attendedParticipants = participants.filter(p => p.attended).length;
  const attendanceRate = totalParticipants > 0 ? ((attendedParticipants / totalParticipants) * 100).toFixed(1) : '0';

  const entryScores = testAttempts
    .filter(a => a.test_type === 'entry' && typeof a.score === 'number')
    .map(a => a.score);
  const averageEntryScore = entryScores.length > 0
    ? (entryScores.reduce((sum, score) => sum + score, 0) / entryScores.length).toFixed(1)
    : '-';

  const finalScores = testAttempts
    .filter(a => a.test_type === 'final' && typeof a.score === 'number')
    .map(a => a.score);
  const averageFinalScore = finalScores.length > 0
    ? (finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length).toFixed(1)
    : '-';

  const feedbackScores = feedback.map(f => f.score);
  const averageFeedbackScore = feedbackScores.length > 0
    ? (feedbackScores.reduce((sum, score) => sum + score, 0) / feedbackScores.length).toFixed(1)
    : '-';
  const feedbackSubmissionRate = feedback.length > 0 ? ((feedback.length / totalParticipants) * 100).toFixed(1) : '0';

  const detailedStats = {
    attended_participants: attendedParticipants,
    total_participants: totalParticipants,
    attendance_rate: attendanceRate,
    entry_test_avg_score: averageEntryScore,
    final_test_avg_score: averageFinalScore,
    feedback_avg_score: averageFeedbackScore,
    feedback_submission_rate: feedbackSubmissionRate,
  };

  return new Response(
    JSON.stringify({ detailedStats }),
    { headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
      }
    }
  );
});