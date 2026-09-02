import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGIN = "https://inarin14311431.github.io";
const SOURCE_HOST = "character-sheets.appspot.com";
const SOURCE_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_KEY_LENGTH = 256;
const MAX_REQUESTS_PER_MINUTE = 20;

type AuthenticatedUser = { id: string; email?: string };

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const requestWindows = new Map<string, { startedAt: number; count: number }>();

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
    const key = validateKey(body?.key);
    consumeRateLimit(user.id);

    const payload = await fetchCharacterSheet(key);
    return json(payload, 200, corsHeaders);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status >= 500) console.error("Character sheet source proxy failed", error);
    return json({ error: message }, status, corsHeaders);
  }
});

function validateKey(value: unknown): string {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key || key.length > MAX_KEY_LENGTH || !/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new HttpError(400, "キャラクターシート倉庫URLのkeyが不正です。");
  }
  return key;
}

function consumeRateLimit(userId: string) {
  const now = Date.now();
  const current = requestWindows.get(userId);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(userId, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= MAX_REQUESTS_PER_MINUTE) {
    throw new HttpError(429, "取込回数が多すぎます。しばらく待ってから再実行してください。");
  }
  current.count += 1;
}

async function fetchCharacterSheet(key: string) {
  const callback = `tnxSourceProxy_${crypto.randomUUID().replaceAll("-", "")}`;
  const candidates = [
    "/tnx/display?ajax=1",
    "/tnx/display.html?ajax=1"
  ];
  let lastFailure: unknown = null;

  for (const candidate of candidates) {
    const url = new URL(`https://${SOURCE_HOST}${candidate}`);
    url.searchParams.set("key", key);
    url.searchParams.set("callback", callback);

    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        lastFailure = new Error(`HTTP ${response.status}`);
        continue;
      }
      const text = await readLimitedText(response);
      return parsePayload(text);
    } catch (error) {
      lastFailure = error;
    }
  }

  if (lastFailure instanceof Error && lastFailure.name === "AbortError") {
    throw new HttpError(504, "キャラクターシート倉庫からの応答がタイムアウトしました。");
  }
  throw new HttpError(502, "キャラクターシート倉庫からデータを取得できませんでした。");
}

async function fetchWithTimeout(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "tnx-cast-archive-source-proxy"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readLimitedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new HttpError(502, "キャラクターシート倉庫の応答が大きすぎます。");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_RESPONSE_BYTES) {
    throw new HttpError(502, "キャラクターシート倉庫の応答が大きすぎます。");
  }
  return new TextDecoder().decode(bytes).replace(/^\uFEFF/, "").trim();
}

function parsePayload(source: string): unknown {
  if (!source) throw new Error("Empty source response.");
  const withoutSemicolon = source.replace(/;\s*$/, "").trim();
  try {
    return JSON.parse(withoutSemicolon);
  } catch {}

  const open = withoutSemicolon.indexOf("(");
  const close = withoutSemicolon.lastIndexOf(")");
  const prefix = withoutSemicolon.slice(0, open).trim();
  if (open > 0 && close > open && /^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(prefix)) {
    try {
      return JSON.parse(withoutSemicolon.slice(open + 1, close));
    } catch {}
  }

  throw new Error("Invalid source response.");
}

async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "ログインが必要です。");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    throw new HttpError(500, "Supabase authentication environment is incomplete.");
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const token = authorization.slice(7).trim();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "ログインセッションが無効です。");
  return { id: user.id, email: String(user.email ?? "").toLowerCase() };
}

function isAllowedOrigin(origin: string) {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  const configured = parseList(Deno.env.get("CHARACTER_SHEET_PROXY_ALLOWED_ORIGINS"));
  const allowed = configured.length ? configured : [DEFAULT_ALLOWED_ORIGIN];
  return allowed.includes(origin);
}

function parseList(value: string | undefined) {
  return String(value ?? "").split(",").map(item => item.trim()).filter(Boolean);
}

function createCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) && origin ? origin : DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin"
  };
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), { status, headers });
}