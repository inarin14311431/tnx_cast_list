(() => {
  const field = document.querySelector("#intro-text");
  if (!(field instanceof HTMLTextAreaElement)) return;

  field.dataset.multilinePaste = "enabled";
  field.setAttribute("aria-description", "改行を含むアクトトレーラーをそのまま貼り付けできます。");

  // Keep the existing compact generator layout. Multiline support is behavioral,
  // so it does not need to make the form permanently taller.
  field.rows = 6;
  const help = field.nextElementSibling;
  if (help?.tagName === "SMALL" && help.textContent.includes("複数行の文章")) help.hidden = true;

  field.addEventListener("paste", event => {
    const pasted = event.clipboardData?.getData("text/plain");
    if (typeof pasted !== "string" || !/[\r\n]/.test(pasted)) return;

    event.preventDefault();
    const normalized = pasted.replace(/\r\n?/g, "\n");
    const start = Number.isFinite(field.selectionStart) ? field.selectionStart : field.value.length;
    const end = Number.isFinite(field.selectionEnd) ? field.selectionEnd : start;
    field.setRangeText(normalized, start, end, "end");
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
})();
