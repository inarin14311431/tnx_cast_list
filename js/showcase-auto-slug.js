import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js?v=4";
import { nextActSlugFromRows } from "./showcase-slug.js";

const slugInput = document.querySelector("#publish-slug");

initialize();

async function initialize() {
  if (!slugInput) return;
  const user = await requireAuth();
  if (!user) return;

  const nextSlug = await getNextActSlug();
  if (slugInput.dataset.edited === "true") return;

  slugInput.value = nextSlug;
  slugInput.dataset.edited = "true";
  slugInput.dataset.autoNumbered = "true";
  slugInput.dispatchEvent(new Event("change", { bubbles: true }));
}

async function getNextActSlug() {
  const { data, error } = await supabase
    .from("acts")
    .select("slug")
    .like("slug", "act-%");

  if (error) {
    console.warn("Could not calculate the next act file number.", error);
    return "act-0001";
  }

  return nextActSlugFromRows(data);
}
