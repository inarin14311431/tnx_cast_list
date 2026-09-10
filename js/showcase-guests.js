import { supabase } from "./supabase-client.js";
import { STYLE_COLORS } from "./style-colors.js";

const MAX_GUESTS = 12;
const IMAGE_BUCKET = "character-images";
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 1024 * 1024;
const slugField = document.querySelector("#publish-slug");
const preview = document.querySelector("#showcase-preview");
const status = document.querySelector("#generator-status");
const guests = [];
let loadedSlug = "";
let dirty = false;
let replayPublish = false;
let previewSyncing = false;

mountGuestPanel();
bindOutputBridges();
void loadForCurrentSlug();

function mountGuestPanel() {
  if (document.querySelector("#showcase-guest-panel")) return;
  const panels = [...document.querySelectorAll("main.showcase-layout > .showcase-panel")];
  const outputPanel = panels.at(-1);
  if (!outputPanel) return;
  const panel = document.createElement("section");
  panel.id = "showcase-guest-panel";
  panel.className = "showcase-panel showcase-guest-panel";
  panel.innerHTML = `
    <header class="showcase-panel__header">
      <div><span>04</span><h2>ゲスト <small>GUEST CAST / SUPPORTING FILES</small></h2></div>
      <div class="showcase-panel__header-actions"><p><strong id="guest-count">0</strong> / ${MAX_GUESTS} SUPPORTING</p><button id="add-showcase-guest" class="manual-cast-add" type="button">ゲスト追加 <small>ADD GUEST</small></button></div>
    </header>
    <div class="showcase-panel__body">
      <p class="showcase-guest-panel__lead">主演キャストとは別に、アクトを彩る助演・重要人物を登録できます。ゲストはハンドアウトのアサイン対象や参加履歴には含まれません。</p>
      <div id="showcase-guests" class="showcase-guests"><p class="empty-state">ゲストは未登録です。「ゲスト追加」から登場人物を追加できます。</p></div>
    </div>`;
  outputPanel.before(panel);
  const outputNumber = outputPanel.querySelector(".showcase-panel__header span");
  if (outputNumber?.textContent?.trim() === "04") outputNumber.textContent = "05";
  panel.querySelector("#add-showcase-guest")?.addEventListener("click", () => {
    if (guests.length >= MAX_GUESTS) return setStatus(`ゲストは最大${MAX_GUESTS}名までです。`, "error");
    guests.push(createGuest());
    dirty = true;
    renderGuests();
    invalidatePreview();
  });
  panel.querySelector("#showcase-guests")?.addEventListener("input", onGuestInput);
  panel.querySelector("#showcase-guests")?.addEventListener("change", onGuestChange);
  panel.querySelector("#showcase-guests")?.addEventListener("click", onGuestClick);
  renderGuests();
}

function createGuest(data = {}) {
  return {
    id: data.id || crypto.randomUUID(),
    handle: String(data.handle || ""),
    name: String(data.name || ""),
    personaStyle: String(data.persona_style || data.personaStyle || ""),
    affiliation: String(data.affiliation || ""),
    gender: String(data.gender || ""),
    age: String(data.age || ""),
    tagline: String(data.tagline || ""),
    summary: String(data.summary || ""),
    imageUrl: String(data.image_url || data.imageUrl || ""),
    storagePath: "",
    uploading: false
  };
}

function renderGuests() {
  const root = document.querySelector("#showcase-guests");
  const count = document.querySelector("#guest-count");
  if (count) count.textContent = String(guests.length);
  if (!root) return;
  if (!guests.length) {
    root.innerHTML = '<p class="empty-state">ゲストは未登録です。「ゲスト追加」から登場人物を追加できます。</p>';
    return;
  }
  root.innerHTML = guests.map((guest, index) => guestEditor(guest, index)).join("");
}

