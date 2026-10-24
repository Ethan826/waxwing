// BACKLOG R031: two option-c defects in `build`, pinned as they stand
// (docs/plans/r0-effect-rows-audit.md A11, A6/A4; dossier §18.74 Q7).
// Each test asserts the DEFECT, so it passes while the defect exists and
// fails once the a-min representation work fixes it; the fix then
// rewrites the test to assert today's form. A test asserting the right
// answer now would fail verify (AGENTS.md: no skipped or failing tests).
// T2 and T8 cannot see either defect: they compare effect-erased forms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';

const online = await onlineFrom(load);
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const { build } = await load('Domain.Elaborating.Build');
const { substitutionWitness } =
  await load('Features.Check.Strategy.Witness');
const named = value => value.constructor.name;

// `build`'s body under the online certificate's witness, and today's.
const bodies = (source, name) => {
  const program = online.programOf(source);
  const problem = online.problemOf(program, name);
  const certificate = online.search(program, problem).value0;
  const inputs = Inputs.generationInputs(program);
  const elaborating = Generate.generate(inputs.tables)(inputs.signatures)(
    program.functions.find(decl => decl.name === name)).value0;
  const witness = substitutionWitness(problem)(certificate.unsettled);
  assert.equal(named(witness), 'Witnessed');
  const built = build(elaborating)(witness.value0);
  assert.equal(named(built), 'Right');
  return { built: built.value0.body, today: certificate.checked.body };
};
// The block's `index`th `let`'s value type.
const letType = (body, index) => body.value0.node.value0[index].value1
  .value0.ty;
// A row's tail: `Rigid`, `Hole` or `closed`.
const tailOf = row => (named(row.value1) === 'Nothing' ? 'closed'
  : named(row.value1.value0));

// A11: today `annotationRow` (Check/Lambda.purs) gives the annotation's
// ambient row the lambda's row, a hole here; generation translates the
// annotation `Rigidly`, so `build` writes rigid 0 in a declaration with
// no type parameters: a name with no binder.
test('R031 (1) pinned: an annotated lambda\'s ambient row stays rigid',
  () => {
    const { built, today } = bodies('fn f(): Int = {\n'
      + '  let g = fn(h: Int -> Int) => h(1);\n  0\n};\n'
      + 'fn main(): Int = f();\n', 'f');
    const parameterRow = ty => ty.value0.value1;
    assert.equal(tailOf(parameterRow(letType(today, 0))), 'Hole');
    assert.equal(tailOf(parameterRow(letType(built, 0))), 'Rigid');
  });

// A6/A4: a constructor's own type keeps the declaration's one row
// argument, closed; a type read from an image (`id`'s instance) has
// none, so one body holds `Thunk` with one row and with zero.
test('R031 (2) pinned: an image\'s data type loses its row arguments',
  () => {
    const { built, today } = bodies('type Thunk(...e) = '
      + 'Thunk(Unit -> Int with ...e);\nfn id(x: a): a = x;\n'
      + 'fn f(): Int = {\n  let t = Thunk(fn(u: Unit) => 1);\n'
      + '  let s = id(t);\n  0\n};\nfn main(): Int = f();\n', 'f');
    const rowCount = ty => ty.value2.length;
    assert.deepEqual([rowCount(letType(today, 0)),
      rowCount(letType(today, 1))], [1, 1]);
    assert.deepEqual([rowCount(letType(built, 0)),
      rowCount(letType(built, 1))], [1, 0]);
  });
