// Tranche 2 Task 9 (statements §5; design §F): the PureScript least
// terms (ReadBack/Least.purs) run against U1's bounded mark oracle
// (research/amin-mark-oracle/), shared by
// test/r0-t2-marks-oracle.test.mjs (a seeded subset),
// research/t2-read-back-design/marks-oracle.mjs (every family, once, as
// evidence) and the restored-defect probes. Bounded evidence: agreement
// with the definition on the oracle's graphs, nothing beyond them.
//
// An oracle graph (nodes 0..3 the atoms N, M, k:a, k:b; the rest
// flexible positions) becomes a mark store as UnifyMark `equateMarks`
// would make it: each equality's sides resolved to the ends of their
// chains, an end meta bound to the other end, two different constant
// ends refused. A refused graph (a class holding two constants) has no
// store, so the least terms never see it: its verdict is false here, by
// the encoder, as the oracle's (disclosed: that case is not the
// PureScript's).
import { atoms, leastTerms as oracleTerms } from
  '../research/amin-mark-oracle/oracle.mjs';
import { oneFamily, pairsFamily, randomFamily, soundFamily, twoFamily }
  from '../research/amin-mark-oracle/families.mjs';
import { marksCases } from './r0-t2-marks-cases.mjs';

const RIGID = ['a', 'b'];
const A = atoms.length;

export const oracleCases = async load => {
  const cases = await marksCases(load);
  const { store, mark, Marks, Term, termText } = cases;
  const P = await load('Domain.Verdict.EffectPackage.Types');
  const { foldableArray } = await load('Data.Foldable');
  const { ordString } = await load('Data.Ord');
  const markOf = i => (i === 0 ? mark.N : i === 1 ? mark.M
    : i < A ? mark.rigid(RIGID[i - 2]) : mark.meta(i));
  // An oracle term ('N', 'M', a bitmask; 0 the empty join) as text.
  const oracleText = term => {
    if (term === 'N' || term === 'M') return term;
    const names = RIGID.filter((_, i) => (term >> i) & 1);
    return names.length === 0 ? 'N' : `J{${names.join(',')}}`;
  };
  const storeOf = (edges, equalities) => {
    const bound = new Map();
    const end = node => (bound.has(node) ? end(bound.get(node)) : node);
    for (const [one, other] of equalities) {
      const [x, y] = [end(one), end(other)];
      if (x === y) continue;
      if (x >= A) bound.set(x, y);
      else if (y >= A) bound.set(y, x);
      else return null;
    }
    return store([...bound].map(([meta, to]) => [meta, markOf(to)]),
      edges.map(([low, high]) => [markOf(low), markOf(high)]));
  };
  const asTerm = term => {
    if (term === 'N' || term === 0) return P.TermN.value;
    if (term === 'M') return P.TermM.value;
    return new P.TermJ(cases.Sets.fromFoldable(foldableArray)(ordString)(
      RIGID.filter((_, i) => (term >> i) & 1)));
  };
  const counts = { graphs: 0, nodes: 0, differ: 0, clashDiffer: 0 };
  // The least-term verdict on the PureScript, and its terms checked
  // node by node against the oracle's own least terms. `withEqualities`
  // false is least-oracle.mjs's mutant: equalities ignored.
  const verdict = (withEqualities = true) => (size, edges, equalities) => {
    const given = storeOf(edges, withEqualities ? equalities : []);
    const oracle = oracleTerms(size, edges, equalities);
    counts.graphs += 1;
    if ((oracle === null) !== (given === null)) counts.clashDiffer += 1;
    if (given === null) return false;
    const terms = Marks.leastTerms(given);
    if (oracle !== null) for (let i = 0; i < size; i += 1) {
      counts.nodes += 1;
      if (termText(Marks.termOf(terms)(markOf(i)))
        !== oracleText(oracle.term(oracle.find(i)))) counts.differ += 1;
    }
    return cases.edgesHold(given);
  };
  const holds = (x, y) => Term.holds(asTerm(x))(asTerm(y));
  return { verdict, holds, counts, storeOf,
    families: { oneFamily, pairsFamily, randomFamily, soundFamily,
      twoFamily } };
};
