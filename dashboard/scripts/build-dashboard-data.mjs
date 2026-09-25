#!/usr/bin/env node
// Builds dashboard/data.json from the staging (tnx-cast-archive-test) and
// production (tnx_cast_list) repositories' pull-request history.
//
// Requires:
//   - `gh` CLI authenticated (GH_TOKEN or GITHUB_TOKEN env var) for reading
//     PR metadata (title/body/author/labels/timestamps) from both repos.
//     Both repos are public, so no special scopes are needed.
//   - A local git checkout of the production repo (this repo, run from its
//     root) with full history, and a local git checkout of the staging repo
//     with full history, for computing changed files / blob equality.
//
// Env vars (all optional, sensible defaults for CI):
//   PROD_REPO_DIR   - path to the production repo checkout (default: ".")
//   STAGING_REPO_DIR- path to the staging repo checkout (default: "../staging-repo")
//   OUT_FILE        - output path (default: "dashboard/data.json", relative to PROD_REPO_DIR)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const PROD_REPO_DIR = path.resolve(process.env.PROD_REPO_DIR || ".");
const STAGING_REPO_DIR = path.resolve(process.env.STAGING_REPO_DIR || "../staging-repo");
const OUT_FILE = path.resolve(PROD_REPO_DIR, process.env.OUT_FILE || "dashboard/data.json");

const TEST_SLUG = "inarin14311431/tnx-cast-archive-test";
const PROD_SLUG = "inarin14311431/tnx_cast_list";

const APP_PATTERNS = [
  p => p.startsWith("js/"),
  p => p.startsWith("css-next/"),
  p => p.endsWith(".html"),
  p => p.startsWith("config/"),
  p => p.startsWith("supabase/"),
];
const isAppFile = p => APP_PATTERNS.some(fn => fn(p));

function ghApiPaginate(slug) {
  const out = execFileSync(
    "gh",
    [
      "api",
      "--paginate",
      `repos/${slug}/pulls?state=all&per_page=100&sort=created&direction=asc`,
      "--jq",
      ".[] | {number, title, body, state, user: .user.login, created_at, merged_at, closed_at, merge_commit_sha, labels: [.labels[].name]}",
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 128 }
  );
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function git(repo, args, opts = {}) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1024 * 1024 * 64, ...opts });
}
function gitOrNull(repo, args) {
  try {
    return execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 16,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
function blobSha(repo, ref, filePath) {
  return gitOrNull(repo, ["rev-parse", `${ref}:${filePath}`]);
}

console.log(`PROD_REPO_DIR=${PROD_REPO_DIR}`);
console.log(`STAGING_REPO_DIR=${STAGING_REPO_DIR}`);

console.log("Fetching PR metadata from GitHub...");
const allTestPRs = ghApiPaginate(TEST_SLUG);
const allProdPRs = ghApiPaginate(PROD_SLUG);
console.log(`test PRs: ${allTestPRs.length}, prod PRs: ${allProdPRs.length}`);

const testByNumber = new Map(allTestPRs.map(p => [p.number, p]));
const testMerged = allTestPRs.filter(p => p.merged_at);
const prodMerged = allProdPRs.filter(p => p.merged_at);

// ============================================================
// Changed files per merged PR, from local git history
// ============================================================
function changedFiles(repo, sha) {
  const out = gitOrNull(repo, ["diff", "--name-status", `${sha}~1`, sha]);
  if (out === null) return [];
  return out
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const [status, ...rest] = line.split("\t");
      return { status: status[0], path: rest[rest.length - 1] };
    });
}

for (const pr of testMerged) {
  pr._files = pr.merge_commit_sha ? changedFiles(STAGING_REPO_DIR, pr.merge_commit_sha) : [];
  pr._appFiles = pr._files.filter(f => isAppFile(f.path)).map(f => f.path);
  pr._inScope = pr._appFiles.length > 0;
}
for (const pr of prodMerged) {
  pr._files = pr.merge_commit_sha ? changedFiles(PROD_REPO_DIR, pr.merge_commit_sha) : [];
  pr._appFiles = pr._files.filter(f => isAppFile(f.path)).map(f => f.path);
  pr._appFileSet = new Set(pr._appFiles);
}

