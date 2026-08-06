import { supabase } from "./supabase-client.js";

const FORMAT = "TNX_CAST_TRANSFER_TSV";
const VERSION = "1";
const BOOKMARKLET_URL = new URL("./js/tnx-transfer-bookmarklet.js?v=2", location.href).href;
const STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const GENERAL_ORDER = ["医療","射撃","知覚","電脳","製作：","心理","自我","交渉","芸術：","運動","回避","白兵","操縦：","信用","圧力","隠密"];

const { transferButton, bookmarkletButton } = ensureButtons();
const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const isSheetEditor = Boolean(document.querySelector("#character-name"));

if (transferButton) initialize();

function createButton(id, className, main, sub) {
  const button = document.createElement("button");
  button.id = id;
  button.className = className;
  button.type = "button";
  button.innerHTML = `<span>${main}</span><small>${sub}</small>`;
  return button;
}

function ensureButtons() {
  let transfer = document.querySelector("#transfer-tsv-copy-button");
  let bookmarklet = document.querySelector("#transfer-bookmarklet-copy-button");
  if (!transfer) transfer = createButton("transfer-tsv-copy-button", "transfer-tsv-copy-button", "転記TSV", "COPY TRANSFER DATA");
  if (!bookmarklet) bookmarklet = createButton("transfer-bookmarklet-copy-button", "transfer-bookmarklet-copy-button", "転記BM", "COPY BOOKMARKLET");

  const editorPanel = document.querySelector(".exp-panel");
  const headerActions = document.querySelector(".cast-header__export-actions") || document.querySelector(".cast-header__actions");
  const container = editorPanel || headerActions;
  if (!container) return { transferButton: null, bookmarkletButton: null };

  const udonarium = container.querySelector("#udonarium-export-button");
  const cocofolia = container.querySelector("#cocofolia-copy-button");
  const anchor = udonarium || cocofolia || container.querySelector("#cast-view-button") || container.lastElementChild;

  if (!transfer.isConnected) {
    if (anchor) anchor.insertAdjacentElement("afterend", transfer);
    else container.append(transfer);
  }
  if (!bookmarklet.isConnected) transfer.insertAdjacentElement("afterend", bookmarklet);

  return { transferButton: transfer, bookmarkletButton: bookmarklet };
}

function initialize() {
  transferButton.addEventListener("click", copyTransferTsv);
  bookmarkletButton?.addEventListener("click", copyBookmarklet);
  transferButton.disabled = !publicId;
  if (!publicId) transferButton.title = "キャストを保存すると利用できます。";
  if (bookmarkletButton) bookmarkletButton.title = "転記先サイトで実行するブックマークレットをコピーします。";
}

async function copyTransferTsv() {
  if (!publicId || transferButton.disabled) return;
  setState(transferButton, "copying");
  try {
    const bundle = isSheetEditor ? collectEditorBundle() : await fetchBundle(publicId);
    const tsv = createTransferTsv(bundle);
    await writeClipboard(tsv);
    setState(transferButton, "success");
    window.setTimeout(() => setState(transferButton, "idle"), 2600);
  } catch (error) {
    console.error(error);
    setState(transferButton, "error", error instanceof Error ? error.message : "TSVのコピーに失敗しました。");
    window.setTimeout(() => setState(transferButton, "idle"), 3600);
  }
}

async function copyBookmarklet() {
  if (!bookmarkletButton) return;
  setState(bookmarkletButton, "copying", "", true);
  const bookmarklet = `javascript:(()=>{const s=document.createElement('script');s.src='${BOOKMARKLET_URL}&t='+Date.now();s.onload=()=>s.remove();s.onerror=()=>alert('転記スクリプトを読み込めませんでした。');document.documentElement.append(s)})()`;
  try {
    await writeClipboard(bookmarklet);
    setState(bookmarkletButton, "success", "", true);
    window.setTimeout(() => setState(bookmarkletButton, "idle", "", true), 2600);
  } catch (error) {
    console.error(error);
    setState(bookmarkletButton, "error", error instanceof Error ? error.message : "ブックマークレットのコピーに失敗しました。", true);
    window.setTimeout(() => setState(bookmarkletButton, "idle", "", true), 3600);
  }
}

async function fetchBundle(id) {
  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", id)
    .maybeSingle();
  if (characterError) throw characterError;
  if (!character) throw new Error("キャストデータを取得できませんでした。");

  const [{ data: skills, error: skillError }, { data: outfits, error: outfitError }] = await Promise.all([
    supabase.from("character_skills").select("*").eq("character_id", character.id).order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id", character.id).order("sort_order")
  ]);
  if (skillError) throw skillError;
  if (outfitError) throw outfitError;
  return { character, skills: skills || [], outfits: (outfits || []).map(normalizeOutfit) };
}

