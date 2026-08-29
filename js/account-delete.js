import { supabase } from "./supabase-client.js";
import { getAccountDeletionFunctionError, validateAccountDeletionInput } from "./account-delete-rules.js";

const openButton = document.querySelector("#account-delete-open");
const dialog = document.querySelector("#account-delete-dialog");
const cancelButton = document.querySelector("#account-delete-cancel");
const confirmButton = document.querySelector("#account-delete-confirm");
const passwordField = document.querySelector("#account-delete-password");
const phraseField = document.querySelector("#account-delete-phrase");
const status = document.querySelector("#account-delete-status");
let deleting = false;

openButton?.addEventListener("click", () => {
  setStatus("");
  passwordField.value = "";
  phraseField.value = "";
  dialog?.showModal();
  passwordField?.focus();
});

cancelButton?.addEventListener("click", () => {
  if (!deleting) dialog?.close();
});

dialog?.addEventListener("cancel", event => {
  if (deleting) event.preventDefault();
});

confirmButton?.addEventListener("click", deleteAccount);

async function deleteAccount() {
  if (deleting) return;
  const validationError = validateAccountDeletionInput({
    phrase: phraseField?.value,
    password: passwordField?.value
  });
  if (validationError) return setStatus(validationError, true);

  deleting = true;
  setBusy(true);

  try {
    const password = passwordField.value;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      throw new Error("ログイン情報を確認できません。再ログインしてください。");
    }

    setStatus("本人確認中…");
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password
    });
    if (reauthError) {
      throw new Error("パスワードが正しくありません。");
    }

    setStatus("登録データを削除中です。この画面を閉じないでください。");
    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: {
        confirmation: "DELETE",
        password
      }
    });

    if (error) throw new Error(await getAccountDeletionFunctionError(error));
    if (!data?.ok) {
      throw new Error(data?.error || "アカウント削除を完了できませんでした。");
    }

    passwordField.value = "";
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    location.replace("./index.html?accountDeleted=1");
  } catch (error) {
    console.error(error);
    passwordField.value = "";
    setStatus(error?.message || "アカウント削除に失敗しました。", true);
    setBusy(false);
    deleting = false;
  }
}

function setBusy(value) {
  confirmButton.disabled = value;
  cancelButton.disabled = value;
  passwordField.disabled = value;
  phraseField.disabled = value;
}

function setStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.className = `account-delete-dialog__status${isError ? " is-error" : ""}`;
}
