// Fills an unregistered (manual) showcase cast from a キャラクターシート倉庫 URL.
// Uses the same data-only proxy as the editor import; remote scripts are never executed.
import { normalizeCharacterSheetUrl } from "./character-sheet-url.js?v=9b3404e3";

export function isCharacterSheetUrl(value) {
  return Boolean(normalizeCharacterSheetUrl(value));
}

export function manualCastFieldsFromCanonical(canonical = {}) {
  const basic = canonical.basic || {};
  const personal = canonical.personal || {};
  const styles = canonical.styles || {};
  const handle = String(basic.handle || "").trim();
  const name = String(basic.character_name || "").trim();
  return {
    name: [handle ? `“${handle}”` : "", name].filter(Boolean).join(" "),
    styles: [1, 2, 3]
      .map(slot => `${String(styles[`style_${slot}`] || "").trim()}${String(styles[`style_${slot}_mark`] || "").trim()}`)
      .filter(label => label.replace(/[◎●]/g, ""))
      .join(" / "),
    player: String(basic.player_name || "").trim(),
    affiliation: String(basic.affiliation || "").trim(),
    age: String(personal.age ?? "").trim(),
    gender: String(personal.gender ?? "").trim(),
    rank: String(basic.citizen_rank || "").trim()
  };
}

export async function fetchManualCastFromSheet(url) {
  if (!isCharacterSheetUrl(url)) throw new Error("キャラクターシート倉庫のURL（https://character-sheets.appspot.com/tnx/...?key=...）を入力してください。");
  const [{ loadCharacterSheetPayload }, { canonicalizeCharacterSheetJsonp }] = await Promise.all([
    import("./character-sheet-compare-service.js?v=d3ff58b4"),
    import("./character-sheet-jsonp-canonical.js?v=bf20e917")
  ]);
  const payload = await loadCharacterSheetPayload(url);
  const fields = manualCastFieldsFromCanonical(canonicalizeCharacterSheetJsonp(payload));
  if (!fields.name) throw new Error("キャラクターシート倉庫のデータからキャスト名を読み取れませんでした。");
  return fields;
}
