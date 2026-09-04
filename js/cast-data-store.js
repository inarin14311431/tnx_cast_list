import { supabase } from "./supabase-client.js";
import { normalizeOutfitListForView } from "./outfit-view-model.js?v=3";

/* Shared read-only data access for the public cast view.
 * Queries intentionally match cast.js so the public-view Supabase cache can
 * reuse the same in-flight/result Promise instead of issuing another request.
 */
let characterPromise = null;
let skillsPromise = null;
let outfitsPromise = null;
let combosPromise = null;

function getPublicId() {
  return new URLSearchParams(location.search).get("id")?.trim() || "";
}

export async function getCharacter() {
  if (characterPromise) return characterPromise;

  characterPromise = (async () => {
    const publicId = getPublicId();
    if (!publicId) return null;

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("public_id", publicId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  })();

  return characterPromise;
}

export async function getCharacterId() {
  return (await getCharacter())?.id ?? null;
}

export async function getSkills() {
  if (skillsPromise) return skillsPromise;

  skillsPromise = (async () => {
    const characterId = await getCharacterId();
    if (!characterId) return [];

    const { data, error } = await supabase
      .from("character_skills")
      .select("*")
      .eq("character_id", characterId)
      .order("category")
      .order("sort_order")
      .order("name");

    if (error) throw error;
    return data || [];
  })();

  return skillsPromise;
}

export async function getStyleSkills() {
  return (await getSkills()).filter(skill => skill.category === "style");
}

export async function getOutfits() {
  if (outfitsPromise) return outfitsPromise;

  outfitsPromise = (async () => {
    const characterId = await getCharacterId();
    if (!characterId) return [];

    const { data, error } = await supabase
      .from("character_outfits")
      .select("*")
      .eq("character_id", characterId)
      .order("category")
      .order("sort_order")
      .order("name");

    if (error) throw error;
    return normalizeOutfitListForView(data || []);
  })();

  return outfitsPromise;
}

export async function getCombos() {
  if (combosPromise) return combosPromise;

  combosPromise = (async () => {
    const characterId = await getCharacterId();
    if (!characterId) return [];

    const { data, error } = await supabase
      .from("character_combos")
      .select("*")
      .eq("character_id", characterId)
      .order("sort_order")
      .order("name");

    if (error) throw error;
    return data || [];
  })();

  return combosPromise;
}
