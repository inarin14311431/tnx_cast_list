begin;

create or replace function public.create_character_snapshot_from_bundle(
  p_character_id uuid,
  p_label text,
  p_snapshot_data jsonb
)
returns public.character_snapshots
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot public.character_snapshots%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.characters
    where id = p_character_id and owner_id = v_user_id
  ) then
    raise exception 'The character does not exist or is not owned by the current user.' using errcode = '42501';
  end if;

  if p_snapshot_data is null or jsonb_typeof(p_snapshot_data) <> 'object' then
    raise exception 'Snapshot data must be a JSON object.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_snapshot_data->'character') <> 'object'
     or coalesce(jsonb_typeof(p_snapshot_data->'skills'), 'array') <> 'array'
     or coalesce(jsonb_typeof(p_snapshot_data->'outfits'), 'array') <> 'array' then
    raise exception 'Snapshot data must contain character, skills and outfits.' using errcode = '22023';
  end if;

  insert into public.character_snapshots(character_id, owner_id, label, snapshot_data)
  values (
    p_character_id,
    v_user_id,
    left(btrim(coalesce(p_label, '')), 120),
    p_snapshot_data
  ) returning * into v_snapshot;

  delete from public.character_snapshots s
  where s.character_id = p_character_id
    and s.owner_id = v_user_id
    and s.id in (
      select id from public.character_snapshots
      where character_id = p_character_id and owner_id = v_user_id
      order by created_at desc, id desc
      offset 10
    );

  return v_snapshot;
end;
$$;

grant execute on function public.create_character_snapshot_from_bundle(uuid, text, jsonb) to authenticated;

commit;
