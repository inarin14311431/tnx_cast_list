import { supabase } from "./supabase-client.js";

/*
 * Keep the editor's base outfit fields and dynamically-added OFC fields in one
 * save payload without changing the existing renderer or input behavior.
 */
const ROOT_SELECTOR = "#outfit-list";
const root = document.querySelector(ROOT_SELECTOR);

if (root) {
  const detailsByKey = new Map();
  const originalRpc = supabase.rpc.bind(supabase);

  function normalizeDetails(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
  }

  function rowKey(row) {
    return row?.dataset.outfitKey || "";
  }

  function rowSignature(row) {
    const category = row?.querySelector('[data-o="category"]')?.value || row?.closest("table")?.dataset.outfitSchema || "other";
    const name = row?.querySelector('[data-o="name"]')?.value || "";
    return `${String(category).trim()}\u0000${String(name).trim()}`;
  }

  function readArmorDefense(row, details) {
    const visible = {
      s: row.querySelector('[data-armor-defense="S"], [data-armor-defense="s"]')?.value,
      i: row.querySelector('[data-armor-defense="I"], [data-armor-defense="i"]')?.value,
      p: row.querySelector('[data-armor-defense="P"], [data-armor-defense="p"]')?.value
    };
    const encoded = row.querySelector('[data-o="defense"]')?.value || "";
    const parts = String(encoded).split(/[\/／]/);
    details.defense_s = visible.s ?? parts[0] ?? details.defense_s ?? "";
    details.defense_i = visible.i ?? parts[1] ?? details.defense_i ?? "";
    details.defense_p = visible.p ?? parts[2] ?? details.defense_p ?? "";
  }

  function captureRow(row) {
    if (!row) return {};
    const key = rowKey(row);
    const details = normalizeDetails(key ? detailsByKey.get(key) : null);

    row.querySelectorAll("[data-ofc]").forEach(input => {
      details[input.dataset.ofc] = input.value;
    });

    readArmorDefense(row, details);

    if (key) detailsByKey.set(key, details);
    return details;
  }

  function uniqueRows() {
    const rows = [...root.querySelectorAll("[data-outfit-key]")];
    return rows.filter((row, index) => {
      const key = rowKey(row);
      return key && rows.findIndex(other => rowKey(other) === key) === index;
    });
  }

  function buildDetailQueues() {
    const queues = new Map();
    uniqueRows().forEach(row => {
      const signature = rowSignature(row);
      if (!queues.has(signature)) queues.set(signature, []);
      queues.get(signature).push(captureRow(row));
    });
    return queues;
  }

  function augmentOutfits(items) {
    if (!Array.isArray(items)) return items;
    const queues = buildDetailQueues();
    return items.map(item => {
      const signature = `${String(item?.category || "other").trim()}\u0000${String(item?.name || "").trim()}`;
      const queue = queues.get(signature);
      const captured = queue?.length ? queue.shift() : null;
      const existing = normalizeDetails(item?.ofc_details);
      return {
        ...item,
        ofc_details: captured ? { ...existing, ...captured } : existing
      };
    });
  }

  supabase.rpc = function patchedRpc(functionName, args, options) {
    if (functionName !== "save_character_bundle" || !args || !Array.isArray(args.p_outfits)) {
      return originalRpc(functionName, args, options);
    }
    return originalRpc(functionName, {
      ...args,
      p_outfits: augmentOutfits(args.p_outfits)
    }, options);
  };

  document.addEventListener("input", event => {
    const row = event.target.closest?.(`${ROOT_SELECTOR} [data-outfit-key]`);
    if (row && event.target.matches?.("[data-ofc], [data-armor-defense], [data-o=defense]")) captureRow(row);
  }, true);

  document.addEventListener("change", event => {
    const row = event.target.closest?.(`${ROOT_SELECTOR} [data-outfit-key]`);
    if (row) captureRow(row);
  }, true);

  const observer = new MutationObserver(() => {
    uniqueRows().forEach(captureRow);
  });
  observer.observe(root, { childList: true, subtree: true });

  requestAnimationFrame(() => uniqueRows().forEach(captureRow));
  window.setTimeout(() => uniqueRows().forEach(captureRow), 500);
  window.setTimeout(() => uniqueRows().forEach(captureRow), 1500);

  window.TNXOutfitStateBridge = {
    capture: () => uniqueRows().map(row => ({ key: rowKey(row), signature: rowSignature(row), ofc_details: captureRow(row) })),
    augmentOutfits
  };
}
