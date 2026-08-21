import { initialGeneralSkillSuit } from "./general-skill-catalog.js?v=2";

const SUITS = ["reason", "passion", "life", "mundane"];

function applyDialogRule(name) {
  const requiredSuit = initialGeneralSkillSuit(name);
  const level = document.querySelector("#mobile-general-level");
  const policy = document.querySelector("#mobile-general-policy");

  for (const suit of SUITS) {
    const input = document.querySelector(`[data-mobile-general-suit="${suit}"]`);
    if (!input) continue;
    const locked = suit === requiredSuit;
    input.disabled = locked;
    if (locked) {
      input.checked = true;
      input.dataset.initialGeneralSuit = "1";
    } else {
      input.removeAttribute("data-initial-general-suit");
    }
  }

  if (!requiredSuit) return;
  if (level) {
    for (const option of level.options) option.disabled = Number(option.value) < 1;
    if (Number(level.value || 0) < 1) level.value = "1";
  }
  if (policy) policy.textContent = "初期取得技能：LV1未満不可／初期スート固定";
}

document.addEventListener("click", event => {
  const row = event.target.closest?.("[data-general-id]");
  if (!row) return;
  const name = row.querySelector(".mobile-general-display-name")?.textContent?.trim() || "";
  queueMicrotask(() => applyDialogRule(name));
});

document.addEventListener("change", event => {
  const input = event.target;
  if (input?.matches?.('[data-mobile-general-suit][data-initial-general-suit="1"]') && !input.checked) input.checked = true;
  if (input?.id === "mobile-general-level" && Number(input.value || 0) < 1) input.value = "1";
}, true);
