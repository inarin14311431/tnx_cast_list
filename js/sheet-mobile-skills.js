import { supabase } from "./supabase-client.js";
import { getMobileEditorContext } from "./sheet-mobile-runtime.js?v=1";
import { moveAdjacentRow } from "./sheet-row-collection-state.js?v=2";
import { GENERAL_MOBILE_ORDER, MUTABLE_GENERAL_PREFIXES } from "./general-skill-catalog.js?v=1";
import { normalizeStyleSkillRow } from "./sheet-mobile-style-normalizer.js?v=1";

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = value => Number(value || 0);
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const SUITS = [["reason","♠","♤"],["passion","♣","♧"],["life","♥","♡"],["mundane","♦","♢"]];
const STYLE_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const STYLE_SEPARATOR = "[[STYLE_SEPARATOR]]";
const DETAIL_FIELDS = ["skill","limit","timing","target","range","difficulty","confrontation","description","page"];
const STYLE_COLUMN_FIELDS = ["timing","target","range","difficulty","confrontation"];
const CATEGORY_LABELS = {general:"一般技能",social:"社会",connection:"コネ"};
const KIND_LABELS = {normal:"通常",secret:"秘技",ultimate:"奥義",direction:"演出",none:"なし"};

let character = null;
let skills = [];
let activeGeneralId = "";
let activeStyleId = "";
let activeSeparatorId = "";
let orderDirty = false;
const dirtyIds = new Set();
const deletedIds = new Set();

function markDirty() {
  const button = $("#mobile-save");
  if (button) {
    button.dataset.state = "dirty";
    button.textContent = "変更を保存";
  }
  const status = $("#mobile-save-status");
  if (status) {
    status.dataset.state = "dirty";
    status.textContent = "未保存の変更があります";
  }
}

function isNew(item) { return Boolean(item?._new); }
function byId(id) { return skills.find(item => String(item.id) === String(id)); }

function isSeparator(item) {
  if (!item || item.category !== "style") return false;
  if (item._separator) return true;
  const text = String(item.description || "");
  if (text.startsWith(STYLE_SEPARATOR)) return true;
  if (!text.startsWith(STYLE_PREFIX)) return false;
  try {
    return String(JSON.parse(text.slice(STYLE_PREFIX.length).trim())?.description || "").startsWith(STYLE_SEPARATOR);
  } catch {
    return false;
  }
}

function mutableGeneralName(item) {
  return item?.category === "general" && MUTABLE_GENERAL_PREFIXES.some(prefix => String(item.name || "").startsWith(prefix));
}

function minLevel(item) {
  if (!item) return 0;
  if (item.category === "general" && ((isNew(item) && !String(item.name || "").trim()) || mutableGeneralName(item))) return 0;
  return 1;
}

function canRename(item) {
  if (!item) return false;
  if (isNew(item)) return true;
  if (item.category !== "general") return true;
  return mutableGeneralName(item);
}

function canDeleteGeneral(item) {
  return Boolean(item) && (isNew(item) || item.category !== "general" || mutableGeneralName(item));
}

function blankSkill(category) {
  return {
    id: uid("skill"),
    _new: true,
    category,
    name: "",
    level: category === "general" ? 0 : 1,
    free_level: 0,
    skill_kind: category === "style" ? "normal" : "proper",
    reason: false,
    passion: false,
    life: false,
    mundane: false,
    timing: "",
    target: "",
    range: "",
    difficulty: "",
    confrontation: "",
    description: "",
    sort_order: nextSort()
  };
}

function nextSort() {
  return skills.length ? Math.max(...skills.map(item => num(item.sort_order))) + 10 : 0;
}

function selectedSuitCountFrom(item) {
  return SUITS.reduce((count, [key]) => count + (item[key] ? 1 : 0), 0);
}

function normalizeSkillLevel(item, source = "close", changedKey = "") {
  const floor = item.category === "style" ? 0 : minLevel(item);
  let level = Math.max(floor, num(item.level));
  const count = selectedSuitCountFrom(item);
  if (source === "suit") {
    if (changedKey && item[changedKey]) level = Math.max(level, count);
    else level = Math.max(floor, count);
  }
  if (source === "level" && level >= 4) {
    for (const [key] of SUITS) item[key] = true;
  }
  item.level = Math.max(floor, level);
  item.free_level = Math.min(Math.max(0, num(item.free_level)), item.level);
}

