import { supabase } from "./supabase-client.js";

const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
const desktopMedia = window.matchMedia("(min-width: 761px)");
if (publicId) void initialize();

async function initialize() {
  const characterResult = await supabase.from("characters").select("id, experience_points").eq("public_id", publicId).maybeSingle();
  if (characterResult.error || !characterResult.data) return;
  const troopResult = await supabase.from("troops")
    .select("public_id, name, visibility, level, member_max, style_1, utsuwa_attribute, experience_spent, reason_value, reason_control, passion_value, passion_control, life_value, life_control, mundane_value, mundane_control, skills, combos, outfits, notes")
    .eq("character_id", characterResult.data.id)
    .order("name");
  if (troopResult.error || !troopResult.data?.length) return;

  const troops = troopResult.data;
  const troopExperience = troops.reduce((sum, troop) => sum + Math.max(0, Number(troop.experience_spent) || 0), 0);
  const castExperience = Number(characterResult.data.experience_points) || 0;
  const expText = `${castExperience}＋${troopExperience}`;
  watchDesktopExperience(expText);
  ensureTroopDialog();

  const primary = document.querySelector(".cast-header__primary-actions");
  if (primary && !primary.querySelector("[data-cast-troops-jump]")) {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "cast-edit-link cast-troops-jump";
    trigger.dataset.castTroopsJump = "1";
    trigger.innerHTML = `<span>トループ</span><small>TROOP</small>`;
    trigger.addEventListener("click", () => {
      if (desktopMedia.matches) openTroopIndex(troops);
      else if (troops.length === 1) location.href = `./troop.html?id=${encodeURIComponent(troops[0].public_id)}`;
      else location.href = `./troops.html?character=${encodeURIComponent(publicId)}`;
    });
    primary.append(trigger);
  }

  watchUntilExperienceRendered(document.querySelector("#mobile-cast-view"), expText, ".mobile-cast-meta");
  watchUntilExperienceRendered(document.querySelector("#quick-sheet-pages"), expText, ".quick-sheet__identity-meta");
}

