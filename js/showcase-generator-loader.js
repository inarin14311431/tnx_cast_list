function reportRuntimeError(message) {
  const status = document.querySelector("#library-status");
  if (!status) return;
  status.textContent = `キャスト選択エラー：${message}`;
  status.className = "generator-status is-error";
}

window.addEventListener("error", event => {
  if (event?.message) reportRuntimeError(event.message);
});

window.addEventListener("unhandledrejection", event => {
  const reason = event?.reason;
  reportRuntimeError(reason?.message || String(reason || "初期化に失敗しました。"));
});

try {
  await import("./showcase-generator-v3.js?v=2");
  await import("./showcase-tagline.js?v=2");
  await import("./showcase-tagline-auto.js?v=1");
  await import("./showcase-style-alignment.js?v=2");
  await import("./showcase-history-role.js?v=1");
} catch (error) {
  console.error("Showcase generator could not be initialized.", error);
  reportRuntimeError(error?.message || "初期化に失敗しました。ページを再読み込みしてください。");
}

setTimeout(() => {
  const publicStatus = document.querySelector("#library-status");
  const privateStatus = document.querySelector("#private-library-status");
  if (publicStatus?.textContent?.includes("読み込み中") || privateStatus?.textContent?.includes("読み込み中")) {
    reportRuntimeError("キャストの読込みが完了しませんでした。通信状態、ログイン状態、またはSupabaseのcharacters列を確認してください。");
  }
}, 12000);