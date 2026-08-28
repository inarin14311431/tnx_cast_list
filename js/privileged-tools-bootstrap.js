import { supabase } from "./supabase-client.js";

void initializePrivilegedTools();

async function initializePrivilegedTools() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) return;

    const { data, error } = await supabase.rpc("has_privileged_editor_tools");
    if (error || data !== true) return;

    const page = document.body?.dataset?.page || "";
    if (page === "sheet.html") {
      await import("./sheet-privileged-tools.js?v=1");
      return;
    }
    if (page === "account.html") {
      await import("./master-data-admin.js?v=3");
      await import("./master-user-delete.js?v=3");
    }
  } catch (error) {
    console.warn("Privileged tools are unavailable.", error);
  }
}
