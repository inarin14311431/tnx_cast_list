import { renderShowcase, getStyles, getStyleNames, formatHandle, formatFullName, obfuscatePublicId, escapeHtml, escapeAttribute } from "./showcase-output-html.js?v=1";
import { normalizeShowcaseTheme } from "./showcase-output-css.js?v=1";
import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { getImageObjectPosition } from "./image-focus.js?v=4";

const MAX_CASTS = 6;
const FUNCTION_NAME = "publish-showcase";
const FULL_CHARACTER_COLUMNS = `
  id, public_id, owner_id, player_name, character_name, character_kana,
  handle, handle_kana, affiliation, citizen_rank,
  style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
  image_url, image_thumbnail_url, summary, age, gender, visibility, updated_at
`;
const FALLBACK_CHARACTER_COLUMNS = `
  id, public_id, owner_id, player_name, character_name, character_kana,
  handle, affiliation, citizen_rank,
  style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
  image_url, summary, visibility, updated_at
`;
const elements = {
  pageTitle: document.querySelector("#page-title"),
  actName: document.querySelector("#act-name"),
  showcaseTheme: document.querySelector("#showcase-theme"),
  rulerName: document.querySelector("#ruler-name"),
  publishSlug: document.querySelector("#publish-slug"),
  introText: document.querySelector("#intro-text"),
  backgroundUrl: document.querySelector("#background-url"),
  backgroundFile: document.querySelector("#background-file"),
  search: document.querySelector("#cast-search"),
  playerFilter: document.querySelector("#player-filter"),
  styleFilter: document.querySelector("#style-filter"),
  libraryStatus: document.querySelector("#library-status"),
  publicGrid: document.querySelector("#public-cast-grid"),
  privateGrid: document.querySelector("#owned-private-cast-grid"),
  privateStatus: document.querySelector("#private-library-status"),
  privateSelectedCount: document.querySelector("#private-selected-count"),
  privateSelectionSummary: document.querySelector("#private-selection-summary"),
  selectedCount: document.querySelector("#selected-count"),
  selectedCasts: document.querySelector("#selected-casts"),
  manualAddButton: document.querySelector("#add-manual-cast"),
  generateButton: document.querySelector("#generate-button"),
  downloadButton: document.querySelector("#download-button"),
  copyButton: document.querySelector("#copy-button"),
  historyButton: document.querySelector("#history-button"),
  publishButton: document.querySelector("#publish-button"),
  generatorStatus: document.querySelector("#generator-status"),
  preview: document.querySelector("#showcase-preview")
};

let currentUser = null;
let publicCharacters = [];
let privateCharacters = [];
let selectedCasts = [];
let generatedHtml = "";
let publishing = false;
let registeringHistory = false;

initialize();

async function initialize() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  bindEvents();
  suggestSlug();
  renderSelections();
  await Promise.all([loadPublicCharacters(), loadPrivateCharacters()]);
}

function bindEvents() {
  elements.search?.addEventListener("input", renderPublicCharacters);
  elements.playerFilter?.addEventListener("change", renderPublicCharacters);
  elements.styleFilter?.addEventListener("change", renderPublicCharacters);
  elements.publicGrid?.addEventListener("click", handlePublicLibraryClick);
  elements.privateGrid?.addEventListener("click", handlePrivateLibraryClick);
  elements.selectedCasts?.addEventListener("click", handleSelectedCastClick);
  elements.selectedCasts?.addEventListener("input", handleSelectedCastInput);
  elements.selectedCasts?.addEventListener("change", handleSelectedCastInput);
  elements.manualAddButton?.addEventListener("click", addManualCast);
  elements.actName?.addEventListener("input", suggestSlug);
  elements.publishSlug?.addEventListener("input", () => {
    elements.publishSlug.dataset.edited = "true";
    invalidateGeneratedHtml("公開ファイル名が変更されました。HTMLを再生成してください。");
  });
  [elements.pageTitle, elements.actName, elements.rulerName, elements.introText, elements.backgroundUrl]
    .forEach(field => field?.addEventListener("input", () => invalidateGeneratedHtml("アクト情報が変更されました。HTMLを再生成してください。")));
  elements.showcaseTheme?.addEventListener("change", () => invalidateGeneratedHtml("紹介テーマが変更されました。HTMLを再生成してください。"));
  elements.backgroundFile?.addEventListener("change", () => invalidateGeneratedHtml("背景画像が変更されました。HTMLを再生成してください。"));
  elements.generateButton?.addEventListener("click", generateShowcase);
  elements.downloadButton?.addEventListener("click", downloadShowcase);
  elements.copyButton?.addEventListener("click", copyShowcase);
  elements.historyButton?.addEventListener("click", registerHistoryOnly);
  elements.publishButton?.addEventListener("click", publishShowcase);
}

