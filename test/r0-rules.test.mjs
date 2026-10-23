import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { bounded, clashApply, compositionApply, keyOf, recorded }
  from './r0-rules-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';

// Task 5.1 (T-R0a §5, §5.1, §5.2; AT5, AT6): `toSig` under CX
// refute/statements.md §4.1's conditions, `checkDerivation` over an
// injected rule set (ruling R7), the empty `registry` and `theorems`,
// and `trustedRefuter`. Rules are test-only stubs minted through the
// compiled Internal modules (test/r0-stubs.mjs).
const Project = await load('Features.Check.Refute.Project');
const Sig = await load('Features.Check.Refute.Sig');
const Rules = await load('Features.Check.Refute.Rules');
const Theorems = await load('Features.Check.Refute.Theorems');
const { fields } = await load('Domain.Recorded');
const { Just } = await load('Data.Maybe');
const { Left, Right } = await load('Data.Either');
const stubs = await stubsFrom(load);

const main = 'fn main(): Int = 1;\n';
const clash = `fn f(): Int = true;\n${main}`;
const clashD = `fn f(p: { ...r }): Int where r lacks { a } = true;\n${main}`;
const sum = `fn f(x: Int): Int = x + true;\n${main}`;
const composition = 'fn f(p: { ...r }): { a: Int, ...r } where r lacks'
  + ` { a } = { a: 1, ...p };\n${main}`;
const boxes =
  `type Box(a) = Box(a);\nfn f(b: Box(Int)): Box(Int) = b;\n${main}`;

const theorem = stubs.theoremRef('Test.notAProof');
const clashRule = stubs.soundRule('test-clash', theorem, clashApply);
const compositionRule =
  stubs.soundRule('test-composition', theorem, compositionApply);
const rules = [clashRule, compositionRule];
const sigOf = problem => {
  const found = Project.toSig(problem);
  assert.ok(found instanceof Just, 'toSig undefined');
  return found.value0;
};
const ids = entries => entries.map(entry => keyOf(entry.id));
const recordedIds = entries => entries.map(entry => keyOf(entry.origin.atom));
const check = (problem, derivation, ruleSet = rules) =>
  Rules.checkDerivation(ruleSet)(problem)(derivation);
const refusal = (problem, derivation, ruleSet) => {
  const result = check(problem, derivation, ruleSet);
  assert.ok(result instanceof Left, 'derivation accepted');
  return result.value0;
};
const derivation = (rule, premises) => ({ rule, premises, blame: [] });

test('toSig keeps ids and the whole D, drops bq, keeps rigid lists', () => {
  for (const source of [clashD, composition, main]) {
    const problem = recorded(source, source === main ? 'main' : 'f');
    const view = fields(problem);
    const sig = sigOf(problem);
    assert.deepEqual(ids(sig.d), recordedIds(view.d));
    assert.deepEqual(ids(sig.b), recordedIds(view.b));
    assert.deepEqual([sig.rigidTy, sig.rigidRow].map(keyOf),
      [view.rigidTy, view.rigidRow].map(keyOf));
    assert.ok(!('bq' in sig) && !('q' in sig));
  }
  assert.equal(fields(recorded(main, 'main')).bq.length, 1);
  const [lacks] = sigOf(recorded(clashD)).d;
  assert.ok(lacks.atom instanceof Sig.SigLacks);
});

test('toSig gives each app occurrence its own flexible variable', () => {
  const [{ atom }] = sigOf(recorded(boxes)).b;
  assert.ok(atom instanceof Sig.SigEqual);
  const sides = [atom.value0, atom.value1];
  assert.ok(sides.every(side => side instanceof Sig.SigTVar
    && side.value0 instanceof Sig.Generalized));
  assert.notEqual(sides[0].value0.value0, sides[1].value0.value0);
  assert.equal(bounded(sigOf(recorded(boxes))), 'valid');
});

// A long spine is walked by a loop: before it was, 5,000 parameters
// overflowed the stack (docs/findings.md, "Rules and the projection").
test('toSig keeps a 20,000-parameter arrow spine', () => {
  const spine = 20000;
  const type = `(${Array(spine).fill('Int').join(', ')}) -> Int`;
  const source = `fn f(k: ${type}): ${type} = k;\n${main}`;
  const [{ atom }] = sigOf(recorded(source)).b;
  let [depth, part] = [0, atom.value1];
  for (; part instanceof Sig.SigArrow; part = part.value1) depth += 1;
  assert.equal(depth, spine);
  assert.ok(part instanceof Sig.SigBase);
});

// Condition 2: a `D` atom (or a `q` atom) outside `TExpr` leaves toSig
// undefined. Source never records one (T-R0b's `d` holds lacks and
// disjoint only), so the problem is altered through its compiled form,
// where the newtype is the record itself.
const altered = (source, change) =>
  ({ ...fields(recorded(source)), ...change(fields(recorded(source))) });

test('toSig is undefined when D or q leaves TExpr', () => {
  const boxed = fields(recorded(boxes)).b[0];
  const withAppInD = altered(clashD, view => ({ d: [...view.d, boxed] }));
  const withQ = altered(clashD, view => ({ q: [view.d[0]] }));
  for (const problem of [withAppInD, withQ]) {
    assert.ok(!(Project.toSig(problem) instanceof Just));
    assert.equal(refusal(problem, derivation('test-clash',
      [fields(recorded(clashD)).b[0].origin.atom])).constructor.name,
    'Unprojectable');
  }
});

