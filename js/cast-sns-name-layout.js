/* Pure layout for the SNS card's name block: handle "quote" + gap + name, each with an
 * optional reading centered above it, matching the viewer hero's ruby styling
 * (rt font-size ~0.44x, letter-spacing .2em, ~6px gap) without using real <ruby> markup,
 * since the card is drawn as an SVG rasterized to a canvas.
 */
export const CARD_NAME_LEFT = 530;
export const CARD_RIGHT_EDGE = 1135;
export const OPEN_QUOTE = "“";
export const CLOSE_QUOTE = "”";
export const READING_SCALE = 0.44;
export const READING_LETTER_SPACING_EM = 0.2;
export const READING_GAP = 6;
export const NAME_GAP_EM = 0.45;
export const MIN_NAME_FONT_SIZE = 18;
export const MAX_NAME_FONT_SIZE = 34;

/* Full-width characters measure as 1em, everything else (ASCII, half-width) as .55em. Used
 * where no canvas is available (Node tests, or a browser without 2D canvas support). */
export function approximateTextWidth(text, fontSize) {
  let width = 0;
  for (const ch of String(text ?? "")) {
    width += fontSize * (/[^\x00-\xff]/.test(ch) ? 1 : 0.55);
  }
  return width;
}

export function createCanvasMeasurer(fontFamily = "sans-serif") {
  if (typeof document === "undefined" || typeof document.createElement !== "function") return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return null;
  return (text, fontSize, weight = 400) => {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    return ctx.measureText(String(text ?? "")).width;
  };
}

function letterSpacedWidth(text, baseWidth, fontSize, spacingEm) {
  const count = Array.from(String(text ?? "")).length;
  return baseWidth + Math.max(0, count - 1) * fontSize * spacingEm;
}

function shiftBox(box, delta) {
  box.left += delta;
  box.right += delta;
  box.centerX += delta;
}

/* One base text with its reading above it, laid out like CSS `ruby-align: space-around` (the cast view's ruby): the reading has a
 * letter spacing of .2em and the size READING_SCALE of the base. A reading narrower than the base is spread over the whole base width
 * with equal room around each letter (half of it at both ends); a reading wider than the base keeps its natural width and the base is
 * centered in it (room added left and right of the base). Pure: `measure` is injected (a canvas measurer, or approximateTextWidth).
 * Returns the unit's box ({left, width}), where the base text starts (baseX) and, when there is a reading, its letters one by one
 * (glyphs: [{char, x}], x = left edge of each letter) so a canvas can draw them without any text-align or letter-spacing support. */
export function computeRubyUnit({ text, reading, fontSize, measure = approximateTextWidth, left = 0 }) {
  const base = String(text ?? "");
  const baseWidth = base ? measure(base, fontSize, 700) : 0;
  const readingFontSize = Math.round(fontSize * READING_SCALE * 10) / 10;
  const readingText = String(reading ?? "").trim();
  if (!readingText) return { left, width: baseWidth, baseX: left, baseWidth, readingFontSize, reading: null };
  const chars = Array.from(readingText);
  const advances = chars.map(char => measure(char, readingFontSize, 700));
  const spacing = readingFontSize * READING_LETTER_SPACING_EM;
  const natural = advances.reduce((sum, advance) => sum + advance, 0) + Math.max(0, chars.length - 1) * spacing;
  const glyphs = [];
  if (natural <= baseWidth) {
    const room = (baseWidth - natural) / chars.length;
    let x = left + room / 2;
    chars.forEach((char, index) => {
      glyphs.push({ char, x });
      x += advances[index] + spacing + room;
    });
    return { left, width: baseWidth, baseX: left, baseWidth, readingFontSize, reading: { left, width: baseWidth, glyphs, spread: true } };
  }
  let x = left;
  chars.forEach((char, index) => {
    glyphs.push({ char, x });
    x += advances[index] + spacing;
  });
  return {
    left,
    width: natural,
    baseX: left + (natural - baseWidth) / 2,
    baseWidth,
    readingFontSize,
    reading: { left, width: natural, glyphs, spread: false }
  };
}

function computeSpaceAroundNameLayout({ handle, handleReading, name, nameReading, measure, minFontSize, maxFontSize, left, rightEdge }) {
  const handleInner = String(handle ?? "").trim();
  const nameText = String(name ?? "").trim() || "NO NAME";
  const handleText = handleInner ? `${OPEN_QUOTE}${handleInner}${CLOSE_QUOTE}` : "";
  const maxWidth = rightEdge - left;
  const unitsAt = fontSize => {
    const handleUnit = handleText ? computeRubyUnit({ text: handleText, reading: handleReading, fontSize, measure, left }) : null;
    const gap = handleUnit ? fontSize * NAME_GAP_EM : 0;
    const nameLeft = left + (handleUnit ? handleUnit.width + gap : 0);
    const nameUnit = computeRubyUnit({ text: nameText, reading: nameReading, fontSize, measure, left: nameLeft });
    return { handleUnit, nameUnit, total: nameLeft + nameUnit.width - left };
  };
  let fontSize = maxFontSize;
  while (fontSize > minFontSize && unitsAt(fontSize).total > maxWidth) fontSize -= 1;
  const { handleUnit, nameUnit, total } = unitsAt(fontSize);
  return {
    fontSize,
    readingFontSize: nameUnit.readingFontSize,
    handle: handleUnit && { x: handleUnit.baseX, quotedWidth: handleUnit.baseWidth, width: handleUnit.baseWidth },
    name: { x: nameUnit.baseX, width: nameUnit.baseWidth },
    handleReading: handleUnit?.reading ?? null,
    nameReading: nameUnit.reading,
    totalWidth: total,
    fits: total <= maxWidth
  };
}

