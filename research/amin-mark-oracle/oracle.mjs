// U1's bounded oracle (docs/plans/r0-amin-statements.md §5, U1): on
// mark-constraint graphs of FX008's shape, three verdicts must agree:
//   path  FX008 step 5 (design §3.5): equalities merge nodes into classes
//         (two different constants in one class clash); then no path
//         from atom a to atom b with a ≠ b, a not N, b not M;
//   sem   the meaning: for every valuation of the rigid marks, some
//         two-point assignment of the classes satisfies every edge;
//   least the least term per class (a constant class keeps its term;
//         else M if M reaches it, else the join of the rigid marks that
//         reach it), every edge then checked by `holds` on normal forms.
// And soundness of `holds` itself: any term assignment passing `holds`
// on every edge makes `sem` true. Exhaustive for one and two flexible
// positions, sampled (seeded) for three and four. Bounded evidence: it
// cannot establish the claim for all graphs. Run: node oracle.mjs
const RIGID = 2;
// Terms: 'N', 'M', or a non-empty bitmask of rigid marks; `norm` maps
// the empty join to N.
const norm = term => (term === 0 ? 'N' : term);
const holds = (low, high) => {
  const [x, y] = [norm(low), norm(high)];
  return x === 'N' || y === 'M' || (x !== 'M' && y !== 'N'
    && (x & ~y) === 0);
};
// Atoms: N, M, and one per rigid mark.
const atoms = ['N', 'M', ...Array.from({ length: RIGID }, (_, i) => 1 << i)];
const atomCount = atoms.length;

const classesOf = (size, equalities) => {
  const parent = Array.from({ length: size }, (_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const [a, b] of equalities) parent[find(a)] = find(b);
  return find;
};
// Node i < atomCount is atom i; the rest are flexible positions.
const constantOf = (find, size) => {
  const fixed = new Map();
  for (let i = 0; i < atomCount; i += 1) {
    const c = find(i);
    if (fixed.has(c) && fixed.get(c) !== atoms[i]) return null;
    fixed.set(c, atoms[i]);
  }
  return fixed;
};
const reaching = (find, size, edges) => {
  const reach = new Map();
  for (let i = 0; i < size; i += 1) reach.set(find(i), new Set());
  for (let i = 0; i < atomCount; i += 1) reach.get(find(i)).add(i);
  for (let changed = true; changed;) {
    changed = false;
    for (const [low, high] of edges)
      for (const a of reach.get(find(low)))
        if (!reach.get(find(high)).has(a)) {
          reach.get(find(high)).add(a);
          changed = true;
        }
  }
  return reach;
};
const pathVerdict = (size, edges, equalities) => {
  const find = classesOf(size, equalities);
  const fixed = constantOf(find, size);
  if (fixed === null) return false;
  const reach = reaching(find, size, edges);
  for (let b = 0; b < atomCount; b += 1)
    for (const a of reach.get(find(b)))
      if (a !== b && atoms[a] !== 'N' && atoms[b] !== 'M'
        && find(a) !== find(b)) return false;
  return true;
};
const valueOf = (term, valuation) => (term === 'N' ? 0 : term === 'M' ? 1
  : (term & valuation) !== 0 ? 1 : 0);
const semVerdict = (size, edges, equalities) => {
  const find = classesOf(size, equalities);
  const fixed = constantOf(find, size);
  if (fixed === null) return false;
  const free = [...new Set(Array.from({ length: size }, (_, i) => find(i)))]
    .filter(c => !fixed.has(c));
  for (let valuation = 0; valuation < 1 << RIGID; valuation += 1) {
    let some = false;
    for (let pick = 0; pick < 1 << free.length && !some; pick += 1) {
      const val = c => (fixed.has(c) ? valueOf(fixed.get(c), valuation)
        : (pick >> free.indexOf(c)) & 1);
      some = edges.every(([l, h]) => val(find(l)) <= val(find(h)));
    }
    if (!some) return false;
  }
  return true;
};
const leastTerms = (size, edges, equalities) => {
  const find = classesOf(size, equalities);
  const fixed = constantOf(find, size);
  if (fixed === null) return null;
  const reach = reaching(find, size, edges);
  const term = c => {
    if (fixed.has(c)) return fixed.get(c);
    const from = [...reach.get(c)].map(a => atoms[a]);
    if (from.includes('M')) return 'M';
    return norm(from.filter(t => t !== 'N').reduce((j, t) => j | t, 0));
  };
  return { find, term };
};
// The least-term verdict over an injected construction and `holds`, so
// mutants.mjs can run the same families against wrong ones.
const leastVerdictWith = (termsOf, check) => (size, edges, equalities) => {
  const made = termsOf(size, edges, equalities);
  return made !== null && edges.every(([l, h]) =>
    check(made.term(made.find(l)), made.term(made.find(h))));
};
const leastVerdict = leastVerdictWith(leastTerms, holds);
export { holds, norm, pathVerdict, semVerdict, leastVerdict,
  leastVerdictWith, leastTerms, classesOf, constantOf, reaching, atoms,
  valueOf };
