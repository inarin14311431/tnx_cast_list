// Measures the contrast of every visible text element on the current page: the element's real text colour
// (with opacity) against the background that is actually painted behind it.
//
// The background is not derived from CSS (gradients, images, pseudo-elements and stacked translucent layers
// make that unreliable). Instead all text is made transparent, the page is screenshotted, and the pixels
// under each text box are averaged. WCAG thresholds: 4.5:1 for normal text, 3:1 for large text
// (>= 24px, or >= 18.66px and bold).

// Text that is decorative, not information. Every entry is listed in the report of each run.
// Entries ending in ::before / ::after name generated content; the others name a DOM element and its text.
// Generated content made only of symbols (a "◆" or "•" bullet mark) is decorative as well, whatever its owner.
export const DECORATIVE_SELECTORS = [
  // Large faint watermark letters ("HO") behind the handout panel.
  ".poster-v2-panel--handout::before",
  ".poster-v2-panel--handout::after",
  // The "N◎VA" logo stamp in the corner of the summary header.
  ".neotokyo-sequence__summary-head::after"
];

export async function measureContrast(page, options = {}) {
  // A scroll-snap or smooth scroll can still be settling: measure again if the page moved mid-measurement.
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await measureOnce(page, options);
    } catch (error) {
      if (!/scrolled while/.test(String(error.message)) || attempt >= 3) throw error;
      await page.waitForTimeout(400);
    }
  }
}