/**
 * @param {object} options
 * @param {string} options.handle - handle text, quotes already stripped by the caller.
 * @param {string} [options.handleReading]
 * @param {string} options.name
 * @param {string} [options.nameReading]
 * @param {(text: string, fontSize: number, weight?: number) => number} [options.measure]
 * @param {"center"|"space-around"} [options.readingMode]
 */
export function computeNameLayout({
  handle,
  handleReading,
  name,
  nameReading,
  measure = approximateTextWidth,
  minFontSize = MIN_NAME_FONT_SIZE,
  maxFontSize = MAX_NAME_FONT_SIZE,
  left = CARD_NAME_LEFT,
  rightEdge = CARD_RIGHT_EDGE,
  // "center" (the SNS card): a reading is centered over its base and pushed back inside the bounds. "space-around" (the act poster):
  // see computeRubyUnit. The default keeps every existing caller exactly as it was.
  readingMode = "center"
}) {
  if (readingMode === "space-around") {
    return computeSpaceAroundNameLayout({ handle, handleReading, name, nameReading, measure, minFontSize, maxFontSize, left, rightEdge });
  }
  const handleInner = String(handle ?? "").trim();
  const nameText = String(name ?? "").trim() || "NO NAME";
  const maxWidth = rightEdge - left;

  const quotedHandleWidth = fontSize => handleInner
    ? measure(OPEN_QUOTE, fontSize, 700) + measure(handleInner, fontSize, 700) + measure(CLOSE_QUOTE, fontSize, 700)
    : 0;
  const gapAt = fontSize => (handleInner ? fontSize * NAME_GAP_EM : 0);
  const widthAt = fontSize => quotedHandleWidth(fontSize) + gapAt(fontSize) + measure(nameText, fontSize, 700);

  let fontSize = maxFontSize;
  while (fontSize > minFontSize && widthAt(fontSize) > maxWidth) fontSize -= 1;

  const readingFontSize = Math.round(fontSize * READING_SCALE * 10) / 10;

  let cursorX = left;
  let handleBox = null;
  if (handleInner) {
    const openW = measure(OPEN_QUOTE, fontSize, 700);
    const innerW = measure(handleInner, fontSize, 700);
    const closeW = measure(CLOSE_QUOTE, fontSize, 700);
    handleBox = {
      x: cursorX,
      quotedWidth: openW + innerW + closeW,
      innerX: cursorX + openW,
      innerWidth: innerW,
      innerCenterX: cursorX + openW + innerW / 2
    };
    cursorX += openW + innerW + closeW + gapAt(fontSize);
  }

  const nameWidth = measure(nameText, fontSize, 700);
  const nameBox = { x: cursorX, width: nameWidth, centerX: cursorX + nameWidth / 2 };

  const trimmedHandleReading = String(handleReading ?? "").trim();
  const trimmedNameReading = String(nameReading ?? "").trim();

  let handleReadingBox = null;
  if (handleBox && trimmedHandleReading) {
    const raw = measure(trimmedHandleReading, readingFontSize, 700);
    const w = letterSpacedWidth(trimmedHandleReading, raw, readingFontSize, READING_LETTER_SPACING_EM);
    handleReadingBox = { centerX: handleBox.innerCenterX, width: w, left: handleBox.innerCenterX - w / 2, right: handleBox.innerCenterX + w / 2 };
  }

  let nameReadingBox = null;
  if (trimmedNameReading) {
    const raw = measure(trimmedNameReading, readingFontSize, 700);
    const w = letterSpacedWidth(trimmedNameReading, raw, readingFontSize, READING_LETTER_SPACING_EM);
    nameReadingBox = { centerX: nameBox.centerX, width: w, left: nameBox.centerX - w / 2, right: nameBox.centerX + w / 2 };
  }

  const minGap = readingFontSize * 0.3;
  const clampToBounds = box => {
    if (!box) return;
    if (box.left < left) shiftBox(box, left - box.left);
    if (box.right > rightEdge) shiftBox(box, rightEdge - box.right);
  };
  /* The handle's reading always sits left of the name's, so bounds-clamp the handle
   * reading first (it cannot move further), then push the name reading clear of it -
   * an overlap can only be resolved by moving the later box, since the earlier one may
   * already be pinned against the card's left edge. Re-clamp the name reading afterward
   * in case that push carried it past the right edge. */
  clampToBounds(handleReadingBox);
  clampToBounds(nameReadingBox);
  if (handleReadingBox && nameReadingBox) {
    const overlap = handleReadingBox.right + minGap - nameReadingBox.left;
    if (overlap > 0) shiftBox(nameReadingBox, overlap);
  }
  clampToBounds(nameReadingBox);

  return {
    fontSize,
    readingFontSize,
    handle: handleBox,
    name: nameBox,
    handleReading: handleReadingBox,
    nameReading: nameReadingBox,
    totalWidth: cursorX + nameWidth - left
  };
}
