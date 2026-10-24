// Runs U1's bounded oracle (oracle.mjs) and prints one line per family
// with its counts; any disagreement prints the graph and exits 1.
//   one    one flexible position: every subset of the 20 directed edges
//          among it and the four atoms (atom-to-atom edges included, as
//          written signatures can give), times no equality or an
//          equality with each atom;
//   two    two flexible positions: every subset of the 18 edges that
//          touch them, times each single equality (between them, or
//          either with an atom);
//   random three and four positions, random edges (atom-to-atom
//          included) and up to two equalities, seeded;
//   sound  random term assignments on random graphs: passing `holds`
//          everywhere implies `sem`.
import { atoms, holds, leastVerdict, pathVerdict, semVerdict }
  from './oracle.mjs';

const A = atoms.length;
let failures = 0;
const check = (family, size, edges, equalities) => {
  const p = pathVerdict(size, edges, equalities);
  const s = semVerdict(size, edges, equalities);
  const l = leastVerdict(size, edges, equalities);
  if (p !== s || s !== l) {
    failures += 1;
    if (failures <= 5) console.log(family, JSON.stringify(
      { size, edges, equalities, path: p, sem: s, least: l }));
  }
  return s;
};
const pairs = nodes => nodes.flatMap(a => nodes.filter(b => b !== a)
  .map(b => [a, b]));
const subsets = function* (items) {
  for (let mask = 0; mask < 1 << items.length; mask += 1)
    yield items.filter((_, i) => (mask >> i) & 1);
};
const family = (name, size, candidates, equalityOptions) => {
  let graphs = 0, accepted = 0;
  for (const edges of subsets(candidates))
    for (const equalities of equalityOptions) {
      graphs += 1;
      if (check(name, size, edges, equalities)) accepted += 1;
    }
  console.log(`${name}: ${graphs} graphs, ${accepted} accepted`);
};
const nodes = size => Array.from({ length: size }, (_, i) => i);
const atomIds = nodes(A);

family('one', A + 1, pairs(nodes(A + 1)),
  [[], ...atomIds.map(a => [[A, a]])]);
family('two', A + 2, pairs(nodes(A + 2)).filter(([a, b]) => a >= A
  || b >= A), [[], [[A, A + 1]], ...atomIds.flatMap(a =>
  [[[A, a]], [[A + 1, a]]])]);

// A small seeded generator (mulberry32).
let seed = 20261024;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = items => items[Math.floor(random() * items.length)];
const randomGraph = () => {
  const size = A + 3 + Math.floor(random() * 2);
  const all = pairs(nodes(size));
  const edges = all.filter(() => random() < 0.18);
  const equalities = Array.from({ length: Math.floor(random() * 3) },
    () => pick(all));
  return { size, edges, equalities };
};
let sampled = 0, sampledAccepted = 0;
for (let i = 0; i < 200000; i += 1) {
  const g = randomGraph();
  sampled += 1;
  if (check('random', g.size, g.edges, g.equalities)) sampledAccepted += 1;
}
console.log(`random: ${sampled} graphs, ${sampledAccepted} accepted`);

// Soundness of `holds`: a term per node (atoms keep their own), no
// equalities, every edge holding implies `sem`.
const terms = ['N', 'M', 1, 2, 3];
let soundTried = 0, soundPassing = 0;
for (let i = 0; i < 200000; i += 1) {
  const g = randomGraph();
  const term = nodes(g.size).map(n => (n < A ? atoms[n] : pick(terms)));
  soundTried += 1;
  if (!g.edges.every(([l, h]) => holds(term[l], term[h]))) continue;
  soundPassing += 1;
  if (!semVerdict(g.size, g.edges, [])) {
    failures += 1;
    console.log('sound', JSON.stringify({ g, term }));
  }
}
console.log(`sound: ${soundTried} assignments, ${soundPassing} passing`);
console.log(`normalization: holds(J∅, N) = ${holds(0, 'N')}`);
console.log(failures === 0 ? 'no disagreement' : `${failures} disagreements`);
process.exit(failures === 0 ? 0 : 1);
