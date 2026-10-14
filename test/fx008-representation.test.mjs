// FX008 Task 2: the mark field, the two handler rows, and stripping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Just, Nothing } from '../output/Data.Maybe/index.js';
import {
  Label, MarkMeta, MarkVariable, NoFail, Plain, Row, Unmarked, UserEffect
} from '../output/Domain.Row/index.js';
import {
  TFun, THandler, TInt, TUnit
} from '../output/Domain.Type/index.js';
import { Right } from '../output/Data.Either/index.js';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { check } from '../output/Features.Check/index.js';
import { markVariables,
  stripMarks } from '../output/Domain.Type.Marks/index.js';
import { foldTypes } from '../output/Features.Check.Walk/index.js';

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

test('stripMarks erases every mark and sets C to Nothing', () => {
  const handler = THandler.create(labelOf(4, MarkMeta.create(1)))(
    { inference: marked, clauses: Just.create(clauses) });
  const arrow = TFun.create(handler)(marked)(TUnit.value);
  const stripped = stripMarks(arrow);
  assert.ok(stripped instanceof TFun);
  assert.ok(unmarkedLabels(stripped.value1));
  const inner = stripped.value0;
  assert.ok(inner instanceof THandler);
  assert.equal(inner.value0.value2, Unmarked.value);
  assert.ok(unmarkedLabels(inner.value1.inference));
  assert.ok(inner.value1.clauses instanceof Nothing);
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


// A handler-typed operation parameter, a constructor field, a handler
// literal and a `with` in one program (review I1).
const source = 'effect Clock { fn now(): Int; }; '
  + 'effect Tick { fn tick(h: Handler(Clock)): Handler(Clock); }; '
  + 'type Box = Box(Handler(Clock)); '
  + 'fn run(h: Handler(Clock), f: Unit -> Unit with Clock): Int '
  + '= with h { Clock.now() }; '
  + 'fn main(): Int = with handler Clock { now() => 42 } { Clock.now() };';

// Every label below a type has Unmarked, and every handler type Nothing.
const stripped = ty => {
  if (ty instanceof TFun) return stripped(ty.value0) && strippedRow(ty.value1)
    && stripped(ty.value2);
  if (ty instanceof THandler) {
    return ty.value0.value2 === Unmarked.value
      && ty.value0.value1.every(stripped)
      && strippedRow(ty.value1.inference)
      && ty.value1.clauses instanceof Nothing;
  }
  if (ty.value1 === undefined) return true;
  return ty.value1.every(stripped) && ty.value2.every(strippedRow);
};
const strippedRow = row => row.value0.every(label =>
  label.value2 === Unmarked.value && label.value1.every(stripped));
const bodyTypes = body =>
  foldTypes(found => _ => ty => [...found, ty])([])(body);

test('Check strips marks from every body, operation and field', () => {
  const resolved = resolve(parse(source).value0);
  assert.ok(resolved instanceof Right, JSON.stringify(resolved));
  const written = resolved.value0.functions[0].parameters[0].ty;
  assert.ok(written instanceof THandler);
  assert.equal(written.value0.value2, Plain.value);
  const checked = check(resolved.value0);
  assert.ok(checked instanceof Right, JSON.stringify(checked));
  const program = checked.value0;
  const run = program.functions[0];
  assert.ok(run.parameters.every(stripped));
  assert.ok(strippedRow(run.row));
  for (const declared of program.functions) {
    const types = bodyTypes(declared.body);
    assert.ok(types.length > 0);
    assert.ok(types.every(stripped), declared.name);
  }
  const operation = program.effects[1].operations[0];
  assert.ok(operation.parameters.every(parameter => stripped(parameter.ty)));
  assert.ok(stripped(operation.result));
  assert.ok(program.ctors[0].fields.length === 1);
  assert.ok(program.ctors[0].fields.every(stripped));
});

// An arrow's parameter and result come before its own row.
test('markVariables lists distinct names by first occurrence', () => {
  const variable = name => labelOf(5, MarkVariable.create(name));
  const inner = THandler.create(variable('b'))({
    inference: rowOf([variable('a')]), clauses: Nothing.value });
  const outer = THandler.create(variable('a'))({
    inference: rowOf([variable('c'), labelOf(6, Plain.value)]),
    clauses: Nothing.value });
  const arrow = TFun.create(inner)(rowOf([variable('d')]))(outer);
  assert.deepEqual(markVariables([arrow, outer]), ['b', 'a', 'c', 'd']);
});
