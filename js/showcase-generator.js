import { supabase } from "./supabase-client.js";

const MAX_CASTS = 6;
const REPOSITORY = "inarin14311431/tnx_cast_list";
const BRANCH = "main";
const OUTPUT_DIRECTORY = "showcases";

const STYLE_COLORS = new Map([
  ["カブキ","#ff3b6b"],["バサラ","#7d3bff"],["タタラ","#3b6cff"],["ミストレス","#ff5cc8"],
  ["カブト","#3dffa1"],["カリスマ","#ffd23b"],["マネキン","#ffb93b"],["カゼ","#29c7ff"],
  ["フェイト","#ffe66b"],["クロマク","#8a6cff"],["エグゼク","#ff8a3b"],["カタナ","#3bffa4"],
  ["クグツ","#c83bff"],["カゲ","#6f7cff"],["チャクラ","#3bff8a"],["レッガー","#ffb13b"],
  ["カブトワリ","#ff3b9b"],["ハイランダー","#9aff3b"],["マヤカシ","#3bffd5"],["トーキー","#ff6f3b"],
  ["イヌ","#ff4f3b"],["ニューロ","#3bffe1"],["コモン","#b8ff3b"],["ヒルコ","#ff3bd5"],
  ["クロガネ","#a1a8ff"],["イブキ","#45ffcc"],["シキガミ","#ff5cc8"],["アラシ","#ff7a3b"],
  ["カゲムシャ","#9b3bff"],["ミギウデ","#ffcf3b"],["エトランゼ","#9aff3b"],["アヤカシ","#3bffd5"],
  ["ウツワ","#ffffff"]
]);

const elements = {
  pageTitle: document.querySelector("#page-title"),
  sessionName: document.querySelector("#session-name"),
  rulerName: document.querySelector("#ruler-name"),
  introText: document.querySelector("#intro-text"),
  backgroundUrl: document.querySelector("#background-url"),
  backgroundFile: document.querySelector("#background-file"),
  publishSlug: document.querySelector("#publish-slug"),
  githubToken: document.querySelector("#github-token"),
  search: document.querySelector("#cast-search"),
  playerFilter: document.querySelector("#player-filter"),
  styleFilter: document.querySelector("#style-filter"),
  selectedCount: document.querySelector("#selected-count"),
  libraryStatus: document.querySelector("#library-status"),
  publicGrid: document.querySelector("#public-cast-grid"),
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
  bindEvents();
  await loadPublicCharacters();
}

