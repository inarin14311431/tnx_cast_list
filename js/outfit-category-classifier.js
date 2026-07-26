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
  let rerunRequested = false;
  let scanTimer = 0;
  let masterReady = false;
  let masterStatusChecked = false;

  const status = document.createElement("p");
  status.id = "outfit-category-status";
  status.className = "outfit-category-status";
  status.setAttribute("aria-live", "polite");
  toolbar.insertAdjacentElement("afterend", status);

  root.addEventListener("input", event => {
    if (!event.target.closest?.('input[data-o="name"]')) return;
    scheduleScan(450);
  });

  root.addEventListener("focusout", event => {
    if (!event.target.closest?.('input[data-o="name"]')) return;
    scheduleScan(0);
  });

  applyImportButton?.addEventListener("click", () => {
    const title = document.querySelector("#tsv-title")?.textContent || "";
    if (!/OFC/i.test(title)) return;
    // The importer and table enhancer rebuild the outfit DOM in separate passes.
    // Scan more than once so the final rendered rows are always classified.
    [150, 650, 1400].forEach(delay => window.setTimeout(() => scheduleScan(0), delay));
  });

  const observer = new MutationObserver(mutations => {
    const hasOutfitRows = mutations.some(mutation =>
      [...mutation.addedNodes].some(node =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.("[data-outfit-key]") || node.querySelector?.("[data-outfit-key]"))
      )
    );
    if (hasOutfitRows) scheduleScan(250);
  });
  observer.observe(root, { childList: true, subtree: true });

  initialize();

  async function initialize() {
    await waitForSession();
    await ensureMasterReady();
    if (masterReady) scheduleScan(350);
  }

  function scheduleScan(delay = 0) {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => classifyAll(), delay);
  }

  async function classifyAll() {
    const inputs = [...root.querySelectorAll('input[data-o="name"]')];
    await classifyInputs(inputs);
  }

  async function classifyInputs(inputs) {
    if (busy) {
      rerunRequested = true;
      return;
    }

    if (!masterReady) {
      const ready = await ensureMasterReady();
      if (!ready) return;
    }

    const targets = inputs
      .map(input => targetFor(input))
      .filter(Boolean)
      .filter(target => target.name && target.category === "other");

    if (!targets.length) {
      if (status.dataset.state === "working") setStatus("", "");
      return;
    }

    const uniqueNames = [...new Set(targets.map(target => target.name))];
    const missingNames = uniqueNames.filter(name => !cache.has(normalizeKey(name)));

    busy = true;
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
        for (const result of data?.results ?? []) {
          cache.set(normalizeKey(result.query), result);
        }
      }

      let changed = 0;
      let unchangedOther = 0;
      let unmatched = 0;
      let ambiguous = 0;

      for (const target of targets) {
        const result = cache.get(normalizeKey(target.name));
        if (!result?.matched) {
          if (result?.ambiguous) ambiguous += 1;
          else unmatched += 1;
          continue;
        }

        if (result.category === "other") {
          unchangedOther += 1;
          continue;
        }

        const current = findCurrentTarget(target.key, target.name);
        if (!current || current.category !== "other") continue;
        if (!Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, result.category)) continue;

        current.categorySelect.value = result.category;
        current.categorySelect.dispatchEvent(new Event("input", { bubbles: true }));
        current.categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
        changed += 1;
        await twoFrames();
      }

      const details = [
        changed ? `${changed}件を自動分類` : "",
        unchangedOther ? `${unchangedOther}件はその他` : "",
        unmatched ? `${unmatched}件は該当なし` : "",
        ambiguous ? `${ambiguous}件は同名分類が競合` : ""
      ].filter(Boolean).join("／");
      setStatus(details || "分類対象を確認しました。", changed ? "success" : "neutral");
    } catch (error) {
      console.error("Outfit category classification failed", error);
      masterStatusChecked = false;
      masterReady = false;
      setStatus(functionError(error), "error");
    } finally {
      busy = false;
      if (rerunRequested) {
        rerunRequested = false;
        scheduleScan(100);
      }
    }
  }

  async function ensureMasterReady() {
    if (masterReady) return true;
    if (masterStatusChecked) return false;

    masterStatusChecked = true;
    try {
      const { data, error } = await supabase.functions.invoke("outfit-classifier", {
        body: { action: "status" }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      masterReady = Boolean(data?.ready && Number(data?.recordCount || 0) > 0);
      if (!masterReady) {
        setStatus("アウトフィット分類マスタが未同期です。管理者アカウントから同期してください。", "error");
      }
      return masterReady;
    } catch (error) {
      console.error("Outfit category master status failed", error);
      setStatus(functionError(error), "error");
      return false;
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

  async function waitForSession() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data } = await supabase.auth.getSession();
      if (data?.session) return true;
      await new Promise(resolve => window.setTimeout(resolve, 150));
    }
    return false;
  }

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function normalizeKey(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase();
  }

  function functionError(error) {
    const message = String(error?.message || "");
    if (/not synchronized|まだ同期|未同期|503/i.test(message)) {
      return "アウトフィット分類マスタが未同期です。管理者アカウントから同期してください。";
    }
    if (/401|jwt|session|ログイン/i.test(message)) {
      return "分類APIを利用できませんでした。ログイン状態を確認してページを再読み込みしてください。";
    }
    const context = error?.context;
    if (context && typeof context.json === "function") {
      return "分類APIを利用できませんでした。Edge Functionのデプロイとマスタ同期を確認してください。";
    }
    return message || "アウトフィットの自動分類に失敗しました。";
  }

  function twoFrames() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
}
