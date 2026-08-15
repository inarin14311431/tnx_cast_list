const SUITS = [
  ["reason", "♠理性"],
  ["passion", "♣感情"],
  ["life", "♥生命"],
  ["mundane", "♦外界"]
];

initialize();

function initialize() {
  if (document.body?.dataset.page !== "sheet.html") return;
  const select = document.querySelector("#sheet-combo-ability");
  if (!select || select.dataset.multiSuitReady === "true") return;

  const label = select.closest("label");
  const heading = label?.querySelector(":scope > span");
  if (heading) heading.innerHTML = "使用スート <small>SUITS</small>";

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.id = select.id;
  hidden.name = select.name || "";
  hidden.value = select.value || "";
  hidden.dataset.multiSuitReady = "true";

  const picker = document.createElement("div");
  picker.className = "sheet-combo-suit-picker";
  picker.setAttribute("role", "group");
  picker.setAttribute("aria-label", "使用スート");
  picker.innerHTML = SUITS.map(([key, labelText]) => `
    <label class="sheet-combo-suit-option">
      <input type="checkbox" value="${key}">
      <span>${labelText}</span>
    </label>`).join("");

  select.replaceWith(hidden, picker);

  const syncHidden = () => {
    hidden.value = [...picker.querySelectorAll('input[type="checkbox"]:checked')]
      .map(input => input.value)
      .join(",");
    hidden.dispatchEvent(new Event("input", { bubbles: true }));
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const syncPicker = () => {
    const selected = new Set(parseSuitKeys(hidden.value));
    picker.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = selected.has(input.value);
    });
  };

  picker.addEventListener("change", syncHidden);

  const editor = document.querySelector("#sheet-combo-editor");
  if (editor) {
    new MutationObserver(() => {
      if (!editor.hidden) queueMicrotask(syncPicker);
    }).observe(editor, { attributes: true, attributeFilter: ["hidden"] });
  }

  document.addEventListener("click", event => {
    if (!event.target.closest("#sheet-combo-add, [data-sheet-combo-id]")) return;
    setTimeout(syncPicker, 0);
  });

  syncPicker();
}

function parseSuitKeys(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return [];
  const known = new Set(SUITS.map(([key]) => key));
  return text.split(/[\s,|/+]+/).filter(key => known.has(key));
}
