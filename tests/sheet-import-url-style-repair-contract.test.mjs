import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("URL import waits for style detail repair before allowing save", async () => {
  const source = await read("js/sheet-import-url.js");
  assert.ok(source.includes("const saveButton=document.querySelector('#save-button')"));
  assert.ok(source.includes("if(saveButton)saveButton.disabled=true"));
  assert.ok(source.includes("const styleRepair=window.TNXLegacyStyleSkillRepair"));
  assert.ok(source.includes("function waitForBaseImport"));
  assert.ok(source.includes("const baseImport=waitForBaseImport()"));
  assert.ok(source.includes("await baseImport"));
  assert.ok(source.includes("if(styleRepair)await waitForStyleRepair(styleRepair)"));
  assert.ok(source.includes("await waitForStyleRepair(styleRepair)"));
  assert.ok(source.includes("if(saveButton)saveButton.disabled=restoreSaveDisabled"));
});

test("base style import encodes source detail before compatibility repair", async () => {
  const source = await read("js/sheet-import.js");
  assert.ok(source.includes("const STYLE_DETAIL_PREFIX='@@TNX_STYLE_DETAIL_V1@@'"));
  assert.ok(source.includes("function styleDetailFromSource") || source.includes("const styleDetailFromSource="));
  assert.ok(source.includes("current?.closest('#style-skills')"));
  assert.ok(source.includes("encodeStyleDetail(styleDetailFromSource(data))"));
});

test("style detail repair preserves all canonical detail fields", async () => {
  const source = await read("js/sheet-import-style-skill-compat.js");
  assert.ok(source.includes("@@TNX_STYLE_DETAIL_V1@@"));
  for (const key of ["skill","limit","timing","target","range","difficulty","confrontation","description","page"]) {
    assert.ok(source.includes(`${key}:String(`), `${key} must be preserved`);
  }
  assert.ok(source.includes("encodeStyleDetail(data)"));
});
