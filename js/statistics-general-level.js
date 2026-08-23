import { supabase } from "./supabase-client.js";

const root = document.querySelector("#statistics-general-skills");
const statusNode = document.querySelector("#statistics-status");

if (root) waitForBaseStatisticsThenRender();

function waitForBaseStatisticsThenRender() {
  if (!statusNode || String(statusNode.textContent ?? "").includes("集計完了")) {
    void renderLevelWeightedGeneralSkills();
    return;
  }

  const observer = new MutationObserver(() => {
    if (!String(statusNode.textContent ?? "").includes("集計完了")) return;
    observer.disconnect();
    void renderLevelWeightedGeneralSkills();
  });

  observer.observe(statusNode, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

async function renderLevelWeightedGeneralSkills() {
  try {
    const { data: characters, error: characterError } = await supabase
      .from("characters")
      .select("id")
      .eq("visibility", "public");
    if (characterError) throw characterError;

    const ids = (characters ?? []).map(item => item.id).filter(Boolean);
    if (!ids.length) {
      renderEmpty();
      return;
    }

    const { data: skills, error: skillError } = await supabase
      .from("character_skills")
      .select("character_id, category, name, level")
      .in("character_id", ids);
    if (skillError) throw skillError;

    const generalSkillLevels = new Map();
    for (const skill of skills ?? []) {
      if (String(skill.category ?? "").trim() === "style") continue;

      const name = String(skill.name ?? "").trim();
      if (!name) continue;

      const skillLevel = Math.max(0, numberOrZero(skill.level));
      incrementBy(generalSkillLevels, name, skillLevel);
    }

    renderPodium(generalSkillLevels, 10);
  } catch (error) {
    console.error("Level-weighted general skill statistics failed:", error);
  }
}

function renderPodium(source, limit) {
  const entries = Array.from(source.entries())
    .sort((a, b) => b[1] - a[1] || localeCompareJa(a[0], b[0]))
    .slice(0, limit);

  if (!entries.length) {
    renderEmpty();
    return;
  }

  root.replaceChildren(...entries.map(([label, value], index) => {
    const item = document.createElement("div");
    item.className = `statistics-podium__item statistics-podium__item--${Math.min(index + 1, 4)}`;

    const rank = document.createElement("b");
    rank.textContent = String(index + 1).padStart(2, "0");

    const text = document.createElement("span");
    text.textContent = label;

    const count = document.createElement("strong");
    count.textContent = `SL合計 ${formatNumber(value)}`;

    item.append(rank, text, count);
    return item;
  }));
}

function renderEmpty() {
  root.innerHTML = '<p class="statistics-empty">集計対象データがありません。</p>';
}

function incrementBy(map, key, value) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return Number(value).toLocaleString("ja-JP", {
    maximumFractionDigits: 2
  });
}

function localeCompareJa(a, b) {
  return String(a).localeCompare(String(b), "ja", {
    sensitivity: "base",
    numeric: true
  });
}
