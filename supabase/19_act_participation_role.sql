begin;

-- Store the handout/style slot used by each cast in an act.
alter table public.act_participants
  add column if not exists participation_role text not null default '';

alter table public.act_participants
  drop constraint if exists act_participants_participation_role_length_check;

alter table public.act_participants
  add constraint act_participants_participation_role_length_check
  check (char_length(participation_role) <= 80);

comment on column public.act_participants.participation_role is
  'Style or common handout slot used by this cast in the act.';

-- The existing owner-scoped UPDATE policy applies to this column as well.
-- Only the owner of the linked character can update the stored role.
grant update (participation_role) on table public.act_participants to authenticated;

notify pgrst, 'reload schema';
commit;
