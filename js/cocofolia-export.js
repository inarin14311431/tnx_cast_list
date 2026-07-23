import { supabase } from "./supabase-client.js";
import { STYLE_DATA } from "./style-data.js";

ensureStylesheet();
const button = ensureButton();
const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const isSheetEditor = Boolean(document.querySelector("#character-name"));

if (button) initialize();

function ensureStylesheet() {
  if (document.querySelector('link[data-cocofolia-export-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./css/cocofolia-export.css?v=1";
  link.dataset.cocofoliaExportStyle = "1";
  document.head.append(link);
}

function ensureButton() {
  const existing = document.querySelector("#cocofolia-copy-button");
  if (existing) return existing;

  const created = document.createElement("button");
  created.id = "cocofolia-copy-button";
  created.className = "cocofolia-copy-button";
  created.type = "button";
  created.innerHTML = "<span>ココフォリア</span><small>COPY UNIT</small>";

  const editorPanel = document.querySelector(".exp-panel");
  if (editorPanel) {
    const viewLink = editorPanel.querySelector("#cast-view-button");
    if (viewLink) viewLink.insertAdjacentElement("afterend", created);
    else editorPanel.append(created);
    return created;
  }

  const headerActions = document.querySelector(".cast-header__actions");
  if (headerActions) {
    headerActions.append(created);
    return created;
  }

  return null;
}

function initialize() {
  button.addEventListener("click", copyCocofoliaUnit);
  button.disabled = !publicId;
  if (!publicId) button.title = "キャストを保存すると利用できます。";
}

async function copyCocofoliaUnit() {
  if (!publicId || button.disabled) return;

  setButtonState("copying");
  try {
    const character = isSheetEditor
      ? collectEditorCharacter()
      : await fetchCharacter(publicId);
    const unit = createCocofoliaUnit(character);
    await writeClipboard(JSON.stringify(unit));
    setButtonState("success");
    window.setTimeout(() => setButtonState("idle"), 2200);
  } catch (error) {
    console.error(error);
    setButtonState("error", error instanceof Error ? error.message : "コピーに失敗しました。");
    window.setTimeout(() => setButtonState("idle"), 3200);
  }
}

async function fetchCharacter(id) {
  const { data, error } = await supabase
    .from("characters")
    .select(`
      public_id, character_name, character_kana, handle, handle_kana,
      player_name, style_1, style_1_mark, style_2, style_2_mark,
      style_3, style_3_mark, divine_1, divine_2, divine_3, cs,
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

  const character = {
    public_id: publicId,
    character_name: value("character-name"),
    character_kana: value("character-kana"),
    handle: value("handle"),
    handle_kana: value("handle-kana"),
    player_name: value("player-name"),
    cs: numberText("cs-final"),
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

function createCocofoliaUnit(character) {
  const displayName = formatDisplayName(character);
  const styles = getStyles(character);
  const divineCounts = countDivines(getDivines(character));
  const rewardPoints = Math.max(0, Number(character.mundane_value || 0));

  if (!character.character_name?.trim()) throw new Error("キャスト名が入力されていません。");
  if (!divineCounts.length) throw new Error("神業を取得できません。スタイルを確認してください。");

  const statuses = [
    ...divineCounts.map(({ label, count }) => ({ label, value: count, max: count })),
    { label: "報酬点", value: rewardPoints },
    { label: "切り札", value: 1, max: 1 }
  ];

  const commands = [
    ...divineCounts.map(({ label }) => `:${label}-1`),
    ":報酬点-",
    ":切り札-1"
  ].join("\n") + "\n";

  return {
    kind: "character",
    data: {
      name: displayName,
      initiative: Number(character.cs || 0),
      externalUrl: location.href.split("#")[0],
      status: statuses,
      memo: [
        `氏名：${displayName}`,
        `カナ：${character.character_kana?.trim() || ""}`,
        `プレイヤー：${character.player_name?.trim() || ""}`,
        `スタイル：${styles.join(",")}`
      ].join("\n"),
      commands
    }
  };
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

function countDivines(divines) {
  const counts = new Map();
  for (const label of divines) {
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function formatDisplayName(character) {
  const name = String(character.character_name || "").trim();
  const handle = stripOuterQuotes(character.handle);
  return handle ? `“${handle}”　${name}` : name;
}

function stripOuterQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^["'“”‘’「」『』]+/, "")
    .replace(/["'“”‘’「」『』]+$/, "")
    .trim();
}

async function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("クリップボードへコピーできませんでした。");
}

function setButtonState(state, message = "") {
  button.dataset.copyState = state;
  button.disabled = state === "copying" || !publicId;

  const labels = {
    idle: ["ココフォリア", "COPY UNIT"],
    copying: ["生成中…", "BUILDING UNIT"],
    success: ["コピー済み", "PASTE TO CCFOLIA"],
    error: ["コピー失敗", "COPY ERROR"]
  };
  const [main, sub] = labels[state] || labels.idle;
  button.innerHTML = `<span>${main}</span><small>${sub}</small>`;
  button.title = message;
}
