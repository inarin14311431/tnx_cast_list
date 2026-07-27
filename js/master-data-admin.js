import { supabase } from "./supabase-client.js";

const FUNCTION_NAME = "sync-master-data";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

initialize();

async function initialize() {
  const layout = document.querySelector(".account-layout");
  if (!layout) return;

  const panel = createPanel();
  const ownedPanel = layout.querySelector(".account-panel:nth-of-type(2)");
  layout.insertBefore(panel, ownedPanel || null);

  try {
    const status = await invoke({ action: "status" });
    if (!status.canSync) {
      panel.remove();
      return;
    }
    panel.hidden = false;
    renderStatus(panel, status);
    panel.querySelector("#master-data-sync-button").addEventListener("click", () => synchronize(panel));
    bindUserSqlGenerator(panel);
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
      <header>
        <div><h3 id="master-search-user-sql-heading">検索利用者登録SQL <small>UID ALLOWLIST SQL</small></h3><p>検索を許可するユーザーIDを入力し、生成したSQLをSupabase SQL Editorで実行してください。</p></div>
      </header>
      <div class="master-search-user-sql__fields">
        <label>ユーザーID / UID<input id="master-search-user-id" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="00000000-0000-0000-0000-000000000000"></label>
        <label>メモ（任意）<input id="master-search-user-memo" type="text" maxlength="160" placeholder="例：稲荷秋"></label>
      </div>
      <textarea id="master-search-user-sql-preview" rows="5" readonly aria-label="生成SQL"></textarea>
      <div class="master-search-user-sql__actions">
        <p id="master-search-user-sql-status">UIDを入力してください。</p>
        <button id="master-search-user-sql-copy" type="button" disabled>登録SQLをコピー <small>COPY INSERT SQL</small></button>
      </div>
    </section>`;
  return panel;
}

function bindUserSqlGenerator(panel) {
  const uidInput = panel.querySelector("#master-search-user-id");
  const memoInput = panel.querySelector("#master-search-user-memo");
  const copyButton = panel.querySelector("#master-search-user-sql-copy");

  const refresh = () => refreshUserSql(panel);
  uidInput.addEventListener("input", refresh);
  memoInput.addEventListener("input", refresh);
  copyButton.addEventListener("click", () => copyUserSql(panel));
  refresh();
}

function refreshUserSql(panel) {
  const uid = panel.querySelector("#master-search-user-id").value.trim();
  const memo = panel.querySelector("#master-search-user-memo").value.trim() || "SKD/OFC検索利用者";
  const preview = panel.querySelector("#master-search-user-sql-preview");
  const copyButton = panel.querySelector("#master-search-user-sql-copy");
  const status = panel.querySelector("#master-search-user-sql-status");

  if (!uid) {
    preview.value = "";
    copyButton.disabled = true;
    status.textContent = "UIDを入力してください。";
    status.className = "";
    return;
  }

  if (!UUID_PATTERN.test(uid)) {
    preview.value = "";
    copyButton.disabled = true;
    status.textContent = "UIDの形式が正しくありません。";
    status.className = "is-error";
    return;
  }

  preview.value = createRegistrationSql(uid, memo);
  copyButton.disabled = false;
  status.textContent = "SQLを生成しました。";
  status.className = "is-ready";
}

function createRegistrationSql(uid, memo) {
  const escapedMemo = String(memo).replace(/'/g, "''");
  return `insert into public.master_search_users (user_id, memo)\nvalues (\n  '${uid}',\n  '${escapedMemo}'\n)\non conflict (user_id) do update\nset memo = excluded.memo;`;
}

async function copyUserSql(panel) {
  const preview = panel.querySelector("#master-search-user-sql-preview");
  const status = panel.querySelector("#master-search-user-sql-status");
  const sql = preview.value;
  if (!sql) return;

  try {
    await copyText(sql, preview);
    status.textContent = "登録SQLをクリップボードへコピーしました。";
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
    const result = await invoke({ action: "sync" });
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
    statusArea.textContent = formatError(error);
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

function formatDate(value) {
  if (!value) return "未同期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未同期";
  return `最終同期：${new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(date)}`;
}

function formatError(error) {
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
