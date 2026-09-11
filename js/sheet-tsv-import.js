const STYLE_SCHEMA = {
  mode: "style",
  title: "スタイル技能 TSV取込",
  filename: "tnx-style-skills-template.tsv",
  headers: ["名称", "種別", "レベル", "技能", "上限", "タイミング", "対象", "射程", "目標値", "対決", "解説", "参照P"],
  multiline: new Set(["名称", "解説"])
};

const OUTFIT_SCHEMA = {
  mode: "outfit",
  title: "アウトフィット TSV取込",
  filename: "tnx-outfits-template.tsv",
  headers: [
    "分類", "名称", "購入", "常備化", "隠匿値", "隠匿修正", "攻撃", "受", "射程", "ス", "電制",
    "S", "P", "I", "制御値", "CS修正", "表層", "深層", "無", "ソ", "サ", "ハ", "乗員", "SF", "登", "電", "ア",
    "部位", "メーカー", "参照P", "OFC大分類", "OFC小分類", "解説"
  ],
  multiline: new Set(["名称", "解説"])
};

const OUTFIT_CATEGORY_MAP = new Map([
  ["weapon", "weapon"], ["武器", "weapon"],
  ["armor", "armor"], ["armour", "armor"], ["防具", "armor"],
  ["cyberware", "cyberware"], ["サイバーウェア", "cyberware"],
  ["tron", "tron"], ["trone", "tron"], ["トロン", "tron"],
  ["vehicle", "vehicle"], ["ヴィークル", "vehicle"], ["ビークル", "vehicle"],
  ["residence", "residence"], ["resident", "residence"], ["住居", "residence"],
  ["other", "other"], ["その他", "other"]
]);

const OUTFIT_FIELD_MAP = {
  "名称": "name",
  "購入": "purchase_value",
  "常備化": "experience_cost",
  "隠匿値": "concealment",
  "隠匿修正": "concealment_penalty",
  "攻撃": "attack",
  "受": "parry",
  "射程": "range",
  "ス": "speed",
  "電制": "electronic_control",
  "S": "defense_s",
  "P": "defense_p",
  "I": "defense_i",
  "制御値": "control_modifier",
  "CS修正": "cs_modifier",
  "表層": "ianus_surface",
  "深層": "ianus_deep",
  "無": "ianus_none",
  "ソ": "tron_software",
  "サ": "tron_support",
  "ハ": "tron_hardware",
  "乗員": "crew",
  "SF": "sf",
  "登": "residence_entry",
  "電": "residence_electric",
  "ア": "residence_area",
  "部位": "slot",
  "メーカー": "manufacturer",
  "参照P": "page_number",
  "OFC大分類": "major_category",
  "OFC小分類": "minor_category",
  "解説": "description"
};

let activeSchema = STYLE_SCHEMA;
let parsedRows = [];

initialize();

function initialize() {
  const styleSearch = document.querySelector("#search-skd-master");
  const outfitSearch = document.querySelector("#search-ofc-master");
  if (!styleSearch || !outfitSearch) return;

  const styleButton = createOpenButton("import-style-tsv", "TSV取込");
  const outfitButton = createOpenButton("import-outfit-tsv", "TSV取込");
  styleSearch.before(styleButton);
  outfitSearch.before(outfitButton);

  const dialog = createDialog();
  document.body.append(dialog);
  bindDialogEvents(dialog);

  styleButton.addEventListener("click", () => openDialog(STYLE_SCHEMA));
  outfitButton.addEventListener("click", () => openDialog(OUTFIT_SCHEMA));
}

function createOpenButton(id, label) {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.className = "master-search-open tsv-import-open";
  button.innerHTML = `${label} <small>IMPORT TSV</small>`;
  return button;
}

