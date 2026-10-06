import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const desktopSnapshot = fs.readFileSync(new URL('../js/sheet-character-input-snapshot.js', import.meta.url), 'utf8');
const mobileEditor = fs.readFileSync(new URL('../js/sheet-mobile.js', import.meta.url), 'utf8');
const mobileApp = fs.readFileSync(new URL('../js/sheet-mobile-app.js', import.meta.url), 'utf8');
const shareEditor = fs.readFileSync(new URL('../js/character-share-editor.js', import.meta.url), 'utf8');
const supabaseClient = fs.readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
const accountJs = fs.readFileSync(new URL('../js/account.js', import.meta.url), 'utf8');
const shareMigration = fs.readFileSync(new URL('../supabase/migrations/20260930_character_share_links.sql', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../supabase/migrations-manifest.json', import.meta.url), 'utf8'));

test('desktop and mobile editors preserve all three visibility states', () => {
  assert.match(desktopSnapshot, /new Set\(\["public", "unlisted", "private"\]\)/);
  assert.match(mobileEditor, /new Set\(\["public", "unlisted", "private"\]\)/);
  assert.match(mobileApp, /character-share-editor\.js\?v=[0-9-]+/);
});

test('unlisted editor exposes an owner-only share URL control', () => {
  assert.match(shareEditor, /character_share_links/);
  assert.match(shareEditor, /share_token/);
  assert.match(shareEditor, /URLを知っている人のみ閲覧できます。一覧・検索には表示されません。/);
  assert.match(shareEditor, /cast\.html/);
  assert.match(shareEditor, /searchParams\.set\("share", shareToken\)/);
});

test('share panel stays visible for the full lifetime of unlisted visibility', () => {
  assert.match(
    shareEditor,
    /return currentVisibility\(\) === "unlisted" \|\| savedVisibility\(\) === "unlisted";/
  );
  assert.match(shareEditor, /panel\.hidden = !shouldShowSharePanel\(\);/);
  assert.match(shareEditor, /const shouldShow = shouldShowSharePanel\(\);/);
  assert.match(shareEditor, /const hadPanel = Boolean\(document\.querySelector\("#character-share-panel"\)\);/);
  assert.match(shareEditor, /if \(!hadPanel && panel\) queueMicrotask\(renderPanel\);/);
});

test('share URL becomes copyable only after unlisted visibility is saved', () => {
  assert.match(shareEditor, /savedVisibility\(\) !== "unlisted"/);
  assert.match(shareEditor, /const text = activeShareUrl\(\)/);
  assert.match(shareEditor, /限定公開を保存すると共有URLが有効になります。/);
  assert.match(shareEditor, /このURLはログインしていない相手にも共有できます。/);
});

test('share panel does not render a readonly URL input', () => {
  assert.doesNotMatch(shareEditor, /<input id=\\"character-share-url\\"/);
  assert.match(shareEditor, /character-share-url-fallback/);
});

test('cast view resolves a valid capability token through the dedicated RPC', () => {
  assert.match(supabaseClient, /get_unlisted_character_bundle/);
  assert.match(supabaseClient, /p_share_token: sharedViewToken/);
  assert.match(supabaseClient, /\["characters", "character"\]/);
  assert.match(supabaseClient, /\["character_skills", "skills"\]/);
  assert.match(supabaseClient, /\["character_outfits", "outfits"\]/);
  assert.match(supabaseClient, /\["character_combos", "combos"\]/);
  assert.match(supabaseClient, /\["troops", "troops"\]/);
});

test('ordinary public cast reads keep the existing cached table path', () => {
  assert.match(supabaseClient, /if \(hasValidShareToken && SHARED_BUNDLE_KEYS\.has\(table\)\)/);
  assert.match(supabaseClient, /return wrapReadBuilder\(/);
});

test('the shared-token URL param must look like a real UUID before any RPC call is made', () => {
  assert.match(
    supabaseClient,
    /hasValidShareToken = \/\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[1-5\]\[0-9a-f\]\{3\}-\[89ab\]\[0-9a-f\]\{3\}-\[0-9a-f\]\{12\}\$\/i\.test\(sharedViewToken\)/
  );
});

test('a resolved shared bundle is discarded if its public_id does not match the URL id', () => {
  assert.match(
    supabaseClient,
    /if \(sharedViewPublicId && data\.character\.public_id !== sharedViewPublicId\) return null;/
  );
});

test('account page tells owners of unlisted casts where the real share URL lives', () => {
  assert.match(accountJs, /"unlisted"/);
  assert.match(accountJs, /限定公開の共有URLは編集画面の「URLをコピー」から取得できます。/);
});

test('share-link migration is registered in the manifest and is immutable going forward', () => {
  assert.ok(
    manifest.files.includes('migrations/20260930_character_share_links.sql'),
    'migrations-manifest.json must list the share-link migration'
  );
});

test('character_share_links keeps RLS on with an owner-only read policy, no anon access', () => {
  assert.match(shareMigration, /alter table public\.character_share_links enable row level security;/);
  assert.match(shareMigration, /create policy "Owners can read share links" on public\.character_share_links/);
  assert.match(shareMigration, /for select to authenticated/);
  assert.match(shareMigration, /c\.owner_id = \(select auth\.uid\(\)\)/);
  assert.match(shareMigration, /revoke all on public\.character_share_links from public, anon;/);
  assert.match(shareMigration, /grant select on public\.character_share_links to authenticated;/);
  const grantLinesOnShareLinksTable = shareMigration
    .split('\n')
    .filter(line => /^grant\b/i.test(line.trim()) && /\bpublic\.character_share_links\b/.test(line));
  assert.ok(grantLinesOnShareLinksTable.length > 0, 'expected at least the authenticated SELECT grant');
  for (const line of grantLinesOnShareLinksTable) assert.doesNotMatch(line, /\banon\b/i);
});

test('get_unlisted_character_bundle is a hardened SECURITY DEFINER RPC scoped to public/unlisted casts', () => {
  assert.match(shareMigration, /create or replace function public\.get_unlisted_character_bundle\(p_share_token uuid\)/);
  assert.match(shareMigration, /security definer/);
  assert.match(shareMigration, /set search_path = 'public', 'pg_temp'/);
  assert.match(shareMigration, /where sl\.share_token = p_share_token\s*\n\s*and c\.visibility in \('public', 'unlisted'\)/);
  assert.doesNotMatch(shareMigration, /'private'/);
  assert.match(shareMigration, /revoke all on function public\.get_unlisted_character_bundle\(uuid\) from public;/);
  assert.match(shareMigration, /grant execute on function public\.get_unlisted_character_bundle\(uuid\) to anon, authenticated;/);
});

test('share links are only ever created server-side by the ensure-link trigger, never granted to clients', () => {
  assert.match(shareMigration, /create or replace function internal_security\.ensure_character_share_link\(\)/);
  assert.match(shareMigration, /security definer/);
  assert.match(
    shareMigration,
    /revoke all on function internal_security\.ensure_character_share_link\(\) from public, anon, authenticated;/
  );
  assert.match(shareMigration, /after insert on public\.characters/);
});