// AT5: a registered rule's evidence passes the independent check: its
// premises are original `B` ids, and the sub-problem it names, with the
// whole `D`, is invalid by brute force.
test('AT5: a registered rule gives evidence on original B ids', () => {
  for (const source of [clash, clashD, sum]) {
    const problem = recorded(source);
    const sig = sigOf(problem);
    const fired = clashApply(sig);
    assert.ok(fired instanceof Just, source);
    const result = check(problem, fired.value0);
    assert.ok(result instanceof Right, source);
    assert.equal(result.value0.constructor.name, 'ByRule');
    const premises = result.value0.value0.premises.map(keyOf);
    const original = recordedIds(fields(problem).b);
    assert.ok(premises.every(id => original.includes(id)), source);
    assert.ok(premises.every(id =>
      !recordedIds(fields(problem).d).includes(id)));
    const sub = Project.withBody(sig)(result.value0.value0.premises);
    assert.deepEqual(ids(sub.d), ids(sig.d));
    assert.ok(sub.b.length > 0 && sub.b.length <= sig.b.length);
    assert.equal(bounded(sub), 'invalid', source);
  }
});

// AT6: each refusal, by its constructor.
test('AT6: an unregistered rule is refused', () => {
  const problem = recorded(clash);
  const fired = clashApply(sigOf(problem)).value0;
  assert.equal(refusal(problem, fired, Rules.registry).constructor.name,
    'Unregistered');
  assert.equal(refusal(problem, fired, [compositionRule]).constructor.name,
    'Unregistered');
});

test('AT6: a premise outside the recorded B is refused', () => {
  const problem = recorded(clash);
  const [atom] = fields(problem).b.map(entry => entry.origin.atom);
  const rewritten = { ...atom, index: 7 };
  const elsewhere = { ...atom, decl: atom.decl + 1 };
  const requirement = fields(recorded(main, 'main')).bq[0].origin.atom;
  for (const premise of [rewritten, elsewhere, requirement]) {
    const found = refusal(problem, derivation('test-clash', [premise]));
    assert.equal(found.constructor.name, 'NotOriginal');
    assert.deepEqual(found.value0, premise);
  }
});

test('AT6: a D atom as a premise is refused', () => {
  const problem = recorded(clashD);
  const premise = fields(problem).d[0].origin.atom;
  const found = refusal(problem, derivation('test-clash',
    [fields(problem).b[0].origin.atom, premise]));
  assert.equal(found.constructor.name, 'DAtomPremise');
  assert.deepEqual(found.value0, premise);
});

// The rule is re-run on the premises with the whole `D`. A derivation
// found on a sub-`D` (here, none) fires where the whole `D` forbids it;
// brute force shows the sub-`D` problem invalid and the whole one valid.
test('AT6: a derivation applied to a D-subset is refused', () => {
  const problem = recorded(composition);
  const sig = sigOf(problem);
  assert.ok(!(compositionApply(sig) instanceof Just));
  const fired = compositionApply({ ...sig, d: [] });
  assert.ok(fired instanceof Just);
  assert.equal(refusal(problem, fired.value0).constructor.name,
    'RuleDeclines');
  const premises = fired.value0.premises;
  assert.equal(bounded(Project.withBody({ ...sig, d: [] })(premises)),
    'invalid');
  assert.equal(bounded(Project.withBody(sig)(premises)), 'valid');
});

test('the rule is re-run on its premises, not on the whole body', () => {
  const problem = recorded(sum);
  const [first] = fields(problem).b.map(entry => entry.origin.atom);
  assert.ok(clashApply(sigOf(problem)) instanceof Just);
  assert.equal(refusal(problem, derivation('test-clash', [first]))
    .constructor.name, 'RuleDeclines');
});

test('no rule and no theorem exist in production', () => {
  assert.deepEqual(Rules.registry, []);
  assert.deepEqual(Theorems.theorems, []);
});

// T-R0a §5.1 (Q10): only `trustedRefuter`, given a theorem, wraps a
// counter-instance that passed the spec's check as `Refuted` (a newtype,
// so its compiled form is the CX itself); a refusal passes through.
test('trustedRefuter wraps only what the check accepts', () => {
  const cx = { rho: 'rho', body: ['atom'] };
  const search = () => () => () => cx;
  const spec = accept => ({ name: 'test-refuter', search,
    check: () => given => accept ? new Right('checked') : new Left(given) });
  const parts = accepting =>
    Rules.refuterParts(Rules.trustedRefuter(theorem)(spec(accepting)));
  const problem = recorded(clash);
  assert.equal(parts(true).name, 'test-refuter');
  assert.equal(parts(true).theorem, theorem);
  assert.equal(parts(true).search, search);
  const accepted = parts(true).confirm(problem)(cx);
  assert.ok(accepted instanceof Right);
  assert.equal(accepted.value0, cx);
  const refused = parts(false).confirm(problem)(cx);
  assert.ok(refused instanceof Left);
  assert.equal(refused.value0, cx);
});
