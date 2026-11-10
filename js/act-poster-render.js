// Draws the announcement poster of a published act (the layout of js/act-poster-layout.js) on a canvas, 2400 x 1350 for the logical 1200 x 675,
// and exports it as a picture. Nothing is sent anywhere and no data is changed: the portraits are only read.
//
// The poster is a fixed design: a dark ground, a grid, a gold catch line and date, a white-to-cyan title. Those colours deliberately ignore
// the site theme (like the experience ticket: docs/UI_CONVENTIONS.md), so they live here as POSTER_COLORS and this file is outside
// audit:colors. What follows the theme is only what the caller passes in as `theme` (primary / secondary / accent, already resolved:
// resolvePosterTheme): the colour of each HO, the title's shadow and glow, the label chips.
//
// Not on it: the logo, the official fonts or illustrations, the words "official" / "公式" / "公認", the handout text, the guests.
import { approximateTextWidth } from "./cast-sns-name-layout.js?v=71a5e4e1";
import { POSTER_WIDTH, POSTER_HEIGHT, ROLE_BODY, ROLE_TITLE, ROLE_NUMBER } from "./act-poster-layout.js?v=c0d97bfd";

export const POSTER_SCALE = 2;
export const POSTER_MAX_PNG_BYTES = 5 * 1024 * 1024;
export const POSTER_JPEG_QUALITY = 0.9;
export const POSTER_PLACEHOLDER_URL = new URL("../assets/placeholders/scan-failed.webp", import.meta.url).href;

export const POSTER_FONTS = Object.freeze({
  [ROLE_TITLE]: '"Dela Gothic One", "Noto Sans JP", sans-serif',
  [ROLE_BODY]: '"Noto Sans JP", "Yu Gothic", sans-serif',
  [ROLE_NUMBER]: 'Orbitron, "Noto Sans JP", sans-serif'
});

export const POSTER_COLORS = Object.freeze({
  ground: "#04070f",
  grid: "rgba(112, 223, 238, 0.07)",
  streak: "rgba(112, 223, 238, 0.10)",
  scanline: "rgba(255, 255, 255, 0.04)",
  ink: "#ffffff",
  inkSoft: "rgba(255, 255, 255, 0.78)",
  cyan: "#7fe9ff",
  gold: "#ffd166",
  dark: "rgba(3, 6, 14, 0.78)",
  darker: "#04070f",
  rights: "rgba(255, 255, 255, 0.55)"
});

const PORTRAIT_FOCUS_Y = 0.06; // object-position: 50% 6%
const PLACEHOLDER_SHIFT = 85 / 392; // the "SCAN FAILED" picture is moved up by about a fifth of the portrait so its text clears the plate

// ---- measuring and fonts ---------------------------------------------------------------------------------------------------------------------
const fontOf = (size, weight, role) => `${weight} ${size}px ${POSTER_FONTS[role] ?? POSTER_FONTS[ROLE_BODY]}`;

// A measurer for layoutPoster: the width of a text in the font of its role. Without a canvas (no DOM) it falls back to a rough estimate.
export function createPosterMeasurer() {
  let context = null;
  try {
    const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
    context = canvas.getContext("2d");
  } catch {
    context = null;
  }
  if (!context) return (text, fontSize) => approximateTextWidth(text, fontSize);
  return (text, fontSize, weight = 700, role = ROLE_BODY) => {
    context.font = fontOf(fontSize, weight, role);
    return context.measureText(String(text ?? "")).width;
  };
}

// Waits until the faces the poster needs are loaded for the characters it draws (call it before measuring, so the layout uses the real widths).
// `texts`: {title, body, number} strings holding every character drawn in that role.
export async function loadPosterFonts(texts = {}) {
  const fonts = typeof document !== "undefined" ? document.fonts : null;
  if (!fonts?.load) return;
  const jobs = [
    [fontOf(64, 900, ROLE_TITLE), texts.title],
    [fontOf(20, 700, ROLE_BODY), texts.body],
    [fontOf(20, 900, ROLE_BODY), texts.body],
    [fontOf(40, 900, ROLE_NUMBER), texts.number],
    [fontOf(20, 700, ROLE_NUMBER), texts.number]
  ];
  await Promise.all(jobs.map(([font, text]) => fonts.load(font, String(text || "A")).catch(() => [])));
}

