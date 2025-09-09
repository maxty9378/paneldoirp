import { createClient } from '@supabase/supabase-js';

// Настройки Supabase (замените на ваши)
const supabaseUrl = 'https://oaockmesooydvausfoca.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTrainer() {
  console.log('🔍 Поиск тренера Кадочкин Максим...\n');

  try {
    // 1. Поиск по имени
    const { data: trainers, error: trainerError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        phone,
        branch_id,
        role,
        subdivision,
        branch_subrole,
        status
      `)
      .or('full_name.ilike.%Кадочкин%,full_name.ilike.%Максим%Кадочкин%,email.ilike.%кадочкин%')
      .eq('role', 'trainer');

    if (trainerError) {
      console.error('❌ Ошибка поиска тренеров:', trainerError);
      return;
    }

    console.log('👥 Найденные тренеры:');
    console.log(JSON.stringify(trainers, null, 2));

    // 2. Если нашли тренера, получим его филиал
    if (trainers && trainers.length > 0) {
      for (const trainer of trainers) {
        if (trainer.branch_id) {
          const { data: branch, error: branchError } = await supabase
            .from('branches')
            .select('id, name, code, address')
            .eq('id', trainer.branch_id)
            .single();

          if (branchError) {
            console.error(`❌ Ошибка загрузки филиала для ${trainer.full_name}:`, branchError);
          } else {
            console.log(`\n🏢 Филиал тренера ${trainer.full_name}:`);
            console.log(JSON.stringify(branch, null, 2));
          }
        } else {
          console.log(`\n⚠️ У тренера ${trainer.full_name} не указан филиал базирования`);
        }
      }
    } else {
      console.log('❌ Тренер Кадочкин Максим не найден');
      
      // 3. Покажем всех тренеров
      const { data: allTrainers, error: allTrainersError } = await supabase
        .from('users')
        .select('id, full_name, email, branch_id')
        .eq('role', 'trainer')
        .order('full_name');

      if (allTrainersError) {
        console.error('❌ Ошибка загрузки всех тренеров:', allTrainersError);
      } else {
        console.log('\n👥 Все тренеры в системе:');
        allTrainers.forEach(t => {
          console.log(`- ${t.full_name} (${t.email}) - филиал: ${t.branch_id || 'не указан'}`);
        });
      }
    }

    // 4. Покажем все филиалы
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name, code, address')
      .order('name');

    if (branchesError) {
      console.error('❌ Ошибка загрузки филиалов:', branchesError);
    } else {
      console.log('\n🏢 Все филиалы в системе:');
      branches.forEach(b => {
        console.log(`- ${b.name} (${b.code || 'без кода'}) - ID: ${b.id}`);
      });
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

findTrainer();
