// The announcement poster of a published act ("予告ポスター", the picture attached to an X post): what it shows (buildPosterModel) and where
// everything goes (layoutPoster), in a logical 1200 x 675 space. Pure: no DOM and no canvas. The text measurer is injected, so Node tests
// run with a deterministic one and js/act-poster-render.js passes a canvas measurer. Nothing here is saved or sent anywhere.
//
// The data is the published act (what js/act-showcase-page.js createShowcaseModel reads) and is read the same way as the public page:
// the same fallbacks for the act name and the trailer, the same quote handling, the same http(s) / data:image image rule.
// Not on the poster: the three style chips of a cast, the handout text, the guests, hashtags and any word that claims it is official.
import { computeNameLayout, computeRubyUnit, READING_GAP, READING_SCALE } from "./cast-sns-name-layout.js?v=71a5e4e1";
import { splitCastName } from "./act-showcase-handout-fields.js?v=991c7b8e";
import { roleForCast } from "./act-showcase-visual-caption.js?v=47f6e034";
import { heroSubtitle, safeImageUrl } from "./act-showcase-finale-b-model.js?v=76278f9e";
import { RIGHTS_TEXT } from "./legal-rights-text.js?v=7aab3d75";
import { formatShowcaseHandle, normalizeShowcaseDisplayQuotes, stripOuterDisplayQuotes } from "./showcase-display-format.js?v=728d9084";

export const POSTER_WIDTH = 1200;
export const POSTER_HEIGHT = 675;
export const POSTER_MAX_CASTS = 6;

// TODO 要確認: the wording of the rights line is provisional until the secondary-work guidelines of the TRPG rights office (TRPGライツ事務局)
// have been checked (the owner decided this wording on 2026-11-09). It is the only place the wording lives (the renderer draws layout.rights.text);
// it may say that the picture is NOT official, but never that it is official or "公認".
export const POSTER_RIGHTS_NOTICE = "本画像は非公式ファンツール「CAST ARCHIVE」で生成したものです。各権利者による公式の画像・サービスではありません。";
// the copyright line, right-aligned on the same bottom row (the same string as the legal notices of the site)
export const POSTER_COPYRIGHT_NOTICE = RIGHTS_TEXT;
export const POSTER_DEFAULT_DATE = "近日開演";
export const POSTER_MAX_DATE_LENGTH = 24;
export const POSTER_MAX_CATCH_LENGTH = 40;

// The text roles the measurer is asked about (a role is a font family in the renderer; the Node tests ignore it).
export const ROLE_BODY = "body";
export const ROLE_TITLE = "title";
export const ROLE_NUMBER = "number";

const MARGIN_X = 40;
const RIGHT_EDGE = POSTER_WIDTH - MARGIN_X;

const PORTRAIT_HEIGHT = 392;
const SKEW = Math.tan((7 * Math.PI) / 180); // the portraits lean 7 degrees: the top edge is shifted right by height * SKEW
const PORTRAIT_SPECS = Object.freeze({
  1: { width: 400, step: 374, ys: [44] },
  2: { width: 400, step: 374, ys: [44, 8] },
  3: { width: 372, step: 346, ys: [44, 8, 44] },
  4: { width: 300, step: 278, ys: [44, 8, 44, 8] }
});

// The name plate hangs from the lower part of each portrait. One line is tried first for everyone; when the common size is under the
// threshold everyone gets two lines (handle above name) and the plate goes up by the difference of the two tops.
export const ONE_LINE_MIN_FONT = 26;
export const ONE_LINE_MAX_FONT = 36;
export const TWO_LINE_FONT = 28;
export const PLATE_TOP_ONE_LINE = 336;
export const PLATE_TOP_TWO_LINE = 276;
const PLATE_PAD = 8;
const PLATE_EDGE = 5; // the line of the HO colour on the left of a plate
const PLATE_INSET = 12;
const HO_ROW_HEIGHT = 20;
const ROW_GAP = 4;
const DESCENT_EM = 0.22;

const ROSTER = Object.freeze({ columns: 3, cardWidth: 360, cardHeight: 205, gapX: 20, gapY: 14, top: 14, portraitWidth: 108 });
const ROSTER_NAME_MIN_FONT = 12;
const ROSTER_NAME_MAX_FONT = 22;

