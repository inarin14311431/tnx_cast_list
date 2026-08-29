export function validateAccountDeletionInput({ phrase, password } = {}) {
  if (String(phrase ?? "").trim() !== "DELETE") {
    return "確認欄に DELETE と入力してください。";
  }
  if (!password) {
    return "現在のパスワードを入力してください。";
  }
  return "";
}

export async function getAccountDeletionFunctionError(error) {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {}
  return error?.message || "アカウント削除に失敗しました。";
}
