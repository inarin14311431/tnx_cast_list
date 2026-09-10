const SUPABASE_URL = "https://koprmbkoftuuffslhsvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dsb9Boo4aP3c_v-Iaam4mw_F1szMdUi";

const showcaseRequests = new Map();
const guestRequests = new Map();

export function normalizeShowcaseSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function loadPublicShowcase(value) {
  const slug = normalizeShowcaseSlug(value);
  if (!slug) return Promise.reject(new Error("アクト識別名が指定されていません。"));
  return cachedRequest(showcaseRequests, slug, () => callPublicRpc("get_public_act_showcase", { p_slug: slug }));
}

export function loadPublicShowcaseGuests(value) {
  const slug = normalizeShowcaseSlug(value);
  if (!slug) return Promise.resolve([]);
  return cachedRequest(guestRequests, slug, () => callPublicRpc("get_public_act_showcase_guests", { p_slug: slug }));
}

function cachedRequest(cache, key, factory) {
  if (cache.has(key)) return cache.get(key);
  const request = Promise.resolve()
    .then(factory)
    .catch(error => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, request);
  return request;
}

async function callPublicRpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const responseText = await response.text();
  let payload = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === "object" && payload
      ? [payload.message, payload.hint, payload.details, payload.code].filter(Boolean).join(" / ")
      : String(payload || "");
    throw new Error(translatePublicShowcaseError({ message: detail, status: response.status }));
  }
  return payload;
}

export function translatePublicShowcaseError(error) {
  const message = String(error?.message || "");
  if (/invalid jwt|jwt.*invalid|expected 3 parts/i.test(message)) {
    return "公開データ取得用の認証ヘッダーが不正でした。ページを再読み込みしてください。";
  }
  if (/get_public_act_showcase|function.*does not exist|schema cache|PGRST202/i.test(message)) {
    return "動的公開機能が未設定です。管理者がSupabaseの設定を確認してください。";
  }
  if (/permission denied|not authorized|401|403/i.test(`${error?.status || ""} ${message}`)) {
    return "公開アクト紹介の参照権限がありません。Supabaseの公開RPC権限を確認してください。";
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "公開データの取得に失敗しました。通信状態を確認して再読み込みしてください。";
  }
  return message || "アクト紹介を読み込めませんでした。";
}
