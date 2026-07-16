import { supabase } from "./supabase-client.js";

const castGrid = document.querySelector("#cast-grid");
const statusText = document.querySelector("#status-text");

async function loadCharacters() {
  try {
    statusText.textContent = "SCANNING CAST DATABASE...";

    const { data, error } = await supabase
      .from("characters")
      .select(`
        id,
        public_id,
        player_name,
        character_name,
        character_kana,
        handle,
        affiliation,
        citizen_rank,
        experience_points,
        style_1,
        style_1_mark,
        style_2,
        style_2_mark,
        style_3,
        style_3_mark,
        image_url,
        summary,
        updated_at
      `)
      .eq("visibility", "public")
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    renderCharacters(data);
    statusText.textContent =
      `${data.length} CAST${data.length === 1 ? "" : "S"} DETECTED`;
  } catch (error) {
    console.error(error);
    statusText.textContent = "DATABASE CONNECTION FAILED";
    castGrid.innerHTML = `
      <p class="error-message">
        キャスト情報を取得できませんでした。
      </p>
    `;
  }
}

function renderCharacters(characters) {
  if (!characters.length) {
    castGrid.innerHTML = `
      <p class="empty-message">
        NO ASSIGNED CAST
      </p>
    `;
    return;
  }

  castGrid.innerHTML = characters
    .map(character => createCharacterCard(character))
    .join("");
}

function createCharacterCard(character) {
  const imageUrl =
    character.image_url ||
    "./assets/placeholders/scan-failed.webp";

  const styles = [
    [character.style_1, character.style_1_mark],
    [character.style_2, character.style_2_mark],
    [character.style_3, character.style_3_mark]
  ]
    .filter(([name]) => name)
    .map(([name, mark]) => `${escapeHtml(name)}${escapeHtml(mark)}`)
    .join(" / ");

  return `
    <article class="cast-card">
      <a href="./cast.html?id=${encodeURIComponent(character.public_id)}">
        <div class="cast-card__image">
          <img
            src="${escapeAttribute(imageUrl)}"
            alt="${escapeAttribute(character.character_name)}"
            loading="lazy"
          >
          <span class="cast-card__scanline"></span>
        </div>

        <div class="cast-card__body">
          <p class="cast-card__id">
            ${escapeHtml(character.public_id)}
          </p>

          <p class="cast-card__handle">
            ${escapeHtml(character.handle || "NO HANDLE")}
          </p>

          <h2 class="cast-card__name">
            ${escapeHtml(character.character_name)}
          </h2>

          <p class="cast-card__styles">
            ${styles}
          </p>

          <p class="cast-card__affiliation">
            ${escapeHtml(character.affiliation)}
          </p>

          <p class="cast-card__summary">
            ${escapeHtml(character.summary)}
          </p>
        </div>
      </a>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

loadCharacters();