async function loadPublicCharacters() {
  setLibraryStatus("公開キャストを読み込み中…");
  const result = await queryCharacters("public");
  if (result.error) {
    console.error(result.error);
    setLibraryStatus(`公開キャストを取得できませんでした。${result.error.message ? ` ${result.error.message}` : ""}`, "error");
    return;
  }

  publicCharacters = result.data ?? [];
  populateFilters();
  renderPublicCharacters();
  setLibraryStatus(`${publicCharacters.length}件の公開キャストを読み込みました。`, "success");
}

async function loadPrivateCharacters() {
  if (!elements.privateGrid || !elements.privateStatus) return;
  setPrivateStatus("自分の非公開キャストを読み込み中…");
  const result = await queryCharacters("private");
  if (result.error) {
    console.error(result.error);
    setPrivateStatus(`自分の非公開キャストを取得できませんでした。${result.error.message ? ` ${result.error.message}` : ""}`, "error");
    return;
  }

  privateCharacters = result.data ?? [];
  renderPrivateCharacters();
  setPrivateStatus(
    privateCharacters.length
      ? `${privateCharacters.length}件の自分の非公開キャストを読み込みました。出演枠へ追加してHTMLを生成できます。`
      : "出演枠へ追加できる非公開キャストはありません。",
    privateCharacters.length ? "success" : ""
  );
}

async function queryCharacters(mode) {
  let result = await buildCharacterQuery(FULL_CHARACTER_COLUMNS, mode);
  if (result.error && isMissingColumnError(result.error)) {
    console.warn("Optional character columns are unavailable. Retrying with the compatible column set.", result.error);
    result = await buildCharacterQuery(FALLBACK_CHARACTER_COLUMNS, mode);
  }
  return result;
}

function buildCharacterQuery(columns, mode) {
  let query = supabase.from("characters").select(columns);
  if (mode === "public") query = query.eq("visibility", "public");
  else query = query.eq("owner_id", currentUser.id).eq("visibility", "private");
  return query.order("updated_at", { ascending: false });
}

function isMissingColumnError(error) {
  const message = String(error?.message ?? "");
  return /column .* does not exist|could not find .* column|PGRST204/i.test(message);
}

