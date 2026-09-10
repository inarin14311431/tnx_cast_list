import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const MAX_CASTS = 6;
const RESTORE_PARAM = "edit";
const elements = {
  host: document.querySelector(".showcase-panel .showcase-panel__body.form-grid"),
  pageTitle: document.querySelector("#page-title"),
  actName: document.querySelector("#act-name"),
  rulerName: document.querySelector("#ruler-name"),
  publishSlug: document.querySelector("#publish-slug"),
  introText: document.querySelector("#intro-text"),
  backgroundUrl: document.querySelector("#background-url"),
  backgroundFile: document.querySelector("#background-file"),
  publicGrid: document.querySelector("#public-cast-grid"),
  libraryStatus: document.querySelector("#library-status"),
  selectedCasts: document.querySelector("#selected-casts"),
  manualAddButton: document.querySelector("#add-manual-cast")
};

let currentUser = null;
let ownedActs = [];
let restoreSelect = null;
let restoreButton = null;
let restoreStatus = null;

mountRestorePanel();
void initializeRestore();

function mountRestorePanel() {
  if (!elements.host || document.querySelector("#owned-showcase-restore")) return;
  const section = document.createElement("section");
  section.id = "owned-showcase-restore";
  section.className = "private-history-selector form-grid__wide";
  section.setAttribute("aria-labelledby", "owned-showcase-restore-heading");
  section.innerHTML = `
    <header class="private-history-selector__header">
      <h3 id="owned-showcase-restore-heading">自分のアクト紹介を読み込む <small>OWNED SHOWCASE / EDIT RESTORE</small></h3>
      <p>RE-EDIT</p>
    </header>
    <p class="private-history-selector__lead">公開済みの自分のアクト紹介を選び、アクト情報・背景・出演順・参加枠・一言・ハンドアウトを編集欄へ復元します。読み込み後は通常どおり再生成・再公開できます。</p>
    <div class="selector-controls">
      <label>アクト紹介<select id="owned-showcase-select" disabled><option value="">読み込み中…</option></select></label>
      <button id="load-owned-showcase" class="manual-cast-add" type="button" disabled>読み込む <small>LOAD TO FORM</small></button>
    </div>
    <p id="owned-showcase-status" class="generator-status">自分のアクト紹介を確認中…</p>`;
  elements.host.prepend(section);
  restoreSelect = section.querySelector("#owned-showcase-select");
  restoreButton = section.querySelector("#load-owned-showcase");
  restoreStatus = section.querySelector("#owned-showcase-status");
}

async function initializeRestore() {
  if (!restoreSelect || !restoreButton) return;
  currentUser = await requireAuth();
  if (!currentUser) return;

  restoreSelect.addEventListener("change", () => {
    restoreButton.disabled = !restoreSelect.value;
  });
  restoreButton.addEventListener("click", () => {
    const slug = normalizeSlug(restoreSelect.value);
    if (!slug) return;
    const url = new URL(location.href);
    url.searchParams.set(RESTORE_PARAM, slug);
    location.assign(url.href);
  });

  await loadOwnedShowcases();

  const requestedSlug = normalizeSlug(new URLSearchParams(location.search).get(RESTORE_PARAM));
  if (!requestedSlug) return;
  restoreSelect.value = requestedSlug;
  restoreButton.disabled = false;
  await restoreOwnedShowcase(requestedSlug);
}

async function loadOwnedShowcases() {
  setRestoreStatus("自分のアクト紹介を読み込み中…");
  const { data, error } = await supabase
    .from("acts")
    .select("slug,act_name,ruler_name,showcase_public,showcase_updated_at,updated_at")
    .eq("published_by", currentUser.id)
    .not("showcase_data", "is", null)
    .order("showcase_updated_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Owned showcases could not be listed.", error);
    restoreSelect.innerHTML = '<option value="">取得できませんでした</option>';
    setRestoreStatus("自分のアクト紹介を取得できませんでした。", "error");
    return;
  }

  ownedActs = data || [];
  restoreSelect.disabled = false;
  restoreSelect.innerHTML = ownedActs.length
    ? `<option value="">選択してください</option>${ownedActs.map(act => `<option value="${escapeAttribute(act.slug)}">${escapeHtml(act.act_name || act.slug)} // ${escapeHtml(act.slug)}</option>`).join("")}`
    : '<option value="">公開済みのアクト紹介はありません</option>';
  setRestoreStatus(
    ownedActs.length ? `${ownedActs.length}件の自分のアクト紹介を読み込みました。` : "再編集できる公開済みアクト紹介はありません。",
    ownedActs.length ? "success" : ""
  );
}

