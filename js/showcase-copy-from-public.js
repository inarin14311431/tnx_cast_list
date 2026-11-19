// "公開中のアクト紹介からコピー": someone's published act showcase (its public URL or its slug) becomes a new draft of one's own in the
// generator. The rules are in js/showcase-copy-source.js; the rows are filled with the helpers of the edit restore
// (js/showcase-edit-restore.js), but this is never an edit of an owned act: the draft always gets a new slug, the publish column is
// left in its "new" state, and a publication to the source's slug is stopped here before anything is written.
//
// Only public data is read (get_public_act_showcase / get_public_act_showcase_guests, js/public-showcase-service.js). Nothing of the
// source's act row, guests or files is written or removed: the pictures of manual casts and guests are fetched and uploaded again
// under the copier's own folder, and they are this session's uploads for the generator (gone again if they stop being used).
import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=a766246e";
import { loadPublicShowcase, loadPublicShowcaseGuests } from "./public-showcase-service.js?v=5da4463c";
import { uploadManualImage, removeManualImages, GUEST_IMAGE_FOLDER } from "./showcase-manual-image.js?v=775d7987";
import {
  parseCopySource, copyDraftSlug, isCopySourceSlug, planCopiedCasts, splitSavedFullName, guestFromPublicRow, sortedGuestRows,
  copyImageToOwnStorage, castDisplayName, isPlaceholderImage
} from "./showcase-copy-source.js?v=fcd12065";
import {
  restoreBasicFields, fillCastNumber, fillManualIdentity, fillRoleAndHandout, fillTagline, clearSelections, findSelectedRow,
  findRowByIndex, selectedRowCount, setControl, waitFor
} from "./showcase-edit-restore.js?v=b18cb682";

const GENERIC_SUBTITLE = "CAST SHOWCASE";
const PUBLISH_CONTROLS = "[data-publish-mode], #publish-button, #history-button";
const elements = {
  input: document.querySelector("#copy-showcase-source"),
  button: document.querySelector("#load-copy-showcase"),
  status: document.querySelector("#copy-showcase-status"),
  slug: document.querySelector("#publish-slug"),
  actName: document.querySelector("#act-name"),
  intro: document.querySelector("#intro-text"),
  subtitle: document.querySelector("#act-subtitle"),
  writer: document.querySelector("#scenario-writer-name"),
  guestCount: document.querySelector("#guest-count"),
  libraryStatus: document.querySelector("#library-status"),
  privateStatus: document.querySelector("#private-library-status")
};

let currentUser = null;
let copySourceSlug = "";
let busy = false;

void initialize();

async function initialize() {
  if (!elements.input || !elements.button) return;
  currentUser = await requireAuth();
  if (!currentUser) return;
  elements.button.disabled = false;
  elements.button.addEventListener("click", () => { void copyFromPublic(); });
  elements.input.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); void copyFromPublic(); }
  });
  // Before every other listener (the guests' save and the publisher listen on the document): a publication or a history entry to the
  // copied source's slug would write over the source, so it is stopped here.
  window.addEventListener("click", guardSourceSlug, true);
  // Restoring an owned act replaces the draft: it is not a copy any more.
  document.addEventListener("tnx:showcase-restored", () => { copySourceSlug = ""; });
}

