import { supabase } from "./supabase-client.js";
import { hasUnsavedSheetChanges, focusSheetSaveButton } from "./sheet-save-state.js?v=2";

const MAX_SNAPSHOTS = 10;
let characterId = null;
let publicId = new URLSearchParams(location.search).get("id") || "";
let panel = null;
let list = null;
let message = null;

install();

function install() {
  const sidebar = document.querySelector(".exp-panel");
  if (!sidebar) return;

  panel = document.createElement("section");
  panel.className = "sheet-snapshot-panel";
  panel.innerHTML = `
    <header><span>スナップショット</span><small>SNAPSHOTS</small></header>
    <p class="sheet-snapshot-panel__note">保存済み状態を最大${MAX_SNAPSHOTS}世代まで保持します。</p>
    <div class="sheet-snapshot-panel__actions">
      <input id="snapshot-label" type="text" maxlength="120" placeholder="例：アクト終了時">
      <button id="snapshot-create" type="button" disabled>現在を保存 <small>CREATE</small></button>
    </div>
    <p id="snapshot-message" class="sheet-snapshot-message" aria-live="polite"></p>
    <div id="snapshot-list" class="sheet-snapshot-list"></div>`;
  sidebar.append(panel);
  list = panel.querySelector("#snapshot-list");
  message = panel.querySelector("#snapshot-message");

  panel.querySelector("#snapshot-create").addEventListener("click", createSnapshot);
  list.addEventListener("click", handleListClick);
  window.addEventListener("tnx:character-saved", event => {
    characterId = event.detail?.id || characterId;
    publicId = event.detail?.publicId || publicId;
    enable();
    refresh();
  });

  resolveCharacter();
}

async function resolveCharacter() {
  if (!publicId) {
    renderEmpty("初回保存後に利用できます。");
    return;
  }
  const { data, error } = await supabase
    .from("characters")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error || !data) {
    renderEmpty("スナップショットを読み込めませんでした。");
    return;
  }
  characterId = data.id;
  enable();
  await refresh();
}

function enable() {
  const button = panel?.querySelector("#snapshot-create");
  if (button) button.disabled = !characterId;
}

async function refresh() {
  if (!characterId) return;
  setMessage("履歴を確認中…");
  const { data, error } = await supabase
    .from("character_snapshots")
    .select("id,label,created_at")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(MAX_SNAPSHOTS);
  if (error) {
    renderEmpty("DB設定後に利用できます。");
    setMessage("");
    return;
  }
  render(data || []);
  setMessage("");
}

async function createSnapshot() {
  if (!characterId) return;

  if (hasUnsavedSheetChanges()) {
    const warning = "未保存の変更があります。先にキャストを保存してからスナップショットを作成してください。";
    setMessage(warning, "error");
    alert(warning);
    focusSheetSaveButton();
    return;
  }

  const button = panel.querySelector("#snapshot-create");
  const labelInput = panel.querySelector("#snapshot-label");
  button.disabled = true;
  setMessage("保存済み状態を記録中…");
  try {
    const { error } = await supabase.rpc("create_character_snapshot", {
      p_character_id: characterId,
      p_label: labelInput.value.trim()
    });
    if (error) throw error;
    labelInput.value = "";
    await refresh();
    setMessage("スナップショットを作成しました。", "saved");
  } catch (error) {
    console.error(error);
    setMessage("スナップショットの作成に失敗しました。", "error");
  } finally {
    button.disabled = false;
  }
}

async function handleListClick(event) {
  const restore = event.target.closest("[data-snapshot-restore]");
  const remove = event.target.closest("[data-snapshot-delete]");
  if (!restore && !remove) return;
  const id = (restore || remove).dataset.snapshotRestore || (restore || remove).dataset.snapshotDelete;

  if (restore) {
    if (!confirm("このスナップショットの状態へ復元します。現在の保存済みデータは上書きされます。続行しますか？")) return;
    setMessage("復元中…");
    const { error } = await supabase.rpc("restore_character_snapshot", { p_snapshot_id: id });
    if (error) {
      console.error(error);
      setMessage("復元に失敗しました。", "error");
      return;
    }
    location.reload();
    return;
  }

  if (!confirm("このスナップショットを削除しますか？")) return;
  const { error } = await supabase.from("character_snapshots").delete().eq("id", id);
  if (error) {
    console.error(error);
    setMessage("削除に失敗しました。", "error");
    return;
  }
  await refresh();
}

function render(rows) {
  if (!rows.length) {
    renderEmpty("スナップショットはありません。");
    return;
  }
  list.innerHTML = rows.map((row, index) => `
    <article class="sheet-snapshot-item">
      <div><strong>${escapeHtml(row.label || `SNAPSHOT ${rows.length - index}`)}</strong><small>${formatDate(row.created_at)}</small></div>
      <div class="sheet-snapshot-item__actions">
        <button type="button" data-snapshot-restore="${row.id}">復元</button>
        <button type="button" data-snapshot-delete="${row.id}" aria-label="スナップショットを削除">×</button>
      </div>
    </article>`).join("");
}

function renderEmpty(text) {
  if (list) list.innerHTML = `<p class="sheet-snapshot-empty">${escapeHtml(text)}</p>`;
}

function setMessage(text, state = "") {
  if (!message) return;
  message.textContent = text;
  message.dataset.state = state;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch { return String(value || ""); }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
