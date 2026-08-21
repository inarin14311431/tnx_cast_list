import { supabase } from "./supabase-client.js";
import { getImageObjectPosition, getImageScale, getImageTransformOrigin } from "./image-focus.js?v=3";
import { normalizeOutfitListForView, formatPurchasePair, formatConcealmentPair } from "./outfit-view-model.js";

const content = document.querySelector("#cast-content");
const statusText = document.querySelector("#cast-status");
const errorPanel = document.querySelector("#cast-error");
const errorMessage = document.querySelector("#cast-error-message");
const quickSheet = document.querySelector("#quick-sheet");
const quickSheetPages = document.querySelector("#quick-sheet-pages");
const quickSheetButton = document.querySelector("#cast-quick-sheet-button");
const quickSheetClose = document.querySelector("#quick-sheet-close");
const quickSheetDetailToggle = document.querySelector("#quick-sheet-detail-toggle");
const quickSheetPrint = document.querySelector("#quick-sheet-print");

let quickSheetContext = null;
let quickSheetScrollY = 0;
let quickSheetNotesExpanded = false;

const OUTFIT_LABELS = {
  weapon: "WEAPON",
  armor: "ARMOR",
  cyberware: "CYBERWARE",
  tron: "TRON",
  vehicle: "VEHICLE",
  residence: "RESIDENCE",
  other: "OTHER"
};

const SKILL_LABELS = {
  general: "GENERAL SKILLS",
  social: "SOCIAL",
  connection: "CONNECTIONS",
  style: "STYLE SKILLS"
};

const QUICK_GENERAL_ORDER = [
  "医療", "射撃", "知覚", "電脳", "製作：", "心理", "自我", "交渉",
  "芸術：", "運動", "回避", "白兵", "操縦：", "信用", "圧力", "隠密"
];

const QUICK_STYLE_DETAIL_PREFIX = "@@TNX_STYLE_DETAIL_V1@@";
const QUICK_OTHER_OUTFIT_GROUPS = [
  {
    category: "cyberware",
    japanese: "サイバーウェア",
    english: "CYBERWARE",
    columns: ["name", "purchase", "concealment", "electronic_control", "description"]
  },
  {
    category: "tron",
    japanese: "トロン",
    english: "TRON",
    columns: ["name", "purchase", "concealment", "speed", "tron_software", "tron_support", "tron_hardware", "cs_modifier", "electronic_control", "description"]
  },
  {
    category: "vehicle",
    japanese: "ヴィークル",
    english: "VEHICLE",
    columns: ["name", "purchase", "concealment", "attack", "speed", "control_modifier", "cs_modifier", "defense_s", "defense_p", "defense_i", "crew", "sf", "electronic_control", "description"]
  },
  {
    category: "residence",
    japanese: "住居",
    english: "RESIDENCE",
    columns: ["name", "purchase", "concealment", "speed", "residence_entry", "residence_electric", "residence_area", "electronic_control", "description"]
  },
  {
    category: "other",
    japanese: "その他",
    english: "OTHER",
    columns: ["name", "purchase", "concealment", "electronic_control", "description"]
  }
];
const QUICK_OUTFIT_COLUMN_LABELS = {
  name: "名称",
  purchase: "購入",
  concealment: "隠匿",
  attack: "攻撃",
  parry: "受け",
  range: "射程",
  speed: "スロ",
  control_modifier: "制御値",
  defense_s: "S",
  defense_p: "P",
  defense_i: "I",
  tron_software: "ソ",
  tron_support: "サ",
  tron_hardware: "ハ",
  cs_modifier: "CS修正",
  crew: "乗員",
  sf: "SF",
  residence_entry: "登場",
  residence_electric: "電",
  residence_area: "ア",
  electronic_control: "電制",
  description: "解説"
};
async function loadCharacter() {
  try {
    const publicId = getPublicId();

    if (!publicId) {
      throw new Error("キャストIDが指定されていません。");
    }

    statusText.textContent =
      `SCANNING IDENTIFICATION CODE: ${publicId}`;

    const { data: character, error: characterError } =
      await supabase
        .from("characters")
        .select("*")
        .eq("public_id", publicId)
        .maybeSingle();

    if (characterError) {
      throw characterError;
    }

    if (!character) {
      throw new Error("指定されたキャストは存在しません。");
    }

const [
  { data: skills, error: skillsError },
  { data: outfits, error: outfitsError },
  { data: combos, error: combosError }
] = await Promise.all([
  supabase
    .from("character_skills")
    .select("*")
    .eq("character_id", character.id)
    .order("category")
    .order("sort_order")
    .order("name"),

  supabase
    .from("character_outfits")
    .select("*")
    .eq("character_id", character.id)
    .order("category")
    .order("sort_order")
    .order("name"),

  supabase
    .from("character_combos")
    .select("*")
    .eq("character_id", character.id)
    .order("sort_order")
    .order("name")
]);

if (skillsError) {
  throw skillsError;
}

if (outfitsError) {
  throw outfitsError;
}

if (combosError) {
  throw combosError;
}

renderCharacter(
  character,
  skills ?? [],
  outfits ?? [],
  combos ?? []
);

    statusText.textContent = "ACCESS GRANTED";
    content.hidden = false;
  } catch (error) {
    console.error(error);
    showError(
      error instanceof Error
        ? error.message
        : "キャスト情報の取得に失敗しました。"
    );
  }
}

function getPublicId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id")?.trim() ?? "";
}

function renderCharacter(
  character,
  skills,
  outfits,
  combos
) {
  document.title =
    `${character.character_name} // N◎VA CAST ARCHIVE`;

  setText("#cast-public-id", character.public_id);
  setText("#cast-handle", formatHandle(character.handle));
  setText("#cast-name", character.character_name);
  setText("#cast-kana", character.character_kana);
  setText("#cast-player", character.player_name);
  setText("#cast-affiliation", character.affiliation);
  setText("#cast-rank", character.citizen_rank);
  setText(
    "#cast-exp",
    `${character.experience_points ?? 0} EXP`
  );
  setText("#cast-summary", character.summary);

  const viewOutfits = normalizeOutfitListForView(outfits);
  renderImage(character);
  renderStyles(character);
  renderAbilities(character);
  renderDivineWorks(character);
  renderPersonalData(character);
  renderLifePath(character);
  renderProfile(character);
  renderSkills(skills);
  renderOutfits(viewOutfits);
  renderCombos(combos, character);
  prepareQuickSheet(character, skills, viewOutfits, combos);
}

function prepareQuickSheet(character, skills, outfits, combos) {
  quickSheetContext = { character, skills, outfits, combos };
  if (quickSheetButton) quickSheetButton.hidden = false;
}

function setupQuickSheetControls() {
  quickSheetButton?.addEventListener("click", openQuickSheet);
  quickSheetClose?.addEventListener("click", closeQuickSheetView);
  quickSheetDetailToggle?.addEventListener("click", () => {
    quickSheetNotesExpanded = !quickSheetNotesExpanded;
    updateQuickSheetNotesMode();
    scheduleQuickSheetFit();
  });
  quickSheetPrint?.addEventListener("click", () => {
    fitQuickSheetPages();
    window.print();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.body.classList.contains("is-quick-sheet-open")) {
      closeQuickSheetView();
    }
  });

  window.addEventListener("resize", () => {
    if (document.body.classList.contains("is-quick-sheet-open")) scheduleQuickSheetFit();
  });
}

