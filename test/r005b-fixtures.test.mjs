import test from 'node:test';
import assert from 'node:assert/strict';
import { runGo } from './support.mjs';
import { assertDiagnostic, checkWired, fixtures, wired }
  from './r005b-support.mjs';

// R005 Tranche B: every executable example fixture (test/fixtures/r005b,
// docs/plans/2026-10-17-open-row-merge-plan.md, "Executable example
// fixtures") through the compiler, at the stages its `stages` field
// names. From `check` the result class and code; from `text` the exact
// message, primary span and notes (between the two, a placeholder's
// E_INTERNAL; B5 removed P6, so an Unresolved fixture reaches its text
// with its check); from `run`, the output through Go. A fixture before
// its stage is skipped by that field only, never because it fails. `task`
// is the plan's task this tree has reached, in the 2026-10-17 plan's
// numbering that `stages` uses: R005 Tranche B's B5 was its Task 6, and
// Task 7 keeps its number.
const task = 7;
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

// Task 3 activated the precedence fixtures and their controls, the two
// lone-meta fixtures and diag-06-fix (the plan's activation table); Task
// 4 none here (its solver-stage fixtures run in test/row-merge.test.mjs);
// Task 5 (B4) the three Unresolved fixtures without a literal of two
// spreads and the two annotated programs that fix diag-07's shape; Task 6
// (B5) the `render-*` fixtures, their annotated companions,
// participation-control and render-none-control (decision 21). Task 7,
// with the merge literal, activates every remaining fixture's checking:
// none waits for a later task's `check` stage.
test('the fixtures this task activates are the activation table\'s', () => {
  const waiting = fixtures.filter(fixture => !reached(fixture.stages.check))
    .map(fixture => fixture.name);
  assert.deepEqual(waiting, []);
  assert.equal(fixtures.length, 102);
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
