import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { root } from "./editor-cache-audit-lib.mjs";
import { planContentVersions, staleFiles } from "./content-version-lib.mjs";

/* npm run version:update - rewrites every managed ?v= to the content hash of the file it points to
 * (see content-version-lib.mjs), then regenerates the modulepreload links. Running it twice in a row
 * changes nothing the second time; audit:cache fails while any ?v= is out of date. */

const plan = await planContentVersions();
if (plan.problems.length) {
  console.error("version:update stopped without writing anything:");
  for (const problem of plan.problems) console.error(`- ${problem}`);
  process.exit(1);
}

const stale = staleFiles(plan);
for (const item of stale) await writeFile(item.path, item.next, "utf8");
console.log(`version:update: ${stale.length} file(s) rewritten, ${plan.references} versioned references checked.`);

const preload = spawnSync(process.execPath, [path.join(root, "scripts/generate-modulepreload.mjs")], { cwd: root, encoding: "utf8" });
process.stdout.write(preload.stdout);
process.stderr.write(preload.stderr);
process.exit(preload.status ?? 1);
