import { supabase } from "./supabase-client.js";

const EMPTY_MARKS = new Set(["", "-", "－", "—", "―"]);
const MASTER_PAGE_SIZE = 1000;

initialize();

async function initialize() {
  const host = document.querySelector(".exp-panel");
  if (!host || !document.querySelector("#style-skills") || !document.querySelector("#outfit-list")) return;

  try {
    const { data, error } = await supabase.rpc("can_use_master_search");
    if (error) throw error;
    if (data !== true) return;

    const button = document.createElement("button");
    button.id = "master-autofill-button";
    button.type = "button";
    button.className = "master-search-open";
    button.innerHTML = `SKD・OFC補完 <small>FILL FROM MASTER</small>`;
    button.addEventListener("click", () => runAutofill(button));
    host.append(button);
  } catch (error) {
    console.warn("Master autofill access check failed.", error);
  }
}

async function runAutofill(button) {
  if (button.disabled) return;
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `補完中… <small>READING MASTER</small>`;

  try {
    const [skdRows, ofcRows] = await Promise.all([
      fetchAllRows("skd_master", "name,style,type_label,skill,limit_text,timing,target,range_text,difficulty,confrontation,description,page_number", "source_row"),
      fetchAllRows("ofc_master", "name,site_category,major_category,minor_category,manufacturer,purchase_target,permanent_cost,concealment,concealment_penalty,attack,parry,range_text,speed,control_value,electronic_control,defense_s,defense_p,defense_i,slot,description,page_number,raw_data", "source_row")
    ]);

    const skillResult = fillStyleSkills(buildIndex(skdRows, row => normalizeStyleName(row.name)));
    const outfitResult = fillOutfits(buildIndex(ofcRows, row => normalizeName(row.name)));

    alert([
      "SKD・OFC補完が完了しました。",
      "",
      `スタイル技能：${skillResult.changed}項目補完 / ${skillResult.unmatched}件未一致 / ${skillResult.ambiguous}件複数候補から選択`,
      `アウトフィット：${outfitResult.changed}項目補完 / ${outfitResult.unmatched}件未一致 / ${outfitResult.ambiguous}件複数候補から選択`,
      "",
      "空欄・ハイフン類の項目だけを補完し、既存値は上書きしていません。"
    ].join("\n"));
  } catch (error) {
    console.error("Master autofill failed.", error);
    alert(`補完に失敗しました。\n${error instanceof Error ? error.message : String(error)}`);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

async function fetchAllRows(table, columns, orderColumn) {
  const rows = [];
  for (let from = 0; ; from += MASTER_PAGE_SIZE) {
    let query = supabase.from(table).select(columns).range(from, from + MASTER_PAGE_SIZE - 1);
    if (orderColumn) query = query.order(orderColumn, { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < MASTER_PAGE_SIZE) break;
  }
  return rows;
}

function fillStyleSkills(index) {
  let changed = 0;
  let unmatched = 0;
  let ambiguous = 0;

  for (const row of document.querySelectorAll("#style-skills [data-skill-key]")) {
    const key = normalizeStyleName(row.querySelector('[data-f="name"]')?.value || "");
    if (!key) continue;

    const matches = index.get(key) || [];
    if (!matches.length) { unmatched += 1; continue; }
    if (matches.length > 1) ambiguous += 1;
    const source = chooseBestSkillMatch(row, matches);
    if (!source) continue;

    changed += fillControl(row.querySelector('[data-f="skill_kind"]'), source.type_label);
    changed += fillControl(row.querySelector('[data-style-field="skill"]'), source.skill);
    changed += fillControl(row.querySelector('[data-style-field="limit"]'), source.limit_text);
    changed += fillControl(row.querySelector('[data-style-field="timing"]'), source.timing);
    changed += fillControl(row.querySelector('[data-style-field="target"]'), source.target);
    changed += fillControl(row.querySelector('[data-style-field="range"]'), source.range_text);
    changed += fillControl(row.querySelector('[data-style-field="difficulty"]'), source.difficulty);
    changed += fillControl(row.querySelector('[data-style-field="confrontation"]'), source.confrontation);
    changed += fillControl(row.querySelector('[data-style-field="description"]'), source.description);
    changed += fillControl(row.querySelector('[data-style-field="page"]'), source.page_number);
  }

  return { changed, unmatched, ambiguous };
}

function fillOutfits(index) {
  let changed = 0;
  let unmatched = 0;
  let ambiguous = 0;

  for (const row of document.querySelectorAll("#outfit-list [data-outfit-key]")) {
    const base = key => row.querySelector(`[data-o="${key}"]`);
    const ofc = key => row.querySelector(`[data-ofc="${key}"]`);
    const category = base("category")?.value || row.closest("table")?.dataset.outfitSchema || "other";
    const key = normalizeName(base("name")?.value || "");
    if (!key) continue;

    const named = index.get(key) || [];
    const categoryMatches = named.filter(item => !item.site_category || normalizeCategory(item.site_category) === category);
    const matches = categoryMatches.length ? categoryMatches : named;
    if (!matches.length) { unmatched += 1; continue; }
    if (matches.length > 1) ambiguous += 1;
    const source = chooseBestOutfitMatch(row, matches);
    if (!source) continue;

    const raw = parseRawData(source.raw_data);
    const concealment = [source.concealment, source.concealment_penalty].filter(value => !isMissing(value)).join("/");
    const rangeValue = firstPresent(source.range_text, raw.range_text, raw.range, raw.rangeText);
    const electronicValue = firstPresent(source.electronic_control, raw.electronic_control, raw.electrical_control, raw.electronicControl, raw.electricalControl);
    const residence = readResidenceValues(raw);
    const defense = readDefenseValues(source, raw);

    changed += fillControl(base("purchase_value"), source.purchase_target);
    changed += fillControl(base("experience_cost"), source.permanent_cost);
    changed += fillControl(base("concealment"), concealment);
    changed += fillControl(base("attack"), source.attack);
    changed += fillControl(base("range") || ofc("range_text"), rangeValue);
    changed += fillControl(base("slot"), source.slot);
    changed += fillControl(base("description"), source.description);
    changed += fillControl(ofc("parry"), source.parry);
    changed += fillControl(ofc("speed"), source.speed);
    changed += fillControl(ofc("electronic_control"), electronicValue);
    changed += fillControl(ofc("control_value"), source.control_value);

    if (category === "armor") {
      changed += fillArmorDefense(row, defense);
    } else {
      changed += fillControl(ofc("defense_s"), defense.s);
      changed += fillControl(ofc("defense_i"), defense.i);
      changed += fillControl(ofc("defense_p"), defense.p);
    }

    changed += fillControl(ofc("page_number"), source.page_number);
    changed += fillControl(ofc("major_category"), source.major_category);
    changed += fillControl(ofc("minor_category"), source.minor_category);
    changed += fillControl(ofc("manufacturer"), source.manufacturer);

    changed += fillControl(ofc("crew"), firstPresent(raw.crew, raw.passenger, raw.passengers));
    changed += fillControl(ofc("sf"), firstPresent(raw.sf, raw.speedFactor));
    changed += fillControl(ofc("tron_software"), firstPresent(raw.tron_software, raw.software, raw.soft));
    changed += fillControl(ofc("tron_support"), firstPresent(raw.tron_support, raw.support));
    changed += fillControl(ofc("tron_hardware"), firstPresent(raw.tron_hardware, raw.hardware, raw.hard));
    changed += fillControl(ofc("cs_value"), firstPresent(raw.cs_value, raw.cs));
    changed += fillControl(ofc("residence_entry"), residence.entry);
    changed += fillControl(ofc("residence_electric"), residence.electric);
    changed += fillControl(ofc("residence_area"), residence.area);
  }

  return { changed, unmatched, ambiguous };
}

function fillArmorDefense(row, defense) {
  let changed = 0;
  const visible = {
    s: row.querySelector('[data-armor-defense="S"]'),
    i: row.querySelector('[data-armor-defense="I"]'),
    p: row.querySelector('[data-armor-defense="P"]')
  };

  changed += fillControl(visible.s, defense.s);
  changed += fillControl(visible.i, defense.i);
  changed += fillControl(visible.p, defense.p);

  if (!visible.s && !visible.i && !visible.p) {
    const original = row.querySelector('[data-o="defense"]');
    if (original && isMissing(original.value) && [defense.s, defense.i, defense.p].some(value => !isMissing(value))) {
      const encoded = [defense.s, defense.i, defense.p].map(value => isMissing(value) ? "" : String(value).trim()).join("/");
      changed += fillControl(original, encoded);
    }
  }

  return changed;
}

function readDefenseValues(source, raw) {
  return {
    s: firstPresent(source.defense_s, raw.defense_s, raw.defS, raw["S"], raw["防S"]),
    i: firstPresent(source.defense_i, raw.defense_i, raw.defI, raw["I"], raw["防I"]),
    p: firstPresent(source.defense_p, raw.defense_p, raw.defP, raw["P"], raw["防P"])
  };
}

function chooseBestSkillMatch(row, matches) {
  return chooseBestMatch(matches, source => scoreExistingPairs([
    [row.querySelector('[data-f="skill_kind"]')?.value, source.type_label],
    [row.querySelector('[data-style-field="skill"]')?.value, source.skill],
    [row.querySelector('[data-style-field="timing"]')?.value, source.timing],
    [row.querySelector('[data-style-field="target"]')?.value, source.target],
    [row.querySelector('[data-style-field="range"]')?.value, source.range_text],
    [row.querySelector('[data-style-field="page"]')?.value, source.page_number]
  ]) + completenessScore(source));
}

function chooseBestOutfitMatch(row, matches) {
  const base = key => row.querySelector(`[data-o="${key}"]`)?.value;
  const ofc = key => row.querySelector(`[data-ofc="${key}"]`)?.value;
  const armor = key => row.querySelector(`[data-armor-defense="${key}"]`)?.value;
  return chooseBestMatch(matches, source => scoreExistingPairs([
    [base("purchase_value"), source.purchase_target],
    [base("experience_cost"), source.permanent_cost],
    [base("attack"), source.attack],
    [base("range") || ofc("range_text"), source.range_text],
    [ofc("parry"), source.parry],
    [ofc("electronic_control"), source.electronic_control],
    [armor("S") || ofc("defense_s"), source.defense_s],
    [armor("I") || ofc("defense_i"), source.defense_i],
    [armor("P") || ofc("defense_p"), source.defense_p],
    [ofc("page_number"), source.page_number]
  ]) + completenessScore(source));
}

function chooseBestMatch(matches, scoreFn) {
  return [...matches].sort((a, b) => scoreFn(b) - scoreFn(a))[0] || null;
}

function scoreExistingPairs(pairs) {
  let score = 0;
  for (const [current, candidate] of pairs) {
    if (isMissing(current) || isMissing(candidate)) continue;
    score += normalizeName(current) === normalizeName(candidate) ? 100 : -25;
  }
  return score;
}

function completenessScore(source) {
  return Object.values(source || {}).reduce((score, value) => score + (isMissing(value) ? 0 : 1), 0);
}

function fillControl(control, value) {
  if (!control || !isMissing(control.value) || isMissing(value)) return 0;
  control.value = String(value).trim();
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
  control.classList.add("master-autofill-updated");
  window.setTimeout(() => control.classList.remove("master-autofill-updated"), 5000);
  return 1;
}

function buildIndex(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function normalizeStyleName(value) {
  return normalizeName(String(value || "").replace(/[@†※]/g, ""));
}

function normalizeName(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, "").trim().toLowerCase();
}

function normalizeCategory(value) {
  const text = normalizeName(value);
  if (/weapon|武器/.test(text)) return "weapon";
  if (/armor|armour|防具/.test(text)) return "armor";
  if (/cyber|サイバー/.test(text)) return "cyberware";
  if (/tron|トロン/.test(text)) return "tron";
  if (/vehicle|ヴィークル|車両/.test(text)) return "vehicle";
  if (/residence|住居/.test(text)) return "residence";
  return "other";
}

function readResidenceValues(raw) {
  const entry = firstPresent(
    raw.residence_entry, raw.entry, raw.appearance, raw.appear,
    raw["登場"], raw["登場値"], raw["登"]
  );
  let electric = firstPresent(
    raw.residence_electric, raw.electric, raw.electricity, raw.electric_value,
    raw["電"], raw["電制"], raw["電力"]
  );
  let area = firstPresent(
    raw.residence_area, raw.area, raw.area_value,
    raw["ア"], raw["エリア"], raw["区域"]
  );
  const combined = firstPresent(
    raw.electric_area, raw.residence_electric_area, raw.electricArea,
    raw["電/ア"], raw["電／ア"], raw["電ア"]
  );
  if (!isMissing(combined)) {
    const parts = String(combined).split(/[\/／]/).map(value => value.trim());
    if (isMissing(electric) && parts[0] !== undefined) electric = parts[0];
    if (isMissing(area) && parts[1] !== undefined) area = parts.slice(1).join("/");
  }
  return { entry, electric, area };
}

function parseRawData(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function firstPresent(...values) {
  return values.find(value => !isMissing(value)) ?? "";
}

function isMissing(value) {
  return EMPTY_MARKS.has(String(value ?? "").trim());
}
