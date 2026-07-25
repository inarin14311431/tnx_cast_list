import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_REPOSITORY = "inarin14311431/tnx_cast_list";
const DEFAULT_BRANCH = "main";
const OUTPUT_DIRECTORY = "showcases";
const DEFAULT_PAGES_BASE = "https://inarin14311431.github.io/tnx_cast_list";
const MAX_HTML_BYTES = 2_000_000;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_HTML_RULES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /<\s*script\b/i, message: "script要素を含むHTMLは公開できません。" },
  { pattern: /<\s*(iframe|object|embed|applet|base|form)\b/i, message: "外部実行や送信を行うHTML要素は公開できません。" },
  { pattern: /\son[a-z0-9_-]+\s*=/i, message: "イベントハンドラー属性を含むHTMLは公開できません。" },
  { pattern: /javascript\s*:/i, message: "javascript: URLを含むHTMLは公開できません。" },
  { pattern: /<\s*meta\b[^>]*http-equiv\s*=\s*(?:["']\s*refresh\s*["']|refresh)/i, message: "自動転送を含むHTMLは公開できません。" }
];

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
    const body = await request.json().catch(() => null) as PublishRequest | null;
    const input = validateRequest(body);

    const adminClient = createAdminClient();
    await assertActHistorySchema(adminClient);
    await assertSlugOwnership(adminClient, input.slug, user.id);
    await assertPublicParticipants(adminClient, input.participantIds);

    if (input.mode === "history") {
      const actId = await recordActHistory(adminClient, {
        slug: input.slug,
        actName: input.actName,
        rulerName: input.rulerName,
        recordedBy: user.id,
        participantIds: input.participantIds
      });

      console.info("Act history registered without publication", {
        userId: user.id,
        email: user.email,
        slug: input.slug,
        actId,
        participantCount: input.participantIds.length
      });

      return json({
        ok: true,
        mode: "history",
        historyOnly: true,
        slug: input.slug,
        actId,
        participantCount: input.participantIds.length
      }, 200, corsHeaders);
    }

    const githubToken = Deno.env.get("GITHUB_SHOWCASE_TOKEN")?.trim();
    if (!githubToken) throw new HttpError(500, "GITHUB_SHOWCASE_TOKEN is not configured.");

    const repository = Deno.env.get("GITHUB_SHOWCASE_REPOSITORY")?.trim() || DEFAULT_REPOSITORY;
    const branch = Deno.env.get("GITHUB_SHOWCASE_BRANCH")?.trim() || DEFAULT_BRANCH;
    const pagesBase = (Deno.env.get("GITHUB_SHOWCASE_PAGES_BASE")?.trim() || DEFAULT_PAGES_BASE).replace(/\/+$/, "");
    const path = `${OUTPUT_DIRECTORY}/${input.slug}.html`;
    const publicUrl = `${pagesBase}/${path}`;
    const result = await publishToGitHub({
      token: githubToken,
      repository,
      branch,
      path,
      html: input.html,
      actName: input.actName
    });

    let actId = "";
    try {
      actId = await recordActPublication(adminClient, {
        slug: input.slug,
        actName: input.actName,
        rulerName: input.rulerName,
        publicUrl,
        publishedBy: user.id,
        participantIds: input.participantIds
      });
    } catch (error) {
      console.error("Act history registration failed after GitHub publication", error);
      throw new HttpError(500, `GitHubへの公開は完了しましたが、参加アクト履歴の登録に失敗しました。${errorMessage(error)}`);
    }

    console.info("Act showcase published", {
      userId: user.id,
      email: user.email,
      repository,
      branch,
      path,
      actId,
      participantCount: input.participantIds.length,
      commitSha: result.commitSha
    });

    return json({
      ok: true,
      mode: "publish",
      slug: input.slug,
      path,
      actId,
      participantCount: input.participantIds.length,
      commitSha: result.commitSha,
      publicUrl
    }, 200, corsHeaders);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status >= 500) console.error("Act showcase operation failed", error);
    return json({ error: message }, status, corsHeaders);
  }
});

type PublishRequest = {
  mode?: unknown;
  slug?: unknown;
  actName?: unknown;
  rulerName?: unknown;
  html?: unknown;
  participantIds?: unknown;
};
type AuthenticatedUser = { id: string; email?: string };
type AdminClient = ReturnType<typeof createClient>;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
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

