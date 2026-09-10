create table if not exists public.act_showcase_guests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  showcase_slug text not null,
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order < 50),
  handle text not null default '',
  name text not null,
  persona_style text not null default '',
  affiliation text not null default '',
  gender text not null default '',
  age text not null default '',
  tagline text not null default '',
  summary text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, showcase_slug, sort_order)
);

alter table public.act_showcase_guests enable row level security;

create policy "showcase_guest_owner_select" on public.act_showcase_guests
for select to authenticated using (owner_id = auth.uid());
create policy "showcase_guest_owner_insert" on public.act_showcase_guests
for insert to authenticated with check (owner_id = auth.uid());
create policy "showcase_guest_owner_update" on public.act_showcase_guests
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "showcase_guest_owner_delete" on public.act_showcase_guests
for delete to authenticated using (owner_id = auth.uid());

create or replace function public.replace_act_showcase_guests_for_current_user(p_slug text, p_guests jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if v_slug = '' or v_slug !~ '^[a-z0-9][a-z0-9-]{0,63}$' then raise exception 'invalid showcase slug'; end if;
  if p_guests is null or jsonb_typeof(p_guests) <> 'array' then p_guests := '[]'::jsonb; end if;
  if jsonb_array_length(p_guests) > 12 then raise exception 'too many guests'; end if;
  delete from public.act_showcase_guests where owner_id = v_uid and showcase_slug = v_slug;
  insert into public.act_showcase_guests(owner_id, showcase_slug, sort_order, handle, name, persona_style, affiliation, gender, age, tagline, summary, image_url)
  select v_uid, v_slug, ordinality - 1,
    left(trim(coalesce(item->>'handle','')),120), left(trim(coalesce(item->>'name','')),160),
    left(trim(coalesce(item->>'personaStyle','')),80), left(trim(coalesce(item->>'affiliation','')),160),
    left(trim(coalesce(item->>'gender','')),80), left(trim(coalesce(item->>'age','')),80),
    left(trim(coalesce(item->>'tagline','')),240), left(trim(coalesce(item->>'summary','')),4000),
    left(trim(coalesce(item->>'imageUrl','')),1000)
  from jsonb_array_elements(p_guests) with ordinality as x(item, ordinality)
  where trim(coalesce(item->>'name','')) <> '';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_public_act_showcase_guests(p_slug text)
returns table(sort_order integer, handle text, name text, persona_style text, affiliation text, gender text, age text, tagline text, summary text, image_url text)
language sql security definer stable set search_path = public as $$
  select g.sort_order,g.handle,g.name,g.persona_style,g.affiliation,g.gender,g.age,g.tagline,g.summary,g.image_url
  from public.act_showcase_guests g
  join public.acts a on a.slug = g.showcase_slug and a.published_by = g.owner_id
  where g.showcase_slug = lower(trim(coalesce(p_slug,''))) and coalesce(a.showcase_public,false) = true
  order by g.sort_order;
$$;

grant execute on function public.replace_act_showcase_guests_for_current_user(text,jsonb) to authenticated;
grant execute on function public.get_public_act_showcase_guests(text) to anon, authenticated;
revoke all on table public.act_showcase_guests from anon;
