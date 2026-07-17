import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";

const user = await requireAuth();
const message = document.querySelector("#backup-message");

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

  try {
    const payload = JSON.parse(await file.text());
    if (!payload || !Array.isArray(payload.casts)) {
      throw new Error("バックアップ形式が正しくありません。");
    }

    let imported = 0;

    for (const pack of payload.casts) {
      const character = { ...(pack.character ?? {}) };
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
        const rows = (pack[key] ?? []).map(source => {
          const row = { ...source, character_id: created.id };
          delete row.id;
          delete row.created_at;
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

function setMessage(text, type) {
  if (!message) return;
  message.textContent = text;
  message.className = `auth-message${type ? ` auth-message--${type}` : ""}`;
}
