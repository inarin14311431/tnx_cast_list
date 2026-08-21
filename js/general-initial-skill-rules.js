import { initialGeneralSkillSuit } from "./general-skill-catalog.js?v=2";

let queued = false;

function initialRuleFor(target) {
  const row = target?.closest?.('tr[data-skill-key]');
  if (!row?.closest?.('[data-skill-category="general"]')) return null;
  const name = row.querySelector('[data-f="name"]')?.value?.trim() || "";
  const suit = initialGeneralSkillSuit(name);
  return suit ? { row, suit } : null;
}

function emitInput(target) {
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

function lockRow(row) {
  const name = row.querySelector('[data-f="name"]')?.value?.trim() || "";
  const requiredSuit = initialGeneralSkillSuit(name);
  const level = row.querySelector('[data-f="level"]');
  const suitInputs = [...row.querySelectorAll('.suit-check input[data-f]')];

  if (!requiredSuit) {
    if (level) level.min = "0";
    for (const input of suitInputs) {
      input.disabled = false;
      input.removeAttribute("data-initial-general-suit");
      input.closest(".suit-check")?.classList.remove("is-locked");
      input.closest(".suit-check")?.removeAttribute("title");
    }
    return;
  }

  if (level) {
    level.min = "1";
    if (Number(level.value || 0) < 1) {
      level.value = "1";
      emitInput(level);
    }
  }

  for (const input of suitInputs) {
    const locked = input.dataset.f === requiredSuit;
    input.disabled = locked;
    if (locked) {
      input.dataset.initialGeneralSuit = "1";
      const label = input.closest(".suit-check");
      label?.classList.add("is-locked");
      label?.setAttribute("title", "初期取得スート");
      if (!input.checked) {
        input.checked = true;
        emitInput(input);
      }
    } else {
      input.removeAttribute("data-initial-general-suit");
      input.closest(".suit-check")?.classList.remove("is-locked");
      input.closest(".suit-check")?.removeAttribute("title");
    }
  }
}

function applyRules() {
  queued = false;
  document.querySelectorAll('#general-skills [data-skill-category="general"] tr[data-skill-key]').forEach(lockRow);
}

function queueRules() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(applyRules);
}

function enforceInput(event) {
  const target = event.target;
  if (!target?.matches?.('[data-f]')) return;
  const rule = initialRuleFor(target);
  if (rule) {
    if (target.dataset.f === "level" && Number(target.value || 0) < 1) target.value = "1";
    if (target.dataset.f === rule.suit && target.type === "checkbox" && !target.checked) target.checked = true;
  }
  queueRules();
}

document.addEventListener("input", enforceInput, true);
document.addEventListener("change", enforceInput, true);

function init() {
  const root = document.querySelector("#general-skills");
  if (!root) {
    setTimeout(init, 80);
    return;
  }
  new MutationObserver(queueRules).observe(root, { childList: true, subtree: true });
  queueRules();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
