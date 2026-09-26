import { escapeHtml } from "./dom-escape.js";
import { getCharacter } from "./cast-data-store.js";
import { getImageFocusX, getImageFocusY, getImageZoom } from "./image-focus.js?v=3";

const FALLBACK_THEMES = {
  nova: {
    label: "Neon Grid",
    background: "#030711",
    surface: "#0b1424",
    accent: "#70eaff",
    accent2: "#9a78ff",
    text: "#ffffff",
    muted: "#aebbd0",
    pattern: "grid"
  },
  noir: {
    label: "Noir Trace",
    background: "#090a0e",
    surface: "#17151a",
    accent: "#ff6b8b",
    accent2: "#ffbd68",
    text: "#fff6f7",
    muted: "#c4aeb5",
    pattern: "diagonal"
  },
  orbital: {
    label: "Orbit Signal",
    background: "#07101c",
    surface: "#101d31",
    accent: "#b6a2ff",
    accent2: "#63d9ff",
    text: "#f2f4ff",
    muted: "#b0b7d0",
    pattern: "orbit"
  }
};

let dialog;
let preview;
let character;
let imageDataUrl = "";

const PAGE = document.body?.dataset.page;
if (PAGE === "cast.html") initialize();

function initialize() {
  const exportActions = document.querySelector(".cast-header__export-actions");
  if (!exportActions || document.querySelector("#sns-card-export-button")) return;

  const button = document.createElement("button");
  button.id = "sns-card-export-button";
  button.className = "sns-card-export-button";
  button.type = "button";
  button.innerHTML = "<span>SNS紹介</span><small>SNS CARD</small>";
  exportActions.append(button);
  button.addEventListener("click", openDialog);
  ensureDialog();
}

