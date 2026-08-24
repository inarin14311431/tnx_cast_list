import { supabase } from "./supabase-client.js";

const createLink = document.querySelector('a[href="./sheet-mobile-new.html"],a[href$="/sheet-mobile-new.html"]');
const createLabel = createLink?.querySelector("span");
if (createLabel) createLabel.textContent = "Mobile版 新規作成";

const accountActions = document.querySelector(".account-actions");
if (accountActions && !accountActions.querySelector('[data-troop-management-link]')) {
  const markup = '<a href="./troops.html" data-troop-management-link="1"><span>トループ管理</span><small>TROOP CONTROL</small></a>';
  const actsLink = accountActions.querySelector('a[href="./acts.html"]');
  if (actsLink) actsLink.insertAdjacentHTML("afterend", markup);
  else accountActions.insertAdjacentHTML("beforeend", markup);
}

void initializeLinkedTroops();

async function initializeLinkedTroops() {
  const auth = await supabase.auth.getUser();
  const user = auth.data?.user;
  if (!user) return;

  const [characterResult, troopResult] = await Promise.all([
    supabase.from("characters").select("id, public_id, experience_points").eq("owner_id", user.id),
    supabase.from("troops").select("character_id, experience_spent").eq("owner_id", user.id).not("character_id", "is", null)
  ]);

  if (characterResult.error || troopResult.error) {
    console.warn("Failed to resolve linked troop shortcuts.", characterResult.error || troopResult.error);
    return;
  }

  const idToCharacter = new Map((characterResult.data || []).map(character => [character.id, character]));
  const linkedTroops = new Map();
  for (const troop of troopResult.data || []) {
    const character = idToCharacter.get(troop.character_id);
    if (!character?.public_id) continue;
    const current = linkedTroops.get(character.public_id) || { experience: 0, count: 0 };
    current.experience += Number(troop.experience_spent) || 0;
    current.count += 1;
    linkedTroops.set(character.public_id, current);
  }
  const castExperience = new Map((characterResult.data || []).map(character => [character.public_id, Number(character.experience_points) || 0]));
  const root = document.querySelector("#owned-casts");
  if (!root) return;

  const decorate = () => root.querySelectorAll(".owned-cast").forEach(card => decorateCastCard(card, linkedTroops, castExperience));
  decorate();

  let queued = false;
  new MutationObserver(records => {
    if (!records.some(record => record.addedNodes.length)) return;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      decorate();
    });
  }).observe(root, { childList: true, subtree: true });
}

function decorateCastCard(card, linkedTroops, castExperience) {
  const castLink = card.querySelector('.owned-cast__links a[href*="cast.html?id="]');
  const management = card.querySelector(".owned-cast__management");
  if (!castLink || !management) return;

  const href = new URL(castLink.href, location.href);
  const publicId = href.searchParams.get("id") || "";
  const troopInfo = linkedTroops.get(publicId);
  const linked = Boolean(troopInfo?.count);
  const existing = management.querySelector("[data-cast-troops-link]");

  management.classList.toggle("owned-cast__management--with-troop", linked);
  if (!linked) {
    existing?.remove();
    card.querySelector('[data-cast-exp-breakdown]')?.remove();
    return;
  }
  if (!existing) {
    const troopMarkup = `<a href="./troops.html?character=${encodeURIComponent(publicId)}" class="owned-cast__troops" data-cast-troops-link="1"><span class="action-label__jp">トループ</span><small class="action-label__en">TROOPS</small></a>`;
    const acts = management.querySelector(".owned-cast__acts");
    if (acts) acts.insertAdjacentHTML("afterend", troopMarkup);
    else management.insertAdjacentHTML("afterbegin", troopMarkup);
  }

  const statusRow = card.querySelector('.owned-cast__status-row');
  if (!statusRow) return;
  const castExp = castExperience.get(publicId) || 0;
  let exp = statusRow.querySelector('[data-cast-exp-breakdown]');
  if (!exp) {
    exp = document.createElement('span');
    exp.className = 'owned-cast__experience';
    exp.dataset.castExpBreakdown = '1';
    statusRow.insertBefore(exp, statusRow.querySelector('.owned-cast__serial'));
  }
  exp.textContent = `消費 ${castExp}＋${troopInfo.experience} EXP`;
  exp.title = `キャスト ${castExp} / 関連トループ ${troopInfo.experience}`;
}
