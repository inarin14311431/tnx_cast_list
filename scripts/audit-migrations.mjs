import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "supabase");
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "migrations-manifest.json"), "utf8"));
const actual = fs.readdirSync(dir).filter(name => name.endsWith(".sql")).sort();
const listed = manifest.files || [];
const failures = [];

if (new Set(listed).size !== listed.length) failures.push("Migration manifest contains duplicate file entries.");
for (const file of listed) {
  if (!/^\d{2,}_[a-z0-9_]+\.sql$/.test(file)) failures.push(`Invalid migration filename: ${file}`);
  if (!actual.includes(file)) failures.push(`Manifest references missing migration: ${file}`);
}
for (const file of actual) {
  if (!listed.includes(file)) failures.push(`Untracked migration: ${file}`);
}
for (let i = 1; i < listed.length; i += 1) {
  const previous = Number(listed[i - 1].match(/^(\d+)/)?.[1]);
  const current = Number(listed[i].match(/^(\d+)/)?.[1]);
  if (Number.isFinite(previous) && Number.isFinite(current) && current < previous) {
    failures.push(`Migration manifest order regresses at ${listed[i]}.`);
  }
}

if (failures.length) {
  console.error("Migration audit failed:");
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Migration audit passed (${listed.length} tracked SQL files).`);
