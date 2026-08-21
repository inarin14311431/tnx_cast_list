import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";

let contextPromise = null;

export function getMobilePublicId() {
  return new URLSearchParams(location.search).get("id")?.trim() || "";
}

export function getMobileEditorContext() {
  if (contextPromise) return contextPromise;
  contextPromise = (async () => {
    const user = await requireAuth();
    if (!user) return { user: null, character: null, publicId: getMobilePublicId() };
    const publicId = getMobilePublicId();
    if (!publicId) return { user, character: null, publicId };
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("public_id", publicId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return { user, character: data || null, publicId };
  })();
  return contextPromise;
}

export function resetMobileEditorContext() {
  contextPromise = null;
}
