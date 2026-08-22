(() => {
  const FORMAT = "TNX_CAST_TRANSFER_TSV";
  const clean = value => String(value ?? "").trim();
  const canonical = value => clean(value).toLowerCase()
    .replace(/\[\s*["']?([^\]"']+)["']?\s*\]/g, ".$1")
    .replace(/^[.#]+|[.]$/g, "")
    .replace(/\.{2,}/g, ".");
  const unescapeCell = value => String(value || "").replace(/\\(\\|t|n|r)/g, (_, token) =>
    token === "\\" ? "\\" : token === "t" ? "\t" : token === "n" ? "\n" : "\r"
  );

  function parseBase(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n").filter(Boolean);
    const head = lines.shift()?.split("\t") || [];
    if (head[0] !== FORMAT) return null;
    const base = {};
    for (const line of lines) {
      const columns = line.split("\t");
      if (columns[0] !== FORMAT || columns[2] !== "base" || (columns[3] || "0") !== "0") continue;
      base[columns[4] || ""] = unescapeCell(columns.slice(5).join("\t"));
    }
    return base;
  }

  function controlMap() {
    const map = new Map();
    document.querySelectorAll("input,select,textarea").forEach(element => {
      for (const key of [element.id, element.name]) {
        const normalized = canonical(key);
        if (normalized && !map.has(normalized)) map.set(normalized, element);
      }
    });
    return map;
  }

  function find(map, paths) {
    const keys = paths.map(canonical).filter(Boolean);
    for (const key of keys) if (map.has(key)) return map.get(key);
    for (const key of keys) {
      const hit = [...map].find(([candidate]) => candidate.endsWith(`.${key}`) || candidate.endsWith(key));
      if (hit) return hit[1];
    }
    return null;
  }

  function setValue(element, value) {
    if (!element) return false;
    element.value = String(value ?? "");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    try { window.jQuery?.(element).trigger("input").trigger("change"); } catch {}
    return true;
  }

  function joinHandleAndName(handle, name) {
    return [clean(handle), clean(name)].filter(Boolean).join(" ");
  }

  function repair() {
    const base = parseBase(window.__TNX_TRANSFER_TSV__);
    if (!base) return false;

    const name = clean(base.name);
    const kana = clean(base.kana);
    const handle = clean(base.handle);
    const handleKana = clean(base.handle_kana ?? base.handlekana ?? base.handleKana);
    const displayName = joinHandleAndName(handle, name);
    const displayKana = joinHandleAndName(handleKana, kana);

    if (!displayName && !displayKana) return false;

    const map = controlMap();
    if (displayName) setValue(find(map, ["base.name", "name"]), displayName);
    if (displayKana) setValue(find(map, ["base.namekana", "base.kana", "kana"]), displayKana);
    return true;
  }

  for (const delay of [50, 300, 900, 1800, 3600]) {
    window.setTimeout(repair, delay);
  }
})();