async function restoreOwnedShowcase(slug) {
  try {
    setRestoreStatus("編集データを取得中…");
    await waitForGeneratorLibrary();

    const { data, error } = await supabase.rpc("get_owned_act_showcase_editor", { p_slug: slug });
    if (error) throw error;
    const showcase = data?.showcaseData;
    const casts = Array.isArray(showcase?.casts) ? showcase.casts.slice(0, MAX_CASTS) : [];
    const participants = Array.isArray(data?.participants) ? data.participants : [];
    if (!showcase || typeof showcase !== "object") throw new Error("保存済みのアクト紹介データを確認できませんでした。");
    if (!casts.length) throw new Error("保存済みの出演キャスト情報を確認できませんでした。");

    await clearSelections();
    restoreBasicFields(data, showcase, slug);
    const fallbackCount = await restoreCasts(casts, participants);

    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete(RESTORE_PARAM);
    history.replaceState(null, "", cleanUrl.href);

    setRestoreStatus(
      fallbackCount
        ? `アクト紹介を復元しました。${fallbackCount}名は現在の公開キャスト一覧に見つからないため手動枠として復元しています。内容を確認して再生成してください。`
        : `アクト紹介を復元しました。${casts.length}名の出演枠と保存済み情報を編集できます。`,
      fallbackCount ? "error" : "success"
    );
  } catch (error) {
    console.error("Owned showcase could not be restored.", error);
    setRestoreStatus(error?.message || "アクト紹介を復元できませんでした。", "error");
  }
}

