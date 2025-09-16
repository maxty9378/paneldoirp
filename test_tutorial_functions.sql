-- Тестирование функций подсказок

-- Проверяем, была ли показана подсказка (должно вернуть false для нового пользователя)
SELECT has_tutorial_step_been_shown('evaluation_modal_tour');

-- Отмечаем подсказку как показанную
SELECT mark_tutorial_step_as_shown('evaluation_modal_tour');

-- Проверяем снова (должно вернуть true)
SELECT has_tutorial_step_been_shown('evaluation_modal_tour');

-- Смотрим все записи в таблице
SELECT * FROM tutorial_steps ORDER BY created_at DESC;
