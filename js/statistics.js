import { supabase } from "./supabase-client.js";

const statusNode = document.querySelector("#statistics-status");
const generatedAtNode = document.querySelector("#statistics-generated-at");
const errorNode = document.querySelector("#statistics-error");

initialize();

async function initialize() {
  try {
    setStatus("公開データ集計中");
    const { data: characters, error: characterError } = await supabase
      .from("characters")
      .select(`
        id, public_id, player_name, affiliation, citizen_rank, experience_points,
        style_1, style_2, style_3,
        reason_value, passion_value, life_value, mundane_value,
        reason_control, passion_control, life_control, mundane_control, cs,
        updated_at
      `)
      .eq("visibility", "public");
    if (characterError) throw characterError;

    const publicCharacters = characters ?? [];
    const ids = publicCharacters.map(item => item.id).filter(Boolean);
    let skills = [];
    let outfits = [];

    if (ids.length) {
      const [skillResult, outfitResult] = await Promise.all([
        supabase
          .from("character_skills")
          .select("character_id, category, name, level, reason, passion, life, mundane")
          .in("character_id", ids),
        supabase
          .from("character_outfits")
          .select("character_id, category, name")
          .in("character_id", ids)
      ]);
      if (skillResult.error) throw skillResult.error;
      if (outfitResult.error) throw outfitResult.error;
      skills = skillResult.data ?? [];
      outfits = outfitResult.data ?? [];
    }

    renderStatistics(buildStatistics(publicCharacters, skills, outfits));
    const now = new Date();
    generatedAtNode.textContent = `集計日時 ${formatDateTime(now)}`;
    setStatus(`${publicCharacters.length}件 集計完了`);
  } catch (error) {
    console.error("Statistics load failed:", error);
    setStatus("集計失敗");
    if (errorNode) {
      errorNode.hidden = false;
      errorNode.textContent = "統計情報を取得できませんでした。時間をおいて再度読み込んでください。";
    }
  }
}

function buildStatistics(characters, skills, outfits) {
  const players = new Set();
  const affiliations = new Set();
  const styleCounts = new Map();
  const styleComboCounts = new Map();
  const affiliationCounts = new Map();
  const rankCounts = new Map();
  const generalSkillCharacters = new Map();
  const styleSkillCharacters = new Map();
  const outfitCategoryCounts = new Map();
  const outfitNameCounts = new Map();
  const skillCountByCharacter = new Map();
  const outfitCountByCharacter = new Map();
  const expBins = new Map([["0", 0], ["1–30", 0], ["31–60", 0], ["61–100", 0], ["101–200", 0], ["201+", 0]]);
  const csBins = new Map([["0–5", 0], ["6–8", 0], ["9–11", 0], ["12–14", 0], ["15+", 0]]);
  const abilityTotals = { reason: 0, passion: 0, life: 0, mundane: 0 };
  const controlTotals = { reason: 0, passion: 0, life: 0, mundane: 0 };

  let experienceTotal = 0;
  let recent = 0;
  const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const character of characters) {
    const player = clean(character.player_name);
    if (player) players.add(player);

    const affiliation = clean(character.affiliation);
    if (affiliation) {
      affiliations.add(affiliation);
      increment(affiliationCounts, affiliation);
    }

    increment(rankCounts, clean(character.citizen_rank) || "未登録");

    const exp = numberOrZero(character.experience_points);
    experienceTotal += exp;
    incrementExpBin(expBins, exp);
    incrementCsBin(csBins, numberOrZero(character.cs));

    abilityTotals.reason += numberOrZero(character.reason_value);
    abilityTotals.passion += numberOrZero(character.passion_value);
    abilityTotals.life += numberOrZero(character.life_value);
    abilityTotals.mundane += numberOrZero(character.mundane_value);
    controlTotals.reason += numberOrZero(character.reason_control);
    controlTotals.passion += numberOrZero(character.passion_control);
    controlTotals.life += numberOrZero(character.life_control);
    controlTotals.mundane += numberOrZero(character.mundane_control);

    const updated = new Date(character.updated_at).getTime();
    if (Number.isFinite(updated) && updated >= recentThreshold) recent += 1;

    const styles = [character.style_1, character.style_2, character.style_3].map(clean).filter(Boolean);
    styles.forEach(style => increment(styleCounts, style));
    if (styles.length) increment(styleComboCounts, [...styles].sort(localeCompareJa).join(" × "));
  }

  for (const skill of skills) {
    const characterId = skill.character_id;
    skillCountByCharacter.set(characterId, (skillCountByCharacter.get(characterId) ?? 0) + 1);
    const name = clean(skill.name);
    if (!name) continue;
    const category = clean(skill.category);
    const target = category === "style" ? styleSkillCharacters : generalSkillCharacters;
    if (!target.has(name)) target.set(name, new Set());
    target.get(name).add(characterId);
  }

  for (const outfit of outfits) {
    const characterId = outfit.character_id;
    outfitCountByCharacter.set(characterId, (outfitCountByCharacter.get(characterId) ?? 0) + 1);
    const category = normalizeOutfitCategory(outfit.category);
    increment(outfitCategoryCounts, category);
    const name = clean(outfit.name);
    if (name) increment(outfitNameCounts, name);
  }

  const divisor = Math.max(1, characters.length);
  return {
    total: characters.length,
    players: players.size,
    affiliations: affiliations.size,
    averageExp: characters.length ? Math.round(experienceTotal / characters.length) : 0,
    recent,
    styleCounts,
    styleComboCounts,
    affiliationCounts,
    rankCounts,
    expBins,
    csBins,
    generalSkillCounts: setMapToCountMap(generalSkillCharacters),
    styleSkillCounts: setMapToCountMap(styleSkillCharacters),
    outfitCategoryCounts,
    outfitNameCounts,
    abilities: mapAverage(abilityTotals, divisor),
    controls: mapAverage(controlTotals, divisor),
    averageSkillCount: averageMapCount(skillCountByCharacter, characters),
    averageOutfitCount: averageMapCount(outfitCountByCharacter, characters),
    mostCommonOutfit: topEntry(outfitNameCounts),
    rarestStyle: bottomEntry(styleCounts),
    mostCommonCombo: topEntry(styleComboCounts),
    highestAbility: highestNamedValue(mapAverage(abilityTotals, divisor)),
    highestControl: highestNamedValue(mapAverage(controlTotals, divisor))
  };
}

