import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { elabFrom } from './r0-elab-support.mjs';

// R0 Task 7.1a, D1 spec §3.5, §6.2, §7, §8: `elaborate`'s steps in order
// (untracked, problem identity, Cov's domain, NoWitness, coverage,
// build), each a named arm, T6 (Dom), T7 (each fault injected), T11 and
// T11b (problem identity). A `Judged` is a newtype, so a test builds one
// as its fields, as T11b asks (no public way exists).
const output = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)),
  '..', 'output')).href;
const load = name => import(`${output}/${name}/index.js`);
const t = await elabFrom(load);
const Elaborate = await load('Features.Check.Elaborate');
const Verdict = await load('Domain.Verdict');
const Internal = await load('Domain.Verdict.Internal');
const { gen, ty, site, sort } = t;
const { Right } = t.m.Either;

const varSet = variables => t.m.Set.fromFoldable(t.m.Foldable.foldableArray)(
  t.m.Atom.ordVar)(variables);
const solution = compilation => ({ strategy: Verdict.OnlineSolver.value,
  validity: Internal.Valid.create([]),
  assurance: new Verdict.Pending('Test.pending'), compilation });
const judged = (e, compilation) =>
  ({ problem: t.m.Elaborating.problem(e), solution: solution(compilation) });
const witnessed = w => new Verdict.Witnessed(w);
const noWitness = new Verdict.NoWitness(new Verdict.NonConstructive(
  Verdict.OnlineSolver.value));
const a = t.fresh(['a']), b = t.fresh(['b']), c = t.fresh(['c']);

// `{ x: a, ...b }` at the body, with `c` minted and never read.
const generator = gen.seq([() => gen.fresh(['a']),
  () => gen.fresh(['b'], sort.row), () => gen.fresh(['c'])],
(ha, hb) => gen.positioned(site.node([]), ty.record([['x', ty.flex(ha)]],
  [ty.flexRef(hb)])));
const e = t.sealed(generator);
const covered = t.witness([[a, t.inline(t.base.int)],
  [b, t.inline(t.recordOf([['y', t.base.bool]]))], [c, t.free(0)]]);
const elaborated = (recon, value, j) =>
  Elaborate.elaborate(varSet(recon))(value)(j);
const shape = result => [result.constructor.name,
  result.value0?.constructor.name ?? null, result.value0?.value0 ?? null];

// An Elab whose run counts its calls and gives `answer`, reading what a
// real read of `a` at the body records (so Sc and Cov see a use).
// `mintedTwice` mints `a` a second time: a DuplicateFresh seal fault.
const spied = (answer, mintedTwice = false) => {
  const spy = { calls: 0 };
  const read = t.m.Elab.readType(site.node([]))(a);
  const forged = { uses: read.uses, run: () => {
    spy.calls += 1;
    return answer;
  } };
  const mints = mintedTwice ? [() => gen.fresh(['a']), () => gen.fresh(['a'])]
    : [() => gen.fresh(['a'])];
  spy.e = t.sealed(gen.seq(mints, () => gen.pure(forged)));
  return spy;
};

test('a covered witness elaborates; the type is the spliced record', () => {
  const result = elaborated([], e, judged(e, witnessed(covered)));
  assert.equal(result.constructor.name, 'Elaborated');
  const record = result.value0.value0;
  assert.deepEqual(record.fields.map(field => field.value0), ['x', 'y']);
  assert.deepEqual(record.tails, []);
});

test('T6 (Dom): covDomain is flex(P) minus Recon, or a fault', () => {
  const domain = recon => Elaborate.covDomain(varSet(recon))(e);
  assert.deepEqual(t.arrayOf(domain([]).value0), [a, b, c]);
  assert.deepEqual(t.arrayOf(domain([c]).value0), [a, b]);
  const broken = domain([a]);
  assert.deepEqual(shape(broken), ['Left', 'BrokenInvariant',
    'elaboration: a Recon variable is read']);
  // Step 3 precedes the witness steps: NoWitness does not hide it.
  assert.deepEqual(shape(elaborated([a], e, judged(e, noWitness))),
    ['Broken', 'BrokenInvariant', 'elaboration: a Recon variable is read']);
  // A Recon variable outside requests leaves Cov's domain without it.
  const partial = t.witness([[a, t.inline(t.base.int)],
    [b, t.inline(t.recordOf([]))]]);
  assert.equal(elaborated([c], e, judged(e, witnessed(partial)))
    .constructor.name, 'Elaborated');
});

