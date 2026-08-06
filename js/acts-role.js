import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

const list = document.querySelector("#act-history-list");
const roleByParticipationId = new Map();

initializeRoleDisplay();

async function initializeRoleDisplay() {
  const user = await requireAuth();
  if (!user || !list) return;

  const { data: characters, error: characterError } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", user.id);

  if (characterError) {
    console.error(characterError);
    return;
  }

  const characterIds = (characters ?? []).map(character => character.id);
  if (!characterIds.length) return;

  const { data, error } = await supabase
    .from("act_participants")
    .select("id, participation_role")
    .in("character_id", characterIds);

  if (error) {
    console.error(error);
    showMigrationWarning(error);
    return;
  }

  for (const row of data ?? []) {
    const role = String(row.participation_role ?? "").trim();
    if (role) roleByParticipationId.set(String(row.id), role);
  }

  injectRoleBadges();
  observeHistoryRendering();
}

function observeHistoryRendering() {
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.addedNodes.length || mutation.removedNodes.length)) {
      window.requestAnimationFrame(injectRoleBadges);
    }
  });

  observer.observe(list, { childList: true, subtree: true });
}

function injectRoleBadges() {
  list.querySelectorAll("[data-participation-id]").forEach(record => {
    const participationId = String(record.dataset.participationId || "");
    const role = roleByParticipationId.get(participationId);
    const current = record.querySelector("[data-participation-role]");

    if (!role) {
      current?.remove();
      return;
    }

    if (current) {
      current.querySelector("strong").textContent = role;
      return;
    }

    const badge = document.createElement("div");
    badge.className = "act-record__role";
    badge.dataset.participationRole = "true";

    const label = document.createElement("small");
    label.textContent = "参加枠 / HANDOUT ROLE";
    const value = document.createElement("strong");
    value.textContent = role;
    badge.append(label, value);

    const main = record.querySelector(".act-record__main");
    const meta = main?.querySelector(".act-record__meta");
    if (meta) meta.after(badge);
    else main?.append(badge);
  });
}

function showMigrationWarning(error) {
  const message = String(error?.message ?? "");
  if (!/participation_role|column .* does not exist|PGRST204/i.test(message)) return;
  if (document.querySelector(".act-role-migration-warning")) return;

  const warning = document.createElement("p");
  warning.className = "act-role-migration-warning";
  warning.textContent = "参加枠を表示するには、Supabaseで supabase/19_act_participation_role.sql を実行してください。";
  list.before(warning);
}
