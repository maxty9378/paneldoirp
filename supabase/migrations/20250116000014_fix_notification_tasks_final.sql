-- Финальное исправление таблицы notification_tasks

-- 1) Таблица notification_tasks (если вдруг нет)
create table if not exists public.notification_tasks (
  id uuid primary key default gen_random_uuid(),
  assigned_to uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  type text not null,          -- фронт шлёт это поле
  priority integer not null default 0,  -- фронт шлёт это поле; число — безопаснее всего
  status text not null default 'pending',
  event_id uuid references public.events(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Если таблица уже была — дотащим недостающие колонки
alter table public.notification_tasks
  add column if not exists assigned_to uuid references public.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists type text,            -- ключевая колонка из ошибки
  add column if not exists priority integer default 0,
  add column if not exists status text default 'pending',
  add column if not exists event_id uuid references public.events(id) on delete cascade,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- 3) Конвертируем priority из text в integer, если нужно
DO $$
BEGIN
    -- Проверяем тип колонки priority
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_tasks' 
        AND column_name = 'priority' 
        AND data_type = 'text'
    ) THEN
        -- Конвертируем text в integer
        ALTER TABLE public.notification_tasks 
        ALTER COLUMN priority TYPE integer USING priority::integer;
        
        RAISE NOTICE 'Колонка priority конвертирована из text в integer';
    END IF;
END $$;

-- 4) Индексы
create index if not exists idx_nt_assigned_to on public.notification_tasks(assigned_to);
create index if not exists idx_nt_event on public.notification_tasks(event_id);
create index if not exists idx_nt_status on public.notification_tasks(status);

-- 5) updated_at-триггер (переисполняемый)
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tg_notification_tasks_touch on public.notification_tasks;
create trigger tg_notification_tasks_touch
before update on public.notification_tasks
for each row execute function public.tg_touch_updated_at();

-- 6) RLS: читают назначенные и привилегированные; создавать могут тренер/модер/админ
alter table public.notification_tasks enable row level security;

drop policy if exists "notification_tasks: read own/admin/mod" on public.notification_tasks;
create policy "notification_tasks: read own/admin/mod" on public.notification_tasks
for select to authenticated
using (
  assigned_to = auth.uid()
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('administrator','moderator'))
);

drop policy if exists "notification_tasks: insert by privileged" on public.notification_tasks;
create policy "notification_tasks: insert by privileged" on public.notification_tasks
for insert to authenticated
with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('trainer','moderator','administrator'))
);

drop policy if exists "notification_tasks: update own/admin/mod" on public.notification_tasks;
create policy "notification_tasks: update own/admin/mod" on public.notification_tasks
for update to authenticated
using (
  assigned_to = auth.uid()
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('administrator','moderator'))
)
with check (
  assigned_to = auth.uid()
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('administrator','moderator'))
);

-- 7) Обновить кэш схемы PostgREST (важно!)
notify pgrst, 'reload schema';