function validateRequest(body: PublishRequest | null) {
  if (!body || typeof body !== "object") throw new HttpError(400, "A JSON request body is required.");

  const mode = body.mode === "history" ? "history" : "publish";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const actName = typeof body.actName === "string" ? body.actName.trim() : "";
  const rulerName = typeof body.rulerName === "string" ? body.rulerName.trim() : "";
  const html = typeof body.html === "string" ? body.html : "";
  const rawParticipantIds = Array.isArray(body.participantIds) ? body.participantIds : [];
  const participantIds = [...new Set(rawParticipantIds.filter(value => typeof value === "string").map(value => value.trim()))];

  if (!SLUG_PATTERN.test(slug)) throw new HttpError(400, "アクト識別名は1～64文字の半角小文字英数字とハイフンで入力してください。");
  if (!actName || actName.length > 200) throw new HttpError(400, "アクト名は1～200文字で入力してください。");
  if (rulerName.length > 120) throw new HttpError(400, "RULER名は120文字以内で入力してください。");
  if (participantIds.length < 1 || participantIds.length > 6) throw new HttpError(400, "履歴へ登録できる公開キャストを1～6名で指定してください。");
  if (participantIds.some(id => !UUID_PATTERN.test(id))) throw new HttpError(400, "参加キャストIDの形式が正しくありません。");

  if (mode === "publish") {
    if (!html.trim()) throw new HttpError(400, "Generated HTML is empty.");
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) throw new HttpError(413, "Generated HTML exceeds the 2 MB publication limit.");
    if (!/^\s*<!doctype html>/i.test(html) || !/<html[\s>]/i.test(html)) throw new HttpError(400, "Only a complete HTML document can be published.");
    for (const rule of FORBIDDEN_HTML_RULES) {
      if (rule.pattern.test(html)) throw new HttpError(400, rule.message);
    }
  }

  return { mode, slug, actName, rulerName, html, participantIds };
}

async function assertActHistorySchema(client: AdminClient) {
  const { error } = await client.from("acts").select("id, published_by").limit(1);
  if (error) throw new HttpError(500, `アクト履歴テーブルを確認できません。supabase/07_act_history.sqlを実行してください。 ${error.message}`);
}

async function assertSlugOwnership(client: AdminClient, slug: string, userId: string) {
  const { data, error } = await client
    .from("acts")
    .select("id, published_by")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new HttpError(500, `アクト識別名の所有者を確認できませんでした。 ${error.message}`);
  if (data?.published_by && data.published_by !== userId) {
    throw new HttpError(409, "このアクト識別名は別のユーザーが使用しています。別の識別名を指定してください。");
  }
}

async function assertPublicParticipants(client: AdminClient, participantIds: string[]) {
  const { data, error } = await client
    .from("characters")
    .select("id")
    .in("id", participantIds)
    .eq("visibility", "public");
  if (error) throw new HttpError(500, `参加キャストの確認に失敗しました。 ${error.message}`);
  if ((data ?? []).length !== participantIds.length) throw new HttpError(400, "選択したキャストの一部が非公開、または存在しません。");
}

async function recordActPublication(client: AdminClient, input: {
  slug: string;
  actName: string;
  rulerName: string;
  publicUrl: string;
  publishedBy: string;
  participantIds: string[];
}) {
  const { data, error } = await client.rpc("record_act_publication", {
    p_slug: input.slug,
    p_act_name: input.actName,
    p_ruler_name: input.rulerName,
    p_public_url: input.publicUrl,
    p_published_by: input.publishedBy,
    p_participant_ids: input.participantIds
  });
  if (error) throw error;
  return typeof data === "string" ? data : "";
}

async function recordActHistory(client: AdminClient, input: {
  slug: string;
  actName: string;
  rulerName: string;
  recordedBy: string;
  participantIds: string[];
}) {
  const { data, error } = await client.rpc("record_act_history", {
    p_slug: input.slug,
    p_act_name: input.actName,
    p_ruler_name: input.rulerName,
    p_recorded_by: input.recordedBy,
    p_participant_ids: input.participantIds
  });
  if (error) throw error;
  return typeof data === "string" ? data : "";
}

async function publishToGitHub(input: { token: string; repository: string; branch: string; path: string; html: string; actName: string }) {
  const encodedPath = input.path.split("/").map(encodeURIComponent).join("/");
  const endpoint = `https://api.github.com/repos/${input.repository}/contents/${encodedPath}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${input.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "tnx-cast-act-showcase-edge-function"
  };

  let sha = "";
  const existing = await fetch(`${endpoint}?ref=${encodeURIComponent(input.branch)}`, { headers });
  if (existing.ok) {
    const metadata = await existing.json();
    sha = typeof metadata?.sha === "string" ? metadata.sha : "";
  } else if (existing.status !== 404) {
    throw new HttpError(existing.status, await githubError(existing));
  }

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Publish act showcase: ${sanitizeCommitText(input.actName)}`,
      content: encodeBase64Utf8(input.html),
      branch: input.branch,
      ...(sha ? { sha } : {})
    })
  });
  if (!response.ok) throw new HttpError(response.status, await githubError(response));
  const result = await response.json();
  return { commitSha: result?.commit?.sha ?? "" };
}

function encodeBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  return btoa(binary);
}

async function githubError(response: Response) {
  try {
    const payload = await response.clone().json();
    const message = typeof payload?.message === "string" ? payload.message : "GitHub API request failed.";
    return `GitHub API: ${message}`;
  } catch {
    return `GitHub API request failed with status ${response.status}.`;
  }
}

function sanitizeCommitText(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 120) || "act-showcase";
}

function parseList(value: string | undefined) {
  return String(value ?? "").split(",").map(item => item.trim()).filter(Boolean);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? ` ${error.message}` : "";
}

function isAllowedOrigin(origin: string) {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  const configured = parseList(Deno.env.get("SHOWCASE_ALLOWED_ORIGINS"));
  const allowed = configured.length ? configured : ["https://inarin14311431.github.io"];
  return allowed.includes(origin);
}

function createCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) && origin ? origin : "https://inarin14311431.github.io",
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
