import { escapeHtml } from "./dom-escape.js";
import { displayValue, formatHandle } from "./cast-display-format.js?v=1";
import { formatPurchasePair, formatConcealmentPair } from "./outfit-view-model.js";
import { COMBO_ABILITY_LABELS, getComboActUseLimit, isSkillCounterCombo, getComboSkills, getComboValue } from "./cast-combo-rules.js?v=2";

// Pure HTML generation. Storage, DOM events and pagination belong to cast.js.
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

export function createQuickSheetHtml({ character, skills, outfits, combos }, usageState = new Map()) {
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

  return `
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
        ${createQuickComboGrid(combos, usageState)}
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

}

export function createQuickPageHeader(character, page) {
  return `
    <header class="quick-sheet__page-header">
      <div><strong>N◎VA ARCHIVE // QUICK SHEET</strong><span>${escapeHtml(character.public_id || "NO ID")}</span></div>
      <p>${escapeHtml(formatHandle(character.handle))} ${escapeHtml(character.character_name || "NO NAME")}</p>
      <b>${page} / 3</b>
    </header>`;
}

export function createQuickPageFooter(page) {
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

function createQuickComboGrid(combos, usageState) {
  if (!combos.length) return `<p class="quick-sheet__empty">登録なし</p>`;
  const usageLimits = new Map(combos.map(combo => [String(combo.id), getComboActUseLimit(combo)]).filter(([, limit]) => limit !== null));

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

