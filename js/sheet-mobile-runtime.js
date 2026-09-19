import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { getPublicIdParam } from "./public-id-param.js?v=1";

let contextPromise = null;

// Re-exported under its original name so the existing importers of this
// module do not need to change; other call sites here use getPublicIdParam
// directly since "export ... from" does not create a local binding.
export { getPublicIdParam as getMobilePublicId };

export function getMobileEditorContext() {
  if (contextPromise) return contextPromise;
  contextPromise = (async () => {
    const user = await requireAuth();
    if (!user) return { user: null, character: null, publicId: getPublicIdParam() };
    const publicId = getPublicIdParam();
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
