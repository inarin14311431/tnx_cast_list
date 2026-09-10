import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { withRequestTimeout } from "./async-timeout.js?v=1";

const select = document.querySelector("#owned-showcase-select");
const loadButton = document.querySelector("#load-owned-showcase");
const status = document.querySelector("#owned-showcase-status");
let deleteButton = null;
let deleting = false;

mountDeleteButton();
void initializeDelete();

function mountDeleteButton() {
  if (!select || !loadButton || document.querySelector("#delete-owned-showcase")) return;
  deleteButton = document.createElement("button");
  deleteButton.id = "delete-owned-showcase";
  deleteButton.className = "manual-cast-add showcase-delete-button";
  deleteButton.type = "button";
  deleteButton.disabled = true;
  deleteButton.innerHTML = "アクト紹介を削除 <small>DELETE SHOWCASE</small>";
  deleteButton.setAttribute("aria-describedby", "owned-showcase-status");
  loadButton.insertAdjacentElement("afterend", deleteButton);
}

async function initializeDelete() {
  if (!select || !deleteButton) return;
  const user = await requireAuth();
  if (!user) return;

  syncDeleteButton();
  select.addEventListener("change", syncDeleteButton);
  deleteButton.addEventListener("click", () => void deleteSelectedShowcase());
}

function syncDeleteButton() {
  if (!deleteButton) return;
  deleteButton.disabled = deleting || !normalizeSlug(select?.value);
}

async function deleteSelectedShowcase() {
  if (deleting) return;
  const slug = normalizeSlug(select?.value);
  if (!slug) return;

  const option = select.selectedOptions?.[0];
  const label = String(option?.textContent || slug).trim();
  const confirmed = window.confirm(
    `「${label}」のアクト紹介を削除します。\n\n公開用データとゲスト情報はDBから削除され、現在の公開URLは無効になります。アクト履歴と参加履歴は残ります。\n\n削除してよろしいですか？`
  );
  if (!confirmed) return;

  try {
    deleting = true;
    syncDeleteButton();
    setStatus("アクト紹介の公開データを削除中…");

    const { data, error } = await withRequestTimeout(
      supabase.rpc("delete_owned_act_showcase", { p_slug: slug }),
      "削除結果を確認できませんでした。通信状態を確認し、ページを再読み込みして公開状態を確認してください。"
    );
    if (error) throw error;
    if (!data?.deleted) throw new Error("アクト紹介の削除結果を確認できませんでした。");

    option?.remove();
    select.value = "";
    if (![...select.options].some(item => item.value)) {
      select.innerHTML = '<option value="">公開済みのアクト紹介はありません</option>';
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));

    setStatus(
      "アクト紹介を削除しました。公開用データとゲスト情報は削除済みです。現在の編集欄はそのまま残しているため、必要なら内容を直して再公開できます。",
      "success"
    );
  } catch (error) {
    console.error("Owned showcase could not be deleted.", error);
    setStatus(translateError(error), "error");
  } finally {
    deleting = false;
    syncDeleteButton();
  }
}

function translateError(error) {
  const message = String(error?.message || "");
  if (/Owned act showcase was not found/i.test(message)) return "削除対象のアクト紹介が見つかりません。すでに削除されている可能性があります。";
  if (/Authentication is required|permission denied|42501|28000/i.test(message)) return "このアクト紹介を削除する権限を確認できませんでした。再ログインしてお試しください。";
  if (/delete_owned_act_showcase|function.*does not exist|schema cache/i.test(message)) return "アクト紹介削除機能がDBに反映されていません。管理者に確認してください。";
  return message || "アクト紹介を削除できませんでした。";
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function normalizeSlug(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}
