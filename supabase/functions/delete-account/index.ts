import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGIN = "https://inarin14311431.github.io";
const CHARACTER_IMAGE_BUCKET = "character-images";
const STORAGE_PAGE_SIZE = 1000;

type AdminClient = ReturnType<typeof createClient>;
type RequestBody = {
  confirmation?: unknown;
  password?: unknown;
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

Deno.serve(async request => {
  const origin = request.headers.get("origin") ?? "";
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return isAllowedOrigin(origin)
      ? new Response("ok", { headers: cors })
      : json({ error: "Origin is not allowed." }, 403, cors);
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, cors);
  }
  if (!isAllowedOrigin(origin)) {
    return json({ error: "Origin is not allowed." }, 403, cors);
  }

  try {
    const body = await request.json().catch(() => ({})) as RequestBody;
    if (body.confirmation !== "DELETE") {
      throw new HttpError(400, "削除確認文字列が正しくありません。");
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      throw new HttpError(400, "現在のパスワードを入力してください。");
    }

    const user = await requireUser(request);
    await verifyPassword(user.id, user.email, password);

    const admin = createAdminClient();
    const storageDeletedCount = await deleteUserStorage(admin, user.id);
    const { data: purgeResult, error: purgeError } = await admin.rpc(
      "purge_user_application_data",
      { p_user_id: user.id }
    );
    if (purgeError) {
      throw new HttpError(
        500,
        `登録データの削除に失敗しました。${purgeError.message}`
      );
    }

    const { error: authError } = await admin.auth.admin.deleteUser(
      user.id,
      false
    );
    if (authError) {
      throw new HttpError(
        500,
        `登録データは削除されましたが、アカウント本体の削除に失敗しました。再度削除操作を実行してください。${authError.message}`
      );
    }

    console.info("Self account deleted", {
      userId: user.id,
      storageDeletedCount,
      purgeResult
    });
    return json({ ok: true, storageDeletedCount, purgeResult }, 200, cors);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status >= 500) console.error("Self account deletion failed", error);
    return json({ error: message }, status, cors);
  }
});

async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Authentication is required.");
  }

  const { url, publicKey } = getPublicAuthEnvironment();
  const client = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const token = authorization.slice(7).trim();
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    throw new HttpError(401, "ログインセッションが無効です。再ログインしてください。");
  }
  if (!user.email) {
    throw new HttpError(409, "ログイン中のメールアドレスを確認できません。");
  }
  return user;
}

async function verifyPassword(
  expectedUserId: string,
  email: string | undefined,
  password: string
) {
  if (!email) {
    throw new HttpError(409, "ログイン中のメールアドレスを確認できません。");
  }

  const { url, publicKey } = getPublicAuthEnvironment();
  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user || data.user.id !== expectedUserId) {
    throw new HttpError(403, "パスワードが正しくありません。");
  }

  await client.auth.signOut({ scope: "local" }).catch(() => {});
}

function getPublicAuthEnvironment() {
  const url = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !publicKey) {
    throw new HttpError(
      500,
      "Supabase authentication environment is incomplete."
    );
  }
  return { url, publicKey };
}

function createAdminClient(): AdminClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new HttpError(
      500,
      "Supabase service-role environment is incomplete."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function deleteUserStorage(client: AdminClient, userId: string) {
  let paths: string[];
  try {
    paths = await collectPaths(client, userId);
  } catch (error) {
    if (/bucket.*not found|not found/i.test(String(error))) return 0;
    throw error;
  }

  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await client.storage
      .from(CHARACTER_IMAGE_BUCKET)
      .remove(paths.slice(index, index + 100));
    if (error) {
      throw new HttpError(
        500,
        `キャスト画像の削除に失敗しました。${error.message}`
      );
    }
  }
  return paths.length;
}

async function collectPaths(
  client: AdminClient,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage
      .from(CHARACTER_IMAGE_BUCKET)
      .list(prefix, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" }
      });
    if (error) {
      throw new HttpError(
        500,
        `キャスト画像一覧の取得に失敗しました。${error.message}`
      );
    }

    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.metadata) paths.push(path);
      else paths.push(...await collectPaths(client, path));
    }

    if (entries.length < STORAGE_PAGE_SIZE) break;
    offset += STORAGE_PAGE_SIZE;
  }
  return paths;
}

function isAllowedOrigin(origin: string) {
  if (!origin) return false;
  const allowed = (
    Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ALLOWED_ORIGIN
  )
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return allowed.some(value =>
    origin === value || origin.startsWith(`${value}/`)
  );
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin":
      isAllowedOrigin(origin) ? origin : DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(body: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
