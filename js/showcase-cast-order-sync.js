// Writes the generator's CAST No into act history (act_participants.cast_order).
// The publish/history RPCs number participants by array position, which skips manual casts.
export async function syncActCastOrders(supabase, slug, orders) {
  const payload = (orders || [])
    .filter(item => item?.characterId && Number.isInteger(item.castOrder))
    .map(item => ({ characterId: String(item.characterId), castOrder: item.castOrder }));
  if (!slug || !payload.length) return { ok: true, skipped: true };
  const { error } = await supabase.rpc("set_act_participant_cast_orders_for_current_user", { p_slug: slug, p_orders: payload });
  if (error) {
    // Publishing already succeeded; a missing or failing sync must not turn it into an error.
    console.warn("Act history CAST No could not be synchronized.", error);
    return { ok: false, error };
  }
  return { ok: true };
}
