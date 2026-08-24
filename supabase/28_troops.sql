-- User-owned troop management with optional cast linkage and public sharing.
create table if not exists public.troops (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('TRP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  owner_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid null references public.characters(id) on delete set null,
  name text not null default '',
  visibility text not null default 'private' check (visibility in ('public','private')),
  level integer not null default 0 check (level >= 0),
  member_max integer not null default 1 check (member_max >= 0),
  member_current integer not null default 1 check (member_current >= 0),
  style_1 text not null default '',
  style_2 text not null default '',
  style_3 text not null default '',
  reason_value integer not null default 0,
  reason_control integer not null default 0,
  passion_value integer not null default 0,
  passion_control integer not null default 0,
  life_value integer not null default 0,
  life_control integer not null default 0,
  mundane_value integer not null default 0,
  mundane_control integer not null default 0,
  skills jsonb not null default '[]'::jsonb,
  outfits jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint troop_member_current_not_above_max check (member_current <= member_max),
  constraint troop_skills_array check (jsonb_typeof(skills) = 'array'),
  constraint troop_outfits_array check (jsonb_typeof(outfits) = 'array')
);

create index if not exists troops_owner_id_idx on public.troops(owner_id);
create index if not exists troops_character_id_idx on public.troops(character_id);
create index if not exists troops_visibility_idx on public.troops(visibility);

create or replace function public.validate_troop_owner_link()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.character_id is not null and not exists (
    select 1 from public.characters c
    where c.id = new.character_id and c.owner_id = new.owner_id
  ) then
    raise exception 'linked character must be owned by troop owner';
  end if;
  if new.member_current > new.member_max then
    new.member_current := new.member_max;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists troops_validate_owner_link on public.troops;
create trigger troops_validate_owner_link
before insert or update on public.troops
for each row execute function public.validate_troop_owner_link();

alter table public.troops enable row level security;

drop policy if exists troops_select_visible on public.troops;
create policy troops_select_visible on public.troops
for select using (visibility = 'public' or owner_id = auth.uid());

drop policy if exists troops_insert_own on public.troops;
create policy troops_insert_own on public.troops
for insert with check (owner_id = auth.uid());

drop policy if exists troops_update_own on public.troops;
create policy troops_update_own on public.troops
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists troops_delete_own on public.troops;
create policy troops_delete_own on public.troops
for delete using (owner_id = auth.uid());

grant select, insert, update, delete on public.troops to authenticated;
grant select on public.troops to anon;
