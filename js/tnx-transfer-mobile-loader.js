(async () => {
  const FRAGMENT_PREFIX = "#tnx-transfer=";
  const FALLBACK_URL = new URL(
    "./tnx-transfer-bookmarklet.js?v=2",
    document.currentScript?.src || location.href
  );

  try {
    if (location.hash.startsWith(FRAGMENT_PREFIX)) {
      const payload = location.hash.slice(FRAGMENT_PREFIX.length);
      const transferText = await decompressBase64Url(payload);
      window.__TNX_TRANSFER_TSV__ = transferText;

      try {
        history.replaceState(null, "", `${location.pathname}${location.search}`);
      } catch {}
    }

    const script = document.createElement("script");
    FALLBACK_URL.searchParams.set("t", Date.now());
    script.src = FALLBACK_URL.href;
    script.onload = () => script.remove();
    script.onerror = () => {
      script.remove();
      alert("転記スクリプトを読み込めませんでした。");
    };
    document.documentElement.append(script);
  } catch (error) {
    console.error("TNX mobile transfer loader failed", error);
    alert(
      `転記スクリプトの準備に失敗しました。\n${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  async function decompressBase64Url(value) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("このブラウザは転記データの展開に対応していません。");
    }

    const padded = String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const source = new Blob([bytes]).stream();
    const decompressed = source.pipeThrough(new DecompressionStream("gzip"));
    return await new Response(decompressed).text();
  }
})();
