const preview = document.querySelector("#showcase-preview");
const themeField = document.querySelector("#showcase-theme");

const OUTPUT_MARKER = "dedicated-standard-v4";
const STYLE_PATHS = [
  "../css-next/pages/act-showcase-standard.css?v=3",
  "../css-next/pages/act-showcase-standard-hotfix.css?v=2",
  "../css-next/pages/act-showcase-dedicated-themes.css?v=1",
  "../css-next/pages/act-showcase-theme-surface-system.css?v=1",
  "../css-next/pages/act-showcase-theme-legibility.css?v=1"
];
let cssPromise = null;
let rewriting = false;

preview?.addEventListener("load", () => {
  if (rewriting) return;
  void synchronizeGeneratedOutput();
});

async function synchronizeGeneratedOutput() {
  if (!preview) return;
  const source = String(preview.srcdoc || "").trim();
  if (!source) return;

  const doc = new DOMParser().parseFromString(source, "text/html");
  if (doc.documentElement.dataset.showcaseOutput === OUTPUT_MARKER) return;

  const css = await loadStandardCss();
  if (!css) return;

  const oldStyleText = [...doc.querySelectorAll("style")]
    .map(node => node.textContent || "")
    .join("\n");
  const background = extractBackgroundUrl(oldStyleText) || extractInlineBackgroundUrl(doc.body?.style?.backgroundImage);

  doc.documentElement.dataset.showcaseTheme = normalizeTheme(themeField?.value);
  doc.documentElement.dataset.showcaseOutput = OUTPUT_MARKER;

  const body = doc.body;
  body.id = "act-showcase-standard-page";
  body.removeAttribute("class");
  if (background) {
    body.style.backgroundImage = `linear-gradient(rgba(var(--showcase-bg-rgb,2,7,11),.58),rgba(var(--showcase-bg-rgb,2,7,11),.92)),url("${escapeCssString(background)}")`;
  } else {
    body.style.removeProperty("background-image");
  }

  doc.querySelectorAll("style").forEach(node => node.remove());
  doc.head.insertAdjacentHTML(
    "beforeend",
    `<style data-showcase-standard-source="true">${escapeStyleText(css)}</style>`
  );
  if (background) {
    doc.head.insertAdjacentHTML(
      "beforeend",
      `<style data-showcase-background-source="true">body{background-image:url("${escapeCssString(background)}")}</style>`
    );
  }

  normalizeStandardStructure(doc);

  rewriting = true;
  preview.srcdoc = `<!doctype html>\n${doc.documentElement.outerHTML}`;
  queueMicrotask(() => { rewriting = false; });
}

function normalizeStandardStructure(doc) {
  const body = doc.body;
  let root = doc.getElementById("act-showcase-standard-root");
  if (!root) {
    root = doc.createElement("div");
    root.id = "act-showcase-standard-root";
    while (body.firstChild) root.append(body.firstChild);
    body.append(root);
  }
  root.removeAttribute("hidden");

  const hero = root.querySelector("header.hero");
  if (hero) {
    const content = hero.firstElementChild;
    if (content) content.classList.add("hero__content");
    if (!hero.querySelector(".hero__scroll-cue")) {
      const cue = doc.createElement("div");
      cue.className = "hero__scroll-cue";
      cue.setAttribute("aria-hidden", "true");
      cue.innerHTML = "<span>SCROLL TO CAST</span><i></i>";
      hero.append(cue);
    }
  }

  const main = root.querySelector("main.cast-list");
  const footer = root.querySelector("footer.footer");
  if (main && !root.querySelector(".showcase-end")) {
    const end = doc.createElement("section");
    end.className = "showcase-end wrap";
    end.setAttribute("aria-label", "キャスト紹介終了");
    end.innerHTML = "<p>END OF CAST FILE</p><strong>THE ACT BEGINS NOW</strong>";
    if (footer) root.insertBefore(end, footer);
    else main.after(end);
  }
}

function loadStandardCss() {
  if (!cssPromise) {
    cssPromise = Promise.all(STYLE_PATHS.map(async path => {
      const response = await fetch(new URL(path, import.meta.url), { cache: "no-cache" });
      if (!response.ok) throw new Error(`showcase CSS load failed: ${response.status}`);
      return response.text();
    })).then(parts => parts.join("\n\n")).catch(error => {
      console.error("Dedicated showcase CSS could not be loaded for generated HTML.", error);
      return "";
    });
  }
  return cssPromise;
}

function normalizeTheme(value) {
  const id = String(value || "").trim().toLowerCase();
  return ["nova", "intron", "vlad", "lutetia"].includes(id) ? id : "nova";
}

function extractBackgroundUrl(styleText) {
  const bodyRule = String(styleText || "").match(/body\s*\{[^}]*background-image\s*:[^;}]*url\((['"]?)(.*?)\1\)/is);
  return bodyRule?.[2] || "";
}

function extractInlineBackgroundUrl(value) {
  const match = String(value || "").match(/url\((['"]?)(.*?)\1\)/is);
  return match?.[2] || "";
}

function escapeCssString(value) {
  return String(value || "").replace(/["\\\n\r]/g, character => ({
    '"': '\\"',
    "\\": "\\\\",
    "\n": "",
    "\r": ""
  }[character]));
}

function escapeStyleText(value) {
  return String(value || "").replace(/<\/style/gi, "<\\/style");
}
