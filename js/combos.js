import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { SITE_BASE_PATH } from "./config.js";

const comboList = document.querySelector("#combo-list");
const messageArea = document.querySelector("#combo-message");
const dialog = document.querySelector("#combo-dialog");
const form = document.querySelector("#combo-form");
const dialogTitle = document.querySelector("#combo-dialog-title");
const deleteButton = document.querySelector("#delete-combo-button");

const ABILITY_LABELS = {
  reason: "♠ 理性",
  passion: "♣ 感情",
  life: "♥ 生命",
  mundane: "♦ 外界"
};

let currentUser = null;
let character = null;
let combos = [];
let saving = false;

initialize();

async function initialize() {
  currentUser = await requireAuth();

  if (!currentUser) {
    return;
  }

  const publicId = new URLSearchParams(window.location.search)
    .get("id")
    ?.trim();

  if (!publicId) {
    showFatalError("キャストIDが指定されていません。");
    return;
  }

  setupEvents();
  await loadCharacter(publicId);
}

function setupEvents() {
  document.querySelector("#add-combo-button")
    .addEventListener("click", () => openComboDialog());

  document.querySelector("#close-dialog-button")
    .addEventListener("click", closeDialog);

  document.querySelector("#cancel-combo-button")
    .addEventListener("click", closeDialog);

  deleteButton.addEventListener("click", deleteCurrentCombo);
  form.addEventListener("submit", saveCombo);

  comboList.addEventListener("click", event => {
    const button = event.target.closest("[data-combo-id]");

    if (!button) {
      return;
    }

    const combo = combos.find(item => item.id === button.dataset.comboId);

    if (combo) {
      openComboDialog(combo);
    }
  });
}

async function loadCharacter(publicId) {
  setMessage("ACCESSING CAST DATA...", "loading");

  const { data, error } = await supabase
    .from("characters")
    .select("id, public_id, character_name, owner_id")
    .eq("public_id", publicId)
    .eq("owner_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    showFatalError("キャスト情報の取得に失敗しました。");
    return;
  }

  if (!data) {
    showFatalError("指定されたキャストを編集する権限がありません。");
    return;
  }

  character = data;

  document.querySelector("#character-id").textContent = character.public_id;
  document.querySelector("#character-name").textContent = character.character_name;
  document.querySelector("#return-to-cast").href =
    `${SITE_BASE_PATH}cast.html?id=${encodeURIComponent(character.public_id)}`;

  await loadCombos();
}

async function loadCombos() {
  comboList.textContent = "SCANNING COMBO DATA...";

  const { data, error } = await supabase
    .from("character_combos")
    .select("*")
    .eq("character_id", character.id)
    .order("sort_order")
    .order("name");

  if (error) {
    console.error(error);
    setMessage("コンボ情報を取得できませんでした。", "error");
    return;
  }

  combos = data ?? [];
  renderCombos();
  setMessage(`${combos.length} COMBO DATA DETECTED`, "success");
}

function renderCombos() {
  if (!combos.length) {
    comboList.innerHTML = `<p class="empty-data">NO COMBO DATA</p>`;
    return;
  }

  comboList.innerHTML = combos.map(createComboCard).join("");
}

function createComboCard(combo) {
  const ability = ABILITY_LABELS[combo.ability] ?? "能力未指定";

  const detail = [
    combo.timing,
    combo.target,
    combo.range,
    combo.cost
  ].filter(Boolean).join(" / ");

  return `
    <button
      class="combo-card"
      type="button"
      data-combo-id="${escapeAttribute(combo.id)}"
    >
      <div class="combo-card__head">
        <strong>${escapeHtml(combo.name)}</strong>
        <span>${escapeHtml(ability)}</span>
      </div>

      <p class="combo-card__skills">
        ${escapeHtml(combo.skills || "NO SKILL COMBINATION")}
      </p>

      <dl>
        <div>
          <dt>MODIFIER</dt>
          <dd>${escapeHtml(combo.modifier || "—")}</dd>
        </div>

        <div>
          <dt>VALUE</dt>
          <dd>${escapeHtml(combo.target_value || "—")}</dd>
        </div>
      </dl>

      <p class="combo-card__detail">
        ${escapeHtml(detail || "NO DETAIL")}
      </p>

      <p class="combo-card__description">
        ${escapeHtml(combo.description || "")}
      </p>
    </button>
  `;
}