export function posterTexts(model) {
  const casts = model.casts ?? [];
  return {
    title: model.actName,
    number: `${model.dateText}${casts.map(cast => cast.ho).join("")}0123456789.:/ SUNMOTEWHFRI`,
    body: [model.subtitle, model.catchCopy, model.rulerName, model.writerName, model.rightsNotice, model.copyrightNotice, "RLWRITER“”",
      ...casts.flatMap(cast => [cast.style, cast.handle, cast.name, cast.handleReading, cast.nameReading])].join("")
  };
}

// The colour of a CSS value as the browser resolves it (a var(), color-mix() ... becomes "rgb(...)"), read from a probe element.
export function resolveCssColor(value, root = document.body) {
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  root.append(probe);
  try {
    return getComputedStyle(probe).color;
  } finally {
    probe.remove();
  }
}

// The three theme colours of the poster ({primary, secondary, accent}: any CSS colours), resolved the way the browser resolves them
// ("rgb(...)"), so the canvas gets plain colours. The caller takes them from the act's showcase theme (the generator page does not carry the
// --showcase-* variables of the act pages, so the palette of the theme is passed in).
export function resolvePosterTheme(colors, root = document.body) {
  const resolve = value => resolveCssColor(value, root);
  return { primary: resolve(colors.primary), secondary: resolve(colors.secondary), accent: resolve(colors.accent) };
}

// ---- images ----------------------------------------------------------------------------------------------------------------------------------
// fetch -> createImageBitmap; when that fails, an <img crossOrigin="anonymous">. null when neither works (the poster draws the placeholder).
export async function loadPosterImage(url) {
  const source = String(url || "").split("#")[0];
  if (!source) return null;
  try {
    const response = await fetch(source, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await createImageBitmap(await response.blob());
  } catch {
    try {
      return await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("image"));
        image.src = source;
      });
    } catch {
      return null;
    }
  }
}

// {url -> picture or null} for every portrait of the layout, plus the placeholder under the key "placeholder".
export async function loadPosterImages(layout) {
  const urls = [...new Set(layout.panels.map(panel => panel.cast.imageUrl).filter(Boolean))];
  const entries = await Promise.all(urls.map(async url => [url, await loadPosterImage(url)]));
  const images = new Map(entries);
  images.set("placeholder", await loadPosterImage(POSTER_PLACEHOLDER_URL));
  return images;
}

// ---- drawing ---------------------------------------------------------------------------------------------------------------------------------
function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
  ctx.closePath();
}

function drawText(ctx, text, x, baseline, { size, weight = 700, role = ROLE_BODY, fill, align = "left" }) {
  ctx.font = fontOf(size, weight, role);
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = fill;
  ctx.fillText(text, x, baseline);
}

// Letters one by one at their own x (the ruby of the layout: space-around), or with a letter spacing (the catch line).
function drawGlyphs(ctx, reading, baseline, { size, fill }) {
  if (!reading) return;
  for (const glyph of reading.glyphs) drawText(ctx, glyph.char, glyph.x, baseline, { size, weight: 700, fill });
}

function drawSpaced(ctx, text, x, baseline, { size, spacingEm, fill }) {
  let cursor = x;
  for (const char of Array.from(text)) {
    drawText(ctx, char, cursor, baseline, { size, fill });
    cursor += ctx.measureText(char).width + size * spacingEm;
  }
}

function drawBackground(ctx, theme) {
  ctx.fillStyle = POSTER_COLORS.ground;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  ctx.strokeStyle = POSTER_COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= POSTER_WIDTH; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, POSTER_HEIGHT); }
  for (let y = 0; y <= POSTER_HEIGHT; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(POSTER_WIDTH, y + 0.5); }
  ctx.stroke();
  // light streaks leaning -8 degrees, 90px high
  ctx.save();
  ctx.rotate((-8 * Math.PI) / 180);
  for (const [y, width] of [[120, 1100], [330, 900], [560, 1200]]) {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.5, theme?.primary ? withAlpha(theme.primary, 0.1) : POSTER_COLORS.streak);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(-100, y, width, 90);
  }
  ctx.restore();
  ctx.fillStyle = POSTER_COLORS.scanline;
  for (let y = 0; y < POSTER_HEIGHT; y += 4) ctx.fillRect(0, y, POSTER_WIDTH, 1);
}

