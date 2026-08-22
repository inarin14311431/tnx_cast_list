import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const user = await requireAuth();
const message = document.querySelector("#backup-message");
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_CASTS = 500;
const MAX_RELATED_ROWS = 500;

if (user) {
  document.querySelector("#export-button")?.addEventListener("click", exportBackup);
  document.querySelector("#import-button")?.addEventListener("click", importBackup);
}

async function exportBackup() {
  setMessage("エクスポート中…", "");

  const { data: characters, error } = await supabase
    .from("characters")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at");

  if (error) return setMessage(`エクスポートに失敗しました：${error.message}`, "error");

  const casts = [];

  for (const character of characters ?? []) {
    const [skills, outfits, combos] = await Promise.all([
      supabase.from("character_skills").select("*").eq("character_id", character.id),
      supabase.from("character_outfits").select("*").eq("character_id", character.id),
      supabase.from("character_combos").select("*").eq("character_id", character.id)
    ]);

    const relatedError = skills.error || outfits.error || combos.error;
    if (relatedError) return setMessage(`エクスポートに失敗しました：${relatedError.message}`, "error");

    casts.push({ character, skills: skills.data ?? [], outfits: outfits.data ?? [], combos: combos.data ?? [] });
  }

  const payload = { version: 1, exported_at: new Date().toISOString(), casts };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  anchor.href = objectUrl;
  anchor.download = `tnx_cast_backup_${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  setMessage(`${casts.length}件のキャストをエクスポートしました。`, "success");
}

async function importBackup() {
  const file = document.querySelector("#import-file")?.files?.[0];
  if (!file) return setMessage("JSONファイルを選択してください。", "error");
  if (file.size > MAX_BACKUP_BYTES) return setMessage("インポートに失敗しました：バックアップファイルは10MB以下にしてください。", "error");

  try {
    const payload = JSON.parse(await file.text());
    validateBackupPayload(payload);

    let imported = 0;

    for (const pack of payload.casts) {
      const character = { ...pack.character };
      delete character.id;
      delete character.public_id;
      delete character.created_at;
      delete character.updated_at;
      character.owner_id = user.id;
      character.visibility = "private";

      const { data: created, error } = await supabase
        .from("characters")
        .insert(character)
        .select("id")
        .single();

      if (error) throw error;

      for (const [key, table] of [["skills", "character_skills"], ["outfits", "character_outfits"], ["combos", "character_combos"]]) {
        const rows = pack[key].map(source => {
          const row = { ...source, character_id: created.id };
          delete row.id;
          delete row.created_at;
          delete row.updated_at;
          return row;
        });

        if (rows.length) {
          const { error: insertError } = await supabase.from(table).insert(rows);
          if (insertError) throw insertError;
        }
      }

      imported += 1;
    }

    setMessage(`${imported}件のキャストを非公開としてインポートしました。`, "success");
  } catch (error) {
    console.error(error);
    setMessage(error?.message ? `インポートに失敗しました：${error.message}` : "インポートに失敗しました。", "error");
  }
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.casts)) {
    throw new Error("バックアップ形式が正しくありません。");
  }
  if (payload.version != null && payload.version !== 1) {
    throw new Error("未対応のバックアップバージョンです。");
  }
  if (payload.casts.length > MAX_CASTS) {
    throw new Error(`一度にインポートできるキャストは${MAX_CASTS}件までです。`);
  }

  payload.casts.forEach((pack, index) => {
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) throw new Error(`${index + 1}件目のキャスト形式が正しくありません。`);
    if (!pack.character || typeof pack.character !== "object" || Array.isArray(pack.character)) throw new Error(`${index + 1}件目のキャスト本体が正しくありません。`);
    if (!String(pack.character.character_name ?? "").trim()) throw new Error(`${index + 1}件目のキャスト名がありません。`);

    for (const key of ["skills", "outfits", "combos"]) {
      if (pack[key] == null) pack[key] = [];
      if (!Array.isArray(pack[key])) throw new Error(`${index + 1}件目の${key}形式が正しくありません。`);
      if (pack[key].length > MAX_RELATED_ROWS) throw new Error(`${index + 1}件目の${key}件数が上限を超えています。`);
      if (pack[key].some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error(`${index + 1}件目の${key}データが正しくありません。`);
    }
  });
}

function setMessage(text, type) {
  if (!message) return;
  message.textContent = text;
  message.className = `auth-message${type ? ` auth-message--${type}` : ""}`;
}
