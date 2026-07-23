import { supabase } from "./supabase-client.js";
import { STYLE_DATA } from "./style-data.js";

const JSZIP_MODULE_URL = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";
const PLACEHOLDER = "./assets/placeholders/scan-failed.webp";

ensureStylesheet();
const button = ensureButton();
const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const isSheetEditor = Boolean(document.querySelector("#character-name"));

if (button) initialize();

function ensureStylesheet() {
  if (document.querySelector('link[data-udonarium-export-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css/udonarium-export.css?v=1";
  link.dataset.udonariumExportStyle = "1";
  document.head.append(link);
}

function ensureButton() {
  const existing = document.querySelector("#udonarium-export-button");
  if (existing) return existing;

  const created = document.createElement("button");
  created.id = "udonarium-export-button";
  created.className = "udonarium-export-button";
  created.type = "button";
  created.innerHTML = "<span>ユドナリウム</span><small>DOWNLOAD ZIP</small>";

  const editorPanel = document.querySelector(".exp-panel");
  if (editorPanel) {
    const cocofoliaButton = editorPanel.querySelector("#cocofolia-copy-button");
    const viewLink = editorPanel.querySelector("#cast-view-button");
    if (cocofoliaButton) cocofoliaButton.insertAdjacentElement("afterend", created);
    else if (viewLink) viewLink.insertAdjacentElement("afterend", created);
    else editorPanel.append(created);
    return created;
  }

  const headerActions = document.querySelector(".cast-header__actions");
  if (headerActions) {
    const cocofoliaButton = headerActions.querySelector("#cocofolia-copy-button");
    if (cocofoliaButton) cocofoliaButton.insertAdjacentElement("afterend", created);
    else headerActions.append(created);
    return created;
  }

  return null;
}

function initialize() {
  button.addEventListener("click", downloadUdonariumZip);
  button.disabled = !publicId;
  if (!publicId) button.title = "キャストを保存すると利用できます。";
}

async function downloadUdonariumZip() {
  if (!publicId || button.disabled) return;

  setButtonState("building");
  try {
    const character = isSheetEditor
      ? collectEditorCharacter()
      : await fetchCharacter(publicId);

    validateCharacter(character);
    const imageBlob = await fetchImageBlob(character.image_url || PLACEHOLDER);
    const pngBlob = await convertImageToPng(imageBlob);
    const imageBytes = await pngBlob.arrayBuffer();
    const imageIdentifier = await sha256Hex(imageBytes);
    const xml = createUdonariumXml(character, imageIdentifier);
    const zipBlob = await createZip(xml, imageIdentifier, pngBlob);

    downloadBlob(zipBlob, createZipFilename(character));
    setButtonState("success");
    window.setTimeout(() => setButtonState("idle"), 2400);
  } catch (error) {
    console.error(error);
    setButtonState("error", error instanceof Error ? error.message : "ZIP生成に失敗しました。");
    window.setTimeout(() => setButtonState("idle"), 3600);
  }
}

async function fetchCharacter(id) {
  const { data, error } = await supabase
    .from("characters")
    .select(`
      public_id, character_name, character_kana, handle, handle_kana,
      player_name, profile, summary, image_url,
      style_1, style_1_mark, style_2, style_2_mark,
      style_3, style_3_mark, divine_1, divine_2, divine_3,
      mundane_value
    `)
    .eq("public_id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("キャストデータを取得できませんでした。");
  return data;
}

function collectEditorCharacter() {
  const value = id => document.querySelector(`#${id}`)?.value?.trim() || "";
  const text = id => document.querySelector(`#${id}`)?.textContent?.trim() || "";
  const numberText = id => Number(String(text(id)).replace(/[^0-9.-]/g, "")) || 0;
  const preview = document.querySelector("#image-preview");

  const character = {
    public_id: publicId,
    character_name: value("character-name"),
    character_kana: value("character-kana"),
    handle: value("handle"),
    handle_kana: value("handle-kana"),
    player_name: value("player-name"),
    profile: value("profile"),
    summary: value("summary"),
    image_url: preview?.currentSrc || preview?.src || PLACEHOLDER,
    mundane_value: numberText("mundane-final")
  };

  for (let index = 1; index <= 3; index += 1) {
    character[`style_${index}`] = value(`style-${index}`);
    character[`style_${index}_mark`] = value(`style-${index}-mark`);
    const divine = text(`divine-${index}`);
    character[`divine_${index}`] = divine === "未選択" ? "" : divine;
  }

  return character;
}

function validateCharacter(character) {
  if (!String(character.character_name || "").trim()) {
    throw new Error("キャスト名が入力されていません。");
  }
  if (!getDivineCounts(character).length) {
    throw new Error("神業を取得できません。スタイルを確認してください。");
  }
}

async function fetchImageBlob(url) {
  const response = await fetch(url || PLACEHOLDER, { cache: "no-store" });
  if (!response.ok) throw new Error(`キャスト画像を取得できませんでした。（${response.status}）`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("取得したファイルが画像ではありません。");
  return blob;
}

async function convertImageToPng(blob) {
  const drawable = await decodeImage(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = drawable.width;
    canvas.height = drawable.height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("画像変換用Canvasを作成できませんでした。");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(drawable.source, 0, 0, canvas.width, canvas.height);
    return await canvasToBlob(canvas, "image/png");
  } finally {
    drawable.close();
  }
}

async function decodeImage(blob) {
  if ("createImageBitmap" in window) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(blob);
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close()
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("キャスト画像を読み込めませんでした。"));
      element.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl)
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("PNG画像を生成できませんでした。"));
    }, type);
  });
}

