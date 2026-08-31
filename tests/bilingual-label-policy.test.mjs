import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("backup uses Japanese primary labels with English subtitles", async () => {
  const source = await read("backup.html");
  assert.match(source, /<h1>バックアップ／復元 <small>BACKUP \/ RESTORE<\/small><\/h1>/);
  assert.match(source, /<h2>バックアップ出力 <small>EXPORT<\/small><\/h2>/);
  assert.match(source, /<h2>バックアップ復元 <small>IMPORT<\/small><\/h2>/);
  assert.match(source, /JSONバックアップを保存<\/span><small>DOWNLOAD JSON BACKUP<\/small>/);
});

test("404 keeps Japanese as the primary action language", async () => {
  const source = await read("404.html");
  assert.match(source, /アクセスエラー <small>ACCESS ERROR \/\/ 404<\/small>/);
  assert.match(source, /データが見つかりません <small>DATA NOT FOUND<\/small>/);
  assert.match(source, /キャスト一覧へ戻る<\/span><small>RETURN TO ARCHIVE<\/small>/);
});

test("troop list filters expose compact English subtitles without replacing Japanese", async () => {
  const source = await read("troops.html");
  assert.match(source, /紐づけキャスト <small>LINKED CAST<\/small>/);
  assert.match(source, /公開状態 <small>VISIBILITY<\/small>/);
});

test("act history primary action is bilingual", async () => {
  const source = await read("acts.html");
  assert.match(source, /消費履歴を追加<\/span><small>ADD EXPENSE<\/small>/);
});

test("transfer pages keep Japanese primary headings and English secondary labels", async () => {
  const desktop = await read("transfer.html");
  const mobile = await read("mobile-transfer.html");
  assert.match(desktop, /<h1>データ転記 <small>DATA TRANSFER<\/small><\/h1>/);
  assert.match(desktop, /CASTデータ読込<\/span><small>LOAD CAST DATA<\/small>/);
  assert.match(desktop, /転記結果 <small>TRANSFER RESULT<\/small>/);
  assert.match(mobile, /転記ガイド <small>CHARACTER SHEETS TRANSFER<\/small>/);
  assert.match(mobile, /キャラクターシート倉庫へ転記 <small>TRANSFER TO CHARACTER SHEETS<\/small>/);
});