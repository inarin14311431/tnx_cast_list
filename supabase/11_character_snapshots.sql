begin;

create table if not exists public.character_snapshots (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '',
  snapshot_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists character_snapshots_character_created_idx
  on public.character_snapshots(character_id, created_at desc);

alter table public.character_snapshots enable row level security;

drop policy if exists character_snapshots_select_own on public.character_snapshots;
create policy character_snapshots_select_own on public.character_snapshots
  for select using (owner_id = auth.uid());

drop policy if exists character_snapshots_insert_own on public.character_snapshots;
create policy character_snapshots_insert_own on public.character_snapshots
  for insert with check (owner_id = auth.uid());

drop policy if exists character_snapshots_delete_own on public.character_snapshots;
create policy character_snapshots_delete_own on public.character_snapshots
  for delete using (owner_id = auth.uid());

create or replace function public.create_character_snapshot(
  p_character_id uuid,
  p_label text default ''
)
returns public.character_snapshots
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_character public.characters%rowtype;
  v_snapshot public.character_snapshots%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select * into v_character
  from public.characters
  where id = p_character_id and owner_id = v_user_id;

  if not found then
    raise exception 'The character does not exist or is not owned by the current user.' using errcode = '42501';
  end if;

  insert into public.character_snapshots(character_id, owner_id, label, snapshot_data)
  values (
    v_character.id,
    v_user_id,
    left(btrim(coalesce(p_label, '')), 120),
    jsonb_build_object(
      'character', to_jsonb(v_character),
      'skills', coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order) from public.character_skills s where s.character_id = v_character.id), '[]'::jsonb),
      'outfits', coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order) from public.character_outfits o where o.character_id = v_character.id), '[]'::jsonb)
    )
  ) returning * into v_snapshot;

  delete from public.character_snapshots s
  where s.character_id = v_character.id
    and s.owner_id = v_user_id
    and s.id in (
      select id from public.character_snapshots
      where character_id = v_character.id and owner_id = v_user_id
      order by created_at desc, id desc
      offset 10
    );

  return v_snapshot;
end;
$$;

grant execute on function public.create_character_snapshot(uuid, text) to authenticated;

create or replace function public.restore_character_snapshot(p_snapshot_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot public.character_snapshots%rowtype;
  v_character jsonb;
  v_skills jsonb;
  v_outfits jsonb;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select * into v_snapshot
  from public.character_snapshots
  where id = p_snapshot_id and owner_id = v_user_id;

  if not found then
    raise exception 'Snapshot not found.' using errcode = '42501';
  end if;

  v_character := v_snapshot.snapshot_data->'character';
  v_skills := coalesce(v_snapshot.snapshot_data->'skills', '[]'::jsonb);
  v_outfits := coalesce(v_snapshot.snapshot_data->'outfits', '[]'::jsonb);

  -- Reuse the existing transactional save contract. Identity/ownership values in
  -- the stored character object are ignored by save_character_bundle.
  select public.save_character_bundle(v_snapshot.character_id, v_character, v_skills, v_outfits)
    into v_result;

  return v_result;
end;
$$;

grant execute on function public.restore_character_snapshot(uuid) to authenticated;

commit;
