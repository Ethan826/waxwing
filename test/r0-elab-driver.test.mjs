import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { elabFrom } from './r0-elab-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';

// R0 Task 7.1b, D1 spec §5 layer 2 and §10 T3a's harness half: the shadow
// harness runs the seal check right after generation, so a generator
// with a seal fault, injected in `generate`'s place, gives
// `BrokenInvariant` and never reaches `decide` (an injected stub
// strategy counts its searches), and `elaborate` given the same value is
// `Broken` without running `build` (its `run` counts its calls). One
// case per `SealFault`, and a clean control that reaches `decide` once.
const output = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)),
  '..', 'output')).href;
const load = name => import(`${output}/${name}/index.js`);
const t = await elabFrom(load);
const stubs = await stubsFrom(load);
const Shadow = await load('Features.Check.Decide.Shadow');
const Elaborate = await load('Features.Check.Elaborate');
const Verdict = await load('Domain.Verdict');
const Internal = await load('Domain.Verdict.Internal');
const { gen, ty, site, sort } = t;
const a = t.fresh(['a']);

// A value whose `run` counts its calls, reading what a read of `a` at
// the body records; `steps` write the generation's parts first.
const spied = steps => {
  const spy = { calls: 0 };
  const read = t.m.Elab.readType(site.node([]))(a);
  const forged = { uses: read.uses, run: () => {
    spy.calls += 1;
    return new t.m.Either.Right(t.m.Core.TInt.value);
  } };
  spy.e = t.sealed(gen.seq(steps, () => gen.pure(forged)));
  return spy;
};
const mintA = (variableSort = sort.type) => () => gen.fresh(['a'],
  variableSort);
const cases = {
  UntrackedRead: [],
  SortClash: [mintA(sort.row)],
  AuxiliarySite: [mintA(), () => gen.positioned(site.auxiliary, ty.int)],
  RigidSiteRead: [mintA(), () => gen.positioned(site.rigid(0),
    ty.flex(a))],
  DuplicateFresh: [mintA(), mintA()],
  DuplicateSite: [mintA(), () => gen.positioned(site.node(['x']), ty.int),
    () => gen.positioned(site.node(['x']), ty.int)]
};

const decl = { name: 'f' };
const harness = spy => {
  const strategy = stubs.behaviours.accepting();
  const decided = Shadow.shadowDecision(stubs.checking({
    strategies: [strategy] }))(() => new t.m.Either.Right(spy.e))(decl);
  return { decided, searches: strategy.calls };
};
const solution = { strategy: Verdict.OnlineSolver.value,
  validity: Internal.Valid.value,
  assurance: new Verdict.Pending('Test.pending'),
  compilation: new Verdict.Witnessed(t.witness([[a,
    t.inline(t.base.int)]])) };
const judged = e => ({ problem: t.m.Elaborating.problem(e), solution });

test('T3a (harness): a seal fault stops before decide and build', () => {
  for (const [name, steps] of Object.entries(cases)) {
    const spy = spied(steps);
    assert.ok(t.faults(spy.e).some(([found]) => found === name), name);
    const { decided, searches } = harness(spy);
    assert.equal(decided.constructor.name, 'Left', name);
    assert.deepEqual([decided.value0.constructor.name, decided.value0.value0],
      ['BrokenInvariant', 'elaboration: the seal check failed'], name);
    assert.equal(searches, 0, name);
    const result = Elaborate.elaborate(t.m.Set.empty)(spy.e)(judged(spy.e));
    assert.deepEqual([result.constructor.name, result.value0.value0],
      ['Broken', 'elaboration: the seal check failed'], name);
    assert.equal(spy.calls, 0, name);
  }
});

test('T3a (harness): a clean value reaches decide once, and build', () => {
  const spy = spied([mintA()]);
  assert.deepEqual(t.faults(spy.e), []);
  const { decided, searches } = harness(spy);
  assert.equal(decided.constructor.name, 'Right');
  assert.equal(searches, 1);
  const result = Elaborate.elaborate(t.m.Set.empty)(spy.e)(judged(spy.e));
  assert.equal(result.constructor.name, 'Elaborated');
  assert.equal(spy.calls, 1);
});
