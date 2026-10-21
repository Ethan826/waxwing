// Counting helpers shared by metrics.mjs (stream 7b) and variants.mjs
// (stream 9): sums of powers of two, consistent patterns per label, and
// connected components.

// log2 of a sum of powers of two given by their exponents.
export const log2Sum = exponents => {
  if (exponents.length === 0) return null;
  const top = Math.max(...exponents);
  return top + Math.log2(exponents.reduce((sum, e) => sum + 2 ** (e - top), 0));
};

// For one label: how many subsets of the rigid rows `rows` hold it
// consistently with D (no row lacking it, no two declared-disjoint rows).
export const consistentCount = (rows, label, lacks, disjoint) => {
  const allowed = rows.filter(row => !lacks.get(row)?.has(label));
  if (allowed.length > 20) return 2 ** allowed.length;
  let count = 0;
  for (let mask = 0; mask < 2 ** allowed.length; mask++) {
    const chosen = allowed.filter((_, index) => mask & (1 << index));
    const clash = chosen.some(one => chosen.some(other =>
      one < other && disjoint.has(`${one}|${other}`)));
    if (!clash) count++;
  }
  return count;
};

export class Components {
  constructor() { this.parent = new Map(); }
  find(node) {
    if (!this.parent.has(node)) this.parent.set(node, node);
    const up = this.parent.get(node);
    if (up === node) return node;
    const top = this.find(up);
    this.parent.set(node, top);
    return top;
  }
  join(nodes) {
    const [first, ...rest] = nodes;
    for (const node of rest) this.parent.set(this.find(node), this.find(first));
  }
}