function value(id) {
  return document.querySelector(`#${id}`)?.value?.trim() || "";
}

function textNumber(id) {
  const text = document.querySelector(`#${id}`)?.textContent || "";
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function collectEditorBundle() {
  const character = {
    public_id: publicId,
    character_name: value("character-name"),
    character_kana: value("character-kana"),
    handle: value("handle"),
    handle_kana: value("handle-kana"),
    player_name: value("player-name"),
    affiliation: value("affiliation"),
    citizen_rank: value("citizen-rank"),
    summary: value("summary"),
    profile: value("profile"),
    age: value("age"),
    gender: value("gender"),
    height: value("height"),
    weight: value("weight"),
    eyes: value("eyes"),
    hair: value("hair"),
    skin: value("skin"),
    life_path_origin: value("life-path-origin"),
    life_path_experience: value("life-path-experience"),
    life_path_encounter: value("life-path-encounter"),
    reason_value: textNumber("reason-final"),
    reason_control: textNumber("reason-control-final"),
    passion_value: textNumber("passion-final"),
    passion_control: textNumber("passion-control-final"),
    life_value: textNumber("life-final"),
    life_control: textNumber("life-control-final"),
    mundane_value: textNumber("mundane-final"),
    mundane_control: textNumber("mundane-control-final"),
    cs: textNumber("cs-final")
  };

  for (let index = 1; index <= 3; index += 1) {
    character[`style_${index}`] = value(`style-${index}`);
    character[`style_${index}_mark`] = value(`style-${index}-mark`);
    character[`style_${index}_attribute`] = value(`style-${index}-attribute`);
    const divine = document.querySelector(`#divine-${index}`)?.textContent?.trim() || "";
    character[`divine_${index}`] = divine === "未選択" ? "" : divine;
  }

  const skills = [...document.querySelectorAll('tr[data-skill-key]')].map((row, sortOrder) => {
    const category = row.closest("#style-skills") ? "style"
      : row.closest(".skill-group")?.querySelector(".skill-group-title")?.textContent?.includes("コネクション") ? "connection"
      : row.closest(".skill-group")?.querySelector(".skill-group-title")?.textContent?.includes("社会") ? "social"
      : "general";
    const field = name => row.querySelector(`[data-f="${name}"]`);
    const detail = Object.fromEntries([...row.querySelectorAll("[data-style-field]")].map(control => [control.dataset.styleField, control.value]));
    return {
      category,
      name: field("name")?.value || "",
      skill_kind: field("skill_kind")?.value || "",
      level: Number(field("level")?.value || 0),
      reason: Boolean(field("reason")?.checked),
      passion: Boolean(field("passion")?.checked),
      life: Boolean(field("life")?.checked),
      mundane: Boolean(field("mundane")?.checked),
      timing: detail.timing || "",
      target: detail.target || "",
      range: detail.range || "",
      difficulty: detail.difficulty || "",
      confrontation: detail.confrontation || "",
      description: detail.description || field("description")?.value || "",
      _styleDetail: detail,
      sort_order: sortOrder
    };
  }).filter(skill => skill.name.trim() && skill.level > 0);

  const outfits = [...document.querySelectorAll('[data-outfit-key]')].map((card, sortOrder) => {
    const field = name => card.querySelector(`[data-o="${name}"]`);
    const ofc = name => card.querySelector(`[data-ofc="${name}"]`)?.value || "";
    return normalizeOutfit({
      category: field("category")?.value || "other",
      name: field("name")?.value || "",
      purchase_value: field("purchase_value")?.value || "",
      experience_cost: field("experience_cost")?.value || "",
      concealment: field("concealment")?.value || "",
      attack: field("attack")?.value || "",
      defense: field("defense")?.value || "",
      range: field("range")?.value || "",
      slot: field("slot")?.value || "",
      control_modifier: field("control_modifier")?.value || "",
      cs_modifier: field("cs_modifier")?.value || "",
      mundane_modifier: field("mundane_modifier")?.value || "",
      description: field("description")?.value || card.querySelector("textarea[data-description-proxy]")?.value || "",
      ofc_details: {
        parry: ofc("parry"), speed: ofc("speed"), electronic_control: ofc("electronic_control"), control_value: ofc("control_value"),
        defense_s: ofc("defense_s"), defense_p: ofc("defense_p"), defense_i: ofc("defense_i"), crew: ofc("crew"), sf: ofc("sf"),
        tron_software: ofc("tron_software"), tron_support: ofc("tron_support"), tron_hardware: ofc("tron_hardware"), cs_value: ofc("cs_value"),
        residence_entry: ofc("residence_entry"), residence_electric: ofc("residence_electric"), residence_area: ofc("residence_area"),
        page_number: ofc("page_number")
      },
      sort_order: sortOrder
    });
  }).filter(outfit => outfit.name.trim());

  return { character, skills, outfits };
}

function normalizeOutfit(outfit) {
  const details = outfit?.ofc_details && typeof outfit.ofc_details === "object" && !Array.isArray(outfit.ofc_details)
    ? outfit.ofc_details
    : {};
  return {
    ...outfit,
    ofc_details: Object.fromEntries(Object.entries(details).map(([key, item]) => [key, String(item ?? "")]))
  };
}

function parseStyleDetail(skill) {
  if (skill._styleDetail) return skill._styleDetail;
  const raw = String(skill.description || "");
  if (raw.startsWith(STYLE_DETAIL_PREFIX)) {
    try { return JSON.parse(raw.slice(STYLE_DETAIL_PREFIX.length).trim()); } catch { /* fall through */ }
  }
  const detail = { skill: "", limit: "", timing: skill.timing || "", target: skill.target || "", range: skill.range || "", difficulty: skill.difficulty || "", confrontation: skill.confrontation || "", description: raw, page: "" };
  const lines = raw.split(/\r?\n/);
  const labels = { "技能":"skill", "上限":"limit", "タイミング":"timing", "対象":"target", "射程":"range", "目標値":"difficulty", "対決":"confrontation", "参照P":"page" };
  const description = [];
  for (const line of lines) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key = match && labels[match[1].trim()];
    if (key) detail[key] = match[2]; else description.push(line);
  }
  detail.description = description.join("\n").trim();
  return detail;
}

