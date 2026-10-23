import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stableStringify } from './r0-canonical.mjs';
import { decodeType } from './r0-canonical-decode.mjs';
import { witnessFrom } from './r0-witness-support.mjs';
import { r022Probes } from './r0-r022-probes.mjs';

// R022 (BACKLOG; follow-up to Tasks 4.3/4.4): the read-back respects a
// recorded variable's sort. A row-sorted `inst` slot whose checked type
// is a bare hole reads as a row tail, `{ ...hole n }`, as specialization
// reads an unsolved record-sorted argument (Specialize/Values.purs
// `slotType`), not as the type `hole n`. Through the production path:
// `shadowDecisions`, the online strategy alone.
const w = await witnessFrom(load);
const { online } = w;
const named = value => value.constructor.name;
const slotPath = { root: 'body', steps: ['Block', 'items', 0, 'Let',
  'value', 'Lambda', 'body'] };
const slot = (problem, index) => w.variableAt(problem,
  { fresh: { path: slotPath, role: { inst: index } } });

for (const { kind, source } of r022Probes) {
  test(`R022 (${kind}): the row slot's hole is read as a row tail`, () => {
    const program = online.programOf(source);
    const problem = online.problemOf(program, 'g');
    assert.equal(named(online.todayOf(program, 'g')), 'Right', 'today');
    assert.ok(problem.b.some(entry => named(entry.value) === kind), kind);
    const found = online.search(program, problem);
    assert.equal(named(found), 'Candidate');
    const image = online.Map.lookup(w.Atom.ordVar)(slot(problem, 0))(
      found.value0.unsettled);
    assert.equal(stableStringify(decodeType(image.value0)),
      stableStringify(decodeType(w.holeRow(0))));
  });

  // Under the literal W §1.5 rule this was Solved with `NoWitness
  // HoleContract` (Stage A, docs/findings.md); under the amendment
  // (docs/plans/r0-hole-contract-amendment.md) the atom holds at `{}`.
  test(`R022 (${kind}): shadowDecisions accepts the read-back σ`, () => {
    const program = online.programOf(source);
    const decision = online.decisionOf(program, 'g');
    assert.equal(named(decision), 'Right');
    const [attempt] = decision.value0.attempts;
    assert.equal(named(attempt), 'Accepted',
      named(attempt) === 'CheckFailed' ? named(attempt.value2) : '');
    assert.equal(named(attempt.value2), 'Witnessed');
  });
}
