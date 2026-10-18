import test from 'node:test';
import assert from 'node:assert/strict';
import { runGo } from './support.mjs';
import { checkedPoly } from './phases.mjs';
import { assertDiagnostic, fixtures, fromEquations, unresolved, wired }
  from './r005b-support.mjs';

// R005 Tranche B: every executable example fixture (test/fixtures/r005b,
// docs/plans/2026-10-17-open-row-merge-plan.md, "Executable example
// fixtures") through the compiler, at the stages its `stages` field
// names. From `check` the result class and code; from `text` the exact
// message, primary span and notes (between the two, the placeholder's
// E_INTERNAL); from `run`, the output through Go. A fixture before its
// stage is skipped by that field only, never because it fails. `task` is
// the plan's task this tree has reached. A Solved fixture whose `run`
// stage is later is checked through the check phase alone: its rows of
// several tails reach Task 8's lowering placeholder when compiled.
const task = 5;
const reached = stage => stage !== null && stage <= task;
// Between `check` and `text` a result's class is pinned by Task 6's
// placeholders: D4 for Unresolved, D6 for a contradiction an equation
// established.
const placeholderOf = { Unresolved: unresolved, Contradiction: fromEquations };

const checkStage = fixture => {
  if (fixture.result === 'Solved' && !reached(fixture.stages.run)) {
    checkedPoly(fixture.source);
  } else if (fixture.result === 'Solved') {
    const found = wired(fixture.source);
    assert.equal(found, null, JSON.stringify(found));
  } else if (reached(fixture.stages.text)) {
    assertDiagnostic(fixture.source, fixture.diagnostic);
  } else {
    const found = wired(fixture.source);
    assert.notEqual(found, null, 'accepted');
    assert.equal(found.code, 'E_INTERNAL', found.message);
    assert.equal(found.message, placeholderOf[fixture.result], found.message);
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
// solver-stage fixtures run in test/row-merge.test.mjs); Task 5 the five
// with `check` 5: design-both-plain, diag-06 and diag-07 (Unresolved, the
// placeholder until Task 6), design-both-annotated and diag-07-fix
// (Solved at the check phase; they run from Task 8).
test('the fixtures this task activates are the activation table\'s', () => {
  const active = fixtures.filter(fixture => reached(fixture.stages.check))
    .map(fixture => fixture.name);
  assert.deepEqual(active, ['design-both-annotated', 'design-both-plain',
    'diag-06', 'diag-06-fix', 'diag-07', 'diag-07-fix', 'lone-meta-lack-two',
    'lone-meta-lack', 'precedence-control-hole-base',
    'precedence-control-no-clause', 'precedence-control-two-clauses',
    'precedence-p1', 'precedence-p2', 'precedence-p3', 'precedence-p4',
    'precedence-p5', 'precedence-p6', 'precedence-p7']);
});
