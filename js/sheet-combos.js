import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const openButton = document.querySelector("#sheet-combo-open");
const dialog = document.querySelector("#sheet-combo-dialog");
const list = document.querySelector("#sheet-combo-list");
const count = document.querySelector("#sheet-combo-count");
const message = document.querySelector("#sheet-combo-message");
const editor = document.querySelector("#sheet-combo-editor");
const form = document.querySelector("#sheet-combo-form");
const deleteButton = document.querySelector("#sheet-combo-delete");
const skillOptions = document.querySelector("#sheet-combo-skill-options");
const counterSkill = document.querySelector("#sheet-counter-skill");
const entrySummary = document.querySelector("#sheet-combo-summary");
const bottomComboButton = document.querySelector("#sheet-combo-bottom-add");
const bottomCounterButton = document.querySelector("#sheet-counter-bottom-add");
const entryList = document.querySelector("#sheet-combo-entry-list");
const entryCount = document.querySelector("#sheet-combo-entry-count");

const ABILITY_LABELS = {
  reason: "♠ 理性",
  passion: "♣ 感情",
  life: "♥ 生命",
  mundane: "♦ 外界"
};

const CATEGORY_LABELS = {
  general: "一般技能",
  social: "社会",
  connection: "コネ",
  style: "スタイル技能"
};

let currentUser = null;
let character = null;
let combos = [];
let skillCatalog = [];
let saving = false;
let managerReturnFocus = null;
let editorReturnFocus = null;

if (openButton && dialog && list && form) {
  setupEvents();
  initialize();
}

async function initialize() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  const publicId = new URLSearchParams(location.search).get("id")?.trim();
  if (!publicId) {
    setOpenAvailability(false, "キャストを保存するとコンボを登録できます。");
    return;
  }

  await loadCharacter(publicId);

  if (character && location.hash === "#combos") {
    await openManager({ updateHash: false });
  } else if (character) {
    await loadCombos();
  }
}

function setupEvents() {
  openButton.addEventListener("click", () => {
    managerReturnFocus = openButton;
    openManager();
  });
  bottomComboButton?.addEventListener("click", event => openFromEntry(event.currentTarget, "combo"));
  bottomCounterButton?.addEventListener("click", event => openFromEntry(event.currentTarget, "counter"));
  document.querySelector("#sheet-combo-close")?.addEventListener("click", () => dialog.close());
  document.querySelector("#sheet-combo-add")?.addEventListener("click", event => openEditor("combo", null, event.currentTarget));
  document.querySelector("#sheet-counter-add")?.addEventListener("click", event => openEditor("counter", null, event.currentTarget));
  document.querySelector("#sheet-combo-editor-close")?.addEventListener("click", () => closeEditor({ restoreFocus: true }));
  document.querySelector("#sheet-combo-cancel")?.addEventListener("click", () => closeEditor({ restoreFocus: true }));
  deleteButton?.addEventListener("click", deleteCurrentEntry);
  form.addEventListener("submit", saveEntry);

  list.addEventListener("click", event => {
    const target = event.target.closest("[data-sheet-combo-id]");
    if (!target) return;
    const combo = combos.find(item => String(item.id) === target.dataset.sheetComboId);
    if (combo) openEditor(isCounterEntry(combo) ? "counter" : "combo", combo, target);
  });

  entryList?.addEventListener("click", event => {
    const target = event.target.closest("[data-sheet-combo-id]");
    if (!target) return;
    openExistingFromEntry(target);
  });

  skillOptions?.addEventListener("change", event => {
    const checkbox = event.target.closest("input[type='checkbox'][data-skill-name]");
    if (!checkbox) return;
    updateCombinationFromPicker(checkbox.dataset.skillName, checkbox.checked);
  });

  document.querySelector("#sheet-combo-skills")?.addEventListener("input", syncSkillPicker);
  dialog.addEventListener("keydown", trapDialogFocus);

  dialog.addEventListener("close", () => {
    openButton.classList.remove("is-active");
    openButton.setAttribute("aria-pressed", "false");
    closeEditor();
    if (location.hash === "#combos") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
    const returnTarget = managerReturnFocus?.isConnected ? managerReturnFocus : openButton;
    managerReturnFocus = null;
    requestAnimationFrame(() => returnTarget?.focus());
  });
  dialog.addEventListener("cancel", event => {
    if (saving) event.preventDefault();
  });

  window.addEventListener("tnx:character-saved", async event => {
    const saved = event.detail;
    if (!saved?.id || !saved?.publicId) return;
    character = {
      id: saved.id,
      public_id: saved.publicId,
      character_name: document.querySelector("#character-name")?.value?.trim() || ""
    };
    setOpenAvailability(true);
    await loadCombos();
  });
}

