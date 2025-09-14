-- Быстрое исправление отсутствующей колонки location в таблице events

-- Добавляем колонку, если её нет
alter table public.events
  add column if not exists location text;

-- На всякий — пригодится, если фронт тоже шлёт ссылку на встречу
alter table public.events
  add column if not exists meeting_link text;

-- Обновляем кэш PostgREST (чтоб колонка появилась сразу)
notify pgrst, 'reload schema';

-- Проверяем результат
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='events'
order by column_name;