function renderStatistics(stats) {
  setText("#stat-total-casts", stats.total);
  setText("#stat-players", stats.players);
  setText("#stat-affiliations", stats.affiliations);
  setText("#stat-average-exp", stats.averageExp);
  setText("#stat-recent", stats.recent);

  renderRanking("#statistics-styles", stats.styleCounts, { limit: 20 });
  renderRanking("#statistics-ranks", stats.rankCounts, { limit: 12 });
  renderRanking("#statistics-exp", stats.expBins, { preserveOrder: true });
  renderRanking("#statistics-affiliation-ranking", stats.affiliationCounts, { limit: 12 });
  renderPodium("#statistics-general-skills", stats.generalSkillCounts, 10);
  renderPodium("#statistics-style-skills", stats.styleSkillCounts, 10);
  renderRadar(stats.abilities);
  renderMeters(stats.controls);
  renderHistogram(stats.csBins);
  renderDonut(stats.outfitCategoryCounts);
  renderStyleCombos(stats.styleComboCounts);
  renderOddities(stats);
}

function renderRanking(selector, source, options = {}) {
  const root = document.querySelector(selector);
  if (!root) return;
  let entries = Array.from(source.entries());
  if (!options.preserveOrder) entries.sort((a, b) => b[1] - a[1] || localeCompareJa(a[0], b[0]));
  if (options.limit) entries = entries.slice(0, options.limit);
  if (!entries.length) return renderEmpty(root);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  root.replaceChildren(...entries.map(([label, value]) => createRankingRow(label, value, max)));
}

function createRankingRow(label, value, max) {
  const ratio = Math.max(0, Math.min(100, (value / max) * 100));
  const row = document.createElement("div");
  row.className = "statistics-ranking__row";
  row.style.setProperty("--ratio", `${ratio.toFixed(2)}%`);
  const labelNode = document.createElement("span");
  labelNode.className = "statistics-ranking__label";
  labelNode.textContent = label;
  labelNode.title = label;
  const bar = document.createElement("span");
  bar.className = "statistics-ranking__bar";
  const fill = document.createElement("i");
  fill.style.setProperty("--ratio", `${ratio.toFixed(2)}%`);
  bar.append(fill);
  const valueNode = document.createElement("strong");
  valueNode.className = "statistics-ranking__value";
  valueNode.textContent = String(value);
  row.append(labelNode, bar, valueNode);
  return row;
}

