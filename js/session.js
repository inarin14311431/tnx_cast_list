const publicId = new URLSearchParams(location.search).get("id")?.trim();
const panel = document.querySelector('[data-panel="session"] .data-layout');

if (publicId && panel) {
  const storageKey = `tnx_cast_session_state:${publicId}`;
  const defaults = { divineUsed: [false, false, false], checkModifier: 0, csModifier: 0, damageModifier: 0, memo: "" };
  let state;

  try {
    state = { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
  } catch {
    state = defaults;
  }

  const section = document.createElement("section");
  section.className = "data-panel data-panel--wide session-control-panel";
  section.innerHTML = `
    <header class="data-panel__header"><h2>SESSION CONTROL</h2></header>
    <div class="session-control-grid">
      <section class="session-control-block"><h3>DIVINE WORKS STATUS</h3><div id="session-divine-controls"></div></section>
      <section class="session-control-block"><h3>TEMPORARY MODIFIERS</h3>${numberField("checkModifier", "判定修正", state.checkModifier)}${numberField("csModifier", "CS修正", state.csModifier)}${numberField("damageModifier", "ダメージ修正", state.damageModifier)}</section>
      <section class="session-control-block session-control-block--wide"><h3>SESSION MEMO</h3><textarea id="session-memo" rows="7" placeholder="ダメージ、状態、シーン中の効果などを記録">${escapeHtml(state.memo)}</textarea></section>
    </div>
    <footer class="session-control-actions"><p>この情報は現在のブラウザにだけ保存されます。</p><button id="session-reset-button" type="button">RESET SESSION DATA</button></footer>
  `;
  panel.append(section);

  const divineCards = [...document.querySelectorAll(".divine-card")];
  const divineContainer = document.querySelector("#session-divine-controls");
  divineContainer.innerHTML = divineCards.length ? divineCards.map((card, index) => {
    const style = card.querySelector(".divine-card__style")?.textContent?.trim() || `STYLE ${index + 1}`;
    const name = card.querySelector(".divine-card__name")?.textContent?.trim() || "UNREGISTERED";
    return `<label class="session-divine-item ${state.divineUsed[index] ? "is-used" : ""}"><input type="checkbox" data-divine-index="${index}" ${state.divineUsed[index] ? "checked" : ""}><span><small>${escapeHtml(style)}</small><strong>${escapeHtml(name)}</strong></span><b>${state.divineUsed[index] ? "USED" : "READY"}</b></label>`;
  }).join("") : `<p class="empty-data">NO DIVINE WORK DATA</p>`;

  document.querySelectorAll("[data-divine-index]").forEach(input => input.addEventListener("change", () => {
    const index = Number(input.dataset.divineIndex);
    state.divineUsed[index] = input.checked;
    input.closest(".session-divine-item")?.classList.toggle("is-used", input.checked);
    input.closest(".session-divine-item")?.querySelector("b")?.replaceChildren(input.checked ? "USED" : "READY");
    save();
  }));

  document.querySelectorAll("[data-session-state]").forEach(input => input.addEventListener("input", () => {
    state[input.dataset.sessionState] = Number.parseInt(input.value, 10) || 0;
    save();
  }));

  document.querySelector("#session-memo").addEventListener("input", event => {
    state.memo = event.target.value;
    save();
  });

  document.querySelector("#session-reset-button").addEventListener("click", () => {
    if (confirm("このキャストのセッション用一時データを消去します。")) {
      localStorage.removeItem(storageKey);
      location.reload();
    }
  });

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }
}

function numberField(key, label, value) {
  return `<label class="session-number-field"><span>${label}</span><input type="number" step="1" value="${Number(value) || 0}" data-session-state="${key}"></label>`;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
