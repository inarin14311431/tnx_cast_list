import { createClient } from "npm:@supabase/supabase-js@2";

const MASTER_ID = "current";
const MAX_LOOKUP_ITEMS = 40;
const MAX_NAME_LENGTH = 180;
const MAX_CSV_BYTES = 12_000_000;
const DEFAULT_ALLOWED_ORIGIN = "https://inarin14311431.github.io";

type SiteCategory = "weapon" | "armor" | "cyberware" | "tron" | "vehicle" | "residence" | "other";
type AuthenticatedUser = { id: string; email: string };
type AdminClient = ReturnType<typeof createClient>;
type LookupItem = { name: string; manufacturer: string };
type MasterRecord = {
  name: string;
  normalizedName: string;
  looseName: string;
  manufacturer: string;
  normalizedManufacturer: string;
  majorCategory: string;
  minorCategory: string;
  category: SiteCategory;
};
type MasterPayload = {
  version: 1;
  syncedAt: string;
  source: { spreadsheetId: string; gid: string };
  records: MasterRecord[];
};
type CachedMaster = { updatedAt: string; recordCount: number; payload: MasterPayload };

let cachedMaster: CachedMaster | null = null;
const requestWindows = new Map<string, { startedAt: number; units: number }>();

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

Deno.serve(async request => {
  const origin = request.headers.get("origin") ?? "";
  const corsHeaders = createCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return json({ error: "Origin is not allowed." }, 403, corsHeaders);
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, corsHeaders);
  if (!isAllowedOrigin(origin)) return json({ error: "Origin is not allowed." }, 403, corsHeaders);

  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") throw new HttpError(400, "JSON request body is required.");

    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "lookup";
    const adminClient = createAdminClient();

    if (action === "status") {
      const status = await readMasterStatus(adminClient);
      return json({
        ok: true,
        ready: status.recordCount > 0,
        recordCount: status.recordCount,
        updatedAt: status.updatedAt,
        canSync: isAdmin(user)
      }, 200, corsHeaders);
    }

    if (action === "sync") {
      if (!isAdmin(user)) throw new HttpError(403, "アウトフィットマスタを更新できるのは管理者だけです。");
      const result = await syncMaster(adminClient, user);
      return json({ ok: true, action: "sync", ...result }, 200, corsHeaders);
    }

    if (action !== "lookup") throw new HttpError(400, "Unknown action.");

    const items = validateLookupItems(body.items);
    consumeRateLimit(user.id, items.length);
    const master = await loadMaster(adminClient);
    if (!master.payload.records.length) {
      throw new HttpError(503, "アウトフィット分類マスタがまだ同期されていません。");
    }

    const results = classifyItems(items, master.payload.records);
    return json({
      ok: true,
      action: "lookup",
      updatedAt: master.updatedAt,
      results
    }, 200, corsHeaders);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status >= 500) console.error("Outfit classifier failed", error);
    return json({ error: message }, status, corsHeaders);
  }
});

function validateLookupItems(value: unknown): LookupItem[] {
  if (!Array.isArray(value) || !value.length) throw new HttpError(400, "検索するアウトフィット名を指定してください。");
  if (value.length > MAX_LOOKUP_ITEMS) throw new HttpError(400, `一度に検索できるのは${MAX_LOOKUP_ITEMS}件までです。`);

  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new HttpError(400, `${index + 1}件目の検索条件が不正です。`);
    const source = item as Record<string, unknown>;
    const name = typeof source.name === "string" ? source.name.trim() : "";
    const manufacturer = typeof source.manufacturer === "string" ? source.manufacturer.trim() : "";
    if (!name || name.length > MAX_NAME_LENGTH) throw new HttpError(400, `${index + 1}件目の名称が不正です。`);
    if (manufacturer.length > MAX_NAME_LENGTH) throw new HttpError(400, `${index + 1}件目のメーカー名が長すぎます。`);
    return { name, manufacturer };
  });
}