async function loadCharacter(publicId) {
  const { data, error } = await supabase
    .from("characters")
    .select("id, public_id, character_name, owner_id")
    .eq("public_id", publicId)
    .eq("owner_id", currentUser.id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error(error);
    setOpenAvailability(false, "コンボ編集を利用できません。");
    return;
  }

  character = data;
  setOpenAvailability(true);
}

function setOpenAvailability(enabled, title = "") {
  [openButton, bottomComboButton, bottomCounterButton].filter(Boolean).forEach(button => {
    button.disabled = !enabled;
    button.title = title;
    button.setAttribute("aria-disabled", String(!enabled));
  });
  openButton.setAttribute("aria-pressed", "false");
  if (entrySummary) {
    entrySummary.textContent = enabled ? "登録状況を確認中…" : (title || "キャストを保存すると利用できます。");
    entrySummary.dataset.state = enabled ? "loading" : "disabled";
  }
  if (entryCount) entryCount.textContent = "—";
  if (entryList) {
    entryList.innerHTML = enabled
      ? `<p class="sheet-combo-entry__empty">登録データを読み込み中… <small>SCANNING RUNTIME DATA...</small></p>`
      : `<p class="sheet-combo-entry__empty">キャストを保存すると登録データを表示できます。<small>SAVE CAST TO ENABLE RUNTIME DATA</small></p>`;
  }
}

async function openFromEntry(origin, mode = null) {
  if (!character || saving) return;
  managerReturnFocus = origin;
  await openManager();
  if (!mode) return;

  const modalOrigin = document.querySelector(mode === "counter" ? "#sheet-counter-add" : "#sheet-combo-add");
  await openEditor(mode, null, modalOrigin);
}

async function openExistingFromEntry(origin) {
  if (!character || saving) return;
  const comboId = String(origin?.dataset.sheetComboId || "");
  if (!comboId) return;

  managerReturnFocus = origin;
  await openManager();

  const combo = combos.find(item => String(item.id) === comboId);
  if (!combo) {
    setMessage("選択したデータが見つかりませんでした。", "error");
    return;
  }

  const refreshedEntryOrigin = findComboButton(entryList, comboId);
  if (refreshedEntryOrigin) managerReturnFocus = refreshedEntryOrigin;

  const modalOrigin = findComboButton(list, comboId);
  await openEditor(isCounterEntry(combo) ? "counter" : "combo", combo, modalOrigin);
}

function findComboButton(container, comboId) {
  if (!container) return null;
  return [...container.querySelectorAll("[data-sheet-combo-id]")]
    .find(button => button.dataset.sheetComboId === String(comboId)) || null;
}

async function openManager(options = {}) {
  if (!character || saving) return;

  openButton.classList.add("is-active");
  openButton.setAttribute("aria-pressed", "true");

  if (options.updateHash !== false && location.hash !== "#combos") {
    history.replaceState(null, "", `${location.pathname}${location.search}#combos`);
  }

  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => document.querySelector("#sheet-combo-add")?.focus());
  list.innerHTML = `<p class="sheet-combo-empty">読み込み中… <small>SCANNING COMBO DATA...</small></p>`;
  count.textContent = "—";
  setMessage("コンボデータへアクセス中…", "loading");

  await Promise.all([loadCombos(), refreshSkillCatalog()]);
}

