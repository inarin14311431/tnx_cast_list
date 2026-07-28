import { supabase } from "./supabase-client.js";

const ADMIN_UID = "f44d74d1-5f09-425f-8de8-a7fb6b46ea79";
const EMPTY_MARKS = new Set(["", "-", "－", "—"]);

initialize();

async function initialize() {
  const host = document.querySelector(".exp-panel");
  if (!host || !document.querySelector("#style-skills") || !document.querySelector("#outfit-list")) return;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (data?.user?.id !== ADMIN_UID) return;

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
    const [{ data: skdRows, error: skdError }, { data: ofcRows, error: ofcError }] = await Promise.all([
      supabase.from("skd_master")
        .select("name,type_label,skill,limit_text,timing,target,range_text,difficulty,confrontation,description,page_number")
        .range(0, 4999),
      supabase.from("ofc_master")
        .select("name,site_category,purchase_target,permanent_cost,concealment,concealment_penalty,attack,parry,range_text,speed,control_value,electronic_control,defense_s,defense_p,defense_i,slot,description,page_number,raw_data")
        .range(0, 4999)
    ]);
    if (skdError) throw skdError;
    if (ofcError) throw ofcError;

    const skdIndex = buildIndex(skdRows || [], row => normalizeStyleName(row.name));
    const ofcIndex = buildIndex(ofcRows || [], row => normalizeName(row.name));

    const skillResult = fillStyleSkills(skdIndex);
    const outfitResult = fillOutfits(ofcIndex);

    if (skillResult.changed + outfitResult.changed > 0) {
      document.dispatchEvent(new Event("input", { bubbles: true }));
    }

    alert([
      "SKD・OFC補完が完了しました。",
      "",
      `スタイル技能：${skillResult.changed}項目補完 / ${skillResult.unmatched}件未一致 / ${skillResult.ambiguous}件候補複数`,
      `アウトフィット：${outfitResult.changed}項目補完 / ${outfitResult.unmatched}件未一致 / ${outfitResult.ambiguous}件候補複数`,
      "",
      "既存の入力値は上書きしていません。"
    ].join("\n"));
  } catch (error) {
    console.error("Master autofill failed.", error);
    alert(`補完に失敗しました。\n${error instanceof Error ? error.message : String(error)}`);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function fillStyleSkills(index) {
  let changed = 0;
  let unmatched = 0;
  let ambiguous = 0;

  for (const row of document.querySelectorAll("#style-skills tr[data-skill-key]")) {
    const nameControl = row.querySelector('[data-f="name"]');
    const key = normalizeStyleName(nameControl?.value || "");
    if (!key) continue;
    const matches = index.get(key) || [];
    if (!matches.length) { unmatched += 1; continue; }
    if (matches.length !== 1) { ambiguous += 1; continue; }
    const source = matches[0];

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
    const name = base("name")?.value || "";
    const category = base("category")?.value || "other";
    const matches = (index.get(normalizeName(name)) || []).filter(item => !item.site_category || normalizeCategory(item.site_category) === category);
    if (!matches.length) { unmatched += 1; continue; }
    if (matches.length !== 1) { ambiguous += 1; continue; }
    const source = matches[0];
    const concealment = [source.concealment, source.concealment_penalty].filter(value => !isMissing(value)).join("/");

    changed += fillControl(base("purchase_value"), source.purchase_target);
    changed += fillControl(base("experience_cost"), source.permanent_cost);
    changed += fillControl(base("concealment"), concealment);
    changed += fillControl(base("attack"), source.attack);
    changed += fillControl(base("range"), source.range_text);
    changed += fillControl(base("slot"), source.slot);
    changed += fillControl(base("description"), source.description);
    changed += fillControl(ofc("parry"), source.parry);
    changed += fillControl(ofc("speed"), source.speed);
    changed += fillControl(ofc("electronic_control"), source.electronic_control);
    changed += fillControl(ofc("control_value"), source.control_value);
    changed += fillControl(ofc("defense_s"), source.defense_s);
    changed += fillControl(ofc("defense_p"), source.defense_p);
    changed += fillControl(ofc("defense_i"), source.defense_i);
    changed += fillControl(ofc("page_number"), source.page_number);

    const raw = source.raw_data && typeof source.raw_data === "object" ? source.raw_data : {};
    changed += fillControl(ofc("crew"), raw.crew ?? raw.passenger ?? raw.passengers);
    changed += fillControl(ofc("sf"), raw.sf ?? raw.speedFactor);
    changed += fillControl(ofc("tron_software"), raw.tron_software ?? raw.software ?? raw.soft);
    changed += fillControl(ofc("tron_support"), raw.tron_support ?? raw.support);
    changed += fillControl(ofc("tron_hardware"), raw.tron_hardware ?? raw.hardware ?? raw.hard);
    changed += fillControl(ofc("cs_value"), raw.cs_value ?? raw.cs);
    changed += fillControl(ofc("residence_entry"), raw.entry ?? raw.appearance);
    changed += fillControl(ofc("residence_electric"), raw.residence_electric ?? raw.electric);
    changed += fillControl(ofc("residence_area"), raw.residence_area ?? raw.area);
  }

  return { changed, unmatched, ambiguous };
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

function isMissing(value) {
  return EMPTY_MARKS.has(String(value ?? "").trim());
}
