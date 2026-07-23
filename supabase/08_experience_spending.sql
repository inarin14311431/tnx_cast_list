begin;

create table if not exists public.character_experience_spending (
  id bigint generated always as identity primary key,
  character_id uuid not null references public.characters(id) on delete cascade,
  amount integer not null check (amount between 1 and 9999),
  description text not null default '',
  spent_on date not null default current_date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists character_experience_spending_character_idx
  on public.character_experience_spending(character_id);
create index if not exists character_experience_spending_spent_on_idx
  on public.character_experience_spending(spent_on desc, id desc);

create or replace function public.touch_experience_spending_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists character_experience_spending_touch_updated_at
  on public.character_experience_spending;
create trigger character_experience_spending_touch_updated_at
before update on public.character_experience_spending
for each row execute function public.touch_experience_spending_updated_at();

alter table public.character_experience_spending enable row level security;

drop policy if exists experience_spending_select_owner
  on public.character_experience_spending;
create policy experience_spending_select_owner
on public.character_experience_spending
for select
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = character_experience_spending.character_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists experience_spending_insert_owner
  on public.character_experience_spending;
create policy experience_spending_insert_owner
on public.character_experience_spending
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.characters c
    where c.id = character_experience_spending.character_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists experience_spending_update_owner
  on public.character_experience_spending;
create policy experience_spending_update_owner
on public.character_experience_spending
for update
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = character_experience_spending.character_id
      and c.owner_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.characters c
    where c.id = character_experience_spending.character_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists experience_spending_delete_owner
  on public.character_experience_spending;
create policy experience_spending_delete_owner
on public.character_experience_spending
for delete
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = character_experience_spending.character_id
      and c.owner_id = auth.uid()
  )
);

revoke all on table public.character_experience_spending from anon, authenticated;
grant select, insert, update, delete on table public.character_experience_spending to authenticated;
grant usage, select on sequence public.character_experience_spending_id_seq to authenticated;

notify pgrst, 'reload schema';
commit;