async function loadCombos() {
  if (!character) return;

  const { data, error } = await supabase
    .from("character_combos")
    .select("*")
    .eq("character_id", character.id)
    .order("sort_order")
    .order("name");

  if (error) {
    console.error(error);
    combos = [];
    renderList();
    if (entrySummary) {
      entrySummary.textContent = "登録状況を取得できませんでした。";
      entrySummary.dataset.state = "error";
    }
    setMessage("コンボ情報を取得できませんでした。", "error");
    return;
  }

  combos = data ?? [];
  renderList();
  setMessage(`${combos.length}件のデータを読み込みました。`, "success");
}

function renderList() {
  count.textContent = String(combos.length);
  renderEntrySummary();
  renderEntryList();

  if (!combos.length) {
    list.innerHTML = `<p class="sheet-combo-empty">コンボ／技能カウンターは未登録です。<small>NO RUNTIME DATA</small></p>`;
    return;
  }

  list.innerHTML = combos.map(combo => {
    const counter = isCounterEntry(combo);
    const limit = positiveInteger(combo.act_use_limit);
    const ability = ABILITY_LABELS[String(combo.ability || "").toLowerCase()] || "";
    const details = counter
      ? [limit ? `1アクト ${limit}回` : "", "使用回数カウンター"].filter(Boolean)
      : [ability, combo.modifier ? `修正 ${combo.modifier}` : "", combo.target_value ? `目安 ${combo.target_value}` : "", limit ? `${limit}回/ACT` : ""].filter(Boolean);

    return `
      <button class="sheet-combo-list-card${counter ? " is-counter" : ""}" type="button" data-sheet-combo-id="${escapeAttribute(combo.id)}">
        <span class="sheet-combo-list-card__kind">${counter ? "COUNTER" : "COMBO"}</span>
        <strong>${escapeHtml(combo.name || "名称未登録")}</strong>
        <span class="sheet-combo-list-card__skills">${escapeHtml(combo.skills || "組み合わせ技能なし")}</span>
        <small>${escapeHtml(details.join(" / ") || "詳細未登録")}</small>
      </button>`;
  }).join("");
}

function renderEntryList() {
  if (!entryList) return;
  if (entryCount) entryCount.textContent = String(combos.length);

  if (!combos.length) {
    entryList.innerHTML = `<p class="sheet-combo-entry__empty">登録済みコンボ／技能カウンターはありません。<small>NO RUNTIME DATA</small></p>`;
    return;
  }

  entryList.innerHTML = combos.map(combo => {
    const counter = isCounterEntry(combo);
    const limit = positiveInteger(combo.act_use_limit);
    const ability = ABILITY_LABELS[String(combo.ability || "").toLowerCase()] || "";
    const details = counter
      ? [limit ? `1アクト ${limit}回` : "", "使用回数カウンター"].filter(Boolean)
      : [ability, combo.modifier ? `修正 ${combo.modifier}` : "", combo.target_value ? `目安 ${combo.target_value}` : "", limit ? `${limit}回/ACT` : ""].filter(Boolean);

    const kindLabel = counter ? "技能カウンター" : "コンボ";
    const name = combo.name || "名称未登録";

    return `
      <button class="sheet-combo-entry-card${counter ? " is-counter" : ""}" type="button" data-sheet-combo-id="${escapeAttribute(combo.id)}" aria-label="${escapeAttribute(`${kindLabel}「${name}」を編集`)}">
        <span class="sheet-combo-entry-card__kind">${counter ? "COUNTER" : "COMBO"}</span>
        <strong>${escapeHtml(name)}</strong>
        <span class="sheet-combo-entry-card__skills">${escapeHtml(counter ? (details.join(" / ") || "詳細未登録") : (combo.skills || "組み合わせ技能なし"))}</span>
        ${counter ? "" : `<small>${escapeHtml(details.join(" / ") || "詳細未登録")}</small>`}
      </button>`;
  }).join("");
}

