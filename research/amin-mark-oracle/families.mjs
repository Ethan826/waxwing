// The graph families of U1's oracle, each run against an injected
// least-term verdict and `holds` (run.mjs: the real ones; mutants.mjs:
// wrong ones). Each family returns its counts and its disagreements.
import { atoms, classesOf, constantOf, pathVerdict, semVerdict, valueOf }
  from './oracle.mjs';

const A = atoms.length;
const RIGID_VALUATIONS = 4;
const TERMS = ['N', 'M', 1, 2, 3];
const nodes = size => Array.from({ length: size }, (_, i) => i);
const pairs = list => list.flatMap(a => list.filter(b => b !== a)
  .map(b => [a, b]));
const subsets = function* (items) {
  for (let mask = 0; mask < 1 << items.length; mask += 1)
    yield items.filter((_, i) => (mask >> i) & 1);
};

// Three verdicts must agree on each graph.
const agreeing = least => (size, edges, equalities, found) => {
  const p = pathVerdict(size, edges, equalities);
  const s = semVerdict(size, edges, equalities);
  const l = least(size, edges, equalities);
  if (p !== s || s !== l) found.push({ size, edges, equalities, p, s, l });
  return s;
};

// All 36 ordered pairs of the six spellings over two rigid marks (J ∅
// included): `holds` against the meaning over all four valuations.
export const pairsFamily = check => {
  const spellings = ['N', 'M', 0, 1, 2, 3];
  const meaning = t => (t === 0 ? 'N' : t);
  const found = [];
  for (const x of spellings) for (const y of spellings) {
    const sem = [...Array(RIGID_VALUATIONS).keys()].every(v =>
      valueOf(meaning(x), v) <= valueOf(meaning(y), v));
    if (check(x, y) !== sem) found.push({ x, y, sem });
  }
  return { name: 'pairs36', counts: { pairs: 36 }, found };
};

const exhaustive = (name, size, candidates, equalityOptions, least) => {
  const found = [];
  const check = agreeing(least);
  let graphs = 0, accepted = 0;
  for (const edges of subsets(candidates))
    for (const equalities of equalityOptions) {
      graphs += 1;
      if (check(size, edges, equalities, found)) accepted += 1;
    }
  return { name, counts: { graphs, accepted }, found };
};

export const oneFamily = least => exhaustive('one', A + 1,
  pairs(nodes(A + 1)), [[], ...nodes(A).map(a => [[A, a]])], least);

// Two positions: every edge touching them, and none, one or two of the
// nine single equalities (between them, or either with an atom).
const singles = [[A, A + 1], ...nodes(A).flatMap(a => [[A, a], [A + 1, a]])];
const upToTwo = [[], ...singles.map(e => [e]),
  ...singles.flatMap((e, i) => singles.slice(i + 1).map(f => [e, f]))];
export const twoFamily = least => exhaustive('two', A + 2,
  pairs(nodes(A + 2)).filter(([a, b]) => a >= A || b >= A), upToTwo,
  least);

// A seeded generator (mulberry32).
const seeded = start => {
  let seed = start;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const randomGraph = random => {
  const size = A + 3 + Math.floor(random() * 2);
  const all = pairs(nodes(size));
  const pick = () => all[Math.floor(random() * all.length)];
  return { size, edges: all.filter(() => random() < 0.18),
    equalities: Array.from({ length: Math.floor(random() * 5) }, pick) };
};
export const randomFamily = (least, count = 200000) => {
  const random = seeded(20261024);
  const check = agreeing(least);
  const found = [];
  let accepted = 0;
  for (let i = 0; i < count; i += 1) {
    const g = randomGraph(random);
    if (check(g.size, g.edges, g.equalities, found)) accepted += 1;
  }
  return { name: 'random', counts: { graphs: count, accepted }, found };
};

// Every term assignment to the free classes of a graph (a class holding
// an atom keeps its term): how many pass `holds` on every edge.
const assignments = (size, edges, equalities, check) => {
  const find = classesOf(size, equalities);
  const fixed = constantOf(find, size);
  if (fixed === null) return { tried: 0, passing: 0 };
  const free = [...new Set(nodes(size).map(find))].filter(c => !fixed.has(c));
  let tried = 0, passing = 0;
  for (let code = 0; code < TERMS.length ** free.length; code += 1) {
    const term = c => (fixed.has(c) ? fixed.get(c)
      : TERMS[Math.floor(code / TERMS.length ** free.indexOf(c))
        % TERMS.length]);
    tried += 1;
    if (edges.every(([l, h]) => check(term(find(l)), term(find(h)))))
      passing += 1;
  }
  return { tried, passing };
};
// Soundness of `holds`, exhaustively on the two-position family with up
// to one equality: on a graph whose meaning fails, no assignment may pass;
// on one whose meaning holds, the passing ones are counted.
export const soundFamily = check => {
  const found = [];
  const counts = { refusedGraphs: 0, refusedTried: 0, refusedPassing: 0,
    acceptedGraphs: 0, acceptedTried: 0, acceptedPassing: 0 };
  const candidates = pairs(nodes(A + 2)).filter(([a, b]) => a >= A
    || b >= A);
  for (const edges of subsets(candidates))
    for (const equalities of upToTwo.filter(e => e.length <= 1)) {
      const sem = semVerdict(A + 2, edges, equalities);
      const { tried, passing } = assignments(A + 2, edges, equalities,
        check);
      const side = sem ? 'accepted' : 'refused';
      counts[`${side}Graphs`] += 1;
      counts[`${side}Tried`] += tried;
      counts[`${side}Passing`] += passing;
      if (!sem && passing > 0) found.push({ edges, equalities, passing });
    }
  return { name: 'sound', counts, found };
};
