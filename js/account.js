import { SITE_BASE_PATH } from "./config.js?v=2";
import { supabase } from "./supabase-client.js";
import { requireAuth, signOut } from "./auth-state.js?v=4";
import { getStyleColor } from "./style-colors.js";

const VISIBILITY_LABELS = {
  public: "公開 / PUBLIC",
  private: "非公開 / PRIVATE"
};

const ownedCastsContainer = document.querySelector("#owned-casts");
const ownedCastSearch = document.querySelector("#owned-cast-search");
const ownedCastVisibility = document.querySelector("#owned-cast-visibility");
const ownedCastStyle = document.querySelector("#owned-cast-style");
const ownedCastSort = document.querySelector("#owned-cast-sort");
const ownedCastReset = document.querySelector("#owned-cast-reset");
const ownedCastResultCount = document.querySelector("#owned-cast-result-count");
let currentUser = null;
let ownedCharacters = [];

initializeSearchField();
setupOwnedCastNavigation();
initializeAccount();

function initializeSearchField() {
  if (!ownedCastSearch) return;
  const lock = () => {
    ownedCastSearch.readOnly = true;
    ownedCastSearch.setAttribute("readonly", "");
  };
  const unlock = () => {
    ownedCastSearch.readOnly = false;
    ownedCastSearch.removeAttribute("readonly");
  };
  const clear = () => {
    ownedCastSearch.value = "";
    ownedCastSearch.dispatchEvent(new Event("input", { bubbles: true }));
  };

  ownedCastSearch.name = "q";
  ownedCastSearch.setAttribute("autocomplete", "off");
  ownedCastSearch.setAttribute("inputmode", "search");
  ownedCastSearch.setAttribute("enterkeyhint", "search");
  ownedCastSearch.setAttribute("aria-autocomplete", "none");
  ownedCastSearch.setAttribute("data-form-type", "other");
  ownedCastSearch.setAttribute("data-lpignore", "true");
  ownedCastSearch.setAttribute("data-1p-ignore", "true");
  ownedCastSearch.setAttribute("data-bwignore", "true");

  lock();
  ownedCastSearch.addEventListener("pointerdown", unlock, { passive: true });
  ownedCastSearch.addEventListener("touchstart", unlock, { passive: true });
  ownedCastSearch.addEventListener("focus", () => {
    if (ownedCastSearch.readOnly) unlock();
  });
  ownedCastSearch.addEventListener("blur", lock);

  clear();
  requestAnimationFrame(clear);
  setTimeout(clear, 120);
  setTimeout(clear, 500);
}

function setupOwnedCastNavigation() {
  if (!ownedCastsContainer) return;
  ownedCastsContainer.addEventListener("click", event => {
    const link = event.target.closest(".owned-cast__links a, .owned-cast__management a");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const match = href.match(/(?:^|\/)(cast|sheet|sheet-mobile|acts)\.html([?#].*)?$/);
    if (!match) return;

    event.preventDefault();
    event.stopPropagation();
    const target = new URL(`./${match[1]}.html${match[2] || ""}`, window.location.href);
    window.location.assign(target.href);
  });
}

async function initializeAccount() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  document.querySelector("#account-email").textContent = currentUser.email ?? "UNKNOWN OPERATOR";
  document.querySelector("#account-user-id").textContent = currentUser.id;
  document.querySelector("#account-last-sign-in").textContent = formatDate(currentUser.last_sign_in_at);
  document.querySelector("#logout-button").addEventListener("click", signOut);
  setupOwnedCastControls();
  await loadOwnedCharacters();
}

function setupOwnedCastControls() {
  ownedCastSearch?.addEventListener("input", renderOwnedCharacters);
  ownedCastVisibility?.addEventListener("change", renderOwnedCharacters);
  ownedCastStyle?.addEventListener("change", renderOwnedCharacters);
  ownedCastSort?.addEventListener("change", renderOwnedCharacters);
  ownedCastReset?.addEventListener("click", () => {
    ownedCastSearch.value = "";
    ownedCastVisibility.value = "";
    ownedCastStyle.value = "";
    ownedCastSort.value = "updated-desc";
    renderOwnedCharacters();
  });
}

async function loadOwnedCharacters() {
  ownedCastsContainer.textContent = "キャストデータを読み込み中…";

  const { data, error } = await supabase
    .from("characters")
    .select("id, public_id, character_name, character_kana, handle, style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark, visibility, updated_at")
    .eq("owner_id", currentUser.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    ownedCharacters = [];
    ownedCastsContainer.innerHTML = `<p class="auth-error">キャスト情報を取得できませんでした。</p>`;
    if (ownedCastResultCount) ownedCastResultCount.textContent = "";
    return;
  }

  ownedCharacters = data ?? [];
  populateOwnedCastStyles();

  if (!ownedCharacters.length) {
    ownedCastsContainer.innerHTML = `<p class="empty-data">登録済みキャストはありません。<small>NO ASSIGNED CAST</small></p>`;
    if (ownedCastResultCount) ownedCastResultCount.textContent = "登録 0件";
    return;
  }

  renderOwnedCharacters();
}

function populateOwnedCastStyles() {
  if (!ownedCastStyle) return;
  const selected = ownedCastStyle.value;
  const styles = [...new Set(ownedCharacters.flatMap(character => [character.style_1, character.style_2, character.style_3]).filter(Boolean))]
    .sort(localeCompareJa);
  ownedCastStyle.innerHTML = `<option value="">すべてのスタイル</option>${styles.map(style => `<option value="${escapeHtml(style)}">${escapeHtml(style)}</option>`).join("")}`;
  if (styles.includes(selected)) ownedCastStyle.value = selected;
}

function renderOwnedCharacters() {
  const keyword = normalizeText(ownedCastSearch?.value);
  const visibility = ownedCastVisibility?.value ?? "";
  const style = ownedCastStyle?.value ?? "";
  const sort = ownedCastSort?.value ?? "updated-desc";

  const filtered = ownedCharacters.filter(character => {
    const searchable = normalizeText([character.character_name, character.character_kana, character.handle].join(" "));
    const styles = [character.style_1, character.style_2, character.style_3];
    return (!keyword || searchable.includes(keyword)) &&
      (!visibility || character.visibility === visibility) &&
      (!style || styles.includes(style));
  });

  sortOwnedCharacters(filtered, sort);
  if (ownedCastResultCount) ownedCastResultCount.textContent = `登録 ${ownedCharacters.length}件 / 表示 ${filtered.length}件`;

  if (!filtered.length) {
    ownedCastsContainer.innerHTML = `<p class="empty-data">条件に一致するキャストはありません。<small>NO MATCHING CAST</small></p>`;
    return;
  }

  ownedCastsContainer.innerHTML = `<div class="owned-cast-list">${filtered.map(createOwnedCastItem).join("")}</div>`;

  ownedCastsContainer.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deleteCharacter(button.dataset.delete));
  });

  ownedCastsContainer.querySelectorAll("[data-duplicate]").forEach(button => {
    button.addEventListener("click", () => duplicateCharacter(button.dataset.duplicate));
  });
}

