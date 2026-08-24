import { test, expect } from "@playwright/test";
import { getTestCastId, hasAuthCredentials, waitForEditorReady } from "./helpers.js";

test("旧JSON取込はライフパス・★表示技能・明示free_level・アウトフィットを保存再読込まで維持する", async ({ page }) => {
  test.skip(!hasAuthCredentials(), "E2E_EMAIL / E2E_PASSWORD が未設定のためスキップ");

  const castId = getTestCastId();
  await page.goto(`/sheet.html?id=${encodeURIComponent(castId)}`);
  await waitForEditorReady(page);

  const legacy = {
    base: {
      name: "IMPORT TEST",
      age: "31",
      sex: "X",
      height: "170cm",
      weight: "60kg",
      eyes: "青",
      hair: "黒",
      skin: "白",
      birth: "N◎VA",
      memoir: "取込プロフィール",
      lifepath: {
        experience: "化学汚染地",
        environment: "企業",
        encounter: "ビジネス"
      }
    },
    skills1: [
      { name: "★射撃", level: 1, s: 1 },
      { name: "医療", level: 1, h: 1, free_level: 1 }
    ],
    weapons: [
      { name: "夜魔の武器", attack: "+5", range: "至近", permanent: 10 }
    ],
    armors: [
      { name: "E2Eアーマー", protecS: "3", protecP: "2", protecI: "1", control: "-1", permanent: 5 }
    ]
  };

  await page.locator("#legacy-import-open").click();
  await page.locator("#legacy-import-json").fill(JSON.stringify(legacy));
  await page.locator("#legacy-import-apply").click();
  await expect(page.locator("#legacy-import-message")).toContainText("取込が完了", { timeout: 20000 });

  await expect(page.locator("#age")).toHaveValue("31");
  await expect(page.locator("#gender")).toHaveValue("X");
  await expect(page.locator("#height")).toHaveValue("170cm");
  await expect(page.locator("#weight")).toHaveValue("60kg");
  await expect(page.locator("#eyes")).toHaveValue("青");
  await expect(page.locator("#hair")).toHaveValue("黒");
  await expect(page.locator("#skin")).toHaveValue("白");
  await expect(page.locator("#life-path-origin")).toHaveValue("化学汚染地");
  await expect(page.locator("#life-path-experience")).toHaveValue("企業");
  await expect(page.locator("#life-path-encounter")).toHaveValue("ビジネス");
  await expect(page.locator("#profile")).toHaveValue(/取込プロフィール/);
  await expect(page.locator("#profile")).toHaveValue(/出身：N◎VA/);

  const shooting = page.locator('#general-skills tr[data-skill-key]:has(input[data-f="name"][value="射撃"])').first();
  await expect(shooting.locator('[data-f="free_level"]')).toHaveValue("0");

  const medical = page.locator('#general-skills tr[data-skill-key]:has(input[data-f="name"][value="医療"])').first();
  await expect(medical.locator('[data-f="free_level"]')).toHaveValue("1");

  const weapon = page.locator('#outfit-list [data-outfit-key]:has(input[data-o="name"][value="夜魔の武器"])').first();
  await expect(weapon).toBeVisible();
  await expect(weapon.locator('[data-o="category"]')).toHaveValue("weapon");
  await expect(weapon.locator('[data-o="attack"]')).toHaveValue("+5");
  await expect(weapon.locator('[data-o="range"]')).toHaveValue("至近");
  await expect(weapon.locator('[data-o="experience_cost"]')).toHaveValue("10");

  const armor = page.locator('#outfit-list [data-outfit-key]:has(input[data-o="name"][value="E2Eアーマー"])').first();
  await expect(armor).toBeVisible();
  await expect(armor.locator('[data-o="category"]')).toHaveValue("armor");
  await expect(armor.locator('[data-ofc="defense_s"]')).toHaveValue("3");
  await expect(armor.locator('[data-ofc="defense_p"]')).toHaveValue("2");
  await expect(armor.locator('[data-ofc="defense_i"]')).toHaveValue("1");
  await expect(armor.locator('[data-o="control_modifier"]')).toHaveValue("-1");

  const armorTable = page.locator('#outfit-list table[data-outfit-schema="armor"]');
  await expect(armorTable.locator('[data-armor-total="s"]')).toHaveText("3");
  await expect(armorTable.locator('[data-armor-total="p"]')).toHaveText("2");
  await expect(armorTable.locator('[data-armor-total="i"]')).toHaveText("1");

  for (const key of ["s", "p", "i"]) {
    const fieldBox = await armor.locator(`[data-ofc="defense_${key}"]`).boundingBox();
    const totalBox = await armorTable.locator(`[data-armor-total="${key}"]`).boundingBox();
    expect(fieldBox).not.toBeNull();
    expect(totalBox).not.toBeNull();
    expect(Math.abs(fieldBox.x - totalBox.x)).toBeLessThanOrEqual(3);
  }

  await page.locator("#save-button").click();
  await expect(page.locator("#save-button")).toHaveAttribute("data-save-state", "saved", { timeout: 30000 });

  await page.reload();
  await waitForEditorReady(page);

  await expect(page.locator("#age")).toHaveValue("31");
  await expect(page.locator("#gender")).toHaveValue("X");
  await expect(page.locator("#height")).toHaveValue("170cm");
  await expect(page.locator("#weight")).toHaveValue("60kg");
  await expect(page.locator("#eyes")).toHaveValue("青");
  await expect(page.locator("#hair")).toHaveValue("黒");
  await expect(page.locator("#skin")).toHaveValue("白");
  await expect(page.locator("#life-path-origin")).toHaveValue("化学汚染地");
  await expect(page.locator("#life-path-experience")).toHaveValue("企業");
  await expect(page.locator("#life-path-encounter")).toHaveValue("ビジネス");

  const reloadedArmor = page.locator('#outfit-list [data-outfit-key]:has(input[data-o="name"][value="E2Eアーマー"])').first();
  await expect(reloadedArmor).toBeVisible({ timeout: 20000 });
  await expect(reloadedArmor.locator('[data-ofc="defense_s"]')).toHaveValue("3", { timeout: 20000 });
  await expect(reloadedArmor.locator('[data-ofc="defense_p"]')).toHaveValue("2");
  await expect(reloadedArmor.locator('[data-ofc="defense_i"]')).toHaveValue("1");
  await expect(reloadedArmor.locator('[data-o="control_modifier"]')).toHaveValue("-1");

  const reloadedArmorTable = page.locator('#outfit-list table[data-outfit-schema="armor"]');
  await expect(reloadedArmorTable.locator('[data-armor-total="s"]')).toHaveText("3", { timeout: 20000 });
  await expect(reloadedArmorTable.locator('[data-armor-total="p"]')).toHaveText("2");
  await expect(reloadedArmorTable.locator('[data-armor-total="i"]')).toHaveText("1");
});
