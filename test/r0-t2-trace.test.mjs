import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { exprAt, sources, spanOf, traceCases }
  from './r0-t2-trace-cases.mjs';

// Tranche 2 Task 6 (design §C, Task 3c; dossier §18.155 (3), (4)): the
// live-value trace `recheck` returns, resolved and renumbered with the
// body. Fixture-level.
const cases = await traceCases(load);
const { traced, metasInOrder, bodyHoleCount, Core } = cases;
const Trace = await load('Features.Check.Trace');
const Maps = await load('Data.Map.Internal');
const Row = await load('Domain.Row');
const { Nothing } = await load('Data.Maybe');
const { unfoldableArray } = await load('Data.Unfoldable');
const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
const named = value => value.constructor.name;
const only = (map, key) => {
  const list = map.get(key);
  assert.equal(list?.length, 1, `one entry at ${key}`);
  return list[0];
};

test("a call's slots are its instance metas", () => {
  const f = traced(sources.slots, 'f');
  const pick = only(f.uses, spanOf(sources.slots, 'pick(1, true)'));
  assert.deepEqual(pick.slots.map(slot =>
    [named(slot), named(slot.value0)]),
  [['TypeSlot', 'TInt'], ['TypeSlot', 'TBool'], ['RowSlot', 'Row']]);
  // A row variable's slot is its instance row, read as a row: `run`'s
  // `e` reads `one`'s row (Log); its second variable is unconstrained.
  const g = traced(sources.slots, 'g');
  const run = only(g.uses, spanOf(sources.slots, 'run(one)'));
  assert.deepEqual(run.slots.map(named), ['RowSlot', 'RowSlot']);
  assert.deepEqual(run.slots[0].value0.value0.map(label =>
    named(label.value0)), ['UserEffect']);
});

test('a partial use keeps its dropped stages', () => {
  const part = traced(sources.slots, 'part');
  const add = only(part.uses, spanOf(sources.slots, 'add(1)'));
  assert.equal(add.fields.length, 2);
  assert.equal(add.stages.length, 1);
  assert.equal(add.stages[0].value0.length, 0);
});

test('applied rows keyed by argument', () => {
  assert.deepEqual(cases.appliedWrong(), []);
});

test("a pipe's row is keyed by its left operand", () => {
  const item = traced(sources.slots, 'piped');
  const start = Number(spanOf(sources.slots, '1 |> inc').split('-')[0]);
  const left = `${start}-${start + 1}`;
  assert.deepEqual([...item.piped.keys()], [left]);
  assert.equal(only(item.piped, left).value0.length, 1);
  assert.equal(item.applied.size, 0);
});

test('trace metas renumber with the body', () => {
  assert.deepEqual(cases.renumberWrong(), []);
});

// Body metas keep the body's numbers; every other meta takes the next
// number in first-occurrence order over the stated order.
const extensionWrong = item => {
  const count = bodyHoleCount(item);
  let next = count;
  const seen = new Set();
  for (const meta of metasInOrder(item)) {
    if (meta < count || seen.has(meta)) continue;
    if (meta !== next) return `meta ${meta} where ${next} was next`;
    seen.add(meta);
    next += 1;
  }
  return null;
};

test("extension numbers follow the body's", () => {
  const item = traced(sources.holes, 'f');
  assert.equal(extensionWrong(item), null);
  // `e`'s body has one hole (`Nil`'s); `add`'s dropped stage reaches
  // no node type, so its tail takes the first extension number.
  const e = traced(sources.holes, 'e');
  assert.equal(bodyHoleCount(e), 1);
  assert.equal(extensionWrong(e), null);
  const add = only(e.uses, spanOf(sources.holes, 'add(length(Nil))'));
  assert.equal(add.stages[0].value1.value0.value0, 1);
  for (const name of ['f', 'g', 'part', 'piped'])
    assert.equal(extensionWrong(traced(sources.slots, name)), null, name);
  for (const name of ['overTwo', 'inFirst', 'inExtra'])
    assert.equal(extensionWrong(traced(sources.over, name)), null, name);
});

// §18.155 (3): entries under one key are kept, in arrival order.
const span = (start, end) => ({ start: { line: 1, column: 1, offset: start },
  end: { line: 1, column: 1, offset: end } });
const useOf = result => ({ slots: [], marks: [], opened: Nothing.value,
  stages: [], fields: [], result });
const pure = new Row.Row([], Nothing.value);
// `finish` takes the declaration's row since the entry-tail ruling; a
// closed one here.
const finished = trace => Trace.finish(ty => ty)(Maps.empty)(
  new Row.Row([], Nothing.value))(trace);