// "rgb(r, g, b)" / "#rrggbb" with an alpha ("rgba(...)"); anything else as it is.
function withAlpha(color, alpha) {
  const text = String(color ?? "");
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(text);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  const hex = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex) return `rgba(${parseInt(hex[1].slice(0, 2), 16)}, ${parseInt(hex[1].slice(2, 4), 16)}, ${parseInt(hex[1].slice(4), 16)}, ${alpha})`;
  return text;
}

// The portrait of a cast inside `points` (its bounding box `box`): the HO colour as a gradient ground first (a picture with transparency
// or none shows it), then the picture covering the box with its top shown (object-position 50% 6%), a light HO tint and a dark fall at the foot.
// The "SCAN FAILED" placeholder is shown across its whole width (its text must not be cut at the sides of a narrow card); `liftPlaceholder`
// moves it up by about a fifth of the portrait so its text clears the name plate that covers the foot (the compositions of one to four casts).
function drawPortrait(ctx, panel, points, box, picture, isPlaceholder, liftPlaceholder = false) {
  const { color } = panel;
  ctx.save();
  polygon(ctx, points);
  ctx.clip();
  const ground = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
  ground.addColorStop(0, color.value);
  ground.addColorStop(1, POSTER_COLORS.ground);
  ctx.fillStyle = ground;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  if (picture) {
    const width = picture.width || picture.naturalWidth;
    const height = picture.height || picture.naturalHeight;
    if (width > 0 && height > 0) {
      const scale = isPlaceholder ? box.width / width : Math.max(box.width / width, box.height / height);
      const drawWidth = width * scale;
      const drawHeight = height * scale;
      const shift = isPlaceholder && liftPlaceholder ? box.height * PLACEHOLDER_SHIFT : 0;
      ctx.drawImage(picture, box.x + (box.width - drawWidth) / 2, box.y + (box.height - drawHeight) * PORTRAIT_FOCUS_Y - shift, drawWidth, drawHeight);
    }
  }
  ctx.fillStyle = withAlpha(color.value, 0.16);
  ctx.fillRect(box.x, box.y, box.width, box.height);
  const fall = ctx.createLinearGradient(0, box.y + box.height * 0.45, 0, box.y + box.height);
  fall.addColorStop(0, "transparent");
  fall.addColorStop(1, withAlpha(POSTER_COLORS.ground, 0.88));
  ctx.fillStyle = fall;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.restore();
  // the outline and the shadow of the HO colour
  ctx.save();
  ctx.shadowColor = withAlpha(color.value, 0.55);
  ctx.shadowBlur = 18;
  ctx.strokeStyle = color.value;
  ctx.lineWidth = 2;
  polygon(ctx, points);
  ctx.stroke();
  ctx.restore();
}

function pictureFor(images, cast) {
  const own = cast.imageUrl ? images?.get(cast.imageUrl) : null;
  if (own) return { picture: own, isPlaceholder: false };
  return { picture: images?.get("placeholder") ?? null, isPlaceholder: true };
}

function drawHoRow(ctx, panel, x, baseline) {
  const { cast, color } = panel;
  ctx.font = fontOf(14, 900, ROLE_NUMBER);
  const chipWidth = ctx.measureText(cast.ho).width + 16;
  ctx.fillStyle = color.value;
  polygon(ctx, [{ x: x + 4, y: baseline - 15 }, { x: x + chipWidth + 4, y: baseline - 15 }, { x: x + chipWidth, y: baseline + 3 }, { x, y: baseline + 3 }]);
  ctx.fill();
  drawText(ctx, cast.ho, x + 8 + 2, baseline - 1, { size: 14, weight: 900, role: ROLE_NUMBER, fill: POSTER_COLORS.darker });
  if (cast.style) drawText(ctx, cast.style, x + chipWidth + 14, baseline, { size: 16, weight: 900, fill: color.value });
}