function renderPodium(selector, source, limit) {
  const root = document.querySelector(selector);
  if (!root) return;
  const entries = Array.from(source.entries()).sort((a, b) => b[1] - a[1] || localeCompareJa(a[0], b[0])).slice(0, limit);
  if (!entries.length) return renderEmpty(root);
  root.replaceChildren(...entries.map(([label, value], index) => {
    const item = document.createElement("div");
    item.className = `statistics-podium__item statistics-podium__item--${Math.min(index + 1, 4)}`;
    const rank = document.createElement("b");
    rank.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.textContent = label;
    const count = document.createElement("strong");
    count.textContent = `${value}人`;
    item.append(rank, text, count);
    return item;
  }));
}

function renderRadar(values) {
  const root = document.querySelector("#statistics-abilities");
  if (!root) return;
  const labels = [["reason", "理性"], ["passion", "感情"], ["life", "生命"], ["mundane", "外界"]];
  const max = Math.max(1, ...labels.map(([key]) => values[key]));
  root.innerHTML = `<div class="statistics-radar__diamond" aria-hidden="true"></div>`;
  labels.forEach(([key, label], index) => {
    const item = document.createElement("div");
    item.className = `statistics-radar__axis statistics-radar__axis--${index + 1}`;
    const meter = Math.min(100, values[key] / max * 100);
    item.innerHTML = `<span>${label}</span><strong>${values[key].toFixed(1)}</strong><i style="--meter:${meter.toFixed(1)}%"></i>`;
    root.append(item);
  });
}

function renderMeters(values) {
  const root = document.querySelector("#statistics-controls");
  if (!root) return;
  const labels = [["reason", "理性"], ["passion", "感情"], ["life", "生命"], ["mundane", "外界"]];
  const max = Math.max(1, ...labels.map(([key]) => values[key]));
  root.replaceChildren(...labels.map(([key, label]) => {
    const item = document.createElement("div");
    item.className = "statistics-meter";
    item.style.setProperty("--meter", `${Math.min(100, values[key] / max * 100).toFixed(1)}%`);
    item.innerHTML = `<span>${label}</span><strong>${values[key].toFixed(1)}</strong><i></i>`;
    return item;
  }));
}

function renderHistogram(source) {
  const root = document.querySelector("#statistics-cs");
  if (!root) return;
  const entries = Array.from(source.entries());
  const max = Math.max(1, ...entries.map(([, value]) => value));
  root.replaceChildren(...entries.map(([label, value]) => {
    const item = document.createElement("div");
    item.className = "statistics-histogram__bar";
    item.style.setProperty("--height", `${Math.max(5, value / max * 100).toFixed(1)}%`);
    item.innerHTML = `<strong>${value}</strong><i></i><span>${label}</span>`;
    return item;
  }));
}