function openComboDialog(combo = null) {
  form.reset();
  setField("sort_order", 0);

  if (combo) {
    dialogTitle.textContent = "EDIT COMBO";
    deleteButton.hidden = false;

    setField("id", combo.id);
    setField("name", combo.name);
    setField("skills", combo.skills);
    setField("ability", combo.ability);
    setField("modifier", combo.modifier);
    setField("target_value", combo.target_value);
    setField("timing", combo.timing);
    setField("target", combo.target);
    setField("range", combo.range);
    setField("cost", combo.cost);
    setField("description", combo.description);
    setField("sort_order", combo.sort_order);
  } else {
    dialogTitle.textContent = "ADD COMBO";
    deleteButton.hidden = true;
    setField("id", "");
  }

  dialog.showModal();
}

function closeDialog() {
  if (!saving) {
    dialog.close();
  }
}

async function saveCombo(event) {
  event.preventDefault();

  if (saving || !character || !form.reportValidity()) {
    return;
  }

  saving = true;
  setDialogDisabled(true);

  const comboId = getValue("id");

  const payload = {
    character_id: character.id,
    name: getValue("name"),
    skills: getValue("skills"),
    ability: getValue("ability"),
    modifier: getValue("modifier"),
    target_value: getValue("target_value"),
    timing: getValue("timing"),
    target: getValue("target"),
    range: getValue("range"),
    cost: getValue("cost"),
    description: getValue("description"),
    sort_order: getInteger("sort_order") ?? 0
  };

  try {
    let error;

    if (comboId) {
      ({ error } = await supabase
        .from("character_combos")
        .update(payload)
        .eq("id", comboId)
        .eq("character_id", character.id));
    } else {
      ({ error } = await supabase
        .from("character_combos")
        .insert(payload));
    }

    if (error) {
      throw error;
    }

    dialog.close();
    await loadCombos();
  } catch (error) {
    console.error(error);
    setMessage("コンボ情報の保存に失敗しました。", "error");
  } finally {
    saving = false;
    setDialogDisabled(false);
  }
}

async function deleteCurrentCombo() {
  const comboId = getValue("id");

  if (!comboId || saving) {
    return;
  }

  const combo = combos.find(item => item.id === comboId);

  if (!window.confirm(`「${combo?.name ?? "コンボ"}」を削除します。`)) {
    return;
  }

  saving = true;
  setDialogDisabled(true);

  try {
    const { error } = await supabase
      .from("character_combos")
      .delete()
      .eq("id", comboId)
      .eq("character_id", character.id);

    if (error) {
      throw error;
    }

    dialog.close();
    await loadCombos();
  } catch (error) {
    console.error(error);
    setMessage("コンボ情報の削除に失敗しました。", "error");
  } finally {
    saving = false;
    setDialogDisabled(false);
  }
}

function setField(name, value) {
  const field = form.elements.namedItem(name);

  if (field) {
    field.value = value ?? "";
  }
}

function getValue(name) {
  return String(form.elements.namedItem(name)?.value ?? "").trim();
}

function getInteger(name) {
  const value = getValue(name);

  if (!value) {
    return null;
  }

  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function setDialogDisabled(disabled) {
  form.querySelectorAll("input, select, textarea, button")
    .forEach(element => {
      element.disabled = disabled;
    });
}

function setMessage(message, type = "") {
  messageArea.textContent = message;
  messageArea.className = "combo-message";

  if (type) {
    messageArea.classList.add(`combo-message--${type}`);
  }
}

function showFatalError(message) {
  setMessage(message, "error");
  document.querySelector("#add-combo-button").disabled = true;
  comboList.innerHTML = `<p class="empty-data">${escapeHtml(message)}</p>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