async function measureOnce(page, { fullPage = false, excluded = DECORATIVE_SELECTORS } = {}) {
  // Same stabilisation as the visual baselines: no running animation or transition can change a colour
  // between reading it and photographing the background.
  const stabilizer = await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const scrollStart = await page.evaluate(() => scrollY);
  const items = await page.evaluate(({ excluded, fullPage }) => {
    const parseColor = value => {
      const match = String(value).match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const describe = element => {
      const parts = [];
      for (let node = element, depth = 0; node && node.nodeType === 1 && depth < 3; node = node.parentElement, depth += 1) {
        const cls = [...node.classList].slice(0, 2).join(".");
        parts.unshift(node.tagName.toLowerCase() + (cls ? `.${cls}` : ""));
      }
      return parts.join(" > ");
    };
    const effectiveOpacity = element => {
      let opacity = 1;
      for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      return opacity;
    };
    // The final board's cast frame fades in as a function of scroll position: text inside it is only a real,
    // settled state once the frame is fully opaque.
    // Sticky / fixed bars (the board's top bar) paint over text that scrolls beneath them.
    const overlays = [...document.querySelectorAll("*")]
      .filter(node => ["fixed", "sticky"].includes(getComputedStyle(node).position))
      .map(node => ({ node, box: node.getBoundingClientRect() }))
      .filter(entry => entry.box.width > 0 && entry.box.height > 0 && getComputedStyle(entry.node).visibility !== "hidden" && Number(getComputedStyle(entry.node).opacity) > 0.5);
    const frame = document.querySelector(".poster-v2-frame");
    const frameFade = frame ? Number(frame.style.getPropertyValue("--poster-v2-frame-opacity") || 1) : 1;
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
      const text = (textNode.nodeValue || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const element = textNode.parentElement;
      if (!element || seen.has(element) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) continue;
      seen.add(element);
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const opacity = effectiveOpacity(element);
      if (opacity < 0.05) continue;
      if (frameFade < 0.99 && element.closest(".poster-v2-frame")) continue;
      // The hero line above the board fades out as the page scrolls: only its unscrolled state is a real scene.
      if (scrollY > 2 && element.closest(".scene-opening")) continue;
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const rect = range.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      // A viewport shot can only see what is inside the viewport: skip text that is (mostly) outside it.
      if (!fullPage) {
        const visibleW = Math.min(rect.right, innerWidth) - Math.max(rect.left, 0);
        const visibleH = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
        if (visibleW <= 0 || visibleH <= 0 || (visibleW * visibleH) / (rect.width * rect.height) < 0.6) continue;
      }
      // Clipped away by an ancestor (overflow hidden / zero-size boxes) means it is not visible.
      let clipped = false;
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        const s = getComputedStyle(node);
        if (s.overflow !== "visible" || s.clipPath !== "none") {
          const box = node.getBoundingClientRect();
          if (rect.right <= box.left || rect.left >= box.right || rect.bottom <= box.top || rect.top >= box.bottom) { clipped = true; break; }
        }
      }
      if (clipped) continue;
      // Covered by another element (a sticky bar, an overlay): not visible, so not measurable.
      const probe = (x, y) => {
        const hit = document.elementFromPoint(x, y);
        return !hit || element.contains(hit) || hit.contains(element);
      };
      const cx = Math.min(Math.max(rect.left + rect.width / 2, 1), innerWidth - 1);
      const cy = Math.min(Math.max(rect.top + rect.height / 2, 1), innerHeight - 1);
      if (!probe(cx, cy)) continue;
      if (overlays.some(({ node, box }) => !node.contains(element) && !element.contains(node)
        && cx > box.left && cx < box.right && cy > box.top && cy < box.bottom
        && getComputedStyle(node).backgroundColor !== "rgba(0, 0, 0, 0)")) continue;
      const backdrop = [];
      for (let node = element; node && node !== document.documentElement && backdrop.length < 3; node = node.parentElement) {
        const cs = getComputedStyle(node);
        const hasBg = (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") || cs.backgroundImage !== "none";
        if (hasBg) backdrop.push(`${node.tagName.toLowerCase()}.${[...node.classList].slice(0, 2).join(".")} ${cs.backgroundColor}${cs.backgroundImage !== "none" ? " +image" : ""}`);
      }
      let color = parseColor(style.webkitTextFillColor && style.webkitTextFillColor !== "rgba(0, 0, 0, 0)" ? style.webkitTextFillColor : style.color);
      const transparentFill = style.webkitTextFillColor === "rgba(0, 0, 0, 0)" || style.webkitTextFillColor === "transparent";
      const selector = describe(element);
      if (excluded.some(entry => !entry.includes("::") && (element.matches(entry) || element.closest(entry)))) { results.push({ selector, text: text.slice(0, 40), excluded: true }); continue; }
      if (transparentFill || !color) { results.push({ selector, text: text.slice(0, 40), skipped: "gradient or transparent fill" }); continue; }
      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      results.push({
        selector,
        text: text.slice(0, 40),
        backdrop,
        color: { ...color, a: color.a * opacity },
        size,
        weight,
        large: size >= 24 || (size >= 18.66 && weight >= 700),
        // Viewport shots use viewport coordinates; full-page shots use document coordinates.
        rect: fullPage
          ? { x: rect.left + scrollX, y: rect.top + scrollY, w: rect.width, h: rect.height }
          : { x: Math.max(rect.left, 0), y: Math.max(rect.top, 0), w: Math.min(rect.right, innerWidth) - Math.max(rect.left, 0), h: Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0) }
      });
    }
    return results;
  }, { excluded, fullPage });

  items.push(...await collectPseudoItems(page, { fullPage, excluded }));
  const measurable = items.filter(item => item.rect);
  if (!measurable.length) {
    await stabilizer.evaluate(node => node.remove());
    return { items: [], failures: [], excluded: items.filter(i => i.excluded), skipped: items.filter(i => i.skipped) };
  }

  // Hide every glyph, then photograph what is painted behind the text.
  const hider = await page.addStyleTag({ content: "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}" });
  const png = await page.screenshot({ fullPage, animations: "disabled" });
  const scrollAfter = await page.evaluate(() => scrollY);
  await hider.evaluate(node => node.remove());
  await stabilizer.evaluate(node => node.remove());
  if (scrollAfter !== scrollStart) throw new Error("the page scrolled while its background was being photographed");
  const backgrounds = await page.evaluate(async ({ base64, rects }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return rects.map(rect => {
      const x = Math.max(0, Math.floor(rect.x)), y = Math.max(0, Math.floor(rect.y));
      const w = Math.min(canvas.width - x, Math.ceil(rect.w)), h = Math.min(canvas.height - y, Math.ceil(rect.h));
      if (w < 1 || h < 1) return null;
      const data = context.getImageData(x, y, w, h).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count += 1; }
      return { r: r / count, g: g / count, b: b / count };
    });
  }, { base64: png.toString("base64"), rects: measurable.map(item => item.rect) });

  const channel = value => { const v = value / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const luminance = c => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  const failures = [];
  measurable.forEach((item, index) => {
    const bg = backgrounds[index];
    if (!bg) return;
    const a = item.color.a;
    const fg = { r: item.color.r * a + bg.r * (1 - a), g: item.color.g * a + bg.g * (1 - a), b: item.color.b * a + bg.b * (1 - a) };
    const l1 = luminance(fg), l2 = luminance(bg);
    item.ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    item.required = item.large ? 3 : 4.5;
    item.bg = `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`;
    item.fg = `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`;
    if (item.ratio < item.required) failures.push(item);
  });
  return { items: measurable, failures, excluded: items.filter(i => i.excluded), skipped: items.filter(i => i.skipped) };
}

