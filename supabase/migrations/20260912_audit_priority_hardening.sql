-- Low-risk audit hardening identified by the 2026-09-12 verification pass.
-- Keep authenticated behavior unchanged while reducing unnecessary anonymous surface
-- and adding indexes for foreign keys reported by the deployed database advisor.

revoke execute on function public.replace_act_showcase_guests_for_current_user(text, jsonb) from public, anon;
grant execute on function public.replace_act_showcase_guests_for_current_user(text, jsonb) to authenticated;

create index if not exists idx_acts_published_by
  on public.acts (published_by);

create index if not exists idx_character_experience_spending_created_by
  on public.character_experience_spending (created_by);

create index if not exists idx_character_snapshots_owner_id
  on public.character_snapshots (owner_id);

create index if not exists idx_private_outfit_master_updated_by
  on public.private_outfit_master (updated_by);