function bindEvents() {
  elements.search?.addEventListener("input", renderPublicCharacters);
  elements.playerFilter?.addEventListener("change", renderPublicCharacters);
  elements.styleFilter?.addEventListener("change", renderPublicCharacters);
  elements.publicGrid?.addEventListener("click", handleLibraryClick);
  elements.selectedCasts?.addEventListener("click", handleSelectedAction);
  elements.selectedCasts?.addEventListener("input", handleSelectedInput);
  elements.generateButton?.addEventListener("click", generateShowcase);
  elements.downloadButton?.addEventListener("click", downloadShowcase);
  elements.copyButton?.addEventListener("click", copyShowcase);
  elements.publishButton?.addEventListener("click", publishShowcase);
  elements.sessionName?.addEventListener("input", suggestSlug);
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
  const players = [...new Set(publicCharacters.map(character => character.player_name).filter(Boolean))]
    .sort(localeCompareJa);
  const styles = [...new Set(publicCharacters.flatMap(getStyleNames))]
    .sort(localeCompareJa);

  elements.playerFilter.innerHTML =
    `<option value="">すべて</option>${players.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
  elements.styleFilter.innerHTML =
    `<option value="">すべて</option>${styles.map(value => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}`;
}

function renderPublicCharacters() {
  const keyword = normalizeSearch(elements.search?.value);
  const player = elements.playerFilter?.value ?? "";
  const style = elements.styleFilter?.value ?? "";
  const selectedIds = new Set(selectedCasts.map(item => item.character.id));

  const filtered = publicCharacters.filter(character => {
    const searchable = normalizeSearch([
      character.public_id,
      character.character_name,
      character.character_kana,
      character.handle,
      character.handle_kana,
      character.player_name,
      character.affiliation,
      character.summary,
      ...getStyleNames(character)
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
    const styles = getStyles(character).map(styleItem => `${styleItem.name}${styleItem.mark}`).join(" / ");
    return `
      <button class="cast-pick-card${isSelected ? " is-selected" : ""}" type="button"
        data-character-id="${escapeAttribute(character.id)}"${isDisabled ? " disabled" : ""}>
        <img src="${escapeAttribute(character.image_url || "./assets/placeholders/scan-failed.webp")}"
          alt="" loading="lazy">
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
  if (selectedIndex >= 0) {
    selectedCasts.splice(selectedIndex, 1);
  } else if (selectedCasts.length < MAX_CASTS) {
    selectedCasts.push({
      character,
      description: character.summary ?? "",
      quote: ""
    });
  }

  invalidateGeneratedHtml();
  renderSelectedCasts();
  renderPublicCharacters();
}

function renderSelectedCasts() {
  elements.selectedCount.textContent = String(selectedCasts.length);

  if (!selectedCasts.length) {
    elements.selectedCasts.innerHTML = `<p class="empty-state">公開キャストから1～6名を選択してください。</p>`;
    return;
  }

  elements.selectedCasts.innerHTML = selectedCasts.map((item, index) => {
    const character = item.character;
    const displayName = formatDisplayName(character);
    const styles = getStyles(character).map(styleItem => `${styleItem.name}${styleItem.mark}`).join(" / ");
    return `
      <article class="selected-cast" data-selected-index="${index}">
        <img src="${escapeAttribute(character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="">
        <div class="selected-cast__identity">
          <p class="selected-cast__slot">CAST ${String(index + 1).padStart(2, "0")}</p>
          <h3>${escapeHtml(displayName)}</h3>
          <p>${escapeHtml(styles)}</p>
          <p>PL：${escapeHtml(character.player_name || "—")}</p>
        </div>
        <div class="selected-cast__fields">
          <label>キャッチコピー／台詞
            <input class="selected-quote" type="text" value="${escapeAttribute(item.quote)}"
              placeholder="任意">
          </label>
          <label>紹介文
            <textarea class="selected-description" rows="3">${escapeHtml(item.description)}</textarea>
          </label>
        </div>
        <div class="selected-cast__actions">
          <button type="button" data-action="up" title="上へ" ${index === 0 ? "disabled" : ""}>▲</button>
          <button type="button" data-action="down" title="下へ" ${index === selectedCasts.length - 1 ? "disabled" : ""}>▼</button>
          <button class="remove" type="button" data-action="remove">選択解除</button>
        </div>
      </article>`;
  }).join("");
}

function handleSelectedAction(event) {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest("[data-selected-index]");
  if (!button || !row) return;
  const index = Number(row.dataset.selectedIndex);
  if (!Number.isInteger(index) || !selectedCasts[index]) return;

  switch (button.dataset.action) {
    case "up":
      if (index > 0) [selectedCasts[index - 1], selectedCasts[index]] = [selectedCasts[index], selectedCasts[index - 1]];
      break;
    case "down":
      if (index < selectedCasts.length - 1) [selectedCasts[index], selectedCasts[index + 1]] = [selectedCasts[index + 1], selectedCasts[index]];
      break;
    case "remove":
      selectedCasts.splice(index, 1);
      break;
  }

  invalidateGeneratedHtml();
  renderSelectedCasts();
  renderPublicCharacters();
}

function handleSelectedInput(event) {
  const row = event.target.closest("[data-selected-index]");
  if (!row) return;
  const item = selectedCasts[Number(row.dataset.selectedIndex)];
  if (!item) return;
  if (event.target.matches(".selected-quote")) item.quote = event.target.value;
  if (event.target.matches(".selected-description")) item.description = event.target.value;
  invalidateGeneratedHtml();
}

async function generateShowcase() {
  try {
    if (selectedCasts.length < 1 || selectedCasts.length > MAX_CASTS) {
      throw new Error("公開キャストを1～6名選択してください。");
    }
    setGeneratorStatus("HTMLを生成中…");
    const background = elements.backgroundUrl.value.trim() ||
      await readFileAsDataUrl(elements.backgroundFile.files?.[0]);
    generatedHtml = renderShowcaseHtml({
      title: elements.pageTitle.value.trim() || "SESSION CAST FILE",
      sessionName: elements.sessionName.value.trim() || "トーキョーＮ◎ＶＡ セッション参加キャスト",
      rulerName: elements.rulerName.value.trim(),
      intro: elements.introText.value.trim(),
      background,
      casts: selectedCasts
    });
    elements.preview.srcdoc = generatedHtml;
    setOutputButtons(true);
    setGeneratorStatus("HTMLを生成しました。プレビュー、ダウンロード、コピー、公開が利用できます。", "success");
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error.message || "HTML生成に失敗しました。", "error");
  }
}

