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

create or replace function public.record_act_publication(
  p_slug text,
  p_act_name text,
  p_ruler_name text,
  p_public_url text,
  p_published_by uuid,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_act_id uuid;
begin
  if coalesce(array_length(p_participant_ids, 1), 0) < 1
     or coalesce(array_length(p_participant_ids, 1), 0) > 6 then
    raise exception 'Participant count must be between 1 and 6.';
  end if;

  insert into public.acts (
    slug, act_name, ruler_name, public_url, published_by, published_at
  ) values (
    p_slug, p_act_name, coalesce(p_ruler_name, ''), p_public_url,
    p_published_by, now()
  )
  on conflict (slug) do update set
    act_name = excluded.act_name,
    ruler_name = excluded.ruler_name,
    public_url = excluded.public_url,
    published_by = excluded.published_by,
    published_at = excluded.published_at
  returning id into v_act_id;

  delete from public.act_participants
  where act_id = v_act_id
    and not (character_id = any(p_participant_ids));

  insert into public.act_participants (
    act_id,
    character_id,
    character_public_id,
    character_name,
    player_name,
    cast_order
  )
  select
    v_act_id,
    c.id,
    c.public_id,
    c.character_name,
    coalesce(c.player_name, ''),
    p.ordinality::smallint
  from unnest(p_participant_ids) with ordinality as p(character_id, ordinality)
  join public.characters c on c.id = p.character_id
  where c.visibility = 'public'
  on conflict (act_id, character_id) do update set
    character_public_id = excluded.character_public_id,
    character_name = excluded.character_name,
    player_name = excluded.player_name,
    cast_order = excluded.cast_order;

  if (
    select count(*)
    from public.act_participants
    where act_id = v_act_id
      and character_id = any(p_participant_ids)
  ) <> array_length(p_participant_ids, 1) then
    raise exception 'One or more participant characters are not public or do not exist.';
  end if;

  return v_act_id;
end;
$$;

revoke all on function public.record_act_publication(text, text, text, text, uuid, uuid[]) from public;
grant execute on function public.record_act_publication(text, text, text, text, uuid, uuid[]) to service_role;

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