function restoreBasicFields(data, showcase, slug) {
  setField(elements.pageTitle, showcase.pageTitle || "ACT CAST FILE");
  setField(elements.actName, showcase.actName || data?.actName || slug);
  setField(elements.rulerName, showcase.rulerName || data?.rulerName || "");
  setField(elements.introText, showcase.trailer?.body || showcase.intro || "");

  if (elements.publishSlug) {
    elements.publishSlug.value = slug;
    elements.publishSlug.dataset.edited = "true";
    dispatchInput(elements.publishSlug);
    elements.publishSlug.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (elements.backgroundFile) elements.backgroundFile.value = "";
  setField(elements.backgroundUrl, showcase.background || "");
}

async function restoreCasts(casts, participants) {
  const orderedParticipants = [...participants].sort((a, b) => numberOrMax(a.castOrder) - numberOrMax(b.castOrder));
  let fallbackCount = 0;

  for (let index = 0; index < casts.length; index += 1) {
    const savedCast = casts[index] || {};
    const participant = matchParticipant(savedCast, orderedParticipants, index);
    let row = null;

    if (participant?.characterId) {
      const card = findPublicCard(participant.characterId);
      if (card) {
        card.click();
        row = await waitFor(() => findSelectedRow(participant.characterId), 1800);
      }
    }

    if (!row) {
      const previousCount = selectedRowCount();
      elements.manualAddButton?.click();
      row = await waitFor(() => findRowByIndex(previousCount), 1200);
      fallbackCount += 1;
      if (row) fillManualIdentity(row, savedCast);
    }

    if (!row) continue;
    fillRoleAndHandout(row, savedCast, participant);
    await fillTagline(row, savedCast.tagline);
  }

  return fallbackCount;
}

function matchParticipant(savedCast, participants, index) {
  const serial = normalizeSerial(savedCast?.serial);
  if (serial) {
    const exact = participants.find(item => normalizeSerial(obfuscatePublicId(item.characterPublicId)) === serial);
    if (exact) return exact;
  }
  return participants[index] || null;
}

function findPublicCard(characterId) {
  return [...(elements.publicGrid?.querySelectorAll("[data-public-character-id]") || [])]
    .find(card => String(card.dataset.publicCharacterId || "") === String(characterId));
}

function findSelectedRow(characterId) {
  return [...(elements.selectedCasts?.querySelectorAll("[data-selected-index][data-character-id]") || [])]
    .find(row => String(row.dataset.characterId || "") === String(characterId));
}

function findRowByIndex(index) {
  return elements.selectedCasts?.querySelector(`[data-selected-index="${index}"]`) || null;
}

function selectedRowCount() {
  return elements.selectedCasts?.querySelectorAll("[data-selected-index]").length || 0;
}

async function clearSelections() {
  for (let guard = 0; guard < MAX_CASTS + 2; guard += 1) {
    const remove = elements.selectedCasts?.querySelector('[data-action="remove"]');
    if (!remove) break;
    remove.click();
    await nextFrame();
  }
}

function fillManualIdentity(row, savedCast) {
  setControl(row.querySelector('[data-field="manual-name"]'), savedCast.fullName || "名称未登録");
  setControl(row.querySelector('[data-field="manual-styles"]'), (savedCast.styles || []).map(style => String(style?.label || "").trim()).filter(Boolean).join(" / "));
  setControl(row.querySelector('[data-field="manual-player"]'), getMetaValue(savedCast, "PLAYER"));
}

function fillRoleAndHandout(row, savedCast, participant) {
  const role = String(participant?.participationRole || deriveRole(savedCast)).trim();
  const roleField = row.querySelector('[data-field="quote"]');
  if (roleField) setSelectOrInput(roleField, role);

  const body = String(savedCast?.handout?.body || "");
  setControl(
    row.querySelector('[data-field="description"]'),
    body.trim() === "ハンドアウト詳細は未登録です。" ? "" : body
  );
}

async function fillTagline(row, value) {
  const text = stripOuterQuote(String(value || "").trim());
  const field = await waitFor(() => row.querySelector('[data-field="tagline"]'), 1800);
  if (field) setControl(field, text);
}

function deriveRole(savedCast) {
  const primary = (savedCast?.styles || []).find(style => style?.handoutRole);
  if (primary?.label) return normalizeStyleLabel(primary.label);
  const title = String(savedCast?.handout?.title || "").trim();
  if (/共通ハンドアウト/.test(title)) return "共通";
  const match = title.match(/[『「](.+?)[』」]用ハンドアウト/);
  return match?.[1] || "";
}

function setSelectOrInput(field, value) {
  if (!field) return;
  if (field.tagName === "SELECT") {
    const normalized = normalizeStyleLabel(value);
    const option = [...field.options].find(item => normalizeStyleLabel(item.value) === normalized);
    field.value = option?.value || value;
  } else {
    field.value = value;
  }
  dispatchInput(field);
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function setField(field, value) {
  if (!field) return;
  field.value = String(value ?? "");
  dispatchInput(field);
}

function setControl(field, value) {
  if (!field) return;
  field.value = String(value ?? "");
  dispatchInput(field);
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function dispatchInput(field) {
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

async function waitForGeneratorLibrary() {
  await waitFor(() => {
    const text = String(elements.libraryStatus?.textContent || "");
    return text && !text.includes("読み込み中");
  }, 12000);
}

function waitFor(predicate, timeoutMs) {
  return new Promise(resolve => {
    const started = performance.now();
    const check = () => {
      const result = predicate();
      if (result) return resolve(result);
      if (performance.now() - started >= timeoutMs) return resolve(null);
      requestAnimationFrame(check);
    };
    check();
  });
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function getMetaValue(savedCast, label) {
  const row = (savedCast?.meta || []).find(item => String(item?.label || "").trim().toUpperCase() === label);
  return String(row?.value || "").trim();
}

function stripOuterQuote(value) {
  const pairs = [["“", "”"], ["\"", "\""], ["「", "」"], ["『", "』"]];
  for (const [open, close] of pairs) {
    if (value.startsWith(open) && value.endsWith(close) && value.length >= open.length + close.length) {
      return value.slice(open.length, value.length - close.length).trim();
    }
  }
  return value;
}

function normalizeStyleLabel(value) {
  return String(value || "").normalize("NFKC").replace(/HANDOUT ROLE/gi, "").replace(/[◎●]/g, "").replace(/\s+/g, "").trim();
}

function normalizeSerial(value) {
  return String(value || "").normalize("NFKC").trim().toUpperCase();
}

function numberOrMax(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

function obfuscatePublicId(value) {
  const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function normalizeSlug(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function setRestoreStatus(message, state = "") {
  if (!restoreStatus) return;
  restoreStatus.textContent = message;
  restoreStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[character]));
}

function escapeAttribute(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;" }[character]));
}
