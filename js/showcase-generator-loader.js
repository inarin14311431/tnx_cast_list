// The band toggle must work as soon as the page is interactive (a static import runs before DOMContentLoaded).
import "./showcase-owned-band.js?v=e74013f6";

function reportRuntimeError(message) {
  const status = document.querySelector("#library-status");
  document.documentElement.dataset.showcaseGeneratorState = "error";
  if (!status) return;
  status.textContent = `キャスト選択エラー：${message}`;
  status.className = "generator-status is-error";
}

function reportOptionalModuleError(name, error) {
  console.warn(`Optional showcase module could not be initialized: ${name}`, error);
}

window.addEventListener("error", event => {
  if (event?.message) reportRuntimeError(event.message);
});

window.addEventListener("unhandledrejection", event => {
  const reason = event?.reason;
  reportRuntimeError(reason?.message || String(reason || "初期化に失敗しました。"));
});

document.documentElement.dataset.showcaseGeneratorState = "loading";

// The frame around the form (step navigation, checklist, export dialog) starts loading at once, beside the core modules, so its
// controls answer early. It only reads and shows what the core modules write; a failure here leaves the form usable.
void import("./showcase-generator-shell.js?v=65df8392").catch(error => reportOptionalModuleError("generator-shell", error));

async function initializeShowcaseGenerator() {
  try {
    // Guest persistence must be registered before mode-specific publishing so
    // both standard and cinematic buttons save the same supporting-cast data.
    await import("./showcase-generator-v3.js?v=13f2c42f");
    await import("./showcase-act-subtitle.js?v=501b7a5b");
    await import("./showcase-scenario-writer.js?v=e4750a02");
    await import("./showcase-dedicated-output.js?v=cdd8099e");
    await import("./showcase-guests.js?v=719d3234");
    // Before the guest bridge and the publisher: a publish click generates the HTML first, then reaches them.
    await import("./showcase-publish-flow.js?v=f06815e0");
    await import("./showcase-guest-publish-bridge.js?v=809b92f6");
    await import("./showcase-dynamic-publish-v3.js?v=76391849");
    await import("./showcase-publish-result.js?v=148321f4");
    await import("./showcase-publish-url-canonicalizer.js?v=d365d9fd");
    document.documentElement.dataset.showcaseGeneratorState = "ready";
  } catch (error) {
    console.error("Showcase generator core could not be initialized.", error);
    reportRuntimeError(error?.message || "初期化に失敗しました。ページを再読み込みしてください。");
    return;
  }

  const optionalModules = [
    ["tagline", "./showcase-tagline.js?v=2"],
    ["tagline-auto", "./showcase-tagline-auto.js?v=1"],
    ["history-role", "./showcase-history-role.js?v=1"]
  ];

  await Promise.all(optionalModules.map(async ([name, source]) => {
    try {
      await import(source);
    } catch (error) {
      reportOptionalModuleError(name, error);
    }
  }));

  try {
    await import("./showcase-output-normalizer.js?v=cea76d1b");
    await import("./showcase-scene-selector.js?v=c50b5ce7");
    await import("./showcase-edit-restore.js?v=19bf260c");
    await import("./showcase-delete.js?v=3f62ca3a");
    await import("./showcase-owned-list.js?v=71944577");
  } catch (error) {
    reportOptionalModuleError("edit-management", error);
  }
}

void initializeShowcaseGenerator();

setTimeout(() => {
  const publicStatus = document.querySelector("#library-status");
  const privateStatus = document.querySelector("#private-library-status");
  if (publicStatus?.textContent?.includes("読み込み中") || privateStatus?.textContent?.includes("読み込み中")) {
    reportRuntimeError("キャストの読込みが完了しませんでした。通信状態、ログイン状態、またはSupabaseのcharacters列を確認してください。");
  }
}, 12000);
