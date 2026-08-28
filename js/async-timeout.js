export const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

export function withRequestTimeout(operation, message, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  let timer;
  return Promise.race([
    Promise.resolve(operation),
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]).finally(() => globalThis.clearTimeout(timer));
}
