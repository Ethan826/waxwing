import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { closedValues, fieldValues, solve } from './r0-cx-support.mjs';
import { rowsOver, scan }
  from '../research/composition-assessment/sig-oracle/semantics.mjs';

// Task 5.2: the check's decider (Counter/Decide.purs, a port of Lean's
// `decideCall`) against the bounded brute force of test/r0-cx-support.mjs
// on seeded random problems over two labels, three type variables and
// two row variables (the grammar below, fixed before the first run).
// The direction a refutation rests on is asserted: whenever the brute
// force finds a solution, `decideCall` says satisfiable. The converse
// holds only up to the bound; on this seed it holds too, and the counts
// are pinned. Amendment after the first run: the brute force's bound
// missed four satisfiable problems (a nested record no row field could
// hold; a forced variable enumerated first), so it gained closed
// subexpression values and a variable order (docs/findings.md).
const Term = await load('Features.Check.Refute.Counter.Term');
const Decide = await load('Features.Check.Refute.Counter.Decide');
const Atom = await load('Domain.Recorded.Atom');
const { Tuple } = await load('Data.Tuple');

const seeded = seed => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const labels = ['a', 'b'];
const bases = [['Int', Atom.IntBase.value], ['Bool', Atom.BoolBase.value]];

// One expression as the pair (oracle form, compiled `Term`).
const expression = (random, depth) => {
  const pick = random();
  if (depth === 0 || pick < 0.3) {
    const [name, base] = bases[Math.floor(random() * bases.length)];
    return [{ k: 'b', b: name }, new Term.TBase(new Term.Known(base))];
  }
  if (pick < 0.55) {
    const n = Math.floor(random() * 3);
    return [{ k: 'v', n }, new Term.TVar(n)];
  }
  if (pick < 0.7) {
    const [[a, ta], [c, tc]] = [expression(random, depth - 1),
      expression(random, depth - 1)];
    return [{ k: 'f', a, c }, new Term.TArrow(ta, tc)];
  }
  const fields = labels.filter(() => random() < 0.5).map(label =>
    [label, expression(random, depth - 1)]);
  const tails = [0, 1].filter(() => random() < 0.4);
  return [{ k: 'r', fields: fields.map(([label, [o]]) => [label, o]), tails },
    new Term.TRecord(fields.map(([label, [, t]]) => new Tuple(label, t)),
      tails)];
};

const atom = random => {
  const pick = random();
  if (pick < 0.75) {
    const [[l, tl], [r, tr]] = [expression(random, 2), expression(random, 2)];
    return [['eq', l, r], new Term.Equal(tl, tr)];
  }
  const row = Math.floor(random() * 2);
  if (pick < 0.88) {
    const label = labels[Math.floor(random() * 2)];
    return [['lacks', row, label], new Term.Lacks(row, label)];
  }
  if (pick < 0.98) return [['disjoint', row, 1 - row],
    new Term.Disjoint(row, 1 - row)];
  return [['ff'], Term.Ff.value];
};

const problems = (count, seed) => {
  const random = seeded(seed);
  return Array.from({ length: count }, () =>
    Array.from({ length: 1 + Math.floor(random() * 3) }, () => atom(random)));
};

const bruteForce = atoms => {
  const B = atoms.map(([o]) => o);
  const seen = scan(B);
  const oracle = { B, flexTys: [...seen.tys], flexRows: [...seen.rows] };
  const values = [...new Set([...fieldValues, ...closedValues(B)])];
  return solve(oracle, new Map(), rowsOver([...seen.labels], () => values),
    values);
};

test('decideCall says satisfiable wherever the brute force solves', () => {
  const counts = { bothSolved: 0, bothRefuted: 0, decidedOnly: 0 };
  for (const atoms of problems(600, 20261023)) {
    const decided = Decide.decideCall(atoms.map(([, t]) => t));
    const solution = bruteForce(atoms);
    if (solution !== null) {
      assert.equal(decided.satisfiable, true,
        `refuted with a solution: ${JSON.stringify(atoms.map(([o]) => o))}`);
      counts.bothSolved += 1;
    } else if (decided.satisfiable) counts.decidedOnly += 1;
    else counts.bothRefuted += 1;
    assert.equal(decided.patterns >= 1, true);
  }
  // Both outcomes occur often; on this seed the two also agree where
  // the brute force finds nothing (pinned: a change is a finding).
  assert.deepEqual(counts,
    { bothSolved: 212, bothRefuted: 388, decidedOnly: 0 });
});

// An unsatisfiable problem enumerates every pattern: 2^(rows x labels).
test('a refuted problem tries all 2^pairs patterns', () => {
  const row = new Term.TRecord([], [0, 1]);
  const closed = new Term.TRecord([new Tuple('a', new Term.TBase(
    new Term.Known(Atom.IntBase.value)))], []);
  const atoms = [new Term.Equal(row, closed), new Term.Lacks(0, 'a'),
    new Term.Lacks(1, 'a')];
  const decided = Decide.decideCall(atoms);
  assert.equal(decided.satisfiable, false);
  assert.equal(Decide.pairCount(atoms), 2);
  assert.equal(decided.patterns, 4);
});
