import { supabase } from "./supabase-client.js";

const SYNC_FUNCTION_NAME = "sync-master-data";
const USER_LIST_FUNCTION_NAME = "master-auth-users";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let registeredUsers = [];

initialize();

async function initialize() {
  const layout = document.querySelector(".account-layout");
  if (!layout) return;

  const panel = createPanel();
  const ownedPanel = layout.querySelector(".account-panel:nth-of-type(2)");
  layout.insertBefore(panel, ownedPanel || null);

  try {
    const status = await invokeFunction(SYNC_FUNCTION_NAME, { action: "status" });
    if (!status.canSync) {
      panel.remove();
      return;
    }

    panel.hidden = false;
    renderStatus(panel, status);
    panel.querySelector("#master-data-sync-button").addEventListener("click", () => synchronize(panel));
    bindUserSqlGenerator(panel);
    loadRegisteredUsers(panel);
  } catch (error) {
    console.warn("Master data admin panel is unavailable.", error);
    panel.remove();
  }
}

function createPanel() {
  const panel = document.createElement("section");
  panel.className = "account-panel master-data-admin";
  panel.hidden = true;
  panel.innerHTML = `
    <header class="account-panel__header master-data-admin__header">
      <div><h2>SKD・OFC検索マスタ <small>SEARCH MASTER CONTROL</small></h2><p>Googleスプレッドシートの内容をSupabaseへ同期します。</p></div>
      <button id="master-data-sync-button" type="button">マスタ同期 <small>SYNC DATABASE</small></button>
    </header>
    <dl class="master-data-admin__stats">
      <div><dt>SKD登録件数</dt><dd id="master-data-skd-count">—</dd><small id="master-data-skd-updated">未同期</small></div>
      <div><dt>OFC登録件数</dt><dd id="master-data-ofc-count">—</dd><small id="master-data-ofc-updated">未同期</small></div>
    </dl>
    <p id="master-data-admin-status" class="master-data-admin__status">状態を確認中…</p>
    <section class="master-search-user-sql" aria-labelledby="master-search-user-sql-heading">
      <header class="master-search-user-sql__header">
        <div>
          <h3 id="master-search-user-sql-heading">検索利用者登録SQL <small>USER ALLOWLIST SQL</small></h3>
          <p>Supabase Authの登録メールアドレスを選び、生成したSQLをSQL Editorで手動実行してください。</p>
        </div>
        <button id="master-search-user-reload" type="button">登録者を再読込 <small>RELOAD USERS</small></button>
      </header>
      <div class="master-search-user-sql__fields">
        <label>登録メールアドレス
          <input id="master-search-user-email" type="search" list="master-search-user-email-list" autocomplete="off" spellcheck="false" placeholder="メールアドレスを入力または選択" disabled>
          <datalist id="master-search-user-email-list"></datalist>
        </label>
        <label>ユーザーID / UID
          <input id="master-search-user-id" type="text" readonly placeholder="メール選択後に自動表示">
        </label>
      </div>
      <textarea id="master-search-user-sql-preview" rows="7" readonly aria-label="生成SQL"></textarea>
      <div class="master-search-user-sql__actions">
        <p id="master-search-user-sql-status">Supabase Authの登録者を読み込み中…</p>
        <button id="master-search-user-sql-copy" type="button" disabled>登録SQLをコピー <small>COPY INSERT SQL</small></button>
      </div>
    </section>`;
  return panel;
}

function bindUserSqlGenerator(panel) {
  const emailInput = panel.querySelector("#master-search-user-email");
  const copyButton = panel.querySelector("#master-search-user-sql-copy");
  const reloadButton = panel.querySelector("#master-search-user-reload");

  emailInput.addEventListener("input", () => refreshUserSql(panel));
  emailInput.addEventListener("change", () => refreshUserSql(panel));
  copyButton.addEventListener("click", () => copyUserSql(panel));
  reloadButton.addEventListener("click", () => loadRegisteredUsers(panel));
}

