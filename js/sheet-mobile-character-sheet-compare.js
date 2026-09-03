import { supabase } from "./supabase-client.js";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=1";
import { normalizeOutfitListForView } from "./outfit-view-model.js";
import { compareCharacterSheetSource } from "./character-sheet-compare-service.js?v=1";
import {
  groupCharacterSheetDifferences,
  summarizeCharacterSheetDifferences
} from "./character-sheet-diff-display.js?v=3";

const PROFILE_FIELDS = [
  "character_name", "character_kana", "handle", "handle_kana", "player_name", "affiliation", "citizen_rank", "birthplace", "character_sheet_url",
  "age", "gender", "height", "weight", "eyes", "hair", "skin",
  "life_path_origin", "life_path_experience", "life_path_encounter", "summary", "profile", "visibility"
];

function sourceValue(field) {
  return document.querySelector(`[data-mobile-character-field="${field}"]`)?.value ?? "";
}

function currentCharacter(base) {
  const character = { ...(base || {}) };
  PROFILE_FIELDS.forEach(field => {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (input) character[field] = input.value;
  });
  return character;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function renderResult(container, summaries) {
  container.hidden = false;
  container.innerHTML = summaries.length
    ? `<p>キャラクターシート倉庫との差分があります。</p><ul>${summaries.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "<p>差分はありません。CAST ARCHIVEとキャラクターシート倉庫は一致しています。</p>";
}

async function loadArchiveBundle() {
  const { character } = await getMobileEditorContext();
  if (!character?.id) throw new Error("編集対象のキャストを取得できませんでした。");
  const [{ data: skills, error: skillsError }, { data: outfits, error: outfitsError }] = await Promise.all([
    supabase
      .from("character_skills")
      .select("*")
      .eq("character_id", character.id)
      .order("category")
      .order("sort_order")
      .order("name"),
    supabase
      .from("character_outfits")
      .select("*")
      .eq("character_id", character.id)
      .order("category")
      .order("sort_order")
      .order("name")
  ]);
  if (skillsError) throw skillsError;
  if (outfitsError) throw outfitsError;
  return {
    character: currentCharacter(character),
    skills: skills || [],
    outfits: normalizeOutfitListForView(outfits || [])
  };
}

async function compare(button, result) {
  if (button.disabled) return;
  const modalUrl = document.querySelector('[data-mobile-profile-modal-field="character_sheet_url"]')?.value;
  const sourceUrl = String(modalUrl ?? sourceValue("character_sheet_url")).trim();
  if (!sourceUrl) {
    result.hidden = false;
    result.innerHTML = "<p>キャラクターシート倉庫URLを入力してください。</p>";
    return;
  }
  button.disabled = true;
  const original = button.textContent;
  button.textContent = "比較中…";
  result.hidden = true;
  try {
    const differences = await compareCharacterSheetSource(sourceUrl, await loadArchiveBundle());
    const summaries = summarizeCharacterSheetDifferences(groupCharacterSheetDifferences(differences));
    renderResult(result, summaries);
  } catch (error) {
    console.error("mobile editor character sheet comparison failed", error);
    result.hidden = false;
    result.innerHTML = `<p>差分比較に失敗しました：${escapeHtml(error?.message || error)}</p>`;
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function injectCompareUi() {
  const fields = document.querySelector("#mobile-profile-dialog-fields");
  const urlInput = fields?.querySelector('[data-mobile-profile-modal-field="character_sheet_url"]');
  if (!fields || !urlInput || fields.querySelector("[data-mobile-character-sheet-compare]")) return;

  const wrap = document.createElement("div");
  wrap.dataset.mobileCharacterSheetCompare = "1";
  wrap.className = "mobile-span-2";
  wrap.style.display = "grid";
  wrap.style.gap = "8px";
  wrap.style.marginTop = "4px";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "倉庫との差分を確認";
  button.style.minHeight = "42px";
  button.style.fontWeight = "800";

  const result = document.createElement("div");
  result.className = "mobile-character-sheet-compare-result";
  result.hidden = true;
  result.style.padding = "10px";
  result.style.border = "1px solid var(--color-border-muted)";
  result.style.fontSize = "11px";
  result.style.lineHeight = "1.55";

  button.addEventListener("click", () => compare(button, result));
  wrap.append(button, result);
  fields.append(wrap);
}

document.addEventListener("click", event => {
  const sourceCard = event.target.closest('[data-mobile-profile-group="source"]');
  if (!sourceCard) return;
  queueMicrotask(injectCompareUi);
  setTimeout(injectCompareUi, 0);
});