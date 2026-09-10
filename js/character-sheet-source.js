import { extractCharacterSheetKey } from "./character-sheet-url.js?v=2";

async function invokeSource(body) {
  const { supabase } = await import("./supabase-client.js");
  return supabase.functions.invoke("character-sheet-source", { body });
}

// Both import and comparison use data-only responses. Never execute remote scripts.
export async function requestCharacterSheetSource(sourceUrl, { invoke = invokeSource } = {}) {
  const key = extractCharacterSheetKey(sourceUrl);
  if (!key || key.length > 256 || !/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error("キャラクターシート倉庫URLを確認してください。");
  }
  const { data, error } = await invoke({ key });
  if (error) {
    const status = error.context?.status;
    const messages = {
      401: "ログインの有効期限が切れています。再ログインしてください。",
      403: "この環境からの取込みは許可されていません。",
      429: "取込回数が多すぎます。1分ほど待ってから再実行してください。",
      502: "キャラクターシート倉庫からデータを取得できませんでした。時間を置いて再実行してください。",
      504: "キャラクターシート倉庫の応答がタイムアウトしました。時間を置いて再実行してください。"
    };
    const failure = new Error(messages[status] || "データ取得に失敗しました。接続状態を確認して再実行してください。", { cause: error });
    failure.status = status;
    throw failure;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("キャラクターシート倉庫から有効なデータを取得できませんでした。");
  }
  return data;
}
