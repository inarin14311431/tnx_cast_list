import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { SITE_BASE_PATH } from "./config.js";
import { STYLE_DATA } from "./style-data.js";

const form = document.querySelector("#edit-form");

const steps = [
  ...document.querySelectorAll("[data-step]")
];

const stepButtons = [
  ...document.querySelectorAll("[data-step-button]")
];

const previousButton =
  document.querySelector("#previous-button");

const nextButton =
  document.querySelector("#next-button");

const submitButton =
  document.querySelector("#submit-button");

const messageArea =
  document.querySelector("#edit-message");

const styleValidationMessage =
  document.querySelector("#style-validation-message");

let currentStep = 1;
let currentUser = null;
let character = null;
let submitting = false;

initialize();

async function initialize() {
  currentUser = await requireAuth();

  if (!currentUser) {
    return;
  }

  populateStyleSelects();
  setupEvents();

  const publicId = getPublicId();

  if (!publicId) {
    showFatalError("キャストIDが指定されていません。");
    return;
  }

  await loadCharacter(publicId);
}

function getPublicId() {
  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("id")?.trim() ?? "";
}

async function loadCharacter(publicId) {
  setMessage("ACCESSING CAST DATA...", "loading");

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", publicId)
    .eq("owner_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    showFatalError("キャスト情報の取得に失敗しました。");
    return;
  }

  if (!data) {
    showFatalError(
      "指定されたキャストを編集する権限がありません。"
    );
    return;
  }

  character = data;

  populateForm(data);
  updateDivineWorks();
  validateStyleMarks();
  updateStepDisplay();

  const returnLink =
    document.querySelector("#return-to-cast");

  if (returnLink) {
    returnLink.href =
      `${SITE_BASE_PATH}cast.html?id=` +
      encodeURIComponent(character.public_id);
  }

  setMessage(
    `EDIT MODE: ${character.public_id}`,
    "success"
  );
}

function populateForm(data) {
  const values = {
    player_name: data.player_name,
    character_name: data.character_name,
    character_kana: data.character_kana,
    handle: data.handle,
    affiliation: data.affiliation,
    citizen_rank: data.citizen_rank,
    experience_points: data.experience_points,

    age: data.age,
    gender: data.gender,
    height: data.height,
    weight: data.weight,
    eyes: data.eyes,
    hair: data.hair,
    skin: data.skin,

    summary: data.summary,
    profile: data.profile,

    life_path_origin: data.life_path_origin,
    life_path_experience: data.life_path_experience,
    life_path_encounter: data.life_path_encounter,

    style_1: data.style_1,
    style_1_mark: data.style_1_mark,
    divine_1: data.divine_1,

    style_2: data.style_2,
    style_2_mark: data.style_2_mark,
    divine_2: data.divine_2,

    style_3: data.style_3,
    style_3_mark: data.style_3_mark,
    divine_3: data.divine_3,

    reason_value: data.reason_value,
    reason_control: data.reason_control,

    passion_value: data.passion_value,
    passion_control: data.passion_control,

    life_value: data.life_value,
    life_control: data.life_control,

    mundane_value: data.mundane_value,
    mundane_control: data.mundane_control,

    cs: data.cs,
    visibility: data.visibility
  };

  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);

    if (!field) {
      return;
    }

    field.value = value ?? "";
  });

  const publicIdField =
    document.querySelector("#public-id");

  if (publicIdField) {
    publicIdField.value = data.public_id;
  }
}

function setupEvents() {
  previousButton.addEventListener("click", () => {
    moveToStep(currentStep - 1);
  });

  nextButton.addEventListener("click", () => {
    if (!validateStep(currentStep)) {
      return;
    }

    moveToStep(currentStep + 1);
  });

  stepButtons.forEach(button => {
    button.addEventListener("click", () => {
      const target =
        Number(button.dataset.stepButton);

      if (target > currentStep) {
        for (
          let step = currentStep;
          step < target;
          step += 1
        ) {
          if (!validateStep(step)) {
            moveToStep(step);
            return;
          }
        }
      }

      moveToStep(target);
    });
  });

  form.addEventListener("change", event => {
    if (
      event.target.matches(
        "#style-1, #style-2, #style-3"
      )
    ) {
      updateDivineWorks();
    }

    if (
      event.target.matches(
        "#style-1, #style-2, #style-3," +
        "#style-1-mark, #style-2-mark, #style-3-mark"
      )
    ) {
      validateStyleMarks();
    }
  });

  form.addEventListener("submit", handleSubmit);
}

