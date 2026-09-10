// Approved by the project owner. Never make this configurable via CI inputs.
export const TEST_OWNER_ID = 'f44d74d1-5f09-425f-8de8-a7fb6b46ea79';
export const TEST_OWNER_EMAIL = 'inarin1431@gmail.com';
export function assertTestIdentity(user) {
  if (user?.id !== TEST_OWNER_ID || String(user?.email || '').toLowerCase() !== TEST_OWNER_EMAIL) {
    throw new Error('E2E stopped: test account is not the approved cast owner.');
  }
}
export function assertConfiguredEmail(email) {
  if (String(email || '').trim().toLowerCase() !== TEST_OWNER_EMAIL) {
    throw new Error('E2E stopped: configured email is not the approved test account.');
  }
}
export function assertOwnedTarget(record) {
  if (!record?.id || record.owner_id !== TEST_OWNER_ID) {
    throw new Error('E2E stopped: cast ownership could not be verified.');
  }
}
export function permitsMutation({ table, method, search, body, castIds, authenticated }) {
  if (!authenticated) return false;
  if (table === 'rpc/save_character_bundle_with_ofc' || table === 'rpc/save_character_bundle') {
    return castIds.has(body?.p_character_id) && (!body.p_character?.owner_id || body.p_character.owner_id === TEST_OWNER_ID);
  }
  if (table === 'rpc/create_character_snapshot' || table === 'rpc/create_character_snapshot_from_bundle') {
    return castIds.has(body?.p_character_id);
  }
  const rows = Array.isArray(body) ? body : [body || {}];
  if (table === 'characters') {
    return method === 'PATCH' && castIds.has((search.get('id') || '').replace(/^eq\./, '')) && rows.every(row => !row.owner_id || row.owner_id === TEST_OWNER_ID);
  }
  if (['character_skills', 'character_outfits', 'character_combos'].includes(table)) {
    if (method === 'POST') return rows.length > 0 && rows.every(row => castIds.has(row.character_id));
    return castIds.has((search.get('character_id') || '').replace(/^eq\./, '')) && rows.every(row => !row.character_id || castIds.has(row.character_id));
  }
  return false;
}
