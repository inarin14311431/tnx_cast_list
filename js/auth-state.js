import { SITE_BASE_PATH } from "./config.js";
import { supabase } from "./supabase-client.js";

export async function getCurrentUser() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Failed to get current session:", sessionError);
    return null;
  }
  if (!session) return null;

  let result = await supabase.auth.getUser();

  // A short retry prevents a transient token refresh/network race from sending an
  // authenticated user back to the login page while the login page still sees a
  // cached session and redirects to the account page again.
  if (result.error && !isInvalidSessionError(result.error)) {
    await delay(250);
    result = await supabase.auth.getUser();
  }

  if (result.error || !result.data.user) {
    console.error("Failed to get current user:", result.error);
    if (isInvalidSessionError(result.error)) await clearLocalSession();
    return null;
  }

  return result.data.user;
}

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Failed to get current session:", error);
    return null;
  }
  return session;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const loginPath = `${SITE_BASE_PATH}login.html`;

    // Never redirect the login page back to itself. This also protects against a
    // malformed return parameter that points to login.html.
    if (window.location.pathname === loginPath) return null;

    const loginUrl = new URL(loginPath, window.location.origin);
    loginUrl.searchParams.set("return", currentPath);
    window.location.replace(loginUrl.href);
    return null;
  }
  return user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.replace(`${window.location.origin}${SITE_BASE_PATH}index.html`);
}

export async function renderAuthNavigation() {
  const container = document.querySelector("#auth-navigation");
  if (!container) return;

  const user = await getCurrentUser();

  if (user) {
    container.innerHTML = `
      <a href="./account.html" class="auth-navigation__account">
        <span class="auth-navigation__account-main">キャスト管理</span>
        <small>CAST MANAGEMENT / ${escapeHtml(user.email ?? "ACCOUNT")}</small>
      </a>
      <button id="header-logout-button" class="auth-navigation__logout" type="button">
        <span>ログアウト</span>
        <small>LOGOUT</small>
      </button>
    `;

    document.querySelector("#header-logout-button")?.addEventListener("click", async () => {
      try {
        await signOut();
      } catch (error) {
        console.error(error);
        alert("ログアウトに失敗しました。");
      }
    });
    return;
  }

  container.innerHTML = `
    <a href="./login.html" class="auth-navigation__account">
      <span class="auth-navigation__account-main">ログイン</span>
      <small>LOGIN / CAST MANAGEMENT</small>
    </a>
  `;
}

async function clearLocalSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.warn("Could not clear the stale local session through Supabase.", error);
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && /^sb-.*-auth-token$/.test(key)) localStorage.removeItem(key);
      }
    } catch {
      // Storage may be unavailable.
    }
  }
}

function isInvalidSessionError(error) {
  if (!error) return false;
  const status = Number(error.status ?? error.statusCode ?? 0);
  const message = String(error.message ?? "").toLowerCase();
  return status === 401 ||
    /invalid.*(?:jwt|token|session)|(?:jwt|token|session).*expired|refresh token.*(?:not found|invalid|expired)/i.test(message);
}

function delay(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
