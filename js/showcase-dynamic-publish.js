import { supabase } from "./supabase-client.js";

const publishButton = document.querySelector("#publish-button");
const preview = document.querySelector("#showcase-preview");
const status = document.querySelector("#generator-status");
const slugField = document.querySelector("#publish-slug");
const actNameField = document.querySelector("#act-name");
const rulerField = document.querySelector("#ruler-name");
const MAX_SHOWCASE_BYTES = 500 * 1024;
const TARGET_BACKGROUND_BYTES = 300 * 1024;
let publishing = false;

publishButton?.addEventListener("click", publishDynamicShowcase, true);

async function publishDynamicShowcase(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (publishing) return;

  try {
    const source = String(preview?.srcdoc || "").trim();
    if (!source) throw new Error("先にHTMLを生成してください。");

    const privateRows = document.querySelectorAll('#selected-casts [data-visibility="private"]');
    if (privateRows.length) {
      throw new Error("非公開キャストを含むアクト紹介は公開できません。非公開キャストを外して再生成してください。");
    }

    const participantIds = [...document.querySelectorAll('#selected-casts [data-character-id][data-visibility="public"]')]
      .map(row => row.dataset.characterId)
      .filter(Boolean);
    if (!participantIds.length) {
      throw new Error("アクト紹介を公開するには、公開キャストを1名以上選択してください。");
    }

    const slug = normalizeSlug(slugField?.value);
    if (!slug) throw new Error("アクト識別名を半角英数字とハイフンで入力してください。");

    publishing = true;
    publishButton.disabled = true;
    setStatus("公開用データを準備中…");

    const showcaseData = await extractShowcaseData(source);
    const actName = String(actNameField?.value || showcaseData.actName || slug).trim();
    const rulerName = String(rulerField?.value || showcaseData.rulerName || "").trim();

    const payloadBytes = getJsonByteLength(showcaseData);
    if (payloadBytes > MAX_SHOWCASE_BYTES) {
      throw new Error(`公開データが大きすぎます（${formatBytes(payloadBytes)}）。背景画像URLを使用するか、背景画像を小さくして再生成してください。`);
    }

    setStatus("アクト紹介データと参加履歴を公開中…");
    const { data: actId, error } = await supabase.rpc("publish_act_showcase_for_current_user", {
      p_slug: slug,
      p_act_name: actName,
      p_ruler_name: rulerName,
      p_showcase_data: showcaseData,
      p_participant_ids: [...new Set(participantIds)]
    });
    if (error) throw new Error(translateError(error));
    if (!actId) throw new Error("公開したアクト紹介を確認できませんでした。");

    const publicUrl = new URL(`./act-showcase.html?id=${encodeURIComponent(slug)}`, location.href).href;
    setStatus(`公開処理が完了しました。参加アクト履歴にも反映しました。 <a href="${escapeAttribute(publicUrl)}" target="_blank" rel="noopener">公開ページを開く</a>`, "success", true);
  } catch (error) {
    console.error(error);
    setStatus(error?.message || "アクト紹介の公開に失敗しました。", "error");
  } finally {
    publishing = false;
    if (publishButton) publishButton.disabled = !String(preview?.srcdoc || "").trim();
  }
}

