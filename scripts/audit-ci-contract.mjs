import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFile(path.join(root, file), "utf8");
const failures = [];

const packageJson = JSON.parse(await read("package.json"));
const regression = await read(".github/workflows/regression.yml");
const security = await read(".github/workflows/security.yml");
/* `verify` now runs scripts/verify.mjs (see that file's STEPS list) instead of a single
 * "npm run a && npm run b && ..." chain, so the chain is no longer in package.json to scan. */
const verifyScript = await read("scripts/verify.mjs");
const auditScripts = Object.keys(packageJson.scripts || {})
  .filter(name => name.startsWith("audit:") && name !== "audit:ci")
  .sort();
const regressionAuditScripts = auditScripts.filter(name => name !== "audit:security");

if (packageJson.scripts?.verify !== "node scripts/verify.mjs") {
  failures.push('package.json "verify" script must run node scripts/verify.mjs');
}

for (const name of auditScripts) {
  if (!verifyScript.includes(`"${name}"`)) {
    failures.push(`scripts/verify.mjs is missing ${name}`);
  }
}

for (const name of regressionAuditScripts) {
  if (!regression.includes(`npm run ${name}`)) {
    failures.push(`regression workflow is missing ${name}`);
  }
}

if (regression.includes("npm run audit:security")) {
  failures.push("regression workflow must not duplicate the dedicated security audit");
}
if (!verifyScript.includes('"audit:ci"')) {
  failures.push("scripts/verify.mjs must run audit:ci");
}
if (!regression.includes("npm run audit:ci")) {
  failures.push("regression workflow must run audit:ci");
}
if (!verifyScript.includes('["test"]')) {
  failures.push("scripts/verify.mjs must finish with Node regression tests");
}
if (!regression.includes("npm test")) {
  failures.push("regression workflow must run Node regression tests");
}
if (!security.includes("npm run audit:security")) {
  failures.push("dedicated security workflow must run audit:security");
}

if (failures.length) {
  console.error("CI contract audit failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`CI contract audit passed: ${auditScripts.length} audit scripts covered without duplicate security execution.`);
