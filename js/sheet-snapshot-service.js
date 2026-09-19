import { supabase as defaultClient } from "./supabase-client.js";

export const MAX_SNAPSHOTS = 10;

export function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch { return String(value || ""); }
}

export async function listSnapshots(characterId, client = defaultClient) {
  return client
    .from("character_snapshots")
    .select("id,label,created_at")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(MAX_SNAPSHOTS);
}

export async function createSnapshot(characterId, label = "", client = defaultClient) {
  return client.rpc("create_character_snapshot", {
    p_character_id: characterId,
    p_label: String(label || "").trim()
  });
}

export async function createBundleSnapshot(characterId, data, label = "", client = defaultClient) {
  return client.rpc("create_character_snapshot_from_bundle", {
    p_character_id: characterId,
    p_label: String(label || "").trim(),
    p_snapshot_data: data
  });
}

export async function restoreSnapshot(snapshotId, client = defaultClient) {
  return client.rpc("restore_character_snapshot", { p_snapshot_id: snapshotId });
}

export async function deleteSnapshot(snapshotId, client = defaultClient) {
  return client.from("character_snapshots").delete().eq("id", snapshotId);
}
