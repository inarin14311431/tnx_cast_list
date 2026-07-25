import { supabase } from "./supabase-client.js";

const FULL_PROFILE_COLUMNS = "id,handle_kana,age,gender";
const SAFE_PUBLIC_COLUMNS = `
  id, public_id, player_name, character_name, character_kana,
  handle, affiliation, citizen_rank,
  style_1, style_1_mark, style_2, style_2_mark, style_3, style_3_mark,
  image_url, summary, updated_at
`;

async function canSelect(columns) {
  try {
    const { error } = await supabase
      .from("characters")
      .select(columns)
      .eq("visibility", "public")
      .limit(1);
    return !error;
  } catch (error) {
    console.warn("Showcase column probe failed.", error);
    return false;
  }
}

function installSafeCharacterSelect() {
  if (supabase.__showcaseSafeSelectInstalled) return;

  const originalFrom = supabase.from.bind(supabase);
  supabase.from = function patchedFrom(table) {
    const builder = originalFrom(table);
    if (table !== "characters" || !builder?.select) return builder;

    const originalSelect = builder.select.bind(builder);
    builder.select = function patchedSelect(columns, options) {
      const requested = String(columns ?? "");
      const isShowcasePublicQuery =
        requested.includes("handle_kana") &&
        requested.includes("age") &&
        requested.includes("gender") &&
        requested.includes("style_1");

      return originalSelect(isShowcasePublicQuery ? SAFE_PUBLIC_COLUMNS : columns, options);
    };
    return builder;
  };

  Object.defineProperty(supabase, "__showcaseSafeSelectInstalled", {
    value: true,
    configurable: true
  });
}

const fullProfileAvailable = await canSelect(FULL_PROFILE_COLUMNS);
if (!fullProfileAvailable) {
  const safeColumnsAvailable = await canSelect("id,public_id,character_name,player_name,style_1,updated_at");
  if (safeColumnsAvailable) {
    console.warn("Optional showcase profile columns are unavailable. Falling back to the public cast core fields.");
    installSafeCharacterSelect();
  }
}

try {
  await import("./showcase-generator-v2.js?v=3");
} catch (error) {
  console.error("Showcase generator could not be initialized.", error);
  const status = document.querySelector("#library-status");
  if (status) {
    status.textContent = "公開キャスト選択の初期化に失敗しました。ページを再読み込みしてください。";
    status.className = "generator-status is-error";
  }
}