function renderShowcaseHtml(data) {
  const cards = data.casts.map((item, index) => renderCastCard(item, index)).join("\n");
  const navigation = data.casts.map((item, index) =>
    `<a href="#cast-${index + 1}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(item.character.character_name)}</a>`
  ).join("");
  const backgroundRule = data.background
    ? `background-image:linear-gradient(rgba(3,5,18,.46),rgba(3,5,18,.9)),url(${JSON.stringify(data.background)});`
    : "";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
:root{--cyan:#00efff;--magenta:#ff3da8;--green:#5dffad;--yellow:#ffe66b;--text:#edfaff;--muted:#89afbd}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;color:var(--text);font-family:"Noto Sans JP","Yu Gothic",system-ui,sans-serif;background-color:#050315;${backgroundRule}background-size:cover;background-position:center top;background-attachment:fixed;overflow-x:hidden}
body::before{position:fixed;inset:0;z-index:-1;content:"";background:radial-gradient(circle at 78% 12%,rgba(0,239,255,.15),transparent 30%),radial-gradient(circle at 16% 72%,rgba(255,61,168,.11),transparent 34%),repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px)}
body::after{position:fixed;inset:0;z-index:20;content:"";pointer-events:none;background:linear-gradient(rgba(0,239,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,239,255,.07) 1px,transparent 1px);background-size:80px 80px;mask-image:radial-gradient(circle,black,transparent 82%);opacity:.5}
.binary{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;opacity:.22}.binary span{position:absolute;top:-120vh;writing-mode:vertical-rl;color:var(--cyan);font:700 10px/1 "Share Tech Mono",monospace;text-shadow:0 0 8px currentColor;animation:fall linear infinite}@keyframes fall{to{transform:translateY(240vh)}}
.page{position:relative;z-index:2;width:min(1320px,calc(100% - 28px));margin:0 auto}.hero{min-height:52vh;display:grid;place-items:center;padding:70px 0 42px;text-align:center}.kicker{margin:0;color:var(--cyan);font:700 .72rem/1.4 "Share Tech Mono",monospace;letter-spacing:.32em}.hero h1{margin:18px 0 0;font:900 clamp(2.2rem,7vw,6.5rem)/.88 Orbitron,sans-serif;letter-spacing:-.04em;text-transform:uppercase;text-shadow:0 0 32px rgba(0,239,255,.38)}.hero h1 span{display:block;color:transparent;background:linear-gradient(90deg,var(--magenta),#8d6cff 42%,var(--cyan),var(--green));background-clip:text}.ruler{margin:22px 0 0;color:#fff;font:800 clamp(.9rem,2vw,1.25rem)/1.3 Orbitron,sans-serif;letter-spacing:.18em}.ruler strong{color:var(--yellow)}.intro{max-width:820px;margin:20px auto 0;color:#b9dce7;line-height:1.9;white-space:pre-wrap}
.cast-nav{position:sticky;top:0;z-index:15;display:flex;gap:8px;padding:10px;margin-bottom:26px;overflow-x:auto;border:1px solid rgba(0,239,255,.25);background:rgba(3,5,18,.88);backdrop-filter:blur(13px)}.cast-nav a{min-width:max-content;padding:8px 11px;color:#bceaf2;border:1px solid rgba(0,239,255,.18);font:700 .67rem/1 "Share Tech Mono",monospace;text-decoration:none}.cast-nav a span{margin-right:7px;color:var(--green)}
.cast-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;padding-bottom:72px}.cast-card{--accent:var(--cyan);position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent) 56%,transparent);border-left:4px solid var(--accent);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,transparent),rgba(4,7,20,.94) 46%);box-shadow:0 22px 60px rgba(0,0,0,.3),inset 0 0 32px rgba(0,0,0,.25)}.cast-card::before{position:absolute;right:12px;top:9px;content:attr(data-slot);color:color-mix(in srgb,var(--accent) 72%,white 20%);font:800 .62rem/1 "Share Tech Mono",monospace;letter-spacing:.15em}.cast-card>a{display:grid;grid-template-columns:minmax(180px,38%) minmax(0,1fr);min-height:410px;color:inherit;text-decoration:none}.visual{position:relative;min-height:410px;overflow:hidden;background:#02040a}.visual img{width:100%;height:100%;object-fit:cover;object-position:center top;transition:transform .45s ease,filter .45s ease}.visual::after{position:absolute;inset:0;content:"";background:linear-gradient(180deg,transparent 58%,rgba(3,5,18,.92));pointer-events:none}.cast-card:hover .visual img{transform:scale(1.025);filter:saturate(1.08)}.profile{min-width:0;padding:34px 26px 25px}.reading{margin:0;color:color-mix(in srgb,var(--accent) 76%,white 20%);font:700 .72rem/1.4 "Share Tech Mono",monospace;letter-spacing:.08em}.profile h2{margin:8px 0 0;color:#fff;font-size:clamp(1.5rem,3vw,2.5rem);line-height:1.12;overflow-wrap:anywhere}.styles{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.styles span{padding:5px 8px;border:1px solid color-mix(in srgb,var(--chip) 60%,transparent);color:color-mix(in srgb,var(--chip) 70%,white 30%);background:color-mix(in srgb,var(--chip) 9%,transparent);font:800 .66rem/1 "Share Tech Mono",monospace}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:18px}.meta div{padding:8px 9px;border-left:2px solid color-mix(in srgb,var(--accent) 54%,transparent);background:rgba(255,255,255,.025)}.meta small{display:block;color:#7398a4;font:700 .58rem/1 "Share Tech Mono",monospace;letter-spacing:.11em}.meta strong{display:block;margin-top:5px;color:#eafdff;font-size:.78rem;overflow-wrap:anywhere}.description{margin:19px 0 0;color:#b8d2da;line-height:1.75;white-space:pre-wrap}.quote{margin:18px 0 0;padding:12px 14px;border-left:2px solid var(--accent);color:#fff;background:rgba(0,0,0,.2);font-weight:800;line-height:1.6}.footer{padding:26px 0 50px;border-top:1px solid rgba(0,239,255,.16);color:#668c98;text-align:center;font:700 .62rem/1.6 "Share Tech Mono",monospace}
@media(max-width:900px){.cast-grid{grid-template-columns:1fr}.cast-card>a{grid-template-columns:minmax(150px,34%) minmax(0,1fr)}}
@media(max-width:620px){.hero{min-height:42vh}.cast-card>a{grid-template-columns:1fr}.visual{min-height:340px;max-height:62vh}.profile{padding:24px 18px}.meta{grid-template-columns:1fr}.binary{display:none}}
@media(prefers-reduced-motion:reduce){.binary span{animation:none}.visual img{transition:none}}
</style>
</head>
<body>
<div class="binary" id="binary"></div>
<main class="page">
  <header class="hero">
    <div>
      <p class="kicker">N◎VA SESSION CAST DATABASE</p>
      <h1>${escapeHtml(data.title)}<span>${escapeHtml(data.sessionName)}</span></h1>
      ${data.rulerName ? `<p class="ruler">RULER：<strong>${escapeHtml(data.rulerName)}</strong></p>` : ""}
      ${data.intro ? `<p class="intro">${escapeHtml(data.intro)}</p>` : ""}
    </div>
  </header>
  <nav class="cast-nav">${navigation}</nav>
  <section class="cast-grid">${cards}</section>
  <footer class="footer">「トーキョーN◎VA THE AXLERATION」は有限会社ファーイースト・アミューズメント・リサーチの著作物です。</footer>
</main>
<script>
const layer=document.querySelector("#binary");
for(let i=0;i<22;i++){
  const node=document.createElement("span");
  node.textContent=Array.from({length:80},()=>Math.random()>.5?"1":"0").join("");
  node.style.left=(Math.random()*100)+"%";
  node.style.animationDuration=(8+Math.random()*13)+"s";
  node.style.animationDelay=(-Math.random()*18)+"s";
  layer.append(node);
}
<\/script>
</body>
</html>`;
}

function renderCastCard(item, index) {
  const character = item.character;
  const styles = getStyles(character);
  const accent = STYLE_COLORS.get(styles[0]?.name) || "#00efff";
  const displayName = formatDisplayName(character);
  const reading = formatReading(character);
  const castUrl = new URL(`./cast.html?id=${encodeURIComponent(character.public_id)}`, location.href).href;
  const styleChips = styles.map(styleItem =>
    `<span style="--chip:${STYLE_COLORS.get(styleItem.name) || "#00efff"}">${escapeHtml(styleItem.name + styleItem.mark)}</span>`
  ).join("");
  const image = character.image_url || new URL("./assets/placeholders/scan-failed.webp", location.href).href;

  return `<article id="cast-${index + 1}" class="cast-card" data-slot="CAST ${String(index + 1).padStart(2, "0")}" style="--accent:${accent}">
    <a href="${escapeAttribute(castUrl)}" target="_blank" rel="noopener">
      <div class="visual"><img src="${escapeAttribute(image)}" alt="${escapeAttribute(displayName)}"></div>
      <div class="profile">
        ${reading ? `<p class="reading">${escapeHtml(reading)}</p>` : ""}
        <h2>${escapeHtml(displayName)}</h2>
        <div class="styles">${styleChips}</div>
        <div class="meta">
          <div><small>PLAYER</small><strong>${escapeHtml(character.player_name || "—")}</strong></div>
          <div><small>IDENTITY</small><strong>${escapeHtml(character.citizen_rank || "—")}</strong></div>
          <div><small>AGE / GENDER</small><strong>${escapeHtml([character.age, character.gender].filter(Boolean).join(" / ") || "—")}</strong></div>
          <div><small>AFFILIATION</small><strong>${escapeHtml(character.affiliation || "—")}</strong></div>
        </div>
        ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
        ${item.quote ? `<p class="quote">${escapeHtml(item.quote)}</p>` : ""}
      </div>
    </a>
  </article>`;
}

