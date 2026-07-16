import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";
import { SITE_BASE_PATH } from "./config.js";
import { STYLE_DATA } from "./style-data.js";

const form = document.querySelector("#register-form");
const steps = [...document.querySelectorAll("[data-step]")];
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
  document.querySelector("#register-message");

const styleValidationMessage =
  document.querySelector("#style-validation-message");

let currentStep = 1;
let currentUser = null;
let submitting = false;

initialize();

async function initialize() {
  currentUser = await requireAuth();

  if (!currentUser) {
    return;
  }

  populateStyleSelects();
  restoreDraft();
  setupEvents();
  updateStepDisplay();
}

function setupEvents() {
  previousButton.addEventListener("click", () => {
    moveToStep(currentStep - 1);
  });

  nextButton.addEventListener("click", () => {
    if (!validateCurrentStep()) {
      return;
    }

    moveToStep(currentStep + 1);
  });

  stepButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetStep = Number(
        button.dataset.stepButton
      );

      if (targetStep > currentStep) {
        for (
          let stepNumber = currentStep;
          stepNumber < targetStep;
          stepNumber += 1
        ) {
          if (!validateStep(stepNumber)) {
            moveToStep(stepNumber);
            return;
          }
        }
      }

      moveToStep(targetStep);
    });
  });

  form.addEventListener("input", () => {
    saveDraft();
  });

  form.addEventListener("change", event => {
    const target = event.target;

    if (
      target.matches(
        "#style-1, #style-2, #style-3"
      )
    ) {
      updateDivineWorks();
      validateStyleMarks();
    }

    if (
      target.matches(
        "#style-1-mark, #style-2-mark, #style-3-mark"
      )
    ) {
      validateStyleMarks();
    }

    saveDraft();
  });

  form.addEventListener("submit", handleSubmit);
}

function populateStyleSelects() {
  const options = [
    `<option value="">選択してください</option>`,
    ...STYLE_DATA.map(style => `
      <option value="${escapeAttribute(style.name)}">
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

    document.querySelector(
      `#divine-${index}`
    ).value = style?.divine ?? "";
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
    const number = Number(button.dataset.stepButton);

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

function validateCurrentStep() {
  return validateStep(currentStep);
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
  const styleValues = [1, 2, 3].map(index =>
    document.querySelector(`#style-${index}`).value
  );

  if (styleValues.some(value => !value)) {
    styleValidationMessage.textContent =
      "3枠すべてのスタイルを選択してください。";

    styleValidationMessage.className =
      "form-message form-message--error";

    return false;
  }

  const marks = [1, 2, 3].map(index =>
    document.querySelector(
      `#style-${index}-mark`
    ).value
  );

  const personaCount = marks.filter(
    mark => mark.includes("◎")
  ).length;

  const keyCount = marks.filter(
    mark => mark.includes("●")
  ).length;

  if (personaCount !== 1 || keyCount !== 1) {
    styleValidationMessage.textContent =
      "◎ペルソナと●キーは、それぞれ1つだけ指定してください。";

    styleValidationMessage.className =
      "form-message form-message--error";

    return false;
  }

  styleValidationMessage.textContent =
    "STYLE CONFIGURATION VALID";

  styleValidationMessage.className =
    "form-message form-message--success";

  return true;
}

function renderPreview() {
  const characterName = getValue("character_name");
  const handle = getValue("handle");

  const styles = [1, 2, 3]
    .map(index => {
      const name = getValue(`style_${index}`);
      const mark = getValue(`style_${index}_mark`);
      return `${name}${mark}`;
    })
    .join(" / ");

  document.querySelector("#register-preview").innerHTML = `
    <article class="preview-card">
      <p class="preview-card__label">
        PROVISIONAL CAST DATA
      </p>

      <p class="preview-card__handle">
        ${escapeHtml(
          handle ? `“${handle}”` : "NO HANDLE"
        )}
      </p>

      <h3>
        ${escapeHtml(characterName || "UNREGISTERED CAST")}
      </h3>

      <p class="preview-card__styles">
        ${escapeHtml(styles)}
      </p>

      <dl>
        <div>
          <dt>PLAYER</dt>
          <dd>
            ${escapeHtml(getValue("player_name") || "—")}
          </dd>
        </div>

        <div>
          <dt>AFFILIATION</dt>
          <dd>
            ${escapeHtml(getValue("affiliation") || "—")}
          </dd>
        </div>

        <div>
          <dt>CITIZEN RANK</dt>
          <dd>
            ${escapeHtml(getValue("citizen_rank") || "—")}
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

  if (submitting) {
    return;
  }

  for (
    let stepNumber = 1;
    stepNumber <= 3;
    stepNumber += 1
  ) {
    if (!validateStep(stepNumber)) {
      moveToStep(stepNumber);
      return;
    }
  }

  submitting = true;
  setSubmitting(true);
  setMessage("REGISTERING CAST DATA...", "loading");

  try {
    const payload = createPayload();

    const { data, error } = await supabase
      .from("characters")
      .insert(payload)
      .select("public_id")
      .single();

    if (error) {
      throw error;
    }

    clearDraft();

    setMessage(
      `REGISTRATION COMPLETE: ${data.public_id}`,
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
    console.error("Character insert failed:", error);

    setMessage(
      translateInsertError(error),
      "error"
    );
  } finally {
    submitting = false;
    setSubmitting(false);
  }
}

function createPayload() {
  return {
    owner_id: currentUser.id,

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

    reason_value: getIntegerValue("reason_value"),
    reason_control: getIntegerValue("reason_control"),

    passion_value: getIntegerValue("passion_value"),
    passion_control: getIntegerValue("passion_control"),

    life_value: getIntegerValue("life_value"),
    life_control: getIntegerValue("life_control"),

    mundane_value: getIntegerValue("mundane_value"),
    mundane_control: getIntegerValue("mundane_control"),

    cs: getIntegerValue("cs"),

    summary: getValue("summary"),
    profile: getValue("profile"),
    visibility: getValue("visibility") || "draft"
  };
}

function saveDraft() {
  const data = Object.fromEntries(
    new FormData(form).entries()
  );

  localStorage.setItem(
    "tnx_cast_registration_draft",
    JSON.stringify(data)
  );
}

function restoreDraft() {
  const raw = localStorage.getItem(
    "tnx_cast_registration_draft"
  );

  if (!raw) {
    return;
  }

  try {
    const data = JSON.parse(raw);

    Object.entries(data).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);

      if (field) {
        field.value = value;
      }
    });

    updateDivineWorks();
    validateStyleMarks();
  } catch (error) {
    console.warn("Draft restore failed:", error);
    clearDraft();
  }
}

function clearDraft() {
  localStorage.removeItem(
    "tnx_cast_registration_draft"
  );
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
    .querySelectorAll("input, select, textarea, button")
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

function translateInsertError(error) {
  const message = String(error?.message ?? "");

  if (
    message.includes(
      "new row violates row-level security policy"
    )
  ) {
    return "登録権限がありません。ログイン状態とRLS設定を確認してください。";
  }

  if (
    message.includes("duplicate key value")
  ) {
    return "識別番号が重複しました。再度登録してください。";
  }

  if (
    message.includes("null value")
  ) {
    return "必須情報が不足しています。";
  }

  return "キャスト情報の登録に失敗しました。";
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