test('entries under one key are kept in arrival order', () => {
  const uses = finished(Trace.recordUse(span(0, 1))(useOf(Core.TBool.value))(
    Trace.recordUse(span(0, 1))(useOf(Core.TInt.value))(Trace.emptyTrace)))
    .uses;
  assert.deepEqual(pairs(uses).map(([, list]) =>
    list.map(use => named(use.result))), [['TInt', 'TBool']]);
  const applied = finished(Trace.recordApplied(span(0, 9))(span(5, 6))(
    pure)(Trace.recordApplied(span(0, 9))(span(5, 6))(pure)(
    Trace.recordApplied(span(0, 9))(span(2, 3))(pure)(Trace.emptyTrace))))
    .applied;
  assert.deepEqual(pairs(applied).map(([key, list]) =>
    [key.value1.value0, list.length]), [[2, 1], [5, 2]]);
});

// Task 6b: the values `State` alone held, now traced under stable spans.
const labelCount = row => row.value0.length;

test("a clause entry's row is read under its key", () => {
  assert.deepEqual(cases.clauseWrong(), []);
  const item = traced(sources.state, 'handled');
  const entry = only(item.clauses,
    spanOf(sources.state, 'log(n) => Tick.tick()'));
  assert.equal(labelCount(entry.inference) > 0, true);
  assert.equal(named(entry.own), 'MarkMeta');
});

test("a defer's row is read under its value's span", () => {
  const item = traced(sources.state, 'deferred');
  assert.deepEqual([...item.deferrals.keys()],
    [spanOf(sources.state, 'Console.print(1)')]);
  const row = only(item.deferrals, spanOf(sources.state, 'Console.print(1)'));
  assert.equal(labelCount(row), 1);
});

test("a with's frame mark and current row", () => {
  const item = traced(sources.state, 'handled');
  const key = spanOf(sources.state,
    'with handler Log { log(n) => Tick.tick() } { Log.log(1) }');
  assert.deepEqual([...item.installations.keys()], [key]);
  const entry = only(item.installations, key);
  assert.equal(named(entry.frame), 'MarkMeta');
  assert.deepEqual(entry.current.value0.map(label => named(label.value0)),
    ['UserEffect']);
});

test('nested handlers keep distinct entries', () => {
  const item = traced(sources.state, 'nested');
  assert.equal(item.installations.size, 2);
  assert.equal(item.clauses.size, 2);
  for (const map of [item.installations, item.clauses])
    for (const list of map.values()) assert.equal(list.length, 1);
  const [outer, inner] = [...item.installations.values()].map(list =>
    list[0]);
  assert.notEqual(outer.frame.value0, inner.frame.value0);
});

test('state values renumber with the body and extend after it', () => {
  for (const name of ['handled', 'nested', 'deferred'])
    assert.equal(extensionWrong(traced(sources.state, name)), null, name);
});

const tailHole = row => row.value1.value0.value0;

test('a state value renumbers a meta shared with the body', () => {
  // `lam`'s `with` is installed in the lambda's row: its current row's
  // tail is the body's hole in the lambda's arrow.
  const lam = traced(sources.shared, 'lam');
  const lambda = exprAt(lam.found.function.body, spanOf(sources.shared,
    'fn(h: Handler(Log)) => with h { Log.log(1) }'));
  const [entry] = [...lam.installations.values()][0];
  assert.equal(tailHole(entry.current), tailHole(lambda.ty.value1));
  assert.ok(tailHole(entry.current) < bodyHoleCount(lam));
  // `mk`'s handler value: R's tail is the body's hole, the clause's own
  // row reaches no node type and takes the first extension number.
  const mk = traced(sources.shared, 'mk');
  const clause = only(mk.clauses, spanOf(sources.shared, 'log(n) => ()'));
  assert.equal(bodyHoleCount(mk), 1);
  assert.equal(tailHole(clause.inference), 0);
  assert.equal(tailHole(clause.row), 1);
  for (const item of [lam, mk]) assert.equal(extensionWrong(item), null);
});

test("the declaration's row is renumbered with the trace", async () => {
  const { readFileSync } = await import('node:fs');
  const root = new URL('..', import.meta.url);
  const item = traced(readFileSync(new URL('examples/services.wxw', root),
    'utf8'), 'main');
  const tail = item.found.trace.row.value1.value0;
  assert.equal(named(tail), 'Hole');
  assert.ok(tail.value0 >= 0);
  for (const [, list] of pairs(item.found.trace.installations))
    for (const entry of list)
      assert.equal(entry.current.value1.value0.value0, tail.value0);
  // `recheck`'s checked row itself keeps the raw meta.
  assert.notEqual(item.found.function.row.value1.value0.value0, tail.value0);
});
