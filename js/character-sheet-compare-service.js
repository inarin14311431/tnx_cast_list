import { buildCharacterSheetReadUrl, extractCharacterSheetKey } from "./character-sheet-url.js?v=2";
import {
  canonicalizeArchiveBundle,
  canonicalizeCharacterSheetJsonp,
  diffCanonicalBundles
} from "./character-sheet-jsonp-canonical.js?v=2";

function parseJsonData(value) {
  if (typeof value !== "string") return value;
  let source = value.trim();
  if (!source) return value;
  if (source.endsWith(";")) source = source.slice(0, -1).trim();
  if (source.startsWith("(") && source.endsWith(")")) source = source.slice(1, -1).trim();
  try {
    return JSON.parse(source);
  } catch {
    return value;
  }
}

function mergeWrapperMetadata(parsed, wrapper) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  const result = { ...parsed };
  for (const key of ["outline", "name", "nameKana", "player", "display"]) {
    if ((result[key] === undefined || result[key] === null || result[key] === "") && wrapper?.[key] !== undefined) {
      result[key] = wrapper[key];
    }
  }
  return result;
}

export function normalizeCharacterSheetPayload(payload) {
  let data = payload;
  for (let i = 0; i < 6; i += 1) {
    if (typeof data === "string") {
      const parsed = parseJsonData(data);
      if (parsed !== data) {
        data = parsed;
        continue;
      }
      break;
    }
    if (data && typeof data === "object" && typeof data.jsonData === "string" && data.jsonData.trim()) {
      const parsed = parseJsonData(data.jsonData);
      if (parsed !== data.jsonData) {
        data = mergeWrapperMetadata(parsed, data);
        continue;
      }
    }
    if (data && typeof data === "object" && data.data && typeof data.data === "object" && !data.base && !data.skills1 && !data.superhumanskills && !data.weapons) {
      data = mergeWrapperMetadata(data.data, data);
      continue;
    }
    break;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("倉庫データをTNXキャラクターとして認識できませんでした。");
  }
  return data;
}

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function preserveWarehouseLifePathRawText(payload = {}) {
  const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const base = data.base && typeof data.base === "object" && !Array.isArray(data.base) ? data.base : {};
  const source = base.lifepath && typeof base.lifepath === "object" && !Array.isArray(base.lifepath)
    ? base.lifepath
    : null;
  if (!source) return data;

  const lifepath = { ...source };
  if (hasText(source.experience)) lifepath.origin = source.experience;
  if (hasText(source.environment)) lifepath.environment = source.environment;
  if (hasText(source.encounter)) lifepath.encounter = source.encounter;
  else if (hasText(source.encouter)) lifepath.encounter = source.encouter;

  return {
    ...data,
    base: {
      ...base,
      lifepath
    }
  };
}

function jsonpOnce(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const callback = `__tnxCharacterSheetCompare_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        delete window[callback];
      } catch {
        window[callback] = undefined;
      }
      script.remove();
      fn(value);
    };
    const timer = setTimeout(
      () => finish(reject, new Error("キャラクターシート倉庫の応答がタイムアウトしました。")),
      timeout
    );
    window[callback] = value => finish(resolve, value);
    script.onerror = () => finish(reject, new Error("キャラクターシート倉庫のデータ取得に失敗しました。"));
    const request = new URL(url);
    request.searchParams.set("callback", callback);
    script.src = request.href;
    document.head.append(script);
  });
}

export async function loadCharacterSheetPayload(sourceUrl, { request = jsonpOnce } = {}) {
  const primary = buildCharacterSheetReadUrl(sourceUrl);
  const key = extractCharacterSheetKey(sourceUrl);
  if (!primary || !key) throw new Error("キャラクターシート倉庫URLを解析できませんでした。");

  const encoded = encodeURIComponent(key);
  const urls = [
    primary,
    `https://character-sheets.appspot.com/tnx/display.html?ajax=1&key=${encoded}`,
    `https://character-sheets.appspot.com/tnx/display?key=${encoded}&ajax=1`,
    `https://character-sheets.appspot.com/tnx/display.html?key=${encoded}&ajax=1`
  ];
  let lastError;
  for (const url of urls) {
    try {
      return normalizeCharacterSheetPayload(await request(url));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("キャラクターシート倉庫からデータを取得できませんでした。");
}

function normalizeConcealmentForComparison(value) {
  const source = String(value ?? "").trim();
  if (!source || source === "0") return "";
  if (["-", "－", "ー", "―", "−"].includes(source)) return "-";
  return source;
}

export function normalizeCanonicalForComparison(bundle = {}) {
  const normalized = {
    ...bundle,
    outfits: Object.fromEntries(Object.entries(bundle.outfits || {}).map(([key, outfit]) => [
      key,
      {
        ...outfit,
        concealment: normalizeConcealmentForComparison(outfit?.concealment),
        concealment_penalty: String(outfit?.concealment_penalty ?? "").trim() === ""
          ? 0
          : outfit.concealment_penalty
      }
    ]))
  };
  return normalized;
}

export function compareCharacterSheetPayload(archiveBundle, externalPayload) {
  const warehousePayload = preserveWarehouseLifePathRawText(normalizeCharacterSheetPayload(externalPayload));
  return diffCanonicalBundles(
    normalizeCanonicalForComparison(canonicalizeArchiveBundle(archiveBundle || {})),
    normalizeCanonicalForComparison(canonicalizeCharacterSheetJsonp(warehousePayload))
  );
}

export async function compareCharacterSheetSource(sourceUrl, archiveBundle, options = {}) {
  const externalPayload = await loadCharacterSheetPayload(sourceUrl, options);
  return compareCharacterSheetPayload(archiveBundle, externalPayload);
}