function renderEntrySummary() {
  if (!entrySummary) return;
  const counterCount = combos.filter(isCounterEntry).length;
  const comboCount = combos.length - counterCount;
  entrySummary.innerHTML = `登録済み：コンボ <strong>${comboCount}</strong>件 <span aria-hidden="true">｜</span> 技能カウンター <strong>${counterCount}</strong>件`;
  entrySummary.dataset.state = "ready";
}

async function refreshSkillCatalog() {
  const fromDom = skillCatalogFromDom();
  if (fromDom.length) {
    skillCatalog = fromDom;
    renderSkillSelectors();
    return;
  }

  if (!character) return;
  const { data, error } = await supabase
    .from("character_skills")
    .select("category, name, level, skill_kind, sort_order")
    .eq("character_id", character.id)
    .order("sort_order");

  if (error) {
    console.error(error);
    skillCatalog = [];
  } else {
    skillCatalog = normalizeSkillCatalog(data ?? []);
  }
  renderSkillSelectors();
}

function skillCatalogFromDom() {
  const rows = [...document.querySelectorAll("[data-skill-category] tr[data-skill-key]")];
  return normalizeSkillCatalog(rows.map(row => ({
    category: row.closest("[data-skill-category]")?.dataset.skillCategory || "",
    name: row.querySelector('[data-f="name"]')?.value || "",
    level: Number(row.querySelector('[data-f="level"]')?.value || 0),
    skill_kind: row.querySelector('[data-f="skill_kind"]')?.value || "",
    sort_order: rows.indexOf(row)
  })));
}

