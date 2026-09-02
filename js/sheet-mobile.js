import { supabase } from "./supabase-client.js";
import { SITE_BASE_PATH } from "./config.js?v=2";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=1";
import { normalizeCharacterSheetUrl } from "./character-sheet-url.js?v=2";

const PROFILE_FIELDS = [
  "character_name", "character_kana", "handle", "handle_kana", "player_name", "affiliation", "citizen_rank", "birthplace", "character_sheet_url",
  "age", "gender", "height", "weight", "eyes", "hair", "skin",
  "life_path_origin", "life_path_experience", "life_path_encounter", "summary", "profile", "visibility"
];

const $ = selector => document.querySelector(selector);
let user = null;
let character = null;
let dirtyProfile = false;
let saving = false;

function ensureHiddenSourceField(form, field) {
  if (form.querySelector(`[data-mobile-character-field="${field}"]`)) return;
  const input = document.createElement("input");
  input.type = "hidden";
  input.dataset.mobileCharacterField = field;
  form.append(input);
}

function ensureProfileSourceFields() {
  const form = $("#mobile-profile-form");
  if (!form) return;
  ensureHiddenSourceField(form, "birthplace");
  ensureHiddenSourceField(form, "character_sheet_url");
}

function setStatus(message, state = "") {
  const status = $("#mobile-save-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

function setSaveState(state) {
  const button = $("#mobile-save");
  if (!button) return;
  button.dataset.state = state;
  button.disabled = state === "saving";
  button.textContent = state === "saving" ? "保存中…" : state === "dirty" ? "変更を保存" : "保存済み";
}

function markDirty() {
  dirtyProfile = true;
  setStatus("未保存の変更があります", "dirty");
  setSaveState("dirty");
}

function notifyLoaded() {
  document.dispatchEvent(new CustomEvent("tnx:mobile-profile-loaded", { detail: { character } }));
}

function fillProfile() {
  if (!character) return;
  ensureProfileSourceFields();
  for (const field of PROFILE_FIELDS) {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (!input) continue;
    const fallback = field === "visibility" ? "private" : field === "birthplace" ? "Ｎ◎ＶＡ" : "";
    input.value = character[field] ?? fallback;
    if (field === "birthplace" && !String(input.value || "").trim()) input.value = "Ｎ◎ＶＡ";
  }
  notifyLoaded();
}

function collectProfileUpdate() {
  const payload = {};
  for (const field of PROFILE_FIELDS) {
    const input = document.querySelector(`[data-mobile-character-field="${field}"]`);
    if (input) payload[field] = input.value;
  }
  for (const field of ["character_name","player_name","character_kana","handle","handle_kana","affiliation","citizen_rank","birthplace"]) {
    payload[field] = String(payload[field] || "").trim();
  }
  const normalizedSheetUrl = normalizeCharacterSheetUrl(payload.character_sheet_url);
  if (normalizedSheetUrl === null) throw new Error("キャラクターシート倉庫URLを確認してください。");
  payload.character_sheet_url = normalizedSheetUrl;
  if (!payload.birthplace) payload.birthplace = "Ｎ◎ＶＡ";
  payload.visibility = payload.visibility === "public" ? "public" : "private";
  return payload;
}

function updateLinks() {
  if (!character) return;
  const id = encodeURIComponent(character.public_id);
  if ($("#mobile-pc-link")) $("#mobile-pc-link").href = `${SITE_BASE_PATH}sheet.html?id=${id}`;
  if ($("#mobile-view-link")) $("#mobile-view-link").href = `${SITE_BASE_PATH}cast.html?id=${id}&mobile=1`;
}

async function saveProfile() {
  if (saving || !character || !dirtyProfile) return;
  let payload;
  try {
    payload = collectProfileUpdate();
  } catch (error) {
    setStatus(error?.message || "入力内容を確認してください。", "error");
    return;
  }
  if (!payload.character_name || !payload.player_name) {
    setStatus("キャスト名とプレイヤー名は必須です。", "error");
    return;
  }
  saving = true;
  setSaveState("saving");
  try {
    const { error } = await supabase.from("characters").update(payload).eq("id", character.id).eq("owner_id", user.id);
    if (error) throw error;
    Object.assign(character, payload);
    dirtyProfile = false;
    setStatus("保存済み", "saved");
    setSaveState("saved");
    notifyLoaded();
  } catch (error) {
    console.error(error);
    setStatus(`保存に失敗しました：${error?.message || "不明なエラー"}`, "error");
    setSaveState("dirty");
  } finally {
    saving = false;
  }
}

function bind() {
  const form = $("#mobile-profile-form");
  form?.addEventListener("input", markDirty);
  form?.addEventListener("change", markDirty);
  $("#mobile-save")?.addEventListener("click", saveProfile);
  window.addEventListener("beforeunload", event => {
    if (!dirtyProfile) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function init() {
  ensureProfileSourceFields();
  bind();
  setStatus("キャストデータを読み込み中…", "loading");
  try {
    const context = await getMobileEditorContext();
    user = context.user;
    if (!user) return;
    if (!context.publicId) {
      setStatus("モバイル編集は既存キャスト専用です。PC版からキャストを作成してください。", "error");
      if ($("#mobile-save")) $("#mobile-save").disabled = true;
      return;
    }
    if (!context.character) throw new Error("編集可能なキャストが見つかりませんでした。");
    character = context.character;
    fillProfile();
    updateLinks();
    dirtyProfile = false;
    setStatus("保存済み", "saved");
    setSaveState("saved");
  } catch (error) {
    console.error(error);
    setStatus(`読み込みに失敗しました：${error?.message || "不明なエラー"}`, "error");
    if ($("#mobile-save")) $("#mobile-save").disabled = true;
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
