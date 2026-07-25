const originalFetch = globalThis.fetch.bind(globalThis);
const OPTIONAL_COLUMNS = new Set(["handle_kana", "age", "gender"]);

function rewriteCharactersRequest(input) {
  try {
    const source = input instanceof Request ? input.url : String(input);
    const url = new URL(source, location.href);
    if (!url.hostname.endsWith("supabase.co")) return null;
    if (!url.pathname.includes("/rest/v1/characters")) return null;

    const select = url.searchParams.get("select");
    if (!select) return null;

    const columns = select
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);
    const safeColumns = columns.filter(value => !OPTIONAL_COLUMNS.has(value));
    if (safeColumns.length === columns.length) return null;

    url.searchParams.set("select", safeColumns.join(","));
    return url;
  } catch (error) {
    console.warn("Could not inspect showcase characters request.", error);
    return null;
  }
}

globalThis.fetch = function showcaseSafeFetch(input, init) {
  const rewritten = rewriteCharactersRequest(input);
  if (!rewritten) return originalFetch(input, init);
  if (input instanceof Request) return originalFetch(new Request(rewritten.href, input), init);
  return originalFetch(rewritten.href, init);
};

function reportRuntimeError(message) {
  const status = document.querySelector("#library-status");
  if (!status) return;
  status.textContent = `公開キャスト選択エラー：${message}`;
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
  await import("./showcase-generator-v2.js?v=5");
} catch (error) {
  console.error("Showcase generator could not be initialized.", error);
  reportRuntimeError(error?.message || "初期化に失敗しました。ページを再読み込みしてください。");
}

setTimeout(() => {
  const status = document.querySelector("#library-status");
  if (status?.textContent?.includes("読み込み中")) {
    reportRuntimeError("公開キャストの読込みが完了しませんでした。通信状態またはログイン状態を確認してください。");
  }
}, 12000);
