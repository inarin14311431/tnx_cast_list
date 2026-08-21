function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export function renderStyleCards({
  styleData = [],
  utsuwaAttributes = [],
  count = 3
} = {}) {
  const options = '<option value="">選択</option>' + styleData
    .map(item => `<option>${esc(item?.name)}</option>`)
    .join("");
  const attributes = '<option value="">属性を選択</option>' + utsuwaAttributes
    .map(item => `<option>${esc(item?.name)}</option>`)
    .join("");

  return Array.from({ length: count }, (_, index) => index + 1).map(i => `
    <article class="style-card"><div class="style-fields">
      <label>スタイル<select id="style-${i}">${options}</select></label>
      <label>指定<select id="style-${i}-mark"><option value="">無印</option><option>◎</option><option>●</option><option>◎●</option></select></label>
      <label id="style-${i}-attribute-wrap" hidden>ウツワ属性<select id="style-${i}-attribute">${attributes}</select></label>
    </div><section class="divine-field"><ruby><strong id="divine-${i}">未選択</strong><rt id="divine-${i}-yomi"></rt></ruby><span>神業</span></section></article>`).join("");
}

export function renderAbilityCards(abilities = []) {
  return abilities.map(([key, jp, en]) => `
    <article class="ability-card ability-matrix"><h3>${esc(jp)} <small>${esc(en)}</small></h3>
      <div class="ability-matrix__header"><span></span><strong>能力値</strong><strong>制御値</strong></div>
      <div class="ability-matrix__row"><span>現在値</span><input id="${esc(key)}-base" type="number" min="0" value="0"><input id="${esc(key)}-control-base" type="number" min="0" value="0"></div>
      <div class="ability-matrix__row"><span>補正値</span><input id="${esc(key)}-mod" type="number" value="0"><input id="${esc(key)}-control-mod" type="number" value="0"></div>
      <div class="ability-matrix__row ability-matrix__result"><span>最終値</span><strong id="${esc(key)}-final">0</strong><strong id="${esc(key)}-control-final">0</strong></div>
    </article>`).join("") + `
    <article class="ability-card ability-card--cs"><h3>CS</h3><div class="cs-row"><label>現在値<input id="cs-base" type="number" value="0"></label><label>補正値<input id="cs-mod" type="number" value="0"></label><strong id="cs-final">0</strong></div></article>`;
}
