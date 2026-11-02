import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { sources, spanOf, traceCases } from './r0-t2-trace-cases.mjs';

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
const finished = trace => Trace.finish(ty => ty)(Maps.empty)(trace);

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
