import { diffCanonicalBundles } from "./character-sheet-jsonp-canonical.js?v=2";

const MATCHED_CATEGORIES = ["general", "social", "connection", "styleSkills", "outfits"];
const MAX_EXACT_ASSIGNMENT_SIZE = 14;

function stableSignature(value) {
  if (Array.isArray(value)) return `[${value.map(stableSignature).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort((a, b) => a.localeCompare(b, "ja")).map((key) => `${JSON.stringify(key)}:${stableSignature(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function baseIdentity(key) {
  return String(key || "").replace(/ #\d+$/, "");
}

function groupCanonicalRows(rows = {}) {
  const groups = new Map();
  for (const [key, row] of Object.entries(rows || {})) {
    const identity = baseIdentity(key);
    if (!groups.has(identity)) groups.set(identity, []);
    groups.get(identity).push({ key, row, signature: stableSignature(row) });
  }
  for (const values of groups.values()) {
    values.sort((a, b) => a.signature.localeCompare(b.signature, "ja") || a.key.localeCompare(b.key, "ja"));
  }
  return groups;
}

function rowDifferenceCost(category, left, right) {
  return diffCanonicalBundles(
    { [category]: { item: left } },
    { [category]: { item: right } }
  ).length;
}

function consumeExactPairs(leftRows, rightRows) {
  const remainingRight = rightRows.slice();
  const remainingLeft = [];
  const pairs = [];

  for (const left of leftRows) {
    const index = remainingRight.findIndex((right) => right.signature === left.signature);
    if (index < 0) {
      remainingLeft.push(left);
      continue;
    }
    pairs.push([left, remainingRight[index]]);
    remainingRight.splice(index, 1);
  }

  return { pairs, remainingLeft, remainingRight };
}

function greedyMinimumPairs(leftRows, rightRows, category) {
  const left = leftRows.slice();
  const right = rightRows.slice();
  const pairs = [];

  while (left.length && right.length) {
    let best = null;
    for (let li = 0; li < left.length; li += 1) {
      for (let ri = 0; ri < right.length; ri += 1) {
        const cost = rowDifferenceCost(category, left[li].row, right[ri].row);
        const tie = `${cost}:${left[li].signature}:${right[ri].signature}:${li}:${ri}`;
        if (!best || cost < best.cost || (cost === best.cost && tie < best.tie)) {
          best = { li, ri, cost, tie };
        }
      }
    }
    pairs.push([left[best.li], right[best.ri]]);
    left.splice(best.li, 1);
    right.splice(best.ri, 1);
  }

  return { pairs, remainingLeft: left, remainingRight: right };
}

function minimumCostPairs(leftRows, rightRows, category) {
  if (!leftRows.length || !rightRows.length) {
    return { pairs: [], remainingLeft: leftRows.slice(), remainingRight: rightRows.slice() };
  }

  const swap = leftRows.length > rightRows.length;
  const small = (swap ? rightRows : leftRows).slice();
  const large = (swap ? leftRows : rightRows).slice();

  if (large.length > MAX_EXACT_ASSIGNMENT_SIZE) {
    return greedyMinimumPairs(leftRows, rightRows, category);
  }

  const memo = new Map();
  const solve = (index, usedMask) => {
    if (index >= small.length) return { cost: 0, indices: [] };
    const memoKey = `${index}:${usedMask}`;
    if (memo.has(memoKey)) return memo.get(memoKey);

    let best = null;
    for (let largeIndex = 0; largeIndex < large.length; largeIndex += 1) {
      const bit = 1 << largeIndex;
      if (usedMask & bit) continue;
      const left = swap ? large[largeIndex] : small[index];
      const right = swap ? small[index] : large[largeIndex];
      const tail = solve(index + 1, usedMask | bit);
      const candidate = {
        cost: rowDifferenceCost(category, left.row, right.row) + tail.cost,
        indices: [largeIndex, ...tail.indices]
      };
      const candidateTie = candidate.indices.map((value) => String(value).padStart(3, "0")).join(":");
      const bestTie = best?.indices.map((value) => String(value).padStart(3, "0")).join(":") || "";
      if (!best || candidate.cost < best.cost || (candidate.cost === best.cost && candidateTie < bestTie)) best = candidate;
    }

    memo.set(memoKey, best);
    return best;
  };

  const solution = solve(0, 0);
  const usedLarge = new Set(solution.indices);
  const pairs = small.map((smallRow, index) => {
    const largeRow = large[solution.indices[index]];
    return swap ? [largeRow, smallRow] : [smallRow, largeRow];
  });

  return {
    pairs,
    remainingLeft: swap ? large.filter((_, index) => !usedLarge.has(index)) : [],
    remainingRight: swap ? [] : large.filter((_, index) => !usedLarge.has(index))
  };
}

function pairSortKey([left, right]) {
  return `${left?.signature || ""}\u0000${right?.signature || ""}`;
}

function alignCategory(leftRows = {}, rightRows = {}, category) {
  const leftGroups = groupCanonicalRows(leftRows);
  const rightGroups = groupCanonicalRows(rightRows);
  const identities = [...new Set([...leftGroups.keys(), ...rightGroups.keys()])].sort((a, b) => a.localeCompare(b, "ja"));
  const alignedLeft = {};
  const alignedRight = {};

  for (const identity of identities) {
    const left = leftGroups.get(identity) || [];
    const right = rightGroups.get(identity) || [];
    const exact = consumeExactPairs(left, right);
    const approximate = minimumCostPairs(exact.remainingLeft, exact.remainingRight, category);
    const pairs = [...exact.pairs, ...approximate.pairs].sort((a, b) => pairSortKey(a).localeCompare(pairSortKey(b), "ja"));
    const extrasLeft = approximate.remainingLeft.slice().sort((a, b) => a.signature.localeCompare(b.signature, "ja"));
    const extrasRight = approximate.remainingRight.slice().sort((a, b) => a.signature.localeCompare(b.signature, "ja"));
    let index = 0;
    const nextKey = () => {
      index += 1;
      return index === 1 ? identity : `${identity} #${index}`;
    };

    for (const [leftEntry, rightEntry] of pairs) {
      const key = nextKey();
      alignedLeft[key] = leftEntry.row;
      alignedRight[key] = rightEntry.row;
    }
    for (const entry of extrasLeft) alignedLeft[nextKey()] = entry.row;
    for (const entry of extrasRight) alignedRight[nextKey()] = entry.row;
  }

  return [alignedLeft, alignedRight];
}

export function stripLegacyArchiveOutfitElectronicControl(bundle = {}) {
  if (!Array.isArray(bundle?.outfits)) return { ...bundle };
  return {
    ...bundle,
    outfits: bundle.outfits.map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      const currentRow = { ...row };
      delete currentRow.electronic_control;
      return currentRow;
    })
  };
}

export function alignCanonicalBundlesForComparison(left = {}, right = {}) {
  const alignedLeft = { ...left };
  const alignedRight = { ...right };
  for (const category of MATCHED_CATEGORIES) {
    const [leftRows, rightRows] = alignCategory(left?.[category] || {}, right?.[category] || {}, category);
    alignedLeft[category] = leftRows;
    alignedRight[category] = rightRows;
  }
  return [alignedLeft, alignedRight];
}
