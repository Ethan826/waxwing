import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { rowsCases, sources } from './r0-t2-rows-cases.mjs';

// Tranche 2 Task 8, continued: `main`'s entry tail on the trace's
// numbering (read from the trace's declaration row), and the label
// matching's refusal to choose (§18.155 (3)). Fixture-level.
const cases = await rowsCases(load);
const { live, read, varsOf, valueOf, named } = cases;

const rows = (source, name) => {
  const item = live(source, name);
  const found = read(item);
  assert.equal(named(found), 'Right', `${name}: ${named(found.value0)}`);
  return { item, map: found.value0 };
};

// The hole numbers in a package row: its tail's, and its labels'.
const holesIn = value => {
  if (value === null || typeof value !== 'object') return [];
  const own = named(value) === 'PTailHole' ? [value.value0] : [];
  return [...own, ...Object.values(value).flatMap(holesIn)];
};
const entryHole = (item, map) => {
  const [entry] = varsOf(item, 'EntryTail', null);
  const value = valueOf(map, entry);
  assert.equal(named(value.tail.value0), 'PTailHole');
  return value.tail.value0.value0;
};

test("main's entry tail shares the with installations' hole", () => {
  const { item, map } = rows(sources.services, 'main');
  const hole = entryHole(item, map);
  const currents = cases.pairs(item.trace.installations).flatMap(([, list]) =>
    list.map(entry => entry.current.value1.value0.value0));
  assert.equal(currents.length, 3);
  assert.deepEqual([...new Set(currents)], [hole]);
  // The checked row keeps its raw meta, apart from the trace's number.
  assert.notEqual(item.checked.row.value1.value0.value0, hole);
});

test('a lone entry tail takes its own extension number', () => {
  const { item, map } = rows(sources.lone, 'main');
  const hole = entryHole(item, map);
  assert.ok(hole >= 0);
  const others = cases.pairs(map).filter(([key]) =>
    named(key.value1) !== 'EntryTail').flatMap(([, value]) => holesIn(value));
  assert.ok(others.length > 0, 'another hole in the package');
  assert.ok(!others.includes(hole), `${hole} not in ${others}`);
});

// §18.155 (3): a recorded Fail label whose payload head is unknown, met
// by two free live Fail labels of distinct keys, takes neither.
test('an unknown Fail head with two candidates matches none', async () => {
  const Match = await load('Features.Check.Strategy.ReadBack.EffectMatch');
  const E = await load('Domain.Recorded.Effect');
  const O = await load('Domain.Recorded.Origin');
  const Atom = await load('Domain.Recorded.Atom');
  const Core = await load('Domain.Type.Core');
  const Checked = await load('Domain.Checked.Internal');
  const { Just } = await load('Data.Maybe');
  const { Row } = cases;
  const variable = new E.EffFresh({ root: O.InBody.value, steps: [] },
    E.EffectOf.value);
  const recorded = { labels: [{ effect: Row.FailEffect.value,
    args: [new E.MVar(new Atom.RigidVar(0))],
    mark: new E.Written(E.FixedN.value) }], tail: new Just(variable) };
  const fail = ty => new Row.Label(Row.FailEffect.value, [ty],
    Row.Unmarked.value);
  const live = labels => new Row.Row(labels, new Just(new Checked.Hole(1)));
  const two = Match.matchRow(recorded)(live([fail(Core.TText.value),
    fail(Core.TInt.value)]));
  assert.equal(two.length, 0);
  const one = Match.matchRow(recorded)(live([fail(Core.TText.value)]));
  assert.equal(one.length, 1);
  assert.equal(one[0].value1.value0.length, 0);
});
