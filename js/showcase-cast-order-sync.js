// Writes the generator's CAST No and 参加枠 into act history (act_participants.cast_order and participation_role), in one owner-scoped call
// made right after publishing or recording history.
// The publish/history RPCs number participants by array position, which skips manual casts, and they do not know the role (the "quote"
// select of each row). An item is { characterId, castOrder?, participationRole? }: each of the two values is sent when it is there, and the
// RPC leaves what is not sent as it is. An empty role is sent too (it clears the stored one); it is cut to 80 characters like the column.
export const MAX_PARTICIPATION_ROLE_LENGTH = 80;

export async function syncActCastOrders(supabase, slug, orders) {
  const payload = (orders || [])
    .filter(item => item?.characterId && (Number.isInteger(item.castOrder) || typeof item.participationRole === "string"))
    .map(item => {
      const entry = { characterId: String(item.characterId) };
      if (Number.isInteger(item.castOrder)) entry.castOrder = item.castOrder;
      if (typeof item.participationRole === "string") entry.participationRole = Array.from(item.participationRole.trim()).slice(0, MAX_PARTICIPATION_ROLE_LENGTH).join("");
      return entry;
    });
  if (!slug || !payload.length) return { ok: true, skipped: true };
  const { error } = await supabase.rpc("set_act_participant_cast_orders_for_current_user", { p_slug: slug, p_orders: payload });
  if (error) {
    // Publishing already succeeded; a missing or failing sync must not turn it into an error.
    console.warn("Act history CAST No and role could not be synchronized.", error);
    return { ok: false, error };
  }
  return { ok: true };
}
