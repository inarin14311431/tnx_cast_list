import { SITE_BASE_PATH } from "./config.js";
import { supabase } from "./supabase-client.js";
import {
  requireAuth,
  signOut
} from "./auth-state.js";

const ownedCastsContainer =
  document.querySelector("#owned-casts");

initializeAccount();

async function initializeAccount() {
  const user = await requireAuth();

  if (!user) {
    return;
  }

  document.querySelector("#account-email").textContent =
    user.email ?? "UNKNOWN OPERATOR";

  document.querySelector("#account-user-id").textContent =
    user.id;

  document.querySelector(
    "#account-last-sign-in"
  ).textContent =
    formatDate(user.last_sign_in_at);

  document
    .querySelector("#logout-button")
    .addEventListener("click", async () => {
      try {
        await signOut();
      } catch (error) {
        console.error(error);
        alert("ログアウトに失敗しました。");
      }
    });

  await loadOwnedCharacters(user);
}

async function loadOwnedCharacters(user) {
  ownedCastsContainer.textContent =
    "SCANNING ASSIGNED CASTS...";

  const { data, error } = await supabase
    .from("characters")
    .select(`
      public_id,
      character_name,
      handle,
      visibility,
      updated_at
    `)
    .eq("owner_id", user.id)
    .order("updated_at", {
      ascending: false
    });

  if (error) {
    console.error(error);

    ownedCastsContainer.innerHTML = `
      <p class="auth-error">
        キャスト情報を取得できませんでした。
      </p>
    `;

    return;
  }

  if (!data.length) {
    ownedCastsContainer.innerHTML = `
      <p class="empty-data">
        NO ASSIGNED CAST
      </p>
    `;

    return;
  }

  ownedCastsContainer.innerHTML = `
    <div class="owned-cast-list">
      ${data.map(createOwnedCastItem).join("")}
    </div>
  `;
}

function createOwnedCastItem(character) {
  return `
    <article class="owned-cast">
      <div>
        <p class="owned-cast__id">
          ${escapeHtml(character.public_id)}
        </p>

        <p class="owned-cast__handle">
          ${escapeHtml(
            character.handle
              ? `“${character.handle}”`
              : "NO HANDLE"
          )}
        </p>

        <h3>
          ${escapeHtml(character.character_name)}
        </h3>
      </div>

<div class="owned-cast__meta">
  <span>
    ${escapeHtml(
      character.visibility.toUpperCase()
    )}
  </span>

<div class="owned-cast__links">
  <a
    href="${SITE_BASE_PATH}cast.html?id=${
      encodeURIComponent(character.public_id)
    }"
  >
    OPEN
  </a>

  <a
    href="${SITE_BASE_PATH}edit.html?id=${
      encodeURIComponent(character.public_id)
    }"
  >
    EDIT
  </a>

  <a
    href="${SITE_BASE_PATH}skills.html?id=${
      encodeURIComponent(character.public_id)
    }"
  >
    SKILLS
  </a>
<a
  href="${SITE_BASE_PATH}outfits.html?id=${
    encodeURIComponent(character.public_id)
  }"
>
  OUTFITS
</a>
<a
  href="${SITE_BASE_PATH}image.html?id=${
    encodeURIComponent(character.public_id)
  }"
>
  IMAGE
</a>
<a
  href="${SITE_BASE_PATH}combos.html?id=${
    encodeURIComponent(character.public_id)
  }"
>
  COMBOS
</a>
</div>
</div>
    </article>
  `;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}