function scheduleQuickSheetFit() {
  window.setTimeout(fitQuickSheetPages, 0);
  window.setTimeout(fitQuickSheetPages, 120);
}

function openQuickSheet() {
  if (!quickSheetContext || !quickSheet || !quickSheetPages) return;

  quickSheetScrollY = window.scrollY;
  renderQuickSheet(quickSheetContext);
  updateQuickSheetNotesMode();
  quickSheet.hidden = false;
  document.body.classList.add("is-quick-sheet-open");
  quickSheetButton?.setAttribute("aria-expanded", "true");
  window.scrollTo(0, 0);
  scheduleQuickSheetFit();
  window.setTimeout(() => quickSheetClose?.focus({ preventScroll: true }), 0);
  document.fonts?.ready.then(() => fitQuickSheetPages());
}

function closeQuickSheetView() {
  if (!quickSheet || quickSheet.hidden) return;
  document.body.classList.remove("is-quick-sheet-open");
  quickSheet.hidden = true;
  quickSheetButton?.setAttribute("aria-expanded", "false");
  window.scrollTo(0, quickSheetScrollY);
  quickSheetButton?.focus({ preventScroll: true });
}

function updateQuickSheetNotesMode() {
  if (!quickSheet || !quickSheetDetailToggle) return;
  quickSheet.classList.toggle("is-notes-expanded", quickSheetNotesExpanded);
  quickSheetDetailToggle.setAttribute("aria-pressed", String(quickSheetNotesExpanded));
  const label = quickSheetDetailToggle.querySelector("span");
  const sublabel = quickSheetDetailToggle.querySelector("small");
  if (label) label.textContent = quickSheetNotesExpanded ? "解説を省略表示" : "解説を全文表示";
  if (sublabel) sublabel.textContent = quickSheetNotesExpanded ? "COLLAPSE NOTES" : "EXPAND NOTES";
}

function renderQuickSheet({ character, skills, outfits, combos }) {
  const general = createQuickGeneralSkills(skills);
  const splitAt = Math.ceil(general.length / 2);
  const social = skills.filter(skill => skill.category === "social");
  const connections = skills.filter(skill => skill.category === "connection");
  const styleSkills = skills.filter(skill => skill.category === "style");
  const styleDivines = [1, 2, 3]
    .map(index => ({
      name: character[`style_${index}`],
      mark: character[`style_${index}_mark`],
      divine: character[`divine_${index}`]
    }))
    .filter(item => item.name || item.divine);
  const portrait = character.image_url || "./assets/placeholders/scan-failed.webp";
  const weaponOutfits = outfits.filter(outfit => outfit.category === "weapon");
  const armorOutfits = outfits.filter(outfit => outfit.category === "armor");
  const otherOutfits = outfits.filter(outfit => !["weapon", "armor"].includes(outfit.category));

  quickSheetPages.innerHTML = `
    <article class="quick-sheet__page quick-sheet__page--one">
      ${createQuickPageHeader(character, 1)}
      <section class="quick-sheet__identity">
        <div class="quick-sheet__portrait">
          <img src="${escapeHtml(portrait)}" alt="${escapeHtml(character.character_name || "キャスト画像")}">
        </div>
        <div class="quick-sheet__identity-main">
          <div class="quick-sheet__identity-name">
            <span>${escapeHtml(formatHandle(character.handle))}</span>
            <h1>${escapeHtml(character.character_name || "NO NAME")}</h1>
            <small>${escapeHtml(character.character_kana || "")}</small>
          </div>
          <dl class="quick-sheet__identity-meta">
            <div><dt>PLAYER</dt><dd>${escapeHtml(displayValue(character.player_name))}</dd></div>
            <div><dt>AFFILIATION</dt><dd>${escapeHtml(displayValue(character.affiliation))}</dd></div>
            <div><dt>RANK</dt><dd>${escapeHtml(displayValue(character.citizen_rank))}</dd></div>
            <div><dt>EXP</dt><dd>${escapeHtml(character.experience_points ?? 0)}</dd></div>
          </dl>
        </div>
      </section>
      <section class="quick-sheet__block quick-sheet__style-divines">
        ${createQuickBlockTitle("スタイル／神業", "STYLE / DIVINE WORK")}
        <div class="quick-sheet__style-divine-list">${styleDivines.map((item, index) => `<article><b>0${index + 1}</b><div><span>STYLE</span><strong>${escapeHtml(item.name || "—")} <em>${escapeHtml(item.mark || "")}</em></strong></div><div class="is-divine"><span>神業</span><strong>${escapeHtml(item.divine || "—")}</strong></div></article>`).join("") || `<p class="quick-sheet__empty">—</p>`}</div>
      </section>
      <section class="quick-sheet__block quick-sheet__abilities">
        ${createQuickBlockTitle("能力値／制御値", "ABILITY / CONTROL")}
        ${createQuickAbilityGrid(character)}
      </section>
      <div class="quick-sheet__skill-grid">
        <section class="quick-sheet__block quick-sheet__general-skills">
          ${createQuickBlockTitle("一般技能", "GENERAL SKILLS")}
          <div class="quick-sheet__general-columns">
            ${createQuickSkillTable(general.slice(0, splitAt))}
            ${createQuickSkillTable(general.slice(splitAt))}
          </div>
        </section>
        <div class="quick-sheet__skill-side">
          <section class="quick-sheet__block">
            ${createQuickBlockTitle("社会", "SOCIAL")}
            ${createQuickSkillTable(social)}
          </section>
          <section class="quick-sheet__block">
            ${createQuickBlockTitle("コネ", "CONNECTIONS")}
            ${createQuickSkillTable(connections)}
          </section>
        </div>
      </div>
      ${createQuickPageFooter(1)}
    </article>
    <article class="quick-sheet__page quick-sheet__page--two">
      ${createQuickPageHeader(character, 2)}
      <section class="quick-sheet__block quick-sheet__combos">
        ${createQuickBlockTitle("コンボ／技能カウンター", "COMBOS / COUNTERS")}
        ${createQuickComboGrid(combos, character)}
      </section>
      <section class="quick-sheet__block quick-sheet__style-skills" data-quick-sheet-section="style-skills">
        ${createQuickBlockTitle("スタイル技能", "STYLE SKILLS")}
        ${createQuickStyleSkillTable(styleSkills)}
      </section>
      <section class="quick-sheet__block quick-sheet__outfits quick-sheet__weapons" data-quick-sheet-section="weapons">
        ${createQuickBlockTitle("ウェポン", "WEAPON")}
        ${createQuickWeaponTable(weaponOutfits)}
      </section>
      <section class="quick-sheet__block quick-sheet__outfits quick-sheet__armor" data-quick-sheet-section="armor">
        ${createQuickBlockTitle("防具", "ARMOR")}
        ${createQuickArmorTable(armorOutfits)}
      </section>
      ${createQuickPageFooter(2)}
    </article>
    <article class="quick-sheet__page quick-sheet__page--three">
      ${createQuickPageHeader(character, 3)}
      <section class="quick-sheet__block quick-sheet__outfits" data-quick-sheet-section="other-outfits">
        ${createQuickBlockTitle("その他のアウトフィット", "OTHER OUTFITS")}
        ${createQuickOtherOutfitTable(otherOutfits)}
      </section>
      ${createQuickPageFooter(3)}
    </article>
  `;

  quickSheetPages.querySelectorAll(".quick-sheet__portrait img").forEach(image => {
    image.addEventListener("error", () => { image.src = "./assets/placeholders/scan-failed.webp"; }, { once: true });
  });
}

