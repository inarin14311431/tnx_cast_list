(() => {
  const panel = document.querySelector("#cast-summary-panel");
  const summary = document.querySelector("#cast-summary");
  const toggle = document.querySelector("#cast-summary-toggle");
  const hero = document.querySelector(".cast-hero");
  if (!panel || !summary || !toggle) return;

  let measureFrame = 0;

  function setExpanded(expanded) {
    panel.classList.toggle("is-expanded", expanded);
    hero?.classList.toggle("is-summary-expanded", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.innerHTML = expanded
      ? "<span>折りたたむ</span><small>COLLAPSE</small>"
      : "<span>全文表示</span><small>EXPAND</small>";
  }

  function measure() {
    measureFrame = 0;
    const hasSummary = Boolean(summary.textContent.trim());
    panel.hidden = !hasSummary;
    if (!hasSummary) {
      setExpanded(false);
      toggle.hidden = true;
      return;
    }

    if (panel.classList.contains("is-expanded")) {
      toggle.hidden = false;
      return;
    }

    toggle.hidden = summary.scrollHeight <= summary.clientHeight + 1;
  }

  function scheduleMeasure() {
    if (measureFrame) cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(measure);
  }

  toggle.addEventListener("click", () => {
    setExpanded(!panel.classList.contains("is-expanded"));
    scheduleMeasure();
  });

  new MutationObserver(() => {
    setExpanded(false);
    scheduleMeasure();
  }).observe(summary, { childList: true, characterData: true, subtree: true });

  window.addEventListener("resize", scheduleMeasure, { passive: true });
  scheduleMeasure();
})();