function populateStyleSelects() {
  const options = [
    `<option value="">選択してください</option>`,
    ...STYLE_DATA.map(style => `
      <option value="${escapeHtml(style.name)}">
        ${escapeHtml(style.name)}
      </option>
    `)
  ].join("");

  for (let index = 1; index <= 3; index += 1) {
    document.querySelector(
      `#style-${index}`
    ).innerHTML = options;
  }
}

function updateDivineWorks() {
  for (let index = 1; index <= 3; index += 1) {
    const styleName = document.querySelector(
      `#style-${index}`
    ).value;

    const style = STYLE_DATA.find(
      item => item.name === styleName
    );

    const divineField = document.querySelector(
      `#divine-${index}`
    );

    if (style?.divine) {
      divineField.value = style.divine;
    }
  }
}

function moveToStep(stepNumber) {
  currentStep = Math.min(
    Math.max(stepNumber, 1),
    steps.length
  );

  updateStepDisplay();

  if (currentStep === 4) {
    renderPreview();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function updateStepDisplay() {
  steps.forEach(step => {
    step.classList.toggle(
      "is-active",
      Number(step.dataset.step) === currentStep
    );
  });

  stepButtons.forEach(button => {
    const number =
      Number(button.dataset.stepButton);

    button.classList.toggle(
      "is-active",
      number === currentStep
    );

    button.classList.toggle(
      "is-complete",
      number < currentStep
    );
  });

  previousButton.hidden = currentStep === 1;
  nextButton.hidden = currentStep === steps.length;
  submitButton.hidden = currentStep !== steps.length;
}

function validateStep(stepNumber) {
  const step = document.querySelector(
    `[data-step="${stepNumber}"]`
  );

  const requiredFields = [
    ...step.querySelectorAll("[required]")
  ];

  for (const field of requiredFields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  if (stepNumber === 2) {
    return validateStyleMarks();
  }

  return true;
}

function validateStyleMarks() {
  const styles = [1, 2, 3].map(index =>
    getValue(`style_${index}`)
  );

  if (styles.some(style => !style)) {
    setStyleMessage(
      "3枠すべてのスタイルを選択してください。",
      "error"
    );

    return false;
  }

  const marks = [1, 2, 3].map(index =>
    getValue(`style_${index}_mark`)
  );

  const personaCount = marks.filter(
    mark => mark.includes("◎")
  ).length;

  const keyCount = marks.filter(
    mark => mark.includes("●")
  ).length;

  if (personaCount !== 1 || keyCount !== 1) {
    setStyleMessage(
      "◎ペルソナと●キーは、それぞれ1つだけ指定してください。",
      "error"
    );

    return false;
  }

  setStyleMessage(
    "STYLE CONFIGURATION VALID",
    "success"
  );

  return true;
}

function renderPreview() {
  const styles = [1, 2, 3]
    .map(index => {
      return (
        getValue(`style_${index}`) +
        getValue(`style_${index}_mark`)
      );
    })
    .join(" / ");

  const handle = getValue("handle");

  document.querySelector(
    "#register-preview"
  ).innerHTML = `
    <article class="preview-card">
      <p class="preview-card__label">
        UPDATED CAST DATA
      </p>

      <p class="preview-card__handle">
        ${escapeHtml(
          handle ? `“${handle}”` : "NO HANDLE"
        )}
      </p>

      <h3>
        ${escapeHtml(getValue("character_name"))}
      </h3>

      <p class="preview-card__styles">
        ${escapeHtml(styles)}
      </p>

      <dl>
        <div>
          <dt>PUBLIC ID</dt>
          <dd>${escapeHtml(character.public_id)}</dd>
        </div>

        <div>
          <dt>PLAYER</dt>
          <dd>
            ${escapeHtml(getValue("player_name"))}
          </dd>
        </div>

        <div>
          <dt>VISIBILITY</dt>
          <dd>
            ${escapeHtml(
              getValue("visibility").toUpperCase()
            )}
          </dd>
        </div>

        <div>
          <dt>EXP</dt>
          <dd>
            ${escapeHtml(
              getValue("experience_points") || "0"
            )}
          </dd>
        </div>
      </dl>
    </article>
  `;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (submitting || !character) {
    return;
  }

  for (
    let step = 1;
    step <= 3;
    step += 1
  ) {
    if (!validateStep(step)) {
      moveToStep(step);
      return;
    }
  }

  submitting = true;
  setSubmitting(true);
  setMessage("UPDATING CAST DATA...", "loading");

  try {
    const payload = createPayload();

    const { data, error } = await supabase
      .from("characters")
      .update(payload)
      .eq("id", character.id)
      .eq("owner_id", currentUser.id)
      .select("public_id")
      .single();

    if (error) {
      throw error;
    }

    setMessage(
      `UPDATE COMPLETE: ${data.public_id}`,
      "success"
    );

    window.setTimeout(() => {
      window.location.replace(
        `${window.location.origin}` +
        `${SITE_BASE_PATH}cast.html?id=` +
        encodeURIComponent(data.public_id)
      );
    }, 700);
  } catch (error) {
    console.error("Character update failed:", error);

    setMessage(
      translateUpdateError(error),
      "error"
    );
  } finally {
    submitting = false;
    setSubmitting(false);
  }
}

function createPayload() {
  return {
    player_name: getValue("player_name"),
    character_name: getValue("character_name"),
    character_kana: getValue("character_kana"),
    handle: getValue("handle"),
    affiliation: getValue("affiliation"),
    citizen_rank: getValue("citizen_rank"),

    experience_points:
      getIntegerValue("experience_points") ?? 0,

    age: getValue("age"),
    gender: getValue("gender"),
    height: getValue("height"),
    weight: getValue("weight"),
    eyes: getValue("eyes"),
    hair: getValue("hair"),
    skin: getValue("skin"),

    summary: getValue("summary"),
    profile: getValue("profile"),

    life_path_origin:
      getValue("life_path_origin"),

    life_path_experience:
      getValue("life_path_experience"),

    life_path_encounter:
      getValue("life_path_encounter"),

    style_1: getValue("style_1"),
    style_1_mark: getValue("style_1_mark"),
    divine_1: getValue("divine_1"),

    style_2: getValue("style_2"),
    style_2_mark: getValue("style_2_mark"),
    divine_2: getValue("divine_2"),

    style_3: getValue("style_3"),
    style_3_mark: getValue("style_3_mark"),
    divine_3: getValue("divine_3"),

    reason_value:
      getIntegerValue("reason_value"),

    reason_control:
      getIntegerValue("reason_control"),

    passion_value:
      getIntegerValue("passion_value"),

    passion_control:
      getIntegerValue("passion_control"),

    life_value:
      getIntegerValue("life_value"),

    life_control:
      getIntegerValue("life_control"),

    mundane_value:
      getIntegerValue("mundane_value"),

    mundane_control:
      getIntegerValue("mundane_control"),

    cs: getIntegerValue("cs"),

    visibility:
      getValue("visibility") || "draft"
  };
}

function getValue(name) {
  const field = form.elements.namedItem(name);

  return String(field?.value ?? "").trim();
}

function getIntegerValue(name) {
  const value = getValue(name);

  if (value === "") {
    return null;
  }

  const number = Number.parseInt(value, 10);

  return Number.isFinite(number)
    ? number
    : null;
}

function setSubmitting(disabled) {
  form
    .querySelectorAll(
      "input, select, textarea, button"
    )
    .forEach(element => {
      element.disabled = disabled;
    });
}

function setMessage(message, type) {
  messageArea.textContent = message;
  messageArea.className = "form-message";

  if (type) {
    messageArea.classList.add(
      `form-message--${type}`
    );
  }
}

function setStyleMessage(message, type) {
  styleValidationMessage.textContent = message;
  styleValidationMessage.className =
    `form-message form-message--${type}`;
}

function showFatalError(message) {
  setMessage(message, "error");

  form
    .querySelectorAll(
      "input, select, textarea, button"
    )
    .forEach(element => {
      element.disabled = true;
    });
}

function translateUpdateError(error) {
  const message = String(error?.message ?? "");

  if (
    message.includes(
      "new row violates row-level security policy"
    )
  ) {
    return "キャストを更新する権限がありません。";
  }

  if (
    message.includes(
      "JSON object requested, multiple"
    )
  ) {
    return "更新対象を特定できませんでした。";
  }

  return "キャスト情報の更新に失敗しました。";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}