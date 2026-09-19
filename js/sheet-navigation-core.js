export const RETURN_DESTINATIONS = {
  "index.html": { label: "キャスト一覧へ", enLabel: "RETURN TO ARCHIVE", ariaLabel: "キャスト一覧へ戻る" },
  "account.html": { label: "アカウントへ", enLabel: "RETURN TO ACCOUNT", ariaLabel: "アカウントへ戻る" },
  "acts.html": { label: "参加アクト一覧へ", enLabel: "RETURN TO ACT HISTORY", ariaLabel: "参加アクト一覧へ戻る" },
  "showcase-generator.html": { label: "アクト紹介生成へ", enLabel: "RETURN TO SHOWCASE EDITOR", ariaLabel: "アクト紹介生成へ戻る" },
  "troops.html": { label: "トループ一覧へ", enLabel: "RETURN TO TROOPS", ariaLabel: "トループ一覧へ戻る" },
  "troop.html": { label: "トループへ", enLabel: "RETURN TO TROOP", ariaLabel: "トループへ戻る" }
};

export const PARENT_RETURN_PAGES = new Set(Object.keys(RETURN_DESTINATIONS));

export const DEFAULT_RETURN_HREF = "./account.html";

export function readTrimmedSearchParam(search, key) {
  return new URLSearchParams(search).get(key)?.trim() || "";
}

export function toLocalHref(url) {
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseReturnDestination(value, { origin, baseHref }) {
  if (!value) return null;
  try {
    const url = new URL(value, baseHref);
    if (url.origin !== origin) return null;
    const page = url.pathname.split("/").pop() || "";
    const labels = RETURN_DESTINATIONS[page];
    if (!labels) return null;
    return { url, page, labels };
  } catch {
    return null;
  }
}

export function resolveParentReturnHref(destination, { fallback = DEFAULT_RETURN_HREF } = {}) {
  return destination ? toLocalHref(destination.url) : fallback;
}
