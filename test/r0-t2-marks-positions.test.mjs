import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { marksCases, sources } from './r0-t2-marks-cases.mjs';
import { shape } from './r0-t2-rows-cases.mjs';

// Tranche 2 Task 9 (design §C.1, §C.8): each kind of recorded mark
// position read at its live sources through the least terms, the
// domain exactly the recorded positions, and the read's faults: no
// reading, two readings apart, an entry met twice. Terms are the
// observed ones (fixture-level), each a least term of statements §5.
const cases = await marksCases(load);
const { live, read, named, positionsText, positionsOf, remap, mark } = cases;

const readText = (source, name) => {
  const found = read(live(source, name));
  assert.equal(named(found), 'Right', `${name}: ${named(found.value0)}`);
  return positionsText(found.value0);
};

test('Literal and Frame: a handler literal installed by `with`', () => {
  assert.deepEqual(readText(sources.handlers, 'handled'),
    ['Frame:M', 'Literal:N']);
});

test('Annotation: a lambda parameter of handler type', () => {
  assert.deepEqual(readText(sources.handlers, 'annotated'),
    ['Frame:N', 'Annotation:N']);
});

test('Opened: a handler argument opened at a call', () => {
  assert.deepEqual(readText(sources.famw, 'main'), ['Literal:M', 'Opened:M']);
});

test("Instantiated: a callee's nofail(k) at a use", () => {
  assert.deepEqual(readText(sources.aroundBoth, 'main'), ['Frame:N',
    'Frame:M', 'Literal:N', 'Literal:M', 'Instantiated:N',
    'Instantiated:M']);
});

test('the domain is the recorded positions', () => {
  for (const [source, name] of [[sources.handlers, 'handled'],
    [sources.handlers, 'annotated'], [sources.famw, 'main'],
    [sources.aroundBoth, 'main'], [sources.aroundBoth, 'around']]) {
    const item = live(source, name);
    const text = position => JSON.stringify(shape(position));
    const recorded = new Set(positionsOf(item).map(text));
    const keys = cases.pairs(read(item).value0).map(([key]) => text(key));
    assert.deepEqual(new Set(keys), recorded, name);
    assert.equal(keys.length, recorded.size, name);
  }
});

const faultOf = (item, trace) => {
  const found = read(item, trace);
  return named(found) === 'Left' ? named(found.value0) : 'Right';
};

test('a frame no source reads is UnreadPosition', () => {
  const item = live(sources.handlers, 'handled');
  const none = { ...item.trace, installations: remap(
    item.trace.installations, () => []) };
  assert.equal(faultOf(item, none), 'UnreadPosition');
});

test('a clause own apart from the literal is PositionApart', () => {
  const item = live(sources.handlers, 'handled');
  const planted = { ...item.trace, clauses: remap(item.trace.clauses,
    entries => entries.map(entry => ({ ...entry, own: mark.M }))) };
  assert.equal(faultOf(item, planted), 'PositionApart');
});

test('an unmarked reading is UnreadPosition', () => {
  const item = live(sources.handlers, 'handled');
  const planted = { ...item.trace, installations: remap(
    item.trace.installations, entries => entries.map(entry => ({ ...entry,
      frame: mark.U }))) };
  assert.equal(faultOf(item, planted), 'UnreadPosition');
});

test('a clause entry met twice is a Clash', () => {
  const item = live(sources.handlers, 'handled');
  const twice = { ...item.trace, clauses: remap(item.trace.clauses,
    entries => [...entries, ...entries]) };
  assert.equal(faultOf(item, twice), 'Clash');
});

test('a literal with no clause entry is read from its node type', () => {
  const item = live(sources.handlers, 'handled');
  const none = { ...item.trace, clauses: remap(item.trace.clauses,
    () => []) };
  assert.deepEqual(positionsText(read(item, none).value0),
    ['Frame:M', 'Literal:N']);
});

test('a position on a Console label not N is refused, not forced', async () => {
  const { marksChecks } = await import('./r0-t2-marks-checks.mjs');
  // con2 reads Frame:N live; with its frame planted as a meta whose class
  // reads M the read is UnreadPosition, and N when the class reads N.
  assert.deepEqual((await marksChecks(load)).consoleWrong(), []);
});
