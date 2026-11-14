import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';
import { describe, sources } from './r0-decide-support.mjs';
import { defectCases } from './regression-r0-a2-decide.mjs';

// A2 Task 12 (docs/plans/2026-10-31-a2-validator-plan.md; spec §6):
// each new refusal's reading, and record validation as a pre-search
// block, tested whether or not any strategy offers a candidate. Stubs
// from test/r0-stubs.mjs; the record-defect mutant (spec §12 C4, on
// famw) from test/regression-r0-a2-decide.mjs.
const stubs = await stubsFrom(load);
const { behaviours: { accepting, refusing, ending }, checking, decide,
  trusted } = stubs;
const Verdict = await load('Domain.Verdict');
const Search = await load('Domain.Verdict.Search');
const Effect = await load('Domain.Recorded.Effect');
const Reason = await load('Features.Check.Decide.Reason');
const { mutant, healthy, provenance } = await defectCases(load);
const plain = stubs.recorded.problem(sources.clash);
const fx032 = stubs.recorded.problem(sources.fx032, 'g');
const complete = Verdict.ClaimsComplete.value;
const at = { provenance: fx032.effects.obligations[0].provenance,
  check: 0 };
const kind = fx032.effects.obligations
  .find(placed => placed.value instanceof Effect.Unsupported).value.value0;
// famw records two `outside` kinds, rule 1's blocks after the defect;
// its `Job(Int)` is in Scope A's boundary since dossier §18.200 (an
// authorized movement in research/r0-scope-a/impl1-movements.json).
const outside = ', Outside HandlerType, Outside FailFamily';
const run = (options, problem) => describe(decide(checking(options),
  problem));
const reasonOf = (options, problem) =>
  decide(checking(options), problem).value0.verdict.value0.reason.value0;
const notCertifiable = limitation =>
  new Search.NotCertifiable(limitation, at);

// Spec §12 C3: the refusal declines, so it is no `CandidateRefused`
// fault, with rule 1's block (fx032) and alone (the clash problem).
test('C3 no CandidateRefused', () => {
  const refusal = notCertifiable(new Search.UnsupportedRecorded(kind));
  for (const problem of [fx032, plain]) {
    const found = run({ strategies: [refusing(complete, refusal)] },
      problem);
    assert.deepEqual(found.searchFaults, []);
    assert.equal(found.verdict,
      'Unresolved Unsupported EffectsUnchecked [OperationWithRow 1 0]');
  }
});

// Spec §12 C4(a): the block is first in `blocks`, and an offered
// candidate is not Solved.
test('C4(a)', () => {
  const blocked = Reason.blocks([])(mutant);
  assert.ok(blocked[0] instanceof Verdict.RecordDefective);
  assert.ok(Effect.eqProvenance.eq(blocked[0].value0)(provenance));
  assert.ok(blocked.slice(1).every(item => item instanceof Verdict.Outside));
  assert.deepEqual(run({ strategies: [accepting()] }, mutant), {
    verdict: `Unresolved Unsupported RecordDefective AtSite${outside}`,
    attempts: ['Accepted'], searchFaults: [] });
  // `certify`'s `RecordDefect` reads as a decline, not a refused
  // candidate, here and on a problem with no block.
  const refusal = new Search.RecordDefect({ provenance, check: 0 });
  for (const [problem, after] of [[mutant, outside], [plain, '']])
    assert.deepEqual(run({ strategies: [refusing(complete, refusal)] },
      problem), {
      verdict: `Unresolved Unsupported RecordDefective AtSite${after}`,
      attempts: ['CheckFailed ClaimsComplete RecordDefect'],
      searchFaults: [] });
});

// The defect alone suppresses Solved: famw's mutant with its `outside`
// markers cleared, beside its healthy twin.
test('C4(a): the record defect alone blocks Solved', () => {
  const options = () => ({ strategies: [accepting()] });
  assert.equal(run(options(), { ...mutant, outside: [] }).verdict,
    'Unresolved Unsupported RecordDefective AtSite');
  assert.equal(run(options(), { ...healthy, outside: [] }).verdict,
    'Solved');
});

// Spec §12 C4(b): with no candidate, or no strategy at all, the block
// alone reports the defect.
test('C4(b) NoCandidate', () => {
  assert.deepEqual(run({ strategies: [ending(Verdict.Exhausted.value),
    ending(Verdict.Exhausted.value)] }, mutant), {
    verdict: `Unresolved Unsupported RecordDefective AtSite${outside}`,
    attempts: ['Searched Exhausted', 'Searched Exhausted'],
    searchFaults: [] });
  assert.equal(run({}, mutant).verdict,
    `Unresolved Unsupported RecordDefective AtSite${outside}`);
});

// Spec §6: a limitation is a decline; with every strategy declining,
// the reason is `Unsupported` naming it, and no search fault.
test('limitations decline', () => {
  for (const limitation of [Search.RigidExact.value,
    Search.ForcedTail.value]) {
    const refusal = notCertifiable(limitation);
    const options = { strategies: [refusing(complete, refusal),
      refusing(Verdict.Heuristic.value, refusal)] };
    const found = run(options, plain);
    assert.deepEqual(found.searchFaults, []);
    assert.equal(found.verdict, 'Unresolved Unsupported EffectLimit '
      + limitation.constructor.name);
    assert.equal(reasonOf(options, plain)[0].value0, limitation);
  }
});

// Spec §6: `Malformed` and `ObligationFailed` stay claimed refusals.
test('Malformed and ObligationFailed are refused candidates', () => {
  const key = new Search.KeyMark(0);
  for (const refusal of [new Search.Malformed(new Search.NotN(key)),
    new Search.ObligationFailed(at)]) {
    const found = run({ strategies: [refusing(complete, refusal)] }, plain);
    assert.equal(found.verdict, 'Unresolved Inference NoAcceptedCertificate');
    assert.equal(found.searchFaults.length, 1);
    assert.match(found.searchFaults[0], /^CandidateRefused /);
  }
});

// Spec §6: blocks suppress Solved only; a refuter's evidence stands.
test('Contradiction stands', () => {
  assert.equal(run({ refuters: [trusted()] }, mutant).verdict,
    'Contradiction ByCounterInstance');
  assert.equal(run({ strategies: [ending(Verdict.Exhausted.value)],
    refuters: [trusted()] }, mutant).verdict,
  'Contradiction ByCounterInstance');
});