function consumeRateLimit(userId: string, units: number) {
  const now = Date.now();
  const current = requestWindows.get(userId);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(userId, { startedAt: now, units });
    return;
  }
  if (current.units + units > 240) throw new HttpError(429, "検索回数が多すぎます。しばらく待ってから再実行してください。");
  current.units += units;
}

function classifyItems(items: LookupItem[], records: MasterRecord[]) {
  const exactIndex = new Map<string, MasterRecord[]>();
  const looseIndex = new Map<string, MasterRecord[]>();

  for (const record of records) {
    addIndex(exactIndex, record.normalizedName, record);
    addIndex(looseIndex, record.looseName, record);
  }

  return items.map(item => {
    const normalizedName = normalizeName(item.name);
    const looseName = normalizeLooseName(item.name);
    let candidates = exactIndex.get(normalizedName) ?? [];
    let confidence: "exact" | "normalized" = "exact";

    if (!candidates.length && looseName) {
      candidates = looseIndex.get(looseName) ?? [];
      confidence = "normalized";
    }

    if (!candidates.length) return { query: item.name, matched: false, ambiguous: false };

    const normalizedManufacturer = normalizeName(item.manufacturer);
    if (normalizedManufacturer) {
      const manufacturerMatches = candidates.filter(record => record.normalizedManufacturer === normalizedManufacturer);
      if (manufacturerMatches.length) candidates = manufacturerMatches;
    }

    const categories = [...new Set(candidates.map(record => record.category))];
    if (categories.length !== 1) {
      return { query: item.name, matched: false, ambiguous: true };
    }

    const category = categories[0];
    return {
      query: item.name,
      matched: true,
      ambiguous: candidates.length > 1,
      category,
      categoryLabel: categoryLabel(category),
      confidence
    };
  });
}

function addIndex(index: Map<string, MasterRecord[]>, key: string, record: MasterRecord) {
  if (!key) return;
  const list = index.get(key) ?? [];
  list.push(record);
  index.set(key, list);
}

