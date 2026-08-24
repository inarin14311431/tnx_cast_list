import test from "node:test";
import assert from "node:assert/strict";
import { formatSheetPersistenceError } from "../js/sheet-error-message.js";

test("save errors preserve transactional and permission guidance", () => {
  assert.match(formatSheetPersistenceError("PGRST202 save_character_bundle"), /安全保存機能が未設定/);
  assert.match(formatSheetPersistenceError("row-level security 42501"), /保存権限がありません/);
  assert.match(formatSheetPersistenceError("network fetch failed"), /既存データは変更されていません/);
});

test("load errors use load-specific wording instead of save failure wording", () => {
  const rls = formatSheetPersistenceError("row-level security 42501", { operation: "load" });
  assert.match(rls, /読込権限がありません/);
  assert.doesNotMatch(rls, /保存権限/);

  const generic = formatSheetPersistenceError("record unavailable", { operation: "load" });
  assert.equal(generic, "読込に失敗しました：record unavailable");
  assert.doesNotMatch(generic, /保存に失敗/);
});
