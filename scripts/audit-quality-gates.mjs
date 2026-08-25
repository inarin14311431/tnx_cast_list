import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const contract = readJson("quality-gates.json");
const pkg = readJson("package.json");
const failures = [];

for (const script of contract.requiredScripts || []) {
  if (!pkg.scripts?.[script]) failures.push(`Missing package script: ${script}`);
}
for (const workflow of contract.requiredWorkflows || []) {
  const file = path.join(root, ".github", "workflows", workflow);
  if (!fs.existsSync(file)) failures.push(`Missing workflow: ${workflow}`);
}
if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(contract.contractVersion || "")) {
  failures.push("quality-gates.json contractVersion must use YYYY-MM-DD.N format");
}

const compareArg = process.argv.indexOf("--compare");
if (compareArg >= 0) {
  const comparePath = process.argv[compareArg + 1];
  if (!comparePath) failures.push("--compare requires a contract path");
  else {
    const other = JSON.parse(fs.readFileSync(path.resolve(root, comparePath), "utf8"));
    if (other.contractVersion !== contract.contractVersion) {
      failures.push(`Quality contract mismatch: local=${contract.contractVersion}, reference=${other.contractVersion}`);
    }
  }
}

if (failures.length) {
  console.error("Quality gate audit failed:");
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Quality gate audit passed (${contract.contractVersion}).`);