function createQuickPageHeader(character, page) {
  return `
    <header class="quick-sheet__page-header">
      <div><strong>N◎VA ARCHIVE // QUICK SHEET</strong><span>${escapeHtml(character.public_id || "NO ID")}</span></div>
      <p>${escapeHtml(formatHandle(character.handle))} ${escapeHtml(character.character_name || "NO NAME")}</p>
      <b>${page} / 3</b>
    </header>`;
}

function createQuickPageFooter(page) {
  return `<footer class="quick-sheet__page-footer"><span>TNX CAST ARCHIVE // ACT REFERENCE</span><b>PAGE ${page} / 3</b></footer>`;
}

function createQuickBlockTitle(japanese, english) {
  return `<h2 class="quick-sheet__block-title"><span>${japanese}</span><small>${english}</small></h2>`;
}

function createQuickAbilityGrid(character) {
  const abilities = [
    ["♠", "理性", character.reason_value, character.reason_control],
    ["♣", "感情", character.passion_value, character.passion_control],
    ["♥", "生命", character.life_value, character.life_control],
    ["♦", "外界", character.mundane_value, character.mundane_control]
  ];
  return `<div class="quick-sheet__ability-grid">
    ${abilities.map(([suit, name, value, control]) => `<div><strong>${suit} ${name}</strong><span>能力 <b>${escapeHtml(displayValue(value))}</b></span><span>制御 <b>${escapeHtml(displayValue(control))}</b></span></div>`).join("")}
    <div class="is-cs"><strong>CS</strong><span><b>${escapeHtml(displayValue(character.cs))}</b></span></div>
  </div>`;
}

function createQuickGeneralSkills(skills) {
  const registered = skills.filter(skill => skill.category === "general");
  const output = [];
  const used = new Set();

  for (const baseName of QUICK_GENERAL_ORDER) {
    const matches = registered.filter((skill, index) => {
      if (used.has(index)) return false;
      return quickGeneralFamily(skill.name) === baseName;
    });
    if (matches.length) {
      matches.forEach(skill => {
        used.add(registered.indexOf(skill));
        output.push(skill);
      });
    } else {
      output.push({ name: baseName, level: 0 });
    }
  }

  registered.forEach((skill, index) => {
    if (!used.has(index)) output.push(skill);
  });
  return output;
}

function quickGeneralFamily(value) {
  const name = String(value || "").trim().replace(/[;；]/g, "：");
  return ["製作：", "芸術：", "操縦："].find(prefix => name.startsWith(prefix)) || name;
}

