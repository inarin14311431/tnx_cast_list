import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";

const MAX_CASTS = 6;
const FUNCTION_NAME = "publish-showcase";
const STYLE_COLORS = new Map([
  ["カブキ", "#ff3b6b"], ["バサラ", "#7d3bff"], ["タタラ", "#3b6cff"],
  ["ミストレス", "#ff5cc8"], ["カブト", "#3dffa1"], ["カリスマ", "#ffd23b"],
  ["マネキン", "#ffb93b"], ["カゼ", "#29c7ff"], ["フェイト", "#ffe66b"],
  ["クロマク", "#8a6cff"], ["エグゼク", "#ff8a3b"], ["カタナ", "#3bffa4"],
  ["クグツ", "#c83bff"], ["カゲ", "#6f7cff"], ["チャクラ", "#3bff8a"],
  ["レッガー", "#ffb13b"], ["カブトワリ", "#ff3b9b"], ["ハイランダー", "#9aff3b"],
  ["マヤカシ", "#3bffd5"], ["トーキー", "#ff6f3b"], ["イヌ", "#ff4f3b"],
  ["ニューロ", "#3bffe1"], ["コモン", "#b8ff3b"], ["ヒルコ", "#ff3bd5"],
  ["クロガネ", "#a1a8ff"], ["イブキ", "#45ffcc"], ["シキガミ", "#ff5cc8"],
  ["アラシ", "#ff7a3b"], ["カゲムシャ", "#9b3bff"], ["ミギウデ", "#ffcf3b"],
  ["エトランゼ", "#9aff3b"], ["アヤカシ", "#3bffd5"], ["ウツワ", "#ffffff"]
]);

const elements = {
  pageTitle: document.querySelector("#page-title"),
  sessionName: document.querySelector("#session-name"),
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
  selectedCount: document.querySelector("#selected-count"),
  selectedCasts: document.querySelector("#selected-casts"),
  generateButton: document.querySelector("#generate-button"),
  downloadButton: document.querySelector("#download-button"),
  copyButton: document.querySelector("#copy-button"),
  publishButton: document.querySelector("#publish-button"),
  generatorStatus: document.querySelector("#generator-status"),
  preview: document.querySelector("#showcase-preview")
};

let publicCharacters = [];
let selectedCasts = [];
let generatedHtml = "";

initialize();

async function initialize() {
  const currentUser = await requireAuth();
  if (!currentUser) return;
  bindEvents();
  suggestSlug();
  await loadPublicCharacters();
}

function bindEvents() {
  elements.search?.addEventListener("input", renderPublicCharacters);
  elements.playerFilter?.addEventListener("change", renderPublicCharacters);
  elements.styleFilter?.addEventListener("change", renderPublicCharacters);
  elements.publicGrid?.addEventListener("click", handleLibraryClick);
  elements.selectedCasts?.addEventListener("click", handleSelectedCastClick);
  elements.selectedCasts?.addEventListener("input", handleSelectedCastInput);
  elements.sessionName?.addEventListener("input", suggestSlug);
  elements.generateButton?.addEventListener("click", generateShowcase);
  elements.downloadButton?.addEventListener("click", downloadShowcase);
  elements.copyButton?.addEventListener("click", copyShowcase);
  elements.publishButton?.addEventListener("click", publishShowcase);
}

async function loadPublicCharacters() {
  setLibraryStatus("公開キャストを読み込み中…");
  const { data, error } = await supabase
    .from("characters")
    .select(`
      id, public_id, player_name, character_name, character_kana,
      handle, handle_kana, affiliation, citizen_rank,
      style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
      image_url, summary, age, gender, updated_at
    `)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    setLibraryStatus("公開キャストを取得できませんでした。", "error");
    return;
  }

  publicCharacters = data ?? [];
  populateFilters();
  renderPublicCharacters();
  setLibraryStatus(`${publicCharacters.length}件の公開キャストを読み込みました。`, "success");
}

