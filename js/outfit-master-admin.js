import { supabase } from "./supabase-client.js";

const layout = document.querySelector(".account-layout");
if (layout) initialize();

async function initialize() {
  try {
    const { data, error } = await supabase.functions.invoke("outfit-classifier", {
      body: { action: "status" }
    });
    if (error || data?.error || !data?.canSync) return;
    renderPanel(data);
  } catch (error) {
    console.warn("Outfit master status could not be loaded", error);
  }
}

function renderPanel(initialStatus) {
  const panel = document.createElement("section");
  panel.className = "account-panel outfit-master-admin";
  panel.innerHTML = `
    <header class="account-panel__header">
      <h2>アウトフィット分類マスタ <small>OUTFIT MASTER</small></h2>
    </header>
    <p class="outfit-master-admin__description">Googleスプレッドシートから分類用データを取得し、一般ユーザーが直接閲覧できない非公開JSONとして保存します。</p>
    <dl class="account-data outfit-master-admin__data">
      <div><dt>登録件数 <small>RECORDS</small></dt><dd data-master-count>0</dd></div>
      <div><dt>最終同期 <small>LAST SYNC</small></dt><dd data-master-updated>未同期</dd></div>
    </dl>
    <div class="outfit-master-admin__actions">
      <button type="button" data-master-sync><span>スプレッドシートから同期</span><small>SYNC PRIVATE MASTER</small></button>
      <p data-master-message aria-live="polite"></p>
    </div>`;
  layout.append(panel);

  const count = panel.querySelector("[data-master-count]");
  const updated = panel.querySelector("[data-master-updated]");
  const button = panel.querySelector("[data-master-sync]");
  const message = panel.querySelector("[data-master-message]");

  applyStatus(initialStatus, count, updated);

  button.addEventListener("click", async () => {
    button.disabled = true;
    message.textContent = "Googleスプレッドシートを取得して同期しています…";
    message.dataset.state = "working";

    try {
      const { data, error } = await supabase.functions.invoke("outfit-classifier", {
        body: { action: "sync" }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      applyStatus(data, count, updated);
      message.textContent = `${Number(data?.recordCount || 0).toLocaleString("ja-JP")}件を非公開マスタへ同期しました。`;
      message.dataset.state = "success";
    } catch (error) {
      console.error("Outfit master sync failed", error);
      message.textContent = "同期に失敗しました。Edge Functionのシークレット、スプレッドシートの共有設定、SQL適用状況を確認してください。";
      message.dataset.state = "error";
    } finally {
      button.disabled = false;
    }
  });
}

function applyStatus(data, count, updated) {
  count.textContent = Number(data?.recordCount || 0).toLocaleString("ja-JP");
  updated.textContent = formatDate(data?.updatedAt);
}

function formatDate(value) {
  if (!value) return "未同期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
