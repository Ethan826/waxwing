import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';

// R0 amin tranche 1, Task 19 (BACKLOG R032): the declaration's own
// signature, marked as declared, is recorded in `effects.signature`,
// also when a handler type is written only there and no node uses it.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');

const prelude = 'effect Log { fn log(n: Int): Unit; }; '
  + 'type Job(a) = Job(a); ';

const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(n => [n, shape(value[n])]))
    : { [value.constructor.name]: Object.keys(value)
      .map(n => shape(value[n])) };
};

const signatureOf = (source, name) => {
  const program = resolved(source + ' fn main(): Unit = ();');
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  const result = Generate.generate(tables)(signatures)(decl);
  assert.equal(result.constructor.name, 'Right');
  const fields = Recorded.fields(Elaborating.problem(result.value0));
  return { effects: fields.effects, sig: shape(fields.effects.signature) };
};

const handlerOf = ty => ty.MHandler;

test('a signature-only handler declaration records its signature', () => {
  const { sig } = signatureOf(prelude
    + 'fn use(h: Handler(Log with Fail(Job(Int)))): Int = 0;', 'use');
  assert.equal(sig.parameters.length, 1);
  const [label, rows] = handlerOf(sig.parameters[0]);
  assert.deepEqual(label.mark, { Written: [{ FixedM: [] }] });
  assert.deepEqual(rows.clauses, { Nothing: [] });
  const [fail] = rows.inference.labels;
  assert.deepEqual(fail.mark, { Written: [{ FixedN: [] }] });
  assert.ok('MData' in fail.args[0], 'Fail carries Job(Int)');
  assert.deepEqual(sig.result, { MBase: [{ IntBase: [] }] });
});

test('the signature names no fresh variable and no position', () => {
  const { effects, sig } = signatureOf(prelude
    + 'fn use(h: Handler(Log)): Int = 0;', 'use');
  const text = JSON.stringify(sig);
  assert.ok(!text.includes('EffFresh') && !text.includes('"At"'), text);
  assert.equal(effects.flexEff.length, 0);
  assert.equal(effects.positions.length, 0);
});

test('every declaration records its signature, main included', () => {
  const { sig } = signatureOf(prelude, 'main');
  assert.deepEqual(sig.parameters, []);
  assert.deepEqual(sig.result, { MBase: [{ UnitBase: [] }] });
});
