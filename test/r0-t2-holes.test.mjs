import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';

// Tranche 2 Task 5 (design §C.3): `numbering` is the map `holes`
// renames by, first occurrence over `foldTypes`' walk (an expression's
// type, its instantiation, then its arguments). Fixture-level.
const Map = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const Open = await load('Domain.Checked.Internal');
const Core = await load('Domain.Type.Core');
const Row = await load('Domain.Row');
const Maybe = await load('Data.Maybe');
const Holes = await load('Features.Check.Holes');
const span = { start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 2, offset: 1 } };
const hole = meta => new Core.TVar(new Open.Hole(meta));
const pure = new Row.Row([], Maybe.Nothing.value);
const expr = (ty, node) => new Open.Expr({ ty, span, node });
const call = (ty, instantiation) =>
  expr(ty, new Open.Call(0, instantiation, []));
const pairs = map => Map.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
// Metas meet in the order 9, 3, 7 (the type, then the instantiation).
const body = call(new Core.TFun(hole(9), pure, hole(3)),
  [hole(7), hole(9)]);

test('numbering is first occurrence', () => {
  assert.deepEqual(pairs(Holes.numbering(body)),
    [[3, 1], [7, 2], [9, 0]]);
});

test('numbering is empty for a body without holes', () => {
  assert.deepEqual(pairs(Holes.numbering(call(Core.TInt.value, []))), []);
});

test('holes uses numbering', () => {
  const renamed = call(new Core.TFun(hole(0), pure, hole(1)),
    [hole(2), hole(0)]);
  assert.deepEqual(JSON.parse(JSON.stringify(Holes.holes(body))),
    JSON.parse(JSON.stringify(renamed)));
});