// Text written with `content: "..."` on ::before / ::after is not a DOM text node. Its colour comes from
// getComputedStyle(el, pseudo); its box only exists in the layout tree, so it is read through CDP.
async function collectPseudoItems(page, { fullPage, excluded }) {
  const candidates = await page.evaluate(({ excluded }) => {
    const unquote = value => {
      const match = String(value).match(/^"((?:[^"\\]|\\.)*)"$/);
      if (!match) return "";
      return match[1].replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
    };
    const parseColor = value => {
      const match = String(value).match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const frame = document.querySelector(".poster-v2-frame");
    const frameFade = frame ? Number(frame.style.getPropertyValue("--poster-v2-frame-opacity") || 1) : 1;
    const out = [];
    let id = 0;
    for (const element of document.body.querySelectorAll("*")) {
      for (const pseudo of ["::before", "::after"]) {
        const style = getComputedStyle(element, pseudo);
        const text = unquote(style.content);
        if (!text || style.display === "none" || style.visibility === "hidden") continue;
        let opacity = Number(style.opacity);
        for (let node = element; node && node.nodeType === 1; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
        if (opacity < 0.05) continue;
        if (frameFade < 0.99 && element.closest(".poster-v2-frame")) continue;
        if (scrollY > 2 && element.closest(".scene-opening")) continue;
        const fill = style.webkitTextFillColor;
        const transparentFill = fill === "rgba(0, 0, 0, 0)" || fill === "transparent";
        const color = parseColor(fill && !transparentFill ? fill : style.color);
        const owner = [];
        for (let node = element, depth = 0; node && node.nodeType === 1 && depth < 3; node = node.parentElement, depth += 1) {
          const cls = [...node.classList].slice(0, 2).join(".");
          owner.unshift(node.tagName.toLowerCase() + (cls ? `.${cls}` : ""));
        }
        const selector = `${owner.join(" > ")}${pseudo}`;
        const decorativeEntry = excluded.some(entry => entry.endsWith(pseudo) && element.matches(entry.slice(0, -pseudo.length)));
        const symbolOnly = !/[\p{L}\p{N}]/u.test(text);
        if (decorativeEntry || symbolOnly) { out.push({ selector, text: text.slice(0, 40), excluded: true }); continue; }
        if (transparentFill || !color) { out.push({ selector, text: text.slice(0, 40), skipped: "gradient or transparent fill" }); continue; }
        const key = `cx-${id++}`;
        element.setAttribute("data-cx-pseudo", `${element.getAttribute("data-cx-pseudo") || ""} ${key}${pseudo}`.trim());
        out.push({
          key, pseudo, selector, text: text.slice(0, 40),
          color: { ...color, a: color.a * opacity },
          size: parseFloat(style.fontSize),
          weight: Number(style.fontWeight) || 400
        });
      }
    }
    return out;
  }, { excluded });
  const real = candidates.filter(item => item.key);
  if (!real.length) return candidates.filter(item => !item.key);

  const client = await page.context().newCDPSession(page);
  const boxes = new Map();
  try {
    await client.send("DOM.enable");
    const { root } = await client.send("DOM.getDocument", { depth: -1 });
    const walk = async node => {
      const attributes = node.attributes || [];
      const index = attributes.indexOf("data-cx-pseudo");
      if (index >= 0) {
        for (const token of attributes[index + 1].split(" ")) {
          const [key, pseudo] = [token.slice(0, token.indexOf("::")), token.slice(token.indexOf("::") + 2)];
          const wanted = pseudo === "before" ? "before" : "after";
          const pseudoNode = (node.pseudoElements || []).find(entry => entry.pseudoType === wanted);
          if (!pseudoNode) continue;
          try {
            const { model } = await client.send("DOM.getBoxModel", { nodeId: pseudoNode.nodeId });
            const xs = [model.content[0], model.content[2], model.content[4], model.content[6]];
            const ys = [model.content[1], model.content[3], model.content[5], model.content[7]];
            boxes.set(key, { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
          } catch { /* not rendered */ }
        }
      }
      for (const child of [...(node.children || []), ...(node.contentDocument ? [node.contentDocument] : [])]) await walk(child);
    };
    await walk(root);
  } finally {
    await client.detach().catch(() => {});
  }

  // Drop the markers, then keep the boxes that are really visible: inside the viewport and not covered.
  const keys = real.map(item => item.key);
  const visible = await page.evaluate(({ keys, boxes, fullPage }) => {
    const result = {};
    for (const element of document.querySelectorAll("[data-cx-pseudo]")) element.removeAttribute("data-cx-pseudo");
    for (const key of keys) {
      const box = boxes[key];
      if (!box || box.w < 2 || box.h < 2) continue;
      if (fullPage) { result[key] = { x: box.x + scrollX, y: box.y + scrollY, w: box.w, h: box.h }; continue; }
      const visibleW = Math.min(box.x + box.w, innerWidth) - Math.max(box.x, 0);
      const visibleH = Math.min(box.y + box.h, innerHeight) - Math.max(box.y, 0);
      if (visibleW <= 0 || visibleH <= 0 || (visibleW * visibleH) / (box.w * box.h) < 0.6) continue;
      result[key] = { x: Math.max(box.x, 0), y: Math.max(box.y, 0), w: visibleW, h: visibleH };
    }
    return result;
  }, { keys, boxes: Object.fromEntries(boxes), fullPage });

  const measured = [];
  for (const item of real) {
    const rect = visible[item.key];
    if (!rect) continue;
    measured.push({ selector: item.selector, text: item.text, color: item.color, size: item.size, weight: item.weight,
      large: item.size >= 24 || (item.size >= 18.66 && item.weight >= 700), rect, backdrop: [] });
  }
  return [...candidates.filter(item => !item.key), ...measured];
}

export function formatFailure(item) {
  return `${item.ratio.toFixed(2)}:1 < ${item.required}:1  ${item.fg} on ${item.bg}  ${item.size}px/${item.weight}  [${item.selector}]  "${item.text}"  {${(item.backdrop || []).join(" | ")}}`;
}
