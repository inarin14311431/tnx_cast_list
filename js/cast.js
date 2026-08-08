import { supabase } from "./supabase-client.js";
import { getImageObjectPosition, getImageScale, getImageTransformOrigin } from "./image-focus.js?v=3";

const content = document.querySelector("#cast-content");
const statusText = document.querySelector("#cast-status");
const errorPanel = document.querySelector("#cast-error");
const errorMessage = document.querySelector("#cast-error-message");

const OUTFIT_LABELS = {
  weapon: "WEAPON",
  armor: "ARMOR",
  cyberware: "CYBERWARE",
  tron: "TRON",
  vehicle: "VEHICLE",
  residence: "RESIDENCE",
  other: "OTHER"
};

const SKILL_LABELS = {
  general: "GENERAL SKILLS",
  social: "SOCIAL",
  connection: "CONNECTIONS",
  style: "STYLE SKILLS"
};

async function loadCharacter() {
  try {
    const publicId = getPublicId();

    if (!publicId) {
      throw new Error("キャストIDが指定されていません。");
    }

    statusText.textContent =
      `SCANNING IDENTIFICATION CODE: ${publicId}`;

    const { data: character, error: characterError } =
      await supabase
        .from("characters")
        .select("*")
        .eq("public_id", publicId)
        .maybeSingle();

    if (characterError) {
      throw characterError;
    }

    if (!character) {
      throw new Error("指定されたキャストは存在しません。");
    }

const [
  { data: skills, error: skillsError },
  { data: outfits, error: outfitsError },
  { data: combos, error: combosError }
] = await Promise.all([
  supabase
    .from("character_skills")
    .select("*")
    .eq("character_id", character.id)
    .order("category")
    .order("sort_order")
    .order("name"),

  supabase
    .from("character_outfits")
    .select("*")
    .eq("character_id", character.id)
    .order("category")
    .order("sort_order")
    .order("name"),

  supabase
    .from("character_combos")
    .select("*")
    .eq("character_id", character.id)
    .order("sort_order")
    .order("name")
]);

if (skillsError) {
  throw skillsError;
}

if (outfitsError) {
  throw outfitsError;
}

if (combosError) {
  throw combosError;
}

renderCharacter(
  character,
  skills ?? [],
  outfits ?? [],
  combos ?? []
);

    statusText.textContent = "ACCESS GRANTED";
    content.hidden = false;
  } catch (error) {
    console.error(error);
    showError(
      error instanceof Error
        ? error.message
        : "キャスト情報の取得に失敗しました。"
    );
  }
}

function getPublicId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id")?.trim() ?? "";
}

function renderCharacter(
  character,
  skills,
  outfits,
  combos
) {
  document.title =
    `${character.character_name} // N◎VA CAST ARCHIVE`;

  setText("#cast-public-id", character.public_id);
  setText("#cast-handle", formatHandle(character.handle));
  setText("#cast-name", character.character_name);
  setText("#cast-kana", character.character_kana);
  setText("#cast-player", character.player_name);
  setText("#cast-affiliation", character.affiliation);
  setText("#cast-rank", character.citizen_rank);
  setText(
    "#cast-exp",
    `${character.experience_points ?? 0} EXP`
  );
  setText("#cast-summary", character.summary);

  renderImage(character);
  renderStyles(character);
  renderAbilities(character);
  renderDivineWorks(character);
  renderPersonalData(character);
  renderLifePath(character);
  renderProfile(character);
  renderSkills(skills);
  renderOutfits(outfits);
  renderCombos(combos, character);
}

function renderImage(character) {
  const image = document.querySelector("#cast-image");

  image.src =
    character.image_url ||
    "./assets/placeholders/scan-failed.webp";

  image.alt = character.character_name;
  image.style.objectPosition = getImageObjectPosition(character.image_url);
  image.style.setProperty("--tnx-image-scale", String(getImageScale(character.image_url)));
  image.style.setProperty("--tnx-image-origin", getImageTransformOrigin(character.image_url));

  image.addEventListener(
    "error",
    () => {
      image.src =
        "./assets/placeholders/scan-failed.webp";
    },
    { once: true }
  );
}

