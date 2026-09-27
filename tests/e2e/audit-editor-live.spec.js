import { test, expect } from './safe-test.js';
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from './helpers.js';

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
