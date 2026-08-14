(() => {
  const input = document.getElementById('owned-cast-search');
  if (!input) return;

  const lock = () => {
    input.readOnly = true;
    input.setAttribute('readonly', '');
  };

  const unlock = () => {
    input.readOnly = false;
    input.removeAttribute('readonly');
  };

  // Make the field look explicitly like a site search rather than a login ID.
  input.name = 'q';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('inputmode', 'search');
  input.setAttribute('enterkeyhint', 'search');
  input.setAttribute('aria-autocomplete', 'none');
  input.setAttribute('data-form-type', 'other');
  input.setAttribute('data-lpignore', 'true');
  input.setAttribute('data-1p-ignore', 'true');
  input.setAttribute('data-bwignore', 'true');

  const clear = () => {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // Keep password managers from treating this as a credential field during
  // their initial page scan. Unlock only when the user actually interacts.
  lock();
  input.addEventListener('pointerdown', unlock, { passive: true });
  input.addEventListener('touchstart', unlock, { passive: true });
  input.addEventListener('focus', () => {
    if (input.readOnly) unlock();
  });
  input.addEventListener('blur', lock);

  clear();
  requestAnimationFrame(clear);
  setTimeout(clear, 120);
  setTimeout(clear, 500);
})();
