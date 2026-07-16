import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { SITE_BASE_PATH } from "./config.js";

const skillList = document.querySelector("#skill-list");
const messageArea = document.querySelector("#skill-message");
const dialog = document.querySelector("#skill-dialog");
const form = document.querySelector("#skill-form");
const dialogTitle = document.querySelector("#skill-dialog-title");
const deleteButton = document.querySelector("#delete-skill-button");

let currentUser = null;
let character = null;
let skills = [];
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
  document.querySelector("#add-skill-button")
    .addEventListener("click", () => openSkillDialog());

  document.querySelector("#close-dialog-button")
    .addEventListener("click", closeDialog);

  document.querySelector("#cancel-skill-button")
    .addEventListener("click", closeDialog);

  deleteButton.addEventListener("click", deleteCurrentSkill);
  form.addEventListener("submit", saveSkill);

  skillList.addEventListener("click", event => {
    const button = event.target.closest("[data-skill-id]");

    if (!button) {
      return;
    }

    const skill = skills.find(item => item.id === button.dataset.skillId);

    if (skill) {
      openSkillDialog(skill);
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

  await loadSkills();
}

async function loadSkills() {
  skillList.textContent = "SCANNING SKILL DATA...";

  const { data, error } = await supabase
    .from("character_skills")
    .select("*")
    .eq("character_id", character.id)
    .order("category")
    .order("sort_order")
    .order("name");

  if (error) {
    console.error(error);
    setMessage("技能情報を取得できませんでした。", "error");
    return;
  }

  skills = data ?? [];
  renderSkills();
  setMessage(`${skills.length} SKILL DATA DETECTED`, "success");
}

function renderSkills() {
  if (!skills.length) {
    skillList.innerHTML = `<p class="empty-data">NO SKILL DATA</p>`;
    return;
  }

  const categoryLabels = {
    general: "GENERAL SKILLS",
    social: "SOCIAL",
    connection: "CONNECTIONS",
    style: "STYLE SKILLS"
  };

  const grouped = skills.reduce((result, skill) => {
    (result[skill.category] ??= []).push(skill);
    return result;
  }, {});

  skillList.innerHTML = Object.entries(categoryLabels)
    .map(([category, label]) => {
      const items = grouped[category] ?? [];

      if (!items.length) {
        return "";
      }

      return `
        <section class="skill-category">
          <h3>${escapeHtml(label)}</h3>

          <div class="skill-category__items">
            ${items.map(createSkillCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function createSkillCard(skill) {
  const suits = [
    skill.reason ? "♠" : "",
    skill.passion ? "♣" : "",
    skill.life ? "♥" : "",
    skill.mundane ? "♦" : ""
  ].filter(Boolean).join(" ");

  const details = [
    skill.timing,
    skill.target,
    skill.range,
    skill.difficulty,
    skill.confrontation
  ].filter(Boolean).join(" / ");

  return `
    <button
      class="skill-card"
      type="button"
      data-skill-id="${escapeAttribute(skill.id)}"
    >
      <span class="skill-card__level">LV ${escapeHtml(skill.level)}</span>
      <strong>${escapeHtml(skill.name)}</strong>
      <span class="skill-card__suits">${escapeHtml(suits || "—")}</span>
      <span class="skill-card__details">${escapeHtml(details || "NO DETAIL")}</span>
    </button>
  `;
}

function openSkillDialog(skill = null) {
  form.reset();
  document.querySelector("#skill-level").value = "1";
  document.querySelector("#skill-sort-order").value = "0";

  if (skill) {
    dialogTitle.textContent = "EDIT SKILL";
    deleteButton.hidden = false;

    setField("id", skill.id);
    setField("category", skill.category);
    setField("name", skill.name);
    setField("level", skill.level);
    setField("sort_order", skill.sort_order);
    setChecked("reason", skill.reason);
    setChecked("passion", skill.passion);
    setChecked("life", skill.life);
    setChecked("mundane", skill.mundane);
    setField("timing", skill.timing);
    setField("target", skill.target);
    setField("range", skill.range);
    setField("difficulty", skill.difficulty);
    setField("confrontation", skill.confrontation);
    setField("description", skill.description);
  } else {
    dialogTitle.textContent = "ADD SKILL";
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

async function saveSkill(event) {
  event.preventDefault();

  if (saving || !character) {
    return;
  }

  if (!form.reportValidity()) {
    return;
  }

  saving = true;
  setDialogDisabled(true);

  const skillId = getValue("id");

  const payload = {
    character_id: character.id,
    category: getValue("category"),
    name: getValue("name"),
    level: getInteger("level") ?? 1,
    reason: getChecked("reason"),
    passion: getChecked("passion"),
    life: getChecked("life"),
    mundane: getChecked("mundane"),
    timing: getValue("timing"),
    target: getValue("target"),
    range: getValue("range"),
    difficulty: getValue("difficulty"),
    confrontation: getValue("confrontation"),
    description: getValue("description"),
    sort_order: getInteger("sort_order") ?? 0
  };

  try {
    let error;

    if (skillId) {
      ({ error } = await supabase
        .from("character_skills")
        .update(payload)
        .eq("id", skillId)
        .eq("character_id", character.id));
    } else {
      ({ error } = await supabase
        .from("character_skills")
        .insert(payload));
    }

    if (error) {
      throw error;
    }

    dialog.close();
    await loadSkills();
  } catch (error) {
    console.error(error);
    setMessage("技能情報の保存に失敗しました。", "error");
  } finally {
    saving = false;
    setDialogDisabled(false);
  }
}

async function deleteCurrentSkill() {
  const skillId = getValue("id");

  if (!skillId || saving) {
    return;
  }

  const skill = skills.find(item => item.id === skillId);

  if (!window.confirm(`「${skill?.name ?? "技能"}」を削除します。`)) {
    return;
  }

  saving = true;
  setDialogDisabled(true);

  try {
    const { error } = await supabase
      .from("character_skills")
      .delete()
      .eq("id", skillId)
      .eq("character_id", character.id);

    if (error) {
      throw error;
    }

    dialog.close();
    await loadSkills();
  } catch (error) {
    console.error(error);
    setMessage("技能情報の削除に失敗しました。", "error");
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

function setChecked(name, value) {
  const field = form.elements.namedItem(name);

  if (field) {
    field.checked = Boolean(value);
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

function getChecked(name) {
  return Boolean(form.elements.namedItem(name)?.checked);
}

function setDialogDisabled(disabled) {
  form.querySelectorAll("input, select, textarea, button")
    .forEach(element => {
      element.disabled = disabled;
    });
}

function setMessage(message, type = "") {
  messageArea.textContent = message;
  messageArea.className = "skill-message";

  if (type) {
    messageArea.classList.add(`skill-message--${type}`);
  }
}

function showFatalError(message) {
  setMessage(message, "error");
  document.querySelector("#add-skill-button").disabled = true;
  skillList.innerHTML = `<p class="empty-data">${escapeHtml(message)}</p>`;
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
