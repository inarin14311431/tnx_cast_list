begin;

create table if not exists public.private_outfit_master (
  id text primary key,
  payload jsonb not null default '{"version":1,"records":[]}'::jsonb,
  record_count integer not null default 0 check (record_count >= 0),
  source_spreadsheet_id text not null default '',
  source_gid text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint private_outfit_master_singleton check (id = 'current')
);

alter table public.private_outfit_master enable row level security;

-- The browser must never read or write the JSON master directly.
revoke all on table public.private_outfit_master from anon, authenticated;
grant select, insert, update, delete on table public.private_outfit_master to service_role;

insert into public.private_outfit_master (id)
values ('current')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
commit;