function sortOwnedCharacters(characters, mode) {
  characters.sort((a, b) => {
    switch (mode) {
      case "updated-asc": return new Date(a.updated_at) - new Date(b.updated_at);
      case "name-asc": return localeCompareJa(a.character_kana || a.character_name, b.character_kana || b.character_name);
      case "name-desc": return localeCompareJa(b.character_kana || b.character_name, a.character_kana || a.character_name);
      default: return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });
}

function actionLabel(japanese, english) {
  return `<span class="action-label__jp">${japanese}</span><small class="action-label__en">${english}</small>`;
}

function visibilityLabel(value) {
  const key = String(value ?? "").toLowerCase();
  return VISIBILITY_LABELS[key] ?? VISIBILITY_LABELS.private;
}

function createOwnedCastItem(character) {
  const id = encodeURIComponent(character.public_id);
  const displayId = obfuscatePublicId(character.public_id);
  const styles = [
    [character.style_1, character.style_1_mark],
    [character.style_2, character.style_2_mark],
    [character.style_3, character.style_3_mark]
  ].filter(([name]) => name).map(([name, mark]) => `
    <span class="owned-cast__style" style="--style-color:${getStyleColor(name)}">
      <span>${escapeHtml(name)}</span>${mark ? `<b>${escapeHtml(mark)}</b>` : ""}
    </span>`).join("");
  return `
    <article class="owned-cast">
      <div class="owned-cast__identity">
        <p class="owned-cast__handle">${escapeHtml(window.TNXHandleFormat?.quoteHandle(character.handle) || "ハンドル未登録")}</p>
        <h3>${escapeHtml(character.character_name)}</h3>
        ${styles ? `<div class="owned-cast__styles" aria-label="スタイル">${styles}</div>` : ""}
      </div>
      <div class="owned-cast__meta">
        <div class="owned-cast__status-row">
          <span class="owned-cast__visibility">${escapeHtml(visibilityLabel(character.visibility))}</span>
          <span class="owned-cast__serial">${escapeHtml(displayId)}</span>
        </div>
        <div class="owned-cast__links" aria-label="主要操作">
          <a href="${SITE_BASE_PATH}cast.html?id=${id}">${actionLabel("閲覧", "OPEN")}</a>
          <a href="${SITE_BASE_PATH}sheet.html?id=${id}">${actionLabel("シート編集", "EDIT SHEET")}</a>
          <a href="${SITE_BASE_PATH}sheet-mobile.html?id=${id}">${actionLabel("モバイル編集", "MOBILE EDIT")}</a>
        </div>
        <div class="owned-cast__management" aria-label="管理操作">
          <a class="owned-cast__acts" href="${SITE_BASE_PATH}acts.html?character=${id}">${actionLabel("参加アクト", "ACTS")}</a>
          <span class="owned-cast__management-label">管理機能 <small>MANAGEMENT</small></span>
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
  copy.visibility = "private";

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

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, " ").trim();
}

function localeCompareJa(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true });
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