// ============================================================
// Priority 1: explicit test-PR-number references in prod PR text
// ============================================================
const SYNC_CONTEXT_RE = /検証|staging|同期|sync/i;
const MAX_RANGE = 60;

function extractReferencedTestNumbers(prPr) {
  const text = `${prPr.title || ""}\n${prPr.body || ""}`;
  const refs = new Set();
  if (!SYNC_CONTEXT_RE.test(text)) return refs;

  const crossRe = /tnx-cast-archive-test(?:#|\/pull\/)(\d+)/g;
  for (const m of text.matchAll(crossRe)) refs.add(Number(m[1]));

  const rangeRe = /#(\d+)\s*[~〜]\s*#?(\d+)/g;
  for (const m of text.matchAll(rangeRe)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a <= b && b - a <= MAX_RANGE) for (let n = a; n <= b; n++) refs.add(n);
  }

  const listRe = /PR\s*((?:#\d+\s*[\/／,、]\s*)+#\d+)/g;
  for (const m of text.matchAll(listRe)) for (const n of m[1].matchAll(/#(\d+)/g)) refs.add(Number(n[1]));

  const soutouRe = /#(\d+)\s*相当/g;
  for (const m of text.matchAll(soutouRe)) refs.add(Number(m[1]));

  const bareRe = /#(\d+)/g;
  for (const m of text.matchAll(bareRe)) refs.add(Number(m[1]));

  for (const n of [...refs]) if (!testByNumber.has(n)) refs.delete(n);
  return refs;
}

const explicitMap = new Map();
for (const prodPr of allProdPRs) {
  const refs = extractReferencedTestNumbers(prodPr);
  for (const n of refs) {
    if (!explicitMap.has(n)) explicitMap.set(n, []);
    explicitMap.get(n).push({
      prodNumber: prodPr.number,
      prodMerged: !!prodPr.merged_at,
      prodMergedAt: prodPr.merged_at,
      prodTitle: prodPr.title,
    });
  }
}

// ============================================================
// Priority 2: file content comparison
// ============================================================
const testHead = git(STAGING_REPO_DIR, ["rev-parse", "main"]).trim();
const prodHead = git(PROD_REPO_DIR, ["rev-parse", "main"]).trim();
const blobCache = new Map();
function cachedBlob(repo, ref, filePath) {
  const key = `${repo}|${ref}|${filePath}`;
  if (blobCache.has(key)) return blobCache.get(key);
  const sha = blobSha(repo, ref, filePath);
  blobCache.set(key, sha);
  return sha;
}
function fileFullyReflected(testPr) {
  if (!testPr._appFiles.length) return { match: false, ratio: 0 };
  let matched = 0;
  for (const p of testPr._appFiles) {
    const blobAtMerge = cachedBlob(STAGING_REPO_DIR, testPr.merge_commit_sha, p);
    const blobAtTestHead = cachedBlob(STAGING_REPO_DIR, testHead, p);
    const blobInProd = cachedBlob(PROD_REPO_DIR, prodHead, p);
    const bothDeleted = blobAtMerge === null && blobInProd === null;
    const contentMatch = blobInProd !== null && (blobInProd === blobAtMerge || blobInProd === blobAtTestHead);
    if (bothDeleted || contentMatch) matched++;
  }
  return { match: matched === testPr._appFiles.length, ratio: matched / testPr._appFiles.length };
}
function bestOverlapProdPR(testPr) {
  const testSet = new Set(testPr._appFiles);
  let best = null;
  let bestScore = 0;
  for (const pr of prodMerged) {
    if (pr.merged_at && testPr.merged_at && pr.merged_at < testPr.merged_at) continue;
    if (pr._appFileSet.size === 0) continue;
    let inter = 0;
    for (const p of testSet) if (pr._appFileSet.has(p)) inter++;
    const union = testSet.size + pr._appFileSet.size - inter;
    const score = union === 0 ? 0 : inter / union;
    if (score > bestScore) { bestScore = score; best = pr; }
  }
  return best ? { prodNumber: best.number, prodTitle: best.title, score: bestScore } : null;
}

// ============================================================
// Priority 3: title similarity (character-bigram Dice coefficient)
// ============================================================
function normalizeTitle(t) {
  return (t || "").toLowerCase().replace(/[\s　\-_:：（）()[\]【】「」、。,.\/]/g, "");
}
function bigrams(s) {
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  if (s.length === 1) set.add(s);
  return set;
}
function diceSim(a, b) {
  const A = bigrams(normalizeTitle(a));
  const B = bigrams(normalizeTitle(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}
function bestTitleMatch(testPr) {
  let best = null;
  let bestScore = 0;
  for (const pr of prodMerged) {
    if (pr.merged_at && testPr.merged_at && pr.merged_at < testPr.merged_at) continue;
    const score = diceSim(testPr.title, pr.title);
    if (score > bestScore) { bestScore = score; best = pr; }
  }
  return best ? { prodNumber: best.number, prodTitle: best.title, score: bestScore } : null;
}

// ============================================================
// Classification
// ============================================================
const TITLE_SIM_THRESHOLD = 0.5;
const classified = [];
for (const testPr of testMerged) {
  const base = {
    number: testPr.number,
    title: testPr.title,
    author: testPr.user,
    merged_at: testPr.merged_at,
    created_at: testPr.created_at,
    appFiles: testPr._appFiles,
  };
  if (!testPr._inScope) {
    classified.push({ ...base, status: "out-of-scope" });
    continue;
  }
  const explicit = explicitMap.get(testPr.number);
  if (explicit && explicit.some(e => e.prodMerged)) {
    const merged = explicit.filter(e => e.prodMerged);
    classified.push({
      ...base,
      status: "reflected",
      evidence: "number",
      prodLinks: merged.map(e => ({ number: e.prodNumber, title: e.prodTitle, merged_at: e.prodMergedAt })),
    });
    continue;
  }
  const unmergedRefs = explicit && explicit.length > 0 ? explicit : null;
  const fileCheck = fileFullyReflected(testPr);
  if (fileCheck.match) {
    const link = bestOverlapProdPR(testPr);
    classified.push({
      ...base,
      status: "reflected",
      evidence: "file-match",
      prodLinks: link ? [{ number: link.prodNumber, title: link.prodTitle, overlapScore: link.score }] : [],
    });
    continue;
  }
  const titleMatch = bestTitleMatch(testPr);
  if (titleMatch && titleMatch.score >= TITLE_SIM_THRESHOLD) {
    classified.push({
      ...base,
      status: "reflected",
      evidence: "title-similarity",
      prodLinks: [{ number: titleMatch.prodNumber, title: titleMatch.prodTitle, score: titleMatch.score }],
    });
    continue;
  }
  if (unmergedRefs) {
    classified.push({
      ...base,
      status: "not-reflected",
      evidence: "number-unmerged",
      prodLinks: unmergedRefs.map(e => ({ number: e.prodNumber, title: e.prodTitle, merged_at: e.prodMergedAt })),
    });
    continue;
  }
  classified.push({ ...base, status: "not-reflected", evidence: null, prodLinks: [] });
}

// ============================================================
// Self-validation (reported in dashboard footnote, not just PR description)
// ============================================================
const groundTruth = testMerged.filter(testPr => {
  if (!testPr._inScope) return false;
  const explicit = explicitMap.get(testPr.number);
  return explicit && explicit.some(e => e.prodMerged);
});
let fileMatchAgree = 0, fileMatchLinkOk = 0, titleMatchAgree = 0, titleMatchLinkOk = 0;
for (const testPr of groundTruth) {
  const truthProdNumbers = new Set(explicitMap.get(testPr.number).filter(e => e.prodMerged).map(e => e.prodNumber));
  const fc = fileFullyReflected(testPr);
  if (fc.match) {
    fileMatchAgree++;
    const link = bestOverlapProdPR(testPr);
    if (link && truthProdNumbers.has(link.prodNumber)) fileMatchLinkOk++;
  }
  const tm = bestTitleMatch(testPr);
  if (tm && tm.score >= TITLE_SIM_THRESHOLD) {
    titleMatchAgree++;
    if (truthProdNumbers.has(tm.prodNumber)) titleMatchLinkOk++;
  }
}
const validation = {
  groundTruthSize: groundTruth.length,
  fileMatch: {
    recallRate: groundTruth.length ? fileMatchAgree / groundTruth.length : null,
    linkPrecision: fileMatchAgree ? fileMatchLinkOk / fileMatchAgree : null,
  },
  titleMatch: {
    recallRate: groundTruth.length ? titleMatchAgree / groundTruth.length : null,
    linkPrecision: titleMatchAgree ? titleMatchLinkOk / titleMatchAgree : null,
  },
};

// ============================================================
// Weekly counts (ISO week, per repo) from ALL PRs (open+merged) by created_at
// ============================================================
function isoWeekKey(dateStr) {
  const d = new Date(dateStr);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
function weeklyCounts(prs) {
  const map = new Map();
  for (const pr of prs) {
    if (!pr.merged_at) continue;
    const key = isoWeekKey(pr.merged_at);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}
const testWeekly = weeklyCounts(allTestPRs);
const prodWeekly = weeklyCounts(allProdPRs);
const allWeeks = [...new Set([...testWeekly.keys(), ...prodWeekly.keys()])].sort();
const weeklySeries = allWeeks.map(week => ({ week, test: testWeekly.get(week) || 0, prod: prodWeekly.get(week) || 0 }));

// ============================================================
// Timeline (both repos, chronological, with a rough "type" tag)
// ============================================================
function guessType(title) {
  const t = (title || "").toLowerCase();
  if (/検証環境|検証repo|検証済み|を本番|を同期|同期します|同期する/.test(title || "")) return "sync";
  if (/^feat[:(]|^add |追加|新設|を追加/.test(t) || /追加|新設/.test(title || "")) return "feat";
  if (/^fix[:(]|修正|直す|バグ/.test(t) || /修正/.test(title || "")) return "fix";
  if (/^refactor[:(]|リファクタ|整理|統合/.test(t) || /整理|統合|統一/.test(title || "")) return "refactor";
  if (/^chore[:(]|キャッシュ|バスター|version/.test(t)) return "chore";
  if (/^docs[:(]|readme|ドキュメント|資料/i.test(t) || /資料|ドキュメント/.test(title || "")) return "docs";
  return "other";
}
const timeline = [
  ...allTestPRs.filter(p => p.merged_at).map(p => ({
    repo: "test", number: p.number, title: p.title, merged_at: p.merged_at, author: p.user, type: guessType(p.title),
  })),
  ...allProdPRs.filter(p => p.merged_at).map(p => ({
    repo: "prod", number: p.number, title: p.title, merged_at: p.merged_at, author: p.user, type: guessType(p.title),
  })),
].sort((a, b) => new Date(a.merged_at) - new Date(b.merged_at));

// ============================================================
// Summary
// ============================================================
const now = new Date();
const days = n => new Date(now.getTime() - n * 86400000).toISOString();
const mergedInWindow = (prs, n) => prs.filter(p => p.merged_at && p.merged_at >= days(n)).length;
const notReflected = classified.filter(c => c.status === "not-reflected");

const summary = {
  generatedAt: now.toISOString(),
  test: {
    total: allTestPRs.length,
    merged: testMerged.length,
    mergedLast7d: mergedInWindow(allTestPRs, 7),
    mergedLast30d: mergedInWindow(allTestPRs, 30),
  },
  prod: {
    total: allProdPRs.length,
    merged: prodMerged.length,
    mergedLast7d: mergedInWindow(allProdPRs, 7),
    mergedLast30d: mergedInWindow(allProdPRs, 30),
  },
  notReflectedCount: notReflected.length,
  outOfScopeCount: classified.filter(c => c.status === "out-of-scope").length,
  reflectedCount: classified.filter(c => c.status === "reflected").length,
};

const data = {
  meta: { repos: { test: TEST_SLUG, prod: PROD_SLUG }, generatedAt: now.toISOString(), validation },
  summary,
  status: classified,
  timeline,
  weekly: weeklySeries,
};

mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(data));
console.log(`wrote ${OUT_FILE}`);
console.log("summary:", JSON.stringify(summary, null, 2));
console.log("validation:", JSON.stringify(validation, null, 2));
