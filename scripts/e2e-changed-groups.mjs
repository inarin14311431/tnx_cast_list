/* Decides whether an on-demand E2E group (one with `triggerPaths` in tests/e2e/test-suites.json) has to run.
 *
 *   node scripts/e2e-changed-groups.mjs <group>
 *
 * - pull_request: the files the pull request changes (the checked-out merge commit against its first parent)
 *   are matched against the group's triggerPaths.
 * - any other event (workflow_dispatch ...), or anything that cannot be determined: the group runs.
 * Writes `run=true|false` to $GITHUB_OUTPUT (and prints the decision), so the workflow can skip the job itself
 * instead of filtering the whole workflow by paths (which would leave the other required checks pending).
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// "*" matches within one path segment, "**" across segments. Nothing else is special.
export function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\?]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function matchesAny(globs, file) {
  return globs.some(glob => globToRegExp(glob).test(file));
}

export function changedFilesTriggerGroup(group, files) {
  const globs = Array.isArray(group?.triggerPaths) ? group.triggerPaths : [];
  return files.filter(file => matchesAny(globs, file));
}

function changedFilesOfPullRequest() {
  const output = execFileSync("git", ["diff", "--name-only", "HEAD^1", "HEAD"], { cwd: root, encoding: "utf8" });
  return output.split("\n").map(line => line.trim()).filter(Boolean);
}

async function main() {
  const groupName = process.argv[2];
  const manifest = JSON.parse(await readFile(path.join(root, "tests/e2e/test-suites.json"), "utf8"));
  const group = manifest.groups?.[groupName];
  if (!groupName || !group?.triggerPaths?.length) {
    console.error(`E2E group "${groupName}" has no triggerPaths`);
    process.exit(2);
  }

  let run = true;
  let reason = "";
  if (process.env.GITHUB_EVENT_NAME !== "pull_request") {
    reason = `event ${process.env.GITHUB_EVENT_NAME || "(local)"}: always run`;
  } else {
    try {
      const files = changedFilesOfPullRequest();
      const hits = changedFilesTriggerGroup(group, files);
      run = hits.length > 0;
      reason = run
        ? `${hits.length} of ${files.length} changed file(s) match triggerPaths: ${hits.slice(0, 10).join(", ")}${hits.length > 10 ? ", ..." : ""}`
        : `none of the ${files.length} changed file(s) match triggerPaths`;
    } catch (error) {
      reason = `could not read the changed files (${error.message.split("\n")[0]}): run to be safe`;
    }
  }

  console.log(`${groupName}: run=${run} (${reason})`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
