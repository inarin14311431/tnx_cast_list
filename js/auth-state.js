import { SITE_BASE_PATH } from "./config.js";
import { supabase } from "./supabase-client.js";

/**
 * 現在のログインユーザーを取得する。
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to get current user:", error);
    return null;
  }

  return user;
}

/**
 * 現在のセッションを取得する。
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to get current session:", error);
    return null;
  }

  return session;
}

/**
 * 未ログインならログインページへ移動する。
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    const returnUrl =
      `${window.location.pathname}${window.location.search}`;

    const loginUrl = new URL(
      `${SITE_BASE_PATH}login.html`,
      window.location.origin
    );

    loginUrl.searchParams.set("return", returnUrl);

    window.location.replace(loginUrl.href);
    return null;
  }

  return user;
}

/**
 * ログアウトする。
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  window.location.replace(
    `${window.location.origin}${SITE_BASE_PATH}index.html`
  );
}

/**
 * ヘッダー内の認証表示を更新する。
 */
export async function renderAuthNavigation() {
  const container = document.querySelector("#auth-navigation");

  if (!container) {
    return;
  }

  const user = await getCurrentUser();

  if (user) {
    container.innerHTML = `
      <a href="./account.html" class="auth-navigation__account">
        ${escapeHtml(user.email ?? "ACCOUNT")}
      </a>

      <button
        id="header-logout-button"
        class="auth-navigation__logout"
        type="button"
      >
        LOGOUT
      </button>
    `;

    document
      .querySelector("#header-logout-button")
      ?.addEventListener("click", async () => {
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
    <a href="./login.html">
      LOGIN
    </a>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}