function populateFilters() {
  const players = [...new Set(publicCharacters.map(character => character.player_name).filter(Boolean))].sort(localeCompareJa);
  const styles = [...new Set(publicCharacters.flatMap(getStyleNames))].sort(localeCompareJa);
  if (elements.playerFilter) elements.playerFilter.innerHTML = `<option value="">すべて</option>${players.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
  if (elements.styleFilter) elements.styleFilter.innerHTML = `<option value="">すべて</option>${styles.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
}

function renderPublicCharacters() {
  if (!elements.publicGrid) return;
  const keyword = normalizeSearch(elements.search?.value);
  const player = elements.playerFilter?.value ?? "";
  const style = elements.styleFilter?.value ?? "";
  const filtered = publicCharacters.filter(character => {
    const searchable = normalizeSearch([
      character.public_id, obfuscatePublicId(character.public_id), character.character_name, character.character_kana,
      character.handle, character.handle_kana, character.player_name,
      character.affiliation, character.summary, ...getStyleNames(character)
    ].join(" "));
    return (!keyword || searchable.includes(keyword)) &&
      (!player || character.player_name === player) &&
      (!style || getStyleNames(character).includes(style));
  });

  if (!filtered.length) {
    elements.publicGrid.innerHTML = `<p class="empty-state">条件に一致する公開キャストはいません。</p>`;
    return;
  }

  elements.publicGrid.innerHTML = filtered.map(character => createLibraryCard(character, "public")).join("");
}

function renderPrivateCharacters() {
  if (!elements.privateGrid) return;
  if (!privateCharacters.length) {
    elements.privateGrid.innerHTML = "";
    updatePrivateSelectionSummary();
    return;
  }
  elements.privateGrid.innerHTML = privateCharacters.map(character => createLibraryCard(character, "private")).join("");
  updatePrivateSelectionSummary();
}

function createLibraryCard(character, source) {
  const selectedIndex = selectedCasts.findIndex(item => item.source === source && item.character.id === character.id);
  const isSelected = selectedIndex >= 0;
  const isDisabled = !isSelected && selectedCasts.length >= MAX_CASTS;
  const styles = getStyles(character).map(item => `${item.name}${item.mark}`).join(" / ");
  const privateLabel = source === "private" ? `<span class="private-history-card__visibility">非公開 / LOCAL OUTPUT</span>` : "";
  const stateLabel = source === "private"
    ? `<span class="private-history-card__state">${isSelected ? "出演枠に追加済み / SELECTED" : "出演枠へ追加 / ADD CAST"}</span>`
    : "";
  return `
    <button class="cast-pick-card${source === "private" ? " private-history-card" : ""}${isSelected ? " is-selected" : ""}" type="button"
      data-${source}-character-id="${escapeAttribute(character.id)}" aria-pressed="${isSelected}"${isDisabled ? " disabled" : ""}>
      <img src="${escapeAttribute(character.image_thumbnail_url || character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="" loading="lazy" style="object-position:${escapeAttribute(getImageObjectPosition(character.image_url))}">
      <span class="cast-pick-card__body">
        ${privateLabel}
        <span class="cast-pick-card__handle">${escapeHtml(formatHandle(character.handle) || "NO HANDLE")}</span>
        <h3>${escapeHtml(character.character_name || "名称未登録")}</h3>
        <span class="cast-pick-card__styles">${escapeHtml(styles)}</span>
        <span class="cast-pick-card__player">PL：${escapeHtml(character.player_name || "—")}</span>
        ${stateLabel}
      </span>
      ${isSelected ? `<span class="cast-pick-card__order">CAST ${String(selectedIndex + 1).padStart(2, "0")}</span>` : ""}
    </button>`;
}

function handlePublicLibraryClick(event) {
  const card = event.target.closest("[data-public-character-id]");
  if (!card) return;
  toggleArchiveCast("public", card.dataset.publicCharacterId, publicCharacters);
}

function handlePrivateLibraryClick(event) {
  const card = event.target.closest("[data-private-character-id]");
  if (!card) return;
  toggleArchiveCast("private", card.dataset.privateCharacterId, privateCharacters);
}

function toggleArchiveCast(source, characterId, library) {
  const character = library.find(item => String(item.id) === String(characterId));
  if (!character) return;
  const selectedIndex = selectedCasts.findIndex(item => item.source === source && item.character.id === character.id);

  if (selectedIndex >= 0) {
    selectedCasts.splice(selectedIndex, 1);
  } else {
    if (selectedCasts.length >= MAX_CASTS) {
      setGeneratorStatus("キャストは公開・非公開・手動追加を合わせて最大6名までです。", "error");
      return;
    }
    selectedCasts.push({ source, manual: false, character, description: "", quote: "" });
  }

  invalidateGeneratedHtml();
  renderSelections();
}

function addManualCast() {
  if (selectedCasts.length >= MAX_CASTS) {
    setGeneratorStatus("キャストは公開・非公開・手動追加を合わせて最大6名までです。", "error");
    return;
  }

  const key = crypto.randomUUID?.() || `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const placeholder = new URL("./assets/placeholders/scan-failed.webp", location.href).href;
  selectedCasts.push({
    source: "manual",
    manual: true,
    character: {
      id: `manual-${key}`,
      public_id: "ScanFailed",
      character_name: "",
      player_name: "",
      manual_styles: "",
      image_url: placeholder,
      handle: "",
      handle_kana: "",
      character_kana: "",
      affiliation: "",
      age: "",
      gender: "",
      citizen_rank: ""
    },
    quote: "",
    description: ""
  });

  invalidateGeneratedHtml();
  renderSelections();
  requestAnimationFrame(() => elements.selectedCasts?.querySelector(`[data-selected-index="${selectedCasts.length - 1}"] [data-field="manual-name"]`)?.focus());
}

function renderSelections() {
  if (elements.selectedCount) elements.selectedCount.textContent = String(selectedCasts.length);
  if (elements.manualAddButton) elements.manualAddButton.disabled = selectedCasts.length >= MAX_CASTS;
  renderPublicCharacters();
  renderPrivateCharacters();

  if (!elements.selectedCasts) return;
  if (!selectedCasts.length) {
    elements.selectedCasts.innerHTML = `<p class="empty-state">公開または非公開キャストを選択するか、「手動追加」からキャストを入力してください。</p>`;
    updateOutputButtons();
    return;
  }

  elements.selectedCasts.innerHTML = selectedCasts.map((item, index) => item.manual
    ? createManualSelection(item, index)
    : createArchiveSelection(item, index)
  ).join("");
  updateOutputButtons();
}

function createArchiveSelection(item, index) {
  const character = item.character;
  const styles = getStyles(character).map(style => `${style.name}${style.mark}`).join(" / ");
  const isPrivate = item.source === "private";
  return `
    <article class="selected-cast${isPrivate ? " selected-cast--private" : ""}" data-selected-index="${index}"
      data-character-id="${escapeAttribute(character.id)}" data-visibility="${isPrivate ? "private" : "public"}">
      <img src="${escapeAttribute(character.image_thumbnail_url || character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="" style="object-position:${escapeAttribute(getImageObjectPosition(character.image_url))}">
      <div class="selected-cast__identity">
        <p class="selected-cast__slot">CAST ${String(index + 1).padStart(2, "0")}${isPrivate ? " // PRIVATE" : ""}</p>
        <h3>${escapeHtml(formatFullName(character))}</h3>
        <p>${escapeHtml(styles)}</p>
        <p>PL：${escapeHtml(character.player_name || "—")}</p>
        ${isPrivate ? `<p class="selected-cast__privacy">HTML生成可／GitHub Pages公開不可</p>` : ""}
      </div>
      <div class="selected-cast__fields">
        <label>参加枠（スタイル）<select data-field="quote" required>${createHandoutRoleOptions(character, item.quote)}</select></label>
        <label class="selected-cast__handout-field">ハンドアウト<textarea data-field="description" rows="7" placeholder="コネ：結城あや　推奨スート：スペード&#10;キミは……&#10;&#10;【ＰＳ：達成すべき目的】">${escapeHtml(item.description)}</textarea></label>
      </div>
      ${createSelectionActions(index)}
    </article>`;
}

function createManualSelection(item, index) {
  const character = item.character;
  return `
    <article class="selected-cast selected-cast--manual" data-selected-index="${index}" data-manual="true">
      <img src="${escapeAttribute(character.image_url)}" alt="Scan Failed">
      <div class="selected-cast__identity">
        <p class="selected-cast__slot">CAST ${String(index + 1).padStart(2, "0")} // MANUAL</p>
        <h3 class="selected-cast__manual-preview-name">${escapeHtml(character.character_name || "未入力キャスト")}</h3>
        <p class="selected-cast__manual-id">ARCHIVE ID：ScanFailed</p>
        <p>サイト未登録キャスト</p>
      </div>
      <div class="selected-cast__manual-fields">
        <label>名前<input type="text" data-field="manual-name" value="${escapeAttribute(character.character_name)}" placeholder="キャスト名" required></label>
        <label>スタイル<input type="text" data-field="manual-styles" value="${escapeAttribute(character.manual_styles)}" placeholder="例：カタナ◎ / カブト● / フェイト"></label>
        <label>PL名<input type="text" data-field="manual-player" value="${escapeAttribute(character.player_name)}" placeholder="プレイヤー名"></label>
        <label class="manual-field--role">参加枠（スタイル）<input type="text" data-field="quote" value="${escapeAttribute(item.quote)}" placeholder="例：トーキー、共通" required></label>
        <label class="manual-field--handout">ハンドアウト<textarea data-field="description" rows="7" placeholder="コネ、推奨スート、導入、ＰＳなどを入力">${escapeHtml(item.description)}</textarea></label>
      </div>
      ${createSelectionActions(index)}
    </article>`;
}

function createHandoutRoleOptions(character, selectedValue) {
  const roles = ["共通", ...new Set(getStyleNames(character))];
  const selected = String(selectedValue ?? "").trim();
  if (selected && !roles.includes(selected)) roles.push(selected);
  return `<option value="">参加枠を選択</option>${roles.map(role => `<option value="${escapeAttribute(role)}"${selected === role ? " selected" : ""}>${escapeHtml(role)}</option>`).join("")}`;
}

function createSelectionActions(index) {
  return `<div class="selected-cast__actions">
    <button type="button" data-action="up" aria-label="上へ"${index === 0 ? " disabled" : ""}>↑</button>
    <button type="button" data-action="down" aria-label="下へ"${index === selectedCasts.length - 1 ? " disabled" : ""}>↓</button>
    <button type="button" class="remove" data-action="remove">削除</button>
  </div>`;
}

function handleSelectedCastClick(event) {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest("[data-selected-index]");
  if (!button || !row) return;
  const index = Number(row.dataset.selectedIndex);
  if (!Number.isInteger(index) || !selectedCasts[index]) return;

  if (button.dataset.action === "up" && index > 0) {
    [selectedCasts[index - 1], selectedCasts[index]] = [selectedCasts[index], selectedCasts[index - 1]];
  } else if (button.dataset.action === "down" && index < selectedCasts.length - 1) {
    [selectedCasts[index], selectedCasts[index + 1]] = [selectedCasts[index + 1], selectedCasts[index]];
  } else if (button.dataset.action === "remove") {
    selectedCasts.splice(index, 1);
  } else {
    return;
  }

  invalidateGeneratedHtml();
  renderSelections();
}

function handleSelectedCastInput(event) {
  const field = event.target.closest("[data-field]");
  const row = event.target.closest("[data-selected-index]");
  if (!field || !row) return;
  const item = selectedCasts[Number(row.dataset.selectedIndex)];
  if (!item) return;

  if (field.dataset.field === "quote") item.quote = field.value;
  else if (field.dataset.field === "description") item.description = field.value;
  else if (item.manual && field.dataset.field === "manual-name") {
    item.character.character_name = field.value;
    const preview = row.querySelector(".selected-cast__manual-preview-name");
    if (preview) preview.textContent = field.value.trim() || "未入力キャスト";
  } else if (item.manual && field.dataset.field === "manual-styles") item.character.manual_styles = field.value;
  else if (item.manual && field.dataset.field === "manual-player") item.character.player_name = field.value;

  invalidateGeneratedHtml();
}

async function generateShowcase() {
  try {
    validateSelectedCasts();
    setGeneratorStatus("HTMLを生成中…");
    const background = elements.backgroundUrl?.value.trim() || await readFileAsDataUrl(elements.backgroundFile?.files?.[0]);
    generatedHtml = renderShowcase({
      title: elements.pageTitle?.value.trim() || "ACT CAST FILE",
      actName: elements.actName?.value.trim() || "トーキョーＮ◎ＶＡ アクト参加キャスト",
      rulerName: elements.rulerName?.value.trim() || "",
      theme: normalizeShowcaseTheme(elements.showcaseTheme?.value),
      intro: elements.introText?.value.trim() || "",
      background,
      casts: selectedCasts
    }, location.href);
    if (elements.preview) elements.preview.srcdoc = generatedHtml;
    updateOutputButtons();
    if (hasPrivateCast()) {
      setGeneratorStatus("HTMLを生成しました。非公開キャストを含むため、ダウンロードとコピーは利用できますがGitHub Pagesへは公開できません。", "success");
    } else {
      setGeneratorStatus("HTMLを生成しました。プレビューを確認してください。", "success");
    }
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error?.message || "HTML生成に失敗しました。", "error");
  }
}

function validateSelectedCasts() {
  if (!selectedCasts.length) throw new Error("キャストを1名以上選択または手動追加してください。");
  if (selectedCasts.length > MAX_CASTS) throw new Error("キャストは最大6名までです。");
  const incompleteManual = selectedCasts.find(item => item.manual && !item.character.character_name.trim());
  if (incompleteManual) throw new Error("手動追加キャストの名前を入力してください。");
  const missingRole = selectedCasts.find(item => !String(item.quote ?? "").trim());
  if (missingRole) throw new Error("各キャストの参加枠（スタイル）を選択または入力してください。");
}

function downloadShowcase() {
  if (!generatedHtml) return;
  const slug = normalizeSlug(elements.publishSlug?.value) || "act-showcase";
  const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyShowcase() {
  if (!generatedHtml) return;
  try {
    await navigator.clipboard.writeText(generatedHtml);
    setGeneratorStatus("HTMLをクリップボードへコピーしました。", "success");
  } catch (error) {
    console.error(error);
    setGeneratorStatus("クリップボードへのコピーに失敗しました。", "error");
  }
}

async function registerHistoryOnly() {
  if (registeringHistory) return;
  try {
    const participantIds = selectedCasts
      .filter(item => !item.manual && item.character.id)
      .map(item => item.character.id);
    if (!participantIds.length) throw new Error("履歴へ登録するには、公開または自分の非公開キャストを1名以上選択してください。");

    const slug = normalizeSlug(elements.publishSlug?.value);
    if (!slug) throw new Error("アクト識別名を半角英数字とハイフンで入力してください。");
    const title = elements.actName?.value.trim();
    if (!title) throw new Error("アクト名を入力してください。");

    registeringHistory = true;
    updateOutputButtons();
    setGeneratorStatus("参加アクト履歴を登録中…");

    const { data: actId, error } = await supabase.rpc("record_act_history_for_current_user", {
      p_slug: slug,
      p_act_name: title,
      p_ruler_name: elements.rulerName?.value.trim() || "",
      p_participant_ids: [...new Set(participantIds)]
    });
    if (error) throw new Error(translateHistoryError(error));
    if (!actId) throw new Error("登録したアクト履歴を確認できませんでした。");

    const privateCount = selectedCasts.filter(item => item.source === "private").length;
    const manualCount = selectedCasts.filter(item => item.manual).length;
    const privateNote = privateCount ? ` 非公開キャスト${privateCount}名を含みます。` : "";
    const manualNote = manualCount ? ` 手動追加キャスト${manualCount}名は履歴対象外です。` : "";
    setGeneratorStatus(`GitHub Pagesへ公開せず、参加アクト履歴へ登録しました。${privateNote}${manualNote}`, "success");
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error?.message || "参加アクト履歴の登録に失敗しました。", "error");
  } finally {
    registeringHistory = false;
    updateOutputButtons();
  }
}

async function publishShowcase() {
  if (publishing) return;
  try {
    if (!generatedHtml) throw new Error("先にHTMLを生成してください。");
    if (hasPrivateCast()) throw new Error("非公開キャストを含むHTMLはGitHub Pagesへ公開できません。非公開キャストを外して再生成してください。");
    const participantIds = selectedCasts.filter(item => item.source === "public" && item.character.id).map(item => item.character.id);
    if (!participantIds.length) throw new Error("GitHub Pagesへ公開するには、公開キャストを1名以上選択してください。");
    const slug = normalizeSlug(elements.publishSlug?.value);
    if (!slug) throw new Error("公開ファイル名を半角英数字とハイフンで入力してください。");

    const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    if (!authSession) throw new Error("ログイン情報を確認できません。再ログインしてください。");

    publishing = true;
    updateOutputButtons();
    setGeneratorStatus("アクト紹介ページと参加履歴を公開中…");
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: {
        slug,
        actName: elements.actName?.value.trim() || slug,
        rulerName: elements.rulerName?.value.trim() || "",
        html: generatedHtml,
        participantIds
      }
    });
    if (error) throw new Error(await extractFunctionError(error));
    if (!data?.publicUrl) throw new Error("公開URLを取得できませんでした。");

    setGeneratorStatus(`公開処理が完了しました。参加アクト履歴にも反映しました。 <a href="${escapeAttribute(data.publicUrl)}" target="_blank" rel="noopener">公開ページを開く</a>`, "success", true);
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error?.message || "アクト紹介ページの公開に失敗しました。", "error");
  } finally {
    publishing = false;
    updateOutputButtons();
  }
}

async function extractFunctionError(error) {
  try {
    const response = error?.context;
    if (response instanceof Response) {
      const payload = await response.clone().json();
      return payload?.error || payload?.message || error.message;
    }
  } catch {}
  return error?.message || "Edge Functionの呼び出しに失敗しました。";
}

function translateHistoryError(error) {
  const message = String(error?.message ?? "");
  if (/record_act_history_for_current_user|function.*does not exist|schema cache/i.test(message)) {
    return "履歴登録機能が未設定です。Supabaseで supabase/13_private_act_history.sql を実行してください。";
  }
  if (/owned by another|another user|permission denied/i.test(message)) {
    return "このアクト識別名は別のユーザーが使用しています。別の識別名を入力してください。";
  }
  if (/not accessible|do not exist|participant/i.test(message)) {
    return "選択したキャストの一部を履歴へ登録できません。公開状態または所有者を確認してください。";
  }
  return message || "参加アクト履歴の登録に失敗しました。";
}

function invalidateGeneratedHtml(message = "選択内容が変更されました。HTMLを再生成してください。") {
  if (!generatedHtml) return;
  generatedHtml = "";
  elements.preview?.removeAttribute("srcdoc");
  updateOutputButtons();
  setGeneratorStatus(message);
}

function updateOutputButtons() {
  const hasOutput = Boolean(generatedHtml);
  if (elements.downloadButton) elements.downloadButton.disabled = !hasOutput;
  if (elements.copyButton) elements.copyButton.disabled = !hasOutput;
  if (elements.historyButton) elements.historyButton.disabled = registeringHistory;
  if (elements.publishButton) {
    const blockedByPrivate = hasPrivateCast();
    elements.publishButton.disabled = !hasOutput || blockedByPrivate || publishing;
    elements.publishButton.classList.toggle("is-blocked-private", blockedByPrivate);
    elements.publishButton.title = blockedByPrivate
      ? "非公開キャストを含むためGitHub Pagesへ公開できません。HTMLの生成・ダウンロード・コピーは利用できます。"
      : "";
  }
}

function hasPrivateCast() {
  return selectedCasts.some(item => item.source === "private");
}

function updatePrivateSelectionSummary() {
  const selectedPrivate = selectedCasts.filter(item => item.source === "private");
  if (elements.privateSelectedCount) elements.privateSelectedCount.textContent = String(selectedPrivate.length);
  if (!elements.privateSelectionSummary) return;

  if (!selectedPrivate.length) {
    elements.privateSelectionSummary.innerHTML = `<span>非公開キャストは未選択です。</span><small>NO PRIVATE CAST SELECTED</small>`;
    return;
  }

  elements.privateSelectionSummary.innerHTML = `
    <span class="private-selection-summary__label">出演枠に追加済み：</span>
    ${selectedPrivate.map(item => {
      const index = selectedCasts.indexOf(item);
      return `<span class="private-selection-summary__item"><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item.character.character_name || "名称未登録")}</span>`;
    }).join("")}`;
}

function suggestSlug() {
  if (!elements.publishSlug || elements.publishSlug.dataset.edited === "true") return;
  const suggested = normalizeSlug(elements.actName?.value);
  if (suggested) elements.publishSlug.value = suggested;
}

function setLibraryStatus(message, state = "") {
  if (!elements.libraryStatus) return;
  elements.libraryStatus.textContent = message;
  elements.libraryStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function setPrivateStatus(message, state = "") {
  if (!elements.privateStatus) return;
  elements.privateStatus.textContent = message;
  elements.privateStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function setGeneratorStatus(message, state = "", allowHtml = false) {
  if (!elements.generatorStatus) return;
  if (allowHtml) elements.generatorStatus.innerHTML = message;
  else elements.generatorStatus.textContent = message;
  elements.generatorStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function normalizeSearch(value) { return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, " ").trim(); }
function normalizeSlug(value) { return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64); }
function localeCompareJa(a, b) { return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true }); }
function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { if (!file) return resolve(""); const reader = new FileReader(); reader.onload = () => resolve(String(reader.result ?? "")); reader.onerror = () => reject(reader.error || new Error("背景画像を読み込めませんでした。")); reader.readAsDataURL(file); }); }