async function loadRegisteredUsers(panel) {
  const emailInput = panel.querySelector("#master-search-user-email");
  const userIdInput = panel.querySelector("#master-search-user-id");
  const list = panel.querySelector("#master-search-user-email-list");
  const preview = panel.querySelector("#master-search-user-sql-preview");
  const copyButton = panel.querySelector("#master-search-user-sql-copy");
  const reloadButton = panel.querySelector("#master-search-user-reload");
  const status = panel.querySelector("#master-search-user-sql-status");

  emailInput.disabled = true;
  reloadButton.disabled = true;
  copyButton.disabled = true;
  userIdInput.value = "";
  preview.value = "";
  status.textContent = "Supabase Authの登録者を読み込み中…";
  status.className = "is-loading";

  try {
    const result = await invokeFunction(USER_LIST_FUNCTION_NAME, { action: "list" });
    registeredUsers = (Array.isArray(result.users) ? result.users : [])
      .filter(user => UUID_PATTERN.test(String(user?.id || "")) && String(user?.email || "").trim())
      .map(user => ({ id: String(user.id), email: String(user.email).trim() }));

    list.replaceChildren(...registeredUsers.map(user => {
      const option = document.createElement("option");
      option.value = user.email;
      option.label = user.id;
      return option;
    }));

    emailInput.disabled = registeredUsers.length === 0;
    status.textContent = registeredUsers.length
      ? `${registeredUsers.length.toLocaleString("ja-JP")}件の登録者を読み込みました。メールアドレスを選択してください。${result.truncated ? " 一覧は上限件数で打ち切られています。" : ""}`
      : "メールアドレスを持つ登録者が見つかりませんでした。";
    status.className = registeredUsers.length ? "is-ready" : "is-error";
    refreshUserSql(panel, false);
  } catch (error) {
    console.error(error);
    registeredUsers = [];
    list.replaceChildren();
    emailInput.value = "";
    emailInput.disabled = true;
    status.textContent = formatUserListError(error);
    status.className = "is-error";
  } finally {
    reloadButton.disabled = false;
  }
}

function refreshUserSql(panel, updateStatus = true) {
  const emailInput = panel.querySelector("#master-search-user-email");
  const userIdInput = panel.querySelector("#master-search-user-id");
  const preview = panel.querySelector("#master-search-user-sql-preview");
  const copyButton = panel.querySelector("#master-search-user-sql-copy");
  const status = panel.querySelector("#master-search-user-sql-status");
  const email = emailInput.value.trim();
  const selected = registeredUsers.find(user => user.email.toLowerCase() === email.toLowerCase());

  if (!selected) {
    userIdInput.value = "";
    preview.value = "";
    copyButton.disabled = true;
    if (updateStatus) {
      status.textContent = email ? "登録者一覧の候補からメールアドレスを選択してください。" : "メールアドレスを選択してください。";
      status.className = email ? "is-error" : "is-ready";
    }
    return;
  }

  userIdInput.value = selected.id;
  preview.value = createRegistrationSql(selected.id, selected.email);
  copyButton.disabled = false;
  if (updateStatus) {
    status.textContent = `${selected.email} の登録SQLを生成しました。`;
    status.className = "is-ready";
  }
}

function createRegistrationSql(uid, email) {
  const escapedEmail = String(email).replace(/'/g, "''");
  return `insert into public.master_search_users (user_id, memo)\nvalues (\n  '${uid}',\n  '${escapedEmail}'\n)\non conflict (user_id) do update\nset memo = excluded.memo;`;
}

async function copyUserSql(panel) {
  const preview = panel.querySelector("#master-search-user-sql-preview");
  const status = panel.querySelector("#master-search-user-sql-status");
  const sql = preview.value;
  if (!sql) return;

  try {
    await copyText(sql, preview);
    status.textContent = "登録SQLをクリップボードへコピーしました。Supabase SQL Editorで実行してください。";
    status.className = "is-success";
  } catch (error) {
    console.error(error);
    status.textContent = "コピーに失敗しました。SQL欄を選択して手動でコピーしてください。";
    status.className = "is-error";
  }
}

async function copyText(text, fallbackElement) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackElement.focus();
  fallbackElement.select();
  if (!document.execCommand("copy")) throw new Error("Clipboard copy failed.");
  fallbackElement.setSelectionRange(0, 0);
}

