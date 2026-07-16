import { supabase } from "./supabase-client.js";

const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const messageArea = document.querySelector("#auth-message");

setupTabs();
checkExistingSession();

loginForm.addEventListener("submit", handleLogin);
signupForm.addEventListener("submit", handleSignup);

async function checkExistingSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    redirectAfterLogin();
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email =
    document.querySelector("#login-email").value.trim();

  const password =
    document.querySelector("#login-password").value;

  setMessage("VERIFYING IDENTITY...", "loading");
  setFormsDisabled(true);

  try {
    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    setMessage("ACCESS GRANTED", "success");

    window.setTimeout(() => {
      redirectAfterLogin();
    }, 400);
  } catch (error) {
    console.error(error);

    setMessage(
      translateAuthError(error),
      "error"
    );
  } finally {
    setFormsDisabled(false);
  }
}

async function handleSignup(event) {
  event.preventDefault();

  const email =
    document.querySelector("#signup-email").value.trim();

  const password =
    document.querySelector("#signup-password").value;

  const confirmation =
    document.querySelector(
      "#signup-password-confirmation"
    ).value;

  if (password !== confirmation) {
    setMessage(
      "パスワードが一致していません。",
      "error"
    );
    return;
  }

  const redirectUrl = new URL(
    "./account.html",
    window.location.href
  ).toString();

  setMessage("REGISTERING NEW IDENTITY...", "loading");
  setFormsDisabled(true);

  try {
    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

    if (error) {
      throw error;
    }

    if (data.session) {
      setMessage(
        "登録が完了しました。",
        "success"
      );

      window.setTimeout(() => {
        redirectAfterLogin();
      }, 400);

      return;
    }

    setMessage(
      "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。",
      "success"
    );

    signupForm.reset();
  } catch (error) {
    console.error(error);

    setMessage(
      translateAuthError(error),
      "error"
    );
  } finally {
    setFormsDisabled(false);
  }
}

function redirectAfterLogin() {
  const params = new URLSearchParams(
    window.location.search
  );

  const returnUrl = params.get("return");

  if (
    returnUrl &&
    returnUrl.startsWith("/") &&
    !returnUrl.startsWith("//")
  ) {
    window.location.href = returnUrl;
    return;
  }

  window.location.href = "./account.html";
}

function setupTabs() {
  const buttons =
    document.querySelectorAll("[data-auth-tab]");

  const panels =
    document.querySelectorAll("[data-auth-panel]");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.authTab;

      buttons.forEach(item => {
        item.classList.toggle(
          "is-active",
          item === button
        );
      });

      panels.forEach(panel => {
        panel.classList.toggle(
          "is-active",
          panel.dataset.authPanel === target
        );
      });

      setMessage("", "");
    });
  });
}

function setFormsDisabled(disabled) {
  document
    .querySelectorAll(
      ".auth-form input, .auth-form button"
    )
    .forEach(element => {
      element.disabled = disabled;
    });
}

function setMessage(message, type) {
  messageArea.textContent = message;
  messageArea.className = "auth-message";

  if (type) {
    messageArea.classList.add(
      `auth-message--${type}`
    );
  }
}

function translateAuthError(error) {
  const message = String(error?.message ?? "");

  if (
    message.includes("Invalid login credentials")
  ) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (
    message.includes("Email not confirmed")
  ) {
    return "メールアドレスの確認が完了していません。";
  }

  if (
    message.includes("User already registered")
  ) {
    return "このメールアドレスは既に登録されています。";
  }

  if (
    message.includes("Password should be")
  ) {
    return "パスワードの条件を満たしていません。";
  }

  if (
    message.includes("rate limit")
  ) {
    return "短時間に操作が集中しました。しばらく待ってから再試行してください。";
  }

  return "認証処理に失敗しました。";
}