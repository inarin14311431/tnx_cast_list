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

test('一覧・PC詳細・モバイル詳細で表示IDが一致する', async ({page}) => {
  await page.goto('/index.html');
  await page.getByRole('searchbox').fill('トリル');
  const card = page.locator('.cast-card').filter({has:page.locator(`a[href*="id=${publicId}"]`)});
  await expect(card).toHaveCount(1);
  const expected = await card.locator('.cast-card__serial').innerText();
  expect(expected).toMatch(/^TNX-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  await page.goto(`/cast.html?id=${publicId}&mobile=0`);
  await expect(page.locator('#cast-content')).toBeVisible();
  await expect(page.locator('#cast-public-id')).toHaveText(expected);
  await page.goto(`/cast.html?id=${publicId}&mobile=1`);
  await expect(page.locator('.mobile-cast-topbar > span')).toHaveText(expected);
});

test('スキャン演出ありでも表示が完了しタブを操作できる', async ({page}) => {
  await page.goto(`/cast.html?id=${publicId}&mobile=0&scan=full`);
  await expect(page.locator('.cast-access-overlay')).toBeVisible();
  await expect(page.locator('.cast-access-overlay')).toHaveCount(0, {timeout:15000});
  await expect(page.locator('#cast-content')).toBeVisible();
  const profile = page.getByRole('tab', {name:/プロフィール/});
  await profile.click();
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-profile')).toBeVisible();
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

test('PC編集は所有キャストを保存・再読込し原状復帰できる', async ({page}) => {
  test.skip(!hasAuthCredentials(), '認証必須');
  test.setTimeout(60000);
  const url = `/sheet.html?id=${getTestCastId()}`;
  await page.goto(url);
  await waitForEditorReady(page);
  const field = page.locator('#summary');
  const original = await field.inputValue();
  const marker = `${original}${original ? '\n' : ''}[E2E AUDIT ${Date.now()}]`;

  async function save(value) {
    await field.fill(value);
    await page.locator('#save-button').click();
    await expect(page.locator('#save-button')).toHaveAttribute('data-save-state', 'saved', {timeout:20000});
  }

  try {
    await save(marker);
    await page.reload();
    await waitForEditorReady(page);
    await expect(page.locator('#summary')).toHaveValue(marker);
  } finally {
    if (!page.isClosed()) {
      await page.goto(url);
      await waitForEditorReady(page);
      const restore = page.locator('#summary');
      await restore.fill(original);
      await page.locator('#save-button').click();
      await expect(page.locator('#save-button')).toHaveAttribute('data-save-state', 'saved', {timeout:20000});
    }
  }
});

test('モバイル編集は所有キャストを保存・再読込し原状復帰できる', async ({page}) => {
  test.skip(!hasAuthCredentials(), '認証必須');
  test.setTimeout(60000);
  await page.setViewportSize({width:390, height:844});
  const url = `/sheet-mobile.html?id=${getTestCastId()}`;
  await page.goto(url);
  await expect(page.locator('[data-mobile-character-field="character_name"]')).not.toHaveValue('');
  const source = page.locator('[data-mobile-character-field="summary"]');
  const original = await source.inputValue();
  const marker = `${original}${original ? '\n' : ''}[E2E MOBILE AUDIT ${Date.now()}]`;

  async function editAndSave(value) {
    await page.locator('[data-mobile-profile-group="summary"]').click();
    await expect(page.locator('#mobile-profile-dialog')).toBeVisible();
    await page.locator('[data-mobile-profile-modal-field="summary"]').fill(value);
    await page.locator('#mobile-profile-dialog-apply').click();
    const save = page.locator('#mobile-save');
    await expect(save).toHaveAttribute('data-state', 'dirty');
    await save.click();
    await expect(save).toHaveAttribute('data-state', 'saved', {timeout:20000});
  }

  try {
    await editAndSave(marker);
    await page.reload();
    await expect(page.locator('[data-mobile-character-field="character_name"]')).not.toHaveValue('');
    await expect(page.locator('[data-mobile-character-field="summary"]')).toHaveValue(marker);
  } finally {
    if (!page.isClosed()) {
      await page.goto(url);
      await expect(page.locator('[data-mobile-character-field="character_name"]')).not.toHaveValue('');
      await editAndSave(original);
    }
  }
});
