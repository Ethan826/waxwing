// A2 Task 13, M-B (spec §8's test-only collector): the mark graph the
// collector (test/r0-a2-mb-collector.mjs) builds, judged three ways.
// Plain JavaScript; it loads no compiled module.
//
// A graph is `{ edges: [[x, y]], equal: [[x, y]] }` over node names. A
// node `c:<term>` is a constant (`c:N`, `c:M`, `c:J:a,b`, the names
// sorted and non-empty); every other node is a flexible position.
// - Classes: union-find (Tarjan 1975) over `equal`.
// - `criterion`: FX008 step 5 (docs/plans/2026-10-10-abort-tracking-
//   design.md §3.5, "no path runs from atom a to atom b with a ≠ b,
//   where a is not N and b is not M"; reachability of constants by
//   propagation), with a class holding two different constants a clash
//   (statements §5's claim). A constant `J S` with two or more names
//   (an image term) is not one of FX008's atoms; for it the forbidden
//   pair is read as statements §5's `holds` fails, which on atoms is
//   exactly FX008's list (M→N, M→k, k→N, k→k′).
// - `everyValuation`: the pinned graph judged by brute force, each
//   constant evaluated in the two-point lattice N ⊑ M under every
//   valuation of the rigid marks (statements §5: `J S` the join of
//   v(S)); a valuation fails when a class holds both values or a class
//   holding M reaches one holding N.
// - `leastTerms`: statements §5's least term per class.
export const constant = term => `c:${termName(term)}`;
export const termName = term => Array.isArray(term)
  ? term.length === 0 ? 'N' : `J:${[...term].sort().join(',')}` : term;
const termOf = node => {
  const name = node.slice(2);
  return name.startsWith('J:') ? name.slice(2).split(',') : name;
};
const isConstant = node => node.startsWith('c:');

const classes = graph => {
  const parent = new Map();
  const find = node => {
    if (!parent.has(node)) parent.set(node, node);
    const up = parent.get(node);
    if (up === node) return node;
    const root = find(up);
    parent.set(node, root);
    return root;
  };
  graph.equal.forEach(([x, y]) => parent.set(find(x), find(y)));
  graph.edges.flat().forEach(find);
  return find;
};

// For each class root, the class roots it reaches (itself included).
const reach = (graph, find) => {
  const next = new Map();
  graph.edges.forEach(([x, y]) => {
    const from = find(x);
    next.set(from, [...(next.get(from) ?? []), find(y)]);
  });
  return root => {
    const seen = new Set([root]);
    const todo = [root];
    while (todo.length > 0)
      for (const item of next.get(todo.pop()) ?? [])
        if (!seen.has(item)) {
          seen.add(item);
          todo.push(item);
        }
    return seen;
  };
};

const constantsBy = (graph, find) => {
  const nodes = [...new Set([...graph.equal.flat(), ...graph.edges.flat()])];
  const by = new Map();
  nodes.filter(isConstant).forEach(node =>
    by.set(find(node), new Set([...(by.get(find(node)) ?? []), node])));
  return by;
};

// statements §5 `holds` on normal forms.
export const holds = (x, y) => x === 'N' || y === 'M'
  || (Array.isArray(x) && Array.isArray(y) && x.every(k => y.includes(k)));

export const criterion = graph => {
  const find = classes(graph);
  const by = constantsBy(graph, find);
  const reaches = reach(graph, find);
  for (const [root, held] of by) {
    if (held.size > 1) return { ok: false, why: `clash ${[...held]}` };
    const [a] = held;
    for (const other of reaches(root))
      for (const b of by.get(other) ?? [])
        if (!holds(termOf(a), termOf(b)))
          return { ok: false, why: `path ${a} to ${b}` };
  }
  return { ok: true };
};

const valued = (term, valuation) => term === 'N' || term === 'M' ? term
  : term.some(name => valuation[name] === 'M') ? 'M' : 'N';

const holdsUnder = (graph, valuation) => {
  const find = classes(graph);
  const reaches = reach(graph, find);
  const values = new Map();
  for (const [root, held] of constantsBy(graph, find))
    values.set(root, new Set([...held].map(node =>
      valued(termOf(node), valuation))));
  return [...values].every(([root, set]) => set.size === 1
    && (!set.has('M') || [...reaches(root)].every(other =>
      !(values.get(other)?.has('N')))));
};

// Every valuation of `rigidMarks` (2^n), none skipped.
export const everyValuation = (graph, rigidMarks) => {
  const count = 2 ** rigidMarks.length;
  const failing = [];
  for (let bits = 0; bits < count; bits += 1) {
    const valuation = Object.fromEntries(rigidMarks.map((name, index) =>
      [name, (bits >> index) & 1 ? 'M' : 'N']));
    if (!holdsUnder(graph, valuation)) failing.push(valuation);
  }
  return { n: rigidMarks.length, count, failing };
};

// Each position pinned to its term: `termAt(node)` names it.
export const pinned = (graph, positions, termAt) => ({ edges: graph.edges,
  equal: [...graph.equal, ...positions.map(node =>
    [node, constant(termAt(node))])] });

// statements §5 "FX008 ⇒ package": a constant class takes its constant;
// else M if M reaches it, else the join of the rigid constants reaching
// it, N if none. Only meaningful when `criterion` accepts.
export const leastTerms = (graph, positions) => {
  const find = classes(graph);
  const reaches = reach(graph, find);
  const by = constantsBy(graph, find);
  const into = new Map();
  for (const [root, held] of by)
    for (const other of reaches(root))
      into.set(other, [...(into.get(other) ?? []), ...held]);
  const least = node => {
    const own = by.get(find(node));
    if (own !== undefined) return termOf([...own][0]);
    const terms = (into.get(find(node)) ?? []).map(termOf);
    if (terms.includes('M')) return 'M';
    const names = [...new Set(terms.filter(Array.isArray).flat())];
    return names.length === 0 ? 'N' : names.sort();
  };
  return new Map(positions.map(node => [node, least(node)]));
};
