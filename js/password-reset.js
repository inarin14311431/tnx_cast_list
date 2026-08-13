import { SITE_BASE_PATH } from "./config.js?v=2";
import { supabase } from "./supabase-client.js";

const form = document.querySelector("#password-reset-form");
const messageArea = document.querySelector("#auth-message");

form?.addEventListener("submit", handlePasswordReset);

async function handlePasswordReset(event) {
  event.preventDefault();
  const password = document.querySelector("#new-password").value;
  const confirmation = document.querySelector("#new-password-confirmation").value;
  if (password !== confirmation) {
    setMessage("パスワードが一致していません。 / PASSWORDS DO NOT MATCH", "error");
    return;
  }
  setMessage("認証情報を更新中… / UPDATING CREDENTIALS", "loading");
  setDisabled(true);
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error("Recovery session not found");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setMessage("パスワードを更新しました。ログイン画面へ移動します。 / PASSWORD UPDATED", "success");
    await supabase.auth.signOut();
    window.setTimeout(() => window.location.assign(`${window.location.origin}${SITE_BASE_PATH}login.html`), 1200);
  } catch (error) {
    console.error(error);
    const message = String(error?.message ?? "");
    if (message.includes("Recovery session not found") || /session|token|jwt/i.test(message)) {
      setMessage("再設定リンクが無効または期限切れです。ログイン画面から再設定メールをもう一度送信してください。 / RECOVERY LINK INVALID", "error");
    } else if (message.includes("Password should be")) {
      setMessage("パスワードの条件を満たしていません。 / PASSWORD REQUIREMENTS NOT MET", "error");
    } else {
      setMessage(message ? `パスワードの更新に失敗しました：${message}` : "パスワードの更新に失敗しました。 / UPDATE FAILED", "error");
    }
    setDisabled(false);
  }
}

function setDisabled(disabled) {
  form.querySelectorAll("input, button").forEach(element => { element.disabled = disabled; });
}

function setMessage(message, type) {
  messageArea.textContent = message;
  messageArea.className = "auth-message";
  if (type) messageArea.classList.add(`auth-message--${type}`);
}