function createDialog() {
  const dialog = document.createElement("dialog");
  dialog.id = "tsv-dialog";
  dialog.innerHTML = `
    <form>
      <header class="tsv-import-guide__header">
        <div>
          <h2 id="tsv-title">TSV取込</h2>
          <p>Excelのセル範囲をコピーして貼り付けるか、.tsvファイルを選択してください。見出し行は省略できます。省略する場合はテンプレートと同じ列順で入力してください。</p>
        </div>
        <button id="tsv-template" type="button" class="btn btn-small">テンプレート <small>DOWNLOAD TSV</small></button>
      </header>
      <div class="tsv-file-picker">
        <input id="tsv-file" type="file" accept=".tsv,text/tab-separated-values,text/plain">
      </div>
      <textarea id="tsv-input" spellcheck="false" aria-label="TSVデータ" placeholder="Excelからここへ貼り付け（見出し行なしでも可）"></textarea>
      <p id="tsv-error" role="alert" aria-live="polite"></p>
      <div id="tsv-preview" aria-live="polite"></div>
      <footer class="modal-actions">
        <button id="tsv-close" type="button" class="btn">閉じる</button>
        <button id="tsv-apply" type="button" class="btn primary" disabled>編集画面へ追加</button>
      </footer>
    </form>`;
  return dialog;
}

function bindDialogEvents(dialog) {
  const input = dialog.querySelector("#tsv-input");
  const file = dialog.querySelector("#tsv-file");
  const apply = dialog.querySelector("#tsv-apply");

  dialog.querySelector("#tsv-close").addEventListener("click", () => dialog.close());
  dialog.querySelector("#tsv-template").addEventListener("click", downloadTemplate);
  input.addEventListener("input", () => refreshPreview(input.value));
  file.addEventListener("change", async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    try {
      input.value = await selected.text();
      refreshPreview(input.value);
    } catch (error) {
      showErrors([`ファイルを読み込めませんでした: ${error?.message || error}`]);
      apply.disabled = true;
    }
  });
  apply.addEventListener("click", applyRows);
  dialog.addEventListener("close", () => {
    parsedRows = [];
    input.value = "";
    file.value = "";
    dialog.querySelector("#tsv-preview").replaceChildren();
    dialog.querySelector("#tsv-error").textContent = "";
    apply.disabled = true;
  });
}

function openDialog(schema) {
  activeSchema = schema;
  parsedRows = [];
  const dialog = document.querySelector("#tsv-dialog");
  dialog.querySelector("#tsv-title").textContent = schema.title;
  dialog.querySelector("#tsv-input").value = "";
  dialog.querySelector("#tsv-file").value = "";
  dialog.querySelector("#tsv-error").textContent = "";
  dialog.querySelector("#tsv-preview").replaceChildren();
  dialog.querySelector("#tsv-apply").disabled = true;
  dialog.showModal();
  dialog.querySelector("#tsv-input").focus();
}

function refreshPreview(text) {
  const result = validateTsv(text, activeSchema);
  parsedRows = result.rows;
  showErrors(result.errors);
  renderPreview(result.rows, activeSchema);
  document.querySelector("#tsv-apply").disabled = result.errors.length > 0 || result.rows.length === 0;
}