function guestEditor(guest, index) {
  const styleOptions = [...STYLE_COLORS.keys()].map(name => `<option value="${escAttr(name)}"${guest.personaStyle === name ? " selected" : ""}>${esc(name)}</option>`).join("");
  const image = guest.imageUrl || "./assets/placeholders/scan-failed.webp";
  return `<article class="showcase-guest-editor" data-guest-index="${index}">
    <div class="showcase-guest-editor__visual">
      <img src="${escAttr(image)}" alt="" loading="lazy">
      <span>GUEST ${String(index + 1).padStart(2, "0")} // SUPPORTING</span>
      <label class="showcase-guest-editor__image-button">画像を登録<input type="file" data-guest-field="image" accept="image/jpeg,image/png,image/webp"></label>
      ${guest.imageUrl ? '<button type="button" data-guest-action="clear-image">画像を外す</button>' : ""}
      ${guest.uploading ? '<small class="is-uploading">UPLOADING IMAGE…</small>' : ""}
    </div>
    <div class="showcase-guest-editor__fields">
      <label>ハンドル<input type="text" data-guest-field="handle" value="${escAttr(guest.handle)}" placeholder="例：地球王"></label>
      <label>名前<input type="text" data-guest-field="name" value="${escAttr(guest.name)}" placeholder="ゲスト名" required></label>
      <label>スタイル <small>PERSONA / 1 STYLE</small><select data-guest-field="personaStyle"><option value="">選択してください</option>${styleOptions}</select></label>
      <label>所属<input type="text" data-guest-field="affiliation" value="${escAttr(guest.affiliation)}"></label>
      <label>性別<input type="text" data-guest-field="gender" value="${escAttr(guest.gender)}"></label>
      <label>年齢<input type="text" data-guest-field="age" value="${escAttr(guest.age)}"></label>
      <label class="showcase-guest-editor__wide">一言<input type="text" data-guest-field="tagline" value="${escAttr(guest.tagline)}" maxlength="240" placeholder="印象的な一言・台詞"></label>
      <label class="showcase-guest-editor__wide">概要<textarea data-guest-field="summary" rows="5" maxlength="4000" placeholder="この人物がどのような登場人物なのかを入力">${esc(guest.summary)}</textarea></label>
    </div>
    <div class="showcase-guest-editor__actions">
      <button type="button" data-guest-action="up"${index === 0 ? " disabled" : ""}>↑</button>
      <button type="button" data-guest-action="down"${index === guests.length - 1 ? " disabled" : ""}>↓</button>
      <button type="button" class="remove" data-guest-action="remove">削除</button>
    </div>
  </article>`;
}

function onGuestInput(event) {
  const field = event.target.closest("[data-guest-field]");
  const row = event.target.closest("[data-guest-index]");
  if (!field || !row || field.type === "file") return;
  const guest = guests[Number(row.dataset.guestIndex)];
  if (!guest) return;
  guest[field.dataset.guestField] = field.value;
  dirty = true;
  invalidatePreview();
}

function onGuestChange(event) {
  const field = event.target.closest("[data-guest-field]");
  const row = event.target.closest("[data-guest-index]");
  if (!field || !row) return;
  const guest = guests[Number(row.dataset.guestIndex)];
  if (!guest) return;
  if (field.dataset.guestField === "image") void uploadGuestImage(guest, field.files?.[0]);
  else {
    guest[field.dataset.guestField] = field.value;
    dirty = true;
    invalidatePreview();
  }
}

