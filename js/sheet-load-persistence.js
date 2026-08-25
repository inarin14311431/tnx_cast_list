import { supabase } from "./supabase-client.js";

const SHEET_CHARACTER_LOADED_EVENT = "tnx:sheet-character-loaded";

export async function loadSheetBundle({ publicId, ownerId } = {}) {
  const normalizedPublicId = String(publicId || "").trim();
  const normalizedOwnerId = String(ownerId || "").trim();
  if (!normalizedPublicId || !normalizedOwnerId) throw new Error("キャストを読み込めませんでした。");

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("*")
    .eq("public_id", normalizedPublicId)
    .eq("owner_id", normalizedOwnerId)
    .maybeSingle();

  if (characterError) throw characterError;
  if (!character) throw new Error("キャストを読み込めませんでした。");

  const [skillResult, outfitResult] = await Promise.all([
    supabase.from("character_skills").select("*").eq("character_id", character.id).order("sort_order"),
    supabase.from("character_outfits").select("*").eq("character_id", character.id).order("sort_order")
  ]);

  const relatedError = skillResult.error || outfitResult.error;
  if (relatedError) throw relatedError;

  globalThis.window?.dispatchEvent?.(new CustomEvent(SHEET_CHARACTER_LOADED_EVENT, {
    detail: { character }
  }));

  return Object.freeze({
    character,
    skills: skillResult.data ?? [],
    outfits: outfitResult.data ?? []
  });
}
