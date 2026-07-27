import { supabase } from "./supabase-client.js";

const FUNCTION_NAME = "sync-master-data";

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
    <p id="master-data-admin-status" class="master-data-admin__status">状態を確認中…</p>`;
  return panel;
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
  if (error) throw error;
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
  if (/Failed to send|FunctionsHttpError|not found|404/i.test(message)) {
    return "sync-master-data Edge Functionをデプロイしてください。";
  }
  if (/HTMLが返されました|HTTP 401|HTTP 403|Googleスプレッドシート/i.test(message)) {
    return `${message} 同期時だけでも、対象スプレッドシートをリンク閲覧可能にしてください。`;
  }
  return message ? `同期に失敗しました：${message}` : "同期に失敗しました。Edge Functionのログを確認してください。";
}
