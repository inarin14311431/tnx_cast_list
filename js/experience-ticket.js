const historyList = document.querySelector("#act-history-list");

if (historyList) {
  const observer = new MutationObserver(ensureTicketButtons);
  observer.observe(historyList, { childList: true, subtree: true });
  ensureTicketButtons();
  historyList.addEventListener("click", handleTicketClick);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeTicket();
  });
}

function ensureTicketButtons() {
  historyList.querySelectorAll(".act-record").forEach(record => {
    const actions = record.querySelector(".act-record__exp-actions");
    if (!actions || actions.querySelector("[data-issue-ticket]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "act-record__ticket";
    button.dataset.issueTicket = "";
    button.innerHTML = '<span>経験点チケット</span><small>ISSUE TICKET</small>';
    actions.prepend(button);
  });
}

function handleTicketClick(event) {
  const button = event.target.closest("[data-issue-ticket]");
  if (!button) return;
  const record = button.closest(".act-record");
  if (!record) return;
  openTicket(readTicketData(record));
}

function readTicketData(record) {
  const title = clean(record.querySelector(".act-record__title")?.textContent) || "名称未登録アクト";
  const meta = clean(record.querySelector(".act-record__meta")?.textContent);
  const rawDate = meta.match(/\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}/)?.[0] || "—";
  const slot = meta.match(/\bCAST\s+\d+\b/i)?.[0] || "";
  const rulerText = clean(record.querySelector(".act-record__ruler")?.textContent);
  const ruler = rulerText.replace(/^RULER[：:]\s*/i, "") || "—";
  const experience = String(Math.max(0, Number(record.querySelector("[data-experience-input]")?.value || 0)));
  const character = clean(record.closest(".act-character-group")?.querySelector(".act-character-toggle__name")?.textContent) || "—";
  const id = String(record.dataset.participationId || "0").replace(/[^0-9A-Za-z_-]/g, "");
  return {
    title,
    date: formatTicketDate(rawDate),
    slot,
    ruler,
    experience,
    character,
    serial: `EXP-${id.padStart(6, "0")}`
  };
}

function formatTicketDate(value) {
  const text = clean(value);
  if (!text || text === "—") return "—";
  const match = text.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (!match) return text;
  return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`;
}

function openTicket(data) {
  closeTicket();
  const overlay = document.createElement("div");
  overlay.className = "experience-ticket-overlay";
  overlay.dataset.experienceTicketOverlay = "";
  overlay.innerHTML = `
    <div class="experience-ticket-dialog" role="dialog" aria-modal="true" aria-labelledby="experience-ticket-title">
      <div class="experience-ticket-toolbar">
        <p><span>EXPERIENCE RECORD</span><small>参加履歴から自動生成</small></p>
        <div>
          <button type="button" data-print-ticket>印刷 / PDF <small>PRINT</small></button>
          <button type="button" data-close-ticket>閉じる <small>CLOSE</small></button>
        </div>
      </div>
      <article class="experience-ticket" aria-label="経験点チケット">
        <header class="experience-ticket__brand">
          <div>
            <span>経験点チケット</span>
            <small>EXPERIENCE TICKET</small>
          </div>
          <strong>N◎VA<br><small>CAST ARCHIVE</small></strong>
        </header>
        <div class="experience-ticket__value-row">
          <div class="experience-ticket__exp-label"><span>経験点</span><small>EXP</small></div>
          <strong>${escapeHtml(data.experience)}</strong>
          <span class="experience-ticket__unit">点</span>
        </div>
        <div class="experience-ticket__rule"></div>
        <section class="experience-ticket__fields">
          <div class="experience-ticket__field experience-ticket__field--wide">
            <span>アクトタイトル <small>ACT TITLE</small></span>
            <strong id="experience-ticket-title">${escapeHtml(data.title)}</strong>
          </div>
          <div class="experience-ticket__field experience-ticket__field--date">
            <span>日付 <small>DATE</small></span>
            <strong>${escapeHtml(data.date)}</strong>
          </div>
          <div class="experience-ticket__field experience-ticket__field--cast">
            <span>参加キャスト <small>CAST</small></span>
            <strong>${escapeHtml(data.character)}</strong>
          </div>
          <div class="experience-ticket__field experience-ticket__field--signature">
            <span>ルーラーの署名 <small>RULER SIGNATURE</small></span>
            <strong>${escapeHtml(data.ruler)}</strong>
          </div>
        </section>
        <footer class="experience-ticket__footer">
          <span>${escapeHtml(data.slot || "ACT PARTICIPATION")}</span>
          <strong>${escapeHtml(data.serial)}</strong>
        </footer>
      </article>
      <p class="experience-ticket-note">このチケットはあなたの参加履歴から表示用に生成されたものです。RULERによる電子承認や再発行操作は不要です。</p>
    </div>`;

  overlay.addEventListener("click", event => {
    if (event.target === overlay || event.target.closest("[data-close-ticket]")) closeTicket();
    if (event.target.closest("[data-print-ticket]")) window.print();
  });
  document.body.append(overlay);
  document.body.classList.add("has-experience-ticket");
  overlay.querySelector("[data-print-ticket]")?.focus();
}

function closeTicket() {
  document.querySelector("[data-experience-ticket-overlay]")?.remove();
  document.body.classList.remove("has-experience-ticket");
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '\"': "&quot;"
  })[char]);
}
