import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { SITE_BASE_PATH } from "./config.js";

const outfitList = document.querySelector("#outfit-list");
const messageArea = document.querySelector("#outfit-message");
const dialog = document.querySelector("#outfit-dialog");
const form = document.querySelector("#outfit-form");
const dialogTitle = document.querySelector("#outfit-dialog-title");
const deleteButton = document.querySelector("#delete-outfit-button");

const CATEGORY_LABELS = {
  weapon: "WEAPON",
  armor: "ARMOR",
  cyberware: "CYBERWARE",
  tron: "TRON",
  vehicle: "VEHICLE",
  residence: "RESIDENCE",
  other: "OTHER"
};

let currentUser = null;
let character = null;
let outfits = [];
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
  document.querySelector("#add-outfit-button")
    .addEventListener("click", () => openOutfitDialog());

  document.querySelector("#close-dialog-button")
    .addEventListener("click", closeDialog);

  document.querySelector("#cancel-outfit-button")
    .addEventListener("click", closeDialog);

  deleteButton.addEventListener("click", deleteCurrentOutfit);
  form.addEventListener("submit", saveOutfit);

  outfitList.addEventListener("click", event => {
    const button = event.target.closest("[data-outfit-id]");

    if (!button) {
      return;
    }

    const outfit = outfits.find(item => item.id === button.dataset.outfitId);

    if (outfit) {
      openOutfitDialog(outfit);
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

  await loadOutfits();
}

async function loadOutfits() {
  outfitList.textContent = "SCANNING OUTFIT DATA...";

  const { data, error } = await supabase
    .from("character_outfits")
    .select("*")
    .eq("character_id", character.id)
    .order("category")
    .order("sort_order")
    .order("name");

  if (error) {
    console.error(error);
    setMessage("アウトフィット情報を取得できませんでした。", "error");
    return;
  }

  outfits = data ?? [];
  renderOutfits();
  setMessage(`${outfits.length} OUTFIT DATA DETECTED`, "success");
}

function renderOutfits() {
  if (!outfits.length) {
    outfitList.innerHTML = `<p class="empty-data">NO OUTFIT DATA</p>`;
    return;
  }

  const grouped = outfits.reduce((result, outfit) => {
    (result[outfit.category] ??= []).push(outfit);
    return result;
  }, {});

  outfitList.innerHTML = Object.entries(CATEGORY_LABELS)
    .map(([category, label]) => {
      const items = grouped[category] ?? [];

      if (!items.length) {
        return "";
      }

      return `
        <section class="outfit-category">
          <h3>${escapeHtml(label)}</h3>

          <div class="outfit-category__items">
            ${items.map(createOutfitCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function createOutfitCard(outfit) {
  const specs = [
    outfit.purchase_value ? `購入 ${outfit.purchase_value}` : "",
    Number.isFinite(outfit.experience_cost) ? `EXP ${outfit.experience_cost}` : "",
    outfit.slot ? `部位 ${outfit.slot}` : "",
    outfit.range ? `射程 ${outfit.range}` : "",
    outfit.attack ? `攻撃 ${outfit.attack}` : "",
    outfit.defense ? `防御 ${outfit.defense}` : ""
  ].filter(Boolean).join(" / ");

  return `
    <button
      class="outfit-card"
      type="button"
      data-outfit-id="${escapeAttribute(outfit.id)}"
    >
      <strong>${escapeHtml(outfit.name)}</strong>
      <span class="outfit-card__specs">${escapeHtml(specs || "NO SPEC")}</span>
      <span class="outfit-card__description">${escapeHtml(outfit.description || "NO DESCRIPTION")}</span>
    </button>
  `;
}

function openOutfitDialog(outfit = null) {
  form.reset();
  document.querySelector("#experience-cost").value = "0";
  document.querySelector("#sort-order").value = "0";

  if (outfit) {
    dialogTitle.textContent = "EDIT OUTFIT";
    deleteButton.hidden = false;

    setField("id", outfit.id);
    setField("category", outfit.category);
    setField("name", outfit.name);
    setField("purchase_value", outfit.purchase_value);
    setField("experience_cost", outfit.experience_cost);
    setField("concealment", outfit.concealment);
    setField("electronic_control", outfit.electronic_control);
    setField("slot", outfit.slot);
    setField("range", outfit.range);
    setField("attack", outfit.attack);
    setField("defense", outfit.defense);
    setField("description", outfit.description);
    setField("sort_order", outfit.sort_order);
  } else {
    dialogTitle.textContent = "ADD OUTFIT";
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

async function saveOutfit(event) {
  event.preventDefault();

  if (saving || !character || !form.reportValidity()) {
    return;
  }

  saving = true;
  setDialogDisabled(true);

  const outfitId = getValue("id");

  const payload = {
    character_id: character.id,
    category: getValue("category"),
    name: getValue("name"),
    purchase_value: getValue("purchase_value"),
    experience_cost: getInteger("experience_cost") ?? 0,
    concealment: getValue("concealment"),
    electronic_control: getValue("electronic_control"),
    slot: getValue("slot"),
    range: getValue("range"),
    attack: getValue("attack"),
    defense: getValue("defense"),
    description: getValue("description"),
    sort_order: getInteger("sort_order") ?? 0
  };

  try {
    let error;

    if (outfitId) {
      ({ error } = await supabase
        .from("character_outfits")
        .update(payload)
        .eq("id", outfitId)
        .eq("character_id", character.id));
    } else {
      ({ error } = await supabase
        .from("character_outfits")
        .insert(payload));
    }

    if (error) {
      throw error;
    }

    dialog.close();
    await loadOutfits();
  } catch (error) {
    console.error(error);
    setMessage("アウトフィット情報の保存に失敗しました。", "error");
  } finally {
    saving = false;
    setDialogDisabled(false);
  }
}

async function deleteCurrentOutfit() {
  const outfitId = getValue("id");

  if (!outfitId || saving) {
    return;
  }

  const outfit = outfits.find(item => item.id === outfitId);

  if (!window.confirm(`「${outfit?.name ?? "アウトフィット"}」を削除します。`)) {
    return;
  }

  saving = true;
  setDialogDisabled(true);

  try {
    const { error } = await supabase
      .from("character_outfits")
      .delete()
      .eq("id", outfitId)
      .eq("character_id", character.id);

    if (error) {
      throw error;
    }

    dialog.close();
    await loadOutfits();
  } catch (error) {
    console.error(error);
    setMessage("アウトフィット情報の削除に失敗しました。", "error");
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
  messageArea.className = "outfit-message";

  if (type) {
    messageArea.classList.add(`outfit-message--${type}`);
  }
}

function showFatalError(message) {
  setMessage(message, "error");
  document.querySelector("#add-outfit-button").disabled = true;
  outfitList.innerHTML = `<p class="empty-data">${escapeHtml(message)}</p>`;
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