async function syncMaster(client: AdminClient, user: AuthenticatedUser) {
  const spreadsheetId = Deno.env.get("OUTFIT_MASTER_SPREADSHEET_ID")?.trim() ?? "";
  const gid = Deno.env.get("OUTFIT_MASTER_SPREADSHEET_GID")?.trim() || "0";
  if (!spreadsheetId) throw new HttpError(500, "OUTFIT_MASTER_SPREADSHEET_ID is not configured.");
  if (!/^[a-zA-Z0-9_-]+$/.test(spreadsheetId)) throw new HttpError(500, "OUTFIT_MASTER_SPREADSHEET_ID is invalid.");
  if (!/^\d+$/.test(gid)) throw new HttpError(500, "OUTFIT_MASTER_SPREADSHEET_GID is invalid.");

  const endpoint = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  const response = await fetch(endpoint, { redirect: "follow", headers: { "User-Agent": "tnx-cast-outfit-master-sync" } });
  if (!response.ok) throw new HttpError(502, `Googleスプレッドシートを取得できませんでした。HTTP ${response.status}`);

  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_CSV_BYTES) throw new HttpError(413, "Googleスプレッドシートのデータが大きすぎます。");
  const csv = await response.text();
  if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES) throw new HttpError(413, "Googleスプレッドシートのデータが大きすぎます。");

  const rows = parseCsv(csv);
  const headerRowIndex = rows.findIndex(row => row.some(cell => cleanHeader(cell) === "大分類") && row.some(cell => cleanHeader(cell) === "名称"));
  if (headerRowIndex < 0) throw new HttpError(422, "大分類・名称のヘッダーを確認できませんでした。共有設定とシート構成を確認してください。");

  const headers = rows[headerRowIndex].map(cleanHeader);
  const majorIndex = headers.indexOf("大分類");
  const minorIndex = headers.indexOf("小分類");
  const manufacturerIndex = headers.indexOf("メーカー");
  const nameIndex = headers.indexOf("名称");
  if (majorIndex < 0 || nameIndex < 0) throw new HttpError(422, "必要な列を確認できませんでした。");

  const records: MasterRecord[] = [];
  const dedupe = new Set<string>();
  const categoryCounts: Record<SiteCategory, number> = { weapon: 0, armor: 0, cyberware: 0, tron: 0, vehicle: 0, residence: 0, other: 0 };

  for (const row of rows.slice(headerRowIndex + 1)) {
    const name = String(row[nameIndex] ?? "").trim();
    const majorCategory = String(row[majorIndex] ?? "").trim();
    const minorCategory = minorIndex >= 0 ? String(row[minorIndex] ?? "").trim() : "";
    const manufacturer = manufacturerIndex >= 0 ? String(row[manufacturerIndex] ?? "").trim() : "";
    if (!name || !majorCategory) continue;

    const normalizedName = normalizeName(name);
    const looseName = normalizeLooseName(name);
    if (!normalizedName) continue;
    const normalizedManufacturer = normalizeName(manufacturer);
    const category = mapCategory(majorCategory, minorCategory);
    const key = [normalizedName, normalizedManufacturer, category, normalizeName(minorCategory)].join("|");
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    records.push({
      name,
      normalizedName,
      looseName,
      manufacturer,
      normalizedManufacturer,
      majorCategory,
      minorCategory,
      category
    });
    categoryCounts[category] += 1;
  }

  if (!records.length) throw new HttpError(422, "分類マスタとして保存できる行がありませんでした。");

  const syncedAt = new Date().toISOString();
  const payload: MasterPayload = {
    version: 1,
    syncedAt,
    source: { spreadsheetId, gid },
    records
  };

  const { error } = await client.from("private_outfit_master").upsert({
    id: MASTER_ID,
    payload,
    record_count: records.length,
    source_spreadsheet_id: spreadsheetId,
    source_gid: gid,
    updated_at: syncedAt,
    updated_by: user.id
  }, { onConflict: "id" });
  if (error) throw new HttpError(500, `非公開マスタを保存できませんでした。${error.message}`);

  cachedMaster = { updatedAt: syncedAt, recordCount: records.length, payload };
  return { recordCount: records.length, updatedAt: syncedAt, categoryCounts };
}

async function readMasterStatus(client: AdminClient) {
  const { data, error } = await client
    .from("private_outfit_master")
    .select("record_count, updated_at")
    .eq("id", MASTER_ID)
    .maybeSingle();
  if (error) throw new HttpError(500, `アウトフィットマスタの状態を確認できませんでした。${error.message}`);
  return {
    recordCount: Number(data?.record_count || 0),
    updatedAt: typeof data?.updated_at === "string" ? data.updated_at : ""
  };
}

async function loadMaster(client: AdminClient): Promise<CachedMaster> {
  const status = await readMasterStatus(client);
  if (cachedMaster && cachedMaster.updatedAt === status.updatedAt && cachedMaster.recordCount === status.recordCount) return cachedMaster;

  const { data, error } = await client
    .from("private_outfit_master")
    .select("payload, record_count, updated_at")
    .eq("id", MASTER_ID)
    .maybeSingle();
  if (error) throw new HttpError(500, `アウトフィットマスタを読み込めませんでした。${error.message}`);

  const payload = validateStoredPayload(data?.payload);
  cachedMaster = {
    updatedAt: typeof data?.updated_at === "string" ? data.updated_at : "",
    recordCount: Number(data?.record_count || payload.records.length),
    payload
  };
  return cachedMaster;
}

