import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFile(path.join(root, file), "utf8");
const failures = [];

const packageJson = JSON.parse(await read("package.json"));
const regression = await read(".github/workflows/regression.yml");
const security = await read(".github/workflows/security.yml");
const verify = String(packageJson.scripts?.verify || "");
const auditScripts = Object.keys(packageJson.scripts || {})
  .filter(name => name.startsWith("audit:") && name !== "audit:ci")
  .sort();

for (const name of auditScripts) {
  if (!verify.includes(`npm run ${name}`)) {
    failures.push(`package.json verify is missing ${name}`);
  }
  if (!regression.includes(`npm run ${name}`)) {
    failures.push(`regression workflow is missing ${name}`);
  }
}

if (!verify.includes("npm run audit:ci")) {
  failures.push("package.json verify must run audit:ci");
}
if (!regression.includes("npm run audit:ci")) {
  failures.push("regression workflow must run audit:ci");
}
if (!verify.includes("npm test")) {
  failures.push("package.json verify must finish with Node regression tests");
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

console.log(`CI contract audit passed: ${auditScripts.length} audit scripts are covered by verify and regression CI.`);
