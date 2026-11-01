// The least-term implementation of least.mjs run against the bounded
// mark oracle's families (research/amin-mark-oracle/families.mjs), in
// the oracle's encoding: nodes 0..3 the atoms N, M, k:a, k:b; the rest
// flexible positions. Two checks: the families' three-way agreement
// with this implementation as the `least` verdict and `holdsTerm` as
// `holds`; and, on every graph the families build, this
// implementation's term for every node equal to the oracle's own
// `leastTerms` (oracle.mjs). A mutant that ignores equalities must be
// detected. Bounded evidence. Run: node least-oracle.mjs [--quick]
import { atoms, leastTerms as oracleTerms } from
  '../amin-mark-oracle/oracle.mjs';
import { oneFamily, pairsFamily, randomFamily, soundFamily, twoFamily }
  from '../amin-mark-oracle/families.mjs';
import { holdsTerm, leastTerms } from './least.mjs';

const RIGID = ['a', 'b'];
// An oracle term ('N', 'M', a bitmask, 0 the empty join) as ours.
const ours = term => (term === 'N' || term === 'M' ? term
  : RIGID.filter((_, i) => (term >> i) & 1));
const atomNode = i => {
  const atom = atoms[i];
  return typeof atom === 'string' ? atom : `k:${ours(atom)[0]}`;
};
const node = i => (i < atoms.length ? atomNode(i) : `p:${i}`);
const graphOf = (size, edges, equalities) => {
  const constants = new Map();
  atoms.forEach((atom, i) => constants.set(atomNode(i),
    typeof atom === 'string' ? atom : { rigid: ours(atom)[0] }));
  return { constants, equalities: equalities.map(([a, b]) =>
    [node(a), node(b)]), edges: edges.map(([a, b]) => [node(a), node(b)]) };
};
const same = (one, other) => JSON.stringify(one) === JSON.stringify(other);

const termCheck = { graphs: 0, nodes: 0, differ: 0, clashDiffer: 0 };
const verdictWith = (made, compare) => (size, edges, equalities) => {
  const graph = graphOf(size, edges, equalities);
  const found = made(graph);
  if (compare) {
    const oracle = oracleTerms(size, edges, equalities);
    termCheck.graphs += 1;
    if ((oracle === null) !== found.clash) termCheck.clashDiffer += 1;
    if (oracle !== null && !found.clash)
      for (let i = 0; i < size; i += 1) {
        termCheck.nodes += 1;
        if (!same(found.term(node(i)), ours(oracle.term(oracle.find(i)))))
          termCheck.differ += 1;
      }
  }
  return !found.clash && graph.edges.every(([l, h]) =>
    holdsTerm(found.term(l), found.term(h)));
};
const holds = (x, y) => holdsTerm(ours(x), ours(y));
const real = verdictWith(leastTerms, true);
const quick = process.argv.includes('--quick');
const families = [pairsFamily(holds), oneFamily(real),
  ...(quick ? [] : [twoFamily(real)]), randomFamily(real, quick ? 20000
    : 200000), ...(quick ? [] : [soundFamily(holds)])];
let failures = 0;
for (const result of families) {
  console.log(`${result.name}: ${JSON.stringify(result.counts)}, `
    + `${result.found.length} disagreements`);
  failures += result.found.length;
}
console.log(`terms against oracle.mjs leastTerms: ${JSON.stringify(
  termCheck)}`);
failures += termCheck.differ + termCheck.clashDiffer;
const ignoring = graph => leastTerms({ ...graph, equalities: [] });
const mutant = oneFamily(verdictWith(ignoring, false));
console.log(`mutant (equalities ignored) on 'one': `
  + `${mutant.found.length} disagreements (must be > 0)`);
if (mutant.found.length === 0) failures += 1;
console.log(failures === 0 ? 'no disagreement' : `${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
