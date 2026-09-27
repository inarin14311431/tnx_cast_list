import { test, expect } from './safe-test.js';
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from './helpers.js';
import { TEST_OWNER_ID } from './owner-policy.js';

const publicId = 'TNX-000029';

test('認証付きプロキシで所有キャストの登録済み倉庫データを取得できる', async ({page}) => {
  test.skip(!hasAuthCredentials(), '認証必須');
  await page.goto('/index.html');
  const result = await page.evaluate(async ({id, ownerId}) => {
    const { supabase } = await import('/js/supabase-client.js');
    const { requestCharacterSheetSource } = await import('/js/character-sheet-source.js');
    const { data, error } = await supabase.from('characters').select('character_sheet_url').eq('public_id', id).eq('owner_id', ownerId).single();
    if (error) throw error;
    const payload = await requestCharacterSheetSource(data.character_sheet_url);
    return {valid: Boolean(payload && typeof payload === 'object'), keys: Object.keys(payload).length};
  }, {id:publicId, ownerId:TEST_OWNER_ID});
  expect(result.valid).toBe(true);
  expect(result.keys).toBeGreaterThan(0);
});

for (const mode of ['desktop','mobile']) {
  test(`主要編集画面の入力ラベルとリソース予算 ${mode}`, async ({page}) => {
    test.skip(!hasAuthCredentials(), '認証必須');
    await page.goto(`/${mode==='desktop'?'sheet':'sheet-mobile'}.html?id=${getTestCastId()}`);
    let field;
    if (mode==='desktop') {
      await waitForEditorReady(page);
      field = page.locator('#character-name');
    } else {
      await expect(page.locator('[data-mobile-character-field="character_name"]')).not.toHaveValue('');
      await page.locator('[data-mobile-profile-group="identity"]').click();
      await expect(page.locator('#mobile-profile-dialog')).toBeVisible();
      field = page.locator('[data-mobile-profile-modal-field="character_name"]');
    }
    await expect(field).toHaveAccessibleName(/キャスト|名前|名称/);
    const metrics = await page.evaluate(() => ({
      nodes:document.querySelectorAll('*').length,
      resources:performance.getEntriesByType('resource').length,
      scripts:document.scripts.length,
      invalidReferences:[...document.querySelectorAll('[aria-labelledby]')].filter(el=>el.getAttribute('aria-labelledby').split(/\s+/).some(id=>!document.getElementById(id))).map(el=>el.id)
    }));
    expect(metrics.nodes).toBeLessThan(10000);
    expect(metrics.resources).toBeLessThan(220);
    expect(metrics.scripts).toBeLessThan(60);
    expect(metrics.invalidReferences).toEqual([]);
  });
}

test('取込ダイアログはキーボードで閉じられる', async ({page}) => {
  test.skip(!hasAuthCredentials(), '認証必須');
  await page.goto(`/sheet.html?id=${getTestCastId()}`);
  await waitForEditorReady(page);
  await page.locator('#legacy-import-open').click();
  await expect(page.locator('#legacy-import-dialog')).toBeVisible();
  await expect(page.locator('#character-sheets-import-url')).toHaveAccessibleName('キャラクターシート倉庫URL');
  await page.keyboard.press('Escape');
  await expect(page.locator('#legacy-import-dialog')).toBeHidden();
});