function guardSourceSlug(event) {
  const control = event.target?.closest?.(PUBLISH_CONTROLS);
  if (!control || !isCopySourceSlug(elements.slug?.value, copySourceSlug)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  setStatus(`コピー元と同じアクト識別名「${copySourceSlug}」には公開・登録できません。アクト識別名を変えてください。`, "error");
  const generatorStatus = document.querySelector("#generator-status");
  if (generatorStatus) {
    generatorStatus.textContent = "コピー元と同じアクト識別名には公開できません。アクト識別名を変えてください。";
    generatorStatus.className = "generator-status is-error";
  }
}

async function copyFromPublic() {
  if (busy) return;
  const sourceSlug = parseCopySource(elements.input?.value);
  if (!sourceSlug) {
    setStatus("公開中のアクト紹介のURL（act-showcase.html?id=…）か、アクト識別名を入力してください。", "error");
    return;
  }
  busy = true;
  if (elements.button) elements.button.disabled = true;
  try {
    setStatus("コピー元のアクト紹介を取得しています…");
    const [showcase, guestRows] = await Promise.all([
      loadPublicShowcase(sourceSlug),
      loadPublicShowcaseGuests(sourceSlug).catch(error => { console.warn("Guests of the copied showcase could not be read.", error); return []; })
    ]);
    if (!showcase || typeof showcase !== "object" || !Array.isArray(showcase.casts) || !showcase.casts.length) {
      throw new Error("公開中のアクト紹介が見つかりませんでした。非公開になっているか、URLが違う可能性があります。");
    }
    if (hasDraftContent() && !window.confirm("いま入力中の内容は、コピーしたアクト紹介の内容で置き換わります。よろしいですか？")) {
      setStatus("コピーを取りやめました。");
      return;
    }

    setStatus("キャストの一覧を確認しています…");
    await waitForLibraries();
    const plan = planCopiedCasts(showcase.casts, requestLibraries());
    const draftSlug = await nextDraftSlug(sourceSlug);

    // Like a restore, the draft starts again: this session's unpublished uploads go and the publish column forgets any published act.
    document.dispatchEvent(new CustomEvent("tnx:showcase-restore-start"));
    copySourceSlug = sourceSlug;
    await clearSelections();
    restoreBasicFields({ actName: showcase.actName, rulerName: showcase.rulerName }, showcase, draftSlug);
    const subtitle = String(showcase.heroSubTitle || "").trim();
    setControl(elements.subtitle ?? document.querySelector("#act-subtitle"), subtitle.toUpperCase() === GENERIC_SUBTITLE ? "" : subtitle);
    setControl(elements.writer ?? document.querySelector("#scenario-writer-name"), String(showcase.scenarioWriterName || "").trim());

    setStatus("出演キャストと画像をコピーしています…");
    const skipped = plan.skipped.map(entry => entry.name);
    const imageFailures = [];
    for (const entry of plan.entries) {
      const row = await addCopiedCast(entry, imageFailures);
      if (!row) skipped.push(castDisplayName(entry.cast));
    }

    setStatus("ゲストをコピーしています…");
    const guests = [];
    for (const guestRow of sortedGuestRows(guestRows)) {
      const guest = guestFromPublicRow(guestRow);
      const picture = await copyPicture(guest.sourceImageUrl, GUEST_IMAGE_FOLDER, guest.name || "ゲスト", imageFailures);
      guests.push({ ...guest, imageUrl: picture?.url || "", storagePath: picture?.path || "" });
    }
    document.dispatchEvent(new CustomEvent("tnx:showcase-guests-replace", { detail: { guests } }));

    const notes = [];
    if (skipped.length) notes.push(`出演順に入れられなかったキャスト（非公開などで参照できません）：${skipped.join("、")}。`);
    if (imageFailures.length) notes.push(`画像をコピーできなかったため、画像なしにしました：${imageFailures.join("、")}。`);
    const actName = String(showcase.actName || sourceSlug).trim();
    setStatus(
      `「${actName}」をコピーしました。新しいアクト（${draftSlug}）の下書きです。内容を確認して公開してください。${notes.length ? ` ${notes.join(" ")}` : ""}`,
      notes.length ? "error" : "success"
    );
  } catch (error) {
    console.error("The public showcase could not be copied.", error);
    setStatus(error?.message || "アクト紹介をコピーできませんでした。", "error");
  } finally {
    busy = false;
    if (elements.button) elements.button.disabled = false;
  }
}

// One card of the source into the order: a registered cast is picked (it is referred to, not copied); a manual cast is copied with its
// picture uploaded again. Returns the row, or null when the cast could not be placed.
async function addCopiedCast(entry, imageFailures) {
  const { cast } = entry;
  let row = null;
  if (entry.kind === "public" || entry.kind === "private") {
    const detail = { source: entry.kind, characterId: entry.character.id, selected: false };
    document.dispatchEvent(new CustomEvent("tnx:showcase-select-archive-cast", { detail }));
    if (!detail.selected) return null;
    row = await waitFor(() => findSelectedRow(entry.character.id), 1800);
  } else {
    const picture = await copyPicture(cast.imageUrl, undefined, castDisplayName(cast), imageFailures);
    const previousCount = selectedRowCount();
    document.dispatchEvent(new CustomEvent("tnx:showcase-add-manual-cast"));
    row = await waitFor(() => findRowByIndex(previousCount), 1200);
    if (!row) {
      if (picture?.path) void removeManualImages(supabase, [picture.path]);
      return null;
    }
    fillManualIdentity(row, { ...cast, imageUrl: picture?.url || "" });
    const { handle, name } = splitSavedFullName(cast.fullName);
    setControl(row.querySelector('[data-field="manual-handle"]'), handle);
    setControl(row.querySelector('[data-field="manual-name"]'), name || "名称未登録");
    if (picture?.path) document.dispatchEvent(new CustomEvent("tnx:showcase-copied-images", { detail: { paths: [picture.path] } }));
  }
  if (!row) return null;
  fillCastNumber(row, cast.slot, Number(row.dataset.selectedIndex) || 0);
  fillRoleAndHandout(row, cast, null);
  await fillTagline(row, cast.tagline);
  return row;
}

// The source's picture uploaded under the copier's own folder: { url, path }, or null for no picture (none, or it failed: named then).
async function copyPicture(sourceUrl, folder, name, failures) {
  if (isPlaceholderImage(sourceUrl)) return null;
  try {
    return await copyImageToOwnStorage(sourceUrl, {
      upload: file => uploadManualImage(supabase, currentUser?.id, file, folder ? { folder } : {})
    });
  } catch (error) {
    console.warn("A picture of the copied showcase could not be copied.", error);
    failures.push(name);
    return null;
  }
}

function requestLibraries() {
  const detail = { publicCharacters: [], ownPrivateCharacters: [] };
  document.dispatchEvent(new CustomEvent("tnx:showcase-library-request", { detail }));
  return detail;
}

async function waitForLibraries() {
  const loaded = node => !node || (String(node.textContent || "") && !String(node.textContent || "").includes("読み込み中"));
  await waitFor(() => loaded(elements.libraryStatus) && loaded(elements.privateStatus), 12000);
}

// The next automatic number of the copier's acts (the same query as js/showcase-auto-slug.js), counted past the source's slug.
async function nextDraftSlug(sourceSlug) {
  const { data, error } = await supabase.from("acts").select("slug").like("slug", "act-%");
  if (error) console.warn("Could not calculate the next act file number.", error);
  return copyDraftSlug(error ? [] : data, sourceSlug);
}

// Something the writer has put in: a cast, a guest, or an act name / trailer other than what the page starts with.
function hasDraftContent() {
  const changed = field => Boolean(field) && String(field.value || "").trim() !== String(field.defaultValue || "").trim();
  return selectedRowCount() > 0
    || changed(elements.actName)
    || changed(elements.intro)
    || Number(elements.guestCount?.textContent || 0) > 0;
}

function setStatus(message, state = "") {
  if (!elements.status) return;
  elements.status.textContent = message;
  elements.status.className = `generator-status${state ? ` is-${state}` : ""}`;
}
