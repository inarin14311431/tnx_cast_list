const PAGE_SIZE = 15;

setupPager({
  grid: document.querySelector("#public-cast-grid"),
  button: document.querySelector("#public-cast-load-more"),
  resetControls: [
    document.querySelector("#cast-search"),
    document.querySelector("#player-filter"),
    document.querySelector("#style-filter")
  ].filter(Boolean)
});

setupPager({
  grid: document.querySelector("#owned-private-cast-grid"),
  button: document.querySelector("#private-cast-load-more")
});

function setupPager({ grid, button, resetControls = [] }) {
  if (!grid || !button) return;

  let visibleCount = PAGE_SIZE;
  let frame = 0;

  const scheduleApply = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(apply);
  };

  const apply = () => {
    const cards = [...grid.children].filter(node => node.matches?.(".cast-pick-card"));
    cards.forEach((card, index) => {
      card.hidden = index >= visibleCount;
    });

    const remaining = Math.max(0, cards.length - visibleCount);
    button.hidden = !remaining;
    button.disabled = !remaining;
    button.querySelector("strong").textContent = remaining
      ? `さらに15件表示`
      : "すべて表示済み";
    button.querySelector("small").textContent = remaining
      ? `LOAD ${Math.min(PAGE_SIZE, remaining)} MORE // ${remaining} REMAINING`
      : `ALL ${cards.length} CASTS VISIBLE`;
  };

  const observer = new MutationObserver(scheduleApply);
  observer.observe(grid, { childList: true });

  button.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    apply();
  });

  for (const control of resetControls) {
    const eventName = control.matches("input") ? "input" : "change";
    control.addEventListener(eventName, () => {
      visibleCount = PAGE_SIZE;
      scheduleApply();
    });
  }

  scheduleApply();
}
