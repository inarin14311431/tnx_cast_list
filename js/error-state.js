const FALLBACK_MESSAGE = "データベースへの接続に失敗しました。しばらくしてからもう一度お試しください。";

/**
 * Thrown for messages already written for end users (validation failures,
 * "not found" states). toUserFacingErrorMessage() returns these verbatim
 * instead of running them through the DB/network pattern matcher below.
 */
export class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = "AppError";
  }
}

const KNOWN_ERROR_PATTERNS = [
  {
    test: error => /JWT expired|invalid claim|PGRST301/i.test(`${error?.message ?? ""} ${error?.code ?? ""}`),
    message: "認証セッションの有効期限が切れました。再度ログインしてからもう一度お試しください。"
  },
  {
    test: error => error?.code === "42501" || /permission denied/i.test(error?.message ?? ""),
    message: "この情報へアクセスする権限がありません。"
  },
  {
    test: error => error?.code === "57014" || /timeout|timed out/i.test(error?.message ?? "") || error?.name === "AbortError",
    message: "データベースへの応答がタイムアウトしました。通信状況を確認し、もう一度お試しください。"
  },
  {
    test: error => (error?.name === "TypeError" && /fetch/i.test(error?.message ?? "")) || /NetworkError|Failed to fetch/i.test(error?.message ?? ""),
    message: "ネットワークへの接続に失敗しました。通信状況を確認し、もう一度お試しください。"
  }
];

export function toUserFacingErrorMessage(error, fallbackMessage = FALLBACK_MESSAGE) {
  if (error instanceof AppError) return error.message;
  return KNOWN_ERROR_PATTERNS.find(pattern => pattern.test(error))?.message ?? fallbackMessage;
}

export function renderErrorState(container, { message, onRetry } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div class="error-state">
      <p class="error-state__message">${escapeHtml(message || FALLBACK_MESSAGE)}</p>
      <button type="button" class="error-state__retry" data-error-state-retry><span>もう一度読み込む</span><small>RETRY</small></button>
    </div>
  `;
  container.querySelector("[data-error-state-retry]")?.addEventListener("click", () => { onRetry?.(); });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