function generalRank(item, index) {
  if (item.category !== "general") return index;
  const name = String(item.name || "");
  const rank = GENERAL_MOBILE_ORDER.findIndex(master =>
    MUTABLE_GENERAL_PREFIXES.includes(master) ? name.startsWith(master) : name === master
  );
  return rank < 0 ? GENERAL_MOBILE_ORDER.length + index : rank;
}

function sortedGeneral(list) {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => generalRank(a.item, a.index) - generalRank(b.item, b.index) || num(a.item.sort_order) - num(b.item.sort_order))
    .map(x => x.item);
}

function suitString(item) {
  return SUITS.map(([key, filled, outline]) => item[key] ? filled : outline).join("");
}

function levelOptions(current, floor = 0) {
  const value = Math.min(20, Math.max(floor, num(current)));
  return Array.from({ length: 21 }, (_, level) =>
    `<option value="${level}" ${level === value ? "selected" : ""} ${level < floor ? "disabled" : ""}>${level}</option>`
  ).join("");
}

function installGeneralDialog() {
  if ($("#mobile-general-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-general-dialog";
  dialog.className = "mobile-editor-dialog";
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button type="button" id="mobile-general-close">閉じる</button><strong id="mobile-general-title">技能編集</strong></header><div class="mobile-editor-dialog__body"><div class="mobile-form-grid mobile-form-grid--two"><label class="mobile-span-2">名称<input id="mobile-general-name"></label><label>レベル<select id="mobile-general-level"></select></label><div class="mobile-span-2 mobile-suit-grid">${SUITS.map(([key,mark])=>`<label><input type="checkbox" data-mobile-general-suit="${key}"><span>${mark}</span></label>`).join("")}</div><p id="mobile-general-policy" class="mobile-span-2 mobile-editor-policy-note"></p><button type="button" id="mobile-general-delete" class="mobile-danger-action mobile-span-2">この技能を削除</button></div></div></form>`;
  document.body.append(dialog);
}

function installSeparatorDialog() {
  if ($("#mobile-separator-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "mobile-separator-dialog";
  dialog.className = "mobile-editor-dialog mobile-separator-dialog";
  dialog.innerHTML = `<form method="dialog"><header class="mobile-editor-dialog__header mobile-editor-dialog__header--close-only"><button type="button" id="mobile-separator-close">閉じる</button><strong>区切り編集</strong></header><div class="mobile-editor-dialog__body"><div class="mobile-form-grid"><label>名称<input id="mobile-separator-name" placeholder="区切り"></label><p class="mobile-editor-policy-note">区切りの位置は一覧の↑／↓で移動できます。</p><button type="button" id="mobile-separator-delete" class="mobile-danger-action">この区切りを削除</button></div></div></form>`;
  document.body.append(dialog);
}

function installToolbars() {
  const general = $("#mobile-general .mobile-sheet-section__body");
  if (general && !general.querySelector("[data-mobile-skills-general-toolbar]")) {
    const bar = document.createElement("div");
    bar.className = "mobile-section-addbar mobile-section-addbar--three";
    bar.dataset.mobileSkillsGeneralToolbar = "1";
    bar.innerHTML = `<button type="button" class="mobile-section-add" data-add-skill="general">＋ 一般技能</button><button type="button" class="mobile-section-add" data-add-skill="social">＋ 社会</button><button type="button" class="mobile-section-add" data-add-skill="connection">＋ コネ</button>`;
    general.prepend(bar);
  }
  const style = $("#mobile-style-skills-section .mobile-sheet-section__body");
  if (style && !style.querySelector("[data-mobile-skills-style-toolbar]")) {
    const bar = document.createElement("div");
    bar.className = "mobile-section-addbar mobile-section-addbar--two";
    bar.dataset.mobileSkillsStyleToolbar = "1";
    bar.innerHTML = `<button type="button" class="mobile-section-add" data-add-skill="style">＋ スタイル技能</button><button type="button" class="mobile-section-add" data-add-separator>＋ 区切り</button>`;
    style.prepend(bar);
  }
}

function renderGeneral() {
  const root = $("#mobile-general-skills");
  if (!root) return;
  const visible = skills.filter(item => ["general","social","connection"].includes(item.category) && !deletedIds.has(String(item.id)));
  root.innerHTML = ["general","social","connection"].map(category => {
    let list = visible.filter(item => item.category === category);
    if (category === "general") list = sortedGeneral(list);
    return `<section class="mobile-general-group" data-skill-category="${category}"><h3>${CATEGORY_LABELS[category]}</h3><div class="mobile-general-table"><div class="mobile-general-row mobile-general-row--head" aria-hidden="true"><span>名称</span><span>LV</span>${SUITS.map(([,mark])=>`<span>${mark}</span>`).join("")}</div>${list.map(item => {
      const pending = isNew(item) || dirtyIds.has(String(item.id));
      return `<button type="button" class="mobile-general-row mobile-general-row--button${pending ? " is-pending" : ""}" data-general-id="${esc(item.id)}"><span class="mobile-general-display-name">${esc(item.name || "名称未入力")}</span><strong>${Math.max(minLevel(item), num(item.level))}</strong>${SUITS.map(([key,filled,outline])=>`<span class="mobile-general-display-suit${item[key] ? " is-selected" : ""}">${item[key] ? filled : outline}</span>`).join("")}</button>`;
    }).join("")}</div></section>`;
  }).join("");
}

function parseDetail(item) {
  return normalizeStyleSkillRow(item);
}

function encodeDetail(data) {
  return STYLE_PREFIX + "\n" + JSON.stringify(Object.fromEntries(DETAIL_FIELDS.map(key => [key, String(data[key] ?? "")] )));
}

function assignStyleControl(control, value) {
  if (!control) return;
  const text = String(value ?? "");
  if (control.tagName === "SELECT" && text && ![...control.options].some(option => option.value === text)) {
    const option = document.createElement("option");
    option.value = text;
    option.textContent = text;
    option.dataset.mobileStyleExistingValue = "1";
    control.append(option);
  }
  control.value = text;
}

function styleCard(item) {
  const detail = parseDetail(item);
  const pending = isNew(item) || dirtyIds.has(String(item.id));
  return `<div class="mobile-style-skill-row${pending ? " is-pending" : ""}" data-style-order-id="${esc(item.id)}"><button type="button" class="mobile-edit-card mobile-style-skill-card${pending ? " is-pending" : ""}" data-style-id="${esc(item.id)}"><span class="mobile-style-skill-card__primary"><span class="mobile-edit-card__name">${esc(item.name || "名称未入力")}</span><span class="mobile-edit-card__suits">${suitString(item)}</span><span class="mobile-edit-card__level">LV${num(item.level)}</span></span><span class="mobile-style-skill-card__secondary"><span>${esc(KIND_LABELS[item.skill_kind] || "通常")}</span><span>${esc(detail.skill || "—")}</span><span>${esc(detail.timing || item.timing || "—")}</span><span>${esc(detail.target || item.target || "—")}</span></span>${pending ? '<span class="mobile-unsaved-label">未保存</span>' : ""}</button><div class="mobile-style-skill-row__actions"><button type="button" data-move-style="up" aria-label="上へ">↑</button><button type="button" data-move-style="down" aria-label="下へ">↓</button></div></div>`;
}

function separatorCard(item) {
  const pending = isNew(item) || dirtyIds.has(String(item.id));
  return `<div class="mobile-style-separator${pending ? " is-pending" : ""}" data-separator-id="${esc(item.id)}" data-style-order-id="${esc(item.id)}"><button type="button" class="mobile-style-separator__name" data-edit-separator="${esc(item.id)}"><strong>${esc(item.name || "区切り")}</strong><small>STYLE SECTION${pending ? ' / <b class="mobile-unsaved-label">未保存</b>' : ""}</small></button><div class="mobile-style-separator__actions"><button type="button" data-move-separator="up" data-move-style="up" aria-label="上へ">↑</button><button type="button" data-move-separator="down" data-move-style="down" aria-label="下へ">↓</button><button type="button" data-delete-separator aria-label="削除">×</button></div></div>`;
}

function renderStyle() {
  const root = $("#mobile-style-skills");
  if (!root) return;
  const list = skills
    .filter(item => item.category === "style" && !deletedIds.has(String(item.id)))
    .sort((a,b) => num(a.sort_order) - num(b.sort_order));
  root.innerHTML = list.length
    ? list.map(item => isSeparator(item) ? separatorCard(item) : styleCard(item)).join("")
    : '<p class="mobile-sheet-section__note">スタイル技能は登録されていません。</p>';
}

function openGeneral(id) {
  const item = byId(id);
  if (!item) return;
  activeGeneralId = String(item.id);
  const rename = canRename(item);
  const floor = minLevel(item);
  $("#mobile-general-title").textContent = `${CATEGORY_LABELS[item.category]}編集`;
  $("#mobile-general-name").value = item.name || "";
  $("#mobile-general-name").readOnly = !rename;
  $("#mobile-general-name").classList.toggle("is-readonly", !rename);
  $("#mobile-general-level").innerHTML = levelOptions(item.level, floor);
  for (const [key] of SUITS) $(`[data-mobile-general-suit="${key}"]`).checked = Boolean(item[key]);
  $("#mobile-general-delete").hidden = !canDeleteGeneral(item);
  $("#mobile-general-policy").textContent = !rename ? "名称は基本技能のため固定です。" : (floor > 0 ? `最低レベルはLV${floor}です。` : "");
  $("#mobile-general-dialog").showModal();
  requestAnimationFrame(() => (rename ? $("#mobile-general-name") : $("#mobile-general-level"))?.focus());
}

function syncGeneralModal(source = "level", changedKey = "") {
  const item = byId(activeGeneralId);
  if (!item) return;
  const floor = minLevel(item);
  const level = $("#mobile-general-level");
  let value = Math.min(20, Math.max(floor, num(level.value)));
  const count = SUITS.reduce((n,[key]) => n + ($(`[data-mobile-general-suit="${key}"]`)?.checked ? 1 : 0), 0);
  if (source === "suit") {
    const checked = changedKey && $(`[data-mobile-general-suit="${changedKey}"]`)?.checked;
    value = checked ? Math.max(value, count) : Math.max(floor, count);
  }
  if (source === "level" && value >= 4) {
    for (const [key] of SUITS) $(`[data-mobile-general-suit="${key}"]`).checked = true;
  }
  level.value = String(value);
}

function commitGeneral() {
  const item = byId(activeGeneralId);
  if (!item) return;
  const before = JSON.stringify([item.name,item.level,...SUITS.map(([key])=>item[key])]);
  if (canRename(item)) item.name = $("#mobile-general-name").value;
  item.level = Math.min(20, Math.max(minLevel(item), num($("#mobile-general-level").value)));
  for (const [key] of SUITS) item[key] = $(`[data-mobile-general-suit="${key}"]`).checked;
  normalizeSkillLevel(item, "close");
  const after = JSON.stringify([item.name,item.level,...SUITS.map(([key])=>item[key])]);
  if (before !== after) {
    dirtyIds.add(String(item.id));
    markDirty();
  }
  renderGeneral();
}

function closeGeneral() {
  if (activeGeneralId) commitGeneral();
  activeGeneralId = "";
  $("#mobile-general-dialog")?.close();
}

function deleteGeneral() {
  const item = byId(activeGeneralId);
  if (!item || !canDeleteGeneral(item)) return;
  if (isNew(item)) skills = skills.filter(row => String(row.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeGeneralId = "";
  $("#mobile-general-dialog")?.close();
  renderGeneral();
  markDirty();
}

function styleMessage(text = "") {
  const message = $("#mobile-style-message");
  if (message) message.textContent = text;
}

function openStyle(id) {
  const item = byId(id);
  if (!item || isSeparator(item)) return;
  activeStyleId = String(item.id);
  const detail = parseDetail(item);
  $("#style-skill-dialog-title").textContent = item.name || (isNew(item) ? "スタイル技能追加" : "スタイル技能編集");
  $("#mobile-style-name").value = item.name || "";
  $("#mobile-style-kind").value = ["normal","secret","ultimate","direction"].includes(item.skill_kind) ? item.skill_kind : "normal";
  $("#mobile-style-level").value = String(Math.max(0, num(item.level)));
  for (const [key] of SUITS) $("#mobile-style-suit-" + key).checked = Boolean(item[key]);
  for (const key of DETAIL_FIELDS) {
    assignStyleControl(document.querySelector(`[data-mobile-style-detail="${key}"]`), detail[key]);
  }
  styleMessage("");
  $("#mobile-style-delete").hidden = false;
  $("#style-skill-dialog")?.showModal();
  requestAnimationFrame(() => $("#mobile-style-name")?.focus());
}

function syncStyleModal(source = "level", changedKey = "") {
  const level = $("#mobile-style-level");
  if (!level) return;
  let value = Math.max(0, num(level.value));
  const count = SUITS.reduce((n,[key]) => n + ($("#mobile-style-suit-" + key)?.checked ? 1 : 0), 0);
  if (source === "suit") {
    const checked = changedKey && $("#mobile-style-suit-" + changedKey)?.checked;
    value = checked ? Math.max(value, count) : count;
  }
  if (source === "level" && value >= 4) {
    for (const [key] of SUITS) $("#mobile-style-suit-" + key).checked = true;
  }
  level.value = String(value);
}

function commitStyle() {
  const item = byId(activeStyleId);
  if (!item || isSeparator(item)) return false;
  const name = $("#mobile-style-name").value.trim();
  if (!name) {
    styleMessage("スタイル技能の名称を入力してください。");
    $("#mobile-style-name")?.focus();
    return false;
  }
  const before = JSON.stringify(payload(item));
  item.name = name;
  item.skill_kind = $("#mobile-style-kind").value || "normal";
  item.level = Math.max(0, num($("#mobile-style-level").value));
  for (const [key] of SUITS) item[key] = $("#mobile-style-suit-" + key).checked;
  normalizeSkillLevel(item, "close");
  const detail = {};
  for (const key of DETAIL_FIELDS) detail[key] = document.querySelector(`[data-mobile-style-detail="${key}"]`)?.value || "";
  for (const key of STYLE_COLUMN_FIELDS) item[key] = detail[key] || "";
  item.description = encodeDetail(detail);
  if (before !== JSON.stringify(payload(item))) {
    dirtyIds.add(String(item.id));
    markDirty();
  }
  renderStyle();
  return true;
}

function applyStyle() {
  if (!activeStyleId || !commitStyle()) return;
  activeStyleId = "";
  $("#style-skill-dialog")?.close();
}

function cancelStyle() {
  const item = byId(activeStyleId);
  if (item && isNew(item)) {
    skills = skills.filter(row => String(row.id) !== String(item.id));
    dirtyIds.delete(String(item.id));
    renderStyle();
  }
  activeStyleId = "";
  styleMessage("");
  $("#style-skill-dialog")?.close();
}

function deleteStyle() {
  const item = byId(activeStyleId);
  if (!item) return;
  if (!confirm(`「${item.name || "名称未入力"}」を削除しますか？`)) return;
  const wasNew = isNew(item);
  if (wasNew) skills = skills.filter(row => String(row.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeStyleId = "";
  $("#style-skill-dialog")?.close();
  renderStyle();
  if (!wasNew) markDirty();
}

function openSeparator(id) {
  const item = byId(id);
  if (!item || !isSeparator(item)) return;
  activeSeparatorId = String(item.id);
  $("#mobile-separator-name").value = item.name || "";
  $("#mobile-separator-dialog")?.showModal();
  requestAnimationFrame(() => $("#mobile-separator-name")?.focus());
}

function commitSeparator() {
  const item = byId(activeSeparatorId);
  if (!item) return;
  const next = $("#mobile-separator-name").value;
  if (item.name !== next) {
    item.name = next;
    dirtyIds.add(String(item.id));
    markDirty();
  }
  renderStyle();
}

function closeSeparator() {
  if (activeSeparatorId) commitSeparator();
  activeSeparatorId = "";
  $("#mobile-separator-dialog")?.close();
}

function deleteSeparator(id = activeSeparatorId) {
  const item = byId(id);
  if (!item) return;
  if (!confirm(`「${item.name || "区切り"}」を削除しますか？`)) return;
  if (isNew(item)) skills = skills.filter(row => String(row.id) !== String(item.id));
  else deletedIds.add(String(item.id));
  dirtyIds.delete(String(item.id));
  activeSeparatorId = "";
  $("#mobile-separator-dialog")?.close();
  renderStyle();
  markDirty();
}

function moveStyleItem(id, direction) {
  const list = skills
    .filter(item => item.category === "style" && !deletedIds.has(String(item.id)))
    .sort((a,b) => num(a.sort_order) - num(b.sort_order));
  const result = moveAdjacentRow(list, String(id), direction, {
    keyOf: item => String(item?.id)
  });
  if (!result.moved) return;
  result.rows.forEach((item, i) => {
    item.sort_order = i * 10;
    dirtyIds.add(String(item.id));
  });
  orderDirty = true;
  markDirty();
  renderStyle();
}

function addSkill(category) {
  const item = blankSkill(category);
  skills.push(item);
  if (category === "style") {
    openStyle(item.id);
    return;
  }
  dirtyIds.add(String(item.id));
  markDirty();
  renderGeneral();
  openGeneral(item.id);
}

function addSeparator() {
  const item = blankSkill("style");
  item._separator = true;
  item.skill_kind = "none";
  item.level = 1;
  item.description = STYLE_SEPARATOR;
  skills.push(item);
  dirtyIds.add(String(item.id));
  orderDirty = true;
  markDirty();
  renderStyle();
  openSeparator(item.id);
}

function payload(item) {
  return {
    character_id: character.id,
    category: item.category,
    name: item.name || "",
    level: num(item.level),
    free_level: Math.min(num(item.free_level), num(item.level)),
    skill_kind: item.skill_kind || (item.category === "style" ? "normal" : "proper"),
    reason: Boolean(item.reason),
    passion: Boolean(item.passion),
    life: Boolean(item.life),
    mundane: Boolean(item.mundane),
    timing: item.timing || "",
    target: item.target || "",
    range: item.range || "",
    difficulty: item.difficulty || "",
    confrontation: item.confrontation || "",
    description: item.description || "",
    sort_order: num(item.sort_order)
  };
}

async function flush() {
  if (!character) return;
  for (const id of deletedIds) {
    const { error } = await supabase.from("character_skills").delete().eq("id", id).eq("character_id", character.id);
    if (error) throw error;
  }
  for (const item of skills) {
    if (deletedIds.has(String(item.id)) || !dirtyIds.has(String(item.id))) continue;
    if (isNew(item)) {
      if (!isSeparator(item) && !String(item.name || "").trim()) continue;
      const { data, error } = await supabase.from("character_skills").insert(payload(item)).select("*").single();
      if (error) throw error;
      Object.assign(item, data, { _new: false, _separator: isSeparator(item) });
    } else {
      const { error } = await supabase.from("character_skills").update(payload(item)).eq("id", item.id).eq("character_id", character.id);
      if (error) throw error;
    }
  }
  skills = skills.filter(item => !deletedIds.has(String(item.id)) && !(isNew(item) && !isSeparator(item) && !String(item.name || "").trim()));
  dirtyIds.clear();
  deletedIds.clear();
  orderDirty = false;
  renderGeneral();
  renderStyle();
  document.dispatchEvent(new CustomEvent("tnx:mobile-skills-saved"));
}

function hasChanges() {
  return dirtyIds.size > 0 || deletedIds.size > 0 || orderDirty;
}

function bind() {
  document.addEventListener("click", event => {
    const add = event.target.closest("[data-add-skill]");
    if (add) {
      addSkill(add.dataset.addSkill);
      return;
    }
    if (event.target.closest("[data-add-separator]")) {
      addSeparator();
      return;
    }
    const move = event.target.closest("[data-move-style],[data-move-separator]");
    if (move) {
      const owner = move.closest("[data-style-order-id],[data-separator-id]");
      const id = owner?.dataset.styleOrderId || owner?.dataset.separatorId;
      moveStyleItem(id, move.dataset.moveStyle || move.dataset.moveSeparator);
      return;
    }
    const general = event.target.closest("[data-general-id]");
    if (general) {
      openGeneral(general.dataset.generalId);
      return;
    }
    const style = event.target.closest("[data-style-id]");
    if (style) {
      openStyle(style.dataset.styleId);
      return;
    }
    const separator = event.target.closest("[data-edit-separator]");
    if (separator) {
      openSeparator(separator.dataset.editSeparator);
      return;
    }
    const del = event.target.closest("[data-delete-separator]");
    if (del) deleteSeparator(del.closest("[data-separator-id]")?.dataset.separatorId);
  });

  $("#mobile-general-close")?.addEventListener("click", closeGeneral);
  $("#mobile-general-delete")?.addEventListener("click", deleteGeneral);
  $("#mobile-general-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    closeGeneral();
  });
  $("#mobile-general-level")?.addEventListener("change", () => syncGeneralModal("level"));
  for (const [key] of SUITS) {
    $(`[data-mobile-general-suit="${key}"]`)?.addEventListener("change", () => syncGeneralModal("suit", key));
  }

  const styleDialog = $("#style-skill-dialog");
  const styleHeader = styleDialog?.querySelector(".mobile-editor-dialog__header");
  styleHeader?.classList.remove("mobile-editor-dialog__header--close-only");
  styleHeader?.classList.add("mobile-editor-dialog__header--actions");
  if (styleDialog && !$("#mobile-style-message")) {
    const message = document.createElement("p");
    message.id = "mobile-style-message";
    message.className = "mobile-editor-policy-note";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    styleDialog.querySelector(".mobile-editor-dialog__body")?.prepend(message);
  }
  if (styleDialog && !$("#mobile-style-delete")) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "mobile-style-delete";
    button.className = "mobile-danger-action";
    button.textContent = "このスタイル技能を削除";
    styleDialog.querySelector(".mobile-editor-dialog__body")?.append(button);
  }
  $("#style-skill-dialog-cancel")?.addEventListener("click", cancelStyle);
  $("#style-skill-dialog-apply")?.addEventListener("click", applyStyle);
  styleDialog?.addEventListener("cancel", event => {
    event.preventDefault();
    cancelStyle();
  });
  $("#mobile-style-delete")?.addEventListener("click", deleteStyle);
  $("#mobile-style-level")?.addEventListener("change", () => syncStyleModal("level"));
  for (const [key] of SUITS) {
    $("#mobile-style-suit-" + key)?.addEventListener("change", () => syncStyleModal("suit", key));
  }

  $("#mobile-separator-close")?.addEventListener("click", closeSeparator);
  $("#mobile-separator-delete")?.addEventListener("click", () => deleteSeparator());
  $("#mobile-separator-dialog")?.addEventListener("cancel", event => {
    event.preventDefault();
    closeSeparator();
  });

  document.addEventListener("tnx:mobile-before-save", event => {
    if (hasChanges()) event.detail.add(flush());
  });
  window.addEventListener("beforeunload", event => {
    if (!hasChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function load() {
  const result = await supabase.from("character_skills").select("*").eq("character_id", character.id).order("sort_order");
  if (result.error) throw result.error;
  skills = (result.data || []).map(item => ({ ...item, _new: false, _separator: isSeparator(item) }));
  renderGeneral();
  renderStyle();
}

async function init() {
  installGeneralDialog();
  installSeparatorDialog();
  installToolbars();
  bind();
  try {
    const context = await getMobileEditorContext();
    if (!context.character) return;
    character = context.character;
    await load();
  } catch (error) {
    console.error(error);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();