function renderStyles(character) {
  const styles = [
    {
      name: character.style_1,
      mark: character.style_1_mark,
      divine: character.divine_1
    },
    {
      name: character.style_2,
      mark: character.style_2_mark,
      divine: character.divine_2
    },
    {
      name: character.style_3,
      mark: character.style_3_mark,
      divine: character.divine_3
    }
  ].filter(style => style.name);

  document.querySelector("#cast-styles").innerHTML =
    styles
      .map((style, index) => `
        <article class="style-chip">
          <span class="style-chip__index">
            0${index + 1}
          </span>

          <span class="style-chip__name">
            ${escapeHtml(style.name)}
          </span>

          ${style.mark ? `<span class="style-chip__mark" aria-label="${escapeHtml(style.mark)}">${renderStyleMark(style.mark)}</span>` : ""}
        </article>
      `)
      .join("");
}

function renderStyleMark(mark) {
  const value = String(mark || "");
  const glyphs = [];
  if (value.includes("◎")) glyphs.push('<span class="style-mark-glyph style-mark-glyph--persona" aria-hidden="true"></span>');
  if (value.includes("●")) glyphs.push('<span class="style-mark-glyph style-mark-glyph--key" aria-hidden="true"></span>');
  return glyphs.length ? glyphs.join("") : escapeHtml(value);
}

function renderAbilities(character) {
  const abilities = [
    {
      key: "REASON",
      symbol: "♠",
      value: character.reason_value,
      control: character.reason_control
    },
    {
      key: "PASSION",
      symbol: "♣",
      value: character.passion_value,
      control: character.passion_control
    },
    {
      key: "LIFE",
      symbol: "♥",
      value: character.life_value,
      control: character.life_control
    },
    {
      key: "MUNDANE",
      symbol: "♦",
      value: character.mundane_value,
      control: character.mundane_control
    }
  ];

  document.querySelector("#ability-grid").innerHTML =
    abilities
      .map(ability => `
        <article class="ability-card">
          <header>
            <span>${ability.symbol}</span>
            <span>${ability.key}</span>
          </header>

          <div class="ability-card__numbers">
            <div>
              <span class="ability-card__label">
                VALUE
              </span>

              <strong>
                ${displayValue(ability.value)}
              </strong>
            </div>

            <div>
              <span class="ability-card__label">
                CONTROL
              </span>

              <strong>
                ${displayValue(ability.control)}
              </strong>
            </div>
          </div>
        </article>
      `)
      .join("");

  document.querySelector("#ability-grid").insertAdjacentHTML(
    "beforeend",
    `
      <article class="ability-card ability-card--cs">
        <header>
          <span>CS</span>
        </header>

        <div class="ability-card__numbers">
          <div>
            <span class="ability-card__label">
              CURRENT
            </span>

            <strong>
              ${displayValue(character.cs)}
            </strong>
          </div>
        </div>
      </article>
    `
  );
}

function renderDivineWorks(character) {
  const divineWorks = [
    {
      style: character.style_1,
      name: character.divine_1
    },
    {
      style: character.style_2,
      name: character.divine_2
    },
    {
      style: character.style_3,
      name: character.divine_3
    }
  ].filter(item => item.style || item.name);

  const container =
    document.querySelector("#divine-list");

  if (!divineWorks.length) {
    container.innerHTML =
      `<p class="empty-data">NO DATA</p>`;
    return;
  }

  container.innerHTML = divineWorks
    .map((item, index) => `
      <article class="divine-card">
        <span class="divine-card__number">
          0${index + 1}
        </span>

        <span class="divine-card__style">
          ${escapeHtml(item.style)}
        </span>

        <strong class="divine-card__name">
          ${escapeHtml(item.name || "UNREGISTERED")}
        </strong>
      </article>
    `)
    .join("");
}

function renderPersonalData(character) {
  const data = [
    ["AGE", character.age],
    ["GENDER", character.gender],
    ["HEIGHT", character.height],
    ["WEIGHT", character.weight],
    ["EYES", character.eyes],
    ["HAIR", character.hair],
    ["SKIN", character.skin]
  ];

  document.querySelector("#personal-data").innerHTML =
    createDefinitionList(data);
}

function renderLifePath(character) {
  const data = [
    ["ORIGIN", character.life_path_origin],
    ["EXPERIENCE", character.life_path_experience],
    ["ENCOUNTER", character.life_path_encounter]
  ];

  document.querySelector("#life-path").innerHTML =
    createDefinitionList(data);
}

