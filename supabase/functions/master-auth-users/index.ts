import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGIN = "https://inarin14311431.github.io";
const PAGE_SIZE = 200;
const MAX_USERS = 5000;

type AuthenticatedUser = { id: string; email?: string };

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
    if (!isMasterAdmin(user)) throw new HttpError(403, "Auth user listing is restricted to administrators.");

    const body = await request.json().catch(() => ({})) as { action?: unknown };
    const action = typeof body.action === "string" ? body.action : "list";
    if (action !== "list") throw new HttpError(400, "Unknown action.");

    const adminClient = createAdminClient();
    const users = await listAuthUsers(adminClient);

    return json({
      ok: true,
      users,
      count: users.length,
      truncated: users.length >= MAX_USERS
    }, 200, corsHeaders);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status >= 500) console.error("Auth user listing failed", error);
    return json({ error: message }, status, corsHeaders);
  }
});

async function listAuthUsers(client: ReturnType<typeof createClient>) {
  const users: Array<{ id: string; email: string; createdAt: string | null; lastSignInAt: string | null }> = [];

  for (let page = 1; users.length < MAX_USERS; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new HttpError(500, `Supabase Authの登録者を取得できませんでした。${error.message}`);

    const pageUsers = data?.users ?? [];
    for (const account of pageUsers) {
      const email = String(account.email ?? "").trim();
      if (!email) continue;
      users.push({
        id: account.id,
        email,
        createdAt: account.created_at ?? null,
        lastSignInAt: account.last_sign_in_at ?? null
      });
      if (users.length >= MAX_USERS) break;
    }

    if (pageUsers.length < PAGE_SIZE) break;
  }

  return users.sort((left, right) => left.email.localeCompare(right.email, "ja", { sensitivity: "base" }));
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

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new HttpError(500, "Supabase service-role environment is incomplete.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
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