function parseOutfitExtra(description) {
  const extras = {};
  const plain = [];
  const labels = {
    "隠匿A":"concealA", "隠匿B":"concealB", "攻撃":"attack", "防御":"defense", "射程":"range", "スロット":"slot",
    "制御":"control", "電制":"electrical_control", "防御S":"protecS", "防御P":"protecP", "防御I":"protecI",
    "乗員":"crew", "SF":"sf", "登場":"entry", "部位":"part", "参照P":"page"
  };
  for (const line of String(description || "").split(/\r?\n/)) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key = match && labels[match[1].trim()];
    if (key) extras[key] = match[2]; else plain.push(line);
  }
  extras.notes = plain.join("\n").trim();
  return extras;
}

function parseDefense(value) {
  const result = { s: "", p: "", i: "" };
  const text = String(value || "").trim();
  for (const match of text.matchAll(/(?:^|[\s,，/／])([SPI])\s*[:：]?\s*([^/／,，\s]+)/gi)) result[match[1].toLowerCase()] = match[2];
  if (Object.values(result).some(Boolean)) return result;
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  result.s = parts[0] || "";
  result.i = parts[1] || "";
  result.p = parts[2] || "";
  return result;
}

function outfitTransferFields(outfit) {
  const item = normalizeOutfit(outfit);
  const details = item.ofc_details;
  const legacy = parseOutfitExtra(item.description);
  const [concealA = "", concealB = ""] = String(item.concealment || "").split(/[\/／]/);
  const defense = parseDefense(item.defense);
  const category = String(item.category || "other");
  const fields = {
    category,
    name: item.name || "",
    purchase: item.purchase_value ?? "",
    permanent: item.experience_cost ?? "",
    concealA: legacy.concealA ?? concealA,
    concealB: legacy.concealB ?? concealB,
    attack: item.attack || legacy.attack || "",
    defense: category === "weapon" ? (details.parry || legacy.defense || "") : (item.defense || legacy.defense || ""),
    range: item.range || legacy.range || "",
    slot: details.speed || legacy.slot || "",
    control: category === "armor" ? (details.control_value || legacy.control || "") : (item.control_modifier ?? legacy.control ?? ""),
    electrical_control: details.electronic_control || legacy.electrical_control || "",
    protecS: details.defense_s || legacy.protecS || defense.s,
    protecP: details.defense_p || legacy.protecP || defense.p,
    protecI: details.defense_i || legacy.protecI || defense.i,
    crew: details.crew || legacy.crew || "",
    sf: details.sf || legacy.sf || "",
    entry: details.residence_entry || legacy.entry || "",
    part: item.slot || legacy.part || "",
    notes: legacy.notes || item.description || "",
    page: details.page_number || legacy.page || "",
    mundane: item.mundane_modifier ?? "",
    tron_software: details.tron_software || "",
    tron_support: details.tron_support || "",
    tron_hardware: details.tron_hardware || "",
    cs_value: details.cs_value || "",
    residence_electric: details.residence_electric || "",
    residence_area: details.residence_area || ""
  };
  if (category === "other") fields.slot = "";
  return fields;
}

