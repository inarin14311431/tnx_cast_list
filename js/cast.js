import { supabase } from "./supabase-client.js";

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
  renderCombos(combos);
}

function renderImage(character) {
  const image = document.querySelector("#cast-image");

  image.src =
    character.image_url ||
    "./assets/placeholders/scan-failed.webp";

  image.alt = character.character_name;

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

          <span class="style-chip__mark">
            ${escapeHtml(style.mark)}
          </span>
        </article>
      `)
      .join("");
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

function renderCombos(combos) {
  const container =
    document.querySelector("#combo-container");

  if (!container) {
    return;
  }

  if (!combos.length) {
    container.innerHTML =
      `<p class="empty-data">NO COMBO DATA</p>`;
    return;
  }

  container.innerHTML = combos
    .map(combo => {
      const abilityKey =
        String(combo.ability_key ?? "reason").toLowerCase();

      const abilityLabel =
        COMBO_ABILITY_LABELS[abilityKey] ?? abilityKey;

      const skillNames = Array.isArray(combo.skill_names)
        ? combo.skill_names
        : [];

      const outcome = [
        combo.difficulty ? `目標値 ${combo.difficulty}` : "",
        combo.confrontation ? `対決 ${combo.confrontation}` : "",
        combo.target ? `対象 ${combo.target}` : "",
        combo.range ? `射程 ${combo.range}` : ""
      ].filter(Boolean).join(" / ");

      return `
        <article class="combo-card">
          <header class="combo-card__header">
            <div>
              <p class="combo-card__index">
                COMBO ${String(combo.sort_order + 1).padStart(2, "0")}
              </p>
              <h3>${escapeHtml(combo.name || "UNNAMED COMBO")}</h3>
            </div>
            <span class="combo-card__ability">
              ${escapeHtml(abilityLabel)}
            </span>
          </header>

          <div class="combo-card__body">
            <dl class="combo-card__meta">
              <div>
                <dt>技能</dt>
                <dd>${escapeHtml(skillNames.join("＋") || "—")}</dd>
              </div>
              <div>
                <dt>達成値</dt>
                <dd>${escapeHtml(combo.achievement || "—")}</dd>
              </div>
              <div>
                <dt>効果</dt>
                <dd>${escapeHtml(combo.effect || "—")}</dd>
              </div>
            </dl>

            ${outcome ? `<p class="combo-card__outcome">${escapeHtml(outcome)}</p>` : ""}

            ${combo.description
              ? `<p class="combo-card__description">${escapeHtml(combo.description)}</p>`
              : ""}
          </div>
        </article>
      `;
    })
    .join("");
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
