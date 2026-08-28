begin;

-- Restrict authenticated act-history reads to records that belong to the
-- current user's characters. Public showcase pages continue to use the
-- get_public_act_showcase() SECURITY DEFINER RPC and do not depend on these
-- direct table SELECT policies.

drop policy if exists act_participants_select_authenticated on public.act_participants;
drop policy if exists act_participants_select_owner on public.act_participants;
create policy act_participants_select_owner
on public.act_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.characters c
    where c.id = act_participants.character_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists acts_select_authenticated on public.acts;
drop policy if exists acts_select_owner_scope on public.acts;
create policy acts_select_owner_scope
on public.acts
for select
to authenticated
using (
  published_by = auth.uid()
  or exists (
    select 1
    from public.act_participants ap
    join public.characters c on c.id = ap.character_id
    where ap.act_id = acts.id
      and c.owner_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
commit;