test('T7: every ElabFault from build is Broken, one arm each', () => {
  const faults = [new t.m.Types.Unbound(a), new t.m.Types.SortMismatch(a),
    new t.m.Types.NamedUnread(a), new t.m.Types.DuplicateLabel(a, 'x'),
    new t.m.Types.ImageVariable(a, b)];
  const texts = faults.map(fault => {
    const spy = spied(new t.m.Either.Left(fault));
    const w = t.witness([[a, t.inline(t.base.int)]]);
    const result = elaborated([], spy.e, judged(spy.e, witnessed(w)));
    assert.equal(spy.calls, 1, fault.constructor.name);
    assert.deepEqual(shape(result).slice(0, 2), ['Broken', 'BrokenInvariant']);
    return result.value0.value0;
  });
  assert.deepEqual(texts, ['elaboration: build read an unbound variable',
    'elaboration: a row variable bound to a non-record',
    'elaboration: build read a Named binding',
    'elaboration: a spliced row repeats a label',
    'elaboration: an image mentions a problem variable']);
});

test('T7: build faults arise from real reads too', () => {
  const row = t.witness([[a, t.inline(t.base.int)], [b, t.inline(t.base.int)],
    [c, t.free(0)]]);
  assert.deepEqual(shape(elaborated([], e, judged(e, witnessed(row))))
    .slice(0, 2), ['Broken', 'BrokenInvariant']);
  const repeat = t.witness([[a, t.inline(t.base.int)],
    [b, t.inline(t.recordOf([['x', t.base.bool]]))], [c, t.free(0)]]);
  assert.equal(elaborated([], e, judged(e, witnessed(repeat))).value0.value0,
    'elaboration: a spliced row repeats a label');
});

test('T7: seal faults, NoWitness and Cov stop before build', () => {
  const answer = new Right(ty.int);
  const w = t.witness([[a, t.inline(t.base.int)]]);
  // Review of 7.1a (Important 2): the spied value itself has the seal
  // fault, so its call count shows `build` did not run.
  const sealFault = spied(answer, true);
  assert.deepEqual(t.faults(sealFault.e), [['DuplicateFresh', a]]);
  assert.deepEqual(shape(elaborated([], sealFault.e, judged(sealFault.e,
    witnessed(w)))), ['Broken', 'BrokenInvariant',
    'elaboration: the seal check failed']);
  const declined = spied(answer);
  assert.deepEqual(shape(elaborated([], declined.e, judged(declined.e,
    noWitness))), ['NotCompiled', 'NonConstructive',
    Verdict.OnlineSolver.value]);
  const uncovered = spied(answer);
  assert.deepEqual(shape(elaborated([], uncovered.e, judged(uncovered.e,
    witnessed(t.witness([]))))), ['NotCompiled', 'Uncovered', a]);
  for (const spy of [sealFault, declined, uncovered])
    assert.equal(spy.calls, 0);
  const passing = spied(answer);
  assert.deepEqual(shape(elaborated([], passing.e, judged(passing.e,
    witnessed(w)))), ['Elaborated', 'TInt', null]);
  assert.equal(passing.calls, 1);
});

test('T11, T11b: another declaration\'s problem or solution is Broken',
  () => {
    const f = t.sealed(generator, 0);
    const g = t.sealed(generator, 1);
    // Equal variable sets: only the declaration tells them apart.
    assert.deepEqual(t.requested(f), t.requested(g));
    const mismatch = ['Broken', 'BrokenInvariant',
      'elaboration: problem mismatch'];
    assert.deepEqual(shape(elaborated([], f, judged(g, witnessed(covered)))),
      mismatch);
    // g's solution paired with f's problem, given to g's Elaborating.
    assert.deepEqual(shape(elaborated([], g, { problem:
      t.m.Elaborating.problem(f), solution: solution(witnessed(covered)) })),
    mismatch);
    assert.equal(elaborated([], g, judged(g, witnessed(covered)))
      .constructor.name, 'Elaborated');
  });

// BACKLOG R029: only `elaborate` makes an `Elaborated` (the module
// exports no constructor), and the fold names the success case
// `effectErased` (option c's IR is not effect-correct checked IR).
test('Elaboration is read only by its fold, its success effectErased',
  () => {
    for (const name of ['Elaborated', 'NotCompiled', 'Broken'])
      assert.equal(name in Elaborate, false, name);
    const cases = { effectErased: made => ['effectErased', made],
      notCompiled: reason => ['notCompiled', reason.constructor.name],
      broken: fault => ['broken', fault.constructor.name] };
    const fold = result => Elaborate.foldElaboration(cases)(result);
    const built = elaborated([], e, judged(e, witnessed(covered)));
    assert.deepEqual(fold(built), ['effectErased', built.value0]);
    assert.deepEqual(fold(elaborated([], e, judged(e, noWitness))),
      ['notCompiled', 'NonConstructive']);
    assert.deepEqual(fold(elaborated([a], e, judged(e, noWitness))),
      ['broken', 'BrokenInvariant']);
  });
