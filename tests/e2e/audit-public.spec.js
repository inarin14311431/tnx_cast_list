import { test, expect } from './safe-test.js';

const publicId = 'TNX-000029';

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
