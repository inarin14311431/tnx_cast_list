const stylesContainer = document.querySelector('#cast-styles');
const divineContainer = document.querySelector('#divine-list');
const divinePanel = document.querySelector('.hero-divine-panel');

let rendered = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function collectStyles() {
  return [...stylesContainer.querySelectorAll('.style-chip')].map(item => ({
    name: item.querySelector('.style-chip__name')?.textContent?.trim() ?? '',
    mark: item.querySelector('.style-chip__mark')?.textContent?.trim() ?? ''
  }));
}

function collectDivines() {
  return [...divineContainer.querySelectorAll('.divine-card')].map(item => ({
    style: item.querySelector('.divine-card__style')?.textContent?.trim() ?? '',
    name: item.querySelector('.divine-card__name')?.textContent?.trim() ?? '',
    yomi: item.querySelector('.divine-card__yomi')?.textContent?.trim() ?? ''
  }));
}

function renderCombined() {
  if (rendered || !stylesContainer || !divineContainer) return;

  const styles = collectStyles();
  const divines = collectDivines();

  if (!styles.length || !divines.length) return;

  stylesContainer.classList.add('style-divine-grid');
  stylesContainer.innerHTML = styles.map((style, index) => {
    const divine = divines[index] ?? {};
    return `
      <article class="style-divine-card">
        <h2 class="style-divine-card__style">
          ${escapeHtml(style.name)}<span>${escapeHtml(style.mark)}</span>
        </h2>
        ${divine.yomi ? `<p class="style-divine-card__yomi">${escapeHtml(divine.yomi)}</p>` : ''}
        <p class="style-divine-card__name">${escapeHtml(divine.name || '未登録')}</p>
      </article>
    `;
  }).join('');

  if (divinePanel) divinePanel.hidden = true;
  rendered = true;
}

const observer = new MutationObserver(() => {
  window.requestAnimationFrame(renderCombined);
});

if (stylesContainer) observer.observe(stylesContainer, { childList: true, subtree: true });
if (divineContainer) observer.observe(divineContainer, { childList: true, subtree: true });

window.addEventListener('DOMContentLoaded', () => {
  window.setTimeout(renderCombined, 150);
  window.setTimeout(renderCombined, 500);
});