function escapeCell(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\r?\n/g, "\\n");
}

function createTransferTsv({ character, skills, outfits }) {
  if (!String(character.character_name || "").trim()) throw new Error("キャスト名が入力されていません。");
  const rows = [[FORMAT, VERSION, "section", "index", "field", "value"]];
  const add = (section, index, field, value) => rows.push([FORMAT, VERSION, section, String(index), field, escapeCell(value)]);

  const baseFields = {
    name: character.character_name, kana: character.character_kana, handle: character.handle, handle_kana: character.handle_kana,
    player: character.player_name, rank: character.citizen_rank, affiliation: character.affiliation, summary: character.summary,
    profile: character.profile, age: character.age, sex: character.gender, height: character.height, weight: character.weight,
    eyes: character.eyes, hair: character.hair, skin: character.skin, lifepath_origin: character.life_path_origin,
    lifepath_experience: character.life_path_experience, lifepath_encounter: character.life_path_encounter,
    source_url: location.href.split("#")[0]
  };
  Object.entries(baseFields).forEach(([field, val]) => add("base", 0, field, val));

  for (let index = 1; index <= 3; index += 1) {
    add("style", index - 1, "name", character[`style_${index}`]);
    add("style", index - 1, "mark", character[`style_${index}_mark`]);
    add("style", index - 1, "attribute", character[`style_${index}_attribute`]);
    add("style", index - 1, "divine", character[`divine_${index}`]);
  }

  const abilities = {
    reason: [character.reason_value ?? character.reason_base, character.reason_control ?? character.reason_control_base],
    passion: [character.passion_value ?? character.passion_base, character.passion_control ?? character.passion_control_base],
    life: [character.life_value ?? character.life_base, character.life_control ?? character.life_control_base],
    mundane: [character.mundane_value ?? character.mundane_base, character.mundane_control ?? character.mundane_control_base]
  };
  Object.entries(abilities).forEach(([key, [ability, control]]) => {
    add("ability", key, "value", ability || 0);
    add("ability", key, "control", control || 0);
  });
  add("ability", "cs", "value", character.cs ?? character.cs_base ?? 0);

  const orderedGeneral = [...skills.filter(skill => skill.category === "general")].sort((a, b) => {
    const ai = GENERAL_ORDER.indexOf(a.name), bi = GENERAL_ORDER.indexOf(b.name);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
  const skillSets = [
    ["general", orderedGeneral],
    ["social", skills.filter(skill => skill.category === "social")],
    ["connection", skills.filter(skill => skill.category === "connection")],
    ["style_skill", skills.filter(skill => skill.category === "style")]
  ];

  for (const [section, records] of skillSets) {
    records.forEach((skill, index) => {
      const detail = section === "style_skill" ? parseStyleDetail(skill) : {};
      const transferKind = section === "style_skill" && String(skill.skill_kind || "").trim().toLowerCase() === "none"
        ? "なし"
        : skill.skill_kind;
      const fields = {
        name: skill.name, kind: transferKind, level: skill.level,
        reason: skill.reason ? 1 : 0, passion: skill.passion ? 1 : 0, life: skill.life ? 1 : 0, mundane: skill.mundane ? 1 : 0,
        skill: detail.skill, limit: detail.limit, timing: detail.timing || skill.timing, target: detail.target || skill.target,
        range: detail.range || skill.range, difficulty: detail.difficulty || skill.difficulty,
        confrontation: detail.confrontation || skill.confrontation, description: detail.description || skill.description, page: detail.page
      };
      Object.entries(fields).forEach(([field, val]) => add(section, index, field, val));
    });
  }

  outfits.map(normalizeOutfit).forEach((outfit, index) => {
    Object.entries(outfitTransferFields(outfit)).forEach(([field, val]) => add("outfit", index, field, val));
  });

  return rows.map(row => row.join("\t")).join("\n");
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

function setState(button, state, message = "", bookmarklet = false) {
  button.dataset.copyState = state;
  button.disabled = state === "copying" || (!bookmarklet && !publicId);
  const labels = bookmarklet ? {
    idle: ["転記BM", "COPY BOOKMARKLET"], copying: ["生成中…", "BUILDING TOOL"], success: ["BMコピー済み", "ADD TO BOOKMARKS"], error: ["コピー失敗", "COPY ERROR"]
  } : {
    idle: ["転記TSV", "COPY TRANSFER DATA"], copying: ["生成中…", "BUILDING TSV"], success: ["TSVコピー済み", "RUN BOOKMARKLET"], error: ["コピー失敗", "COPY ERROR"]
  };
  const [main, sub] = labels[state] || labels.idle;
  button.innerHTML = `<span>${main}</span><small>${sub}</small>`;
  button.title = message;
}
