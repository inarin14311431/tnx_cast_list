import { supabase } from "./supabase-client.js";

const root = document.querySelector("#outfit-list");
const importButton = document.querySelector("#import-ofc");
const applyImportButton = document.querySelector("#tsv-apply");
const toolbar = importButton?.closest(".toolbar");

if (root && toolbar) {
  const CATEGORY_LABELS = {
    weapon: "武器",
    armor: "防具",
    cyberware: "サイバーウェア",
    tron: "トロン",
    vehicle: "ヴィークル",
    residence: "住居",
    other: "その他"
  };
  const cache = new Map();
  let busy = false;
  let blurTimer = 0;

  const button = document.createElement("button");
  button.id = "classify-outfits-button";
  button.type = "button";
  button.innerHTML = "マスタから分類 <small>CLASSIFY OUTFITS</small>";
  importButton.insertAdjacentElement("afterend", button);

  const status = document.createElement("p");
  status.id = "outfit-category-status";
  status.className = "outfit-category-status";
  status.setAttribute("aria-live", "polite");
  toolbar.insertAdjacentElement("afterend", status);

  button.addEventListener("click", () => classifyAll(true));

  root.addEventListener("focusout", event => {
    const input = event.target.closest?.('input[data-o="name"]');
    if (!input) return;
    window.clearTimeout(blurTimer);
    blurTimer = window.setTimeout(() => classifyInputs([input], false), 120);
  });

  applyImportButton?.addEventListener("click", () => {
    const title = document.querySelector("#tsv-title")?.textContent || "";
    if (!/OFC/i.test(title)) return;
    window.setTimeout(() => classifyAll(false), 900);
  });

  async function classifyAll(manual) {
    const inputs = [...root.querySelectorAll('input[data-o="name"]')];
    await classifyInputs(inputs, manual);
  }

  async function classifyInputs(inputs, manual) {
    if (busy) return;

    const targets = inputs
      .map(input => targetFor(input))
      .filter(Boolean)
      .filter(target => target.name && target.category === "other");

    if (!targets.length) {
      if (manual) setStatus("分類対象となる「その他」のアウトフィットがありません。", "neutral");
      return;
    }

    const uniqueNames = [...new Set(targets.map(target => target.name))];
    const missingNames = uniqueNames.filter(name => !cache.has(normalizeKey(name)));

    busy = true;
    button.disabled = true;
    setStatus(`${uniqueNames.length}件を分類マスタで検索しています…`, "working");

    try {
      if (missingNames.length) {
        const { data, error } = await supabase.functions.invoke("outfit-classifier", {
          body: {
            action: "lookup",
            items: missingNames.map(name => ({ name }))
          }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        for (const result of data?.results ?? []) cache.set(normalizeKey(result.query), result);
      }

      let changed = 0;
      let unmatched = 0;
      let ambiguous = 0;

      for (const target of targets) {
        const result = cache.get(normalizeKey(target.name));
        if (!result?.matched) {
          if (result?.ambiguous) ambiguous += 1;
          else unmatched += 1;
          continue;
        }

        const current = findCurrentTarget(target.key, target.name);
        if (!current || current.category !== "other") continue;
        if (!Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, result.category)) continue;

        current.categorySelect.value = result.category;
        current.categorySelect.dispatchEvent(new Event("input", { bubbles: true }));
        changed += 1;
        await twoFrames();
      }

      const details = [
        `${changed}件を分類`,
        unmatched ? `${unmatched}件は該当なし` : "",
        ambiguous ? `${ambiguous}件は同名分類が競合` : ""
      ].filter(Boolean).join("／");
      setStatus(details, changed ? "success" : "neutral");
    } catch (error) {
      console.error("Outfit category classification failed", error);
      setStatus(functionError(error), "error");
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  function targetFor(input) {
    const row = input.closest("[data-outfit-key]");
    if (!row) return null;
    const categorySelect = row.querySelector('select[data-o="category"]');
    if (!categorySelect) return null;
    return {
      key: row.dataset.outfitKey || "",
      name: String(input.value || "").trim(),
      category: categorySelect.value || "other",
      categorySelect
    };
  }

  function findCurrentTarget(key, expectedName) {
    const candidates = key
      ? [...root.querySelectorAll(`[data-outfit-key="${CSS.escape(key)}"]`)]
      : [...root.querySelectorAll("[data-outfit-key]")];

    for (const row of candidates) {
      const nameInput = row.querySelector('input[data-o="name"]');
      const categorySelect = row.querySelector('select[data-o="category"]');
      if (!nameInput || !categorySelect) continue;
      if (String(nameInput.value || "").trim() !== expectedName) continue;
      return {
        category: categorySelect.value || "other",
        categorySelect
      };
    }
    return null;
  }

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function normalizeKey(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase();
  }

  function functionError(error) {
    const context = error?.context;
    if (context && typeof context.json === "function") {
      return "分類APIを利用できませんでした。Edge Functionとマスタ同期を確認してください。";
    }
    return error instanceof Error && error.message
      ? error.message
      : "アウトフィットの分類に失敗しました。";
  }

  function twoFrames() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
}
