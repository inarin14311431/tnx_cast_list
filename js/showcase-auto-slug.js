import { supabase } from "./supabase-client.js";
import { requireAuth } from "./auth-state.js";

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

  let highest = 0;
  for (const row of data ?? []) {
    const match = /^act-(\d+)$/.exec(String(row.slug ?? ""));
    if (!match) continue;
    highest = Math.max(highest, Number(match[1]) || 0);
  }

  return `act-${String(highest + 1).padStart(4, "0")}`;
}
