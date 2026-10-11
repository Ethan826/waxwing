// FX008 Task 3: instantiating a declaration's mark variables and giving a
// local annotation fresh marks (Features.Check.MarkUse).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Just, Nothing } from '../output/Data.Maybe/index.js';
import { Hole } from '../output/Domain.Checked.Internal/index.js';
import {
  Label, MarkMeta, MarkVariable, NoFail, Plain, Row, UserEffect
} from '../output/Domain.Row/index.js';
import { TFun, THandler, TInt, TUnit, TVar } from '../output/Domain.Type/index.js';
import { start } from '../output/Features.Check.Scheme/index.js';
import { instantiateMarks, localMarks } from '../output/Features.Check.MarkUse/index.js';

const labelOf = (effect, mark, args = []) =>
  Label.create(UserEffect.create(effect))(args)(mark);
const rowOf = (labels, tail = Nothing.value) => Row.create(labels)(tail);
const handlerOf = (mark, inference, clauses = Nothing.value) =>
  THandler.create(labelOf(9, mark))({ inference, clauses });
const at = next => ({ ...start, next });
const metaOf = mark => {
  assert.ok(mark instanceof MarkMeta, String(mark));
  return mark.value0;
};

test('instantiateMarks gives each name one fresh meta from next', () => {
  const found = instantiateMarks(['a', 'b'])(at(5));
  assert.equal(found.state.next, 7);
  assert.equal(metaOf(found.value(MarkVariable.create('a'))), 5);
  assert.equal(metaOf(found.value(MarkVariable.create('b'))), 6);
  assert.equal(found.value(MarkVariable.create('c')).value0, 'c');
  assert.equal(found.value(NoFail.value), NoFail.value);
  assert.equal(found.value(Plain.value), Plain.value);
});

test('instantiateMarks of no names leaves the state', () => {
  assert.equal(instantiateMarks([])(at(5)).state.next, 5);
});

test('localMarks replaces each Plain by its own fresh meta', () => {
  const row = rowOf([labelOf(1, Plain.value), labelOf(2, Plain.value),
    labelOf(3, NoFail.value), labelOf(4, MarkVariable.create('k'))]);
  const found = localMarks(at(10))(TFun.create(TInt.value)(row)(TUnit.value));
  const marks = found.value.value1.value0.map(label => label.value2);
  assert.deepEqual([metaOf(marks[0]), metaOf(marks[1])], [10, 11]);
  assert.equal(marks[2], NoFail.value);
  assert.equal(marks[3].value0, 'k');
  assert.equal(found.state.next, 12);
});

test('a handler type outside a handler row gets a clause row of its own', () => {
  const inference = rowOf([labelOf(1, Plain.value), labelOf(2, NoFail.value)],
    Just.create(new Hole(3)));
  const found = localMarks(at(10))(handlerOf(Plain.value, inference));
  const handler = found.value;
  assert.ok(handler instanceof THandler);
  assert.equal(metaOf(handler.value0.value2), 10);
  const [first, second] = handler.value1.inference.value0;
  assert.equal(metaOf(first.value2), 11);
  assert.equal(second.value2, NoFail.value);
  assert.ok(handler.value1.clauses instanceof Just);
  const clauses = handler.value1.clauses.value0;
  const [again, kept] = clauses.value0;
  assert.equal(metaOf(again.value2), 12, 'C has marks of its own');
  assert.equal(kept.value2, NoFail.value, 'a written mark is kept');
  assert.ok(clauses.value1 instanceof Just);
  assert.ok(clauses.value1.value0 instanceof Hole);
  assert.equal(clauses.value1.value0.value0, 13, 'C has a fresh tail');
  assert.equal(found.state.next, 14);
});

test('a handler type inside a handler row keeps no clause row', () => {
  const inner = handlerOf(Plain.value, rowOf([labelOf(5, Plain.value)]));
  const outer = handlerOf(Plain.value,
    rowOf([labelOf(1, Plain.value, [inner])]));
  const found = localMarks(at(0))(outer).value;
  assert.ok(found.value1.clauses instanceof Just);
  const copy = found.value1.clauses.value0.value0[0];
  const nested = found.value1.inference.value0[0].value1[0];
  assert.ok(nested.value1.clauses instanceof Nothing);
  assert.ok(nested.value1.inference.value0[0].value2 instanceof MarkMeta);
  // C keeps no label arguments (Task 7 ruling): its copy is bare.
  assert.equal(copy.value1.length, 0);
});

test('a handler type among the handled label arguments is outside a row', () => {
  const inner = handlerOf(Plain.value, rowOf([labelOf(5, Plain.value)]));
  const outer = THandler.create(labelOf(9, Plain.value, [inner]))(
    { inference: rowOf([]), clauses: Nothing.value });
  const found = localMarks(at(0))(outer).value;
  assert.ok(found.value0.value1[0].value1.clauses instanceof Just);
});

test('a handler type in an arrow parameter is outside a row', () => {
  const parameter = handlerOf(Plain.value, rowOf([labelOf(5, Plain.value)]));
  const found = localMarks(at(0))(
    TFun.create(parameter)(rowOf([]))(TVar.create(new Hole(0)))).value;
  assert.ok(found.value0.value1.clauses instanceof Just);
});
