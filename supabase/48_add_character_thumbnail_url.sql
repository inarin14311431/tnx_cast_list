-- Self-hosted card thumbnails.
--
-- Card lists (archive, showcase generator, act showcase) used Supabase Storage's
-- render/image transform API (js/image-focus.js's toThumbnailUrl()) to shrink the full-size
-- character photo for list display. That endpoint is a paid-plan feature and this project runs
-- on the Free plan - the Supabase dashboard already flags it as unsupported there, so relying on
-- it working is not safe long-term even though it currently still responds.
--
-- image_thumbnail_url stores the URL of a small WebP thumbnail generated and uploaded by the
-- client itself (js/sheet-image.js's createThumbnail()) alongside the full-size image, so card
-- lists no longer depend on any Supabase paid feature. It is nullable/empty by default: existing
-- characters have no thumbnail until their image is next re-uploaded, and callers fall back to
-- image_url when it is empty.
alter table public.characters
  add column if not exists image_thumbnail_url text;
