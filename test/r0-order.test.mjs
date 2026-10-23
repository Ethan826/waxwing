import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { sources, verdictClass } from './r0-decide-support.mjs';

// AT7 (T-R0a §5.3 "Order", §9; Task 4.1): properties of the production
// `decide` over random stub worlds, and the refuter-seeding premise AT7
// rests on, tested on its own.
//
// The grammar, fixed in this file before the first run (2026-10-23;
// project rule: an oracle's grammar is fixed before running, and a later
// change is an amendment, labelled here with its reason):
//   truth     ∈ { valid, invalid, open }, uniform
//   problem   ∈ { plain, marked }, uniform (marked: one DataApplication
//               marker beside the refutable atom; rule 1 blocks Solved)
//   fuel      ∈ { 0, 3 }: 0 with probability 1/8
//   hints     ⊆ { h0, h1, h2, h3 }, per stub, each with probability 1/3
//   strategies: 0-4 (uniform), each uniform over the kinds allowed:
//     declining u, u ∈ { RequirementAtoms, SeveralTailSubtraction }
//     ending e hints, e ∈ { Exhausted, OutOfBudget, Broke }
//     refusing c r hints, c ∈ { ClaimsComplete, Heuristic },
//       r ∈ { Unsatisfied, RequirementOpen }
//     accepting hints            (only when truth = valid)
//   refuters: 0-3, each uniform over the kinds allowed:
//     none (finds nothing); refused (finds; its check refuses)
//     unseeded                   (only when truth = invalid)
//     seeded h, h in the hints   (only when truth = invalid; finds only
//                                  when its hints include h)
//   rules: 0-2, each silent, or firing on the first B atom (only when
//     truth = invalid), named apart.
// No search is Inconsistent and no derivation is refused: T-R0a's
// premise of sound trusted components and no broken invariant. Worlds
// come from a fixed seed, so a failure reproduces.
const stubs = await stubsFrom(load);
const { behaviours: b, checking, decide, trusted, ruleOf, firstB, hint } =
  stubs;
const Verdict = await load('Domain.Verdict');
const Search = await load('Domain.Verdict.Search');
const { Path, InBody } = await load('Domain.Recorded.Origin');
const problems = { plain: stubs.recorded.problem(sources.clash),
  marked: stubs.recorded.problem(sources.boxed) };
const atom = { decl: 0, path: Path({ root: InBody.value, steps: [] }),
  index: 0 };
const worlds = 400;

const random = seed => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const pick = (next, items) => items[Math.floor(next() * items.length)];
const hintsOf = (next, alphabet) => alphabet.filter(() => next() < 1 / 3)
  .map(hint);
const alphabet = ['h0', 'h1', 'h2', 'h3'];

const strategyKinds = truth => [
  next => b.declining(pick(next, [Verdict.RequirementAtoms.value,
    Verdict.SeveralTailSubtraction.value])),
  next => b.ending(pick(next, [Verdict.Exhausted.value,
    new Verdict.OutOfBudget(new Verdict.StrategyBudget(stubs.name)),
    new Verdict.Broke('search')]), hintsOf(next, alphabet)),
  next => b.refusing(pick(next, [Verdict.ClaimsComplete.value,
    Verdict.Heuristic.value]), pick(next, [new Search.Unsatisfied(atom),
    new Search.RequirementOpen(atom)]), hintsOf(next, alphabet)),
  ...truth === 'valid' ? [next => b.accepting(hintsOf(next, alphabet))] : []
];
const refuterKinds = truth => [
  () => trusted({ finds: () => false }),
  () => trusted({ confirmed: false }),
  ...truth === 'invalid' ? [() => trusted(), next => {
    const wanted = pick(next, alphabet);
    return trusted({ finds: hints => hints.some(item =>
      item.value0 === wanted) });
  }] : []
];
const ruleKinds = truth => [
  (next, index) => ruleOf(`silent-${index}`, () => []),
  ...truth === 'invalid'
    ? [(next, index) => ruleOf(`firing-${index}`, firstB)] : []
];

const draw = (next, kinds, count) => Array.from({ length: count }, (_, i) =>
  pick(next, kinds)(next, i));
