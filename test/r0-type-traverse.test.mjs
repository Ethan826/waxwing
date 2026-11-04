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

// The agreement check's own must-fail case: a planted traversal that
// skips label arguments (it traverses the type with every label's
// arguments dropped) disagrees.
const strip = ty => {
  if (ty instanceof Core.TFun)
    return new Core.TFun(strip(ty.value0), stripRow(ty.value1),
      strip(ty.value2));
  if (ty instanceof Core.TData)
    return new Core.TData(ty.value0, ty.value1.map(strip),
      ty.value2.map(stripRow));
  if (ty instanceof Core.THandler)
    return new Core.THandler(stripLabel(ty.value0), {
      inference: stripRow(ty.value1.inference),
      clauses: ty.value1.clauses instanceof cases.Just
        ? new cases.Just(stripRow(ty.value1.clauses.value0))
        : ty.value1.clauses });
  if (ty instanceof Core.TRecord)
    return new Core.TRecord({ fields: ty.value0.fields.map(field =>
      new cases.Tuple(field.value0, strip(field.value1))),
    tails: ty.value0.tails });
  return ty;
};
const stripLabel = label => new Row.Label(label.value0, [], label.value2);
const stripRow = row => new Row.Row(row.value0.map(stripLabel), row.value1);

test('a planted traversal dropping label arguments disagrees', () => {
  const dropping = ty => traversed(strip(ty));
  assert.ok(disagreements(dropping).length > 0);
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
