const SUPABASE_URL = "https://koprmbkoftuuffslhsvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dsb9Boo4aP3c_v-Iaam4mw_F1szMdUi";

const status = document.querySelector("#act-showcase-status");
const root = document.querySelector("#act-showcase-root");
const title = document.querySelector("#showcase-title");
const subtitle = document.querySelector("#showcase-subtitle");
const actName = document.querySelector("#showcase-act-name");
const ruler = document.querySelector("#showcase-ruler");
const intro = document.querySelector("#showcase-intro");
const navigation = document.querySelector("#showcase-navigation");
const casts = document.querySelector("#showcase-casts");

initialize();

async function initialize() {
  try {
    const slug = normalizeSlug(new URLSearchParams(location.search).get("id"));
    if (!slug) throw new Error("アクト識別名が指定されていません。");

    const data = await fetchPublicShowcase(slug);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("指定されたアクト紹介は公開されていません。公開画面から再度『アクト紹介を公開』してください。");
    }

    renderShowcase(data);
    status.hidden = true;
    root.hidden = false;
  } catch (error) {
    console.error(error);
    status.textContent = error?.message || "アクト紹介を読み込めませんでした。";
    status.classList.add("is-error");
  }
}

async function fetchPublicShowcase(slug) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_act_showcase`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ p_slug: slug }),
    cache: "no-store"
  });

  const responseText = await response.text();
  let payload = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === "object" && payload
      ? [payload.message, payload.hint, payload.details, payload.code].filter(Boolean).join(" / ")
      : String(payload || "");
    throw new Error(translateError({ message: detail, status: response.status }));
  }

  return payload;
}

function renderShowcase(data) {
  const pageTitle = text(data.pageTitle) || "ACT CAST FILE";
  document.title = pageTitle;
  const titleTextNode = [...title.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
  if (titleTextNode) titleTextNode.textContent = text(data.heroTitle) || pageTitle;
  subtitle.textContent = text(data.heroSubTitle) || "CAST SHOWCASE";
  actName.textContent = text(data.actName);

  const rulerName = text(data.rulerName);
  ruler.hidden = !rulerName;
  ruler.textContent = rulerName ? `RULER：${rulerName}` : "";

  const introText = text(data.intro);
  intro.hidden = !introText;
  intro.textContent = introText;

  const background = safeImageUrl(data.background);
  if (background) {
    document.body.style.backgroundImage = `linear-gradient(rgba(2,8,12,.58),rgba(2,8,12,.92)),url("${escapeCssString(background)}")`;
  }

  const castList = Array.isArray(data.casts) ? data.casts.slice(0, 6) : [];
  if (!castList.length) throw new Error("このアクト紹介には表示できるキャストがありません。");

  navigation.replaceChildren(...castList.map((item, index) => createNavigationItem(item, index)));
  casts.replaceChildren(...castList.map((item, index) => createCastCard(item, index)));
}

function createNavigationItem(item, index) {
  const anchor = document.createElement("a");
  anchor.href = `#cast-${index + 1}`;
  const number = document.createElement("span");
  number.textContent = String(index + 1).padStart(2, "0");
  anchor.append(number, text(item.fullName) || `CAST ${index + 1}`);
  return anchor;
}

