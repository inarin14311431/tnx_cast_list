import { SITE_BASE_PATH } from "./config.js";
import { supabase } from "./supabase-client.js";
import { requireAuth, signOut } from "./auth-state.js";

const VISIBILITY_LABELS = {
  draft: "下書き / DRAFT",
  public: "公開 / PUBLIC",
  private: "非公開 / PRIVATE",
  archived: "引退 / ARCHIVED",
  unlisted: "限定公開 / UNLISTED"
};

const ownedCastsContainer = document.querySelector("#owned-casts");
let currentUser = null;

initializeAccount();

async function initializeAccount() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.querySelector("#account-email").textContent = currentUser.email ?? "UNKNOWN OPERATOR";
  document.querySelector("#account-user-id").textContent = currentUser.id;
  document.querySelector("#account-last-sign-in").textContent = formatDate(currentUser.last_sign_in_at);
  document.querySelector("#logout-button").addEventListener("click", signOut);
  await loadOwnedCharacters();
}

async function loadOwnedCharacters() {
  ownedCastsContainer.textContent = "キャストデータを読み込み中…";

  const { data, error } = await supabase
    .from("characters")
    .select("id, public_id, character_name, handle, visibility, updated_at")
    .eq("owner_id", currentUser.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    ownedCastsContainer.innerHTML = `<p class="auth-error">キャスト情報を取得できませんでした。</p>`;
    return;
  }

  if (!data.length) {
    ownedCastsContainer.innerHTML = `<p class="empty-data">登録済みキャストはありません。<small>NO ASSIGNED CAST</small></p>`;
    return;
  }

  ownedCastsContainer.innerHTML = `<div class="owned-cast-list">${data.map(createOwnedCastItem).join("")}</div>`;

  ownedCastsContainer.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deleteCharacter(button.dataset.delete));
  });

  ownedCastsContainer.querySelectorAll("[data-duplicate]").forEach(button => {
    button.addEventListener("click", () => duplicateCharacter(button.dataset.duplicate));
  });
}

function actionLabel(japanese, english) {
  return `<span class="action-label__jp">${japanese}</span><small class="action-label__en">${english}</small>`;
}

function visibilityLabel(value) {
  const key = String(value ?? "").toLowerCase();
  return VISIBILITY_LABELS[key] ?? key.toUpperCase();
}

function createOwnedCastItem(character) {
  const id = encodeURIComponent(character.public_id);
  const displayId = obfuscatePublicId(character.public_id);
  return `
    <article class="owned-cast">
      <div class="owned-cast__identity">
        <p class="owned-cast__handle">${escapeHtml(character.handle ? `“${character.handle}”` : "ハンドル未登録")}</p>
        <h3>${escapeHtml(character.character_name)}</h3>
      </div>
      <div class="owned-cast__meta">
        <div class="owned-cast__status-row">
          <span class="owned-cast__visibility">${escapeHtml(visibilityLabel(character.visibility))}</span>
          <span class="owned-cast__serial">${escapeHtml(displayId)}</span>
        </div>
        <div class="owned-cast__links" aria-label="キャスト操作">
          <a href="${SITE_BASE_PATH}cast.html?id=${id}">${actionLabel("閲覧", "OPEN")}</a>
          <a href="${SITE_BASE_PATH}sheet.html?id=${id}">${actionLabel("シート編集", "EDIT SHEET")}</a>
          <a href="${SITE_BASE_PATH}acts.html?character=${id}">${actionLabel("参加アクト", "ACTS")}</a>
          <a href="${SITE_BASE_PATH}combos.html?id=${id}">${actionLabel("コンボ", "COMBOS")}</a>
          <button type="button" data-duplicate="${escapeHtml(character.public_id)}">${actionLabel("複製", "DUPLICATE")}</button>
          <button type="button" data-delete="${escapeHtml(character.public_id)}">${actionLabel("削除", "DELETE")}</button>
        </div>
      </div>
    </article>
  `;
}

async function deleteCharacter(publicId) {
  if (!window.confirm(`${publicId} を削除します。関連する技能・装備・コンボ・参加アクト記録も削除されます。`)) return;

  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("public_id", publicId)
    .eq("owner_id", currentUser.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadOwnedCharacters();
}

async function duplicateCharacter(publicId) {
  const { data: source, error } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", publicId)
    .eq("owner_id", currentUser.id)
    .single();

  if (error) return alert(error.message);

  const sourceId = source.id;
  const copy = { ...source };
  delete copy.id;
  delete copy.public_id;
  delete copy.created_at;
  delete copy.updated_at;
  copy.character_name = `${copy.character_name}（複製）`;
  copy.visibility = "draft";

  const { data: created, error: createError } = await supabase
    .from("characters")
    .insert(copy)
    .select("id, public_id")
    .single();

  if (createError) return alert(createError.message);

  for (const table of ["character_skills", "character_outfits", "character_combos"]) {
    const { data: rows, error: rowsError } = await supabase.from(table).select("*").eq("character_id", sourceId);
    if (rowsError) return alert(rowsError.message);
    if (!rows?.length) continue;

    const duplicatedRows = rows.map(row => {
      const item = { ...row, character_id: created.id };
      delete item.id;
      delete item.created_at;
      return item;
    });

    const { error: insertError } = await supabase.from(table).insert(duplicatedRows);
    if (insertError) return alert(insertError.message);
  }

  window.location.href = `${SITE_BASE_PATH}sheet.html?id=${encodeURIComponent(created.public_id)}`;
}

function obfuscatePublicId(value) {
  const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
