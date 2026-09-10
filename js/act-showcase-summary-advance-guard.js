(() => {
  const intro = document.querySelector("#cinematic-intro");
  if (!intro) return;

  intro.addEventListener("click", event => {
    const stage = event.target.closest?.(".neotokyo-sequence__stage");
    if (!stage || !stage.querySelector(".neotokyo-sequence__screen--summary")) return;
    event.stopPropagation();
  }, { capture: true });
})();