function drawNameLine(ctx, panel, line) {
  const { cast, color } = panel;
  const size = line.fontSize;
  const readingSize = line.readingFontSize;
  ctx.save();
  ctx.shadowColor = withAlpha(POSTER_COLORS.ground, 0.9);
  ctx.shadowBlur = 6;
  if (cast.handle) {
    drawText(ctx, cast.handle, line.handle.x, line.baseline, { size, weight: 900, fill: POSTER_COLORS.ink });
    drawGlyphs(ctx, line.handleReading, line.readingBaseline, { size: readingSize, fill: color.value });
  }
  drawText(ctx, cast.name || "NO NAME", line.name.x, line.baseline, { size, weight: 900, fill: POSTER_COLORS.ink });
  drawGlyphs(ctx, line.nameReading, line.readingBaseline, { size: readingSize, fill: POSTER_COLORS.inkSoft });
  ctx.restore();
}

function drawPortraitsComposition(ctx, layout, images) {
  for (const panel of layout.panels) {
    const { x, y, width, height, skew } = panel;
    const points = [{ x: x + skew, y }, { x: x + width, y }, { x: x + width - skew, y: y + height }, { x, y: y + height }];
    const { picture, isPlaceholder } = pictureFor(images, panel.cast);
    drawPortrait(ctx, panel, points, { x, y, width, height }, picture, isPlaceholder, true);
  }
  // the plates over the portraits (a later portrait never covers an earlier plate)
  for (const panel of layout.panels) {
    const { plate, color } = panel;
    ctx.fillStyle = POSTER_COLORS.dark;
    polygon(ctx, plate.polygon);
    ctx.fill();
    const [topLeft, , , bottomLeft] = plate.polygon;
    ctx.fillStyle = color.value;
    polygon(ctx, [topLeft, { x: topLeft.x + 5, y: topLeft.y }, { x: bottomLeft.x + 5, y: bottomLeft.y }, bottomLeft]);
    ctx.fill();
    drawHoRow(ctx, panel, plate.textLeft, plate.rows.ho.baseline);
    if (plate.mode === "two-lines") {
      for (const key of ["handle", "name"]) {
        const row = plate.rows[key];
        if (!row) continue;
        ctx.save();
        ctx.shadowColor = withAlpha(POSTER_COLORS.ground, 0.9);
        ctx.shadowBlur = 6;
        const text = key === "handle" ? panel.cast.handle : panel.cast.name || "NO NAME";
        drawText(ctx, text, row.baseX, row.baseline, { size: row.fontSize, weight: 900, fill: POSTER_COLORS.ink });
        drawGlyphs(ctx, row.reading, row.readingBaseline, { size: row.readingFontSize, fill: key === "handle" ? color.value : POSTER_COLORS.inkSoft });
        ctx.restore();
      }
    } else {
      drawNameLine(ctx, panel, plate.rows.line);
    }
  }
}

function drawRosterComposition(ctx, layout, images) {
  for (const panel of layout.panels) {
    const { x, y, width, height, color } = panel;
    ctx.fillStyle = POSTER_COLORS.dark;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color.value;
    ctx.fillRect(x, y, 5, height);
    const portraitWidth = panel.portrait.width;
    const skew = height * Math.tan((7 * Math.PI) / 180);
    const points = [{ x: x + 10 + skew, y }, { x: x + 10 + portraitWidth, y }, { x: x + 10 + portraitWidth - skew, y: y + height }, { x: x + 10, y: y + height }];
    const { picture, isPlaceholder } = pictureFor(images, panel.cast);
    drawPortrait(ctx, panel, points, { x: x + 10, y, width: portraitWidth, height }, picture, isPlaceholder);
    drawHoRow(ctx, panel, panel.card.textLeft, panel.card.ho.baseline);
    drawNameLine(ctx, panel, panel.card.line);
  }
}

