import { supabase } from "./supabase-client.js";
import "./sheet-master-search-enhancements.js";
import "./outfit-ofc-save.js";
import "./outfit-ofc-tsv.js";
import "./outfit-ofc-master-apply.js";
import "./outfit-ofc-tsv-category-normalize.js";

const selectors = ["#search-skd-master", "#search-ofc-master"];
const buttons = selectors.map(selector => document.querySelector(selector)).filter(Boolean);
const dialog = document.querySelector("#master-search-dialog");

buttons.forEach(button => {
  button.hidden = true;
  button.disabled = true;
});

initialize();

async function initialize() {
  try {
    const { data, error } = await supabase.rpc("can_use_master_search");
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
