import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { randomFamily } from '../research/amin-mark-oracle/families.mjs';
import { atoms } from '../research/amin-mark-oracle/oracle.mjs';

// R036 (1), T5 (dossier §18.161 (3)): the two invariant-based loops of
// ReadBack/Least.purs, `find` (parent links form a forest: union-find,
// Galler and Fischer 1964) and `reaching` (Kleene iteration of a
// monotone map on a finite lattice), as JS copies with a step budget:
// `find` at most one step per node, `reaching` at most
// roots × (constants + 1) + 1 passes: the lattice is a map from roots
// to constant sets in which an absent root is below the empty set (a
// pass can add a root's entry empty, as `insertWith` does), so its
// height is roots × (constants + 1). The proposal's roots × constants
// + 1 missed the entry step: a graph with an edge and no constant took
// two passes against a budget of one. Running out of fuel fails the
// test, never hangs it. The copies test the copies, so each graph's
// copy result is checked against production's `leastOfGraph` (terms
// and clash count) where both end:
// the agreement connects the fuelled loops to the shipped ones. Over
// 20,000 seeded graphs of the mark oracle's random family
// (research/amin-mark-oracle/families.mjs; as test/r0-t2-marks-oracle.
// test.mjs runs it), long meta chains and planted clashes. Evidence on
// those graphs, not a proof.
const Least = await load('Features.Check.Strategy.ReadBack.Least');
const Row = await load('Domain.Row');
const { Tuple } = await load('Data.Tuple');
const Maps = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const Sets = await load('Data.Set');

const A = atoms.length;
const RIGID = ['a', 'b'];
const markOf = i => (i === 0 ? Row.NoFail.value : i === 1 ? Row.Plain.value
  : i < A ? new Row.MarkVariable(RIGID[i - 2]) : new Row.MarkMeta(i));
const isConstant = node => node < A;

class OutOfFuel extends Error {}

// The fuelled copy of Least.purs over oracle nodes: classes by union
// (a constant root stays the root; two constant roots clash), `find`
// with a budget of `size` steps, `reaching` with
// roots × (constants + 1) + 1.
const copied = (size, edges, equalities) => {
  const parent = new Map();
  const find = node => {
    let at = node;
    for (let fuel = size; parent.has(at); fuel -= 1) {
      if (fuel <= 0) throw new OutOfFuel(`find ${node}`);
      at = parent.get(at);
    }
    return at;
  };
  let clashes = 0;
  for (const [one, other] of equalities) {
    const [left, right] = [find(one), find(other)];
    if (left === right) continue;
    if (isConstant(left) && isConstant(right)) clashes += 1;
    else if (isConstant(left)) parent.set(right, left);
    else parent.set(left, right);
  }
  const used = [...new Set([...equalities.flat(), ...edges.flat()])];
  const constants = used.filter(isConstant);
  const roots = new Set(used.map(find));
  let reach = new Map();
  for (const constant of constants) reach.set(find(constant),
    new Set([...(reach.get(find(constant)) ?? []), constant]));
  const text = map => JSON.stringify([...map].sort().map(([key, set]) =>
    [key, [...set].sort()]));
  const budget = roots.size * (constants.length + 1) + 1;
  for (let pass = budget; ; pass -= 1) {
    if (pass <= 0) throw new OutOfFuel('reaching');
    const next = new Map([...reach].map(([key, set]) => [key, new Set(set)]));
    for (const [lower, upper] of edges) next.set(find(upper), new Set([
      ...(next.get(find(upper)) ?? []), ...(next.get(find(lower)) ?? [])]));
    if (text(next) === text(reach)) break;
    reach = next;
  }
  const termOf = root => {
    if (root === 0) return 'N';
    if (root === 1) return 'M';
    if (root < A) return `J{${RIGID[root - 2]}}`;
    const from = reach.get(root) ?? new Set();
    if (from.has(1)) return 'M';
    const rigid = RIGID.filter((_, i) => from.has(i + 2));
    return rigid.length === 0 ? 'N' : `J{${rigid.join(',')}}`;
  };
  const terms = used.filter(node => !isConstant(node)).sort((x, y) => x - y)
    .map(node => [node, termOf(find(node))]);
  return { terms: JSON.stringify(terms), clashes };
};

const termText = term => (term.constructor.name === 'TermJ'
  ? `J{${Sets.toUnfoldable(unfoldableArray)(term.value0).join(',')}}`
  : term.constructor.name.slice(4));
const production = (edges, equalities) => {
  const pairs = list => list.map(([one, other]) =>
    new Tuple(markOf(one), markOf(other)));
  const found = Least.leastOfGraph(pairs(equalities))(pairs(edges));
  const terms = Maps.toUnfoldable(unfoldableArray)(found.terms)
    .map(pair => [pair.value0, termText(pair.value1)]);
  return { terms: JSON.stringify(terms), clashes: found.clashes };
};

const run = (family, copier = copied) => {
  const counts = { graphs: 0, disagree: 0, fuel: 0 };
  family((size, edges, equalities) => {
    counts.graphs += 1;
    let copy;
    try {
      copy = copier(size, edges, equalities);
    } catch (error) {
      if (!(error instanceof OutOfFuel)) throw error;
      counts.fuel += 1;
      return false;
    }
    const shipped = production(edges, equalities);
    if (copy.terms !== shipped.terms || copy.clashes !== shipped.clashes)
      counts.disagree += 1;
    return false;
  });
  return counts;
};

// Equality chains of up to 40 metas, each edge-linked to a constant, in
// both directions: `find`'s longest chains.
const chains = least => {
  for (let length = 1; length <= 40; length += 1) {
    const metas = Array.from({ length }, (_, i) => A + i);
    const links = metas.slice(1).map((meta, i) => [metas[i], meta]);
    const size = A + length;
    least(size, [[1, metas[0]], [metas.at(-1), 2]], links);
    least(size, [[metas[0], 3]], links.map(([x, y]) => [y, x]));
  }
};
// Classes holding two constants (a store cannot hold one; a planted
// graph can): the clash count must agree too.
const clashes = least => {
  for (const [x, y] of [[0, 1], [2, 3], [0, 2], [1, 3]])
    least(A + 2, [[A, A + 1], [x, A + 1]], [[A, x], [A, y], [A + 1, y]]);
};

test('find and reaching end within their budgets, agreeing with production',
  () => {
    for (const family of [least => randomFamily(least, 20000), chains,
      clashes]) {
      const counts = run(family);
      assert.ok(counts.graphs > 0);
      assert.deepEqual({ fuel: counts.fuel, disagree: counts.disagree },
        { fuel: 0, disagree: 0 }, JSON.stringify(counts));
    }
  });

test('the agreement check sees a planted copy that ignores edges', () => {
  const ignoring = (size, _, equalities) => copied(size, [], equalities);
  assert.ok(run(least => randomFamily(least, 2000), ignoring).disagree > 0);
});

test('a cyclic parent link runs out of fuel instead of hanging', () => {
  // The copy's budget is a test failure: planted by a union that links
  // a root into its own class (a defect `union` excludes).
  const looping = () => {
    const parent = new Map([[4, 5], [5, 4]]);
    let at = 4;
    for (let fuel = 6; parent.has(at); fuel -= 1) {
      if (fuel <= 0) throw new OutOfFuel('find');
      at = parent.get(at);
    }
  };
  assert.throws(looping, OutOfFuel);
});
