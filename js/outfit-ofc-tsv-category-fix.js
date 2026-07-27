const ROOT_SELECTOR = "#outfit-list";

initialize();

function initialize() {
  document.addEventListener("click", handleImport, true);
}

function handleImport(event) {
  const button = event.target.closest?.("#tsv-apply");
  if (!button || !/OFC/i.test(document.querySelector("#tsv-title")?.textContent || "")) return;

  const sources = parseTsv(document.querySelector("#tsv-text")?.value || "")
    .map(row => ({
      name: String(row.name || "").trim(),
      category: targetToCategory(row.target, row.major_category)
    }))
    .filter(row => row.name && ["cyberware", "tron"].includes(row.category));
  if (!sources.length) return;

  const before = new Set(currentRows().map(row => row.dataset.outfitKey));
  window.setTimeout(() => restoreCategories(sources, before), 250);
}

async function restoreCategories(sources, before) {
  const rows = await waitForRows(before, sources.length, 5000);
  const available = [...rows];

  for (const source of sources) {
    let index = available.findIndex(row => valueOf(row, "name").trim() === source.name);
    if (index < 0) index = 0;
    const row = available.splice(index, 1)[0];
    if (!row) continue;
    const key = row.dataset.outfitKey || "";
    const current = document.querySelector(`${ROOT_SELECTOR} [data-outfit-key="${cssEscape(key)}"]`);
    const select = current?.querySelector('[data-o="category"]');
    if (!select || select.value === source.category) continue;
    select.value = source.category;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(50);
  }
}

function currentRows() {
  return [...document.querySelectorAll(`${ROOT_SELECTOR} [data-outfit-key]`)]
    .filter((row, index, rows) => rows.findIndex(other => other.dataset.outfitKey === row.dataset.outfitKey) === index);
}

async function waitForRows(before, expected, timeout) {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    const rows = currentRows().filter(row => !before.has(row.dataset.outfitKey));
    if (rows.length >= expected) return rows;
    await wait(50);
  }
  return currentRows().filter(row => !before.has(row.dataset.outfitKey));
}

function valueOf(row, field) {
  return row?.querySelector(`[data-o="${cssEscape(field)}"]`)?.value || "";
}

function parseTsv(text) {
  const lines = String(text || "").replace(/\r/g, "").trim().split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = lines.shift().split("\t").map(value => value.trim());
  return lines.map(line => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, String(cells[index] || "").replace(/\\n/g, "\n")]));
  });
}

function targetToCategory(target, majorCategory) {
  const key = String(target || "").trim().toLowerCase();
  const explicit = ({
    cyberware: "cyberware", cyberwares: "cyberware", "サイバーウェア": "cyberware",
    tron: "tron", trons: "tron", "トロン": "tron"
  })[key];
  if (explicit) return explicit;

  const major = String(majorCategory || "").normalize("NFKC");
  if (/サイバーウェア|サイバー|IANUS|義体|義肢/i.test(major)) return "cyberware";
  if (/トロン|タップ|ソフトウェア|ウェブ/i.test(major)) return "tron";
  return "other";
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/(["\\])/g, "\\$1");
}