function downloadShowcase() {
  if (!generatedHtml) return;
  const slug = normalizeSlug(elements.publishSlug.value) || "session-cast-showcase";
  const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}.html`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyShowcase() {
  if (!generatedHtml) return;
  try {
    await navigator.clipboard.writeText(generatedHtml);
    setGeneratorStatus("生成HTMLをクリップボードへコピーしました。", "success");
  } catch (error) {
    console.error(error);
    setGeneratorStatus("クリップボードへコピーできませんでした。", "error");
  }
}

async function publishShowcase() {
  try {
    if (!generatedHtml) throw new Error("先にHTMLを生成してください。");
    const token = elements.githubToken.value.trim();
    if (!token) throw new Error("GitHub Fine-grained Tokenを入力してください。");
    const slug = normalizeSlug(elements.publishSlug.value);
    if (!slug) throw new Error("公開ファイル名を入力してください。");

    setGeneratorStatus("GitHubへHTMLを送信中…");
    elements.publishButton.disabled = true;

    const path = `${OUTPUT_DIRECTORY}/${slug}.html`;
    const apiPath = path.split("/").map(encodeURIComponent).join("/");
    const endpoint = `https://api.github.com/repos/${REPOSITORY}/contents/${apiPath}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };

    let sha = "";
    const existing = await fetch(`${endpoint}?ref=${encodeURIComponent(BRANCH)}`, { headers });
    if (existing.ok) {
      const metadata = await existing.json();
      sha = metadata.sha || "";
    } else if (existing.status !== 404) {
      throw new Error(await githubError(existing));
    }

    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Publish session showcase: ${elements.sessionName.value.trim() || slug}`,
        content: encodeBase64Utf8(generatedHtml),
        branch: BRANCH,
        ...(sha ? { sha } : {})
      })
    });

    if (!response.ok) throw new Error(await githubError(response));

    const publicUrl = new URL(`./${OUTPUT_DIRECTORY}/${encodeURIComponent(slug)}.html`, location.href).href;
    setGeneratorStatus(
      `公開処理が完了しました。GitHub Pagesへの反映には少し時間がかかる場合があります。 <a href="${escapeAttribute(publicUrl)}" target="_blank" rel="noopener">公開ページを開く</a>`,
      "success",
      true
    );
  } catch (error) {
    console.error(error);
    setGeneratorStatus(error.message || "GitHubへの公開に失敗しました。", "error");
  } finally {
    elements.publishButton.disabled = !generatedHtml;
  }
}

function invalidateGeneratedHtml() {
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
elements.publishSlug?.addEventListener("input", () => {
  elements.publishSlug.dataset.edited = "true";
});

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
    { name: character.style_1, mark: character.style_1_mark || "" },
    { name: character.style_2, mark: character.style_2_mark || "" },
    { name: character.style_3, mark: character.style_3_mark || "" }
  ].filter(item => item.name);
}

function getStyleNames(character) {
  return getStyles(character).map(item => item.name);
}

function formatHandle(value) {
  const handle = String(value || "").trim();
  return handle ? `“${handle}”` : "";
}

function formatDisplayName(character) {
  return [formatHandle(character.handle), character.character_name].filter(Boolean).join(" ");
}

function formatReading(character) {
  const handleKana = String(character.handle_kana || "").trim();
  const nameKana = String(character.character_kana || "").trim();
  return [handleKana ? `“${handleKana}”` : "", nameKana].filter(Boolean).join(" ");
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, " ").trim();
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
}

function localeCompareJa(a, b) {
  return String(a || "").localeCompare(String(b || ""), "ja", { numeric: true, sensitivity: "base" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("画像ファイルを読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function githubError(response) {
  try {
    const data = await response.json();
    return data.message || `GitHub API error: ${response.status}`;
  } catch {
    return `GitHub API error: ${response.status}`;
  }
}
