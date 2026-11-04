import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { choose, generator } from './coverage-oracle.mjs';
import { shape } from './regression-r0-amin-support.mjs';
import { mergeCases } from './r0-a2-prerequisites-cases.mjs';
import { describe, sources } from './r0-decide-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';

// BACKLOG R034 (2): an Unresolved reason names each unsupported kind once
// (a-min statements §7, "Routing"; Decide.Reason `unchecked`), so every
// `EffectsUnchecked` among the blocks and declines is merged into one
// entry at the first one's place: the union of their kinds in first
// occurrence order. The reasons are built from injected blocks and
// declines (test/r0-a2-prerequisites-cases.mjs).
const cases = await mergeCases(load);
const { Verdict, Effect, kinds: [k1, k2, k3], unchecked, entries } = cases;
const Atom = await load('Domain.Recorded.Atom');
const Search = await load('Domain.Verdict.Search');
const Reason = await load('Features.Check.Decide.Reason');
const { Nothing } = await load('Data.Maybe');
const plain = value => shape(value);
const text = value => JSON.stringify(shape(value));
const defectAt = decl => new Verdict.RecordDefective(new Effect.InRecord({
  decl, table: Effect.InDeclarations.value, path: Nothing.value }));

test('kinds merged', () => {
  assert.deepEqual(entries([unchecked([k1, k2])], [unchecked([k1])]),
    [plain(unchecked([k1, k2]))]);
});

// Separates the merge from keeping only the block's entry.
test('new kind appended', () => {
  assert.deepEqual(entries([unchecked([k1])], [unchecked([k2])]),
    [plain(unchecked([k1, k2]))]);
});

test('others keep their place', () => {
  const defect = defectAt(0);
  const outside = new Verdict.Outside(Atom.HandlerType.value);
  assert.deepEqual(entries([defect, unchecked([k1]), outside],
    [unchecked([k2])]),
  [defect, unchecked([k1, k2]), outside].map(plain));
});

// Only injected strategies reach this path (a real candidate-level
// `EffectsUnchecked` implies a recorded `Unsupported`, which blocks).
test('unlimited path', () => {
  assert.deepEqual(entries([], [unchecked([k1]), unchecked([k2])]),
    [plain(unchecked([k1, k2]))]);
});

// The same through `decide`: a problem recording both of effect 1's
// operations, refused for one (as Task 12's C3).
test('kinds merged through decide', async () => {
  const stubs = await stubsFrom(load);
  const problem = stubs.recorded.problem(sources.fx032.replace(
    'fn op(): Int with State({ x: Int });', 'fn op(): Int with State({ x:'
      + ' Int }); fn op2(): Int with State({ y: Int });').replace(
    '= Op.op();', '= Op.op() + Op.op2();'), 'g');
  const refusal = new Search.NotCertifiable(new Search.UnsupportedRecorded(
    k1), { provenance: problem.effects.obligations[0].provenance,
    check: 0 });
  assert.equal(describe(stubs.decide(stubs.checking({ strategies: [
    stubs.behaviours.refusing(Verdict.ClaimsComplete.value, refusal)] }),
  problem)).verdict, 'Unresolved Unsupported EffectsUnchecked'
    + ' [OperationWithRow 1 0, OperationWithRow 1 1]');
});

// Property, grammar fixed before running: up to 6 entries, each drawn
// from every inhabited `Unsupport` constructor (`ClassF`'s `Question`
// has no constructor), kinds from k1-k3, `EffectsUnchecked []`
// included; 400 seeded draws, split at a drawn point into blocks and
// declines (all declines when the split is 0: the unlimited path).
const draw = next => {
  const pick = list => list[choose(next, list.length)];
  const kindList = () => [...Array(choose(next, 4)).keys()]
    .map(() => pick([k1, k2, k3]));
  return pick([
    () => new Verdict.Outside(pick([Atom.HandlerType.value,
      Atom.FailFamily.value, Atom.Deferred.value])),
    () => Verdict.RequirementAtoms.value,
    () => new Verdict.GuardOutsideFragment(Verdict.OnlineSolver.value),
    () => Verdict.SeveralTailSubtraction.value,
    () => Verdict.SecondSpread.value,
    () => unchecked(kindList()),
    () => defectAt(choose(next, 2)),
    () => new Verdict.EffectLimit(pick([Search.RigidExact.value,
      Search.ForcedTail.value, new Search.UnsupportedRecorded(
        pick([k1, k2, k3]))]))
  ])();
};
const isUnchecked = entry => Object.keys(entry)[0] === 'EffectsUnchecked';

test('property: one EffectsUnchecked, the union, others in order', () => {
  for (const seed of [...Array(400).keys()]) {
    const next = generator(seed + 1);
    const input = [...Array(1 + choose(next, 6)).keys()].map(() =>
      draw(next));
    const split = choose(next, input.length + 1);
    const found = entries(input.slice(0, split), input.slice(split));
    const merged = found.filter(isUnchecked);
    const union = [...new Set(input.filter(entry =>
      entry instanceof Verdict.EffectsUnchecked)
      .flatMap(entry => entry.value0.map(text)))];
    const others = [...new Set(input.filter(entry =>
      !(entry instanceof Verdict.EffectsUnchecked)).map(text))];
    const anyUnchecked = input.some(entry =>
      entry instanceof Verdict.EffectsUnchecked);
    assert.equal(merged.length, anyUnchecked ? 1 : 0, `seed ${seed}`);
    // The merged entry stands where the first EffectsUnchecked was:
    // after the distinct other entries recorded before it.
    const first = input.findIndex(entry =>
      entry instanceof Verdict.EffectsUnchecked);
    if (anyUnchecked)
      assert.equal(found.findIndex(isUnchecked), new Set(input
        .slice(0, first).map(text)).size, `seed ${seed}`);
    if (anyUnchecked)
      assert.deepEqual(merged[0].EffectsUnchecked[0].map(item =>
        JSON.stringify(item)), union, `seed ${seed}`);
    assert.deepEqual(found.filter(entry => !isUnchecked(entry))
      .map(entry => JSON.stringify(entry)), others, `seed ${seed}`);
  }
});

// Idempotent: the merged reason, fed back as blocks, is unchanged.
const blocked = blocks => Reason.reason(blocks)([]).value0;
test('property: merging is idempotent', () => {
  for (const seed of [...Array(400).keys()]) {
    const next = generator(seed + 1);
    const input = [...Array(1 + choose(next, 6)).keys()].map(() =>
      draw(next));
    const once = blocked(input);
    assert.deepEqual(blocked(once).map(text), once.map(text),
      `seed ${seed}`);
  }
});