function validateTsv(text, schema) {
  const errors = [];
  let matrix;
  try {
    matrix = parseTsv(text);
  } catch (error) {
    return { rows: [], errors: [error.message] };
  }

  while (matrix.length && matrix[matrix.length - 1].every(value => value === "")) matrix.pop();
  if (!matrix.length || matrix.every(row => row.every(value => value === ""))) return { rows: [], errors: [] };

  const firstRow = matrix[0].map((value, index) => index === 0 ? value.replace(/^\uFEFF/, "") : value);
  const hasHeader = looksLikeHeaderRow(firstRow, schema);
  const header = hasHeader ? matrix.shift().map((value, index) => index === 0 ? value.replace(/^\uFEFF/, "") : value) : [...schema.headers];

  if (hasHeader) {
    const duplicates = header.filter((value, index) => value && header.indexOf(value) !== index);
    const expected = new Set(schema.headers);
    const actual = new Set(header);
    const missing = schema.headers.filter(value => !actual.has(value));
    const unexpected = header.filter(value => value && !expected.has(value));
    const emptyHeaders = header.filter(value => !value).length;

    if (duplicates.length) errors.push(`重複した見出しがあります: ${[...new Set(duplicates)].join("、")}`);
    if (missing.length) errors.push(`不足している見出し: ${missing.join("、")}`);
    if (unexpected.length) errors.push(`未対応の見出し: ${[...new Set(unexpected)].join("、")}`);
    if (emptyHeaders) errors.push("空の見出しがあります。");
    if (header.length !== schema.headers.length) errors.push(`列数が不正です。必要: ${schema.headers.length}列 / 入力: ${header.length}列`);
    if (errors.length) return { rows: [], errors };
  }

  const rows = [];
  const lineOffset = hasHeader ? 2 : 1;
  matrix.forEach((cells, rowIndex) => {
    const lineNumber = rowIndex + lineOffset;
    if (cells.every(value => value === "")) {
      errors.push(`${lineNumber}行目: 途中の空行は使用できません。`);
      return;
    }
    if (cells.length !== header.length) {
      errors.push(`${lineNumber}行目: 列数が${cells.length}列です。${header.length}列必要です。見出し行を省略する場合はテンプレートと同じ列順・列数にしてください。`);
      return;
    }
    const record = {};
    header.forEach((name, index) => { record[name] = cells[index] ?? ""; });
    for (const [name, value] of Object.entries(record)) {
      if (value.includes("\n") && !schema.multiline.has(name)) errors.push(`${lineNumber}行目「${name}」: セル内改行は名称・解説のみ使用できます。`);
    }
    if (schema.mode === "outfit" && !normalizeOutfitCategory(record["分類"])) {
      errors.push(`${lineNumber}行目「分類」: 武器・防具・サイバーウェア・トロン・ヴィークル・住居・その他のいずれかを指定してください。`);
    }
    if (!String(record["名称"] || "").trim()) errors.push(`${lineNumber}行目: 名称は必須です。`);
    if (schema.mode === "style" && record["レベル"] && !/^\d+$/.test(String(record["レベル"]).trim())) {
      errors.push(`${lineNumber}行目「レベル」: 0以上の整数で入力してください。`);
    }
    rows.push(record);
  });

  return { rows, errors };
}

function looksLikeHeaderRow(cells, schema) {
  const normalized = cells.map(value => String(value || "").trim());
  const expected = new Set(schema.headers);
  const matches = normalized.filter(value => expected.has(value)).length;
  return normalized[0] === schema.headers[0] || matches >= 2;
}

export function parseTsv(source) {
  const text = String(source ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let atFieldStart = true;
  let justClosedQuote = false;

  const pushField = () => {
    row.push(field);
    field = "";
    atFieldStart = true;
    justClosedQuote = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
          justClosedQuote = true;
        }
      } else if (char === "\r") {
        field += "\n";
        if (next === "\n") i += 1;
      } else if (char === "\n") {
        field += "\n";
      } else {
        field += char;
      }
      continue;
    }

    if (justClosedQuote && char !== "\t" && char !== "\r" && char !== "\n") {
      throw new Error(`TSV形式エラー: 引用符の直後に不正な文字があります（${i + 1}文字目）。`);
    }
    if (char === '"') {
      if (!atFieldStart || field !== "") throw new Error(`TSV形式エラー: フィールド途中の引用符は使用できません（${i + 1}文字目）。`);
      quoted = true;
      atFieldStart = false;
    } else if (char === "\t") {
      pushField();
    } else if (char === "\r") {
      pushRow();
      if (next === "\n") i += 1;
    } else if (char === "\n") {
      pushRow();
    } else {
      if (justClosedQuote) throw new Error(`TSV形式エラー: 引用符の直後に不正な文字があります（${i + 1}文字目）。`);
      field += char;
      atFieldStart = false;
    }
  }

  if (quoted) throw new Error("TSV形式エラー: 閉じられていない引用符があります。");
  if (field !== "" || row.length || text.endsWith("\t")) pushField();
  if (row.length) rows.push(row);
  return rows;
}

