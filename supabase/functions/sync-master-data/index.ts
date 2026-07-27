import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_SKD_SPREADSHEET_ID = "1XSSgipkhFU0nukt4Hy7rk3AC1MJ0XhzdSe-J873Uivo";
const DEFAULT_SKD_GID = "1787190988";
const DEFAULT_OFC_SPREADSHEET_ID = "1gIjy8ze7954YLL3SOxGhRr9Lec-cXv1LgHIvlRjjjSg";
const DEFAULT_OFC_GID = "0";
const DEFAULT_ALLOWED_ORIGIN = "https://inarin14311431.github.io";
const MAX_CSV_BYTES = 20 * 1024 * 1024;
const UPSERT_CHUNK_SIZE = 300;

type AuthenticatedUser = { id: string; email?: string };
type AdminClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;

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
    const body = await request.json().catch(() => ({})) as { action?: unknown };
    const action = typeof body.action === "string" ? body.action : "status";
    const adminClient = createAdminClient();

    if (action === "status") {
      const status = await getStatus(adminClient);
      return json({ ...status, canSync: isMasterAdmin(user) }, 200, corsHeaders);
    }

    if (action !== "sync") throw new HttpError(400, "Unknown action.");
    if (!isMasterAdmin(user)) throw new HttpError(403, "Master synchronization is restricted to administrators.");

    const startedAt = new Date().toISOString();
    const [skdCsv, ofcCsv] = await Promise.all([
      fetchSpreadsheetCsv(
        Deno.env.get("MASTER_SKD_SPREADSHEET_ID")?.trim() || DEFAULT_SKD_SPREADSHEET_ID,
        Deno.env.get("MASTER_SKD_GID")?.trim() || DEFAULT_SKD_GID
      ),
      fetchSpreadsheetCsv(
        Deno.env.get("MASTER_OFC_SPREADSHEET_ID")?.trim() || DEFAULT_OFC_SPREADSHEET_ID,
        Deno.env.get("MASTER_OFC_GID")?.trim() || DEFAULT_OFC_GID
      )
    ]);

    const skdRows = buildSkdRows(skdCsv);
    const ofcRows = buildOfcRows(ofcCsv);
    if (skdRows.length < 100) throw new HttpError(500, `SKD rows are unexpectedly few: ${skdRows.length}`);
    if (ofcRows.length < 100) throw new HttpError(500, `OFC rows are unexpectedly few: ${ofcRows.length}`);

    const [skdCount, ofcCount] = await Promise.all([
      synchronizeTable(adminClient, "skd_master", skdRows),
      synchronizeTable(adminClient, "ofc_master", ofcRows)
    ]);

    console.info("SKD/OFC master synchronized", {
      userId: user.id,
      email: user.email,
      skdCount,
      ofcCount,
      startedAt,
      completedAt: new Date().toISOString()
    });

    return json({
      ok: true,
      skdCount,
      ofcCount,
      startedAt,
      completedAt: new Date().toISOString()
    }, 200, corsHeaders);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status >= 500) console.error("Master synchronization failed", error);
    return json({ error: message }, status, corsHeaders);
  }
});

