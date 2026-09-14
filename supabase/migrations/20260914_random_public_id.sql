-- Switch newly generated cast public IDs from predictable sequential values to 128-bit random values.
-- Existing public_id values are intentionally left unchanged so all existing cast URLs remain valid.

create or replace function internal_security.generate_character_public_id()
returns text
language sql
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select 'TNX-' || upper(encode(extensions.gen_random_bytes(16), 'hex'));
$$;

revoke all on function internal_security.generate_character_public_id() from public, anon;
grant execute on function internal_security.generate_character_public_id() to authenticated, service_role;

alter table public.characters
  alter column public_id set default internal_security.generate_character_public_id();
