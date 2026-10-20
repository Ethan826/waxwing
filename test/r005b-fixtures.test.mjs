import test from 'node:test';
import assert from 'node:assert/strict';
import { runGo } from './support.mjs';
import { assertDiagnostic, checkWired, fixtures, wired }
  from './r005b-support.mjs';

// R005 Tranche B: every executable example fixture (test/fixtures/r005b,
// docs/plans/2026-10-17-open-row-merge-plan.md, "Executable example
// fixtures") through the compiler, at the stages its `stages` field
// names. From `check` the result class and code; from `text` the exact
// message, primary span and notes (between the two, the placeholder's
// E_INTERNAL; for an Unresolved fixture, since B4, exactly placeholder
// P6); from `run`, the output through Go. A fixture before its stage is
// skipped by that field only, never because it fails. `task` is the
// plan's task this tree has reached, in the 2026-10-17 plan's numbering
// that `stages` uses: R005 Tranche B's B5 is its Task 6.
const task = 6;
const P6 = 'R005B placeholder: unresolved merge predicates are reported in '
  + 'Task B5';
const reached = stage => stage !== null && stage <= task;

const checkStage = fixture => {
  if (fixture.result === 'Solved') {
    const found = checkWired(fixture.source);
    assert.equal(found, null, JSON.stringify(found));
  } else if (reached(fixture.stages.text)) {
    assertDiagnostic(fixture.source, fixture.diagnostic);
  } else {
    const found = wired(fixture.source);
    assert.notEqual(found, null, 'accepted');
    assert.equal(found.code, 'E_INTERNAL', found.message);
    assert.ok(found.message.startsWith('R005B placeholder: '), found.message);
    if (fixture.result === 'Unresolved') assert.equal(found.message, P6);
  }
};

for (const fixture of fixtures) {
  if (reached(fixture.stages.check)) {
    test(`fixture ${fixture.name}: ${fixture.result}`, () => {
      checkStage(fixture);
    });
  }
  if (reached(fixture.stages.run)) {
    test(`fixture ${fixture.name} runs`, () => {
      assert.equal(runGo(fixture.source), fixture.output);
    });
  }
}

// Task 3 activates the precedence fixtures and their controls, the two
// lone-meta fixtures and diag-06-fix (the plan's activation table); Task
// 4 activates none here (no fixture's `check` or `run` stage is 4: its
// solver-stage fixtures run in test/row-merge.test.mjs); Task 5 (B4)
// activates the three Unresolved fixtures without a literal of two
// spreads and the two annotated programs that fix diag-07's shape; Task 6
// (B5) the `render-*` fixtures, their annotated companions and
// participation-control.
test('the fixtures this task activates are the activation table\'s', () => {
  const active = fixtures.filter(fixture => reached(fixture.stages.check))
    .map(fixture => fixture.name);
  assert.deepEqual(active, ['design-both-annotated', 'design-both-plain',
    'diag-06-fix', 'diag-06', 'diag-07-fix', 'diag-07', 'lone-meta-lack-two',
    'lone-meta-lack', 'participation-control', 'precedence-control-hole-base',
    'precedence-control-no-clause', 'precedence-control-two-clauses',
    'precedence-p1', 'precedence-p2', 'precedence-p3', 'precedence-p4',
    'precedence-p5', 'precedence-p6', 'precedence-p7', 'render-call',
    'render-d6-neither', 'render-d6-nested', 'render-d6-one',
    'render-holds-annotated', 'render-holds', 'render-lambda-annotated',
    'render-lambda', 'render-mixed-annotated', 'render-mixed',
    'render-nested-annotated', 'render-nested', 'render-partial-annotated',
    'render-partial', 'render-quiet-annotated', 'render-quiet',
    'render-reference-annotated', 'render-reference',
    'render-split-annotated', 'render-split', 'render-three-annotated',
    'render-three']);
});

// Plan §10 decision 20: a hint that suggests an annotation is pinned only
// with an annotated companion, which must be accepted or refused with a
// genuine contradiction; one left Unresolved goes back to the user. One
// annotatable part shows where an annotation might help, not that it
// resolves the whole ambiguity, so each hinted text is checked this way.
const ANNOTATION_HINTS = ['pass a lambda with annotated parameters',
  'annotate this lambda\'s parameters'];
const hinted = fixture => fixture.diagnostic !== null
  && ANNOTATION_HINTS.some(hint => fixture.diagnostic.message.includes(hint));

test('every hinted text at its stage has a decided annotated companion',
  () => {
    const pinned = fixtures.filter(f => reached(f.stages.text) && hinted(f));
    assert.ok(pinned.length > 0);
    for (const plain of pinned) {
      const companion = fixtures
        .find(f => f.name === `${plain.name}-annotated`);
      assert.ok(companion, `${plain.name} has no annotated companion`);
      assert.notEqual(companion.result, 'Unresolved', companion.name);
      const found = checkWired(companion.source);
      if (companion.result === 'Solved') {
        assert.equal(found, null, JSON.stringify(found));
      } else assertDiagnostic(companion.source, companion.diagnostic);
    }
  });