async function getStatus(client: AdminClient) {
  const [skdResult, ofcResult] = await Promise.all([
    client.from("skd_master").select("updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1),
    client.from("ofc_master").select("updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1)
  ]);

  const error = skdResult.error || ofcResult.error;
  if (error) {
    return {
      ready: false,
      skdCount: 0,
      ofcCount: 0,
      skdUpdatedAt: null,
      ofcUpdatedAt: null,
      error: error.message
    };
  }

  return {
    ready: true,
    skdCount: skdResult.count ?? 0,
    ofcCount: ofcResult.count ?? 0,
    skdUpdatedAt: skdResult.data?.[0]?.updated_at ?? null,
    ofcUpdatedAt: ofcResult.data?.[0]?.updated_at ?? null
  };
}

async function synchronizeTable(client: AdminClient, table: string, rows: JsonRecord[]) {
  const syncToken = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const prepared = rows.map(row => ({ ...row, sync_token: syncToken, updated_at: updatedAt }));

  for (let index = 0; index < prepared.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = prepared.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await client.from(table).upsert(chunk, { onConflict: "source_row" });
    if (error) throw new HttpError(500, `${table}の同期に失敗しました。${error.message}`);
  }

  const { error: cleanupError } = await client.from(table).delete().neq("sync_token", syncToken);
  if (cleanupError) throw new HttpError(500, `${table}の旧データ削除に失敗しました。${cleanupError.message}`);
  return prepared.length;
}

async function fetchSpreadsheetCsv(spreadsheetId: string, gid: string) {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new HttpError(502, `Googleスプレッドシートを取得できませんでした。HTTP ${response.status}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_CSV_BYTES) throw new HttpError(413, "GoogleスプレッドシートのCSVが大きすぎます。");
  const text = new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
  if (/^\s*<!doctype html|^\s*<html/i.test(text)) {
    throw new HttpError(502, "GoogleスプレッドシートのCSVではなくHTMLが返されました。共有設定を確認してください。");
  }
  return text;
}

function buildSkdRows(csv: string): JsonRecord[] {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex(row => row.includes("名称") && row.includes("スタイル"));
  if (headerIndex < 0) throw new HttpError(500, "SKDのヘッダー行を確認できませんでした。");

  const headers = rows[headerIndex].map(normalizeHeader);
  return rows.slice(headerIndex + 1).map((row, index) => {
    const record = rowObject(headers, row);
    const name = clean(record["名称"]);
    if (!name) return null;
    const style = clean(record["スタイル"]);
    const typeLabel = clean(record["種別"] || record["分類"] || "特技");
    const description = clean(record["解説"]);
    return {
      source_row: headerIndex + index + 2,
      source_no: clean(record["No"] || record["NO"]),
      style,
      page_number: clean(record["ページ番号"] || record["参照P"]),
      name,
      reading: clean(record["ヨミガナ"]),
      type_label: typeLabel,
      skill: clean(record["技能"]),
      limit_text: clean(record["上限"]),
      timing: clean(record["タイミング"]),
      target: clean(record["対象"]),
      range_text: clean(record["射程"]),
      difficulty: clean(record["目標値"]),
      confrontation: clean(record["対決"]),
      description,
      search_text: searchable([style, name, record["ヨミガナ"], typeLabel, record["技能"], description])
    };
  }).filter((row): row is JsonRecord => Boolean(row));
}

function buildOfcRows(csv: string): JsonRecord[] {
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex(row => row.includes("名称") && row.includes("大分類"));
  if (headerIndex < 0) throw new HttpError(500, "OFCのヘッダー行を確認できませんでした。");

  const headers = rows[headerIndex].map(normalizeHeader);
  return rows.slice(headerIndex + 1).map((row, index) => {
    const record = rowObject(headers, row);
    const name = clean(record["名称"]);
    if (!name) return null;
    const major = clean(record["大分類"]);
    const minor = clean(record["小分類"]);
    const manufacturer = clean(record["メーカー"]);
    const description = clean(record["解説"]);
    return {
      source_row: headerIndex + index + 2,
      page_number: clean(record["ページ番号"]),
      major_category: major,
      minor_category: minor,
      manufacturer,
      name,
      site_category: mapSiteCategory(major, minor),
      purchase_target: clean(record["目標値"]),
      permanent_cost: clean(record["常備化"]),
      concealment: clean(record["隠匿値"]),
      concealment_penalty: clean(record["ペナ"]),
      attack: clean(record["攻"]),
      parry: clean(record["受"]),
      range_text: clean(record["射"]),
      speed: clean(record["ス"]),
      control_value: clean(record["制御値"]),
      electronic_control: clean(record["電制"]),
      defense_s: clean(record["S"]),
      defense_p: clean(record["P"]),
      defense_i: clean(record["I"]),
      slot: clean(record["部位"]),
      description,
      raw_data: record,
      search_text: searchable([major, minor, manufacturer, name, description])
    };
  }).filter((row): row is JsonRecord => Boolean(row));
}

function rowObject(headers: string[], row: string[]) {
  const output: Record<string, string> = {};
  headers.forEach((header, index) => {
    if (!header) return;
    const key = output[header] === undefined ? header : `${header}_${index + 1}`;
    output[key] = clean(row[index]);
  });
  return output;
}

function mapSiteCategory(major: string, minor: string) {
  const text = `${major} ${minor}`.normalize("NFKC");
  if (/ウェポン|武器/.test(text)) return "weapon";
  if (/アーマー|防具|防護服/.test(text)) return "armor";
  if (/サイバーウェア|サイバー|IANUS|義体|義肢/.test(text)) return "cyberware";
  if (/トロン|タップ|ソフトウェア|ウェブ/.test(text)) return "tron";
  if (/ヴィークル|ビークル|車両|航空機|船舶/.test(text)) return "vehicle";
  if (/レジデンス|住宅|住居/.test(text)) return "residence";
  return "other";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  row.push(field);
  if (row.length > 1 || row[0]) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return clean(value).replace(/\s+/g, "");
}

function clean(value: unknown) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function searchable(values: unknown[]) {
  return values.map(clean).join(" ").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) throw new HttpError(401, "Authentication is required.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new HttpError(500, "Supabase authentication environment is incomplete.");

  const client = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const token = authorization.slice(7).trim();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "The login session is invalid or expired.");
  return { id: user.id, email: user.email };
}

function createAdminClient(): AdminClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new HttpError(500, "Supabase service-role environment is incomplete.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isMasterAdmin(user: AuthenticatedUser) {
  const ids = splitEnvironmentList(Deno.env.get("MASTER_DATA_ADMIN_USER_IDS"));
  const emails = splitEnvironmentList(Deno.env.get("MASTER_DATA_ADMIN_EMAILS")).map(value => value.toLowerCase());
  return ids.includes(user.id) || Boolean(user.email && emails.includes(user.email.toLowerCase()));
}

function splitEnvironmentList(value: string | undefined) {
  return String(value ?? "").split(/[\s,;]+/).map(item => item.trim()).filter(Boolean);
}

function isAllowedOrigin(origin: string) {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  const allowed = splitEnvironmentList(Deno.env.get("MASTER_DATA_ALLOWED_ORIGINS") || DEFAULT_ALLOWED_ORIGIN);
  return allowed.some(value => origin === value || origin.startsWith(`${value.replace(/\/$/, "")}/`));
}

function createCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) && origin ? origin : DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), { status, headers });
}