async function extractShowcaseData(source) {
  const doc = new DOMParser().parseFromString(source, "text/html");
  const styleText = [...doc.querySelectorAll("style")].map(node => node.textContent || "").join("\n");
  let background = extractBackgroundUrl(styleText);
  if (background.startsWith("data:image/")) {
    setStatus("背景画像を公開用に圧縮中…");
    background = await compressBackgroundDataUrl(background);
  }

  const cards = [...doc.querySelectorAll(".cast-card")].map(card => {
    const meta = [...card.querySelectorAll(".cast-card__meta > div")].map(item => ({
      label: item.querySelector("small")?.textContent?.trim() || "",
      value: item.querySelector("strong")?.textContent?.trim() || ""
    }));
    const handout = card.querySelector(".cast-card__handout");
    const link = card.querySelector(".cast-card__link");
    return {
      imageUrl: card.querySelector(".cast-card__image img")?.getAttribute("src") || "./assets/placeholders/scan-failed.webp",
      imageAlt: card.querySelector(".cast-card__image img")?.getAttribute("alt") || "",
      slot: card.querySelector(".cast-card__slot")?.textContent?.trim() || "",
      reading: card.querySelector(".cast-card__reading")?.textContent?.trim() || "",
      fullName: card.querySelector(".cast-card__name")?.textContent?.trim() || "",
      nameClass: [...(card.querySelector(".cast-card__name")?.classList || [])].filter(name => name !== "cast-card__name"),
      styles: [...card.querySelectorAll(".cast-card__styles .style")].map(style => ({
        label: style.textContent?.replace("HANDOUT ROLE", "").trim() || "",
        color: style.style.getPropertyValue("--style-color") || "#00efff",
        handoutRole: style.classList.contains("style--handout-role")
      })),
      meta,
      tagline: card.querySelector(".cast-card__tagline")?.textContent?.trim() || "",
      handout: handout ? {
        title: handout.querySelector(".cast-card__handout-role")?.textContent?.trim() || "",
        body: handout.querySelector(".cast-card__handout-body")?.textContent || ""
      } : null,
      link: link ? {
        href: link.tagName === "A" ? link.getAttribute("href") || "" : "",
        text: link.textContent?.trim() || "",
        disabled: link.tagName !== "A"
      } : null,
      serial: card.querySelector(".cast-card__serial")?.textContent?.trim() || ""
    };
  });

  if (!cards.length) throw new Error("生成済みHTMLからキャスト情報を取得できませんでした。");

  return {
    version: 1,
    pageTitle: doc.querySelector("title")?.textContent?.trim() || "ACT CAST FILE",
    heroTitle: doc.querySelector(".hero h1")?.childNodes?.[0]?.textContent?.trim() || "ACT CAST FILE",
    heroSubTitle: doc.querySelector(".hero h1 span")?.textContent?.trim() || "CAST SHOWCASE",
    actName: doc.querySelector(".hero__act")?.textContent?.trim() || "",
    rulerName: (doc.querySelector(".hero__ruler")?.textContent || "").replace(/^RULER[：:]\s*/i, "").trim(),
    intro: doc.querySelector(".hero__intro")?.textContent || "",
    background,
    casts: cards,
    publishedAt: new Date().toISOString()
  };
}

async function compressBackgroundDataUrl(source) {
  const image = await loadImage(source);
  let maxWidth = 1600;
  let maxHeight = 1000;
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.42];

  for (let scaleStep = 0; scaleStep < 4; scaleStep += 1) {
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("背景画像の圧縮処理を開始できませんでした。");
    context.fillStyle = "#02080c";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const compressed = canvas.toDataURL("image/webp", quality);
      if (getUtf8ByteLength(compressed) <= TARGET_BACKGROUND_BYTES) return compressed;
    }

    maxWidth = Math.round(maxWidth * 0.78);
    maxHeight = Math.round(maxHeight * 0.78);
  }

  const fallbackCanvas = document.createElement("canvas");
  const fallbackScale = Math.min(1, 720 / image.naturalWidth, 450 / image.naturalHeight);
  fallbackCanvas.width = Math.max(1, Math.round(image.naturalWidth * fallbackScale));
  fallbackCanvas.height = Math.max(1, Math.round(image.naturalHeight * fallbackScale));
  const fallbackContext = fallbackCanvas.getContext("2d", { alpha: false });
  if (!fallbackContext) return "";
  fallbackContext.fillStyle = "#02080c";
  fallbackContext.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  fallbackContext.drawImage(image, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
  return fallbackCanvas.toDataURL("image/webp", 0.36);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("背景画像を読み込めなかったため、公開用に圧縮できませんでした。"));
    image.src = source;
  });
}

function getJsonByteLength(value) {
  return getUtf8ByteLength(JSON.stringify(value));
}

function getUtf8ByteLength(value) {
  return new TextEncoder().encode(String(value || "")).byteLength;
}

function formatBytes(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)}MB`
    : `${Math.ceil(bytes / 1024)}KB`;
}

function extractBackgroundUrl(styleText) {
  const bodyRule = styleText.match(/body\s*\{[^}]*background-image\s*:[^;}]*url\((['"]?)(.*?)\1\)/is);
  return bodyRule?.[2] || "";
}

function translateError(error) {
  const message = String(error?.message || "");
  if (/showcase data is too large/i.test(message)) {
    return "公開データが容量上限を超えました。背景画像を小さくするか、画像ファイルではなく背景画像URLを指定して再生成してください。";
  }
  if (/publish_act_showcase_for_current_user|function.*does not exist|schema cache/i.test(message)) {
    return "動的公開機能が未設定です。Supabaseで supabase/20_dynamic_act_showcase.sql を実行してください。";
  }
  if (/owned by another|another user|permission denied/i.test(message)) {
    return "このアクト識別名は別のユーザーが使用しています。別の識別名を入力してください。";
  }
  if (/participant|not accessible|do not exist/i.test(message)) {
    return "選択した公開キャストの一部を登録できません。公開状態を確認してください。";
  }
  return message || "アクト紹介の公開に失敗しました。";
}

function setStatus(message, state = "", allowHtml = false) {
  if (!status) return;
  if (allowHtml) status.innerHTML = message;
  else status.textContent = message;
  status.className = `generator-status${state ? ` is-${state}` : ""}`;
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function escapeAttribute(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}