function drawTitleBlock(ctx, layout, theme) {
  const { catchLine, title, subtitle, credits, date, rights } = layout;
  if (catchLine) drawSpaced(ctx, catchLine.text, catchLine.x, catchLine.baseline, { size: catchLine.fontSize, spacingEm: catchLine.letterSpacingEm, fill: POSTER_COLORS.gold });

  // the title: the secondary colour shifted 3px right and down, a weak glow of the primary colour, a white-to-cyan fill from top to bottom
  ctx.save();
  ctx.font = fontOf(title.fontSize, 900, ROLE_TITLE);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme?.secondary || POSTER_COLORS.cyan;
  ctx.fillText(title.text, title.x + 3, title.baseline + 3);
  ctx.shadowColor = withAlpha(theme?.primary || POSTER_COLORS.cyan, 0.45);
  ctx.shadowBlur = 16;
  const fill = ctx.createLinearGradient(0, title.baseline - title.fontSize * 0.85, 0, title.baseline);
  fill.addColorStop(0, POSTER_COLORS.ink);
  fill.addColorStop(1, POSTER_COLORS.cyan);
  ctx.fillStyle = fill;
  ctx.fillText(title.text, title.x, title.baseline);
  ctx.restore();

  if (subtitle) drawText(ctx, subtitle.text, subtitle.x, subtitle.baseline, { size: subtitle.fontSize, weight: 700, fill: POSTER_COLORS.cyan });

  const chipColors = [theme?.primary, theme?.secondary];
  credits.items.forEach((item, index) => {
    const top = credits.baseline - credits.fontSize + 2;
    const bottom = credits.baseline + 5;
    ctx.fillStyle = chipColors[index] || POSTER_COLORS.cyan;
    polygon(ctx, [{ x: item.chip.x + 6, y: top }, { x: item.chip.x + item.chip.width + 6, y: top }, { x: item.chip.x + item.chip.width, y: bottom }, { x: item.chip.x, y: bottom }]);
    ctx.fill();
    drawText(ctx, item.label, item.chip.x + item.chip.width / 2 + 3, credits.baseline - 2, { size: item.labelSize, weight: 900, fill: POSTER_COLORS.darker, align: "center" });
    drawText(ctx, item.value, item.valueX, credits.baseline, { size: credits.fontSize, weight: 700, fill: POSTER_COLORS.ink });
  });

  ctx.save();
  ctx.shadowColor = withAlpha(POSTER_COLORS.gold, 0.4);
  ctx.shadowBlur = 14;
  drawText(ctx, date.main.text, date.right, date.main.baseline, { size: date.main.fontSize, weight: 900, role: ROLE_NUMBER, fill: POSTER_COLORS.gold, align: "right" });
  ctx.restore();
  if (date.sub) drawText(ctx, date.sub.text, date.right, date.sub.baseline, { size: date.sub.fontSize, weight: 700, role: ROLE_NUMBER, fill: POSTER_COLORS.gold, align: "right" });

  drawText(ctx, rights.text, rights.x, rights.baseline, { size: rights.fontSize, weight: 700, fill: POSTER_COLORS.rights });
  drawText(ctx, rights.copyright.text, rights.copyright.right, rights.copyright.baseline, { size: rights.copyright.fontSize, weight: 700, fill: POSTER_COLORS.rights, align: "right" });
}

/**
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {ReturnType<import("./act-poster-layout.js").layoutPoster>} layout
 * @param {{images?: Map<string, any>, theme?: {primary: string, secondary: string, accent: string}, scale?: number, texts?: object}} [options]
 *   images: from loadPosterImages (a missing entry draws the placeholder); texts: for loadPosterFonts (default: nothing extra is waited for)
 */
export async function renderPoster(canvas, layout, { images, theme, scale = POSTER_SCALE, texts } = {}) {
  await loadPosterFonts(texts);
  canvas.width = Math.round(POSTER_WIDTH * scale);
  canvas.height = Math.round(POSTER_HEIGHT * scale);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawBackground(ctx, theme);
  if (layout.mode === "roster") drawRosterComposition(ctx, layout, images);
  else drawPortraitsComposition(ctx, layout, images);
  drawTitleBlock(ctx, layout, theme);
  return canvas;
}

// PNG; a picture over 5 MB is exported as JPEG (quality 0.9) instead. `png: true` always gives PNG (the clipboard takes PNG only).
export async function exportPosterBlob(canvas, { png = false } = {}) {
  const toBlob = (type, quality) => (typeof canvas.convertToBlob === "function"
    ? canvas.convertToBlob({ type, quality })
    : new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("canvas export failed"))), type, quality)));
  const blob = await toBlob("image/png");
  return !png && blob.size > POSTER_MAX_PNG_BYTES ? toBlob("image/jpeg", POSTER_JPEG_QUALITY) : blob;
}
