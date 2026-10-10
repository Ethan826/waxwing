// FX008 Task 4: mark pairing, copies and extension labels in the three row
// modes (Features.Check.UnifyMark), and consumption without copies on a
// throwaway tail (Features.Check.Consume).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Right } from '../output/Data.Either/index.js';
import { Just, Nothing } from '../output/Data.Maybe/index.js';
import { Hole } from '../output/Domain.Checked.Internal/index.js';
import { Label, Plain, Row, UserEffect } from '../output/Domain.Row/index.js';
import { consumeLabels, consumeVia } from '../output/Features.Check.Consume/index.js';
import { Application } from '../output/Features.Check.Provenance/index.js';
import { start } from '../output/Features.Check.Scheme/index.js';
import { generator, choose } from './coverage-oracle.mjs';
import { directional, edgesIn, EqualMarks, IgnoreMarks, markBinding,
  marksOfBinding } from './fx008-mark-support.mjs';
import { anyPair, kind, label, resolveRow, row, rowMeta, unifiablePair, unifyIn }
  from './row-support.mjs';

const log = mark => ({ ...label(0), mark });
const console_ = label('console');
const run = (mode, stage, target) => {
  const found = unifyIn(mode, stage, target);
  assert.ok(found.subst, kind(found));
  return found.subst;
};

test('a matched pair records frame ⊑ assumption', () => {
  const subst = run(directional(), row([log(1)]), row([log(2)], rowMeta(10)));
  assert.deepEqual(edgesIn(subst),
    [{ lower: 2, upper: 1, reason: 'Assumed', effect: 0 }]);
});

test('a label added to the target gets a fresh mark below the stage\'s', () => {
  const subst = run(directional(), row([log(1)]), row([], rowMeta(10)));
  const [edge] = edgesIn(subst);
  assert.equal(edgesIn(subst).length, 1);
  assert.equal(edge.reason, 'Extended');
  assert.equal(edge.upper, 1);
  assert.notEqual(edge.lower, 1);
  assert.deepEqual(marksOfBinding(subst, 10), [edge.lower]);
});

test('a label copied into the stage tail gets a fresh mark above the frame\'s', () => {
  const subst = run(directional(), row([], rowMeta(11)), row([log(2)]));
  const [edge] = edgesIn(subst);
  assert.equal(edgesIn(subst).length, 1);
  assert.equal(edge.reason, 'Copied');
  assert.equal(edge.lower, 2);
  assert.notEqual(edge.upper, 2);
  assert.deepEqual(marksOfBinding(subst, 11), [edge.upper]);
});

test('no copy lands on a throwaway tail', () => {
  const subst = run(directional(11), row([], rowMeta(11)), row([log(2)]));
  assert.deepEqual(edgesIn(subst), []);
  assert.deepEqual(marksOfBinding(subst, 11), [2]);
});

test('a throwaway tail stays one after it is extended', () => {
  const target = row([log(2), { ...label(1), mark: 3 }]);
  const subst = run(directional(11), row([], rowMeta(11)), target);
  assert.deepEqual(edgesIn(subst), []);
});

test('Console stays nofail through copies and extensions', () => {
  const copied = run(directional(), row([], rowMeta(11)), row([console_]));
  assert.deepEqual(marksOfBinding(copied, 11), ['nofail']);
  const extended = run(directional(), row([console_]), row([], rowMeta(10)));
  assert.deepEqual(marksOfBinding(extended, 10), ['nofail']);
  assert.deepEqual([...edgesIn(copied), ...edgesIn(extended)], []);
});

test('equality binds mark metas and records no edge', () => {
  const subst = run(EqualMarks.value, row([log(1)]), row([log(2)]));
  assert.equal(markBinding(subst, 2), 1);
  assert.deepEqual(edgesIn(subst), []);
  const written = run(EqualMarks.value, row([log(3)]), row([log('nofail')]));
  assert.equal(markBinding(written, 3), 'nofail');
});

test('equality of two different written marks fails', () => {
  for (const [one, other] of [['nofail', 'plain'], ['plain', 'nofail'],
    ['nofail', { variable: 'k' }]]) {
    const found = unifyIn(EqualMarks.value, row([log(one)]), row([log(other)]));
    assert.equal(kind(found), 'RowPayload');
  }
  const same = unifyIn(EqualMarks.value, row([log('nofail')]), row([log('nofail')]));
  assert.ok(same.subst);
});

test('ignoring marks gives fresh marks and no edge', () => {
  const matched = run(IgnoreMarks.value, row([log('nofail')]), row([log('plain')]));
  assert.deepEqual(edgesIn(matched), []);
  const added = run(IgnoreMarks.value, row([log('nofail')]), row([], rowMeta(10)));
  const [mark] = marksOfBinding(added, 10);
  assert.ok(typeof mark === 'number' && mark < 0, String(mark));
  assert.deepEqual(edgesIn(added), []);
});

