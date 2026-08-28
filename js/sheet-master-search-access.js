import { supabase } from "./supabase-client.js";
import "./sheet-master-search-enhancements.js";
import "./outfit-ofc-save.js?v=20260819-3";
import "./outfit-ofc-master-apply.js?v=20260819-3";

const selectors = ["#search-skd-master", "#search-ofc-master"];
const buttons = selectors.map(selector => document.querySelector(selector)).filter(Boolean);
const dialog = document.querySelector("#master-search-dialog");
let masterSearchAccessInitialized = false;

buttons.forEach(button => {
  button.hidden = true;
  button.disabled = true;
});

void initializeSheetMasterSearchAccess();

async function initializeSheetMasterSearchAccess() {
  if (masterSearchAccessInitialized) return;
  masterSearchAccessInitialized = true;

  try {
    const { data, error } = await supabase.rpc("has_privileged_editor_tools");
    if (error) throw error;

    if (data === true) {
      buttons.forEach(button => {
        button.hidden = false;
        button.disabled = false;
      });
      return;
    }
  } catch (error) {
    console.warn("Master search access check failed.", error);
  }

  buttons.forEach(button => button.remove());
  dialog?.remove();
}
