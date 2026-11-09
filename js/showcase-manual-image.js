// The picture of a manual cast (docs/SHOWCASE_GENERATOR_REDESIGN.md section 7). Same bucket and rules as the guests' pictures
// (js/showcase-guests.js): the public bucket character-images, JPEG / PNG / WebP up to 1MB (the bucket enforces the same), a file under
// the signed-in user's own folder. Manual casts go under <user id>/act-manual/ so a cleanup can tell them from the guests'
// <user id>/act-guests/. No Storage setting or migration is needed: the insert policy allows any path below the user's own folder.

export const MANUAL_IMAGE_BUCKET = "character-images";
export const MANUAL_IMAGE_FOLDER = "act-manual";
export const MANUAL_IMAGE_MAX_BYTES = 1024 * 1024;
export const MANUAL_IMAGE_TYPES = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" });

// "" when the file can be uploaded, otherwise the sentence to show.
export function validateManualImage(file) {
  if (!file) return "画像を選んでください。";
  if (!Object.prototype.hasOwnProperty.call(MANUAL_IMAGE_TYPES, file.type)) return "画像はJPEG / PNG / WebPを使用してください。";
  if (file.size > MANUAL_IMAGE_MAX_BYTES) return "画像は1MB以下にしてください。";
  return "";
}

export function manualImagePath(userId, file, id) {
  return `${userId}/${MANUAL_IMAGE_FOLDER}/${id}.${MANUAL_IMAGE_TYPES[file.type] || "jpg"}`;
}

// The Storage path behind a public URL of this bucket, or "" when the URL is not a manual-cast picture of this user (an external URL,
// a registered cast's picture, a guest's picture, someone else's file). Only such a path is ever removed from Storage.
export function manualImagePathFromUrl(url, userId) {
  if (!url || !userId) return "";
  let parsed;
  try { parsed = new URL(String(url), "https://invalid.example/"); } catch { return ""; }
  const marker = `/storage/v1/object/public/${MANUAL_IMAGE_BUCKET}/`;
  const at = parsed.pathname.indexOf(marker);
  if (at < 0) return "";
  const path = decodeURIComponent(parsed.pathname.slice(at + marker.length));
  const prefix = `${userId}/${MANUAL_IMAGE_FOLDER}/`;
  return path.startsWith(prefix) && !path.slice(prefix.length).includes("/") && path.length > prefix.length ? path : "";
}

// Uploads the file and returns { path, url }. Throws an Error with a sentence for the writer.
export async function uploadManualImage(supabase, userId, file, { id = crypto.randomUUID() } = {}) {
  const problem = validateManualImage(file);
  if (problem) throw new Error(problem);
  if (!userId) throw new Error("ログイン情報を確認できません。");
  const path = manualImagePath(userId, file, id);
  const { error } = await supabase.storage.from(MANUAL_IMAGE_BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw new Error(`画像を登録できませんでした。${error.message ? ` ${error.message}` : ""}`);
  const { data } = supabase.storage.from(MANUAL_IMAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("画像のURLを取得できませんでした。");
  return { path, url: data.publicUrl };
}

// Best effort, like the guests' pictures: a failure leaves a file behind and nothing else.
export async function removeManualImages(supabase, paths) {
  const list = [...new Set((paths || []).filter(Boolean))];
  if (!list.length) return { removed: 0 };
  try {
    const { error } = await supabase.storage.from(MANUAL_IMAGE_BUCKET).remove(list);
    if (error) throw error;
    return { removed: list.length };
  } catch (error) {
    console.warn("Manual cast pictures could not be removed from Storage.", error);
    return { removed: 0, error };
  }
}

// Which pictures may go when a picture stops being used. A picture uploaded in this editing session was never part of a published
// showcase, so it goes at once. A picture a published showcase still shows (restored from it, or published from here) must stay
// until the next publication has replaced that showcase, otherwise the published page would show a broken picture in between.
export function createImageLedger() {
  const uploaded = new Set();
  const published = new Set();
  const retired = new Set();
  return {
    uploaded: path => { if (path) uploaded.add(path); },
    // A picture that is already part of a published showcase (restored from one).
    known: path => { if (path) published.add(path); },
    // The picture stops being used: returns the paths to remove from Storage right now.
    release(path) {
      if (!path) return [];
      if (uploaded.delete(path)) return [path];
      if (published.has(path)) retired.add(path);
      return [];
    },
    // A publication succeeded with `inUse` pictures: they are now part of the published showcase, and what was retired may go.
    published(inUse) {
      for (const path of inUse || []) if (path && uploaded.delete(path)) published.add(path);
      const gone = [...retired].filter(path => !(inUse || []).includes(path));
      for (const path of gone) published.delete(path);
      retired.clear();
      return gone;
    },
    snapshot: () => ({ uploaded: [...uploaded], published: [...published], retired: [...retired] })
  };
}