function ensureDialog() {
  if (dialog) return;
  dialog = document.createElement("dialog");
  dialog.className = "cast-sns-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="cast-sns-dialog__panel">
      <header class="cast-sns-dialog__header">
        <div><strong>SNS紹介カード</strong><small>SNS CAST CARD EXPORT</small></div>
        <button type="submit" class="cast-sns-dialog__close" aria-label="閉じる">×</button>
      </header>
      <div class="cast-sns-dialog__body">
        <div class="cast-sns-dialog__preview-wrap"><img class="cast-sns-dialog__preview" alt="SNS紹介カードプレビュー"></div>
        <div class="cast-sns-dialog__controls">
          <label>テーマ <select data-sns-theme>
            <option value="nova">現在の画面テーマ</option>
          </select></label>
          <p class="cast-sns-dialog__note">1200×630px / PNG</p>
          <button type="button" class="cast-sns-dialog__download" data-sns-download><span>PNGをダウンロード</span><small>DOWNLOAD PNG</small></button>
        </div>
      </div>
    </form>`;
 document.body.append(dialog);
 preview = dialog.querySelector(".cast-sns-dialog__preview");
  populateThemeOptions();
  dialog.querySelector("[data-sns-theme]").addEventListener("change", renderPreview);
  dialog.querySelector("[data-sns-download]").addEventListener("click", downloadCard);
}

async function openDialog() {
  ensureDialog();
  dialog.querySelector("[data-sns-theme]").value = globalThis.TNX_THEME?.current?.() || document.documentElement.dataset.theme || "nova";
  if (!dialog.open) dialog.showModal();
  preview.alt = "SNS紹介カードを生成中";
  try {
    character = await getCharacter();
    if (!character) throw new Error("キャストデータを取得できませんでした。");
    const thumbnailUrl = character.image_thumbnail_url || "";
    try {
      imageDataUrl = await readImageAsDataUrl(thumbnailUrl || character.image_url);
    } catch (error) {
      if (!thumbnailUrl || !character.image_url || thumbnailUrl === character.image_url) throw error;
      imageDataUrl = await readImageAsDataUrl(character.image_url);
    }
    await renderPreview();
  } catch (error) {
    console.error(error);
    preview.removeAttribute("src");
    preview.alt = error.message || "SNS紹介カードを生成できませんでした。";
  }
}

async function readImageAsDataUrl(url) {
  const source = String(url || "").split("#")[0];
  if (!source) return "";
  const response = await fetch(source, { mode: "cors" });
  if (!response.ok) throw new Error("キャスト画像を取得できませんでした。");
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("キャスト画像の読み込みに失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

async function renderPreview() {
  if (!character || !preview) return;
  const themeId = dialog.querySelector("[data-sns-theme]").value;
  const svg = createCardSvg(character, resolveTheme(themeId), imageDataUrl);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    preview.src = url;
    await new Promise((resolve, reject) => {
      preview.onload = resolve;
      preview.onerror = reject;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function downloadCard() {
  if (!character || !preview?.src) return;
  const themeId = dialog.querySelector("[data-sns-theme]").value;
  const svg = createCardSvg(character, resolveTheme(themeId), imageDataUrl);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    canvas.getContext("2d").drawImage(image, 0, 0, 1200, 630);
    const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("PNGを生成できませんでした。");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(png);
    link.download = `${character.public_id || "cast"}-sns-card.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error) {
    console.error(error);
    window.alert(error.message || "PNGの生成に失敗しました。");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function resolveTheme(themeId) {
  const currentThemeId = globalThis.TNX_THEME?.current?.() || document.documentElement.dataset.theme || "nova";
  const selectedThemeId = themeId === "site" ? currentThemeId : themeId;
  const registry = globalThis.TNX_THEME_REGISTRY;
  if (registry?.has?.(selectedThemeId)) return readThemeTokens(selectedThemeId);
  return FALLBACK_THEMES[selectedThemeId] || FALLBACK_THEMES.nova;
}

function populateThemeOptions() {
  const select = dialog?.querySelector("[data-sns-theme]");
  const registry = globalThis.TNX_THEME_REGISTRY;
  if (!select || !registry?.themes?.length) return;
  const current = globalThis.TNX_THEME?.current?.() || document.documentElement.dataset.theme || registry.defaultId;
  select.replaceChildren();
  registry.themes.forEach(theme => {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.id === current ? `現在の画面テーマ：${theme.label}` : theme.label;
    select.append(option);
  });
  select.value = current;
}

function readThemeTokens(themeId) {
  const root = document.documentElement;
  const previousTheme = root.dataset.theme;
  const previousColorScheme = root.style.colorScheme;
  const definition = globalThis.TNX_THEME_REGISTRY?.get?.(themeId);
  root.dataset.theme = themeId;
  if (definition?.colorScheme) root.style.colorScheme = definition.colorScheme;
  const tokens = getComputedStyle(root);
  const accent = token(tokens, "--color-accent", "#70eaff");
  const accent2 = token(tokens, "--color-accent-strong", token(tokens, "--color-feature", "#9a78ff"));
  const feature = token(tokens, "--color-feature", accent2);
  const danger = token(tokens, "--color-danger", accent);
  const theme = {
    id: themeId,
    label: definition?.label || themeId,
    background: token(tokens, "--color-bg", "#05080b"),
    surface: token(tokens, "--color-surface", "#0b1424"),
    surfaceAlt: token(tokens, "--color-surface-alt", "#14243b"),
    text: token(tokens, "--color-text", "#ffffff"),
    muted: token(tokens, "--color-muted", "#aebbd0"),
    accent,
    accent2,
    feature,
    danger,
    border: token(tokens, "--color-border", token(tokens, "--color-border-muted", "#53647a")),
    palette: themePalette(themeId, { accent, accent2, feature, danger }),
    pattern: themePattern(themeId)
  };
  if (previousTheme) root.dataset.theme = previousTheme;
  else delete root.dataset.theme;
  root.style.colorScheme = previousColorScheme;
  return theme;
}

function token(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function themePalette(themeId, colors) {
  if (themeId === "spectrum-neon") return ["#ff4775", "#ff9a4f", "#ffe66b", "#55ff9a", "#55f6ff", "#7895ff", "#dc74ff"];
  if (themeId === "japanese-army") return [colors.accent, "#d44738", colors.muted];
  if (themeId === "statistics-bureau") return [colors.accent, colors.accent2, "#3a745f"];
  if (["intron", "orbital"].includes(themeId)) return [colors.accent, colors.accent2, colors.feature];
  return [colors.accent, colors.accent2, colors.feature || colors.danger || colors.accent];
}

function themePattern(themeId) {
  if (themeId === "spectrum-neon") return "spectrum";
  if (themeId === "japanese-army") return "army";
  if (["intron", "orbital", "statistics-bureau"].includes(themeId)) return "paper";
  return "grid";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像の描画に失敗しました。"));
    image.src = src;
  });
}

function splitPhrase(value, maxLength = 30) { const chars = Array.from(String(value || "").trim()); if (chars.length <= maxLength) return [chars.join("")]; const first = chars.slice(0, maxLength).join(""); const secondChars = chars.slice(maxLength, maxLength * 2); const second = secondChars.join(""); return [first, chars.length > maxLength * 2 ? `${second.slice(0, -1)}…` : second]; }

