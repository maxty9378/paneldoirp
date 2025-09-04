// Скрипт для применения миграции current_question_index
// Запустите этот скрипт в браузере на странице вашего приложения

async function applyMigration() {
  try {
    // Получаем Supabase клиент (предполагаем, что он доступен глобально)
    const { createClient } = window.supabase;
    
    if (!createClient) {
      console.error('Supabase не найден. Убедитесь, что вы на странице приложения.');
      return;
    }

    // Создаем клиент (замените URL и ключ на ваши)
    const supabase = createClient(
      'YOUR_SUPABASE_URL', // Замените на ваш URL
      'YOUR_SUPABASE_ANON_KEY' // Замените на ваш ключ
    );

    console.log('Проверяем существование поля current_question_index...');

    // Проверяем, существует ли поле
    const { data: columns, error: checkError } = await supabase
      .rpc('check_column_exists', {
        table_name: 'user_test_attempts',
        column_name: 'current_question_index'
      });

    if (checkError) {
      console.log('Функция проверки не существует, пробуем другой способ...');
      
      // Альтернативный способ - пытаемся обновить поле
      const { error: updateError } = await supabase
        .from('user_test_attempts')
        .update({ current_question_index: 0 })
        .limit(1);

      if (updateError && updateError.message.includes('column "current_question_index" does not exist')) {
        console.log('Поле не существует, нужно добавить его вручную в Supabase Dashboard');
        console.log('Выполните следующий SQL в Supabase SQL Editor:');
        console.log(`
ALTER TABLE user_test_attempts 
ADD COLUMN current_question_index INTEGER DEFAULT 0;

COMMENT ON COLUMN user_test_attempts.current_question_index IS 'Индекс текущего вопроса (0-based)';

UPDATE user_test_attempts 
SET current_question_index = 0 
WHERE current_question_index IS NULL;
        `);
        return;
      } else if (updateError) {
        console.error('Ошибка при проверке поля:', updateError);
        return;
      }
    }

    console.log('Поле current_question_index уже существует!');
    
    // Обновляем существующие записи
    const { error: updateError } = await supabase
      .from('user_test_attempts')
      .update({ current_question_index: 0 })
      .is('current_question_index', null);

    if (updateError) {
      console.error('Ошибка при обновлении записей:', updateError);
    } else {
      console.log('Миграция успешно применена!');
    }

  } catch (error) {
    console.error('Ошибка при применении миграции:', error);
  }
}

// Запускаем миграцию
applyMigration();
