import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';

// R0 amin tranche 1, Task 18 (BACKLOG R033): what a declaration use
// opens, as the live checker does (Check/DeclarationUse.purs
// `openedRow`; Check/MarkUse.purs `openHandlers`). A closed own row of a
// function, constructor or operation use gets the tail `⟨p, opened⟩`; at
// a function use a top-level handler parameter's label written M, and the
// result's written N, get `Opened p i` (i the parameter's index, the
// parameter count for the result). Every stage that names them reuses
// the instance's own.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value instanceof Maps.Leaf || value instanceof Maps.Node)
    return Maps.toUnfoldable(Unfoldable.unfoldableArray)(value)
      .map(pair => [shape(pair.value0), shape(pair.value1)]);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(n => [n, shape(value[n])]))
    : { [value.constructor.name]: Object.keys(value)
      .map(n => shape(value[n])) };
};

const prelude = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; effect Ask { fn ask(): Unit; }; '
  + 'type Box = Box(Int); '
  + 'fn mk(a: Handler(Log), b: Handler(Tick)): Handler(nofail Ask) '
  + 'with pure = handler Ask { ask() => () }; '
  + 'fn keep(a: Handler(nofail Log), b: Handler(Log) -> Unit, '
  + 'c: Handler(Console), d: Handler(Fail(Int))): Handler(Log) '
  + 'with pure = handler Log { log(n) => () }; '
  + 'fn open(a: Unit): Unit with ...e = (); '
  + 'fn one(n: Int): Int with pure = n; '
  + 'fn two(n: Int, m: Int): Int with pure = n; ';

const effectsOf = items => {
  const program = resolved(prelude + 'fn f(p: Handler(Log), '
    + 'q: Handler(Tick), r: Handler(Console), s: Handler(Fail(Int))): '
    + `Unit = { ${items.join('; ')}; () }; `
    + 'fn main(): Unit = ();');
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === 'f');
  const result = Generate.generate(tables)(signatures)(decl);
  assert.equal(result.constructor.name, 'Right');
  return shape(Recorded.fields(Elaborating.problem(result.value0)).effects);
};

const pathAt = item => ({ root: { InBody: [] }, steps: [
  { Named: ['Block'] }, { Named: ['items'] }, { Index: [item] },
  { Named: ['Let'] }, { Named: ['value'] }] });
const key = value => JSON.stringify(value);
const found = (pairs, item) => pairs.find(([path]) =>
  key(path) === key(pathAt(item)))[1];
const stagesOf = mty => {
  const stages = [];
  let rest = mty;
  while (rest.MArrow) {
    stages.push([rest.MArrow[0], rest.MArrow[1]]);
    rest = rest.MArrow[2];
  }
  return { stages, result: rest };
};
const opened = (item, index) => ({ At: [{ Opened: [pathAt(item), index] }] });
const markOf = mty => mty.MHandler[0].mark;
const openedTail = item => ({ Just: [{ EffFresh: [pathAt(item),
  { OpenedRow: [] }] }] });

test('three handler positions are distinct and reused across stages', () => {
  const effects = effectsOf(['let a = mk', 'let b = mk(p)',
    'let c = mk(p, q)']);
  const sig = found(effects.instances, 0);
  assert.deepEqual(sig.parameters.map(markOf), [opened(0, 0), opened(0, 1)]);
  assert.deepEqual(markOf(sig.result), opened(0, 2));
  const reference = stagesOf(found(effects.nodes, 0));
  assert.deepEqual(reference.stages.map(([parameter]) => markOf(parameter)),
    [opened(0, 0), opened(0, 1)]);
  assert.deepEqual(markOf(reference.result), opened(0, 2));
  const partial = stagesOf(found(effects.nodes, 1));
  assert.deepEqual(partial.stages.map(([parameter]) => markOf(parameter)),
    [opened(1, 1)]);
  assert.deepEqual(markOf(partial.result), opened(1, 2));
  assert.deepEqual(markOf(found(effects.nodes, 2)), opened(2, 2));
  const positions = effects.positions.filter(item => item.Opened);
  assert.equal(positions.length, 9);
  assert.equal(new Set(positions.map(key)).size, positions.length);
});

test('Console, Fail, deeper and wrongly marked labels stay as written', () => {
  const effects = effectsOf(['let a = keep', 'let b = open',
    'let c = keep(p, fn(h: Handler(Log)) => (), r, s)']);
  const sig = found(effects.instances, 0);
  const written = mark => ({ Written: [{ [mark]: [] }] });
  assert.deepEqual(markOf(sig.parameters[0]), written('FixedN'));
  assert.deepEqual(markOf(stagesOf(sig.parameters[1]).stages[0][0]),
    written('FixedM'));
  assert.deepEqual(sig.parameters.slice(2).map(markOf),
    [written('FixedN'), written('FixedN')]);
  assert.deepEqual(markOf(sig.result), written('FixedM'));
  assert.deepEqual(effects.positions.filter(item => item.Opened), []);
  const row = found(effects.instances, 1).row;
  assert.ok(row.tail.Just[0].EffFresh[1].EffInst, key(row));
});

test('a closed row is opened at reference, partial, call, ctor, operation',
  () => {
    const effects = effectsOf(['let a = one', 'let b = two(1)',
      'let c = one(1)', 'let d = Box(1)', 'let e = Log.log',
      'let g = Log.log(1)', 'let h = two']);
    const rows = [0, 1, 2, 3, 4, 5, 6].map(item =>
      found(effects.instances, item).row);
    rows.forEach((row, item) => assert.deepEqual(row.tail, openedTail(item),
      `use ${item}`));
    assert.deepEqual(rows[3].labels, []);
    assert.equal(rows[4].labels.length, 1);
    const last = item => stagesOf(found(effects.nodes, item)).stages.at(-1)[1];
    [0, 1, 4, 6].forEach(item => assert.deepEqual(last(item), rows[item]));
  });
