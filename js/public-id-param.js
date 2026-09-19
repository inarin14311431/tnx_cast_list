export function getPublicIdParam(search = location.search) {
  return new URLSearchParams(search).get("id")?.trim() || "";
}