const TITLE_MAX_FONT = 68;
const TITLE_PREFERRED_MIN_FONT = 56;
const TITLE_FLOOR_FONT = 24;
const DATE_MAIN_MAX_FONT = 96;
const DATE_MAIN_MIN_FONT = 80;
const DATE_SUB_FONT = 26;
const DATE_MAX_WIDTH = 400;
const COLUMN_GAP = 28;

const clean = value => String(value ?? "").trim();
const clamp = (value, max) => Array.from(clean(value)).slice(0, max).join("");

// ---- colours ----------------------------------------------------------------------------------------------------------------------------
// The colour of each HO is the theme's primary, secondary, accent in the order of the casts, repeating; from the fourth cast on the
// colour is a derived variant of the same one (lighter, then darker), so the same hue does not sit beside itself. A colour that cannot be
// read (not #hex / rgb) is returned as it is. No colour is written in this file: every value comes from the theme.
const PALETTE_KEYS = Object.freeze(["primary", "secondary", "accent"]);

function parseColor(value) {
  const source = clean(value);
  let match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(source);
  if (match) {
    const hex = match[1].length === 3 ? Array.from(match[1], digit => digit + digit).join("") : match[1];
    return [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  }
  match = /^rgba?\s*\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i.exec(source);
  return match ? [match[1], match[2], match[3]].map(channel => Math.max(0, Math.min(255, Math.round(Number(channel))))) : null;
}

const toHex = channels => `#${channels.map(channel => channel.toString(16).padStart(2, "0")).join("")}`;

// step 0: the colour itself; step 1: mixed toward white (lighter); step 2: mixed toward black (darker).
export function deriveAuxiliaryColor(color, step = 1) {
  const channels = parseColor(color);
  if (!channels || !step) return color;
  const target = step % 2 === 1 ? 255 : 0;
  const amount = step % 2 === 1 ? 0.3 : 0.32;
  return toHex(channels.map(channel => Math.round(channel + (target - channel) * amount)));
}

// The poster's ground is dark: a colour that is too dark to be seen on it (the black of a light theme) is mixed toward white until it can be.
const MIN_LUMINANCE = 0.2;
function luminanceOf(color) {
  const channels = parseColor(color);
  if (!channels) return 1;
  const [red, green, blue] = channels.map(channel => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
export function readableOnDark(color) {
  let value = color;
  for (let round = 0; round < 6 && luminanceOf(value) < MIN_LUMINANCE; round += 1) value = deriveAuxiliaryColor(value, 1);
  return value;
}

export function hoColor(theme, index) {
  const key = PALETTE_KEYS[index % PALETTE_KEYS.length];
  const step = Math.floor(index / PALETTE_KEYS.length);
  const base = clean(theme?.[key]);
  return { key, step, base, value: deriveAuxiliaryColor(readableOnDark(base), step) };
}

// ---- the model ---------------------------------------------------------------------------------------------------------------------------
// The text of the trailer the way createShowcaseModel reads it: an object with body / text, else the older flat fields.
export function trailerText(data) {
  const source = data?.trailer && typeof data.trailer === "object" && !Array.isArray(data.trailer) ? data.trailer : null;
  return source ? clean(source.body || source.text) : clean(data?.trailer || data?.actTrailer || data?.trailerText || data?.trailerBody || data?.intro);
}

// The first value of the catch line: the last line of the trailer that is not empty; nothing when there is no trailer.
export function defaultCatchCopy(data) {
  const lines = trailerText(data).replace(/\r\n?/g, "\n").split("\n").map(clean).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}

// "“ニューゲーム” ヒュウガ ルカ" -> {handle: "ニューゲーム", name: "ヒュウガ ルカ"}. The quotes around the handle's reading are dropped. A reading
// without quotes is the reading of the name (it may hold spaces).
export function splitReading(reading) {
  const { handle, name } = splitCastName(normalizeShowcaseDisplayQuotes(reading));
  const strip = value => clean(value).replace(/^[“"「『‘']+|[”"」』’']+$/gu, "").trim();
  return { handleReading: strip(handle), nameReading: name };
}

// A cast without an image has the placeholder's path as its imageUrl in a published act (js/showcase-dynamic-publish-v3.js): that is "no image",
// the renderer draws its own placeholder (lifted clear of the name plate) instead of treating it as the cast's portrait.
const PLACEHOLDER_PATH = /\/assets\/placeholders\/scan-failed\.webp$/i;
export function posterImageUrl(value) {
  const url = safeImageUrl(value);
  if (!url) return "";
  try {
    return PLACEHOLDER_PATH.test(new URL(url).pathname) ? "" : url;
  } catch {
    return url;
  }
}

const hoNumberOf = (cast, index) => {
  const digits = /(\d+)/.exec(clean(cast?.slot));
  const value = digits ? Number(digits[1]) : 0;
  return value > 0 ? value : index + 1;
};

// the text of the handle without its quotes (computeNameLayout puts them back)
const handleInner = cast => stripOuterDisplayQuotes(cast.handle);

const styleName = value => clean(value).replace(/[◎●]/gu, "").trim();

/**
 * @param {object} showcase - the published payload (showcase_data)
 * @param {{date?: string, catchCopy?: string, rightsNotice?: string}} [options] - catchCopy: undefined = the first value (last line of the trailer),
 *   "" = no catch line. date: empty = POSTER_DEFAULT_DATE.
 */
export function buildPosterModel(showcase, { date, catchCopy, rightsNotice } = {}) {
  const data = showcase && typeof showcase === "object" ? showcase : {};
  const pageTitle = clean(data.pageTitle) || "ACT SHOWCASE";
  const heroTitle = clean(data.heroTitle) || pageTitle;
  const actName = clean(data.actName) || heroTitle;
  const casts = (Array.isArray(data.casts) ? data.casts : []).slice(0, POSTER_MAX_CASTS).map((cast, index) => {
    const full = splitCastName(normalizeShowcaseDisplayQuotes(cast?.fullName || cast?.full_name || cast?.name));
    const reading = splitReading(cast?.reading);
    const hoNumber = hoNumberOf(cast, index);
    return {
      index,
      hoNumber,
      ho: `HO${hoNumber}`,
      style: styleName(roleForCast(cast)),
      handle: formatShowcaseHandle(full.handle),
      name: full.name,
      handleReading: full.handle ? reading.handleReading : "",
      nameReading: reading.nameReading,
      imageUrl: posterImageUrl(cast?.imageUrl)
    };
  });
  return {
    actName,
    subtitle: heroSubtitle({ heroSubTitle: data.heroSubTitle }),
    rulerName: clean(data.rulerName),
    writerName: clean(data.scenarioWriterName),
    catchCopy: clamp(catchCopy === undefined ? defaultCatchCopy(data) : catchCopy, POSTER_MAX_CATCH_LENGTH),
    dateText: clamp(date, POSTER_MAX_DATE_LENGTH) || POSTER_DEFAULT_DATE,
    rightsNotice: clean(rightsNotice) || POSTER_RIGHTS_NOTICE,
    copyrightNotice: POSTER_COPYRIGHT_NOTICE,
    casts
  };
}

// ---- the layout ----------------------------------------------------------------------------------------------------------------------------
const RIGHTS_FONT = 11;
const RIGHTS_FLOOR_FONT = 9;
const RIGHTS_GAP = 24; // the least space between the notice and the copyright line
const measureWith = (measure, role) => (text, fontSize, weight = 700) => measure(text, fontSize, weight, role);

// The largest size in [floor, max] at which `text` fits `maxWidth` (the floor when it never does).
function fitFont(measure, text, maxWidth, max, floor, weight, role) {
  let size = max;
  while (size > floor && measure(text, size, weight, role) > maxWidth) size -= 1;
  return size;
}

// Like fitFont, but a range: the largest size in [preferredMin, max] that fits; when even preferredMin does not, shrink further down to floor.
function fitRange(measure, text, maxWidth, max, preferredMin, floor, weight, role) {
  const size = fitFont(measure, text, maxWidth, max, preferredMin, weight, role);
  return measure(text, size, weight, role) > maxWidth ? fitFont(measure, text, maxWidth, size, floor, weight, role) : size;
}

// "11.23 SUN 21:00〜" -> the big part "11.23" and the small part "SUN 21:00〜" (everything after the first space).
export function splitDate(text) {
  const value = clean(text).replace(/[\s　]+/g, " ");
  const space = value.indexOf(" ");
  return space === -1 ? { main: value, sub: "" } : { main: value.slice(0, space), sub: value.slice(space + 1) };
}

// A line block under `cursor`: the reading's baseline, then the base text's baseline; and the height it takes.
function lineBlock(cursor, fontSize, readingFontSize) {
  const readingBaseline = cursor + readingFontSize;
  const baseline = readingBaseline + READING_GAP + fontSize;
  return { readingBaseline, baseline, bottom: baseline + fontSize * DESCENT_EM };
}

function plateGeometry(panel, top, height) {
  const at = (y, side) => (side === "left" ? panel.x + panel.skew * (1 - (y - panel.y) / panel.height) : panel.x + panel.width - (panel.skew * (y - panel.y)) / panel.height);
  const topY = panel.y + top;
  const bottomY = topY + height;
  return {
    top: topY,
    height,
    polygon: [
      { x: at(topY, "left"), y: topY },
      { x: at(topY, "right"), y: topY },
      { x: at(bottomY, "right"), y: bottomY },
      { x: at(bottomY, "left"), y: bottomY }
    ],
    // the room for text: inside both slanted edges over the whole height of the plate
    textLeft: at(topY, "left") + PLATE_EDGE + PLATE_INSET,
    textRight: at(bottomY, "right") - PLATE_INSET
  };
}

function layoutPortraits(casts, measure, theme) {
  const spec = PORTRAIT_SPECS[casts.length];
  const skew = PORTRAIT_HEIGHT * SKEW;
  const panels = casts.map((cast, index) => ({
    index,
    cast,
    color: hoColor(theme, index),
    x: MARGIN_X + spec.step * index,
    y: spec.ys[index],
    width: spec.width,
    height: PORTRAIT_HEIGHT,
    skew
  }));
  // the plates share their text width (the same panel width), so one common size fits everyone
  // (measured on the tallest one-line plate, which is the narrowest because of the slant)
  const probe = plateGeometry(panels[0], PLATE_TOP_ONE_LINE, lineBlock(PLATE_PAD + HO_ROW_HEIGHT + ROW_GAP, ONE_LINE_MAX_FONT, ONE_LINE_MAX_FONT * READING_SCALE).bottom + PLATE_PAD);
  const probeWidth = probe.textRight - probe.textLeft;
  const oneLine = panels.map(panel => computeNameLayout({
    handle: handleInner(panel.cast),
    handleReading: panel.cast.handleReading,
    name: panel.cast.name,
    nameReading: panel.cast.nameReading,
    measure: measureWith(measure, ROLE_BODY),
    readingMode: "space-around",
    minFontSize: 8,
    maxFontSize: ONE_LINE_MAX_FONT,
    left: 0,
    rightEdge: probeWidth
  }));
  const common = Math.min(...oneLine.map(item => item.fontSize));
  const twoLines = common < ONE_LINE_MIN_FONT;
  const body = measureWith(measure, ROLE_BODY);
  const nameFont = twoLines ? TWO_LINE_FONT : common;
  const readingFont = Math.round(nameFont * READING_SCALE * 10) / 10;

  let plateHeight;
  if (twoLines) {
    const first = lineBlock(PLATE_PAD + HO_ROW_HEIGHT + ROW_GAP, nameFont, readingFont);
    const second = lineBlock(first.bottom + ROW_GAP, nameFont, readingFont);
    plateHeight = second.bottom + PLATE_PAD;
  } else {
    plateHeight = lineBlock(PLATE_PAD + HO_ROW_HEIGHT + ROW_GAP, nameFont, readingFont).bottom + PLATE_PAD;
  }
  const plateTop = twoLines ? PLATE_TOP_TWO_LINE : PLATE_TOP_ONE_LINE;

  for (const panel of panels) {
    const cast = panel.cast;
    const plate = plateGeometry(panel, plateTop, plateHeight);
    const width = plate.textRight - plate.textLeft;
    const rows = { ho: { baseline: plate.top + PLATE_PAD + HO_ROW_HEIGHT - 5 } };
    if (twoLines) {
      const first = lineBlock(plate.top + PLATE_PAD + HO_ROW_HEIGHT + ROW_GAP, nameFont, readingFont);
      const second = lineBlock(first.bottom + ROW_GAP, nameFont, readingFont);
      const unit = (text, reading, line) => {
        // a line that is wider than the plate shrinks until it fits (never under 16px); 28px is the size otherwise
        let fontSize = nameFont;
        let result = computeRubyUnit({ text, reading, fontSize, measure: body, left: plate.textLeft });
        while (fontSize > 16 && result.width > width) {
          fontSize -= 1;
          result = computeRubyUnit({ text, reading, fontSize, measure: body, left: plate.textLeft });
        }
        return { fontSize, readingFontSize: result.readingFontSize, baseX: result.baseX, baseline: line.baseline, readingBaseline: line.readingBaseline, reading: result.reading };
      };
      rows.handle = cast.handle ? unit(cast.handle, cast.handleReading, first) : null;
      rows.name = unit(cast.name || "NO NAME", cast.nameReading, rows.handle ? second : first);
    } else {
      const block = lineBlock(plate.top + PLATE_PAD + HO_ROW_HEIGHT + ROW_GAP, nameFont, readingFont);
      const result = computeNameLayout({
        handle: handleInner(cast),
        handleReading: cast.handleReading,
        name: cast.name,
        nameReading: cast.nameReading,
        measure: body,
        readingMode: "space-around",
        minFontSize: nameFont,
        maxFontSize: nameFont,
        left: plate.textLeft,
        rightEdge: plate.textRight
      });
      rows.line = { ...result, baseline: block.baseline, readingBaseline: block.readingBaseline };
    }
    panel.plate = { ...plate, rows, mode: twoLines ? "two-lines" : "one-line" };
  }
  return { mode: "portraits", panels, nameMode: twoLines ? "two-lines" : "one-line", nameFontSize: nameFont };
}

function layoutRoster(casts, measure, theme) {
  const { columns, cardWidth, cardHeight, gapX, gapY, top, portraitWidth } = ROSTER;
  const body = measureWith(measure, ROLE_BODY);
  const panels = casts.map((cast, index) => ({
    index,
    cast,
    color: hoColor(theme, index),
    x: MARGIN_X + (index % columns) * (cardWidth + gapX),
    y: top + Math.floor(index / columns) * (cardHeight + gapY),
    width: cardWidth,
    height: cardHeight,
    portrait: { width: portraitWidth }
  }));
  const textLeft = panel => panel.x + portraitWidth + 14;
  const textRight = panel => panel.x + cardWidth - 12;
  const fits = panels.map(panel => computeNameLayout({
    handle: handleInner(panel.cast),
    handleReading: panel.cast.handleReading,
    name: panel.cast.name,
    nameReading: panel.cast.nameReading,
    measure: body,
    readingMode: "space-around",
    minFontSize: ROSTER_NAME_MIN_FONT,
    maxFontSize: ROSTER_NAME_MAX_FONT,
    left: textLeft(panel),
    rightEdge: textRight(panel)
  }));
  const fontSize = Math.min(...fits.map(item => item.fontSize));
  for (const panel of panels) {
    const result = computeNameLayout({
      handle: handleInner(panel.cast),
      handleReading: panel.cast.handleReading,
      name: panel.cast.name,
      nameReading: panel.cast.nameReading,
      measure: body,
      readingMode: "space-around",
      minFontSize: fontSize,
      maxFontSize: fontSize,
      left: textLeft(panel),
      rightEdge: textRight(panel)
    });
    const readingFont = result.readingFontSize;
    const block = lineBlock(panel.y + 96, fontSize, readingFont);
    panel.card = {
      textLeft: textLeft(panel),
      ho: { baseline: panel.y + 38 },
      line: { ...result, baseline: block.baseline, readingBaseline: block.readingBaseline }
    };
  }
  return { mode: "roster", panels, nameMode: "one-line", nameFontSize: fontSize };
}

function layoutCredits(model, measure) {
  const entries = [];
  if (model.rulerName) entries.push({ label: "RL", value: model.rulerName });
  if (model.writerName) entries.push({ label: "WRITER", value: model.writerName });
  if (!entries.length) return { items: [], fontSize: 0, baseline: 0 };
  const available = POSTER_WIDTH - MARGIN_X * 2;
  const chipPad = 10;
  const gap = 22;
  const widthAt = size => entries.reduce((sum, entry, index) => (
    sum + measure(entry.label, size * 0.62, 900, ROLE_BODY) + chipPad * 2 + 8 + measure(entry.value, size, 700, ROLE_BODY) + (index ? gap : 0)
  ), 0);
  let fontSize = 24;
  while (fontSize > 20 && widthAt(fontSize) > available) fontSize -= 1;
  let x = MARGIN_X;
  const items = entries.map(entry => {
    const labelSize = fontSize * 0.62;
    const chipWidth = measure(entry.label, labelSize, 900, ROLE_BODY) + chipPad * 2;
    const item = { ...entry, labelSize, chip: { x, width: chipWidth }, valueX: x + chipWidth + 8, valueWidth: measure(entry.value, fontSize, 700, ROLE_BODY) };
    x = item.valueX + item.valueWidth + gap;
    return item;
  });
  return { items, fontSize, baseline: 634 };
}

/**
 * @param {ReturnType<typeof buildPosterModel>} model
 * @param {(text: string, fontSize: number, weight?: number, role?: string) => number} measure - the width of a text; the role says which font family
 * @param {{theme?: {primary: string, secondary: string, accent: string}}} [options]
 */
export function layoutPoster(model, measure, { theme } = {}) {
  const casts = model.casts.slice(0, POSTER_MAX_CASTS);
  const composition = !casts.length ? { mode: "portraits", panels: [], nameMode: "one-line", nameFontSize: 0 }
    : casts.length <= 4 ? layoutPortraits(casts, measure, theme) : layoutRoster(casts, measure, theme);

  // the date, bottom right; the title shrinks until it does not touch it
  const dateParts = splitDate(model.dateText);
  const mainFit = fitRange(measure, dateParts.main, DATE_MAX_WIDTH, DATE_MAIN_MAX_FONT, DATE_MAIN_MIN_FONT, 24, 900, ROLE_NUMBER);
  const mainWidth = measure(dateParts.main, mainFit, 900, ROLE_NUMBER);
  const subWidth = dateParts.sub ? measure(dateParts.sub, DATE_SUB_FONT, 700, ROLE_NUMBER) : 0;
  const dateWidth = Math.max(mainWidth, subWidth);
  const dateLeft = RIGHT_EDGE - dateWidth;
  const date = {
    right: RIGHT_EDGE,
    left: dateLeft,
    width: dateWidth,
    main: { text: dateParts.main, fontSize: mainFit, baseline: 567 },
    sub: dateParts.sub ? { text: dateParts.sub, fontSize: DATE_SUB_FONT, baseline: 604 } : null
  };

  const leftColumn = Math.max(0, dateLeft - COLUMN_GAP - MARGIN_X);
  const titleSize = fitRange(measure, model.actName, leftColumn, TITLE_MAX_FONT, TITLE_PREFERRED_MIN_FONT, TITLE_FLOOR_FONT, 900, ROLE_TITLE);
  const title = { text: model.actName, x: MARGIN_X, baseline: 572, fontSize: titleSize, maxWidth: leftColumn };

  const subtitle = model.subtitle
    ? { text: model.subtitle, x: MARGIN_X, baseline: 600, fontSize: fitFont(measure, model.subtitle, leftColumn, 19, 12, 700, ROLE_BODY) }
    : null;

  const catchLetterSpacing = 0.34;
  let catchLine = null;
  if (model.catchCopy) {
    const widthAt = size => measure(model.catchCopy, size, 700, ROLE_BODY) + Math.max(0, Array.from(model.catchCopy).length - 1) * size * catchLetterSpacing;
    let size = 16;
    while (size > 11 && widthAt(size) > leftColumn) size -= 1;
    catchLine = { text: model.catchCopy, x: MARGIN_X, baseline: 512, fontSize: size, letterSpacingEm: catchLetterSpacing };
  }

  // the bottom row: the notice on the left, the copyright line right-aligned; the notice shrinks (down to the floor) only when the two do not fit
  const copyrightWidth = measure(model.copyrightNotice, RIGHTS_FONT, 700, ROLE_BODY);
  const noticeRoom = Math.max(0, POSTER_WIDTH - MARGIN_X * 2 - copyrightWidth - RIGHTS_GAP);
  const rights = {
    text: model.rightsNotice,
    x: MARGIN_X,
    baseline: 662,
    fontSize: fitFont(measure, model.rightsNotice, noticeRoom, RIGHTS_FONT, RIGHTS_FLOOR_FONT, 700, ROLE_BODY),
    copyright: { text: model.copyrightNotice, right: POSTER_WIDTH - MARGIN_X, baseline: 662, fontSize: RIGHTS_FONT }
  };

  return {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    ...composition,
    catchLine,
    title,
    subtitle,
    credits: layoutCredits(model, measure),
    date,
    rights
  };
}