const world = next => {
  const truth = pick(next, ['valid', 'invalid', 'open']);
  return { truth, problem: problems[pick(next, ['plain', 'marked'])],
    fuel: next() < 1 / 8 ? 0 : 3,
    strategies: draw(next, strategyKinds(truth), Math.floor(next() * 5)),
    refuters: draw(next, refuterKinds(truth), Math.floor(next() * 4)),
    rules: draw(next, ruleKinds(truth), Math.floor(next() * 3)) };
};
const classOf = (made, changes = {}) => {
  const it = { ...made, ...changes };
  return verdictClass(decide(checking({ strategies: it.strategies,
    refuters: it.refuters, rules: it.rules,
    budget: { fuel: it.fuel, depth: 1000, keys: 10000 } }), it.problem));
};
const shuffled = (next, items) => items.map(item => [next(), item])
  .sort((x, y) => x[0] - y[0]).map(([, item]) => item);
const decisive = new Set(['Solved', 'Contradiction']);

test('AT7: adding a strategy never removes a Solved or Contradiction',
  () => {
    const next = random(7);
    const seen = { Solved: 0, Contradiction: 0, Unresolved: 0 };
    for (let n = 0; n < worlds; n += 1) {
      const made = world(next);
      const before = classOf(made);
      seen[before] = (seen[before] ?? 0) + 1;
      const added = pick(next, strategyKinds(made.truth))(next);
      const at = Math.floor(next() * (made.strategies.length + 1));
      const strategies = [...made.strategies.slice(0, at), added,
        ...made.strategies.slice(at)];
      if (decisive.has(before))
        assert.equal(classOf(made, { strategies }), before, `world ${n}`);
    }
    for (const kind of Object.keys(seen)) assert.ok(seen[kind] >= 20,
      JSON.stringify(seen));
  });

test('AT7: permuting strategies or refuters never changes the class',
  () => {
    const next = random(11);
    for (let n = 0; n < worlds; n += 1) {
      const made = world(next);
      const before = classOf(made);
      assert.equal(classOf(made, { strategies: shuffled(next,
        made.strategies) }), before, `world ${n} strategies`);
      assert.equal(classOf(made, { refuters: shuffled(next,
        made.refuters) }), before, `world ${n} refuters`);
    }
  });

test('AT7: a refused candidate never gives Faulted', () => {
  const next = random(13);
  let refused = 0;
  for (let n = 0; n < worlds; n += 1) {
    const made = world(next);
    const result = decide(checking({ strategies: made.strategies,
      refuters: made.refuters, rules: made.rules }), made.problem);
    if (result.value0?.attempts?.some(item =>
      item.constructor.name === 'CheckFailed')) refused += 1;
    assert.notEqual(verdictClass(result), 'Faulted', `world ${n}`);
  }
  assert.ok(refused >= 50, `${refused} worlds with a refused candidate`);
});

// AT7's extra premise. The stub walks its hints in order, one fuel
// each, and finds a counter-instance only on reaching `target`; given a
// hint set whole, a larger set can spend its fuel before the target.
const perHint = target => (hints, budget) =>
  hints.slice(0, budget.fuel).some(item => item.value0 === target);
const six = ['a', 'b', 'c', 'd', 'e', 'f'];

test('refuter search is monotone in hints', () => {
  const next = random(17);
  let wholeSetLoses = 0;
  for (let n = 0; n < worlds; n += 1) {
    const target = pick(next, six);
    const fuel = 1 + Math.floor(next() * 3);
    const subset = six.filter(() => next() < 0.4);
    const superset = [...new Set([...subset,
      ...six.filter(() => next() < 0.4)])];
    const contradicted = hints => verdictClass(decide(checking({
      strategies: [b.ending(Verdict.Exhausted.value, hints.map(hint))],
      refuters: [trusted({ finds: perHint(target) })],
      budget: { fuel, depth: 1000, keys: 10000 } }), problems.plain))
      === 'Contradiction';
    if (contradicted(subset))
      assert.ok(contradicted(superset), `world ${n}`);
    const whole = set => perHint(target)([...set].sort().map(hint),
      { fuel });
    if (whole(subset) && !whole(superset)) wholeSetLoses += 1;
  }
  assert.ok(wholeSetLoses > 0, 'no world where whole-set seeding loses');
});
