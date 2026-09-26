import { normalizeShowcaseTheme, createOutputCss } from "./showcase-output-css.js?v=1";
import { STYLE_COLORS } from "./style-colors.js";
import { getImageObjectPosition, getImageScale, getImageTransformOrigin } from "./image-focus.js?v=4";

// Standalone output and selection UI share formatting, but not browser state.
export function renderShowcase(data, baseUrl) {
  const backgroundStyle = data.background
    ? `background-image:linear-gradient(rgba(2,8,12,.58),rgba(2,8,12,.92)),url('${escapeCssUrl(data.background)}');`
    : "";
  const navigation = data.casts.map((item, index) => `<a href="#cast-${index + 1}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(item.character.character_name)}</a>`).join("");
  const cards = data.casts.map((item, index) => createOutputCastCard(item, index, baseUrl)).join("\n");
  return `<!doctype html>
<html lang="ja" data-showcase-theme="${escapeAttribute(normalizeShowcaseTheme(data.theme))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>${createOutputCss(backgroundStyle, data.theme)}</style>
</head>
<body>
<header class="hero wrap"><div><p class="hero__code">N◎VA MUNICIPAL DATABASE // ACT ARCHIVE</p><h1>${escapeHtml(data.title)}<span>CAST SHOWCASE</span></h1><p class="hero__act">${escapeHtml(data.actName)}</p>${data.rulerName ? `<p class="hero__ruler">RULER：${escapeHtml(data.rulerName)}</p>` : ""}${data.intro ? `<p class="hero__intro">${escapeHtml(data.intro)}</p>` : ""}</div></header>
<nav class="cast-nav"><div class="wrap">${navigation}</div></nav>
<main class="cast-list wrap">${cards}</main>
<footer class="footer wrap">「トーキョーN◎VA THE AXLERATION」は有限会社ファーイースト・アミューズメント・リサーチの著作物です。</footer>
</body>
</html>`;
}

function createOutputCastCard(item, index, baseUrl) {
  const character = item.character;
  const styles = getStyles(character).map(style => {
    const color = STYLE_COLORS.get(style.name) || "#00efff";
    return `<span class="style" style="--style-color:${escapeAttribute(color)}">${escapeHtml(`${style.name}${style.mark}`)}</span>`;
  }).join("");
  const reading = item.manual ? "" : formatReading(character);
  const fullName = item.manual ? character.character_name : formatFullName(character);
  const nameClass = getOutputNameClass(fullName);
  const displayId = item.manual ? "ScanFailed" : item.source === "private" ? "PRIVATE" : obfuscatePublicId(character.public_id);
  const handoutRole = String(item.quote ?? "").trim();
  const handoutText = String(item.description ?? "").trim();
  const handoutTitle = handoutRole === "共通" ? "共通ハンドアウト" : `『${handoutRole}』用ハンドアウト`;
  const handout = handoutRole
    ? `<details class="cast-card__handout"><summary><span class="cast-card__handout-role">${escapeHtml(handoutTitle)}</span><span class="cast-card__handout-action">OPEN HANDOUT</span></summary><div class="cast-card__handout-body">${handoutText ? escapeHtml(handoutText) : "ハンドアウト詳細は未登録です。"}</div></details>`
    : "";
  let link;
  if (item.manual) {
    link = `<span class="cast-card__link cast-card__link--disabled">CAST DATABASE // SCAN FAILED</span>`;
  } else if (item.source === "private") {
    link = `<span class="cast-card__link cast-card__link--disabled">PRIVATE CAST // LOCAL OUTPUT</span>`;
  } else {
    const publicUrl = new URL(`./cast.html?id=${encodeURIComponent(character.public_id)}`, baseUrl).href;
    link = `<a class="cast-card__link" href="${escapeAttribute(publicUrl)}" target="_blank" rel="noopener">OPEN CAST DATABASE →</a>`;
  }

  return `
<section class="cast-card" id="cast-${index + 1}">
  <div class="cast-card__image"><img src="${escapeAttribute(character.image_thumbnail_url || character.image_url || "./assets/placeholders/scan-failed.webp")}" alt="${escapeAttribute(character.character_name || "")}" style="object-position:${escapeAttribute(getImageObjectPosition(character.image_url))};--tnx-image-scale:${getImageScale(character.image_url)};--tnx-image-origin:${escapeAttribute(getImageTransformOrigin(character.image_url))}"></div>
  <div class="cast-card__body">
    <p class="cast-card__slot">CAST ${String(index + 1).padStart(2, "0")}</p>
    ${reading ? `<p class="cast-card__reading">${escapeHtml(reading)}</p>` : ""}
    <h2 class="cast-card__name${nameClass}">${escapeHtml(fullName)}</h2>
    ${styles ? `<div class="cast-card__styles">${styles}</div>` : ""}
    <div class="cast-card__meta"><div><small>PLAYER</small><strong>${escapeHtml(character.player_name || "—")}</strong></div><div><small>AFFILIATION</small><strong>${escapeHtml(character.affiliation || "—")}</strong></div><div><small>AGE</small><strong>${escapeHtml(character.age || "—")}</strong></div><div><small>GENDER / ID</small><strong>${escapeHtml([character.gender, character.citizen_rank].filter(Boolean).join(" / ") || "—")}</strong></div></div>
    ${handout}
    ${link}
  </div>
  <p class="cast-card__serial">${escapeHtml(displayId)}</p>
</section>`;
}

function getOutputNameClass(value) {
  const length = Array.from(String(value ?? "")).length;
  if (length >= 21) return " cast-card__name--very-long";
  if (length >= 15) return " cast-card__name--long";
  return "";
}

export function parseManualStyles(value) {
  return String(value ?? "")
    .split(/[、,／/|\n]+/)
    .map(label => label.trim())
    .filter(Boolean)
    .map(label => ({
      name: label.replace(/[◎●]/g, "").trim(),
      mark: (label.match(/[◎●]/g) || []).join("")
    }))
    .filter(item => item.name);
}

export function getStyles(character) {
  if (character.manual_styles !== undefined) return parseManualStyles(character.manual_styles);
  return [
    { name: character.style_1, mark: character.style_1_mark },
    { name: character.style_2, mark: character.style_2_mark },
    { name: character.style_3, mark: character.style_3_mark }
  ].filter(item => item.name);
}

export function getStyleNames(character) { return getStyles(character).map(item => item.name); }
export function formatHandle(handle) { const value = String(handle ?? "").trim(); return value ? `“${value}”` : ""; }
export function formatFullName(character) { return [formatHandle(character.handle), character.character_name].filter(Boolean).join(" "); }
export function formatReading(character) { const handleKana = String(character.handle_kana ?? "").trim(); const nameKana = String(character.character_kana ?? "").trim(); return [handleKana ? `“${handleKana}”` : "", nameKana].filter(Boolean).join(" "); }
export function obfuscatePublicId(value) { const source = `TNX_CAST_ARCHIVE::${String(value ?? "")}`; let hash = 0x811c9dc5; for (let index = 0; index < source.length; index++) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 0x01000193); } return `TNX-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`; }
export function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
export function escapeAttribute(value) { return escapeHtml(value); }
export function escapeCssUrl(value) { return String(value ?? "").replace(/[\\'\n\r)]/g, character => `\\${character}`); }
