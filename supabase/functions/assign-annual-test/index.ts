import { createClient } from "npm:@supabase/supabase-js@2.39.0";

// Функция для назначения годового теста участникам
// спустя 3 месяца после прохождения мероприятия
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Создаем клиент Supabase с сервисной ролью для административных операций
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Находим все мероприятия типа "online_training",
    // которые завершились 3 месяца назад
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        title,
        start_date,
        event_type_id,
        event_type:event_type_id(name)
      `)
      .eq('event_type.name', 'online_training')
      .lt('start_date', threeMonthsAgo.toISOString())
      .order('start_date');

    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Нет мероприятий для назначения годовых тестов' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Для каждого мероприятия находим участников, которые еще не прошли годовой тест
    let assignedTests = 0;
    let skippedTests = 0;

    for (const event of events) {
      // Находим годовой тест для этого типа мероприятия
      const { data: tests, error: testsError } = await supabaseAdmin
        .from('tests')
        .select('id, title')
        .eq('event_type_id', event.event_type_id)
        .eq('type', 'annual')
        .eq('status', 'active');

      if (testsError) throw testsError;

      if (!tests || tests.length === 0) {
        console.log(`Нет активного годового теста для мероприятия ${event.id}`);
        continue;
      }

      const annualTest = tests[0];

      // Находим участников, которые присутствовали на мероприятии
      const { data: participants, error: participantsError } = await supabaseAdmin
        .from('event_participants')
        .select(`
          id,
          user_id,
          attended,
          user:user_id(
            id,
            full_name,
            email
          )
        `)
        .eq('event_id', event.id)
        .eq('attended', true);

      if (participantsError) throw participantsError;

      if (!participants || participants.length === 0) {
        console.log(`Нет участников для мероприятия ${event.id}`);
        continue;
      }

      // Для каждого участника проверяем, назначен ли уже годовой тест
      for (const participant of participants) {
        // Проверяем, назначен ли уже годовой тест этому участнику
        const { count, error: attemptError } = await supabaseAdmin
          .from('user_test_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', participant.user_id)
          .eq('test_id', annualTest.id)
          .eq('event_id', event.id);

        if (attemptError) throw attemptError;

        if (count && count > 0) {
          console.log(`Годовой тест уже назначен участнику ${participant.user_id}`);
          skippedTests++;
          continue;
        }

        // Назначаем годовой тест
        const { data: attempt, error: insertError } = await supabaseAdmin
          .from('user_test_attempts')
          .insert({
            user_id: participant.user_id,
            test_id: annualTest.id,
            event_id: event.id,
            start_time: new Date().toISOString(),
            status: 'in_progress'
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Создаем уведомление для пользователя
        await supabaseAdmin
          .from('notification_tasks')
          .insert({
            user_id: participant.user_id,
            title: `Пройдите годовой тест по "${event.title}"`,
            description: `Вам необходимо пройти годовой тест по мероприятию "${event.title}". Прошло 3 месяца с момента вашего обучения, пора закрепить знания!`,
            type: 'test_assigned',
            priority: 'high',
            status: 'pending',
            metadata: {
              test_id: annualTest.id,
              test_title: annualTest.title,
              event_id: event.id,
              event_title: event.title,
              attempt_id: attempt.id,
              assignment_date: new Date().toISOString()
            }
          });

        assignedTests++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        assigned: assignedTests,
        skipped: skippedTests,
        message: `Назначено ${assignedTests} годовых тестов. Пропущено: ${skippedTests}.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});