function normalizeSkillCatalog(items) {
  const seen = new Set();
  return items
    .map(item => ({
      category: String(item.category || ""),
      name: String(item.name || "").trim(),
      level: Number(item.level || 0),
      skill_kind: String(item.skill_kind || ""),
      sort_order: Number(item.sort_order || 0)
    }))
    .filter(item => item.name && item.level > 0 && CATEGORY_LABELS[item.category])
    .filter(item => !(item.category === "style" && item.skill_kind === "none"))
    .filter(item => {
      const key = `${item.category}\u0000${item.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderSkillSelectors() {
  if (skillOptions) {
    skillOptions.innerHTML = Object.entries(CATEGORY_LABELS).map(([category, label]) => {
      const items = skillCatalog.filter(item => item.category === category);
      if (!items.length) return "";
      return `
        <div class="sheet-combo-skill-group">
          <span>${escapeHtml(label)}</span>
          <div>${items.map(item => `
            <label><input type="checkbox" data-skill-name="${escapeAttribute(item.name)}"><span>${escapeHtml(item.name)}</span></label>
          `).join("")}</div>
        </div>`;
    }).join("");
  }

  if (counterSkill) {
    const styleSkills = skillCatalog.filter(item => item.category === "style");
    counterSkill.innerHTML = `<option value="">スタイル技能を選択</option>${styleSkills.map(item => `
      <option value="${escapeAttribute(item.name)}">${escapeHtml(item.name)} / LV${item.level}</option>
    `).join("")}`;
  }
}

async function openEditor(mode, combo = null, returnTarget = null) {
  editorReturnFocus = returnTarget?.isConnected ? returnTarget : document.activeElement;
  await refreshSkillCatalog();
  form.reset();
  setValue("sheet-combo-id", combo?.id || "");
  setValue("sheet-combo-mode", mode);
  setValue("sheet-combo-sort-order", combo?.sort_order ?? nextSortOrder());

  if (mode === "counter") {
    const currentSkill = String(combo?.skills || combo?.name || "").trim();
    if (currentSkill && counterSkill && ![...counterSkill.options].some(option => option.value === currentSkill)) {
      counterSkill.add(new Option(`${currentSkill} / シート外`, currentSkill));
    }
    setValue("sheet-counter-skill", currentSkill);
    setValue("sheet-counter-limit", combo?.act_use_limit || "");
  } else if (combo) {
    setValue("sheet-combo-name", combo.name);
    setValue("sheet-combo-ability", combo.ability);
    setValue("sheet-combo-skills", combo.skills);
    setValue("sheet-combo-modifier", combo.modifier);
    setValue("sheet-combo-target-value", combo.target_value);
    setValue("sheet-combo-timing", combo.timing);
    setValue("sheet-combo-target", combo.target);
    setValue("sheet-combo-range", combo.range);
    setValue("sheet-combo-act-use-limit", combo.act_use_limit);
    setValue("sheet-combo-description", combo.description);
  }

  applyEditorMode(mode, Boolean(combo));
  syncSkillPicker();
  deleteButton.hidden = !combo;
  document.querySelector(".sheet-combo-workspace")?.classList.add("has-editor");
  editor.hidden = false;
  editor.scrollTop = 0;

  requestAnimationFrame(() => {
    const focusTarget = mode === "counter" ? counterSkill : document.querySelector("#sheet-combo-name");
    focusTarget?.focus();
  });
}

function applyEditorMode(mode, editing) {
  const counterMode = mode === "counter";
  document.querySelector("#sheet-combo-mode-badge").textContent = counterMode ? "COUNTER" : "COMBO";
  document.querySelector("#sheet-combo-editor-title").textContent = editing
    ? (counterMode ? "技能カウンターを編集" : "コンボを編集")
    : (counterMode ? "技能カウンターを追加" : "コンボを追加");

  document.querySelectorAll("[data-combo-field]").forEach(field => {
    field.hidden = field.dataset.comboField !== mode;
  });
  editor.classList.toggle("is-counter-mode", counterMode);
}

function closeEditor(options = {}) {
  if (saving || !editor) return;
  const returnTarget = editorReturnFocus;
  editorReturnFocus = null;
  editor.hidden = true;
  document.querySelector(".sheet-combo-workspace")?.classList.remove("has-editor");
  form.reset();
  deleteButton.hidden = true;
  if (options.restoreFocus) {
    const fallback = document.querySelector("#sheet-combo-add");
    requestAnimationFrame(() => {
      const target = returnTarget?.isConnected && !returnTarget.closest("[hidden]") ? returnTarget : fallback;
      target?.focus();
    });
  }
}

function trapDialogFocus(event) {
  if (event.key !== "Tab" || !dialog.open) return;

  const focusable = [...dialog.querySelectorAll(
    "a[href], button:not([disabled]), input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
  )].filter(element => !element.closest("[hidden]") && element.getClientRects().length > 0);

  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function nextSortOrder() {
  if (!combos.length) return 0;
  return Math.max(...combos.map(combo => Number(combo.sort_order || 0))) + 1;
}

function updateCombinationFromPicker(skillName, checked) {
  const input = document.querySelector("#sheet-combo-skills");
  if (!input) return;

  const names = splitCombination(input.value);
  const index = names.indexOf(skillName);
  if (checked && index < 0) names.push(skillName);
  if (!checked && index >= 0) names.splice(index, 1);
  input.value = names.join("＋");
  syncSkillPicker();
}

function syncSkillPicker() {
  const selected = new Set(splitCombination(document.querySelector("#sheet-combo-skills")?.value || ""));
  skillOptions?.querySelectorAll("input[data-skill-name]").forEach(checkbox => {
    checkbox.checked = selected.has(checkbox.dataset.skillName);
  });
}

function splitCombination(value) {
  return String(value || "")
    .split(/[＋+]/)
    .map(item => item.trim())
    .filter(Boolean);
}

async function saveEntry(event) {
  event.preventDefault();
  if (saving || !character) return;

  const mode = value("sheet-combo-mode") === "counter" ? "counter" : "combo";
  const comboId = value("sheet-combo-id");
  let payload;

  if (mode === "counter") {
    const skillName = value("sheet-counter-skill");
    const limit = positiveInteger(value("sheet-counter-limit"));
    if (!skillName || !limit) {
      setMessage("スタイル技能と1アクト使用上限を指定してください。", "error");
      return;
    }
    payload = {
      character_id: character.id,
      name: skillName,
      skills: skillName,
      ability: "",
      modifier: "",
      target_value: "",
      timing: "",
      target: "",
      range: "",
      act_use_limit: limit,
      description: "",
      sort_order: integer(value("sheet-combo-sort-order")) ?? nextSortOrder()
    };
  } else {
    const name = value("sheet-combo-name");
    const skills = value("sheet-combo-skills");
    if (!name || !skills) {
      setMessage("コンボ名と組み合わせ技能を入力してください。", "error");
      return;
    }
    payload = {
      character_id: character.id,
      name,
      skills,
      ability: value("sheet-combo-ability"),
      modifier: value("sheet-combo-modifier"),
      target_value: value("sheet-combo-target-value"),
      timing: value("sheet-combo-timing"),
      target: value("sheet-combo-target"),
      range: value("sheet-combo-range"),
      act_use_limit: positiveInteger(value("sheet-combo-act-use-limit")),
      description: value("sheet-combo-description"),
      sort_order: integer(value("sheet-combo-sort-order")) ?? nextSortOrder()
    };
  }

  saving = true;
  setEditorDisabled(true);
  setMessage("保存中…", "loading");

  try {
    const result = comboId
      ? await supabase.from("character_combos").update(payload).eq("id", comboId).eq("character_id", character.id)
      : await supabase.from("character_combos").insert(payload);

    if (result.error) throw result.error;
    saving = false;
    setEditorDisabled(false);
    closeEditor();
    await loadCombos();
    setMessage(mode === "counter" ? "技能カウンターを保存しました。" : "コンボを保存しました。", "success");
  } catch (error) {
    console.error(error);
    setMessage("保存に失敗しました。既存データは変更されていません。", "error");
  } finally {
    saving = false;
    setEditorDisabled(false);
  }
}

async function deleteCurrentEntry() {
  const comboId = value("sheet-combo-id");
  if (!comboId || saving || !character) return;

  const combo = combos.find(item => String(item.id) === comboId);
  if (!window.confirm(`「${combo?.name || "登録データ"}」を削除します。`)) return;

  saving = true;
  setEditorDisabled(true);
  try {
    const { error } = await supabase
      .from("character_combos")
      .delete()
      .eq("id", comboId)
      .eq("character_id", character.id);
    if (error) throw error;

    saving = false;
    setEditorDisabled(false);
    closeEditor();
    await loadCombos();
    setMessage("登録データを削除しました。", "success");
  } catch (error) {
    console.error(error);
    setMessage("削除に失敗しました。", "error");
  } finally {
    saving = false;
    setEditorDisabled(false);
  }
}

function isCounterEntry(combo) {
  const name = String(combo?.name || "").trim();
  const skills = String(combo?.skills || "").trim();
  if (!name || name !== skills || !positiveInteger(combo?.act_use_limit)) return false;

  return [
    combo.ability, combo.ability_key, combo.modifier, combo.target_value, combo.achievement,
    combo.timing, combo.target, combo.range, combo.difficulty, combo.confrontation,
    combo.description, combo.effect
  ].every(item => !String(item ?? "").trim());
}

function setEditorDisabled(disabled) {
  form.querySelectorAll("input, select, textarea, button").forEach(control => {
    control.disabled = disabled;
  });
  document.querySelector("#sheet-combo-close").disabled = disabled;
  document.querySelector("#sheet-combo-add").disabled = disabled;
  document.querySelector("#sheet-counter-add").disabled = disabled;
}

function setMessage(text, state = "") {
  message.textContent = text;
  message.dataset.state = state;
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, newValue) {
  const element = document.getElementById(id);
  if (element) element.value = newValue ?? "";
}

function positiveInteger(input) {
  const parsed = Number.parseInt(input, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function integer(input) {
  const parsed = Number.parseInt(input, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
