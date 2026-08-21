export function formatSheetPersistenceError(message = "", { operation = "save" } = {}) {
  const text = String(message || "");
  const isLoad = operation === "load";

  if (!isLoad && /save_character_bundle|PGRST202|Could not find the function/i.test(text)) {
    return "安全保存機能が未設定です。Supabaseで supabase/10_transactional_character_save.sql を実行してください。";
  }
  if (!isLoad && /characters_visibility_check/i.test(text)) {
    return "公開状態を保存できません。Supabaseの公開状態制約を更新してください。";
  }
  if (/row-level security|RLS|42501/i.test(text)) {
    return isLoad ? "読込権限がありません。ログイン状態を確認してください。" : "保存権限がありません。ログイン状態を確認してください。";
  }
  if (/schema cache/i.test(text)) {
    return "データベース項目を確認できません。Supabaseのスキーマを再読み込みしてください。";
  }
  if (/network|fetch/i.test(text)) {
    return isLoad
      ? "通信に失敗しました。ネットワーク接続を確認してください。"
      : "通信に失敗しました。既存データは変更されていません。ネットワーク接続を確認してください。";
  }
  if (isLoad) return text ? `読込に失敗しました：${text}` : "読込に失敗しました。";
  return text ? `保存に失敗しました。既存データは変更されていません：${text}` : "保存に失敗しました。既存データは変更されていません。";
}
