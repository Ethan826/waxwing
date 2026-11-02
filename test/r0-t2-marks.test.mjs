import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { marksCases, sources } from './r0-t2-marks-cases.mjs';

// Tranche 2 Task 9 (statements §2, §5; design §C.8, §E, §F): least mark
// terms over the live mark graph, and the recorded mark positions read
// back through them. Store-level cases build a mark store by hand;
// program cases read the final checker state's store. Fixture-level.
const cases = await marksCases(load);
const { store, mark, termIn, live, read, named, positionsText } = cases;
const { N, M, rigid, meta } = mark;

test('shared meta, one term', () => {
  const given = store([[-1, meta(-2)], [-3, meta(-2)]], [[M, meta(-3)]]);
  assert.deepEqual([-1, -2, -3].map(at => termIn(given, meta(at))),
    ['M', 'M', 'M']);
  const item = live(sources.annotations, 'implicitRow');
  const found = read(item);
  assert.equal(named(found), 'Right');
  const terms = new Set(positionsText(found.value0)
    .filter(text => /^(Annotation|Literal)/.test(text))
    .map(text => text.split(':')[1]));
  assert.equal(terms.size, 1, 'the annotation and the literal share a term');
});

test('an unconstrained mark meta reads N', () => {
  assert.equal(termIn(store([], []), meta(42)), 'N');
  assert.equal(termIn(store([], [[meta(-1), M]]), meta(-1)), 'N');
  assert.equal(termIn(store([[-1, meta(-2)]], []), meta(-1)), 'N');
});

test('the rigid case J {k}', () => {
  assert.equal(termIn(store([], [[rigid('k'), meta(-1)]]), meta(-1)),
    'J{k}');
  assert.equal(termIn(store([], [[rigid('k'), meta(-1)],
    [rigid('j'), meta(-2)], [meta(-2), meta(-1)]]), meta(-1)), 'J{j,k}');
  assert.equal(termIn(store([], [[rigid('k'), meta(-1)], [M, meta(-1)]]),
    meta(-1)), 'M');
  // A class holding a constant keeps it, whatever reaches it.
  assert.equal(termIn(store([[-1, rigid('k')]], [[M, meta(-1)]]),
    meta(-1)), 'J{k}');
  // Live: a `with` under a `nofail(k) Log` row; its frame reads J {k}.
  const item = live(sources.rigidFrame, 'g');
  assert.deepEqual(positionsText(read(item).value0),
    ['Frame:J{k}', 'Literal:N']);
  assert.ok(cases.edgesHold(item.store));
});

test("FX008's §7a trace: the honest x is M and is refused", () => {
  // E2 at the `defer` (the declared plain Log into x) and E6's demand.
  const graph = store([], [[M, meta(-1)], [meta(-1), N]]);
  assert.equal(termIn(graph, meta(-1)), 'M');
  assert.equal(cases.edgesHold(graph), false);
  // The forged x = N fails E2's edge M ⊑ N.
  const forged = store([[-1, N]], [[M, meta(-1)], [meta(-1), N]]);
  assert.equal(termIn(forged, meta(-1)), 'N');
  assert.equal(cases.edgesHold(forged), false);
  // The control (`nofail Log`), checked live: x reads N, every edge holds.
  const item = live(sources.cleanup, 'work');
  const rows = cases.rowsOf(item);
  assert.equal(named(rows), 'Right');
  const marks = cases.pairs(rows.value0).flatMap(([, row]) =>
    row.labels.map(label => cases.termText(label.mark)));
  assert.ok(marks.length > 0 && marks.every(text => text === 'N'),
    JSON.stringify(marks));
  assert.ok(cases.edgesHold(item.store));
});

test('Fail and Console read as N, payload and effect kept', () => {
  const item = live(sources.handlers, 'failing');
  const rows = cases.rowsOf(item);
  assert.equal(named(rows), 'Right');
  const labels = cases.pairs(rows.value0).flatMap(([, row]) => row.labels);
  const fail = labels.find(label => named(label.effect) === 'FailEffect');
  assert.equal(cases.termText(fail.mark), 'N');
  assert.deepEqual(fail.args.map(arg => `${named(arg)}:${named(
    arg.value0)}`), ['PBase:TextBase']);
  const deferred = live(sources.handlers, 'deferred');
  const consoles = cases.pairs(cases.rowsOf(deferred).value0).flatMap(
    ([, row]) => row.labels).filter(label =>
    named(label.effect) === 'ConsoleEffect');
  assert.ok(consoles.length > 0);
  assert.ok(consoles.every(label => cases.termText(label.mark) === 'N'));
  // No recorded position sits on a Fail or Console label.
  assert.deepEqual(positionsText(read(item).value0), ['Literal:M']);
});
