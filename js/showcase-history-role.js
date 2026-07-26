import { supabase } from "./supabase-client.js";

const selectedCasts = document.querySelector("#selected-casts");
const generatorStatus = document.querySelector("#generator-status");
const publishSlug = document.querySelector("#publish-slug");
const persistedKeys = new Set();

wrapHistoryRpc();
wrapPublishFunction();
observeCompletedOperations();

function wrapHistoryRpc() {
  if (!supabase || typeof supabase.rpc !== "function" || supabase.__historyRoleRpcWrapped) return;
  const originalRpc = supabase.rpc.bind(supabase);
  supabase.__historyRoleRpcWrapped = true;

  supabase.rpc = async (functionName, args, options) => {
    const result = await originalRpc(functionName, args, options);
    if (functionName === "record_act_history_for_current_user" && !result?.error && result?.data) {
      await persistRolesWithoutBreakingHistory(result.data);
    }
    return result;
  };
}

function wrapPublishFunction() {
  const functions = supabase?.functions;
  if (!functions || typeof functions.invoke !== "function" || functions.__historyRoleInvokeWrapped) return;
  const originalInvoke = functions.invoke.bind(functions);
  functions.__historyRoleInvokeWrapped = true;

  functions.invoke = async (functionName, options) => {
    const result = await originalInvoke(functionName, options);
    if (functionName === "publish-showcase" && !result?.error && result?.data?.actId) {
      await persistRolesWithoutBreakingHistory(result.data.actId);
    }
    return result;
  };
}

function observeCompletedOperations() {
  if (!generatorStatus) return;
  const observer = new MutationObserver(() => {
    const message = String(generatorStatus.textContent || "");
    if (!/公開処理が完了|参加アクト履歴へ登録しました/.test(message)) return;
    window.setTimeout(persistRolesByCurrentSlug, 0);
  });
  observer.observe(generatorStatus, { childList: true, subtree: true, characterData: true });
}

async function persistRolesByCurrentSlug() {
  const slug = normalizeSlug(publishSlug?.value);
  if (!slug) return;

  const { data, error } = await supabase
    .from("acts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data?.id) {
    if (error) console.error("Act ID could not be resolved for participation roles.", error);
    return;
  }

  await persistRolesWithoutBreakingHistory(data.id);
}

async function persistRolesWithoutBreakingHistory(actId) {
  const assignments = collectRoleAssignments();
  const persistenceKey = `${actId}:${assignments.map(item => `${item.characterId}=${item.role}`).join("|")}`;
  if (!assignments.length || persistedKeys.has(persistenceKey)) return;

  try {
    for (const assignment of assignments) {
      const { error } = await supabase
        .from("act_participants")
        .update({ participation_role: assignment.role })
        .eq("act_id", actId)
        .eq("character_id", assignment.characterId);

      if (error) throw error;
    }
    persistedKeys.add(persistenceKey);
  } catch (error) {
    console.error("Participation roles could not be saved.", error);
    window.setTimeout(() => {
      if (!generatorStatus) return;
      generatorStatus.textContent = "アクト履歴は登録されましたが、参加枠を保存できませんでした。Supabaseで supabase/19_act_participation_role.sql を実行してください。";
      generatorStatus.className = "generator-status is-error";
    }, 80);
  }
}

function collectRoleAssignments() {
  if (!selectedCasts) return [];
  const assignments = [];
  const seen = new Set();

  selectedCasts.querySelectorAll("[data-selected-index][data-character-id]").forEach(row => {
    const characterId = String(row.dataset.characterId || "").trim();
    const role = String(row.querySelector('[data-field="quote"]')?.value || "").trim().slice(0, 80);
    if (!characterId || !role || seen.has(characterId)) return;
    seen.add(characterId);
    assignments.push({ characterId, role });
  });

  return assignments;
}

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
