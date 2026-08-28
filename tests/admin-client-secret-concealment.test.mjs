import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function collectJavaScriptFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(fullPath);
    return entry.isFile() && /\.js$/i.test(entry.name) ? [fullPath] : [];
  });
}

test("browser JavaScript contains no service-role material or fixed administrator identity", () => {
  const jsRoot = path.join(root, "js");
  const files = collectJavaScriptFiles(jsRoot);

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service[_-]?role/i,
      `${relative} must not reference service-role credentials.`
    );
  }

  const adminDelete = fs.readFileSync(path.join(jsRoot, "master-user-delete.js"), "utf8");
  assert.doesNotMatch(
    adminDelete,
    /PRIMARY_ADMIN_USER_ID|PRIMARY_ADMIN_EMAIL/,
    "Administrator identity must not be hard-coded in the browser delete UI."
  );
  assert.doesNotMatch(
    adminDelete,
    /["'`][^"'`\n\r\s]+@[^"'`\n\r\s]+["'`]/,
    "Administrator email addresses must not be embedded in browser JavaScript."
  );
  assert.match(
    adminDelete,
    /管理者アカウントはサーバー側で保護されます/,
    "The browser UI must treat server-side authorization as the source of truth."
  );
});
