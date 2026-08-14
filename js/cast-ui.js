import { supabase } from "./supabase-client.js";
import { getCharacter } from "./cast-data-store.js";

/* Public cast-view shared UI only.
 * Skill table rendering/layout belongs to cast-compact-skills.js and cast-style-skills.js.
 * Outfit rendering belongs to cast-outfits.js.
 */
const content = document.querySelector("#cast-content");
initializeReadonlyFields();
initializeReturnLink();
initializeEditLinkAndLabels();
initializeHandleKana();
initializePanelClasses();

function whenCastReady(callback) {
  if (!content || !content.hidden) { callback(); return; }
  const observer = new MutationObserver(() => {
    if (content.hidden) return;
    observer.disconnect();
    callback();
  });
  observer.observe(content, { attributes: true, attributeFilter: ["hidden"] });
}

function initializeReadonlyFields() {
  if (!content) return;
  const selector = "input[readonly], textarea[readonly]";
  const apply = root => {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches(selector)) root.tabIndex = -1;
    root.querySelectorAll(selector).forEach(field => { field.tabIndex = -1; });
  };
  apply(content);
  new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes") apply(mutation.target);
      mutation.addedNodes.forEach(apply);
    });
  }).observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ["readonly"] });
}

function initializeReturnLink() {
  const returnValue = new URLSearchParams(location.search).get("return")?.trim() || "";
  if (!returnValue) return;
  try {
    const returnUrl = new URL(returnValue, location.href);
    const isArchive = returnUrl.origin === location.origin && /\/index\.html$/.test(returnUrl.pathname);
    if (!isArchive) return;
    document.querySelectorAll('.cast-header__back, #cast-error a[href="./index.html"]').forEach(link => { link.href = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`; });
  } catch {}
}

async function initializeOwnedEditLink() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  const editLink = document.querySelector("#cast-edit-button");
  if (!editLink) return;

  editLink.hidden = true;
  editLink.removeAttribute("href");
  editLink.setAttribute("aria-hidden", "true");

  if (!publicId) return;

  try {
    const [{ data: authData, error: authError }, character] = await Promise.all([
      supabase.auth.getUser(),
      getCharacter()
    ]);
    if (authError) throw authError;

    const user = authData?.user ?? null;
    const ownsCharacter = Boolean(user?.id && character?.owner_id && user.id === character.owner_id);
    if (!ownsCharacter) return;

    editLink.href = `./sheet.html?id=${encodeURIComponent(publicId)}`;
    editLink.hidden = false;
    editLink.removeAttribute("aria-hidden");
  } catch (error) {
    console.warn("cast edit access could not be verified", error);
  }
}

function initializeEditLinkAndLabels() {
  initializeOwnedEditLink();
  const setJapanese = (element, text) => { if (element) element.replaceChildren(document.createTextNode(text)); };
  const setBilingual = (element, jp, en) => {
    if (!element) return;
    element.replaceChildren(document.createTextNode(jp));
    if (en) { const small = document.createElement("small"); small.textContent = en; element.append(document.createTextNode(" "), small); }
  };
  whenCastReady(() => {
    const abilityLabels = { VALUE: "能力値", CONTROL: "制御値", CURRENT: "現在値" };
    document.querySelectorAll(".ability-card__label").forEach(element => { const hit = abilityLabels[element.textContent.trim().toUpperCase()]; if (hit) setJapanese(element, hit); });
    const abilityNames = { REASON: "理性", PASSION: "感情", LIFE: "生命", MUNDANE: "外界" };
    document.querySelectorAll(".ability-card:not(.ability-card--cs) header span:last-child").forEach(element => { const hit = abilityNames[element.textContent.trim().toUpperCase()]; if (hit) setJapanese(element, hit); });
    const skillHeadings = { "GENERAL SKILLS": ["一般技能", "GENERAL SKILLS"], SOCIAL: ["社会", "SOCIAL"], CONNECTIONS: ["コネクション", "CONNECTIONS"], "STYLE SKILLS": ["スタイル技能", "STYLE SKILLS"] };
    document.querySelectorAll("#skills-container .skill-section h3").forEach(element => { const hit = skillHeadings[element.textContent.trim().toUpperCase()]; if (hit) setBilingual(element, ...hit); });
    const profileLabels = { AGE: "年齢", GENDER: "性別", HEIGHT: "身長", WEIGHT: "体重", EYES: "瞳", HAIR: "髪", SKIN: "肌", ORIGIN: "出自", EXPERIENCE: "経験", ENCOUNTER: "邂逅" };
    document.querySelectorAll("#personal-data dt, #life-path dt").forEach(element => { const hit = profileLabels[element.textContent.trim().toUpperCase()]; if (hit) setJapanese(element, hit); });
    ensurePersonalDataRows();
  });
}

function ensurePersonalDataRows() {
  const list = document.querySelector("#personal-data");
  if (!list) return;
  const required = ["年齢", "性別", "身長", "体重", "瞳", "髪", "肌"];
  const values = new Map();
  [...list.children].forEach(row => { const label = row.querySelector("dt")?.textContent.trim() || ""; const value = row.querySelector("dd")?.textContent.trim() || ""; if (label) values.set(label, value || "—"); });
  list.replaceChildren(...required.map(label => {
    const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = label; dd.textContent = values.get(label) || "—"; row.append(dt, dd); return row;
  }));
}

async function initializeHandleKana() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  const handle = document.querySelector("#cast-handle");
  const handleKana = document.querySelector("#cast-handle-kana");
  if (handle?.textContent.trim() === "NO HANDLE") handle.textContent = "";
  if (!publicId || !handleKana) return;
  try {
    const character = await getCharacter();
    const value = String(character?.handle_kana || "").trim();
    handleKana.textContent = value ? `“${value}”` : "";
  } catch (error) { console.warn("handle kana could not be loaded", error); }
}

function initializePanelClasses() {
  whenCastReady(() => {
    const panels = [...document.querySelectorAll("#tab-session .data-layout > .data-panel")];
    panels[0]?.classList.add("panel-ability");
    document.querySelector("#skills-container")?.closest(".data-panel")?.classList.add("panel-skills");
    document.querySelector("#cast-combo-panel")?.classList.add("panel-combos");
  });
}