function populateFilters() {
  const players = [...new Set(publicCharacters.map(character => character.player_name).filter(Boolean))].sort(localeCompareJa);
  const styles = [...new Set(publicCharacters.flatMap(getStyleNames))].sort(localeCompareJa);
  elements.playerFilter.innerHTML = `<option value="">すべて</option>${players.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
  elements.styleFilter.innerHTML = `<option value="">すべて</option>${styles.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
}

function renderPublicCharacters() {
  const keyword = normalizeSearch(elements.search?.value);
  const player = elements.playerFilter?.value ?? "";
  const style = elements.styleFilter?.value ?? "";
  const filtered = publicCharacters.filter(character => {
    const searchable = normalizeSearch([
      character.public_id, character.character_name, character.character_kana,
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

  elements.publicGrid.innerHTML = filtered.map(character => {
    const selectedIndex = selectedCasts.findIndex(item => item.character.id === character.id);
    const isSelected = selectedIndex >= 0;
    const isDisabled = !isSelected && selectedCasts.length >= MAX_CASTS;
    const styles = getStyles(character).map(item => `${item.name}${item.mark}`).join(" / ");
    return `
      <button class="cast-pick-card${isSelected ? " is-selected" : ""}" type="button"
        data-character-id="${escapeAttribute(character.id)}"${isDisabled ? " disabled" : ""}>
        <img src="${escapeAttribute(character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="" loading="lazy">
        <span class="cast-pick-card__body">
          <span class="cast-pick-card__handle">${escapeHtml(formatHandle(character.handle) || "NO HANDLE")}</span>
          <h3>${escapeHtml(character.character_name || "名称未登録")}</h3>
          <span class="cast-pick-card__styles">${escapeHtml(styles)}</span>
          <span class="cast-pick-card__player">PL：${escapeHtml(character.player_name || "—")}</span>
        </span>
        ${isSelected ? `<span class="cast-pick-card__order">CAST ${String(selectedIndex + 1).padStart(2, "0")}</span>` : ""}
      </button>`;
  }).join("");
}

function handleLibraryClick(event) {
  const card = event.target.closest("[data-character-id]");
  if (!card) return;
  const character = publicCharacters.find(item => String(item.id) === card.dataset.characterId);
  if (!character) return;

  const selectedIndex = selectedCasts.findIndex(item => item.character.id === character.id);
  if (selectedIndex >= 0) selectedCasts.splice(selectedIndex, 1);
  else if (selectedCasts.length < MAX_CASTS) selectedCasts.push({ character, description: character.summary ?? "", quote: "" });

  invalidateGeneratedHtml();
  renderSelections();
}

function renderSelections() {
  elements.selectedCount.textContent = String(selectedCasts.length);
  renderPublicCharacters();
  if (!selectedCasts.length) {
    elements.selectedCasts.innerHTML = `<p class="empty-state">公開キャストから1～6名を選択してください。</p>`;
    return;
  }

  elements.selectedCasts.innerHTML = selectedCasts.map((item, index) => {
    const character = item.character;
    const styles = getStyles(character).map(style => `${style.name}${style.mark}`).join(" / ");
    return `
      <article class="selected-cast" data-selected-index="${index}">
        <img src="${escapeAttribute(character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="">
        <div class="selected-cast__identity">
          <p class="selected-cast__slot">CAST ${String(index + 1).padStart(2, "0")}</p>
          <h3>${escapeHtml(formatFullName(character))}</h3>
          <p>${escapeHtml(styles)}</p>
          <p>PL：${escapeHtml(character.player_name || "—")}</p>
        </div>
        <div class="selected-cast__fields">
          <label>キャッチコピー<input type="text" data-field="quote" value="${escapeAttribute(item.quote)}" placeholder="例：真実は、いつだって硝煙の向こうにある"></label>
          <label>紹介文<textarea data-field="description" rows="3">${escapeHtml(item.description)}</textarea></label>
        </div>
        <div class="selected-cast__actions">
          <button type="button" data-action="up" aria-label="上へ"${index === 0 ? " disabled" : ""}>↑</button>
          <button type="button" data-action="down" aria-label="下へ"${index === selectedCasts.length - 1 ? " disabled" : ""}>↓</button>
          <button type="button" class="remove" data-action="remove">削除</button>
        </div>
      </article>`;
  }).join("");
}

function handleSelectedCastClick(event) {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest("[data-selected-index]");
  if (!button || !row) return;
  const index = Number(row.dataset.selectedIndex);
  if (!Number.isInteger(index) || !selectedCasts[index]) return;

  if (button.dataset.action === "up" && index > 0) [selectedCasts[index - 1], selectedCasts[index]] = [selectedCasts[index], selectedCasts[index - 1]];
  else if (button.dataset.action === "down" && index < selectedCasts.length - 1) [selectedCasts[index], selectedCasts[index + 1]] = [selectedCasts[index + 1], selectedCasts[index]];
  else if (button.dataset.action === "remove") selectedCasts.splice(index, 1);
  else return;

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
  if (field.dataset.field === "description") item.description = field.value;
  invalidateGeneratedHtml();
}

async function generateShowcase() {
  try {
    if (!selectedCasts.length) throw new Error("公開キャストを1名以上選択してください。");
    if (selectedCasts.length > MAX_CASTS) throw new Error("キャストは最大6名までです。");
    setGeneratorStatus("HTMLを生成中…");
    const background = elements.backgroundUrl.value.trim() || await readFileAsDataUrl(elements.backgroundFile.files?.[0]);
    generatedHtml = renderShowcase({
      title: elements.pageTitle.value.trim() || "SESSION CAST FILE",
      sessionName: elements.sessionName.value.trim() || "トーキョーＮ◎ＶＡ セッション参加キャスト",
      rulerName: elements.rulerName.value.trim(),
      intro: elements.introText.value.trim(),
      background,
      casts: selectedCasts
    });
    elements.preview.srcdoc = generatedHtml;
    setOutputButtons(true);
    setGeneratorStatus("HTMLを生成しました。プレビューを確認してください。", "success");
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error.message || "HTML生成に失敗しました。", "error");
  }
}

function renderShowcase(data) {
  const backgroundStyle = data.background ? `background-image:linear-gradient(rgba(2,8,12,.58),rgba(2,8,12,.92)),url('${escapeCssUrl(data.background)}');` : "";
  const navigation = data.casts.map((item, index) => `<a href="#cast-${index + 1}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(item.character.character_name)}</a>`).join("");
  const cards = data.casts.map(createOutputCastCard).join("\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
:root{--cyan:#00efff;--pink:#ff54b5;--green:#61ffb1;--text:#edfbff;--muted:#89afb9}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;color:var(--text);font-family:"Noto Sans JP","Yu Gothic",sans-serif;background-color:#02080c;${backgroundStyle}background-size:cover;background-position:center top;background-attachment:fixed}body:before{position:fixed;inset:0;z-index:-1;content:"";background:linear-gradient(rgba(0,239,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,239,255,.035) 1px,transparent 1px);background-size:48px 48px}.wrap{width:min(1280px,calc(100% - 28px));margin:auto}.hero{min-height:55vh;display:grid;place-items:center;padding:70px 0 40px;text-align:center}.hero__code{margin:0;color:var(--green);font:700 .72rem/1 "Share Tech Mono",monospace;letter-spacing:.28em}.hero h1{margin:14px 0 0;font:900 clamp(2.5rem,8vw,6.8rem)/.88 Orbitron,sans-serif;letter-spacing:-.05em;text-shadow:0 0 32px rgba(0,239,255,.3)}.hero h1 span{display:block;color:var(--cyan);font-size:.42em;letter-spacing:.08em}.hero__session{margin:24px 0 0;color:#fff;font-size:clamp(1rem,2vw,1.35rem);font-weight:800}.hero__ruler{margin:9px 0 0;color:var(--pink);font:800 .78rem/1.4 "Share Tech Mono",monospace;letter-spacing:.16em}.hero__intro{max-width:800px;margin:22px auto 0;color:#b9d7de;line-height:1.9;white-space:pre-wrap}.cast-nav{position:sticky;top:0;z-index:20;padding:10px 0;overflow-x:auto;background:rgba(2,8,12,.9);backdrop-filter:blur(12px);border-top:1px solid rgba(0,239,255,.2);border-bottom:1px solid rgba(0,239,255,.2)}.cast-nav .wrap{display:flex;gap:8px}.cast-nav a{flex:0 0 auto;padding:8px 12px;border:1px solid rgba(0,239,255,.24);color:#bcecf3;text-decoration:none;font:700 .68rem/1 "Share Tech Mono",monospace}.cast-nav a span{margin-right:8px;color:var(--green)}.cast-list{display:grid;gap:34px;padding:42px 0 80px}.cast-card{position:relative;display:grid;grid-template-columns:minmax(250px,38%) minmax(0,1fr);min-height:520px;overflow:hidden;border:1px solid rgba(0,239,255,.3);background:linear-gradient(135deg,rgba(0,239,255,.06),transparent 35%),rgba(1,9,14,.92);box-shadow:0 22px 60px rgba(0,0,0,.32)}.cast-card:nth-child(even){grid-template-columns:minmax(0,1fr) minmax(250px,38%)}.cast-card:nth-child(even) .cast-card__image{order:2}.cast-card__image{position:relative;min-height:520px;overflow:hidden;background:#000}.cast-card__image img{width:100%;height:100%;object-fit:cover}.cast-card__image:after{position:absolute;inset:0;content:"";background:linear-gradient(90deg,transparent 70%,rgba(1,9,14,.9))}.cast-card:nth-child(even) .cast-card__image:after{background:linear-gradient(270deg,transparent 70%,rgba(1,9,14,.9))}.cast-card__body{display:grid;align-content:center;padding:clamp(28px,5vw,72px)}.cast-card__slot{margin:0;color:var(--green);font:800 .75rem/1 Orbitron,sans-serif;letter-spacing:.18em}.cast-card__reading{margin:28px 0 5px;color:#87aeb7;font:700 .72rem/1.4 "Share Tech Mono",monospace;letter-spacing:.1em}.cast-card h2{margin:0;color:#fff;font-size:clamp(2rem,5vw,4.8rem);line-height:1.02}.cast-card__styles{display:flex;flex-wrap:wrap;gap:7px;margin:18px 0 0}.style{padding:7px 10px;border:1px solid var(--style-color);color:var(--style-color);font:800 .72rem/1 "Share Tech Mono",monospace}.cast-card__meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:22px 0 0}.cast-card__meta div{padding:10px;border-left:2px solid rgba(0,239,255,.45);background:rgba(0,239,255,.035)}.cast-card__meta small{display:block;color:#6f98a1;font:700 .58rem/1 "Share Tech Mono",monospace}.cast-card__meta strong{display:block;margin-top:5px;color:#eefdff}.cast-card__quote{margin:24px 0 0;padding-left:16px;border-left:3px solid var(--pink);color:#ffd8eb;font-size:1.05rem;font-weight:800;line-height:1.7}.cast-card__description{margin:20px 0 0;color:#b8d4db;line-height:1.9;white-space:pre-wrap}.cast-card__link{display:inline-block;margin-top:24px;color:var(--cyan);font:800 .7rem/1 "Share Tech Mono",monospace;letter-spacing:.1em}.footer{padding:24px 0 50px;border-top:1px solid rgba(0,239,255,.18);color:#668b94;font:600 .65rem/1.7 "Share Tech Mono",monospace;text-align:center}@media(max-width:760px){body{background-attachment:scroll}.hero{min-height:auto;padding:56px 0}.cast-card,.cast-card:nth-child(even){grid-template-columns:1fr}.cast-card:nth-child(even) .cast-card__image{order:0}.cast-card__image{min-height:420px}.cast-card__image:after,.cast-card:nth-child(even) .cast-card__image:after{background:linear-gradient(180deg,transparent 68%,rgba(1,9,14,.94))}.cast-card__body{padding:26px}.cast-card__meta{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="hero wrap"><div><p class="hero__code">N◎VA MUNICIPAL DATABASE // SESSION ARCHIVE</p><h1>${escapeHtml(data.title)}<span>CAST SHOWCASE</span></h1><p class="hero__session">${escapeHtml(data.sessionName)}</p>${data.rulerName ? `<p class="hero__ruler">RULER：${escapeHtml(data.rulerName)}</p>` : ""}${data.intro ? `<p class="hero__intro">${escapeHtml(data.intro)}</p>` : ""}</div></header>
<nav class="cast-nav"><div class="wrap">${navigation}</div></nav>
<main class="cast-list wrap">${cards}</main>
<footer class="footer wrap">「トーキョーN◎VA THE AXLERATION」は有限会社ファーイースト・アミューズメント・リサーチの著作物です。</footer>
</body>
</html>`;
}

function createOutputCastCard(item, index) {
  const character = item.character;
  const styles = getStyles(character).map(style => {
    const color = STYLE_COLORS.get(style.name) || "#00efff";
    return `<span class="style" style="--style-color:${escapeAttribute(color)}">${escapeHtml(`${style.name}${style.mark}`)}</span>`;
  }).join("");
  const reading = formatReading(character);
  const publicUrl = new URL(`./cast.html?id=${encodeURIComponent(character.public_id)}`, location.href).href;
  return `
<section class="cast-card" id="cast-${index + 1}">
  <div class="cast-card__image"><img src="${escapeAttribute(character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="${escapeAttribute(character.character_name || "")}"></div>
  <div class="cast-card__body">
    <p class="cast-card__slot">CAST ${String(index + 1).padStart(2, "0")} // ${escapeHtml(character.public_id || "NO ID")}</p>
    ${reading ? `<p class="cast-card__reading">${escapeHtml(reading)}</p>` : ""}
    <h2>${escapeHtml(formatFullName(character))}</h2>
    <div class="cast-card__styles">${styles}</div>
    <div class="cast-card__meta"><div><small>PLAYER</small><strong>${escapeHtml(character.player_name || "—")}</strong></div><div><small>AFFILIATION</small><strong>${escapeHtml(character.affiliation || "—")}</strong></div><div><small>AGE</small><strong>${escapeHtml(character.age || "—")}</strong></div><div><small>GENDER / ID</small><strong>${escapeHtml([character.gender, character.citizen_rank].filter(Boolean).join(" / ") || "—")}</strong></div></div>
    ${item.quote.trim() ? `<p class="cast-card__quote">“${escapeHtml(item.quote.trim())}”</p>` : ""}
    ${item.description.trim() ? `<p class="cast-card__description">${escapeHtml(item.description.trim())}</p>` : ""}
    <a class="cast-card__link" href="${escapeAttribute(publicUrl)}" target="_blank" rel="noopener">OPEN CAST DATABASE →</a>
  </div>
</section>`;
}

function downloadShowcase() {
  if (!generatedHtml) return;
  const slug = normalizeSlug(elements.publishSlug.value) || "session-showcase";
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

async function publishShowcase() {
  try {
    if (!generatedHtml) throw new Error("先にHTMLを生成してください。");
    const slug = normalizeSlug(elements.publishSlug.value);
    if (!slug) throw new Error("公開ファイル名を半角英数字とハイフンで入力してください。");

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error("ログイン情報を確認できません。再ログインしてください。");

    setGeneratorStatus("Edge Functionを通じてGitHubへ公開中…");
    elements.publishButton.disabled = true;
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: { slug, sessionName: elements.sessionName.value.trim() || slug, html: generatedHtml }
    });
    if (error) throw new Error(await extractFunctionError(error));
    if (!data?.publicUrl) throw new Error("公開URLを取得できませんでした。");

    setGeneratorStatus(`公開処理が完了しました。GitHub Pagesへの反映には少し時間がかかる場合があります。 <a href="${escapeAttribute(data.publicUrl)}" target="_blank" rel="noopener">公開ページを開く</a>`, "success", true);
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error.message || "GitHubへの公開に失敗しました。", "error");
  } finally {
    elements.publishButton.disabled = !generatedHtml;
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

function invalidateGeneratedHtml() {
  if (!generatedHtml) return;
  generatedHtml = "";
  elements.preview.removeAttribute("srcdoc");
  setOutputButtons(false);
  setGeneratorStatus("選択内容が変更されました。HTMLを再生成してください。");
}

function setOutputButtons(enabled) {
  elements.downloadButton.disabled = !enabled;
  elements.copyButton.disabled = !enabled;
  elements.publishButton.disabled = !enabled;
}

function suggestSlug() {
  if (elements.publishSlug.dataset.edited === "true") return;
  const suggested = normalizeSlug(elements.sessionName.value);
  if (suggested) elements.publishSlug.value = suggested;
}

elements.publishSlug?.addEventListener("input", () => { elements.publishSlug.dataset.edited = "true"; });

function setLibraryStatus(message, state = "") {
  elements.libraryStatus.textContent = message;
  elements.libraryStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function setGeneratorStatus(message, state = "", allowHtml = false) {
  if (allowHtml) elements.generatorStatus.innerHTML = message;
  else elements.generatorStatus.textContent = message;
  elements.generatorStatus.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function getStyles(character) {
  return [
    { name: character.style_1, mark: character.style_1_mark },
    { name: character.style_2, mark: character.style_2_mark },
    { name: character.style_3, mark: character.style_3_mark }
  ].filter(item => item.name);
}

function getStyleNames(character) { return getStyles(character).map(item => item.name); }
function formatHandle(handle) { const value = String(handle ?? "").trim(); return value ? `“${value}”` : ""; }
function formatFullName(character) { return [formatHandle(character.handle), character.character_name].filter(Boolean).join(" "); }
function formatReading(character) { const handleKana = String(character.handle_kana ?? "").trim(); const nameKana = String(character.character_kana ?? "").trim(); return [handleKana ? `“${handleKana}”` : "", nameKana].filter(Boolean).join(" "); }
function normalizeSearch(value) { return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, " ").trim(); }
function normalizeSlug(value) { return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64); }
function localeCompareJa(a, b) { return String(a ?? "").localeCompare(String(b ?? ""), "ja", { sensitivity: "base", numeric: true }); }
function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { if (!file) return resolve(""); const reader = new FileReader(); reader.onload = () => resolve(String(reader.result ?? "")); reader.onerror = () => reject(reader.error || new Error("背景画像を読み込めませんでした。")); reader.readAsDataURL(file); }); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function escapeAttribute(value) { return escapeHtml(value); }
function escapeCssUrl(value) { return String(value ?? "").replace(/[\\'\n\r)]/g, character => `\\${character}`); }
