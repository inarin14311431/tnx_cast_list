import { SITE_BASE_PATH } from "./config.js?v=2";
import { supabase } from "./supabase-client.js";

const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const recoveryForm = document.querySelector("#recovery-form");
const forgotPasswordButton = document.querySelector("#forgot-password-button");
const recoveryBackButton = document.querySelector("#recovery-back-button");
const messageArea = document.querySelector("#auth-message");
let redirecting = false;

setupTabs();
loginForm?.addEventListener("submit", handleLogin);
signupForm?.addEventListener("submit", handleSignup);
recoveryForm?.addEventListener("submit", handleRecovery);
forgotPasswordButton?.addEventListener("click", () => showPanel("recovery"));
recoveryBackButton?.addEventListener("click", () => showPanel("login"));

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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error("The authenticated session was not persisted.");
    setMessage("認証しました。接続を開始します。 / ACCESS GRANTED", "success");
    redirectAfterLogin();
  } catch (error) {
    console.error(error);
    setMessage(translateAuthError(error), "error");
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
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl } });
    if (error) throw error;
    if (data.session) {
      setMessage("登録が完了しました。 / REGISTRATION COMPLETE", "success");
      redirectAfterLogin();
      return;
    }
    setMessage("確認メールを送信しました。メール内のリンクを開いて登録を完了してください。 / CONFIRMATION EMAIL SENT", "success");
    signupForm.reset();
  } catch (error) {
    console.error(error);
    setMessage(translateAuthError(error), "error");
  } finally {
    if (!redirecting) setFormsDisabled(false);
  }
}

async function handleRecovery(event) {
  event.preventDefault();
  const email = document.querySelector("#recovery-email").value.trim();
  const redirectTo = `${window.location.origin}${SITE_BASE_PATH}password-reset.html`;
  setMessage("再設定メールを送信中… / SENDING RECOVERY LINK", "loading");
  setFormsDisabled(true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    setMessage("登録済みのメールアドレスの場合、パスワード再設定用のメールを送信しました。メール内のリンクを開いてください。 / RECOVERY LINK REQUESTED", "success");
    recoveryForm.reset();
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
      const isInsideSite = candidate.origin === window.location.origin && candidate.pathname.startsWith(SITE_BASE_PATH);
      const isLoginPage = candidate.pathname === `${SITE_BASE_PATH}login.html`;
      if (isInsideSite && !isLoginPage) destination = candidate.href;
    } catch {}
  }
  redirecting = true;
  window.location.assign(destination);
}

function setupTabs() {
  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => showPanel(button.dataset.authTab));
  });
}

function showPanel(target) {
  const buttons = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");
  buttons.forEach(button => button.classList.toggle("is-active", button.dataset.authTab === target));
  panels.forEach(panel => panel.classList.toggle("is-active", panel.dataset.authPanel === target));
  if (target === "recovery") {
    const loginEmail = document.querySelector("#login-email")?.value.trim();
    const recoveryEmail = document.querySelector("#recovery-email");
    if (loginEmail && recoveryEmail) recoveryEmail.value = loginEmail;
  }
  setMessage("", "");
}

function setFormsDisabled(disabled) {
  document.querySelectorAll(".auth-form input, .auth-form button, .auth-text-button").forEach(element => { element.disabled = disabled; });
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
  if (/session|token|jwt/i.test(message)) return "ログイン情報の保存に失敗しました。ブラウザのサイトデータを確認してください。 / SESSION STORAGE FAILED";
  return message ? `認証処理に失敗しました：${message}` : "認証処理に失敗しました。 / AUTHENTICATION FAILED";
}