function renderPreview(rows, schema) {
  const container = document.querySelector("#tsv-preview");
  container.replaceChildren();
  if (!rows.length) return;

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of schema.headers) {
    const th = document.createElement("th");
    th.textContent = header;
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  for (const record of rows) {
    const tr = document.createElement("tr");
    for (const header of schema.headers) {
      const td = document.createElement("td");
      td.textContent = record[header] ?? "";
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  container.append(table);
}

function showErrors(errors) {
  const target = document.querySelector("#tsv-error");
  target.textContent = errors.join("\n");
  target.hidden = errors.length === 0;
}

async function applyRows() {
  const dialog = document.querySelector("#tsv-dialog");
  const apply = dialog.querySelector("#tsv-apply");
  if (!parsedRows.length || apply.disabled) return;
  apply.disabled = true;
  const originalLabel = apply.textContent;
  apply.textContent = "追加中…";

  try {
    for (const record of parsedRows) {
      if (activeSchema.mode === "style") await appendStyleRow(record);
      else await appendOutfitRow(record);
    }
    const count = parsedRows.length;
    dialog.close();
    showImportNotice(`${count}件を編集画面へ追加しました。保存ボタンを押すまでDBには保存されません。`);
  } catch (error) {
    console.error("[tnx] TSV import failed", error);
    showErrors([error?.message || "TSV取込中にエラーが発生しました。"]);
    apply.disabled = false;
  } finally {
    apply.textContent = originalLabel;
  }
}

async function appendStyleRow(record) {
  const before = new Set([...document.querySelectorAll("#style-skills [data-skill-key]")].map(row => row.dataset.skillKey));
  const addButton = document.querySelector("#add-style-skill");
  if (!addButton) throw new Error("スタイル技能の追加ボタンが見つかりません。");
  addButton.click();
  const row = await waitForNewStyleRow(before);
  await window.TNXStyleSkillFields?.waitUntilReady?.(row, 1600);

  setControl(row.querySelector("[data-f='name']"), record["名称"]);
  setControl(row.querySelector("[data-f='skill_kind']"), normalizeSkillKind(record["種別"]));
  setControl(row.querySelector("[data-f='level']"), record["レベル"] || "1");
  const details = {
    skill: record["技能"], limit: record["上限"], timing: record["タイミング"], target: record["対象"],
    range: record["射程"], difficulty: record["目標値"], confrontation: record["対決"], description: record["解説"], page: record["参照P"]
  };
  for (const [field, value] of Object.entries(details)) setControl(row.querySelector(`[data-style-field="${field}"]`), value || "");
}

async function appendOutfitRow(record) {
  const editor = window.TNXSheetEditor;
  if (!editor?.addOutfitForImport) throw new Error("アウトフィット編集機能を準備できませんでした。");
  const category = normalizeOutfitCategory(record["分類"]);
  const key = editor.addOutfitForImport(category);
  if (!key) throw new Error(`「${record["名称"]}」のアウトフィット行を追加できませんでした。`);

  const row = await waitForOutfitRow(key);
  for (const [header, field] of Object.entries(OUTFIT_FIELD_MAP)) setControl(row.querySelector(`[data-o="${field}"]`), record[header] || "");
}

function normalizeSkillKind(value) {
  const text = String(value || "").trim();
  if (/奥義|ultimate/i.test(text)) return "ultimate";
  if (/秘技|secret/i.test(text)) return "secret";
  if (/演出|方向|direction/i.test(text)) return "direction";
  if (/なし|none/i.test(text)) return "none";
  return "normal";
}

function normalizeOutfitCategory(value) {
  const raw = String(value || "").trim();
  return OUTFIT_CATEGORY_MAP.get(raw.toLowerCase()) || OUTFIT_CATEGORY_MAP.get(raw) || "";
}

function setControl(control, value) {
  if (!control) return;
  control.value = String(value ?? "");
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitForNewStyleRow(beforeKeys) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const found = [...document.querySelectorAll("#style-skills [data-skill-key]")].find(row => !beforeKeys.has(row.dataset.skillKey));
    if (found) return found;
    await nextFrame();
  }
  throw new Error("スタイル技能行を追加できませんでした。");
}

async function waitForOutfitRow(key) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const row = [...document.querySelectorAll("[data-outfit-key]")].find(element => element.dataset.outfitKey === String(key));
    if (row) return row;
    await nextFrame();
  }
  throw new Error("アウトフィット行の描画を確認できませんでした。");
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

function downloadTemplate() {
  const content = `\uFEFF${activeSchema.headers.join("\t")}\r\n`;
  const blob = new Blob([content], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = activeSchema.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function showImportNotice(message) {
  const notice = document.createElement("div");
  notice.className = "toast show";
  notice.textContent = message;
  document.body.append(notice);
  setTimeout(() => notice.remove(), 4500);
}