const markOptions = ['plain', 'nofail', 0, 1, 2];
const marked = (next, side) => row(side.labels.map(l => ({
  ...l, mark: markOptions[choose(next, markOptions.length)]
})), side.tail);
// Fresh metas are numbered by the order of use, which modes change; both
// sides together are renamed by first appearance.
const canonical = resolved => {
  const names = new Map();
  return JSON.stringify(resolved).replace(/"n":(-\d+)/g, (_, n) => {
    if (!names.has(n)) names.set(n, names.size);
    return `"n":"fresh${names.get(n)}"`;
  });
};
// Where each side was written, so a matched pair's labels can be found.
const at = offset => ({ offset, line: 1, column: offset + 1 });
const placed = { left: { start: at(1), end: at(2) }, right: { start: at(3), end: at(4) } };
// The mark a label has once built: Console is N and Fail unmarked.
const builtMark = l => l.e === 'console' ? 'nofail' : l.e === 'fail' ? 'unmarked'
  : l.mark ?? 'plain';
// The mark of one end of a matched pair: an entry of a written row, or the
// label a row meta was extended with.
const endMark = (subst, sides, occurrence) => occurrence.constructor.name === 'Extended'
  ? marksOfBinding(subst, occurrence.value0)[0]
  : builtMark(sides[occurrence.value0.start.offset === placed.left.start.offset ? 0 : 1].labels[occurrence.value1]);
// A matched pair records an edge unless a mark is unmarked or both are N.
const edgeless = (one, other) => one === 'unmarked' || other === 'unmarked'
  || (one === 'nofail' && other === 'nofail');
const expectedAssumed = (found, sides) => found.traced.events
  .filter(event => event.constructor.name === 'Matched')
  .filter(event => !edgeless(endMark(found.subst, sides, event.value0),
    endMark(found.subst, sides, event.value1))).length;
const resolvedBoth = (outcome, sides) =>
  canonical(sides.map(side => resolveRow(outcome.subst, side)));

test('the scoped-label properties hold in every mode', () => {
  const next = generator(0x4f8);
  const seen = { solved: 0, failed: 0, clashed: 0, assumed: 0 };
  for (let index = 0; index < 600; index += 1) {
    const pair = index % 2 === 0 ? unifiablePair(next) : anyPair(next);
    const sides = pair.map(side => marked(next, side));
    const context = JSON.stringify(sides);
    const baseline = unifyIn(EqualMarks.value, ...pair);
    for (const mode of [directional(), IgnoreMarks.value, EqualMarks.value]) {
      const found = unifyIn(mode, ...sides);
      // A clash may precede the failure the mark-free run reports.
      if (mode === EqualMarks.value && kind(found) === 'RowPayload') {
        seen.clashed += 1;
        continue;
      }
      assert.equal(kind(found), kind(baseline), context);
      if (!found.subst) { seen.failed += 1; continue; }
      seen.solved += 1;
      if (found.traced.postponed) continue;
      assert.equal(resolvedBoth(found, sides), resolvedBoth(baseline, pair), context);
      const edges = edgesIn(found.subst);
      if (mode.constructor.name !== 'Directional') {
        assert.deepEqual(edges, [], context);
        continue;
      }
      // The same run with the sides placed, to name each matched pair.
      const named = unifyIn(mode, ...sides, undefined, placed);
      assert.equal(edgesIn(named.subst).filter(edge => edge.reason === 'Assumed').length,
        expectedAssumed(named, sides), context);
      seen.assumed += expectedAssumed(named, sides);
    }
  }
  assert.ok(seen.solved > 200 && seen.failed > 100 && seen.clashed > 20
    && seen.assumed > 100, JSON.stringify(seen));
});

const here = { offset: 0, line: 1, column: 1 };
const span = { start: here, end: here };
const effectLabel = i => Label.create(UserEffect.create(i))([])(Plain.value);
const environment = current => ({
  current, sites: [], functionName: 'f', functionSpan: span, rowSpan: Nothing.value,
  effects: [], functions: [], types: [], ctors: [], variables: [], markVariables: []
});
const consumeInto = (labels, target) => {
  const result = consumeLabels(environment(target))(start)({
    origin: { span, consumed: Application.value, via: Nothing.value },
    sources: [], labels, target, sites: [], ignoreMarks: false
  });
  assert.ok(result instanceof Right, result.value0?.problem?.constructor.name);
  return result.value0;
};
const reasonsOf = state => edgesIn(state.subst).map(edge => edge.reason);

// A one-label stage against a target of 8,000 labels: the target's rest would
// be copied onto the stage's tail, 7,999 copies, unless that tail is a
// throwaway. Only `Assumed` for the one matched pair may remain.
const labels = Array.from({ length: 8000 }, (_, i) => effectLabel(i));
const wide = () => Row.create(labels)(Just.create(new Hole(100)));

test('consumeLabels makes no copies', () => {
  assert.deepEqual(reasonsOf(consumeInto([labels[0]], wide())), ['Assumed']);
});

test('a closed stage consumed into a wider target makes no copies', () => {
  const closedStage = Row.create([labels[0]])(Nothing.value);
  const result = consumeVia(environment(wide()))(start)({
    span, consumed: Application.value, via: Nothing.value
  })([])(closedStage);
  assert.ok(result instanceof Right, result.value0?.problem?.constructor.name);
  assert.deepEqual(reasonsOf(result.value0), ['Assumed']);
});

test('Console pairs record no edge', () => {
  const subst = run(directional(), row([console_]), row([console_], rowMeta(10)));
  assert.deepEqual(edgesIn(subst), []);
});
