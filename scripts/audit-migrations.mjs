import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "supabase");
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "migrations-manifest.json"), "utf8"));
const trackedDirs = ["", "migrations"];
const actual = trackedDirs
  .flatMap(relativeDir => {
    const absoluteDir = path.join(dir, relativeDir);
    if (!fs.existsSync(absoluteDir)) return [];
    return fs.readdirSync(absoluteDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith(".sql"))
      .map(entry => relativeDir ? `${relativeDir}/${entry.name}` : entry.name);
  })
  .sort();
const listed = manifest.files || [];
const failures = [];
const rootMigrationPattern = /^\d{2,}_[a-z0-9_]+\.sql$/;
const timestampMigrationPattern = /^migrations\/\d{8}_[a-z0-9_]+\.sql$/;

if (new Set(listed).size !== listed.length) failures.push("Migration manifest contains duplicate file entries.");
for (const file of listed) {
  if (!rootMigrationPattern.test(file) && !timestampMigrationPattern.test(file)) {
    failures.push(`Invalid migration filename: ${file}`);
  }
  if (!actual.includes(file)) failures.push(`Manifest references missing migration: ${file}`);
}
for (const file of actual) {
  if (!listed.includes(file)) failures.push(`Untracked migration: ${file}`);
}

const migrationVersion = file => {
  const rootMatch = file.match(/^(\d+)_/);
  if (rootMatch) return Number(rootMatch[1]);
  const timestampMatch = file.match(/^migrations\/(\d{8})_/);
  return timestampMatch ? Number(timestampMatch[1]) : Number.NaN;
};

for (let i = 1; i < listed.length; i += 1) {
  const previous = migrationVersion(listed[i - 1]);
  const current = migrationVersion(listed[i]);
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