async function onGuestClick(event) {
  const button = event.target.closest("[data-guest-action]");
  const row = event.target.closest("[data-guest-index]");
  if (!button || !row) return;
  const index = Number(row.dataset.guestIndex);
  const guest = guests[index];
  if (!guest) return;
  const action = button.dataset.guestAction;
  if (action === "up" && index > 0) [guests[index - 1], guests[index]] = [guests[index], guests[index - 1]];
  else if (action === "down" && index < guests.length - 1) [guests[index], guests[index + 1]] = [guests[index + 1], guests[index]];
  else if (action === "remove") {
    guests.splice(index, 1);
    if (guest.storagePath) void supabase.storage.from(IMAGE_BUCKET).remove([guest.storagePath]);
  } else if (action === "clear-image") {
    const oldPath = guest.storagePath;
    guest.imageUrl = "";
    guest.storagePath = "";
    if (oldPath) void supabase.storage.from(IMAGE_BUCKET).remove([oldPath]);
  } else return;
  dirty = true;
  renderGuests();
  invalidatePreview();
}

async function uploadGuestImage(guest, file) {
  if (!file) return;
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return setStatus("ゲスト画像はJPEG / PNG / WebPを使用してください。", "error");
  if (file.size > MAX_IMAGE_BYTES) return setStatus("ゲスト画像は1MB以下にしてください。", "error");
  try {
    guest.uploading = true;
    renderGuests();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw userError || new Error("ログイン情報を確認できません。");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/act-guests/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    const oldPath = guest.storagePath;
    guest.imageUrl = data?.publicUrl || "";
    guest.storagePath = path;
    if (oldPath && oldPath !== path) void supabase.storage.from(IMAGE_BUCKET).remove([oldPath]);
    dirty = true;
    invalidatePreview();
    setStatus("ゲスト画像を登録しました。HTMLを再生成してください。", "success");
  } catch (error) {
    console.error(error);
    setStatus(`ゲスト画像を登録できませんでした。${error?.message ? ` ${error.message}` : ""}`, "error");
  } finally {
    guest.uploading = false;
    renderGuests();
  }
}

function bindOutputBridges() {
  const observer = new MutationObserver(() => {
    if (previewSyncing || !preview?.srcdoc || preview.srcdoc.includes("data-showcase-guests-injected")) return;
    const source = injectGuestPreview(preview.srcdoc);
    if (source !== preview.srcdoc) {
      previewSyncing = true;
      preview.srcdoc = source;
      queueMicrotask(() => { previewSyncing = false; });
    }
  });
  if (preview) observer.observe(preview, { attributes: true, attributeFilter: ["srcdoc"] });

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#publish-button");
    if (!button) return;
    if (replayPublish) {
      replayPublish = false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void saveThenReplayPublish(button);
  }, true);

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#download-button,#copy-button");
    if (!button || !guests.length || !preview?.srcdoc) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (button.id === "copy-button") void navigator.clipboard.writeText(preview.srcdoc).then(() => setStatus("ゲストを含むHTMLをコピーしました。", "success"));
    else downloadPreviewHtml(preview.srcdoc);
  }, true);

  slugField?.addEventListener("change", () => { if (!dirty) void loadForCurrentSlug(); });
}

async function saveThenReplayPublish(button) {
  try {
    if (guests.some(guest => guest.uploading)) throw new Error("ゲスト画像のアップロード完了後に公開してください。");
    const slug = normalizeSlug(slugField?.value);
    if (!slug) throw new Error("アクト識別名を入力してください。");
    if (loadedSlug !== slug && !dirty) await loadForSlug(slug);
    const payload = serializeGuests();
    const { error } = await supabase.rpc("replace_act_showcase_guests_for_current_user", { p_slug: slug, p_guests: payload });
    if (error) throw error;
    loadedSlug = slug;
    dirty = false;
    replayPublish = true;
    button.click();
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "ゲスト情報を保存できませんでした。", "error");
  }
}

async function loadForCurrentSlug() {
  const slug = normalizeSlug(slugField?.value);
  if (slug) await loadForSlug(slug);
}

async function loadForSlug(slug) {
  const { data, error } = await supabase.from("act_showcase_guests")
    .select("id,sort_order,handle,name,persona_style,affiliation,gender,age,tagline,summary,image_url")
    .eq("showcase_slug", slug)
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("Guest cast could not be restored.", error);
    return;
  }
  guests.splice(0, guests.length, ...(data || []).map(createGuest));
  loadedSlug = slug;
  dirty = false;
  renderGuests();
}