function renderDonut(source) {
  const root = document.querySelector("#statistics-outfit-mix");
  if (!root) return;
  const entries = Array.from(source.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return renderEmpty(root);
  const top = entries.slice(0, 6);
  const degrees = top.map(([, value]) => value / total * 360);
  let cursor = 0;
  const parts = degrees.map((degree, index) => {
    const start = cursor;
    cursor += degree;
    return `var(--donut-${index + 1}) ${start.toFixed(2)}deg ${cursor.toFixed(2)}deg`;
  });
  const chart = document.createElement("div");
  chart.className = "statistics-donut";
  chart.style.background = `conic-gradient(${parts.join(",")})`;
  chart.innerHTML = `<div><strong>${total}</strong><span>OUTFITS</span></div>`;
  const legend = document.createElement("div");
  legend.className = "statistics-donut-legend";
  top.forEach(([label, value], index) => {
    const item = document.createElement("div");
    item.innerHTML = `<i class="statistics-donut-key statistics-donut-key--${index + 1}"></i><span>${escapeHtml(label)}</span><strong>${Math.round(value / total * 100)}%</strong>`;
    legend.append(item);
  });
  root.replaceChildren(chart, legend);
}

function renderStyleCombos(source) {
  const root = document.querySelector("#statistics-style-combos");
  if (!root) return;
  const entries = Array.from(source.entries()).sort((a, b) => b[1] - a[1] || localeCompareJa(a[0], b[0])).slice(0, 12);
  if (!entries.length) return renderEmpty(root);
  root.replaceChildren(...entries.map(([label, value], index) => {
    const item = document.createElement("div");
    item.className = "statistics-combo-tile";
    item.innerHTML = `<small>#${String(index + 1).padStart(2, "0")}</small><strong>${escapeHtml(label)}</strong><span>${value} CAST${value === 1 ? "" : "S"}</span>`;
    return item;
  }));
}

function renderOddities(stats) {
  const root = document.querySelector("#statistics-oddities");
  if (!root) return;
  const items = [
    ["平均技能数", `${stats.averageSkillCount.toFixed(1)} 個`, "SKILLS / CAST"],
    ["平均アウトフィット数", `${stats.averageOutfitCount.toFixed(1)} 個`, "OUTFITS / CAST"],
    ["最も希少なスタイル", stats.rarestStyle ? `${stats.rarestStyle[0]} (${stats.rarestStyle[1]})` : "—", "RAREST STYLE"],
    ["最多アウトフィット", stats.mostCommonOutfit ? `${stats.mostCommonOutfit[0]} (${stats.mostCommonOutfit[1]})` : "—", "MOST COMMON OUTFIT"],
    ["最多スタイル構成", stats.mostCommonCombo ? stats.mostCommonCombo[0] : "—", "COMMON COMBINATION"],
    ["最も高い平均能力", `${stats.highestAbility.label} ${stats.highestAbility.value.toFixed(1)}`, "ABILITY PEAK"],
    ["最も高い平均制御", `${stats.highestControl.label} ${stats.highestControl.value.toFixed(1)}`, "CONTROL PEAK"]
  ];
  root.replaceChildren(...items.map(([label, value, english], index) => {
    const item = document.createElement("article");
    item.className = `statistics-oddity statistics-oddity--${(index % 4) + 1}`;
    item.innerHTML = `<span>${label}</span><strong>${escapeHtml(value)}</strong><small>${english}</small>`;
    return item;
  }));
}

function setMapToCountMap(source) {
  return new Map(Array.from(source, ([key, value]) => [key, value.size]));
}

function mapAverage(source, divisor) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value / divisor]));
}

function averageMapCount(source, characters) {
  if (!characters.length) return 0;
  const total = characters.reduce((sum, character) => sum + (source.get(character.id) ?? 0), 0);
  return total / characters.length;
}

function highestNamedValue(values) {
  const names = { reason: "理性", passion: "感情", life: "生命", mundane: "外界" };
  return Object.entries(values)
    .map(([key, value]) => ({ label: names[key], value }))
    .sort((a, b) => b.value - a.value)[0] ?? { label: "—", value: 0 };
}

function topEntry(map) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || localeCompareJa(a[0], b[0]))[0] ?? null;
}

function bottomEntry(map) {
  return Array.from(map.entries()).sort((a, b) => a[1] - b[1] || localeCompareJa(a[0], b[0]))[0] ?? null;
}

function normalizeOutfitCategory(value) {
  const raw = clean(value).toLowerCase();
  const labels = { weapon: "武器", armor: "防具", cyberware: "サイバーウェア", tron: "トロン", vehicle: "ヴィークル", residence: "住居", other: "その他" };
  return labels[raw] || clean(value) || "未分類";
}

function increment(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }
function incrementExpBin(map, value) {
  if (value <= 0) increment(map, "0");
  else if (value <= 30) increment(map, "1–30");
  else if (value <= 60) increment(map, "31–60");
  else if (value <= 100) increment(map, "61–100");
  else if (value <= 200) increment(map, "101–200");
  else increment(map, "201+");
}
function incrementCsBin(map, value) {
  if (value <= 5) increment(map, "0–5");
  else if (value <= 8) increment(map, "6–8");
  else if (value <= 11) increment(map, "9–11");
  else if (value <= 14) increment(map, "12–14");
  else increment(map, "15+");
}
function setText(selector, value) { const node = document.querySelector(selector); if (node) node.textContent = Number(value).toLocaleString("ja-JP"); }
function setStatus(value) { if (statusNode) statusNode.textContent = value; }
function renderEmpty(root) { root.innerHTML = '<p class="statistics-empty">集計対象データがありません。</p>'; }
function clean(value) { return String(value ?? "").trim(); }
function numberOrZero(value) { const number = Number(value); return Number.isFinite(number) ? number : 0; }
function localeCompareJa(a, b) { return String(a).localeCompare(String(b), "ja", { sensitivity: "base", numeric: true }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char])); }
function formatDateTime(date) { return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date); }