function createQuickSkillTable(items) {
  return `<table class="quick-sheet__skill-table">
    <thead><tr><th>名称</th><th>LV</th><th>♠</th><th>♣</th><th>♥</th><th>♦</th></tr></thead>
    <tbody>${items.length ? items.map(skill => `<tr><td>${escapeHtml(skill.name || "—")}</td><td>${escapeHtml(skill.level ?? 0)}</td>${["reason", "passion", "life", "mundane"].map(key => `<td class="quick-sheet__suit${skill[key] ? " is-active" : ""}">${skill[key] ? "●" : ""}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="6" class="quick-sheet__empty">—</td></tr>`}</tbody>
  </table>`;
}

function createQuickComboGrid(combos, character) {
  if (!combos.length) return `<p class="quick-sheet__empty">登録なし</p>`;
  const usageLimits = new Map(combos.map(combo => [String(combo.id), getComboActUseLimit(combo)]).filter(([, limit]) => limit !== null));
  const usageState = loadComboUsageState(getComboUsageStorageKey(character), usageLimits);

  return `<div class="quick-sheet__combo-grid">${combos.map(combo => {
    const comboId = String(combo.id ?? "");
    const limit = usageLimits.get(comboId) ?? null;
    const used = limit ? (usageState.get(comboId) ?? 0) : 0;
    const skills = getComboSkills(combo);
    if (isSkillCounterCombo(combo)) {
      return `<article class="quick-sheet__combo-card is-counter"><header><small>COUNTER</small><strong>${escapeHtml(combo.name || skills || "—")}</strong><b>${limit ? `${used} / ${limit}` : "—"}</b></header></article>`;
    }
    const abilityKey = getComboValue(combo.ability, combo.ability_key).toLowerCase();
    const ability = COMBO_ABILITY_LABELS[abilityKey] || abilityKey || "—";
    const headline = [ability, combo.modifier ? `修正 ${combo.modifier}` : "", getComboValue(combo.target_value, combo.achievement) ? `達成 ${getComboValue(combo.target_value, combo.achievement)}` : "", limit ? `使用 ${used}/${limit}` : ""].filter(Boolean).join(" / ");
    const detail = [combo.timing ? `時:${combo.timing}` : "", combo.target ? `対:${combo.target}` : "", combo.range ? `射:${combo.range}` : "", combo.difficulty ? `難:${combo.difficulty}` : "", combo.confrontation ? `対決:${combo.confrontation}` : ""].filter(Boolean).join(" / ");
    return `<article class="quick-sheet__combo-card"><header><small>COMBO</small><strong>${escapeHtml(combo.name || "UNNAMED")}</strong><b>${escapeHtml(headline)}</b></header><p><span>技能</span>${escapeHtml(skills || "—")}</p><p class="quick-sheet__combo-detail">${escapeHtml([detail, getComboValue(combo.description, combo.effect)].filter(Boolean).join(" / ") || "—")}</p></article>`;
  }).join("")}</div>`;
}

function createQuickStyleSkillTable(skills) {
  if (!skills.length) return `<p class="quick-sheet__empty">登録なし</p>`;
  return `<div class="quick-sheet__table-scroll"><table class="quick-sheet__detail-table quick-sheet__style-table"><thead><tr><th>名称</th><th>LV</th><th>♠</th><th>♣</th><th>♥</th><th>♦</th><th>技能</th><th>時</th><th>対象</th><th>射程</th><th>難</th><th>対決</th><th class="quick-sheet__style-description">解説</th></tr></thead><tbody>${skills.map(skill => {
    const detail = parseQuickStyleDetail(skill.description);
    return `<tr><td>${escapeHtml(skill.name || "—")}</td><td>${escapeHtml(skill.level ?? "—")}</td>${["reason", "passion", "life", "mundane"].map(key => `<td class="quick-sheet__suit${skill[key] ? " is-active" : ""}">${skill[key] ? "●" : ""}</td>`).join("")}<td>${escapeHtml(detail.skill || "—")}</td><td>${escapeHtml(detail.timing || "—")}</td><td>${escapeHtml(detail.target || "—")}</td><td>${escapeHtml(detail.range || "—")}</td><td>${escapeHtml(detail.difficulty || "—")}</td><td>${escapeHtml(detail.confrontation || "—")}</td><td class="quick-sheet__style-description">${escapeHtml(detail.description || "—")}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function parseQuickStyleDetail(value) {
  const empty = { skill: "", limit: "", timing: "", target: "", range: "", difficulty: "", confrontation: "", description: "", page: "" };
  const text = String(value || "");
  if (text.startsWith(QUICK_STYLE_DETAIL_PREFIX)) {
    try {
      return { ...empty, ...JSON.parse(text.slice(QUICK_STYLE_DETAIL_PREFIX.length).trim()) };
    } catch {
      return { ...empty, description: text };
    }
  }
  const labels = { "技能": "skill", "上限": "limit", "タイミング": "timing", "対象": "target", "射程": "range", "目標値": "difficulty", "対決": "confrontation", "解説": "description", "参照": "page", "参照P": "page" };
  const remain = [];
  const data = { ...empty };
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^：:]+)[：:]\s*(.*)$/);
    const key = match && labels[match[1].trim()];
    if (key) data[key] = match[2];
    else if (line.trim()) remain.push(line);
  }
  if (!data.description) data.description = remain.join(" ");
  return data;
}

function createQuickWeaponTable(outfits) {
  if (!outfits.length) return `<p class="quick-sheet__empty">登録なし</p>`;
  const columns = ["name", "purchase", "concealment", "attack", "parry", "range", "speed", "electronic_control", "description"];
  return createQuickOutfitTable(outfits, columns, "quick-sheet__weapon-table");
}

function createQuickArmorTable(outfits) {
  if (!outfits.length) return `<p class="quick-sheet__empty">登録なし</p>`;
  const totals = quickArmorTotals(outfits);
  const columns = ["name", "purchase", "concealment", "defense_s", "defense_p", "defense_i", "control_modifier", "electronic_control", "description"];
  const totalCells = [["S", totals.s], ["P", totals.p], ["I", totals.i]]
    .map(([label, value]) => `<td class="quick-sheet__armor-total-value" aria-label="防御値合計 ${label} ${value}"><span>${label}</span><strong>${value}</strong></td>`)
    .join("");
  const firstDefenseIndex = columns.indexOf("defense_s");
  const trailingColumns = columns.length - firstDefenseIndex - 3;
  const totalRow = `<tfoot><tr class="quick-sheet__armor-total-row"><th class="quick-sheet__armor-total-label" colspan="${firstDefenseIndex}" scope="row"><span>防御値合計</span><small>TOTAL DEFENSE</small></th>${totalCells}${trailingColumns > 0 ? `<td class="quick-sheet__armor-total-spacer" colspan="${trailingColumns}" aria-hidden="true"></td>` : ""}</tr></tfoot>`;
  return createQuickOutfitTable(outfits, columns, "quick-sheet__armor-table", totalRow);
}

function createQuickOtherOutfitTable(outfits) {
  if (!outfits.length) return `<p class="quick-sheet__empty">登録なし</p>`;
  const groups = new Map(QUICK_OTHER_OUTFIT_GROUPS.map(group => [group.category, []]));
  outfits.forEach(outfit => {
    const category = groups.has(outfit.category) ? outfit.category : "other";
    groups.get(category).push(outfit);
  });
  return `<div class="quick-sheet__outfit-groups">${QUICK_OTHER_OUTFIT_GROUPS.map(group => {
    const items = groups.get(group.category);
    if (!items.length) return "";
    return `<section class="quick-sheet__outfit-group" data-quick-outfit-category="${group.category}"><h3><span>${group.japanese}</span><small>${group.english}</small></h3>${createQuickOutfitTable(items, group.columns, "quick-sheet__other-outfit-table")}</section>`;
  }).join("")}</div>`;
}

function createQuickOutfitTable(outfits, columns, tableClass, footer = "") {
  const header = columns.map(key => `<th class="${quickOutfitColumnClass(key)}">${QUICK_OUTFIT_COLUMN_LABELS[key] || key}</th>`).join("");
  const rows = outfits.map(outfit => `<tr>${columns.map(key => `<td class="${quickOutfitColumnClass(key)}">${escapeHtml(getQuickOutfitDisplayValue(outfit, key))}</td>`).join("")}</tr>`).join("");
  return `<div class="quick-sheet__outfit-table-wrap"><table class="quick-sheet__detail-table quick-sheet__outfit-table ${tableClass}"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody>${footer}</table></div>`;
}

function quickOutfitColumnClass(key) {
  const classes = [`quick-sheet__outfit-${key.replaceAll("_", "-")}`];
  if (!["name", "description"].includes(key)) classes.push("quick-sheet__outfit-stat");
  if (key === "attack") classes.push("is-attack");
  if (key === "electronic_control") classes.push("is-electronic");
  if (key === "description") classes.push("quick-sheet__outfit-detail");
  return classes.join(" ");
}

function getQuickOutfitDisplayValue(outfit, key) {
  if (key === "name") return displayValue(outfit.name);
  if (key === "description") return displayValue(outfit.description);
  if (key === "purchase") return formatPurchasePair(outfit);
  if (key === "concealment") return formatConcealmentPair(outfit);
  if (["defense_s", "defense_p", "defense_i"].includes(key)) {
    return displayValue(getQuickOutfitDefense(outfit)[key.slice(-1)]);
  }
  return displayValue(getQuickOutfitValue(outfit, key));
}

function getQuickOutfitValue(outfit, key) {
  const details = outfit.ofc_details && typeof outfit.ofc_details === "object" && !Array.isArray(outfit.ofc_details) ? outfit.ofc_details : {};
  return String(outfit[key] ?? details[key] ?? "").trim();
}

function getQuickOutfitDefense(outfit) {
  const parsed = parseQuickArmorDefense(outfit.defense);
  return {
    s: getQuickOutfitValue(outfit, "defense_s") || parsed.s,
    p: getQuickOutfitValue(outfit, "defense_p") || parsed.p,
    i: getQuickOutfitValue(outfit, "defense_i") || parsed.i
  };
}

function parseQuickArmorDefense(value) {
  const result = { s: "", p: "", i: "" };
  const text = String(value ?? "").trim();
  if (!text) return result;
  const labeled = [...text.matchAll(/(?:^|[\s,，/／])([SPI])\s*[:：]?\s*([+-]?\d+)/gi)];
  if (labeled.length) {
    labeled.forEach(match => { result[match[1].toLowerCase()] = match[2]; });
    return result;
  }
  const parts = text.split(/[\/／,，\s]+/).filter(Boolean);
  [result.s, result.p, result.i] = [parts[0] || "", parts[1] || "", parts[2] || ""];
  return result;
}

function quickArmorTotals(items) {
  const totals = { s: 0, p: 0, i: 0 };
  for (const item of items) {
    const defense = getQuickOutfitDefense(item);
    for (const key of Object.keys(totals)) {
      const raw = defense[key] || 0;
      const match = String(raw).match(/[+-]?\d+(?:\.\d+)?/);
      totals[key] += match ? Number(match[0]) : 0;
    }
  }
  return totals;
}

function fitQuickSheetPages() {
  if (!quickSheetPages) return;

  restoreQuickSheetSectionLayout();
  resetQuickSheetDensity();

  if (quickSheetNotesExpanded) {
    reflowQuickSheetExpandedNotes();
  }

  applyQuickSheetDensity();

  if (quickSheetNotesExpanded && quickSheetPageOverflows(quickSheetPages.querySelector(".quick-sheet__page--three"))) {
    moveOtherOutfitsToContinuationPage();
    resetQuickSheetDensity();
    applyQuickSheetDensity();
  }

  updateQuickSheetPageLabels();
}

function restoreQuickSheetSectionLayout() {
  const pageTwo = quickSheetPages.querySelector(".quick-sheet__page--two");
  const pageThree = quickSheetPages.querySelector(".quick-sheet__page--three");
  const styleSkills = quickSheetPages.querySelector('[data-quick-sheet-section="style-skills"]');
  const styleContinuation = quickSheetPages.querySelector('[data-quick-sheet-section="style-skills-continuation"]');
  const weapons = quickSheetPages.querySelector('[data-quick-sheet-section="weapons"]');
  const armor = quickSheetPages.querySelector('[data-quick-sheet-section="armor"]');
  const otherOutfits = quickSheetPages.querySelector('[data-quick-sheet-section="other-outfits"]');
  const pageTwoFooter = pageTwo?.querySelector(".quick-sheet__page-footer");
  const pageThreeFooter = pageThree?.querySelector(".quick-sheet__page-footer");

  const styleBody = styleSkills?.querySelector("tbody");
  if (styleBody && styleContinuation) {
    styleContinuation.querySelectorAll("tbody tr").forEach(row => styleBody.append(row));
  }
  if (styleSkills) styleSkills.hidden = false;
  styleContinuation?.remove();

  if (pageTwo && pageTwoFooter) {
    if (weapons) pageTwo.insertBefore(weapons, pageTwoFooter);
    if (armor) pageTwo.insertBefore(armor, pageTwoFooter);
  }
  if (pageThree && pageThreeFooter && otherOutfits) {
    pageThree.insertBefore(otherOutfits, pageThreeFooter);
  }

  pageThree?.classList.remove("has-core-outfits");
  quickSheetPages.querySelectorAll(".quick-sheet__page--continuation").forEach(page => page.remove());
}

function reflowQuickSheetExpandedNotes() {
  const pageTwo = quickSheetPages.querySelector(".quick-sheet__page--two");
  const pageThree = quickSheetPages.querySelector(".quick-sheet__page--three");
  const styleSkills = quickSheetPages.querySelector('[data-quick-sheet-section="style-skills"]');
  const weapons = quickSheetPages.querySelector('[data-quick-sheet-section="weapons"]');
  const armor = quickSheetPages.querySelector('[data-quick-sheet-section="armor"]');
  const otherOutfits = quickSheetPages.querySelector('[data-quick-sheet-section="other-outfits"]');

  if (!pageTwo || !pageThree || !quickSheetPageOverflows(pageTwo)) return;

  if (armor) pageThree.insertBefore(armor, otherOutfits || pageThree.querySelector(".quick-sheet__page-footer"));
  pageThree.classList.add("has-core-outfits");

  if (quickSheetPageOverflows(pageTwo) && weapons) {
    pageThree.insertBefore(weapons, armor || otherOutfits || pageThree.querySelector(".quick-sheet__page-footer"));
  }

  if (quickSheetPageOverflows(pageTwo) && styleSkills) {
    pageTwo.classList.add("is-tight", "is-tighter", "is-densest");
    if (quickSheetPageOverflows(pageTwo)) {
      moveOverflowingStyleRows(pageTwo, pageThree, styleSkills, weapons || armor || otherOutfits);
    }
    pageTwo.classList.remove("is-tight", "is-tighter", "is-densest");
  }
}

function moveOverflowingStyleRows(pageTwo, pageThree, styleSkills, beforeSection) {
  const sourceBody = styleSkills.querySelector("tbody");
  if (!sourceBody?.lastElementChild) return;

  const continuation = styleSkills.cloneNode(true);
  continuation.dataset.quickSheetSection = "style-skills-continuation";
  continuation.classList.add("quick-sheet__style-skills--continuation");
  const title = continuation.querySelector(".quick-sheet__block-title");
  const continuationBody = continuation.querySelector("tbody");
  if (title?.querySelector("span")) title.querySelector("span").textContent = "スタイル技能（続き）";
  if (title?.querySelector("small")) title.querySelector("small").textContent = "STYLE SKILLS CONT.";
  continuationBody?.replaceChildren();
  pageThree.insertBefore(continuation, beforeSection || pageThree.querySelector(".quick-sheet__page-footer"));

  while (quickSheetPageOverflows(pageTwo) && sourceBody.lastElementChild) {
    continuationBody.prepend(sourceBody.lastElementChild);
  }

  if (!sourceBody.children.length) styleSkills.hidden = true;
}

function moveOtherOutfitsToContinuationPage() {
  const otherOutfits = quickSheetPages.querySelector('[data-quick-sheet-section="other-outfits"]');
  const character = quickSheetContext?.character;
  if (!otherOutfits || !character) return;

  const page = document.createElement("article");
  page.className = "quick-sheet__page quick-sheet__page--continuation";
  page.innerHTML = `${createQuickPageHeader(character, 4)}${createQuickPageFooter(4)}`;
  page.insertBefore(otherOutfits, page.querySelector(".quick-sheet__page-footer"));
  quickSheetPages.append(page);
}

function resetQuickSheetDensity() {
  quickSheetPages.querySelectorAll(".quick-sheet__page").forEach(page => {
    page.classList.remove("is-tight", "is-tighter", "is-densest");
  });
}

function applyQuickSheetDensity() {
  quickSheetPages.querySelectorAll(".quick-sheet__page").forEach(page => {
    if (page.scrollHeight > page.clientHeight + 1) page.classList.add("is-tight");
    if (page.scrollHeight > page.clientHeight + 1) page.classList.add("is-tighter");
    if (page.scrollHeight > page.clientHeight + 1) page.classList.add("is-densest");
  });
}

function quickSheetPageOverflows(page) {
  return Boolean(page && page.scrollHeight > page.clientHeight + 1);
}

function updateQuickSheetPageLabels() {
  const pages = [...quickSheetPages.querySelectorAll(".quick-sheet__page")];
  const total = pages.length;

  pages.forEach((page, index) => {
    const pageNumber = index + 1;
    const headerCount = page.querySelector(".quick-sheet__page-header > b");
    const footerCount = page.querySelector(".quick-sheet__page-footer > b");
    if (headerCount) headerCount.textContent = `${pageNumber} / ${total}`;
    if (footerCount) footerCount.textContent = `PAGE ${pageNumber} / ${total}`;
  });

  const toolbarNote = quickSheet?.querySelector(".quick-sheet__toolbar-note");
  const printLabel = quickSheetPrint?.querySelector("small");
  if (toolbarNote) toolbarNote.textContent = `A4 PORTRAIT × ${total}`;
  if (printLabel) printLabel.textContent = `PRINT A4 × ${total}`;
}

function renderImage(character) {
  const image = document.querySelector("#cast-image");

  image.src =
    character.image_url ||
    "./assets/placeholders/scan-failed.webp";

  image.alt = character.character_name;
  image.style.objectPosition = getImageObjectPosition(character.image_url);
  image.style.setProperty("--tnx-image-scale", String(getImageScale(character.image_url)));
  image.style.setProperty("--tnx-image-origin", getImageTransformOrigin(character.image_url));

  image.addEventListener(
    "error",
    () => {
      image.src =
        "./assets/placeholders/scan-failed.webp";
    },
    { once: true }
  );
}

function renderStyles(character) {
  const styles = [
    {
      name: character.style_1,
      mark: character.style_1_mark,
      divine: character.divine_1
    },
    {
      name: character.style_2,
      mark: character.style_2_mark,
      divine: character.divine_2
    },
    {
      name: character.style_3,
      mark: character.style_3_mark,
      divine: character.divine_3
    }
  ].filter(style => style.name);

  document.querySelector("#cast-styles").innerHTML =
    styles
      .map((style, index) => `
        <article class="style-chip">
          <span class="style-chip__index">
            0${index + 1}
          </span>

          <span class="style-chip__name">
            ${escapeHtml(style.name)}
          </span>

          ${style.mark ? `<span class="style-chip__mark" aria-label="${escapeHtml(style.mark)}">${renderStyleMark(style.mark)}</span>` : ""}
        </article>
      `)
      .join("");
}

function renderStyleMark(mark) {
  const value = String(mark || "");
  const glyphs = [];
  if (value.includes("◎")) glyphs.push('<span class="style-mark-glyph style-mark-glyph--persona" aria-hidden="true"></span>');
  if (value.includes("●")) glyphs.push('<span class="style-mark-glyph style-mark-glyph--key" aria-hidden="true"></span>');
  return glyphs.length ? glyphs.join("") : escapeHtml(value);
}

function renderAbilities(character) {
  const abilities = [
    {
      key: "REASON",
      symbol: "♠",
      value: character.reason_value,
      control: character.reason_control
    },
    {
      key: "PASSION",
      symbol: "♣",
      value: character.passion_value,
      control: character.passion_control
    },
    {
      key: "LIFE",
      symbol: "♥",
      value: character.life_value,
      control: character.life_control
    },
    {
      key: "MUNDANE",
      symbol: "♦",
      value: character.mundane_value,
      control: character.mundane_control
    }
  ];

  document.querySelector("#ability-grid").innerHTML =
    abilities
      .map(ability => `
        <article class="ability-card">
          <header>
            <span>${ability.symbol}</span>
            <span>${ability.key}</span>
          </header>

          <div class="ability-card__numbers">
            <div>
              <span class="ability-card__label">
                VALUE
              </span>

              <strong>
                ${displayValue(ability.value)}
              </strong>
            </div>

            <div>
              <span class="ability-card__label">
                CONTROL
              </span>

              <strong>
                ${displayValue(ability.control)}
              </strong>
            </div>
          </div>
        </article>
      `)
      .join("");

  document.querySelector("#ability-grid").insertAdjacentHTML(
    "beforeend",
    `
      <article class="ability-card ability-card--cs">
        <header>
          <span>CS</span>
        </header>

        <div class="ability-card__numbers">
          <div>
            <span class="ability-card__label">
              CURRENT
            </span>

            <strong>
              ${displayValue(character.cs)}
            </strong>
          </div>
        </div>
      </article>
    `
  );
}

function renderDivineWorks(character) {
  const divineWorks = [
    {
      style: character.style_1,
      name: character.divine_1
    },
    {
      style: character.style_2,
      name: character.divine_2
    },
    {
      style: character.style_3,
      name: character.divine_3
    }
  ].filter(item => item.style || item.name);

  const container =
    document.querySelector("#divine-list");

  if (!divineWorks.length) {
    container.innerHTML =
      `<p class="empty-data">NO DATA</p>`;
    return;
  }

  container.innerHTML = divineWorks
    .map((item, index) => `
      <article class="divine-card">
        <span class="divine-card__number">
          0${index + 1}
        </span>

        <span class="divine-card__style">
          ${escapeHtml(item.style)}
        </span>

        <strong class="divine-card__name">
          ${escapeHtml(item.name || "UNREGISTERED")}
        </strong>
      </article>
    `)
    .join("");
}

function renderPersonalData(character) {
  const data = [
    ["AGE", character.age],
    ["GENDER", character.gender],
    ["HEIGHT", character.height],
    ["WEIGHT", character.weight],
    ["EYES", character.eyes],
    ["HAIR", character.hair],
    ["SKIN", character.skin]
  ];

  document.querySelector("#personal-data").innerHTML =
    createDefinitionList(data);
}

function renderLifePath(character) {
  const data = [
    ["ORIGIN", character.life_path_origin],
    ["EXPERIENCE", character.life_path_experience],
    ["ENCOUNTER", character.life_path_encounter]
  ];

  document.querySelector("#life-path").innerHTML =
    createDefinitionList(data);
}

function renderProfile(character) {
  const profile =
    character.profile?.trim() ||
    "プロフィールは登録されていません。";

  document.querySelector("#profile-text").innerHTML =
    escapeHtml(profile).replaceAll("\n", "<br>");
}

function renderSkills(skills) {
  const container =
    document.querySelector("#skills-container");

  if (!skills.length) {
    container.innerHTML =
      `<p class="empty-data">NO SKILL DATA</p>`;
    return;
  }

  const grouped = groupBy(skills, "category");

  container.innerHTML = Object.entries(SKILL_LABELS)
    .map(([category, label]) => {
      const items = grouped[category] ?? [];

      if (!items.length) {
        return "";
      }

      return `
        <section class="skill-section skill-section--${escapeHtml(category)}">
          <h3>${escapeHtml(label)}</h3>

          <div class="data-table-wrapper">
            <table class="data-table skill-data-table skill-data-table--${escapeHtml(category)}">
              <colgroup>
                <col class="skill-col-name">
                <col class="skill-col-level">
                <col class="skill-col-suit">
                <col class="skill-col-suit">
                <col class="skill-col-suit">
                <col class="skill-col-suit">
                <col class="skill-col-detail">
              </colgroup>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>LV</th>
                  <th>♠</th>
                  <th>♣</th>
                  <th>♥</th>
                  <th>♦</th>
                  <th>DETAIL</th>
                </tr>
              </thead>

              <tbody>
                ${items.map(createSkillRow).join("")}
              </tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");
}

function createSkillRow(skill) {
  const detail = [
    skill.timing,
    skill.target,
    skill.range,
    skill.difficulty,
    skill.confrontation,
    skill.description
  ]
    .filter(Boolean)
    .join(" / ");

  return `
    <tr>
      <td>${escapeHtml(skill.name)}</td>
      <td>${escapeHtml(skill.level)}</td>
      <td>${skill.reason ? "●" : ""}</td>
      <td>${skill.passion ? "●" : ""}</td>
      <td>${skill.life ? "●" : ""}</td>
      <td>${skill.mundane ? "●" : ""}</td>
      <td>${escapeHtml(detail)}</td>
    </tr>
  `;
}

function renderOutfits(outfits) {
  const container =
    document.querySelector("#outfit-container");

  if (!outfits.length) {
    container.innerHTML =
      `<p class="empty-data">NO OUTFIT DATA</p>`;
    return;
  }

  const grouped = groupBy(outfits, "category");

  container.innerHTML = Object
    .entries(OUTFIT_LABELS)
    .map(([category, label]) => {
      const items = grouped[category] ?? [];

      if (!items.length) {
        return "";
      }

      return `
        <section class="data-panel outfit-section">
          <header class="data-panel__header">
            <h2>${escapeHtml(label)}</h2>
          </header>

          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>PURCHASE</th>
                  <th>EXP</th>
                  <th>SLOT</th>
                  <th>RANGE</th>
                  <th>ATTACK</th>
                  <th>DEFENSE</th>
                  <th>DESCRIPTION</th>
                </tr>
              </thead>

              <tbody>
                ${items.map(createOutfitRow).join("")}
              </tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");
}

const COMBO_ABILITY_LABELS = {
  reason: "♠ 理性",
  passion: "♣ 感情",
  life: "♥ 生命",
  mundane: "♦ 外界"
};

function renderCombos(combos, character) {
  const container =
    document.querySelector("#combo-container");

  if (!container) {
    return;
  }

  container.classList.toggle("combo-container--dense", combos.length >= 5);

  if (!combos.length) {
    container.innerHTML =
      `<p class="empty-data">NO COMBO DATA</p>`;
    return;
  }

  const usageLimits = new Map(
    combos
      .map(combo => [String(combo.id), getComboActUseLimit(combo)])
      .filter(([, limit]) => limit !== null)
  );
  const usageStorageKey = getComboUsageStorageKey(character);
  const usageState = loadComboUsageState(usageStorageKey, usageLimits);

  const cards = combos
    .map(combo => {
      const abilityKey =
        getComboValue(combo.ability, combo.ability_key).toLowerCase();

      const abilityLabel =
        (COMBO_ABILITY_LABELS[abilityKey] ?? abilityKey) || "—";
      const abilityClass = Object.prototype.hasOwnProperty.call(COMBO_ABILITY_LABELS, abilityKey)
        ? ` combo-card__ability--${abilityKey}`
        : "";

      const skills = getComboSkills(combo);
      const modifier = getComboValue(combo.modifier);
      const targetValue = getComboValue(combo.target_value, combo.achievement);
      const comboId = String(combo.id ?? "");
      const actUseLimit = usageLimits.get(comboId) ?? null;
      const usedCount = actUseLimit ? (usageState.get(comboId) ?? 0) : 0;

      const outcome = [
        combo.timing ? `タイミング ${combo.timing}` : "",
        combo.difficulty ? `目標値 ${combo.difficulty}` : "",
        combo.confrontation ? `対決 ${combo.confrontation}` : "",
        combo.target ? `対象 ${combo.target}` : "",
        combo.range ? `射程 ${combo.range}` : ""
      ].filter(Boolean).join(" / ");

      const description = getComboValue(combo.description, combo.effect);
      const sortOrder = Number.isFinite(Number(combo.sort_order))
        ? Number(combo.sort_order)
        : 0;

      if (isSkillCounterCombo(combo)) {
        const counterName = combo.name || skills || "UNNAMED SKILL";
        return `
          <article class="combo-skill-counter" aria-label="技能カウンター ${escapeHtml(counterName)}">
            <div class="combo-skill-counter__identity">
              <p class="combo-skill-counter__kind">SKILL COUNTER</p>
              <h3>${escapeHtml(counterName)}</h3>
            </div>
            ${createComboUsageTracker(comboId, usedCount, actUseLimit, true, counterName)}
          </article>
        `;
      }

      return `
        <article class="combo-card">
          <header class="combo-card__header">
            <div class="combo-card__title">
              <p class="combo-card__index">
                COMBO ${String(sortOrder + 1).padStart(2, "0")}
              </p>
              <h3>${escapeHtml(combo.name || "UNNAMED COMBO")}</h3>
            </div>
            <dl class="combo-card__stats">
              <div>
                <dt>判定値修正</dt>
                <dd>${escapeHtml(modifier || "—")}</dd>
              </div>
              <div>
                <dt>達成値目安</dt>
                <dd>${escapeHtml(targetValue || "—")}</dd>
              </div>
            </dl>
            <span class="combo-card__ability${abilityClass}">
              ${escapeHtml(abilityLabel)}
            </span>
          </header>

          <div class="combo-card__body">
            <dl class="combo-card__meta">
              <div class="combo-card__skills-block">
                <dt class="combo-card__skills-label">
                  <span>組み合わせ技能</span>
                  ${skills ? `
                    <button class="combo-card__copy" type="button" data-combo-copy>
                      <span>コピー</span><small>COPY</small>
                    </button>
                  ` : ""}
                </dt>
                <dd class="combo-card__skills-value">${escapeHtml(skills || "—")}</dd>
              </div>
            </dl>

            ${outcome || description
              ? `
                <div class="combo-card__detail-copy">
                  ${outcome ? `<p class="combo-card__outcome">${escapeHtml(outcome)}</p>` : ""}
                  ${description ? `<p class="combo-card__description">${escapeHtml(description)}</p>` : ""}
                </div>
              `
              : ""}

            ${actUseLimit
              ? createComboUsageTracker(comboId, usedCount, actUseLimit, false, combo.name || "コンボ")
              : ""}
          </div>
        </article>
      `;
    })
    .join("");

  const usageToolbar = usageLimits.size
    ? `
      <div class="combo-runtime-toolbar">
        <div class="combo-runtime-toolbar__label">
          <strong>使用回数トラッカー</strong>
          <small>ACT USE TRACKER</small>
        </div>
        <button type="button" data-combo-reset-all>
          <span>全カウンターをリセット</span>
          <small>NEW ACT / RESET ALL</small>
        </button>
        <span class="visually-hidden" data-combo-announcer-all aria-live="polite" aria-atomic="true"></span>
      </div>
    `
    : "";

  container.innerHTML = usageToolbar + cards;
  setupComboInteractions(container, usageLimits, usageState, usageStorageKey);
}

function createComboUsageTracker(comboId, usedCount, limit, compact = false, itemName = "コンボ") {
  const remaining = Math.max(0, limit - usedCount);
  const reached = usedCount >= limit;
  const accessibleName = String(itemName || "コンボ").trim();

  return `
    <div class="combo-card__usage${compact ? " combo-card__usage--counter" : ""}${reached ? " is-limit-reached" : ""}"
      data-combo-usage data-combo-id="${escapeHtml(comboId)}" data-combo-label="${escapeHtml(accessibleName)}">
      <div class="combo-card__usage-status">
        <span>1アクト使用回数 <small>ACT USES</small></span>
        <strong>使用 <b data-combo-used>${usedCount}</b> / ${limit}</strong>
        <em data-combo-remaining>${reached ? "上限到達" : `残り ${remaining}回`}</em>
      </div>
      <div class="combo-card__usage-actions">
        <button type="button" data-combo-use aria-label="${escapeHtml(accessibleName)}の使用回数を1増やす" ${reached ? "disabled" : ""}>使用 +1</button>
        <button type="button" data-combo-undo aria-label="${escapeHtml(accessibleName)}の使用回数を1戻す" ${usedCount === 0 ? "disabled" : ""}>戻す -1</button>
        <button type="button" data-combo-reset aria-label="${escapeHtml(accessibleName)}の使用回数をリセット" ${usedCount === 0 ? "disabled" : ""}>リセット</button>
      </div>
      <span class="visually-hidden" data-combo-announcer aria-live="polite" aria-atomic="true"></span>
    </div>
  `;
}

function setupComboInteractions(container, usageLimits, usageState, usageStorageKey) {
  container.addEventListener("click", async event => {
    const copyButton = event.target.closest("[data-combo-copy]");

    if (copyButton) {
      const skills = copyButton
        .closest(".combo-card__skills-block")
        ?.querySelector(".combo-card__skills-value")
        ?.textContent
        ?.trim();

      if (skills) {
        await copyComboSkills(copyButton, skills);
      }
      return;
    }

    const resetAllButton = event.target.closest("[data-combo-reset-all]");

    if (resetAllButton) {
      for (const comboId of usageLimits.keys()) {
        usageState.set(comboId, 0);
      }
      persistComboUsageState(usageStorageKey, usageState);
      container.querySelectorAll("[data-combo-usage]")
        .forEach(usageElement => {
          const comboId = usageElement.dataset.comboId ?? "";
          const limit = usageLimits.get(comboId);
          if (limit) updateComboUsageElement(usageElement, 0, limit, false);
        });
      const announcer = container.querySelector("[data-combo-announcer-all]");
      if (announcer) announcer.textContent = "すべての使用回数カウンターを0にリセットしました。";
      return;
    }

    const usageButton = event.target.closest("[data-combo-use], [data-combo-undo], [data-combo-reset]");

    if (!usageButton) {
      return;
    }

    const usageElement = usageButton.closest("[data-combo-usage]");
    const comboId = usageElement?.dataset.comboId ?? "";
    const limit = usageLimits.get(comboId);

    if (!usageElement || !limit) {
      return;
    }

    const current = usageState.get(comboId) ?? 0;
    let next = current;

    if (usageButton.hasAttribute("data-combo-use")) {
      next = Math.min(limit, current + 1);
    } else if (usageButton.hasAttribute("data-combo-undo")) {
      next = Math.max(0, current - 1);
    } else if (usageButton.hasAttribute("data-combo-reset")) {
      next = 0;
    }

    usageState.set(comboId, next);
    persistComboUsageState(usageStorageKey, usageState);
    updateComboUsageElement(usageElement, next, limit);
  });
}

function updateComboUsageElement(usageElement, usedCount, limit, announce = true) {
  const remaining = Math.max(0, limit - usedCount);
  const reached = usedCount >= limit;

  usageElement.classList.toggle("is-limit-reached", reached);
  usageElement.querySelector("[data-combo-used]").textContent = String(usedCount);
  usageElement.querySelector("[data-combo-remaining]").textContent =
    reached ? "上限到達" : `残り ${remaining}回`;
  usageElement.querySelector("[data-combo-use]").disabled = reached;
  usageElement.querySelector("[data-combo-undo]").disabled = usedCount === 0;
  usageElement.querySelector("[data-combo-reset]").disabled = usedCount === 0;
  if (announce) {
    const announcer = usageElement.querySelector("[data-combo-announcer]");
    const label = usageElement.dataset.comboLabel || "使用回数";
    if (announcer) announcer.textContent = `${label}、使用 ${usedCount} / ${limit}、${reached ? "上限到達" : `残り ${remaining}回`}`;
  }
}

function getComboActUseLimit(combo) {
  const limit = Number.parseInt(String(combo.act_use_limit ?? ""), 10);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function isSkillCounterCombo(combo) {
  const name = getComboValue(combo.name);
  const skills = getComboSkills(combo);

  if (!name || name !== skills || !getComboActUseLimit(combo)) {
    return false;
  }

  return [
    combo.ability, combo.ability_key, combo.modifier, combo.target_value, combo.achievement,
    combo.timing, combo.target, combo.range, combo.difficulty, combo.confrontation,
    combo.description, combo.effect
  ].every(value => !getComboValue(value));
}

function getComboUsageStorageKey(character) {
  const appPath = new URL("./", window.location.href).pathname.replace(/\/$/, "");
  const publicId = String(character.public_id ?? character.id ?? "unknown");
  return `tnx-combo-usage:v1:${appPath}:${publicId}`;
}

function loadComboUsageState(storageKey, usageLimits) {
  let stored = {};

  try {
    stored = JSON.parse(window.localStorage.getItem(storageKey) || "{}") ?? {};
  } catch (error) {
    console.warn("Combo usage state could not be loaded.", error);
  }

  return new Map(
    [...usageLimits].map(([comboId, limit]) => {
      const value = Number.parseInt(String(stored[comboId] ?? 0), 10);
      const used = Number.isFinite(value) ? Math.min(limit, Math.max(0, value)) : 0;
      return [comboId, used];
    })
  );
}

function persistComboUsageState(storageKey, usageState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(usageState)));
  } catch (error) {
    console.warn("Combo usage state could not be saved.", error);
  }
}

async function copyComboSkills(button, skills) {
  try {
    await writeClipboardText(skills);
    setComboCopyButtonState(button, "success", "コピー済み", "COPIED");
  } catch (error) {
    console.error(error);
    setComboCopyButtonState(button, "error", "コピー失敗", "COPY FAILED");
  }

  window.setTimeout(() => {
    if (button.isConnected) {
      setComboCopyButtonState(button, "", "コピー", "COPY");
    }
  }, 1600);
}

function setComboCopyButtonState(button, state, label, english) {
  button.dataset.copyState = state;
  const labelElement = button.querySelector("span");
  const englishElement = button.querySelector("small");
  if (labelElement) labelElement.textContent = label;
  if (englishElement) englishElement.textContent = english;
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy copy path when clipboard permission is unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}

function getComboSkills(combo) {
  const currentSkills = getComboValue(combo.skills);

  if (currentSkills) {
    return currentSkills;
  }

  if (Array.isArray(combo.skill_names)) {
    return combo.skill_names
      .map(value => String(value ?? "").trim())
      .filter(Boolean)
      .join("＋");
  }

  return getComboValue(combo.skill_names);
}

function getComboValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function createOutfitRow(outfit) {
  return `
    <tr>
      <td>${escapeHtml(outfit.name)}</td>
      <td>${escapeHtml(outfit.purchase_value)}</td>
      <td>${escapeHtml(outfit.experience_cost)}</td>
      <td>${escapeHtml(outfit.slot)}</td>
      <td>${escapeHtml(outfit.range)}</td>
      <td>${escapeHtml(outfit.attack)}</td>
      <td>${escapeHtml(outfit.defense)}</td>
      <td>${escapeHtml(outfit.description)}</td>
    </tr>
  `;
}

function createDefinitionList(items) {
  return items
    .filter(([, value]) => value)
    .map(([label, value]) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `)
    .join("");
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const groupKey = item[key] || "other";
    groups[groupKey] ??= [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = displayValue(value);
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function formatHandle(handle) {
  if (!handle) {
    return "NO HANDLE";
  }

  return `“${handle}”`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(message) {
  statusText.textContent = "ACCESS DENIED";
  errorMessage.textContent = message;
  errorPanel.hidden = false;
}

setupQuickSheetControls();
loadCharacter();