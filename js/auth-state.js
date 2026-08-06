import { SITE_BASE_PATH } from "./config.js?v=2";
import { supabase } from "./supabase-client.js";

let pendingSessionRequest = null;

export async function getCurrentSession() {
  if (pendingSessionRequest) return pendingSessionRequest;
  pendingSessionRequest = readCurrentSession();
  try {
    return await pendingSessionRequest;
  } finally {
    pendingSessionRequest = null;
  }
}

async function readCurrentSession() {
  try {
    const result = await withTimeout(
      supabase.auth.getSession(),
      5000,
      "Authentication check timed out."
    );
    const { data: { session }, error } = result;
    if (error) throw error;
    return session;
  } catch (error) {
    console.error("Failed to get current session:", error);
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (user) return user;

  const loginPath = `${SITE_BASE_PATH}login.html`;
  if (window.location.pathname === loginPath) return null;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const loginUrl = new URL(loginPath, window.location.origin);
  loginUrl.searchParams.set("return", currentPath);
  window.location.replace(loginUrl.href);
  return null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
  window.location.replace(`${window.location.origin}${SITE_BASE_PATH}index.html`);
}

export async function renderAuthNavigation(knownSession) {
  const container = document.querySelector("#auth-navigation");
  if (!container) return;

  const user = knownSession === undefined
    ? await getCurrentUser()
    : knownSession?.user ?? null;

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

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
