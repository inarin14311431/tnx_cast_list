import { supabase } from "./supabase-client.js";

const slugField = document.querySelector("#publish-slug");
const status = document.querySelector("#generator-status");
let replayButton = null;
let saving = false;

document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-publish-mode]");
  if (!button) return;
  if (button === replayButton) {
    replayButton = null;
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  void persistGuestsAndReplay(button);
}, true);

async function persistGuestsAndReplay(button) {
  if (saving) return;
  try {
    saving = true;
    if (document.querySelector("#showcase-guests .is-uploading")) {
      throw new Error("ゲスト画像のアップロード完了後に公開してください。");
    }

    const slug = normalizeSlug(slugField?.value);
    if (!slug) throw new Error("アクト識別名を入力してください。");

    const runtime = window.__SHOWCASE_GUEST_RUNTIME__;
    const guests = typeof runtime?.serializeGuests === "function" ? runtime.serializeGuests() : [];
    const { error } = await supabase.rpc("replace_act_showcase_guests_for_current_user", {
      p_slug: slug,
      p_guests: guests
    });
    if (error) throw error;

    replayButton = button;
    button.click();
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "ゲスト情報を保存できませんでした。", "error");
  } finally {
    saving = false;
  }
}

function normalizeSlug(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function setStatus(message, state = "") {
  if (!status) return;
  status.textContent = message;
  status.className = `generator-status${state ? ` is-${state}` : ""}`;
}
