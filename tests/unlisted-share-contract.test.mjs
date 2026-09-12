import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const desktopSnapshot = fs.readFileSync(new URL('../js/sheet-character-input-snapshot.js', import.meta.url), 'utf8');
const mobileEditor = fs.readFileSync(new URL('../js/sheet-mobile.js', import.meta.url), 'utf8');
const mobileApp = fs.readFileSync(new URL('../js/sheet-mobile-app.js', import.meta.url), 'utf8');
const shareEditor = fs.readFileSync(new URL('../js/character-share-editor.js', import.meta.url), 'utf8');
const supabaseClient = fs.readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');

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
