// FX008 Task 2: the mark field, the two handler rows, and stripping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Just, Nothing } from '../output/Data.Maybe/index.js';
import {
  Label, MarkMeta, NoFail, Plain, Row, Unmarked, UserEffect
} from '../output/Domain.Row/index.js';
import {
  TFun, THandler, TInt, TUnit
} from '../output/Domain.Type/index.js';
import { Right } from '../output/Data.Either/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';
import { stripMarks } from '../output/Domain.Type.Marks/index.js';

const labelOf = (effect, mark) =>
  Label.create(UserEffect.create(effect))([TInt.value])(mark);
const rowOf = labels => Row.create(labels)(Nothing.value);
const marked = rowOf([
  labelOf(0, NoFail.value),
  labelOf(1, Plain.value),
  labelOf(2, MarkMeta.create(7))
]);
const clauses = rowOf([labelOf(3, NoFail.value)]);
const unmarkedLabels = row => row.value0.every(
  label => label.value2 === Unmarked.value);

test('stripMarks erases every mark and C', () => {
  const handler = THandler.create(labelOf(4, MarkMeta.create(1)))(
    { inference: marked, clauses });
  const arrow = TFun.create(handler)(marked)(TUnit.value);
  const stripped = stripMarks(arrow);
  assert.ok(stripped instanceof TFun);
  assert.ok(unmarkedLabels(stripped.value1));
  const inner = stripped.value0;
  assert.ok(inner instanceof THandler);
  assert.equal(inner.value0.value2, Unmarked.value);
  assert.ok(unmarkedLabels(inner.value1.inference));
  assert.deepEqual(inner.value1.clauses, inner.value1.inference);
  assert.notDeepEqual(inner.value1.clauses, clauses);
});

test('stripMarks walks a 1,000-arrow spine', () => {
  const length = 1000;
  let spine = TUnit.value;
  for (let i = 0; i < length; i += 1) {
    spine = TFun.create(TInt.value)(marked)(spine);
  }
  let rest = stripMarks(spine);
  let seen = 0;
  for (; rest instanceof TFun; rest = rest.value2) {
    assert.ok(unmarkedLabels(rest.value1));
    seen += 1;
  }
  assert.equal(seen, length);
});

const source = 'effect Log { fn log(): Unit; }; '
  + 'fn run(h: Handler(Log), f: Unit -> Unit with Log): Unit with Log '
  + '= f(()); fn main(): Int = 0;';

test('Check strips marks from declarations and Resolve leaves Plain', () => {
  const resolved = resolve(parse(source).value0);
  assert.ok(resolved instanceof Right, JSON.stringify(resolved));
  const written = resolved.value0.functions[0].parameters[0].ty;
  assert.ok(written instanceof THandler);
  assert.equal(written.value0.value2, Plain.value);
  const checked = check(resolved.value0);
  assert.ok(checked instanceof Right, JSON.stringify(checked));
  const [handler, callback] = checked.value0.functions[0].parameters;
  assert.ok(handler instanceof THandler);
  assert.equal(handler.value0.value2, Unmarked.value);
  assert.ok(unmarkedLabels(callback.value1));
  assert.ok(unmarkedLabels(checked.value0.functions[0].row));
});
