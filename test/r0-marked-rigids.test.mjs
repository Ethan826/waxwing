import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';

// R0 amin tranche 1, Task 3: Signature.purs records the declaration's
// `nofail(k)` names (`rigidMarks`) and its effect-row variables
// (`effectRigids`, the implicit ambient one included), once each.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');

const source = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Int; }; '
  + 'fn f(x: a, g: Unit -> Unit with nofail(k) Log + ...e, '
  + 'h: Unit -> Unit with nofail(j) Ask + nofail(k) Log): '
  + 'a with nofail(k) Log + ...e = { g(()); x }; '
  + 'fn main(): Unit = ();';

const effectsOf = name => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  const result = Generate.generate(tables)(signatures)(decl);
  assert.equal(result.constructor.name, 'Right');
  return Recorded.fields(Elaborating.problem(result.value0)).effects;
};

test('rigidMarks are the declaration\'s nofail(k) names, once each', () => {
  assert.deepEqual(effectsOf('f').rigidMarks, ['k', 'j']);
  assert.deepEqual(effectsOf('main').rigidMarks, []);
});

test('effectRigids are the declaration\'s effect-row variables', () => {
  // `x: a` is VarId 0 (a type); `...e` is 1 and the ambient row 2.
  assert.deepEqual(effectsOf('f').effectRigids, [1, 2]);
  assert.deepEqual(effectsOf('main').effectRigids, [0]);
});
