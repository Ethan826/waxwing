import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load, resolved } from './r0-generate-support.mjs';
import { effectsOf } from './r0-effects-canonical.mjs';

// R0 amin tranche 1, Task 1: the effect problem's types, recorded
// empty (Task 19 adds `signature`: eleven keys). Contents are not
// asserted for generated problems, so a later
// task that fills `effects` never weakens these tests.
const Recorded = await load('Domain.Recorded');
const Effect = await load('Domain.Recorded.Effect');
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');

const keys = ['ambient', 'annotations', 'arities', 'effectRigids',
  'flexEff', 'instances', 'nodes', 'obligations', 'positions',
  'rigidMarks', 'signature'];

test('emptyEffects is empty', () => {
  assert.deepEqual(effectsOf(Effect.emptyEffects), {
    obligations: [], instances: [], annotations: [], nodes: [],
    rigidMarks: [], effectRigids: [], arities: [], ambient: [],
    flexEff: [], positions: [],
    signature: { parameters: [], row: { labels: [], tail: { Nothing: [] } },
      result: { MBase: [{ UnitBase: [] }] } } });
});

test('every generated declaration carries an effects record', () => {
  const program = resolved(readFileSync('examples/services.wxw', 'utf8'));
  const { tables, signatures } = Inputs.generationInputs(program);
  assert.ok(program.functions.length > 0);
  for (const decl of program.functions) {
    const result = Generate.generate(tables)(signatures)(decl);
    assert.equal(result.constructor.name, 'Right', decl.name);
    const problem = Elaborating.problem(result.value0);
    const { effects } = Recorded.fields(problem);
    assert.deepEqual(Object.keys(effects).sort(), keys, decl.name);
  }
});
