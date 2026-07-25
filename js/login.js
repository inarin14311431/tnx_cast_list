import { SITE_BASE_PATH } from "./config.js";
import { supabase } from "./supabase-client.js";

const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const messageArea = document.querySelector("#auth-message");
let redirecting = false;

setupTabs();
checkExistingSession();
loginForm?.addEventListener("submit", handleLogin);
signupForm?.addEventListener("submit", handleSignup);

async function checkExistingSession() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) return;

    // A cached session can remain after its access or refresh token has become
    // invalid. Validate the actual user before leaving the login page; checking
    // session existence alone causes login/account redirect loops.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (user && !userError) {
      redirectAfterLogin();
      return;
    }

    if (isInvalidSessionError(userError)) {
      await clearLocalSession();
      setMessage("保存されていたログイン情報の期限が切れています。もう一度ログインしてください。 / SESSION EXPIRED", "error");
      return;
    }

    if (userError) throw userError;
  } catch (error) {
    console.error("Failed to verify the existing login session:", error);
    setMessage("ログイン状態を確認できませんでした。再読み込み後も続く場合は、メールアドレスとパスワードでログインしてください。 / SESSION CHECK FAILED", "error");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.querySelector("#login-email").value.trim();
  const password = document.querySelector("#login-password").value;

  setMessage("本人確認中… / VERIFYING IDENTITY", "loading");
  setFormsDisabled(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("The authenticated session could not be established.");
    setMessage("認証しました。接続を開始します。 / ACCESS GRANTED", "success");
    window.setTimeout(redirectAfterLogin, 400);
  } catch (error) {
    console.error(error);
    setMessage(translateAuthError(error), "error");
  } finally {
    setFormsDisabled(false);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const email = document.querySelector("#signup-email").value.trim();
  const password = document.querySelector("#signup-password").value;
  const confirmation = document.querySelector("#signup-password-confirmation").value;

  if (password !== confirmation) {
    setMessage("パスワードが一致していません。 / PASSWORDS DO NOT MATCH", "error");
    return;
  }

  const redirectUrl = `${window.location.origin}${SITE_BASE_PATH}account.html`;
  setMessage("アカウントを登録中… / REGISTERING NEW IDENTITY", "loading");
  setFormsDisabled(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    if (error) throw error;

    if (data.session) {
      setMessage("登録が完了しました。 / REGISTRATION COMPLETE", "success");
      window.setTimeout(redirectAfterLogin, 400);
      return;
    }

    setMessage("確認メールを送信しました。メール内のリンクを開いて登録を完了してください。 / CONFIRMATION EMAIL SENT", "success");
    signupForm.reset();
  } catch (error) {
    console.error(error);
    setMessage(translateAuthError(error), "error");
  } finally {
    setFormsDisabled(false);
  }
}

function redirectAfterLogin() {
  if (redirecting) return;

  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get("return");
  let destination = `${window.location.origin}${SITE_BASE_PATH}account.html`;

  if (returnUrl) {
    try {
      const candidate = new URL(returnUrl, window.location.origin);
      const isInsideSite = candidate.origin === window.location.origin &&
        candidate.pathname.startsWith(SITE_BASE_PATH);
      const isLoginPage = candidate.pathname === `${SITE_BASE_PATH}login.html`;

      if (isInsideSite && !isLoginPage) destination = candidate.href;
    } catch {
      // Ignore malformed return destinations and use the account page.
    }
  }

  redirecting = true;
  window.location.replace(destination);
}

async function clearLocalSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.warn("Could not clear the stale local session through Supabase.", error);
    clearSupabaseStorageFallback();
  }
}

function clearSupabaseStorageFallback() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && /^sb-.*-auth-token$/.test(key)) localStorage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable in private browsing or hardened browsers.
  }
}

function isInvalidSessionError(error) {
  if (!error) return true;
  const status = Number(error.status ?? error.statusCode ?? 0);
  const message = String(error.message ?? "").toLowerCase();
  return status === 401 ||
    /invalid.*(?:jwt|token|session)|(?:jwt|token|session).*expired|refresh token.*(?:not found|invalid|expired)/i.test(message);
}

function setupTabs() {
  const buttons = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.authTab;
      buttons.forEach(item => item.classList.toggle("is-active", item === button));
      panels.forEach(panel => panel.classList.toggle("is-active", panel.dataset.authPanel === target));
      setMessage("", "");
    });
  });
}

function setFormsDisabled(disabled) {
  document.querySelectorAll(".auth-form input, .auth-form button").forEach(element => {
    element.disabled = disabled;
  });
}

function setMessage(message, type) {
  messageArea.textContent = message;
  messageArea.className = "auth-message";
  if (type) messageArea.classList.add(`auth-message--${type}`);
}

function translateAuthError(error) {
  const message = String(error?.message ?? "");
  if (message.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません。 / INVALID CREDENTIALS";
  if (message.includes("Email not confirmed")) return "メールアドレスの確認が完了していません。 / EMAIL NOT CONFIRMED";
  if (message.includes("User already registered")) return "このメールアドレスは既に登録されています。 / ACCOUNT ALREADY EXISTS";
  if (message.includes("Password should be")) return "パスワードの条件を満たしていません。 / PASSWORD REQUIREMENTS NOT MET";
  if (message.toLowerCase().includes("rate limit")) return "短時間に操作が集中しました。しばらく待ってから再試行してください。 / RATE LIMIT EXCEEDED";
  if (/session|token|jwt/i.test(message)) return "ログイン情報の確認に失敗しました。もう一度ログインしてください。 / INVALID SESSION";
  return "認証処理に失敗しました。 / AUTHENTICATION FAILED";
}
