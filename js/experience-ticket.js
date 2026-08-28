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
          <button type="button" data-save-ticket-png>PNG保存 <small>SAVE PNG</small></button>
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
    if (event.target.closest("[data-save-ticket-png]")) saveTicketPng(data);
  });
  document.body.append(overlay);
  document.body.classList.add("has-experience-ticket");
  fitTicketValues(overlay);
  document.fonts?.ready?.then(() => fitTicketValues(overlay));
  overlay.querySelector("[data-save-ticket-png]")?.focus();
}

function fitTicketValues(root) {
  root.querySelectorAll(".experience-ticket__field > strong").forEach(element => {
    element.style.fontSize = "";
    let size = parseFloat(getComputedStyle(element).fontSize) || 16;
    const minimum = element.closest(".experience-ticket__field--signature") ? 17 : 12;
    while (element.scrollWidth > element.clientWidth && size > minimum) {
      size -= 0.5;
      element.style.fontSize = `${size}px`;
    }
  });
}

function saveTicketPng(data) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawTicketCanvas(ctx, data, canvas.width, canvas.height);
  const filename = `experience-ticket-${safeFilename(data.title)}-${data.serial}.png`;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

function drawTicketCanvas(ctx, data, width, height) {
  const paper = "#efe7d8";
  const ink = "#18130f";
  const dark = "#241a16";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#35271f";
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, width, 178);
  ctx.fillStyle = "#fff";
  drawFitText(ctx, "経験点チケット", 58, 88, 900, 76, 42, "serif", "900");
  ctx.font = "700 30px Georgia, serif";
  ctx.fillText("EXPERIENCE TICKET", 60, 138);
  ctx.textAlign = "right";
  ctx.font = "900 58px Georgia, serif";
  ctx.fillText("N◎VA", width - 58, 82);
  ctx.font = "700 24px Georgia, serif";
  ctx.fillText("CAST ARCHIVE", width - 58, 126);
  ctx.textAlign = "left";

  ctx.fillStyle = ink;
  ctx.font = "900 48px serif";
  ctx.fillText("経験点", 58, 260);
  ctx.font = "700 24px Georgia, serif";
  ctx.fillText("E X P", 86, 300);
  ctx.textAlign = "right";
  drawFitText(ctx, data.experience, width - 120, 305, 620, 170, 94, "serif", "900", "right");
  ctx.font = "900 52px serif";
  ctx.fillText("点", width - 55, 304);
  ctx.textAlign = "left";
  line(ctx, 48, 330, width - 48, 330, 4);

  label(ctx, "アクトタイトル", "ACT TITLE", 58, 385);
  drawFitText(ctx, data.title, 58, 455, width - 116, 58, 28, "serif", "900");
  line(ctx, 0, 500, width, 500, 2, "#6f6259");

  const split = 500;
  label(ctx, "日付", "DATE", 58, 555);
  drawFitText(ctx, data.date, 58, 625, split - 92, 52, 26, "serif", "900");
  line(ctx, split, 500, split, 700, 2, "#6f6259");
  label(ctx, "参加キャスト", "CAST", split + 38, 555);
  drawFitText(ctx, data.character, split + 38, 625, width - split - 86, 48, 24, "serif", "900");
  line(ctx, 0, 700, width, 700, 2, "#6f6259");

  label(ctx, "ルーラーの署名", "RULER SIGNATURE", 58, 760);
  ctx.textAlign = "right";
  drawFitText(ctx, data.ruler, width - 60, 855, width - 120, 72, 34, "serif", "900", "right", "italic");
  ctx.textAlign = "left";
  line(ctx, 40, 912, width - 40, 912, 2, "#8e8075", true);

  ctx.fillStyle = "#51443b";
  ctx.font = "700 25px Georgia, serif";
  ctx.fillText(data.slot || "ACT PARTICIPATION", 58, 956);
  ctx.textAlign = "right";
  ctx.fillText(data.serial, width - 58, 956);
  ctx.textAlign = "left";
}

function label(ctx, ja, en, x, y) {
  ctx.fillStyle = "#18130f";
  ctx.font = "900 33px serif";
  ctx.fillText(ja, x, y);
  const offset = ctx.measureText(ja).width + 22;
  ctx.font = "700 20px Georgia, serif";
  ctx.fillText(en, x + offset, y);
}

function drawFitText(ctx, text, x, y, maxWidth, startSize, minSize, family, weight = "900", align = "left", style = "normal") {
  let size = startSize;
  ctx.textAlign = align;
  do {
    ctx.font = `${style} ${weight} ${size}px ${family}`;
    if (ctx.measureText(String(text)).width <= maxWidth || size <= minSize) break;
    size -= 2;
  } while (size > minSize);
  ctx.fillText(String(text), x, y);
}

function line(ctx, x1, y1, x2, y2, width = 2, color = "#2a211c", dashed = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [10, 10] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function safeFilename(value) {
  return clean(value).replace(/[\\/:*?"<>|]/g, "_").slice(0, 48) || "act";
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