function renderProfile(character) {
  const profile =
    character.profile?.trim() ||
    "プロフィールは登録されていません。";

  document.querySelector("#profile-text").innerHTML =
    escapeHtml(profile).replaceAll("\n", "<br>");
}

function renderSkills(skills) {
  const container =
    document.querySelector("#skills-container");

  if (!skills.length) {
    container.innerHTML =
      `<p class="empty-data">NO SKILL DATA</p>`;
    return;
  }

  const grouped = groupBy(skills, "category");

  container.innerHTML = Object.entries(SKILL_LABELS)
    .map(([category, label]) => {
      const items = grouped[category] ?? [];

      if (!items.length) {
        return "";
      }

      return `
        <section class="skill-section skill-section--${escapeHtml(category)}">
          <h3>${escapeHtml(label)}</h3>

          <div class="data-table-wrapper">
            <table class="data-table skill-data-table skill-data-table--${escapeHtml(category)}">
              <colgroup>
                <col class="skill-col-name">
                <col class="skill-col-level">
                <col class="skill-col-suit">
                <col class="skill-col-suit">
                <col class="skill-col-suit">
                <col class="skill-col-suit">
                <col class="skill-col-detail">
              </colgroup>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>LV</th>
                  <th>♠</th>
                  <th>♣</th>
                  <th>♥</th>
                  <th>♦</th>
                  <th>DETAIL</th>
                </tr>
              </thead>

              <tbody>
                ${items.map(createSkillRow).join("")}
              </tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");
}

function createSkillRow(skill) {
  const detail = [
    skill.timing,
    skill.target,
    skill.range,
    skill.difficulty,
    skill.confrontation,
    skill.description
  ]
    .filter(Boolean)
    .join(" / ");

  return `
    <tr>
      <td>${escapeHtml(skill.name)}</td>
      <td>${escapeHtml(skill.level)}</td>
      <td>${skill.reason ? "●" : ""}</td>
      <td>${skill.passion ? "●" : ""}</td>
      <td>${skill.life ? "●" : ""}</td>
      <td>${skill.mundane ? "●" : ""}</td>
      <td>${escapeHtml(detail)}</td>
    </tr>
  `;
}

function renderOutfits(outfits) {
  const container =
    document.querySelector("#outfit-container");

  if (!outfits.length) {
    container.innerHTML =
      `<p class="empty-data">NO OUTFIT DATA</p>`;
    return;
  }

  const grouped = groupBy(outfits, "category");

  container.innerHTML = Object
    .entries(OUTFIT_LABELS)
    .map(([category, label]) => {
      const items = grouped[category] ?? [];

      if (!items.length) {
        return "";
      }

      return `
        <section class="data-panel outfit-section">
          <header class="data-panel__header">
            <h2>${escapeHtml(label)}</h2>
          </header>

          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>PURCHASE</th>
                  <th>EXP</th>
                  <th>SLOT</th>
                  <th>RANGE</th>
                  <th>ATTACK</th>
                  <th>DEFENSE</th>
                  <th>DESCRIPTION</th>
                </tr>
              </thead>

              <tbody>
                ${items.map(createOutfitRow).join("")}
              </tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");
}

const COMBO_ABILITY_LABELS = {
  reason: "♠ 理性",
  passion: "♣ 感情",
  life: "♥ 生命",
  mundane: "♦ 外界"
};

function renderCombos(combos, character) {
  const container =
    document.querySelector("#combo-container");

  if (!container) {
    return;
  }

  container.classList.toggle("combo-container--dense", combos.length >= 5);

  if (!combos.length) {
    container.innerHTML =
      `<p class="empty-data">NO COMBO DATA</p>`;
    return;
  }

  const usageLimits = new Map(
    combos
      .map(combo => [String(combo.id), getComboActUseLimit(combo)])
      .filter(([, limit]) => limit !== null)
  );
  const usageStorageKey = getComboUsageStorageKey(character);
  const usageState = loadComboUsageState(usageStorageKey, usageLimits);

  const cards = combos
    .map(combo => {
      const abilityKey =
        getComboValue(combo.ability, combo.ability_key).toLowerCase();

      const abilityLabel =
        (COMBO_ABILITY_LABELS[abilityKey] ?? abilityKey) || "—";
      const abilityClass = Object.prototype.hasOwnProperty.call(COMBO_ABILITY_LABELS, abilityKey)
        ? ` combo-card__ability--${abilityKey}`
        : "";

      const skills = getComboSkills(combo);
      const modifier = getComboValue(combo.modifier);
      const targetValue = getComboValue(combo.target_value, combo.achievement);
      const comboId = String(combo.id ?? "");
      const actUseLimit = usageLimits.get(comboId) ?? null;
      const usedCount = actUseLimit ? (usageState.get(comboId) ?? 0) : 0;

      const outcome = [
        combo.timing ? `タイミング ${combo.timing}` : "",
        combo.difficulty ? `目標値 ${combo.difficulty}` : "",
        combo.confrontation ? `対決 ${combo.confrontation}` : "",
        combo.target ? `対象 ${combo.target}` : "",
        combo.range ? `射程 ${combo.range}` : ""
      ].filter(Boolean).join(" / ");

      const description = getComboValue(combo.description, combo.effect);
      const sortOrder = Number.isFinite(Number(combo.sort_order))
        ? Number(combo.sort_order)
        : 0;

      if (isSkillCounterCombo(combo)) {
        const counterName = combo.name || skills || "UNNAMED SKILL";
        return `
          <article class="combo-skill-counter" aria-label="技能カウンター ${escapeHtml(counterName)}">
            <div class="combo-skill-counter__identity">
              <p class="combo-skill-counter__kind">SKILL COUNTER</p>
              <h3>${escapeHtml(counterName)}</h3>
            </div>
            ${createComboUsageTracker(comboId, usedCount, actUseLimit, true, counterName)}
          </article>
        `;
      }

      return `
        <article class="combo-card">
          <header class="combo-card__header">
            <div class="combo-card__title">
              <p class="combo-card__index">
                COMBO ${String(sortOrder + 1).padStart(2, "0")}
              </p>
              <h3>${escapeHtml(combo.name || "UNNAMED COMBO")}</h3>
            </div>
            <dl class="combo-card__stats">
              <div>
                <dt>判定値修正</dt>
                <dd>${escapeHtml(modifier || "—")}</dd>
              </div>
              <div>
                <dt>達成値目安</dt>
                <dd>${escapeHtml(targetValue || "—")}</dd>
              </div>
            </dl>
            <span class="combo-card__ability${abilityClass}">
              ${escapeHtml(abilityLabel)}
            </span>
          </header>

          <div class="combo-card__body">
            <dl class="combo-card__meta">
              <div class="combo-card__skills-block">
                <dt class="combo-card__skills-label">
                  <span>組み合わせ技能</span>
                  ${skills ? `
                    <button class="combo-card__copy" type="button" data-combo-copy>
                      <span>コピー</span><small>COPY</small>
                    </button>
                  ` : ""}
                </dt>
                <dd class="combo-card__skills-value">${escapeHtml(skills || "—")}</dd>
              </div>
            </dl>

            ${outcome || description
              ? `
                <div class="combo-card__detail-copy">
                  ${outcome ? `<p class="combo-card__outcome">${escapeHtml(outcome)}</p>` : ""}
                  ${description ? `<p class="combo-card__description">${escapeHtml(description)}</p>` : ""}
                </div>
              `
              : ""}

            ${actUseLimit
              ? createComboUsageTracker(comboId, usedCount, actUseLimit, false, combo.name || "コンボ")
              : ""}
          </div>
        </article>
      `;
    })
    .join("");

  const usageToolbar = usageLimits.size
    ? `
      <div class="combo-runtime-toolbar">
        <div class="combo-runtime-toolbar__label">
          <strong>使用回数トラッカー</strong>
          <small>ACT USE TRACKER</small>
        </div>
        <button type="button" data-combo-reset-all>
          <span>全カウンターをリセット</span>
          <small>NEW ACT / RESET ALL</small>
        </button>
        <span class="visually-hidden" data-combo-announcer-all aria-live="polite" aria-atomic="true"></span>
      </div>
    `
    : "";

  container.innerHTML = usageToolbar + cards;
  setupComboInteractions(container, usageLimits, usageState, usageStorageKey);
}

function createComboUsageTracker(comboId, usedCount, limit, compact = false, itemName = "コンボ") {
  const remaining = Math.max(0, limit - usedCount);
  const reached = usedCount >= limit;
  const accessibleName = String(itemName || "コンボ").trim();

  return `
    <div class="combo-card__usage${compact ? " combo-card__usage--counter" : ""}${reached ? " is-limit-reached" : ""}"
      data-combo-usage data-combo-id="${escapeHtml(comboId)}" data-combo-label="${escapeHtml(accessibleName)}">
      <div class="combo-card__usage-status">
        <span>1アクト使用回数 <small>ACT USES</small></span>
        <strong>使用 <b data-combo-used>${usedCount}</b> / ${limit}</strong>
        <em data-combo-remaining>${reached ? "上限到達" : `残り ${remaining}回`}</em>
      </div>
      <div class="combo-card__usage-actions">
        <button type="button" data-combo-use aria-label="${escapeHtml(accessibleName)}の使用回数を1増やす" ${reached ? "disabled" : ""}>使用 +1</button>
        <button type="button" data-combo-undo aria-label="${escapeHtml(accessibleName)}の使用回数を1戻す" ${usedCount === 0 ? "disabled" : ""}>戻す -1</button>
        <button type="button" data-combo-reset aria-label="${escapeHtml(accessibleName)}の使用回数をリセット" ${usedCount === 0 ? "disabled" : ""}>リセット</button>
      </div>
      <span class="visually-hidden" data-combo-announcer aria-live="polite" aria-atomic="true"></span>
    </div>
  `;
}

function setupComboInteractions(container, usageLimits, usageState, usageStorageKey) {
  container.addEventListener("click", async event => {
    const copyButton = event.target.closest("[data-combo-copy]");

    if (copyButton) {
      const skills = copyButton
        .closest(".combo-card__skills-block")
        ?.querySelector(".combo-card__skills-value")
        ?.textContent
        ?.trim();

      if (skills) {
        await copyComboSkills(copyButton, skills);
      }
      return;
    }

    const resetAllButton = event.target.closest("[data-combo-reset-all]");

    if (resetAllButton) {
      for (const comboId of usageLimits.keys()) {
        usageState.set(comboId, 0);
      }
      persistComboUsageState(usageStorageKey, usageState);
      container.querySelectorAll("[data-combo-usage]")
        .forEach(usageElement => {
          const comboId = usageElement.dataset.comboId ?? "";
          const limit = usageLimits.get(comboId);
          if (limit) updateComboUsageElement(usageElement, 0, limit, false);
        });
      const announcer = container.querySelector("[data-combo-announcer-all]");
      if (announcer) announcer.textContent = "すべての使用回数カウンターを0にリセットしました。";
      return;
    }

    const usageButton = event.target.closest("[data-combo-use], [data-combo-undo], [data-combo-reset]");

    if (!usageButton) {
      return;
    }

    const usageElement = usageButton.closest("[data-combo-usage]");
    const comboId = usageElement?.dataset.comboId ?? "";
    const limit = usageLimits.get(comboId);

    if (!usageElement || !limit) {
      return;
    }

    const current = usageState.get(comboId) ?? 0;
    let next = current;

    if (usageButton.hasAttribute("data-combo-use")) {
      next = Math.min(limit, current + 1);
    } else if (usageButton.hasAttribute("data-combo-undo")) {
      next = Math.max(0, current - 1);
    } else if (usageButton.hasAttribute("data-combo-reset")) {
      next = 0;
    }

    usageState.set(comboId, next);
    persistComboUsageState(usageStorageKey, usageState);
    updateComboUsageElement(usageElement, next, limit);
  });
}

function updateComboUsageElement(usageElement, usedCount, limit, announce = true) {
  const remaining = Math.max(0, limit - usedCount);
  const reached = usedCount >= limit;

  usageElement.classList.toggle("is-limit-reached", reached);
  usageElement.querySelector("[data-combo-used]").textContent = String(usedCount);
  usageElement.querySelector("[data-combo-remaining]").textContent =
    reached ? "上限到達" : `残り ${remaining}回`;
  usageElement.querySelector("[data-combo-use]").disabled = reached;
  usageElement.querySelector("[data-combo-undo]").disabled = usedCount === 0;
  usageElement.querySelector("[data-combo-reset]").disabled = usedCount === 0;
  if (announce) {
    const announcer = usageElement.querySelector("[data-combo-announcer]");
    const label = usageElement.dataset.comboLabel || "使用回数";
    if (announcer) announcer.textContent = `${label}、使用 ${usedCount} / ${limit}、${reached ? "上限到達" : `残り ${remaining}回`}`;
  }
}

function getComboActUseLimit(combo) {
  const limit = Number.parseInt(String(combo.act_use_limit ?? ""), 10);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function isSkillCounterCombo(combo) {
  const name = getComboValue(combo.name);
  const skills = getComboSkills(combo);

  if (!name || name !== skills || !getComboActUseLimit(combo)) {
    return false;
  }

  return [
    combo.ability, combo.ability_key, combo.modifier, combo.target_value, combo.achievement,
    combo.timing, combo.target, combo.range, combo.difficulty, combo.confrontation,
    combo.description, combo.effect
  ].every(value => !getComboValue(value));
}

function getComboUsageStorageKey(character) {
  const appPath = new URL("./", window.location.href).pathname.replace(/\/$/, "");
  const publicId = String(character.public_id ?? character.id ?? "unknown");
  return `tnx-combo-usage:v1:${appPath}:${publicId}`;
}

function loadComboUsageState(storageKey, usageLimits) {
  let stored = {};

  try {
    stored = JSON.parse(window.localStorage.getItem(storageKey) || "{}") ?? {};
  } catch (error) {
    console.warn("Combo usage state could not be loaded.", error);
  }

  return new Map(
    [...usageLimits].map(([comboId, limit]) => {
      const value = Number.parseInt(String(stored[comboId] ?? 0), 10);
      const used = Number.isFinite(value) ? Math.min(limit, Math.max(0, value)) : 0;
      return [comboId, used];
    })
  );
}

function persistComboUsageState(storageKey, usageState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(usageState)));
  } catch (error) {
    console.warn("Combo usage state could not be saved.", error);
  }
}

