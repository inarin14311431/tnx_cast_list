import { test, expect } from "@playwright/test";

const PUBLIC_CASTS = [
  { publicId: "TNX-000029", expectedName: "トリル" },
  { publicId: "TNX-000037", expectedName: "ルカ　日向" },
  { publicId: "TNX-000054", expectedName: "躑躅" }
];

function parseJsonp(text, callback) {
  let source = String(text || "").trim();
  if (source.endsWith(";")) source = source.slice(0, -1).trim();
  const prefix = `${callback}(`;
  if (!source.startsWith(prefix) || !source.endsWith(")")) {
    throw new Error("キャラクターシート倉庫のJSONP形式を認識できません");
  }
  return JSON.parse(source.slice(prefix.length, -1));
}

function parseJsonData(value) {
  if (typeof value !== "string") return value;
  let source = value.trim();
  if (!source) return value;
  if (source.endsWith(";")) source = source.slice(0, -1).trim();
  if (source.startsWith("(") && source.endsWith(")")) source = source.slice(1, -1).trim();
  try { return JSON.parse(source); } catch { return value; }
}

function mergeMetadata(parsed, wrapper) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  const result = { ...parsed };
  for (const key of ["outline", "name", "nameKana", "player", "display"]) {
    if ((result[key] === undefined || result[key] === null || result[key] === "") && wrapper?.[key] !== undefined) {
      result[key] = wrapper[key];
    }
  }
  return result;
}

function normalizeWarehousePayload(payload) {
  let data = payload;
  for (let index = 0; index < 6; index += 1) {
    if (typeof data === "string") {
      const parsed = parseJsonData(data);
      if (parsed !== data) { data = parsed; continue; }
      break;
    }
    if (data && typeof data === "object" && typeof data.jsonData === "string" && data.jsonData.trim()) {
      const parsed = parseJsonData(data.jsonData);
      if (parsed !== data.jsonData) { data = mergeMetadata(parsed, data); continue; }
    }
    if (data && typeof data === "object" && data.data && typeof data.data === "object" && !data.base && !data.weapons) {
      data = mergeMetadata(data.data, data);
      continue;
    }
    break;
  }
  if (!data || typeof data !== "object") throw new Error("倉庫データをオブジェクトへ正規化できません");
  return data;
}

async function getRegisteredUrl(page, publicId) {
  return page.evaluate(async id => {
    const { supabase } = await import("/js/supabase-client.js");
    const { data, error } = await supabase
      .from("characters")
      .select("character_name,character_sheet_url")
      .eq("public_id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }, publicId);
}

function warehouseKey(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== "character-sheets.appspot.com") throw new Error("倉庫URLのホストが不正です");
  const key = parsed.searchParams.get("key")?.trim();
  if (!key) throw new Error("倉庫URLにkeyがありません");
  return key;
}

function hasDefenseSource(item) {
  if (!["armor", "vehicle"].includes(item.category)) return false;
  const data = item.data || {};
  return ["protecS", "protecP", "protecI", "defenseS", "defenseP", "defenseI"]
    .some(key => String(data[key] ?? "").trim() !== "");
}

test("登録済みキャラシ倉庫URLから実データを取得し、防御値を正規取込経路で認識できる", async ({ page, request }) => {
  await page.goto("/index.html");
  await page.addScriptTag({ url: "/js/sheet-import-outfit-compat.js" });
  await expect.poll(() => page.evaluate(() => Boolean(window.TNXLegacyOutfitImport?.sourceOutfits))).toBe(true);

  for (const target of PUBLIC_CASTS) {
    const record = await getRegisteredUrl(page, target.publicId);
    expect(record?.character_name).toBe(target.expectedName);
    expect(record?.character_sheet_url).toContain("character-sheets.appspot.com/tnx/");

    const key = warehouseKey(record.character_sheet_url);
    const callback = `__tnxLiveImport_${target.publicId.replace(/\W/g, "_")}`;
    const sourceUrl = new URL("https://character-sheets.appspot.com/tnx/display");
    sourceUrl.searchParams.set("ajax", "1");
    sourceUrl.searchParams.set("key", key);
    sourceUrl.searchParams.set("callback", callback);

    const response = await request.get(sourceUrl.toString(), { timeout: 30000 });
    expect(response.ok(), `${target.expectedName} の倉庫データ取得`).toBe(true);
    const payload = parseJsonp(await response.text(), callback);
    const normalized = normalizeWarehousePayload(payload);

    const outfits = await page.evaluate(data => window.TNXLegacyOutfitImport.sourceOutfits(data), normalized);
    expect(outfits.length, `${target.expectedName} のアウトフィット`).toBeGreaterThan(0);
    const defenseOutfits = outfits.filter(hasDefenseSource);
    expect(defenseOutfits.length, `${target.expectedName} の防御S/P/I付き防具・ヴィークル`).toBeGreaterThan(0);

    console.log(`[live-url-import] cast=${target.expectedName} outfits=${outfits.length} defenseOutfits=${defenseOutfits.length}`);
  }
});