function createCastCard(item, index) {
  const card = element("section", "cast-card");
  card.id = `cast-${index + 1}`;

  const imageWrap = element("div", "cast-card__image");
  const image = document.createElement("img");
  image.src = safeImageUrl(item.imageUrl) || "./assets/placeholders/scan-failed.webp";
  image.alt = text(item.imageAlt) || text(item.fullName);
  image.loading = "lazy";
  imageWrap.append(image);

  const body = element("div", "cast-card__body");
  body.append(paragraph("cast-card__slot", text(item.slot) || `CAST ${String(index + 1).padStart(2, "0")}`));

  if (text(item.reading)) body.append(paragraph("cast-card__reading", text(item.reading)));

  const name = element("h2", "cast-card__name");
  const allowedNameClasses = new Set(["cast-card__name--long", "cast-card__name--very-long"]);
  for (const className of Array.isArray(item.nameClass) ? item.nameClass : []) {
    if (allowedNameClasses.has(className)) name.classList.add(className);
  }
  name.textContent = text(item.fullName) || "名称未登録";
  body.append(name);

  const styles = Array.isArray(item.styles) ? item.styles : [];
  if (styles.length) {
    const styleWrap = element("div", "cast-card__styles");
    for (const styleData of styles) {
      const badge = element("span", "style");
      badge.style.setProperty("--style-color", safeColor(styleData.color));
      if (styleData.handoutRole === true) {
        badge.classList.add("style--handout-role");
        const label = element("small", "style__handout-role-label");
        label.textContent = "HANDOUT ROLE";
        badge.append(label);
      }
      badge.append(text(styleData.label));
      styleWrap.append(badge);
    }
    body.append(styleWrap);
  }

  const meta = Array.isArray(item.meta) ? item.meta.slice(0, 8) : [];
  if (meta.length) {
    const metaWrap = element("div", "cast-card__meta");
    for (const field of meta) {
      const box = document.createElement("div");
      const small = document.createElement("small");
      const strong = document.createElement("strong");
      small.textContent = text(field.label);
      strong.textContent = text(field.value) || "—";
      box.append(small, strong);
      metaWrap.append(box);
    }
    body.append(metaWrap);
  }

  if (text(item.tagline)) body.append(paragraph("cast-card__tagline", text(item.tagline)));

  if (item.handout && typeof item.handout === "object") {
    const details = element("details", "cast-card__handout");
    const summary = document.createElement("summary");
    const role = element("span", "cast-card__handout-role");
    role.textContent = text(item.handout.title) || "ハンドアウト";
    const action = element("span", "cast-card__handout-action");
    action.textContent = "OPEN HANDOUT";
    summary.append(role, action);
    const handoutBody = element("div", "cast-card__handout-body");
    handoutBody.textContent = text(item.handout.body) || "ハンドアウト詳細は未登録です。";
    details.append(summary, handoutBody);
    body.append(details);
  }

  if (item.link && typeof item.link === "object") {
    const label = text(item.link.text) || "OPEN CAST DATABASE →";
    const href = safeLinkUrl(item.link.href);
    if (!item.link.disabled && href) {
      const link = element("a", "cast-card__link");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = label;
      body.append(link);
    } else {
      const disabled = element("span", "cast-card__link cast-card__link--disabled");
      disabled.textContent = label;
      body.append(disabled);
    }
  }

  card.append(imageWrap, body, paragraph("cast-card__serial", text(item.serial) || "ScanFailed"));
  return card;
}

function element(tagName, className = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  return node;
}

function paragraph(className, value) {
  const node = element("p", className);
  node.textContent = value;
  return node;
}

function safeImageUrl(value) {
  const source = text(value);
  if (!source) return "";
  if (source.startsWith("data:image/")) return source;
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeLinkUrl(value) {
  const source = text(value);
  if (!source) return "";
  try {
    const url = new URL(source, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeColor(value) {
  const source = text(value);
  return /^#[0-9a-f]{3,8}$/i.test(source) ? source : "#00efff";
}

function escapeCssString(value) {
  return String(value).replace(/["\\\n\r]/g, character => ({ '"': '\\"', "\\": "\\\\", "\n": "", "\r": "" }[character]));
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function translateError(error) {
  const message = String(error?.message || "");
  if (/invalid jwt|jwt.*invalid|expected 3 parts/i.test(message)) {
    return "公開データ取得用の認証ヘッダーが不正でした。ページを再読み込みしてください。";
  }
  if (/get_public_act_showcase|function.*does not exist|schema cache|PGRST202/i.test(message)) {
    return "動的公開機能が未設定です。管理者がSupabaseの設定を確認してください。";
  }
  if (/permission denied|not authorized|401|403/i.test(`${error?.status || ""} ${message}`)) {
    return "公開アクト紹介の参照権限がありません。Supabaseの公開RPC権限を確認してください。";
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "公開データの取得に失敗しました。通信状態を確認して再読み込みしてください。";
  }
  return message || "アクト紹介を読み込めませんでした。";
}

function text(value) {
  return String(value ?? "").trim();
}