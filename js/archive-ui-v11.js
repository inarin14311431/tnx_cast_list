let attempts = 0;
const maxAttempts = 20;

refreshArchiveUi();
const refreshTimer = window.setInterval(() => {
  refreshArchiveUi();
  attempts += 1;
  const statusText = document.querySelector("#status-text")?.textContent || "";
  const loadingFinished = !/読み込み中|接続中|SCANNING|CONNECTING/i.test(statusText);
  if (attempts >= maxAttempts || loadingFinished) window.clearInterval(refreshTimer);
}, 250);

function setTextIfChanged(element, nextText) {
  if (element && element.textContent !== nextText) element.textContent = nextText;
}

function refreshArchiveUi() {
  document.querySelectorAll(".cast-card__styles").forEach(element => {
    const next = element.textContent.replace(/\s*\/\s*/g, "、");
    setTextIfChanged(element, next);
  });

  document.querySelectorAll(".cast-card__player").forEach(element => {
    const next = element.textContent.replace(/^PLAYER\s*\/\/\s*/i, "プレイヤー：");
    setTextIfChanged(element, next);
  });

  document.querySelectorAll(".cast-card__handle").forEach(element => {
    if (element.textContent.trim() === "NO HANDLE") setTextIfChanged(element, "ハンドル未登録");
  });

  document.querySelectorAll(".empty-message").forEach(element => {
    setTextIfChanged(element, "条件に一致するキャストはいません。");
  });

  const status = document.querySelector("#status-text");
  if (status) {
    const text = status.textContent;
    const detected = text.match(/^(\d+) CASTS? DETECTED$/);
    if (detected) setTextIfChanged(status, `${detected[1]}件の公開キャストを読み込みました。`);
    else if (/SCANNING CAST DATABASE/i.test(text)) setTextIfChanged(status, "公開キャストを読み込み中…");
    else if (/DATABASE CONNECTION FAILED/i.test(text)) setTextIfChanged(status, "データベースへの接続に失敗しました。");
  }

  const count = document.querySelector("#archive-result-count");
  if (count) {
    const match = count.textContent.match(/^(\d+)\s*\/\s*(\d+) CASTS SHOWN$/);
    if (match) setTextIfChanged(count, `${match[2]}件中 ${match[1]}件を表示`);
    else if (/^0 CASTS SHOWN$/i.test(count.textContent)) setTextIfChanged(count, "0件表示");
  }
}