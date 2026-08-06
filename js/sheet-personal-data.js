/* Structured profile fields are saved only by sheet.js through the main save button.
 * This file now keeps only legacy JSON import separation and local status text.
 */
const HANDLE_FIELDS = ["handle_kana"];
const PERSONAL_FIELDS = ["age", "gender", "height", "weight", "eyes", "hair", "skin"];
const LIFE_PATH_FIELDS = ["life_path_origin", "life_path_experience", "life_path_encounter"];
const FIELDS = [...HANDLE_FIELDS, ...PERSONAL_FIELDS, ...LIFE_PATH_FIELDS];
const LEGACY_KEYS = {
  handle_kana: ["base.handleKana", "base.handle_kana", "handleKana", "handle_kana"],
  age: ["base.age", "age"],
  gender: ["base.sex", "base.gender", "sex", "gender"],
  height: ["base.height", "height"],
  weight: ["base.weight", "weight"],
  eyes: ["base.eyes", "eyes"],
  hair: ["base.hair", "hair"],
  skin: ["base.skin", "skin"],
  life_path_origin: ["base.lifepath.experience", "base.lifepath.origin", "life_path_origin"],
  life_path_experience: ["base.lifepath.environment", "life_path_experience"],
  life_path_encounter: ["base.lifepath.encounter", "base.lifepath.encouter", "life_path_encounter"]
};

const inputs = Object.fromEntries(
  FIELDS.map(name => [name, document.querySelector(`#${name.replaceAll("_", "-")}`)])
);
const statuses = [
  document.querySelector("#personal-data-status"),
  document.querySelector("#life-path-status")
].filter(Boolean);

if (FIELDS.every(name => inputs[name])) initialize();

function initialize() {
  const markManualSave = () => setStatus("未保存です。保存ボタンを押してください。", "");
  for (const input of Object.values(inputs)) {
    input.addEventListener("input", markManualSave);
    input.addEventListener("change", markManualSave);
  }

  bindLegacyImportSeparation();
  setStatus("", "");
}

function setStatus(text, state) {
  for (const status of statuses) {
    status.textContent = text;
    status.className = state ? `is-${state}` : "";
  }
}

function canonicalKey(value) {
  return String(value || "").trim()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g, ".$1")
    .replace(/^[.#]+|[.]$/g, "")
    .replace(/\.{2,}/g, ".");
}

function readPath(object, path) {
  if (!object || typeof object !== "object") return "";
  if (Object.prototype.hasOwnProperty.call(object, path)) return object[path];
  return path.split(".").reduce(
    (value, key) => value && typeof value === "object" ? value[key] : undefined,
    object
  ) ?? "";
}

function extractLegacyValues(data) {
  const values = {};
  const fieldMap = new Map();

  for (const field of Array.isArray(data?.fields) ? data.fields : []) {
    const type = String(field.type || "").toLowerCase();
    const value = (type === "checkbox" || type === "radio")
      ? (field.checked ? (field.value || true) : false)
      : (field.value ?? "");

    for (const key of [field.path, field.id, field.name]) {
      const normalized = canonicalKey(key);
      if (normalized && !fieldMap.has(normalized)) fieldMap.set(normalized, value);
    }
  }

  for (const [name, keys] of Object.entries(LEGACY_KEYS)) {
    for (const key of keys) {
      const normalized = canonicalKey(key);
      const value = fieldMap.has(normalized) ? fieldMap.get(normalized) : readPath(data, key);
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        values[name] = String(value);
        break;
      }
    }
  }

  return values;
}

function sanitizeLegacyData(data) {
  const clone = structuredClone(data);
  const blocked = new Set(Object.values(LEGACY_KEYS).flat().map(canonicalKey));

  if (Array.isArray(clone.fields)) {
    clone.fields = clone.fields.filter(field =>
      ![field.path, field.id, field.name].some(key => blocked.has(canonicalKey(key)))
    );
  }

  for (const keys of Object.values(LEGACY_KEYS)) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(clone, key)) delete clone[key];
      const parts = key.split(".");
      if (parts.length === 2 && clone[parts[0]] && typeof clone[parts[0]] === "object") {
        delete clone[parts[0]][parts[1]];
      }
      if (parts.length === 3 && clone[parts[0]]?.[parts[1]] && typeof clone[parts[0]][parts[1]] === "object") {
        delete clone[parts[0]][parts[1]][parts[2]];
      }
    }
  }

  return clone;
}

function bindLegacyImportSeparation() {
  document.addEventListener("click", event => {
    if (!event.target.closest("#legacy-import-apply")) return;
    const textarea = document.querySelector("#legacy-import-json");
    if (!textarea?.value.trim()) return;

    try {
      const data = JSON.parse(textarea.value);
      const values = extractLegacyValues(data);
      textarea.value = JSON.stringify(sanitizeLegacyData(data), null, 2);

      for (const [name, value] of Object.entries(values)) {
        inputs[name].value = value;
        inputs[name].dispatchEvent(new Event("input", { bubbles: true }));
        inputs[name].dispatchEvent(new Event("change", { bubbles: true }));
      }

      setStatus("取込内容は未保存です。保存ボタンを押してください。", "");
    } catch {
      /* The main importer reports malformed JSON. */
    }
  }, true);
}
