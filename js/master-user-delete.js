import { supabase } from "./supabase-client.js";

const FUNCTION_NAME = "master-auth-users";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

initialize();

async function initialize() {
  const panel = await waitForElement(".master-search-user-sql", 5000);
  if (!panel) return;

  const actions = panel.querySelector(".master-search-user-sql__actions");
  const emailInput = panel.querySelector("#master-search-user-email");
  const userIdInput = panel.querySelector("#master-search-user-id");
  const status = panel.querySelector("#master-search-user-sql-status");
  if (!actions || !emailInput || !userIdInput || !status) return;

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "master-search-user-sql__button-group";

  const copyButton = panel.querySelector("#master-search-user-sql-copy");
  if (copyButton) buttonGroup.append(copyButton);

  const deleteButton = document.createElement("button");
  deleteButton.id = "master-search-user-delete";
  deleteButton.type = "button";
  deleteButton.disabled = true;
  deleteButton.innerHTML = "選択ユーザーを完全削除 <small>DELETE AUTH USER</small>";
  buttonGroup.append(deleteButton);
  actions.append(buttonGroup);

  const refresh = () => refreshDeleteState(panel, deleteButton);
  emailInput.addEventListener("input", () => setTimeout(refresh, 0));
  emailInput.addEventListener("change", () => setTimeout(refresh, 0));
  panel.querySelector("#master-search-user-reload")?.addEventListener("click", () => {
    deleteButton.disabled = true;
    setTimeout(refresh, 600);
  });
  deleteButton.addEventListener("click", () => deleteSelectedUser(panel, deleteButton));

  const timer = window.setInterval(refresh, 300);
  window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
  refresh();
}

function refreshDeleteState(panel, deleteButton) {
  const selected = getSelectedUser(panel);
  deleteButton.disabled = !selected;
  deleteButton.title = selected
    ? "選択したAuthユーザーと関連データを完全削除します。管理者アカウントはサーバー側で保護されます。"
    : "削除する登録メールアドレスを選択してください。";
}

function getSelectedUser(panel) {
  const email = panel.querySelector("#master-search-user-email")?.value.trim() || "";
  const userId = panel.querySelector("#master-search-user-id")?.value.trim() || "";
  if (!email || !UUID_PATTERN.test(userId)) return null;
  return { email, userId };
}

async function deleteSelectedUser(panel, deleteButton) {
  const selected = getSelectedUser(panel);
  const status = panel.querySelector("#master-search-user-sql-status");
  if (!selected || !status) return;

  const confirmed = window.confirm(
    `次のユーザーを完全削除します。\n\n${selected.email}\n${selected.userId}\n\n` +
    "Authユーザー、検索許可、所有キャスト、技能、アウトフィット、コンボ、参加履歴、キャスト画像が削除されます。この操作は元に戻せません。"
  );
  if (!confirmed) return;

  const typedEmail = window.prompt(
    "誤削除防止のため、削除するメールアドレスを正確に入力してください。",
    ""
  );
  if (typedEmail === null) return;
  if (typedEmail.trim().toLowerCase() !== selected.email.toLowerCase()) {
    status.textContent = "メールアドレスが一致しないため、削除を中止しました。";
    status.className = "is-error";
    return;
  }

  setBusy(panel, true);
  status.textContent = `${selected.email} の関連データとAuthユーザーを削除しています…`;
  status.className = "is-loading";

  let completed = false;
  try {
    const result = await invoke({
      action: "delete",
      userId: selected.userId,
      email: selected.email
    });

    panel.querySelector("#master-search-user-email").value = "";
    panel.querySelector("#master-search-user-id").value = "";
    panel.querySelector("#master-search-user-sql-preview").value = "";

    status.textContent = `${result.deletedEmail || selected.email} を完全削除しました。` +
      ` キャスト${Number(result.deletedCharacterCount || 0)}件、画像${Number(result.storageDeletedCount || 0)}件を削除しました。`;
    status.className = "is-success";
    completed = true;
    window.setTimeout(() => location.reload(), 1300);
  } catch (error) {
    console.error(error);
    status.textContent = formatDeleteError(error);
    status.className = "is-error";
  } finally {
    if (!completed) {
      setBusy(panel, false);
      refreshDeleteState(panel, deleteButton);
    }
  }
}

function setBusy(panel, busy) {
  const emailInput = panel.querySelector("#master-search-user-email");
  const reloadButton = panel.querySelector("#master-search-user-reload");
  const copyButton = panel.querySelector("#master-search-user-sql-copy");
  const deleteButton = panel.querySelector("#master-search-user-delete");

  if (emailInput) emailInput.disabled = busy;
  if (reloadButton) reloadButton.disabled = busy;
  if (copyButton) copyButton.disabled = busy || !panel.querySelector("#master-search-user-sql-preview")?.value;
  if (deleteButton) deleteButton.disabled = busy || !getSelectedUser(panel);
}

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body });
  if (error) {
    let message = error.message || String(error);
    try {
      const payload = await error.context?.json?.();
      if (payload?.error) message = payload.error;
    } catch {}
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data || {};
}

function formatDeleteError(error) {
  const message = String(error?.message || error || "");
  if (/administrator|管理者/i.test(message)) return "管理者アカウントは削除できません。";
  if (/restricted|403|permission/i.test(message)) return "ユーザー削除を実行する管理者権限がありません。";
  if (/not found|404/i.test(message)) return "対象ユーザーが見つかりません。登録者一覧を再読み込みしてください。";
  if (/master_search_users|schema cache/i.test(message)) return "検索利用者テーブルを確認できません。SQL 21の適用状況を確認してください。";
  return message ? `ユーザー削除に失敗しました：${message}` : "ユーザー削除に失敗しました。Edge Functionのログを確認してください。";
}

function waitForElement(selector, timeout) {
  return new Promise(resolve => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (!element) return;
      observer.disconnect();
      clearTimeout(timer);
      resolve(element);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}