function serializeGuests() {
  return guests.filter(guest => guest.name.trim()).map(guest => ({
    handle: guest.handle.trim(), name: guest.name.trim(), personaStyle: guest.personaStyle.trim(),
    affiliation: guest.affiliation.trim(), gender: guest.gender.trim(), age: guest.age.trim(),
    tagline: guest.tagline.trim(), summary: guest.summary.trim(), imageUrl: guest.imageUrl.trim()
  }));
}

function injectGuestPreview(source) {
  if (!guests.length || !source || source.includes("data-showcase-guests-injected")) return source;
  const cards = serializeGuests().map((guest, index) => `<article class="guest-preview-card"><div class="guest-preview-card__image"><img src="${escAttr(guest.imageUrl || "./assets/placeholders/scan-failed.webp")}" alt=""></div><div><small>GUEST ${String(index + 1).padStart(2, "0")} // SUPPORTING CAST</small><h3>${esc([guest.handle ? `“${guest.handle}”` : "", guest.name].filter(Boolean).join(" "))}</h3><b>${esc(guest.personaStyle || "PERSONA UNREGISTERED")}</b>${guest.tagline ? `<p>${esc(guest.tagline)}</p>` : ""}</div></article>`).join("");
  if (!cards) return source;
  const section = `<section class="guest-preview" data-showcase-guests-injected="1"><header><span>SUPPORTING FILES</span><h2>GUEST CAST</h2></header><div>${cards}</div></section>`;
  const css = `<style data-showcase-guests-injected="1">.guest-preview{width:min(1280px,calc(100% - 28px));margin:0 auto 70px;padding:24px;border:1px solid rgba(255,84,181,.28);background:rgba(5,10,22,.94)}.guest-preview header{display:flex;align-items:end;justify-content:space-between;border-bottom:1px solid rgba(0,239,255,.2)}.guest-preview h2{margin:0 0 12px;font:900 1.6rem Orbitron,sans-serif}.guest-preview header span{color:#ff7fc8;font:700 .65rem Share Tech Mono,monospace}.guest-preview>div{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:16px}.guest-preview-card{display:grid;grid-template-columns:92px 1fr;min-height:140px;border:1px solid rgba(0,239,255,.18);background:#07101d}.guest-preview-card__image{overflow:hidden}.guest-preview-card img{width:100%;height:100%;object-fit:cover}.guest-preview-card>div:last-child{padding:14px}.guest-preview-card small{color:#61ffb1;font:700 .55rem Share Tech Mono,monospace}.guest-preview-card h3{margin:8px 0;color:#fff}.guest-preview-card b{color:#75eaff}.guest-preview-card p{color:#bcd0db}</style>`;
  return source.replace("</head>", `${css}</head>`).replace("</main>", `</main>${section}`);
}

function invalidatePreview() {
  if (!preview?.srcdoc) return;
  preview.srcdoc = "";
  for (const id of ["download-button", "copy-button", "publish-button"]) {
    const button = document.querySelector(`#${id}`);
    if (button) button.disabled = true;
  }
  setStatus("ゲスト情報が変更されました。HTMLを再生成してください。");
}

function downloadPreviewHtml(source) {
  const slug = normalizeSlug(slugField?.value) || "act-showcase";
  const url = URL.createObjectURL(new Blob([source], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function normalizeSlug(value) { return String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64); }
function setStatus(message, state = "") { if (!status) return; status.textContent = message; status.className = `generator-status${state ? ` is-${state}` : ""}`; }
function esc(value) { return String(value ?? "").replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char])); }
function escAttr(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

window.__SHOWCASE_GUEST_RUNTIME__ = Object.freeze({ serializeGuests, loadForCurrentSlug });