function createCardSvg(cast, theme, image) {
  const esc = escapeHtml;
  const quote = value => {
    const text = String(value || "").replace(/^[“”"「『]|[“”"」』]$/g, "").trim();
    return text ? `”${text}”` : "";
  };
  const handleKana = String(cast.handle_kana || "").trim();
  const nameKana = String(cast.character_kana || "").trim();
  const handle = quote(cast.handle);
  const name = String(cast.character_name || "NO NAME").trim();
  const nameDisplay = `${handle}　${name}`;
  const nameLength = Array.from(nameDisplay).length;
  const nameFontSize = nameLength <= 20 ? 34 : Math.max(18, 34 - (nameLength - 20) * 2);
  const styles = [1, 2, 3].map(index => ({ name: cast[`style_${index}`], mark: cast[`style_${index}_mark`] })).filter(style => style.name);
  const positionX = getImageFocusX(cast.image_url);
  const positionY = getImageFocusY(cast.image_url);
  const zoom = getImageZoom(cast.image_url) / 100;
  const imageHref = image || "";
  const palette = theme.palette || [theme.accent, theme.accent2, theme.accent];
  const accentStops = palette.map((color, index) => `<stop offset="${(index / Math.max(1, palette.length - 1)) * 100}%" stop-color="${color}"/>`).join("");
  const accentGradient = `<linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">${accentStops}</linearGradient>`;
  const panelGradient = `<linearGradient id="panelGradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.surface}"/><stop offset="1" stop-color="${theme.surfaceAlt}"/></linearGradient>`;
  const neonFilter = theme.pattern === "spectrum" ? `<filter id="neonGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : "";
  const accentFilter = theme.pattern === "spectrum" ? ` filter="url(#neonGlow)"` : "";
  const pattern = theme.pattern === "spectrum"
    ? `<pattern id="pattern" width="140" height="140" patternUnits="userSpaceOnUse"><path d="M0 30L140 0M0 90L140 60M0 150L140 120" stroke="${theme.accent}" stroke-opacity=".13" stroke-width="2"/><circle cx="32" cy="86" r="2" fill="${theme.accent2}" fill-opacity=".6"/><circle cx="108" cy="36" r="2" fill="${theme.accent}" fill-opacity=".5"/></pattern>`
    : theme.pattern === "army"
      ? `<pattern id="pattern" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M0 60L60 0M-15 60L60 -15M0 75L75 0" stroke="${theme.accent}" stroke-opacity=".1" stroke-width="1"/><circle cx="30" cy="30" r="10" fill="none" stroke="${theme.accent2}" stroke-opacity=".08"/></pattern>`
      : theme.pattern === "paper"
        ? `<pattern id="pattern" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M0 31H32M31 0V32" stroke="${theme.accent}" stroke-opacity=".08"/><circle cx="6" cy="7" r="1" fill="${theme.accent}" fill-opacity=".15"/></pattern>`
        : theme.pattern === "diagonal"
    ? `<pattern id="pattern" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V20" stroke="${theme.accent}" stroke-opacity=".11"/></pattern>`
    : theme.pattern === "orbit"
      ? `<pattern id="pattern" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="40" cy="40" r="28" fill="none" stroke="${theme.accent2}" stroke-opacity=".12"/><circle cx="40" cy="40" r="2" fill="${theme.accent}" fill-opacity=".45"/></pattern>`
      : `<pattern id="pattern" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${theme.accent}" stroke-opacity=".12"/><circle cx="0" cy="0" r="1.2" fill="${theme.accent}" fill-opacity=".4"/></pattern>`;
  const styleChips = styles.map((style, index) => { const width = 190; const left = 530 + index * 200 + (200 - width) / 2; const center = left + width / 2; const accent = theme.accent; return `<path d="M${left + 9} 263H${left + width - 9}L${left + width} 272V292L${left + width - 9} 301H${left + 9}L${left} 292V272Z" fill="${theme.surface}" stroke="${accent}" stroke-width="1.5"/><path d="M${left + 11} 268H${left + width - 11}" stroke="${accent}" stroke-opacity=".42"/><path d="M${left + 4} 279V268H${left + 15}M${left + width - 4} 285V296H${left + width - 15}" fill="none" stroke="${accent}" stroke-width="2"/><text x="${center}" y="288" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="18">${esc(style.name)} ${esc(style.mark || "")}</text>`; }).join("");
  const phraseLines = splitPhrase(cast.summary);
  const phraseMarkup = phraseLines.map((line, index) => `<text x="530" y="${475 + index * 24}" fill="${theme.text}" font-family="sans-serif" font-size="19">${esc(line)}</text>`).join("");
  const phraseRuleY = phraseLines.length > 1 ? 516 : 492;
  const traceY = phraseRuleY + 42;
  const footerY = traceY + 39;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.background}"/><stop offset=".55" stop-color="${theme.surface}"/><stop offset="1" stop-color="#24152f"/></linearGradient>${pattern}${accentGradient}${panelGradient}${neonFilter}<pattern id="scan" width="4" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".1"/></pattern><clipPath id="portrait"><rect x="50" y="50" width="430" height="530" rx="10"/></clipPath></defs><rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="630" fill="url(#pattern)"/><rect x="40" y="40" width="450" height="550" rx="12" fill="url(#panelGradient)" stroke="url(#accentBar)" stroke-width="1.5"/><rect x="50" y="50" width="430" height="530" rx="10" fill="#0a1321" stroke="${theme.accent}" stroke-opacity=".7"/><image href="${imageHref}" x="${50 - (positionX - 50) * 0.01 * 430 * (zoom - 1)}" y="${50 - (positionY - 50) * 0.01 * 530 * (zoom - 1)}" width="${430 * zoom}" height="${530 * zoom}" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)"/><rect x="50" y="50" width="430" height="530" fill="url(#scan)" opacity=".42" clip-path="url(#portrait)"/><path d="M40 105V40H105M425 40H490V105M490 525V590H425M105 590H40V525" fill="none" stroke="${theme.accent}" stroke-width="5"/><text x="67" y="83" fill="${theme.text}" font-family="sans-serif" font-size="13" letter-spacing="2">VISUAL IDENTITY // VERIFIED</text><text x="67" y="560" fill="${theme.accent}" font-family="sans-serif" font-size="13" letter-spacing="2">LIVE IMAGE LINK : OK</text><text x="530" y="54" fill="${theme.accent}" font-family="sans-serif" font-size="14" letter-spacing="3">TNX CAST ARCHIVE / PROFILE CARD</text><text x="1135" y="54" text-anchor="end" fill="${theme.accent}" font-family="sans-serif" font-size="13">PLAYER：${esc(cast.player_name || "—")}</text><rect x="530" y="70" width="605" height="3" fill="url(#accentBar)" opacity=".9"${accentFilter}/><text x="530" y="135" fill="${theme.muted}" font-family="sans-serif" font-size="24" font-weight="600">${esc(quote(handleKana))}　${esc(nameKana)}</text><text x="530" y="190" fill="${theme.text}" font-family="sans-serif" font-size="${nameFontSize}" font-weight="700">${esc(nameDisplay)}</text><path d="M386 488H472L480 496V580H386L378 572V496Z" fill="${theme.surface}" fill-opacity=".96" stroke="${theme.accent}" stroke-width="1.5"/><path d="M398 488V480H460L468 488" fill="${theme.surface}" stroke="${theme.accent}" stroke-width="1"/><text x="429" y="504" text-anchor="middle" fill="${theme.accent}" font-family="sans-serif" font-size="12" letter-spacing="2">RANK</text><text x="429" y="555" text-anchor="middle" fill="${theme.text}" font-family="sans-serif" font-size="31" font-weight="700">${esc(cast.citizen_rank || "—")}</text><path d="M530 213H1135" stroke="${theme.muted}" stroke-opacity=".42"/><text x="530" y="247" fill="${theme.muted}" font-family="sans-serif" font-size="13" letter-spacing="2">STYLE LOADOUT</text>${styleChips}<text x="530" y="342" fill="${theme.muted}" font-family="sans-serif" font-size="13" letter-spacing="2">PROFILE</text><rect x="530" y="357" width="605" height="48" fill="${theme.surface}" stroke="${theme.accent}" stroke-opacity=".35"/><text x="552" y="388" fill="${theme.accent}" font-family="sans-serif" font-size="19">性別：${esc(cast.gender || "—")}　　年齢：${esc(cast.age || "—")}　　所属：${esc(cast.affiliation || "—")}</text><text x="530" y="444" fill="${theme.muted}" font-family="sans-serif" font-size="13" letter-spacing="2">PHRASE</text>${phraseMarkup}<path d="M530 ${phraseRuleY}H1135" stroke="${theme.accent2}" stroke-width="2"/><text x="530" y="${traceY}" fill="${theme.muted}" font-family="sans-serif" font-size="12" letter-spacing="2">IDENTITY TRACE // COMPLETE</text><text x="1135" y="${traceY}" text-anchor="end" fill="${theme.muted}" font-family="sans-serif" font-size="13" letter-spacing="2">${esc(cast.public_id || "NO ID")}</text><text x="1135" y="${footerY}" text-anchor="end" fill="${theme.muted}" font-family="sans-serif" font-size="12" letter-spacing="2">TOKYO N◎VA / CAST ARCHIVE</text></svg>`;
}
