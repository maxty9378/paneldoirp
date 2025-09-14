-- RLS политики для таблицы events

-- Включаем RLS
alter table public.events enable row level security;

-- Политика для создания событий (только для привилегированных пользователей)
drop policy if exists "Events create by privileged" on public.events;
create policy "Events create by privileged"
  on public.events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('trainer','moderator','administrator')
    )
  );

-- Политика для чтения событий
drop policy if exists "Events read" on public.events;
create policy "Events read"
  on public.events for select
  to authenticated
  using (true);

-- Политика для обновления событий
drop policy if exists "Events update" on public.events;
create policy "Events update"
  on public.events for update
  to authenticated
  using (true)
  with check (true);

-- Политика для удаления событий
drop policy if exists "Events delete" on public.events;
create policy "Events delete"
  on public.events for delete
  to authenticated
  using (true);

-- Обновляем кэш PostgREST
notify pgrst, 'reload schema';