function ensureTroopDialog() {
  if (document.querySelector("#cast-troop-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "cast-troop-dialog";
  dialog.className = "cast-troop-dialog";
  dialog.innerHTML = `<div class="cast-troop-dialog__shell"><header class="cast-troop-dialog__header"><div><p>TROOP DATA</p><h2 id="cast-troop-dialog-title">トループ</h2></div><button type="button" data-troop-dialog-close aria-label="閉じる">閉じる</button></header><div id="cast-troop-dialog-body" class="cast-troop-dialog__body"></div></div>`;
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector("[data-troop-dialog-close]").addEventListener("click", () => dialog.close());
  document.body.append(dialog);
}

function openTroopIndex(troops) {
  const dialog = document.querySelector("#cast-troop-dialog");
  const title = dialog.querySelector("#cast-troop-dialog-title");
  const body = dialog.querySelector("#cast-troop-dialog-body");
  title.textContent = `配下トループ ${troops.length}`;
  body.innerHTML = `<div class="cast-troop-picker">${troops.map((troop, index) => `<button type="button" data-troop-index="${index}"><strong>${escapeHtml(troop.name || "名称未設定")}</strong><span>${escapeHtml(styleLabel(troop))} / Lv.${num(troop.level)} / 最大${Math.max(1, num(troop.member_max))}人 / EXP ${num(troop.experience_spent)}</span></button>`).join("")}</div>`;
  body.querySelectorAll("[data-troop-index]").forEach(button => button.addEventListener("click", () => openTroopDetail(troops[Number(button.dataset.troopIndex)], troops)));
  if (!dialog.open) dialog.showModal();
}

function openTroopDetail(troop, troops) {
  const dialog = document.querySelector("#cast-troop-dialog");
  const title = dialog.querySelector("#cast-troop-dialog-title");
  const body = dialog.querySelector("#cast-troop-dialog-body");
  title.textContent = troop.name || "名称未設定";
  const general = skillList(troop.skills, "general");
  const style = skillList(troop.skills, "style");
  body.innerHTML = `
    <div class="cast-troop-dialog__toolbar"><button type="button" data-troop-back>← 一覧</button><a href="./troop.html?id=${encodeURIComponent(troop.public_id)}">詳細ページ</a></div>
    <section class="cast-troop-summary">
      <div class="cast-troop-summary__style"><span>STYLE</span><strong>${escapeHtml(styleLabel(troop))}</strong></div>
      <div class="cast-troop-summary__basic"><span>LEVEL</span><strong>${num(troop.level)}</strong></div>
      <div class="cast-troop-summary__ability"><span>AR</span><strong>1</strong></div>
      <div class="cast-troop-summary__basic"><span>MAX</span><strong>${Math.max(1, num(troop.member_max))}</strong></div>
      <div class="cast-troop-summary__management"><span>EXP</span><strong>${num(troop.experience_spent)}</strong></div>
    </section>
    <section class="cast-troop-block cast-troop-block--abilities"><h3>能力値／制御値</h3>${abilityTable(troop)}</section>
    ${general ? `<section class="cast-troop-block cast-troop-block--general"><h3>一般技能</h3>${general}</section>` : ""}
    ${style ? `<section class="cast-troop-block cast-troop-block--style-skills"><h3>スタイル技能</h3>${style}</section>` : ""}
    ${comboList(troop.combos)}
    ${outfitList(troop.outfits)}
    ${troop.notes ? `<section class="cast-troop-block cast-troop-block--notes"><h3>メモ</h3><p class="cast-troop-notes">${escapeHtml(troop.notes)}</p></section>` : ""}`;
  body.querySelector("[data-troop-back]").addEventListener("click", () => openTroopIndex(troops));
}

function abilityTable(troop) {
  const rows = [
    ["♠ 理性", troop.reason_value, troop.reason_control],
    ["♣ 感情", troop.passion_value, troop.passion_control],
    ["♥ 生命", troop.life_value, troop.life_control],
    ["♦ 外界", troop.mundane_value, troop.mundane_control]
  ];
  const pairs = rows.map(([label, value, control]) => `<div class="cast-troop-ability-pair"><span>${label}</span><strong>${num(value)}<i>／</i>${num(control)}</strong></div>`).join("");
  return `<div class="cast-troop-abilities">${pairs}<div class="cast-troop-ability-pair cast-troop-ability-pair--cs"><span>CS</span><strong>${num(troop.level)}</strong></div></div>`;
}

function skillList(skills, category) {
  const list = (Array.isArray(skills) ? skills : []).filter(skill => isSkillCategory(skill, category));
  if (!list.length) return "";
  return `<div class="cast-troop-skills">${list.map(skill => `<div><strong>${escapeHtml(skill.name || "—")}</strong><span>Lv.${num(skill.level)} ${suits(skill)}</span>${skill.notes ? `<small>${escapeHtml(skill.notes)}</small>` : ""}</div>`).join("")}</div>`;
}

function isSkillCategory(skill, category) {
  if (category === "style") return skill?.category === "style" || (!skill?.category && ["normal","secret","ultimate","direction","none"].includes(skill?.type));
  return skill?.category === "general" || (!skill?.category && ["general","proper"].includes(skill?.kind));
}

function comboList(combos) {
  const list = Array.isArray(combos) ? combos : [];
  if (!list.length) return "";
  return `<section class="cast-troop-block cast-troop-block--combos"><h3>コンボ</h3><div class="cast-troop-combos">${list.map(combo => `<article><strong>${escapeHtml(combo.name || "—")}</strong><p>${escapeHtml(combo.skills || "")}</p><small>${escapeHtml([combo.timing, combo.target, combo.range].filter(Boolean).join(" / "))}</small>${combo.description ? `<p>${escapeHtml(combo.description)}</p>` : ""}</article>`).join("")}</div></section>`;
}

function outfitList(outfits) {
  const list = Array.isArray(outfits) ? outfits : [];
  if (!list.length) return "";
  return `<section class="cast-troop-block cast-troop-block--outfits"><h3>アウトフィット</h3><div class="cast-troop-outfits">${list.map(item => `<div><strong>${escapeHtml(item.name || "—")}</strong><span>${escapeHtml(item.attack || "—")}</span><span>S ${escapeHtml(item.defense_s || "—")} / P ${escapeHtml(item.defense_p || "—")} / I ${escapeHtml(item.defense_i || "—")}</span></div>`).join("")}</div></section>`;
}

function styleLabel(troop) {
  return troop.style_1 === "ウツワ" && troop.utsuwa_attribute ? `ウツワ（${troop.utsuwa_attribute}）` : (troop.style_1 || "STYLE未設定");
}

function suits(skill) {
  return [["reason","♠"],["passion","♣"],["life","♥"],["mundane","♦"]].filter(([key]) => skill?.[key]).map(([, suit]) => suit).join("");
}

function watchDesktopExperience(expText) {
  const exp = document.querySelector("#cast-exp");
  const castStatus = document.querySelector("#cast-status");
  if (!exp) return;
  const apply = () => setTextIfChanged(exp, `${expText} EXP`);
  if (!castStatus || castStatus.textContent?.trim() === "ACCESS GRANTED") {
    apply();
    return;
  }
  const observer = new MutationObserver(() => {
    if (castStatus.textContent?.trim() !== "ACCESS GRANTED") return;
    apply();
    observer.disconnect();
  });
  observer.observe(castStatus, { childList: true, characterData: true, subtree: true });
}

function watchUntilExperienceRendered(root, expText, targetSelector) {
  if (!root) return;
  if (decorateExperience(expText, targetSelector)) return;
  const observer = new MutationObserver(() => {
    if (decorateExperience(expText, targetSelector)) observer.disconnect();
  });
  observer.observe(root, { childList: true, subtree: true });
}

function setTextIfChanged(node, value) {
  if (!node || node.textContent === value) return false;
  node.textContent = value;
  return true;
}

function decorateExperience(expText, scope = "") {
  let found = false;
  const desktop = document.querySelector("#cast-exp");
  if (desktop) { found = true; setTextIfChanged(desktop, `${expText} EXP`); }
  if (!scope || scope === ".mobile-cast-meta") {
    document.querySelectorAll(".mobile-cast-meta div").forEach(item => {
      if (item.querySelector("dt")?.textContent?.trim() !== "EXP") return;
      const dd = item.querySelector("dd"); if (!dd) return;
      found = true; setTextIfChanged(dd, expText);
    });
  }
  if (!scope || scope === ".quick-sheet__identity-meta") {
    document.querySelectorAll("#quick-sheet-pages .quick-sheet__identity-meta div").forEach(item => {
      if (item.querySelector("dt")?.textContent?.trim() !== "EXP") return;
      const dd = item.querySelector("dd"); if (!dd) return;
      found = true; setTextIfChanged(dd, expText);
    });
  }
  return found;
}

function num(value) { return Math.max(0, Number(value) || 0); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
