begin;

create extension if not exists pgcrypto;

create table if not exists public.acts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  act_name text not null,
  ruler_name text not null default '',
  public_url text not null default '',
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.act_participants (
  id bigint generated always as identity primary key,
  act_id uuid not null references public.acts(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  character_public_id text not null default '',
  character_name text not null default '',
  player_name text not null default '',
  cast_order smallint not null default 1 check (cast_order between 1 and 6),
  earned_experience integer not null default 0 check (earned_experience between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (act_id, character_id)
);

create index if not exists act_participants_character_id_idx
  on public.act_participants(character_id);
create index if not exists act_participants_player_name_idx
  on public.act_participants(player_name);
create index if not exists acts_published_at_idx
  on public.acts(published_at desc);

create or replace function public.touch_act_history_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists acts_touch_updated_at on public.acts;
create trigger acts_touch_updated_at
before update on public.acts
for each row execute function public.touch_act_history_updated_at();

drop trigger if exists act_participants_touch_updated_at on public.act_participants;
create trigger act_participants_touch_updated_at
before update on public.act_participants
for each row execute function public.touch_act_history_updated_at();

alter table public.acts enable row level security;
alter table public.act_participants enable row level security;

drop policy if exists acts_select_authenticated on public.acts;
create policy acts_select_authenticated
on public.acts
for select
to authenticated
using (true);

drop policy if exists act_participants_select_authenticated on public.act_participants;
create policy act_participants_select_authenticated
on public.act_participants
for select
to authenticated
using (true);

drop policy if exists act_participants_update_owner on public.act_participants;
create policy act_participants_update_owner
on public.act_participants
for update
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = act_participants.character_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.characters c
    where c.id = act_participants.character_id
      and c.owner_id = auth.uid()
  )
);

revoke all on table public.acts from anon, authenticated;
revoke all on table public.act_participants from anon, authenticated;
grant select on table public.acts to authenticated;
grant select on table public.act_participants to authenticated;
grant update (earned_experience) on table public.act_participants to authenticated;

notify pgrst, 'reload schema';
commit;
