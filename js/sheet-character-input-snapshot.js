import { normalizeCharacterSheetUrl } from "./character-sheet-url.js?v=2";
import "./character-sheet-url-import-sync.js?v=5";

const BASE_FIELD_SELECTORS = {
  character_name: "#character-name",
  character_kana: "#character-kana",
  handle: "#handle",
  player_name: "#player-name",
  affiliation: "#affiliation",
  citizen_rank: "#citizen-rank",
  summary: "#summary",
  profile: "#profile"
};

const BUILTIN_STRUCTURED_FIELD_SELECTORS = {
  character_sheet_url: "#character-sheet-url"
};

function ensureCharacterSheetUrlField(root = document) {
  if (root.querySelector("#character-sheet-url")) return;
  const container = root.querySelector(".profile-source-field");
  if (!container) return;

  const ownerDocument = root.ownerDocument || root;
  const label = ownerDocument.createElement("label");
  label.className = "character-sheet-url-field";

  const labelText = ownerDocument.createElement("span");
  labelText.textContent = "キャラクターシート倉庫URL";
  label.append(labelText);

  const input = ownerDocument.createElement("input");
  input.id = "character-sheet-url";
  input.type = "url";
  input.inputMode = "url";
  input.autocomplete = "url";
  input.maxLength = 2048;
  input.placeholder = "https://character-sheets.appspot.com/tnx/edit.html?key=...";
  input.title = "キャラクターシート倉庫TNXのURLを入力してください。取込時は自動設定されます。";
  label.append(input);

  container.append(label);
}

function collectBuiltInStructured(root, value) {
  const result = {};
  for (const [name, selector] of Object.entries(BUILTIN_STRUCTURED_FIELD_SELECTORS)) {
    const raw = value(selector);
    if (name === "character_sheet_url") {
      const normalized = normalizeCharacterSheetUrl(raw);
      if (normalized === null) {
        throw new Error("キャラクターシート倉庫URLは character-sheets.appspot.com のTNX保存済みシートURLを入力してください。");
      }
      result[name] = normalized;
    } else {
      result[name] = raw;
    }
  }
  return result;
}

export function collectCharacterInputSnapshot({
  root = document,
  structuredFields = [],
  experienceTotal = 0
} = {}) {
  ensureCharacterSheetUrlField(root);
  const value = selector => root.querySelector(selector)?.value ?? "";
  const text = selector => root.querySelector(selector)?.textContent ?? "";

  return {
    base: {
      ...Object.fromEntries(
        Object.entries(BASE_FIELD_SELECTORS).map(([name, selector]) => [name, value(selector)])
      ),
      visibility: value("#visibility"),
      experience_points: Number(experienceTotal ?? text("#exp-total") ?? 0)
    },
    structured: {
      ...collectBuiltInStructured(root, value),
      ...Object.fromEntries(
        structuredFields.map(([name, selector]) => [name, value(selector)])
      )
    }
  };
}

export function applyCharacterInputSnapshot({
  root = document,
  data = {},
  structuredFields = []
} = {}) {
  ensureCharacterSheetUrlField(root);
  const setValue = (selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.value = value ?? "";
  };

  for (const [name, selector] of Object.entries(BASE_FIELD_SELECTORS)) {
    setValue(selector, data[name] ?? "");
  }
  for (const [name, selector] of Object.entries(BUILTIN_STRUCTURED_FIELD_SELECTORS)) {
    setValue(selector, data[name] ?? "");
  }
  for (const [name, selector] of structuredFields) {
    setValue(selector, data[name] ?? "");
  }
  setValue("#visibility", data.visibility === "public" ? "public" : "private");
}

if (typeof document !== "undefined") ensureCharacterSheetUrlField(document);
