const selectedCasts = document.querySelector("#selected-casts");

function updateRemoveLabels() {
  selectedCasts?.querySelectorAll('button[data-action="remove"]').forEach(button => {
    button.textContent = "×";
    button.setAttribute("aria-label", "削除");
    button.setAttribute("title", "削除");
  });
}

if (selectedCasts) {
  new MutationObserver(updateRemoveLabels).observe(selectedCasts, {
    childList: true,
    subtree: true
  });
  updateRemoveLabels();
}
