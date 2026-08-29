const selectedCasts = document.querySelector("#selected-casts");

function updateRemoveLabels() {
  selectedCasts?.querySelectorAll('button[data-action="remove"]').forEach(button => {
    if (button.textContent !== "×") button.textContent = "×";
    if (button.getAttribute("aria-label") !== "削除") button.setAttribute("aria-label", "削除");
    if (button.getAttribute("title") !== "削除") button.setAttribute("title", "削除");
  });
}

if (selectedCasts) {
  selectedCasts.addEventListener("tnx:showcase-selection-rendered", updateRemoveLabels);
  updateRemoveLabels();
}
