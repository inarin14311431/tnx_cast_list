import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGIN = "https://inarin14311431.github.io";
const PRIMARY_ADMIN_USER_ID = "f44d74d1-5f09-425f-8de8-a7fb6b46ea79";
const PRIMARY_ADMIN_EMAIL = "inarin1431@gmail.com";
const CHARACTER_IMAGE_BUCKET = "character-images";
const PAGE_SIZE = 200;
const MAX_USERS = 5000;
const STORAGE_PAGE_SIZE = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthenticatedUser = { id: string; email?: string };
type AdminClient = ReturnType<typeof createClient>;
type RequestBody = {
  action?: unknown;
  userId?: unknown;
  email?: unknown;
};

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
    const operator = await requireAuthenticatedUser(request);
    if (!isPrimaryAdmin(operator)) throw new HttpError(403, "This operation is restricted to the primary administrator.");

    const body = await request.json().catch(() => ({})) as RequestBody;
    const action = typeof body.action === "string" ? body.action : "list";
    const adminClient = createAdminClient();

    if (action === "list") {
      const users = await listAuthUsers(adminClient);
      return json({
        ok: true,
        users,
        count: users.length,
        truncated: users.length >= MAX_USERS
      }, 200, corsHeaders);
    }

    if (action === "delete") {
      const result = await deleteAuthUserCompletely(adminClient, body, operator);
      return json({ ok: true, ...result }, 200, corsHeaders);
    }

    throw new HttpError(400, "Unknown action.");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status >= 500) console.error("Auth user administration failed", error);
    return json({ error: message }, status, corsHeaders);
  }
});

async function listAuthUsers(client: AdminClient) {
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

async function deleteAuthUserCompletely(client: AdminClient, body: RequestBody, operator: AuthenticatedUser) {
  const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  const expectedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!UUID_PATTERN.test(targetUserId)) throw new HttpError(400, "削除対象ユーザーIDの形式が正しくありません。");
  if (targetUserId === operator.id || targetUserId === PRIMARY_ADMIN_USER_ID) {
    throw new HttpError(403, "管理者本人のアカウントは削除できません。");
  }

  const { data: targetResult, error: targetError } = await client.auth.admin.getUserById(targetUserId);
  if (targetError || !targetResult?.user) throw new HttpError(404, "削除対象のAuthユーザーが見つかりません。");

  const targetEmail = String(targetResult.user.email ?? "").trim();
  if (!targetEmail) throw new HttpError(409, "削除対象ユーザーのメールアドレスを確認できません。");
  if (targetEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL) throw new HttpError(403, "管理者本人のアカウントは削除できません。");
  if (expectedEmail && expectedEmail !== targetEmail.toLowerCase()) {
    throw new HttpError(409, "選択後にユーザー情報が変更されています。登録者一覧を再読み込みしてください。");
  }

  const storageDeletedCount = await deleteUserStorage(client, targetUserId);
  const databaseResult = await deleteUserDatabaseRows(client, targetUserId);

  const { error: deleteUserError } = await client.auth.admin.deleteUser(targetUserId, false);
  if (deleteUserError) {
    throw new HttpError(500, `関連データは削除されましたが、Authユーザー本体の削除に失敗しました。${deleteUserError.message}`);
  }

  console.info("Auth user completely deleted", {
    operatorId: operator.id,
    targetUserId,
    targetEmail,
    storageDeletedCount,
    ...databaseResult
  });

  return {
    deletedUserId: targetUserId,
    deletedEmail: targetEmail,
    storageDeletedCount,
    ...databaseResult
  };
}

async function deleteUserDatabaseRows(client: AdminClient, userId: string) {
  const { data: characterRows, error: characterReadError } = await client
    .from("characters")
    .select("id")
    .eq("owner_id", userId);
  if (characterReadError) throw new HttpError(500, `所有キャストの確認に失敗しました。${characterReadError.message}`);

  const characterIds = (characterRows ?? []).map(row => String(row.id)).filter(Boolean);

  if (characterIds.length) {
    await deleteByIds(client, "act_participants", "character_id", characterIds);
    await deleteByIds(client, "character_combos", "character_id", characterIds, true);
    await deleteByIds(client, "character_outfits", "character_id", characterIds);
    await deleteByIds(client, "character_skills", "character_id", characterIds);
  }

  const { error: characterDeleteError } = await client.from("characters").delete().eq("owner_id", userId);
  if (characterDeleteError) throw new HttpError(500, `キャスト本体の削除に失敗しました。${characterDeleteError.message}`);

  const { error: actUpdateError } = await client.from("acts").update({ published_by: null }).eq("published_by", userId);
  if (actUpdateError) throw new HttpError(500, `アクト公開者情報の解除に失敗しました。${actUpdateError.message}`);

  const { error: allowlistDeleteError } = await client.from("master_search_users").delete().eq("user_id", userId);
  if (allowlistDeleteError && !isMissingRelationError(allowlistDeleteError)) {
    throw new HttpError(500, `検索利用許可の削除に失敗しました。${allowlistDeleteError.message}`);
  }

  return { deletedCharacterCount: characterIds.length };
}

async function deleteByIds(
  client: AdminClient,
  table: string,
  column: string,
  values: string[],
  optional = false
) {
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    const { error } = await client.from(table).delete().in(column, chunk);
    if (!error) continue;
    if (optional && isMissingRelationError(error)) return;
    throw new HttpError(500, `${table}の関連データ削除に失敗しました。${error.message}`);
  }
}

async function deleteUserStorage(client: AdminClient, userId: string) {
  let paths: string[];
  try {
    paths = await collectStoragePaths(client, userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/bucket.*not found|not found/i.test(message)) return 0;
    throw error;
  }

  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100);
    const { error } = await client.storage.from(CHARACTER_IMAGE_BUCKET).remove(chunk);
    if (error) throw new HttpError(500, `キャスト画像の削除に失敗しました。${error.message}`);
  }
  return paths.length;
}

async function collectStoragePaths(client: AdminClient, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(CHARACTER_IMAGE_BUCKET).list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" }
    });
    if (error) throw new HttpError(500, `キャスト画像一覧の取得に失敗しました。${error.message}`);

    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.metadata) paths.push(path);
      else paths.push(...await collectStoragePaths(client, path));
    }

    if (entries.length < STORAGE_PAGE_SIZE) break;
    offset += STORAGE_PAGE_SIZE;
  }

  return paths;
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(String(error.message ?? ""));
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
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function isPrimaryAdmin(user: AuthenticatedUser) {
  return user.id === PRIMARY_ADMIN_USER_ID && String(user.email ?? "").trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
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