async function sha256Hex(buffer) {
  if (!crypto.subtle) throw new Error("このブラウザではSHA-256を計算できません。");
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

async function createZip(xml, imageIdentifier, imageBlob) {
  const module = await import(JSZIP_MODULE_URL);
  const JSZip = module.default || module.JSZip;
  if (!JSZip) throw new Error("ZIP生成ライブラリを読み込めませんでした。");

  const zip = new JSZip();
  zip.file("data.xml", xml, { compression: "DEFLATE" });
  zip.file(`${imageIdentifier}.png`, imageBlob, { compression: "STORE" });
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

function createUdonariumXml(character, imageIdentifier) {
  const displayName = formatDisplayName(character);
  const playerName = String(character.player_name || "").trim();
  const profile = String(character.profile || character.summary || "").trim();
  const styles = getStyles(character);
  const divineCounts = getDivineCounts(character);
  const rewardPoints = Math.max(0, Number(character.mundane_value || 0));
  const castUrl = createCastUrl(character.public_id);
  const divineRows = divineCounts
    .map(({ label, count }) => `          <data name="${escapeXml(label)}" type="numberResource" currentValue="${count}">${count}</data>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<character rotate="0" roll="0" location.name="table" location.x="300" location.y="550" posZ="0" isAltitudeIndicate="true" isLock="false" isDropShadow="false" hideInventory="false" nonTalkFlag="false" overViewWidth="270" overViewMaxHeight="250" specifyKomaImageFlag="false" komaImageHeignt="100" chatColorCode.0="#000000" chatColorCode.1="#FF0000" chatColorCode.2="#2f2fee" syncDummyCounter="2">
  <data name="character">
    <data name="image">
      <data type="image" name="imageIdentifier">${imageIdentifier}</data>
    </data>
    <data name="common">
      <data name="name">${escapeXml(displayName)}</data>
      <data name="size">2</data>
      <data name="altitude">0</data>
    </data>
    <data name="detail">
      <data name="パーソナルデータ">
        <data name="プレイヤー">${escapeXml(playerName)}</data>
        <data name="キャスト番号">1</data>
        <data name="設定" type="note">${escapeXml(profile)}</data>
        <data name="URL">${escapeXml(castUrl)}</data>
      </data>
      <data name="スタイル・神業">
        <data name="スタイル">${escapeXml(styles.join("、"))}</data>
        <data name="神業" type="numberResource" currentValue="1">
${divineRows}
        </data>
      </data>
      <data name="アクトデータ">
        <data name="報酬点" type="numberResource" currentValue="${rewardPoints}">${rewardPoints}</data>
        <data name="アクトコネ" type="note">（得たコネ）</data>
        <data name="メモ" type="note">（得たアドレスやアウトフィットなど）</data>
      </data>
      <data name="ダメージ・ＢＳ">
        <data name="肉体ダメージ">0</data>
        <data name="精神ダメージ">0</data>
        <data name="社会ダメージ">0</data>
        <data name="BS">0</data>
      </data>
      <data name="立ち絵位置">
        <data type="numberResource" currentValue="0" name="POS">11</data>
      </data>
      <data name="コマ画像">
        <data type="numberResource" currentValue="0" name="ICON">0</data>
      </data>
    </data>
    <data name="buff">
      <data name="バフ/デバフ"></data>
    </data>
  </data>
  <chat-palette dicebot="">チャットパレット入力例：
2d6+1 ダイスロール
１ｄ２０＋{敏捷}＋｛格闘｝　{name}の格闘！
//敏捷=10+{敏捷A}
//敏捷A=10
//格闘＝１</chat-palette>
</character>`;
}

function getStyles(character) {
  return [1, 2, 3]
    .map(index => {
      const name = String(character[`style_${index}`] || "").trim();
      const mark = String(character[`style_${index}_mark`] || "").trim();
      return name ? `${name}${mark}` : "";
    })
    .filter(Boolean);
}

function getDivines(character) {
  return [1, 2, 3]
    .map(index => {
      const saved = String(character[`divine_${index}`] || "").trim();
      if (saved) return saved;
      const styleName = String(character[`style_${index}`] || "").trim();
      return STYLE_DATA.find(style => style.name === styleName)?.divine || "";
    })
    .filter(Boolean);
}

function getDivineCounts(character) {
  const counts = new Map();
  for (const label of getDivines(character)) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function formatDisplayName(character) {
  const name = String(character.character_name || "").trim();
  const handle = stripOuterQuotes(character.handle);
  return handle ? `“${handle}” ${name}` : name;
}

function stripOuterQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^["'“”‘’「」『』]+/, "")
    .replace(/["'“”‘’「」『』]+$/, "")
    .trim();
}

function createCastUrl(id) {
  return new URL(`./cast.html?id=${encodeURIComponent(id || publicId)}`, location.href).href;
}

function createZipFilename(character) {
  const now = new Date();
  const date = [now.getFullYear(), pad2(now.getMonth() + 1), pad2(now.getDate())].join("-");
  const time = `${pad2(now.getHours())}${pad2(now.getMinutes())}`;
  return `xml_${safeFilename(formatDisplayName(character))}_${date}_${time}.zip`;
}

function safeFilename(value) {
  return String(value || "cast")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "cast";
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setButtonState(state, message = "") {
  button.dataset.exportState = state;
  button.disabled = state === "building" || !publicId;
  const labels = {
    idle: ["ユドナリウム", "DOWNLOAD ZIP"],
    building: ["ZIP生成中…", "BUILDING XML"],
    success: ["ZIP作成済み", "IMPORT TO UDONARIUM"],
    error: ["生成失敗", "EXPORT ERROR"]
  };
  const [main, sub] = labels[state] || labels.idle;
  button.innerHTML = `<span>${main}</span><small>${sub}</small>`;
  button.title = message;
}
