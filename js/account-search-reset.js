(() => {
  const clear = () => {
    const input = document.getElementById('owned-cast-search');
    if (!input) return;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  clear();
  requestAnimationFrame(clear);
  setTimeout(clear, 120);
  setTimeout(clear, 500);
})();