async function copyComboSkills(button, skills) {
  try {
    await writeClipboardText(skills);
    setComboCopyButtonState(button, "success", "コピー済み", "COPIED");
  } catch (error) {
    console.error(error);
    setComboCopyButtonState(button, "error", "コピー失敗", "COPY FAILED");
  }

  window.setTimeout(() => {
    if (button.isConnected) {
      setComboCopyButtonState(button, "", "コピー", "COPY");
    }
  }, 1600);
}

function setComboCopyButtonState(button, state, label, english) {
  button.dataset.copyState = state;
  const labelElement = button.querySelector("span");
  const englishElement = button.querySelector("small");
  if (labelElement) labelElement.textContent = label;
  if (englishElement) englishElement.textContent = english;
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy copy path when clipboard permission is unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}

function getComboSkills(combo) {
  const currentSkills = getComboValue(combo.skills);

  if (currentSkills) {
    return currentSkills;
  }

  if (Array.isArray(combo.skill_names)) {
    return combo.skill_names
      .map(value => String(value ?? "").trim())
      .filter(Boolean)
      .join("＋");
  }

  return getComboValue(combo.skill_names);
}

function getComboValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function createOutfitRow(outfit) {
  return `
    <tr>
      <td>${escapeHtml(outfit.name)}</td>
      <td>${escapeHtml(outfit.purchase_value)}</td>
      <td>${escapeHtml(outfit.experience_cost)}</td>
      <td>${escapeHtml(outfit.slot)}</td>
      <td>${escapeHtml(outfit.range)}</td>
      <td>${escapeHtml(outfit.attack)}</td>
      <td>${escapeHtml(outfit.defense)}</td>
      <td>${escapeHtml(outfit.description)}</td>
    </tr>
  `;
}

function createDefinitionList(items) {
  return items
    .filter(([, value]) => value)
    .map(([label, value]) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `)
    .join("");
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const groupKey = item[key] || "other";
    groups[groupKey] ??= [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = displayValue(value);
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function formatHandle(handle) {
  if (!handle) {
    return "NO HANDLE";
  }

  return `“${handle}”`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(message) {
  statusText.textContent = "ACCESS DENIED";
  errorMessage.textContent = message;
  errorPanel.hidden = false;
}

loadCharacter();
