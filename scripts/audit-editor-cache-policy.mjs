import {
  collectEditorGraph,
  groupVersions,
  loadEditorCachePolicy
} from "./editor-cache-audit-lib.mjs";

const { entries, enforcement } = await loadEditorCachePolicy();
const graphs = new Map();
for (const entry of entries) graphs.set(entry, await collectEditorGraph([entry]));
const combined = await collectEditorGraph(entries);

const hardProblems = [];
const findings = [];

for (const missing of combined.missing) hardProblems.push(`missing local dependency: ${missing}`);
for (const edge of combined.edges) {
  if (edge.versionCount > 1) hardProblems.push(`${edge.from}: duplicate v= parameters in ${edge.raw}`);
  if (edge.versionCount === 1 && edge.version === "") hardProblems.push(`${edge.from}: empty v= parameter in ${edge.raw}`);
}

const grouped = groupVersions(combined.edges);
let mixedVersioning = 0;
let versionMismatch = 0;
for (const [target, edges] of grouped) {
  const values = new Set(edges.map(edge => edge.version === null ? "<none>" : edge.version));
  const concrete = new Set(edges.filter(edge => edge.version !== null).map(edge => edge.version));
  if (values.has("<none>") && concrete.size) {
    mixedVersioning += 1;
    findings.push({ kind: "mixedVersioning", target, values: [...values] });
  }
  if (concrete.size > 1) {
    versionMismatch += 1;
    findings.push({ kind: "versionMismatch", target, values: [...concrete] });
  }
}

function describeEdges(edges) {
  return edges
    .map(edge => `${edge.from} -> ${edge.raw}`)
    .sort();
}

let sharedTargets = 0;
let pcMobileSharedMismatch = 0;
if (entries.length >= 2) {
  const [pcEntry, mobileEntry] = entries;
  const pcGrouped = groupVersions(graphs.get(pcEntry).edges);
  const mobileGrouped = groupVersions(graphs.get(mobileEntry).edges);
  for (const [target, pcEdges] of pcGrouped) {
    const mobileEdges = mobileGrouped.get(target);
    if (!mobileEdges) continue;
    sharedTargets += 1;
    const pcVersions = new Set(pcEdges.map(edge => edge.version === null ? "<none>" : edge.version));
    const mobileVersions = new Set(mobileEdges.map(edge => edge.version === null ? "<none>" : edge.version));
    const pcKey = [...pcVersions].sort().join(",");
    const mobileKey = [...mobileVersions].sort().join(",");
    if (pcKey !== mobileKey) {
      pcMobileSharedMismatch += 1;
      findings.push({
        kind: "pcMobileSharedMismatch",
        target,
        values: [`PC:${pcKey}`, `mobile:${mobileKey}`],
        details: [
          ...describeEdges(pcEdges).map(value => `PC ${value}`),
          ...describeEdges(mobileEdges).map(value => `mobile ${value}`)
        ]
      });
    }
  }
}

for (const finding of findings) {
  const mode = enforcement[finding.kind] || "report";
  const message = `${finding.kind}: ${finding.target} -> ${finding.values.join(" / ")}`;
  const detailLines = Array.isArray(finding.details)
    ? finding.details.map(detail => `    ${detail}`)
    : [];
  if (mode === "error") {
    hardProblems.push([message, ...detailLines].join("\n"));
  } else {
    console.warn(`[cache-policy:${mode}] ${message}`);
    for (const detail of detailLines) console.warn(detail);
  }
}

if (hardProblems.length) {
  console.error("Editor cache policy audit failed:\n" + hardProblems.map(problem => `- ${problem}`).join("\n"));
  process.exit(1);
}

console.log(
  `Editor cache policy audit passed: ${combined.files.size} reachable files, ${combined.edges.length} local references, ` +
  `${sharedTargets} PC/mobile shared targets. Legacy findings: ${mixedVersioning} mixed versioning, ` +
  `${versionMismatch} target version mismatches, ${pcMobileSharedMismatch} PC/mobile shared mismatches.`
);
