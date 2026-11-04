import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { traverseCases } from './r0-type-traverse-cases.mjs';
import { sources, traceCases } from './r0-t2-trace-cases.mjs';

// R036 (2) (dossier §18.161 (2)): Domain.Type.Traverse `traverseTy`, a
// renaming that may fail. Its type rules out an unseen raw variable in
// the output (parametricity); that it visits every variable is what
// these agreement checks test, over the fixed grammar of
// test/r0-type-traverse-cases.mjs and over the trace fixtures' types.
const cases = await traverseCases(load);
const { Core, Row, Checked, Either, Traverse, traversed, agrees,
  disagreements } = cases;
const trace = await traceCases(load);

test('traverseTy agrees with rename on the generated grammar', () => {
  assert.deepEqual(disagreements(traversed).length, 0);
});

// Every traced type and row of the trace fixtures, rows as one-arrow
// types (as `extended` walks them).
const tracedTypes = () => {
  const names = { slots: ['f', 'g', 'part', 'piped'], holes: ['f', 'e'],
    state: ['handled', 'nested', 'deferred'], shared: ['lam', 'mk'],
    over: ['overTwo', 'inFirst', 'inExtra'] };
  return Object.entries(names).flatMap(([source, list]) => list.flatMap(
    name => trace.typesOf(trace.traced(sources[source], name))));
};

test('traverseTy agrees with rename on the traced fixtures', () => {
  const types = tracedTypes();
  assert.ok(types.length > 50, `${types.length} traced types`);
  assert.deepEqual(types.filter(ty => !agrees(traversed, ty)).length, 0);
});

// The agreement check's own must-fail cases: planted traversals that
// each skip one part (they traverse the type with that part dropped)
// must disagree: label arguments, record tails, a handler's clause row,
// data rows, data arguments, a row's tail variable.
const { Nothing, Just, Tuple } = cases;
const planted = drop => {
  const label = each => new Row.Label(each.value0, drop.labelArgs ? []
    : each.value1.map(ty), each.value2);
  const row = each => new Row.Row(each.value0.map(label), drop.rowTail
    ? Nothing.value : each.value1);
  const ty = each => {
    if (each instanceof Core.TFun)
      return new Core.TFun(ty(each.value0), row(each.value1),
        ty(each.value2));
    if (each instanceof Core.TData)
      return new Core.TData(each.value0, drop.dataArgs ? []
        : each.value1.map(ty), drop.dataRows ? [] : each.value2.map(row));
    if (each instanceof Core.THandler)
      return new Core.THandler(label(each.value0), {
        inference: row(each.value1.inference),
        clauses: drop.clauseRow || each.value1.clauses instanceof Nothing
          ? Nothing.value : new Just(row(each.value1.clauses.value0)) });
    if (each instanceof Core.TRecord)
      return new Core.TRecord({ fields: each.value0.fields.map(field =>
        new Tuple(field.value0, ty(field.value1))),
      tails: drop.recordTails ? [] : each.value0.tails });
    return each;
  };
  return each => traversed(ty(each));
};

test('planted traversals dropping one part each disagree', () => {
  for (const part of ['labelArgs', 'recordTails', 'clauseRow', 'dataRows',
    'dataArgs', 'rowTail'])
    assert.ok(disagreements(planted({ [part]: true })).length > 0, part);
  assert.equal(disagreements(planted({})).length, 0);
});

test('an unnumbered meta is Left, never kept raw', () => {
  const found = Traverse.traverseTy(Either.applicativeEither)(
    Checked.ordOpen)(open => (open instanceof Checked.Hole
    && open.value0 === 4 ? new Either.Left('unnumbered 4')
    : new Either.Right(open)))(new Core.TFun(new Core.TVar(
    new Checked.Hole(1)), new Row.Row([], new cases.Just(
    new Checked.Hole(4))), Core.TInt.value));
  assert.ok(found instanceof Either.Left);
  assert.equal(found.value0, 'unnumbered 4');
});

const spineOf = depth => {
  let ty = new Core.TVar(new Checked.Hole(0));
  for (let at = 0; at < depth; at += 1)
    ty = new Core.TFun(new Core.TVar(new Checked.Hole(at % 5)),
      new Row.Row([], new cases.Just(new Checked.Hole(at % 3))), ty);
  return ty;
};

test('a 1,000-deep spine does not overflow, nor a 100,000-deep one', () => {
  assert.ok(agrees(traversed, spineOf(1000)));
  assert.ok(traversed(spineOf(100000)) instanceof Either.Right);
});