function validateStoredPayload(value: unknown): MasterPayload {
  if (!value || typeof value !== "object") return emptyPayload();
  const source = value as Record<string, unknown>;
  if (!Array.isArray(source.records)) return emptyPayload();

  const records = source.records.filter(record => record && typeof record === "object").map(record => {
    const item = record as Record<string, unknown>;
    const category = isSiteCategory(item.category) ? item.category : "other";
    return {
      name: String(item.name ?? ""),
      normalizedName: String(item.normalizedName ?? ""),
      looseName: String(item.looseName ?? ""),
      manufacturer: String(item.manufacturer ?? ""),
      normalizedManufacturer: String(item.normalizedManufacturer ?? ""),
      majorCategory: String(item.majorCategory ?? ""),
      minorCategory: String(item.minorCategory ?? ""),
      category
    } as MasterRecord;
  }).filter(record => record.normalizedName);

  return {
    version: 1,
    syncedAt: typeof source.syncedAt === "string" ? source.syncedAt : "",
    source: {
      spreadsheetId: typeof (source.source as Record<string, unknown> | undefined)?.spreadsheetId === "string"
        ? String((source.source as Record<string, unknown>).spreadsheetId) : "",
      gid: typeof (source.source as Record<string, unknown> | undefined)?.gid === "string"
        ? String((source.source as Record<string, unknown>).gid) : ""
    },
    records
  };
}

function emptyPayload(): MasterPayload {
  return { version: 1, syncedAt: "", source: { spreadsheetId: "", gid: "" }, records: [] };
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function mapCategory(majorCategory: string, minorCategory: string): SiteCategory {
  const text = normalizeName(`${majorCategory} ${minorCategory}`);
  if (/ウェポン|武器/.test(text)) return "weapon";
  if (/アーマー|防具|防護服/.test(text)) return "armor";
  if (/サイバーウェア|サイバー|義体|義肢|IANUS/i.test(text)) return "cyberware";
  if (/トロン|タップ|ソフトウェア|ウェブ/.test(text)) return "tron";
  if (/ヴィークル|ビークル|車両|航空機|船舶/.test(text)) return "vehicle";
  if (/レジデンス|住宅|住居/.test(text)) return "residence";
  return "other";
}

function normalizeName(value: string) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/^[\s★☆†※■□●○◆◇▶▷→⇒↳┗└・]+/u, "")
    .replace(/[\s　]+/g, "")
    .replace(/[‐‑‒–—―ーｰ]/g, "-");
}

function normalizeLooseName(value: string) {
  return normalizeName(value)
    .replace(/[“”"'「」『』【】〔〕（）()［］\[\]〈〉《》・･.,，。:：;；_\-]/g, "");
}

function cleanHeader(value: string) {
  return String(value ?? "").normalize("NFKC").replace(/[\s　]+/g, "").trim();
}

function isSiteCategory(value: unknown): value is SiteCategory {
  return ["weapon", "armor", "cyberware", "tron", "vehicle", "residence", "other"].includes(String(value));
}

function categoryLabel(category: SiteCategory) {
  return ({
    weapon: "武器",
    armor: "防具",
    cyberware: "サイバーウェア",
    tron: "トロン",
    vehicle: "ヴィークル",
    residence: "住居",
    other: "その他"
  } as Record<SiteCategory, string>)[category];
}

async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) throw new HttpError(401, "ログインが必要です。");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new HttpError(500, "Supabase authentication environment is incomplete.");

  const client = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const token = authorization.slice(7).trim();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "ログインセッションが無効です。");
  return { id: user.id, email: String(user.email ?? "").toLowerCase() };
}

function createAdminClient(): AdminClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new HttpError(500, "Supabase service-role environment is incomplete.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isAdmin(user: AuthenticatedUser) {
  const userIds = parseList(Deno.env.get("OUTFIT_MASTER_ADMIN_USER_IDS"));
  const emails = parseList(Deno.env.get("OUTFIT_MASTER_ADMIN_EMAILS")).map(value => value.toLowerCase());
  return userIds.includes(user.id) || Boolean(user.email && emails.includes(user.email));
}

function parseList(value: string | undefined) {
  return String(value ?? "").split(",").map(item => item.trim()).filter(Boolean);
}

function isAllowedOrigin(origin: string) {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  const configured = parseList(Deno.env.get("OUTFIT_MASTER_ALLOWED_ORIGINS"));
  const allowed = configured.length ? configured : [DEFAULT_ALLOWED_ORIGIN];
  return allowed.includes(origin);
}

function createCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) && origin ? origin : DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), { status, headers });
}