async function synchronize(panel) {
  const button = panel.querySelector("#master-data-sync-button");
  const statusArea = panel.querySelector("#master-data-admin-status");
  button.disabled = true;
  statusArea.textContent = "GoogleスプレッドシートからSKD・OFCを同期しています…";
  statusArea.className = "master-data-admin__status is-loading";

  try {
    const result = await invokeFunction(SYNC_FUNCTION_NAME, { action: "sync" });
    renderStatus(panel, {
      ready: true,
      skdCount: result.skdCount,
      ofcCount: result.ofcCount,
      skdUpdatedAt: result.completedAt,
      ofcUpdatedAt: result.completedAt
    });
    statusArea.textContent = `同期が完了しました。SKD ${result.skdCount}件、OFC ${result.ofcCount}件を登録しました。`;
    statusArea.className = "master-data-admin__status is-success";
  } catch (error) {
    console.error(error);
    statusArea.textContent = formatSyncError(error);
    statusArea.className = "master-data-admin__status is-error";
  } finally {
    button.disabled = false;
  }
}

function renderStatus(panel, status) {
  panel.querySelector("#master-data-skd-count").textContent = Number(status.skdCount || 0).toLocaleString("ja-JP");
  panel.querySelector("#master-data-ofc-count").textContent = Number(status.ofcCount || 0).toLocaleString("ja-JP");
  panel.querySelector("#master-data-skd-updated").textContent = formatDate(status.skdUpdatedAt);
  panel.querySelector("#master-data-ofc-updated").textContent = formatDate(status.ofcUpdatedAt);
  const statusArea = panel.querySelector("#master-data-admin-status");
  if (!status.ready) {
    statusArea.textContent = "Supabaseで supabase/20_authenticated_master_search.sql を実行してください。";
    statusArea.className = "master-data-admin__status is-error";
  } else if (!status.skdCount || !status.ofcCount) {
    statusArea.textContent = "検索マスタは未同期です。「マスタ同期」を実行してください。";
    statusArea.className = "master-data-admin__status";
  } else {
    statusArea.textContent = "検索マスタを利用できます。";
    statusArea.className = "master-data-admin__status is-success";
  }
}

async function invokeFunction(functionName, body) {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
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

function formatDate(value) {
  if (!value) return "未同期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未同期";
  return `最終同期：${new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(date)}`;
}

function formatSyncError(error) {
  const message = String(error?.message || error || "");
  if (/Failed to send|not found|404/i.test(message)) {
    return "sync-master-data Edge Functionをデプロイしてください。";
  }
  if (/HTMLが返されました|HTTP 401|HTTP 403|Googleスプレッドシート|共有設定/i.test(message)) {
    return `${message} 同期時だけでも、対象スプレッドシートをリンク閲覧可能にしてください。`;
  }
  if (/skd_master|ofc_master|schema cache|does not exist/i.test(message)) {
    return "Supabaseで supabase/20_authenticated_master_search.sql を実行してください。";
  }
  return message ? `同期に失敗しました：${message}` : "同期に失敗しました。Edge Functionのログを確認してください。";
}

function formatUserListError(error) {
  const message = String(error?.message || error || "");
  if (/Failed to send|not found|404/i.test(message)) {
    return "master-auth-users Edge Functionをデプロイしてください。";
  }
  if (/restricted to administrators|403|permission/i.test(message)) {
    return "登録者一覧を取得する管理者権限がありません。MASTER_DATA_ADMIN_USER_IDSまたはMASTER_DATA_ADMIN_EMAILSを確認してください。";
  }
  return message ? `登録者一覧の取得に失敗しました：${message}` : "登録者一覧の取得に失敗しました。Edge Functionのログを確認してください。";
}
