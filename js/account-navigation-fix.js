(() => {
  const root = document.querySelector('#owned-casts');
  if (!root) return;

  root.addEventListener('click', event => {
    const link = event.target.closest('.owned-cast__links a');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const match = href.match(/(?:^|\/)(cast|sheet|acts)\.html([?#].*)?$/);
    if (!match) return;

    event.preventDefault();
    event.stopPropagation();
    const target = new URL(`./${match[1]}.html${match[2] || ''}`, window.location.href);
    window.location.assign(target.href);
  });
})();
