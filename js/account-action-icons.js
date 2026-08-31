const root = document.querySelector('#owned-casts');
const RENDER_EVENT = 'tnx:owned-casts-rendered';
const ACTIONS_UPDATED_EVENT = 'tnx:owned-cast-actions-updated';
const ACCOUNT_RETURN = './account.html';

const ICONS = {
  open: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.75"/>',
  edit: '<path d="M6 3.5h8l4 4V20.5H6Z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>',
  mobile: '<rect x="7.25" y="2.75" width="9.5" height="18.5" rx="1.8"/><path d="M10 5.5h4M11.2 18.3h1.6"/>',
  acts: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 19c.5-4 2.7-6 5.5-6s5 2 5.5 6M14 14c2.7-.7 5.6.8 6.5 4"/>',
  troop: '<path d="M12 3.5 19 7v5c0 4.2-2.7 7.1-7 8.5C7.7 19.1 5 16.2 5 12V7Z"/><circle cx="12" cy="10" r="2.2"/><path d="M8.5 16c.6-2 1.8-3 3.5-3s2.9 1 3.5 3"/>',
  duplicate: '<rect x="8" y="7" width="11" height="13" rx="1.5"/><path d="M5 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  delete: '<path d="M4.5 7h15M9 7V4.5h6V7M7 7l.8 13h8.4L17 7M10 10.5v6M14 10.5v6"/>'
};

function iconSvg(name) {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function iconNameFor(element) {
  if (element.matches('[data-delete]')) return 'delete';
  if (element.matches('[data-duplicate]')) return 'duplicate';
  if (element.matches('[data-cast-troops-link]')) return 'troop';
  const href = element.getAttribute('href') || '';
  if (href.includes('sheet-mobile.html')) return 'mobile';
  if (href.includes('sheet.html')) return 'edit';
  if (href.includes('acts.html')) return 'acts';
  if (href.includes('cast.html')) return 'open';
  return '';
}

function contextualizeOwnedCastLinks() {
  root?.querySelectorAll('a[href*="cast.html?id="], a[href*="sheet.html?id="], a[href*="sheet-mobile.html?id="]').forEach(link => {
    try {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      url.searchParams.set('return', ACCOUNT_RETURN);
      link.href = `${url.pathname}${url.search}${url.hash}`;
    } catch {}
  });
}

function enhance() {
  contextualizeOwnedCastLinks();
  root?.querySelectorAll('.owned-cast__links a, .owned-cast__management a, .owned-cast__management button').forEach(element => {
    if (element.querySelector('.action-icon')) return;
    const name = iconNameFor(element);
    if (!name) return;
    element.insertAdjacentHTML('afterbegin', iconSvg(name));
    element.classList.add('has-action-icon');
  });
}

function refresh() {
  enhance();
  root?.dispatchEvent(new CustomEvent(RENDER_EVENT));
}

refresh();
root?.addEventListener(ACTIONS_UPDATED_EVENT, enhance);
if (root) new MutationObserver(refresh).observe(root, { childList: true, subtree: true });
